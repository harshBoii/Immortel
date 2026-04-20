import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds } from "@/lib/meta/mediaSync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

type LinkData = {
  image_hash?: string;
  video_id?: string;
  child_attachments?: Array<{
    image_hash?: string;
    video_id?: string;
  }>;
};

type VideoData = {
  video_id?: string;
  image_hash?: string;
};

type CreativeRef = {
  id?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  thumbnail_url?: string;
  object_story_spec?: {
    link_data?: LinkData;
    video_data?: VideoData;
  } | null;
};

type AdRow = {
  id?: string;
  name?: string;
  status?: string;
  adset_id?: string;
  creative?: CreativeRef;
};

function collectMediaRefsFromCreative(c: CreativeRef | undefined): {
  hashes: string[];
  videoIds: string[];
} {
  const hashes: string[] = [];
  const videoIds: string[] = [];
  if (!c) return { hashes, videoIds };

  if (c.image_hash) hashes.push(c.image_hash);
  if (c.video_id) videoIds.push(c.video_id);

  const ld = c.object_story_spec?.link_data;
  if (ld?.image_hash) hashes.push(ld.image_hash);
  if (ld?.video_id) videoIds.push(ld.video_id);
  for (const child of ld?.child_attachments ?? []) {
    if (child.image_hash) hashes.push(child.image_hash);
    if (child.video_id) videoIds.push(child.video_id);
  }
  const vd = c.object_story_spec?.video_data;
  if (vd?.video_id) videoIds.push(vd.video_id);
  if (vd?.image_hash) hashes.push(vd.image_hash);

  return { hashes, videoIds };
}

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const fields =
    "id,name,status,adset_id,creative{id,image_hash,image_url,video_id,thumbnail_url,object_story_spec{link_data{image_hash,video_id,child_attachments{image_hash,video_id}},video_data{video_id,image_hash}}}";
  const rows: AdRow[] = [];
  let after: string | undefined;

  try {
    for (;;) {
      const params: Record<string, string | number | boolean | undefined> = {
        fields,
        limit: 100,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${loaded.actId}/ads`, params, {
        accessToken: loaded.accessToken,
      })) as {
        data?: AdRow[];
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
  for (const ad of rows) {
    const refs = collectMediaRefsFromCreative(ad.creative);
    hashes.push(...refs.hashes);
    videoIds.push(...refs.videoIds);
  }

  const imageResult = await hydrateImageHashes(hashes, loaded);
  const videoResult = await hydrateVideoIds(videoIds, loaded);

  const adSets = await prisma.metaAdSet.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    select: { id: true, metaAdSetId: true },
  });
  const setByMeta = new Map(adSets.map((s) => [s.metaAdSetId, s.id]));

  const creatives = await prisma.metaCreative.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    select: { id: true, metaCreativeId: true },
  });
  const crByMeta = new Map(
    creatives
      .filter((c): c is { id: string; metaCreativeId: string } => Boolean(c.metaCreativeId))
      .map((c) => [c.metaCreativeId, c.id]),
  );

  let synced = 0;

  for (const a of rows) {
    if (!a.id) continue;
    const adSetDb = a.adset_id ? setByMeta.get(a.adset_id) : undefined;
    if (!adSetDb) continue;

    const creativeDb =
      a.creative?.id && crByMeta.has(a.creative.id) ? crByMeta.get(a.creative.id)! : null;

    await prisma.metaAd.upsert({
      where: {
        metaIntegrationId_metaAdId: {
          metaIntegrationId: loaded.integrationId,
          metaAdId: a.id,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        adSetId: adSetDb,
        metaAdId: a.id,
        name: a.name ?? null,
        status: a.status ?? null,
        metaCreativeDbId: creativeDb,
      },
      update: {
        name: a.name ?? null,
        status: a.status ?? null,
        metaCreativeDbId: creativeDb,
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
