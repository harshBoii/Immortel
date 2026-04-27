import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds, type MediaRowSnapshot } from "@/lib/meta/mediaSync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseCursorPayload(body: unknown): { after?: string; limit: number } {
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const after = typeof obj.after === "string" && obj.after.length > 0 ? obj.after : undefined;
  const rawLimit = typeof obj.limit === "number" ? obj.limit : Number(obj.limit);
  const limit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10;
  return { after, limit: Math.min(50, Math.max(1, limit || 10)) };
}

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

type TemplateAttachment = {
  image_hash?: string;
  picture?: string;
  video_id?: string;
};

type TemplateData = {
  link?: string;
  message?: string;
  name?: string;
  description?: string;
  picture?: string;
  image_hash?: string;
  video_id?: string;
  child_attachments?: TemplateAttachment[];
};

type StorySpec = {
  link_data?: LinkData;
  video_data?: VideoData;
  template_data?: TemplateData;
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
  const spec = row.object_story_spec ?? undefined;
  const ld = spec?.link_data;
  const td = spec?.template_data;
  const link = ld?.link ?? td?.link;
  return {
    headline: (ld?.name ?? td?.name ?? row.name ?? "Synced creative").slice(0, 500),
    primary: ld?.message ?? td?.message ?? "",
    url: link && /^https?:\/\//i.test(link) ? link : "https://example.com",
    description: ld?.description ?? td?.description ?? null,
  };
}

function collectMediaRefs(row: CrRow): {
  hashes: string[];
  pictures: string[];
  videoIds: string[];
} {
  const hashes: string[] = [];
  const pictures: string[] = [];
  const videoIds: string[] = [];

  if (row.image_hash) hashes.push(row.image_hash);
  if (row.image_url) pictures.push(row.image_url);
  if (row.thumbnail_url) pictures.push(row.thumbnail_url);
  if (row.video_id) videoIds.push(row.video_id);

  const spec = row.object_story_spec ?? undefined;
  const ld = spec?.link_data;
  if (ld?.image_hash) hashes.push(ld.image_hash);
  if (ld?.picture) pictures.push(ld.picture);
  if (ld?.video_id) videoIds.push(ld.video_id);
  for (const child of ld?.child_attachments ?? []) {
    if (child.image_hash) hashes.push(child.image_hash);
    if (child.picture) pictures.push(child.picture);
    if (child.video_id) videoIds.push(child.video_id);
  }

  const vd = spec?.video_data;
  if (vd?.video_id) videoIds.push(vd.video_id);
  if (vd?.image_hash) hashes.push(vd.image_hash);
  if (vd?.image_url) pictures.push(vd.image_url);

  const td = spec?.template_data;
  if (td?.image_hash) hashes.push(td.image_hash);
  if (td?.picture) pictures.push(td.picture);
  if (td?.video_id) videoIds.push(td.video_id);
  for (const child of td?.child_attachments ?? []) {
    if (child.image_hash) hashes.push(child.image_hash);
    if (child.picture) pictures.push(child.picture);
    if (child.video_id) videoIds.push(child.video_id);
  }

  return { hashes, pictures, videoIds };
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
  const fallbackPicture = refs.pictures[0] ?? null;

  const imgMedia = primaryHash ? imageRows.get(primaryHash) : undefined;
  const vidMedia = primaryVideo ? videoRows.get(primaryVideo) : undefined;

  return {
    imageHash: primaryHash,
    videoId: primaryVideo,
    imageUrl: imgMedia?.imageUrl ?? row.image_url ?? fallbackPicture ?? null,
    videoUrl: vidMedia?.videoUrl ?? null,
    thumbnailUrl: vidMedia?.thumbnailUrl ?? row.thumbnail_url ?? null,
  };
}

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { after, limit } = parseCursorPayload(await req.json().catch(() => null));

  const fields = [
    "id",
    "name",
    "image_hash",
    "image_url",
    "video_id",
    "thumbnail_url",
    "object_story_spec{link_data{name,message,link,description,image_hash,picture,video_id,child_attachments{image_hash,picture,video_id}},video_data{video_id,image_hash,image_url},template_data{link,message,name,description,picture,image_hash,video_id,child_attachments{image_hash,picture,video_id}}}",
  ].join(",");

  let rows: CrRow[] = [];
  let nextAfter: string | null = null;

  try {
    const params: Record<string, string | number | boolean | undefined> = { fields, limit };
    if (after) params.after = after;

    const page = (await graphGet(`${loaded.actId}/adcreatives`, params, {
      accessToken: loaded.accessToken,
    })) as {
      data?: CrRow[];
      paging?: { cursors?: { after?: string } };
    };

    rows = page.data ?? [];
    nextAfter = page.paging?.cursors?.after ?? null;
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

  // This step is what you asked for:
  // - image hashes -> /{actId}/adimages
  // - video ids -> /{videoId}?fields=source,picture,title (inside hydrateVideoIds)
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
    hasMore: Boolean(nextAfter && rows.length > 0),
    nextAfter,
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

