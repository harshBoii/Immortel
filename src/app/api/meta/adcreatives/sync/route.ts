import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import {
  hydrateImageHashes,
  hydrateVideoIds,
  type MediaRowSnapshot,
} from "@/lib/meta/mediaSync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

type LinkData = {
  name?: string;
  message?: string;
  link?: string;
  description?: string;
  image_hash?: string;
  picture?: string;
  video_id?: string;
  child_attachments?: Array<{
    image_hash?: string;
    picture?: string;
    video_id?: string;
  }>;
};

type VideoData = {
  video_id?: string;
  image_hash?: string;
  image_url?: string;
};

type StorySpec = {
  link_data?: LinkData;
  video_data?: VideoData;
};

type CrRow = {
  id?: string;
  name?: string;
  object_story_spec?: StorySpec | null;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  thumbnail_url?: string;
};

function fromSpec(row: CrRow): {
  headline: string;
  primary: string;
  url: string;
  description: string | null;
} {
  const ld = row.object_story_spec?.link_data;
  const link = ld?.link;
  return {
    headline: (ld?.name ?? row.name ?? "Synced creative").slice(0, 500),
    primary: ld?.message ?? "",
    url: link && /^https?:\/\//i.test(link) ? link : "https://example.com",
    description: ld?.description ?? null,
  };
}

function collectMediaRefs(row: CrRow): { hashes: string[]; videoIds: string[] } {
  const hashes: string[] = [];
  const videoIds: string[] = [];

  if (row.image_hash) hashes.push(row.image_hash);
  if (row.video_id) videoIds.push(row.video_id);

  const spec = row.object_story_spec ?? undefined;
  const ld = spec?.link_data;
  if (ld?.image_hash) hashes.push(ld.image_hash);
  if (ld?.video_id) videoIds.push(ld.video_id);
  for (const child of ld?.child_attachments ?? []) {
    if (child.image_hash) hashes.push(child.image_hash);
    if (child.video_id) videoIds.push(child.video_id);
  }
  const vd = spec?.video_data;
  if (vd?.video_id) videoIds.push(vd.video_id);
  if (vd?.image_hash) hashes.push(vd.image_hash);

  return { hashes, videoIds };
}

function pickMedia(
  row: CrRow,
  imageRows: Map<string, MediaRowSnapshot>,
  videoRows: Map<string, MediaRowSnapshot>,
): {
  imageHash: string | null;
  videoId: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
} {
  const refs = collectMediaRefs(row);
  const primaryHash = refs.hashes[0] ?? null;
  const primaryVideo = refs.videoIds[0] ?? null;

  const imgMedia = primaryHash ? imageRows.get(primaryHash) : undefined;
  const vidMedia = primaryVideo ? videoRows.get(primaryVideo) : undefined;

  return {
    imageHash: primaryHash,
    videoId: primaryVideo,
    imageUrl: imgMedia?.imageUrl ?? row.image_url ?? null,
    videoUrl: vidMedia?.videoUrl ?? null,
    thumbnailUrl: vidMedia?.thumbnailUrl ?? row.thumbnail_url ?? null,
  };
}

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const fields = [
    "id",
    "name",
    "image_hash",
    "image_url",
    "video_id",
    "thumbnail_url",
    "object_story_spec{link_data{name,message,link,description,image_hash,picture,video_id,child_attachments{image_hash,picture,video_id}},video_data{video_id,image_hash,image_url}}",
  ].join(",");
  const rows: CrRow[] = [];
  let after: string | undefined;

  try {
    for (;;) {
      const params: Record<string, string | number | boolean | undefined> = {
        fields,
        limit: 100,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${loaded.actId}/adcreatives`, params, {
        accessToken: loaded.accessToken,
      })) as {
        data?: CrRow[];
        paging?: { cursors?: { after?: string } };
      };

      const chunk = page.data ?? [];
      rows.push(...chunk);
      after = page.paging?.cursors?.after;
      if (!after || chunk.length === 0) break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const hashes: string[] = [];
  const videoIds: string[] = [];
  for (const r of rows) {
    const refs = collectMediaRefs(r);
    hashes.push(...refs.hashes);
    videoIds.push(...refs.videoIds);
  }

  const imageResult = await hydrateImageHashes(hashes, loaded);
  const videoResult = await hydrateVideoIds(videoIds, loaded);

  let synced = 0;
  for (const c of rows) {
    if (!c.id) continue;
    const parsed = fromSpec(c);
    const media = pickMedia(c, imageResult.rows, videoResult.rows);

    await prisma.metaCreative.upsert({
      where: {
        metaIntegrationId_metaCreativeId: {
          metaIntegrationId: loaded.integrationId,
          metaCreativeId: c.id,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        metaCampaignId: null,
        metaCreativeId: c.id,
        imageHash: media.imageHash,
        videoId: media.videoId,
        imageUrl: media.imageUrl,
        videoUrl: media.videoUrl,
        thumbnailUrl: media.thumbnailUrl,
        headline: parsed.headline,
        primaryText: parsed.primary,
        description: parsed.description,
        ctaType: "LEARN_MORE",
        landingUrl: parsed.url,
        aiGenerated: false,
      },
      update: {
        imageHash: media.imageHash,
        videoId: media.videoId,
        imageUrl: media.imageUrl,
        videoUrl: media.videoUrl,
        thumbnailUrl: media.thumbnailUrl,
        headline: parsed.headline,
        primaryText: parsed.primary,
        description: parsed.description,
        landingUrl: parsed.url,
      },
    });
    synced += 1;
  }

  return NextResponse.json({
    ok: true,
    synced,
    media: {
      images: {
        inserted: imageResult.inserted,
        skipped: imageResult.skipped,
      },
      videos: {
        inserted: videoResult.inserted,
        skipped: videoResult.skipped,
      },
    },
  });
}
