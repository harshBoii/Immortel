import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds } from "@/lib/meta/mediaSync";
import { createAssetFromMetaVideo, processAsset } from "@/lib/asset-processing";

export const runtime = "nodejs";
export const maxDuration = 300;

type LinkData = {
  image_hash?: string;
  video_id?: string;
  child_attachments?: Array<{ image_hash?: string; video_id?: string }>;
};
type VideoData = { video_id?: string; image_hash?: string };
type CreativeRef = {
  id?: string;
  image_hash?: string;
  video_id?: string;
  object_story_spec?: {
    link_data?: LinkData;
    video_data?: VideoData;
  } | null;
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

async function impressionsLast7d(metaAdId: string, accessToken: string): Promise<number> {
  const res = (await graphGet(
    `${metaAdId}/insights`,
    { fields: "impressions", date_preset: "last_7d", limit: 1 },
    { accessToken }
  )) as { data?: Array<{ impressions?: string | number }> };

  const first = res.data?.[0];
  const raw = first?.impressions ?? 0;
  const n = typeof raw === "string" ? Number(raw) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

async function creativeForAd(metaAdId: string, accessToken: string): Promise<CreativeRef | undefined> {
  const fields =
    "creative{id,image_hash,video_id,object_story_spec{link_data{image_hash,video_id,child_attachments{image_hash,video_id}},video_data{video_id,image_hash}}}";
  const res = (await graphGet(metaAdId, { fields }, { accessToken })) as { creative?: CreativeRef };
  return res.creative;
}

export async function POST() {
  try {
    const loaded = await loadIntegrationForSession();
    if (!loaded) {
      return NextResponse.json({ success: false, error: "Meta not connected" }, { status: 401 });
    }

    const activeAds = await prisma.metaAd.findMany({
      where: {
        metaIntegrationId: loaded.integrationId,
        status: "ACTIVE",
      },
      select: { metaAdId: true, updatedAt: true },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    if (activeAds.length === 0) {
      return NextResponse.json({ success: false, error: "No ACTIVE ads found" }, { status: 404 });
    }

    const scored = await Promise.all(
      activeAds.map(async (a) => ({
        metaAdId: a.metaAdId,
        impressions: await impressionsLast7d(a.metaAdId, loaded.accessToken).catch(() => 0),
      }))
    );

    const top = scored
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .filter((x) => x.metaAdId);

    const topAdIds = top.map((t) => t.metaAdId);

    // Pull creatives for top ads and collect media refs
    const hashes: string[] = [];
    const videoIds: string[] = [];
    const creativeRefs = await Promise.all(
      topAdIds.map(async (id) => ({ id, creative: await creativeForAd(id, loaded.accessToken) }))
    );

    for (const row of creativeRefs) {
      const refs = collectMediaRefsFromCreative(row.creative);
      hashes.push(...refs.hashes);
      videoIds.push(...refs.videoIds);
    }

    const imageResult = await hydrateImageHashes(hashes, loaded);
    const videoResult = await hydrateVideoIds(videoIds, loaded);

    const metaMediaIds: string[] = [];
    const assetIds: string[] = [];
    const errors: Array<{ metaVideoId?: string; metaMediaId?: string; error: string }> = [];

    for (const [, metaMediaId] of videoResult.ids) {
      metaMediaIds.push(metaMediaId);
      try {
        const { assetId } = await createAssetFromMetaVideo({
          metaMediaId,
          companyId: loaded.companyId,
        });
        assetIds.push(assetId);

        // fire-and-forget processing
        processAsset({ assetId, assetType: "VIDEO", scenePreset: "long_video" }).catch((e) =>
          console.error("[meta/analyze-top-ads] processAsset failed", e)
        );
      } catch (e) {
        errors.push({
          metaMediaId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({
      success: true,
      topAdIds,
      media: {
        images: imageResult,
        videos: videoResult,
      },
      metaMediaIds,
      assetIds,
      errors,
    });
  } catch (e) {
    console.error("[meta/analyze-top-ads]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

