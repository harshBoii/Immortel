import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds } from "@/lib/meta/mediaSync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseCursorPayload(body: unknown): { after?: string; limit: number } {
  const obj =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const after =
    typeof obj.after === "string" && obj.after.length > 0
      ? obj.after
      : undefined;
  const rawLimit =
    typeof obj.limit === "number" ? obj.limit : Number(obj.limit);
  const limit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10;
  return { after, limit: Math.min(50, Math.max(1, limit || 10)) };
}

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

// Duck-typed guard — no instanceof to avoid Next.js split-module false negatives
function isMissingVideoIdFieldError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const msg = String((e as any).message ?? "").toLowerCase();
  if (!msg.includes("video_id")) return false;

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

// Fallback field strings for the ads list — progressively drops video_id fields
const AD_FIELD_ATTEMPTS = [
  // A — max detail
  "id,name,status,adset_id,creative{id,image_hash,image_url,video_id,thumbnail_url,object_story_spec{link_data{image_hash,video_id,child_attachments{image_hash,video_id}},video_data{video_id,image_hash}}}",
  // B — drop creative.video_id
  "id,name,status,adset_id,creative{id,image_hash,image_url,thumbnail_url,object_story_spec{link_data{image_hash,video_id,child_attachments{image_hash,video_id}},video_data{video_id,image_hash}}}",
  // C — drop link_data.*video_id
  "id,name,status,adset_id,creative{id,image_hash,image_url,thumbnail_url,object_story_spec{link_data{image_hash,child_attachments{image_hash}},video_data{video_id,image_hash}}}",
  // D — drop all video_id
  "id,name,status,adset_id,creative{id,image_hash,image_url,thumbnail_url,object_story_spec{link_data{image_hash,child_attachments{image_hash}},video_data{image_hash}}}",
  // E — bare minimum: no object_story_spec (image-only / DPA / collection ads)
  "id,name,status,adset_id,creative{id,image_hash,image_url,thumbnail_url}",
];

async function fetchAdsPage(
  actId: string,
  accessToken: string,
  limit: number,
  after?: string
): Promise<{ rows: AdRow[]; nextAfter: string | null }> {
  let lastError: unknown = null;

  for (const fields of AD_FIELD_ATTEMPTS) {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        fields,
        limit,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${actId}/ads`, params, {
        accessToken,
      })) as {
        data?: AdRow[];
        paging?: { cursors?: { after?: string } };
      };

      return {
        rows: page.data ?? [],
        nextAfter: page.paging?.cursors?.after ?? null,
      };
    } catch (e) {
      lastError = e;
      console.warn("[fetchAdsPage] attempt failed", {
        fields,
        isVideoIdErr: isMissingVideoIdFieldError(e),
        code: (e as any).code ?? (e as any).payload?.error?.code,
        message: (e as any).message,
      });
      if (!isMissingVideoIdFieldError(e)) throw e;
    }
  }

  if (lastError) throw lastError;
  return { rows: [], nextAfter: null };
}

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

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { after, limit } = parseCursorPayload(await req.json().catch(() => null));

  let rows: AdRow[] = [];
  let nextAfter: string | null = null;

  try {
    ({ rows, nextAfter } = await fetchAdsPage(
      loaded.actId,
      loaded.accessToken,
      limit,
      after
    ));
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

  // Degrade gracefully if Meta rejects video_id field during hydration
  let videoResult: Awaited<ReturnType<typeof hydrateVideoIds>>;
  try {
    videoResult = await hydrateVideoIds(videoIds, loaded);
  } catch (e) {
    if (isMissingVideoIdFieldError(e)) {
      console.warn(
        "[meta/ads/list] hydrateVideoIds hit video_id field error, skipping video hydration",
        e
      );
      videoResult = { ids: new Map(), inserted: 0, skipped: 0, errors: [] } as any;
    } else {
      throw e;
    }
  }

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
      .filter(
        (c): c is { id: string; metaCreativeId: string } =>
          Boolean(c.metaCreativeId)
      )
      .map((c) => [c.metaCreativeId, c.id])
  );

  let synced = 0;

  for (const a of rows) {
    if (!a.id) continue;
    const adSetDb = a.adset_id ? setByMeta.get(a.adset_id) : undefined;
    if (!adSetDb) continue;

    const creativeDb =
      a.creative?.id && crByMeta.has(a.creative.id)
        ? crByMeta.get(a.creative.id)!
        : null;

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