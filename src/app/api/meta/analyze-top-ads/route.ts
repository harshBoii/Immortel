import { NextResponse } from "next/server";
import { graphGet, MetaGraphError } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds } from "@/lib/meta/mediaSync";
import { syncMetaAdMetrics } from "@/lib/meta/metricsSync";
import { createAssetFromMetaVideo, processAsset } from "@/lib/asset-processing";

export const runtime = "nodejs";
export const maxDuration = 300;

const METRICS_LIMIT = 50;
const TOP_ADS_FOR_PROCESSING = 5;
const DATE_PRESET = "last_7d";

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

// Duck-typed guard — does NOT use instanceof to avoid Next.js split-module false negatives
function isMissingVideoIdFieldError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;

  const msg = String((e as any).message ?? "").toLowerCase();
  if (!msg.includes("video_id")) return false;

  // Meta can nest the code in several different payload shapes
  const code =
    (e as any).code ??
    (e as any).payload?.error?.code ??
    (e as any).payload?.code ??
    (e as any).response?.error?.code;

  if (code === 100) return true;
  return (
    msg.includes("nonexisting field") ||
    msg.includes("tried accessing nonexisting field")
  );
}

async function creativeForAd(
  metaAdId: string,
  accessToken: string
): Promise<CreativeRef | undefined> {
  const attempts = [
    // A — max detail
    "creative{id,image_hash,video_id,object_story_spec{link_data{image_hash,video_id,child_attachments{image_hash,video_id}},video_data{video_id,image_hash}}}",
    // B — drop creative.video_id
    "creative{id,image_hash,object_story_spec{link_data{image_hash,video_id,child_attachments{image_hash,video_id}},video_data{video_id,image_hash}}}",
    // C — drop link_data.*video_id
    "creative{id,image_hash,object_story_spec{link_data{image_hash,child_attachments{image_hash}},video_data{video_id,image_hash}}}",
    // D — drop all video_id
    "creative{id,image_hash,object_story_spec{link_data{image_hash,child_attachments{image_hash}},video_data{image_hash}}}",
    // E — bare minimum: image-only / DPA / collection ads that have no object_story_spec
    "creative{id,image_hash}",
  ];

  let lastError: unknown = null;
  for (const fields of attempts) {
    try {
      const res = (await graphGet(
        metaAdId,
        { fields },
        { accessToken }
      )) as { creative?: CreativeRef };
      return res.creative;
    } catch (e) {
      lastError = e;
      console.warn("[creativeForAd] attempt failed", {
        fields,
        isVideoIdErr: isMissingVideoIdFieldError(e),
        code: (e as any).code ?? (e as any).payload?.error?.code,
        message: (e as any).message,
      });
      if (!isMissingVideoIdFieldError(e)) throw e;
    }
  }

  if (lastError) throw lastError;
  return undefined;
}

export async function POST() {
  try {
    const loaded = await loadIntegrationForSession();
    if (!loaded) {
      return NextResponse.json(
        { success: false, error: "Meta not connected" },
        { status: 401 }
      );
    }

    // Step 1 — pull metrics
    const metrics = await syncMetaAdMetrics({
      integrationId: loaded.integrationId,
      accessToken: loaded.accessToken,
      datePreset: DATE_PRESET,
      limit: METRICS_LIMIT,
      onlyActive: false,
    });

    if (metrics.selected.length === 0) {
      return NextResponse.json(
        { success: false, error: "No ads found for this integration" },
        { status: 404 }
      );
    }

    // Step 2 — pick top ads by impressions
    const top = metrics.selected
      .slice()
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, TOP_ADS_FOR_PROCESSING);

    const topAdIds = top.map((t) => t.metaAdId);

    const creativeRefs = await Promise.all(
      topAdIds.map(async (id) => ({
        id,
        creative: await creativeForAd(id, loaded.accessToken),
      }))
    );

    const hashes: string[] = [];
    const videoIds: string[] = [];
    for (const row of creativeRefs) {
      const refs = collectMediaRefsFromCreative(row.creative);
      hashes.push(...refs.hashes);
      videoIds.push(...refs.videoIds);
    }

    const imageResult = await hydrateImageHashes(hashes, loaded);

    // Step 3 — hydrate video IDs, degrade gracefully if Meta rejects video_id field
    let videoResult: Awaited<ReturnType<typeof hydrateVideoIds>>;
    try {
      videoResult = await hydrateVideoIds(videoIds, loaded);
    } catch (e) {
      if (isMissingVideoIdFieldError(e)) {
        console.warn(
          "[meta/ads/sync] hydrateVideoIds hit video_id field error, skipping video hydration",
          e
        );
        videoResult = { ids: new Map(), errors: [] } as any;
      } else {
        throw e;
      }
    }

    const metaMediaIds: string[] = [];
    const assetIds: string[] = [];
    const errors: Array<{
      metaVideoId?: string;
      metaMediaId?: string;
      error: string;
    }> = [];

    for (const [, metaMediaId] of videoResult.ids) {
      metaMediaIds.push(metaMediaId);
      try {
        const { assetId } = await createAssetFromMetaVideo({
          metaMediaId,
          companyId: loaded.companyId,
        });
        assetIds.push(assetId);

        processAsset({
          assetId,
          assetType: "VIDEO",
          scenePreset: "long_video",
        }).catch((e) =>
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
      metrics: {
        datePreset: metrics.datePreset,
        candidatePoolSize: metrics.candidatePoolSize,
        synced: metrics.syncedCount,
        selectedAdIds: metrics.selectedMetaAdIds,
      },
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