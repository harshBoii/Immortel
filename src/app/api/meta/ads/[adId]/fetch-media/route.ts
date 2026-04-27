import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds, type MediaRowSnapshot } from "@/lib/meta/mediaSync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v25.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ─── Types ────────────────────────────────────────────────────────────────────

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

type CreativeRow = {
  id?: string;
  name?: string;
  object_story_spec?: StorySpec | null;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  thumbnail_url?: string;
};

type PageWithToken = {
  id: string;
  name: string;
  access_token: string;
};

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(step: string, data: Record<string, unknown>) {
  console.log(`[ad/creative/sync] [${step}]`, JSON.stringify(data));
}

// ─── Guards ───────────────────────────────────────────────────────────────────

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

// ─── Page token resolution ────────────────────────────────────────────────────

// Fetches all pages the user admins and returns the first page access token.
// Falls back to the user token if /me/accounts fails or returns no pages.
async function resolvePageAccessToken(userToken: string): Promise<string> {
  try {
    const url = new URL(`${GRAPH_BASE}/me/accounts`);
    url.searchParams.set("fields", "id,name,access_token");
    url.searchParams.set("limit", "10");
    url.searchParams.set("access_token", userToken);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      log("page-token:http-error", { status: res.status });
      return userToken;
    }

    const json = (await res.json()) as { data?: PageWithToken[]; error?: { message?: string } };

    if (json.error) {
      log("page-token:api-error", { error: json.error.message });
      return userToken;
    }

    const pages = json.data ?? [];
    if (pages.length === 0) {
      log("page-token:no-pages", {});
      return userToken;
    }

    // Use first page token — if you store pageId in the integration,
    // you can match: pages.find(p => p.id === loaded.pageId)?.access_token
    const pageToken = pages[0]!.access_token;
    log("page-token:resolved", {
      pageId: pages[0]!.id,
      pageName: pages[0]!.name,
      tokenPrefix: pageToken.slice(0, 20),
    });

    return pageToken;
  } catch (e) {
    log("page-token:exception", { error: (e as any)?.message });
    return userToken; // always fall back to user token
  }
}

// ─── Creative fetch with video_id fallback chain ──────────────────────────────

const CREATIVE_FIELD_ATTEMPTS = [
  "id,name,image_hash,image_url,video_id,thumbnail_url,object_story_spec{link_data{name,message,link,description,image_hash,picture,video_id,child_attachments{image_hash,picture,video_id}},video_data{video_id,image_hash,image_url},template_data{link,message,name,description,picture,image_hash,video_id,child_attachments{image_hash,picture,video_id}}}",
  "id,name,image_hash,image_url,thumbnail_url,object_story_spec{link_data{name,message,link,description,image_hash,picture,child_attachments{image_hash,picture}},video_data{video_id,image_hash,image_url},template_data{link,message,name,description,picture,image_hash,child_attachments{image_hash,picture}}}",
  "id,name,image_hash,image_url,thumbnail_url,object_story_spec{link_data{name,message,link,description,image_hash,picture},video_data{image_hash,image_url},template_data{link,message,name,description,picture,image_hash}}",
  "id,name,image_hash,image_url,thumbnail_url",
];

async function fetchCreativeWithFallback(
  metaCreativeId: string,
  accessToken: string
): Promise<CreativeRow> {
  let lastError: unknown = null;

  for (const fields of CREATIVE_FIELD_ATTEMPTS) {
    try {
      const res = (await graphGet(
        metaCreativeId,
        { fields },
        { accessToken }
      )) as CreativeRow;
      log("creative:fetched", {
        metaCreativeId,
        attempt: fields.slice(0, 60) + "...",
        hasVideoId:
          Boolean(res.video_id) ||
          Boolean(res.object_story_spec?.video_data?.video_id),
        hasImageHash: Boolean(res.image_hash),
      });
      return res;
    } catch (e) {
      lastError = e;
      log("creative:retry", {
        metaCreativeId,
        reason: (e as any)?.message,
        isVideoIdErr: isMissingVideoIdFieldError(e),
      });
      if (!isMissingVideoIdFieldError(e)) throw e;
    }
  }

  if (lastError) throw lastError;
  return {};
}

// ─── Media extraction helpers ─────────────────────────────────────────────────

function fromSpec(row: CreativeRow): {
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

function collectMediaRefs(row: CreativeRow): {
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

  return {
    hashes: [...new Set(hashes)],
    pictures: [...new Set(pictures)],
    videoIds: [...new Set(videoIds)],
  };
}

function pickMedia(
  row: CreativeRow,
  imageRows: Map<string, MediaRowSnapshot>,
  videoRows: Map<string, MediaRowSnapshot>,
): {
  imageHash: string | null;
  videoId: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  videoStreamId: string | null;
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
    videoStreamId: vidMedia?.videoStreamId ?? null,
    thumbnailUrl: vidMedia?.thumbnailUrl ?? row.thumbnail_url ?? null,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ adId: string }> }
) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { adId } = await ctx.params;
  const metaAdId = typeof adId === "string" ? adId.trim() : "";
  if (!metaAdId) {
    return NextResponse.json({ error: "Missing adId" }, { status: 400 });
  }

  log("start", { metaAdId, integrationId: loaded.integrationId });

  // ── Resolve page access token once upfront ─────────────────────────────────
  // /me/accounts returns page tokens — these have access to video `source`
  // whereas the ad account user token often doesn't.
  // resolvePageAccessToken always falls back to loaded.accessToken on any error.
  const pageAccessToken = await resolvePageAccessToken(loaded.accessToken);
  const usingPageToken = pageAccessToken !== loaded.accessToken;
  log("token:resolved", {
    usingPageToken,
    tokenPrefix: pageAccessToken.slice(0, 20),
  });

  // Build a patched `loaded` with the page token swapped in for video hydration
  const loadedWithPageToken = usingPageToken
    ? { ...loaded, accessToken: pageAccessToken }
    : loaded;

  // ── Step 1: Get creative ID from the ad ────────────────────────────────────

  const adInfo = (await graphGet(
    metaAdId,
    { fields: "creative{id}" },
    { accessToken: loaded.accessToken } // ad account token is fine here
  )) as { creative?: { id?: string } };

  const metaCreativeId = adInfo.creative?.id;
  log("ad:creative-id", { metaAdId, metaCreativeId: metaCreativeId ?? null });

  if (!metaCreativeId) {
    return NextResponse.json({
      ok: true,
      metaAdId,
      metaCreativeId: null,
      note: "No creative id on ad",
    });
  }

  // ── Step 2: Fetch full creative detail (with video_id fallback chain) ──────

  let creative: CreativeRow;
  try {
    creative = await fetchCreativeWithFallback(metaCreativeId, loaded.accessToken);
  } catch (e) {
    const msg = (e as any)?.message ?? "Creative fetch failed";
    log("creative:fatal", { metaCreativeId, error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const refs = collectMediaRefs(creative);
  log("refs:collected", {
    metaCreativeId,
    imageHashes: refs.hashes.length,
    videoIds: refs.videoIds.length,
    pictures: refs.pictures.length,
  });

  // ── Step 3: Hydrate images (user token) + videos (page token) ─────────────

  const imageResult = await hydrateImageHashes(
    refs.hashes,
    loaded // ad account token — correct for adimages API
  );

  const videoResult = await hydrateVideoIds(
    refs.videoIds,
    loadedWithPageToken // page token — needed to get video `source` URL
  );

  log("hydrate:done", {
    images: { inserted: imageResult.inserted, skipped: imageResult.skipped },
    videos: { inserted: videoResult.inserted, skipped: videoResult.skipped },
    videoTokenType: usingPageToken ? "page" : "user",
  });

  // ── Step 4: Upsert MetaCreative ────────────────────────────────────────────

  const parsed = fromSpec(creative);
  const media = pickMedia(creative, imageResult.rows, videoResult.rows);

  log("upsert:media", {
    metaCreativeId,
    imageHash: media.imageHash,
    videoId: media.videoId,
    videoStreamId: media.videoStreamId,
    hasVideoUrl: Boolean(media.videoUrl),
    hasThumbnail: Boolean(media.thumbnailUrl),
    hasImageUrl: Boolean(media.imageUrl),
  });

  const creativeDb = await prisma.metaCreative.upsert({
    where: {
      metaIntegrationId_metaCreativeId: {
        metaIntegrationId: loaded.integrationId,
        metaCreativeId,
      },
    },
    create: {
      metaIntegrationId: loaded.integrationId,
      metaCampaignId: null,
      metaCreativeId,
      imageHash: media.imageHash,
      videoId: media.videoId,
      imageUrl: media.imageUrl,
      videoUrl: media.videoUrl,
      videoStreamId: media.videoStreamId,
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
      videoStreamId: media.videoStreamId,
      thumbnailUrl: media.thumbnailUrl,
      headline: parsed.headline,
      primaryText: parsed.primary,
      description: parsed.description,
      landingUrl: parsed.url,
    },
    select: { id: true },
  });

  log("upsert:done", { metaCreativeId, creativeDbId: creativeDb.id });

  // ── Step 5: Link ad → creative in MetaAd ──────────────────────────────────

  const updated = await prisma.metaAd.updateMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      metaAdId,
      OR: [
        { metaCreativeDbId: null },
        { metaCreativeDbId: { not: creativeDb.id } },
      ],
    },
    data: { metaCreativeDbId: creativeDb.id },
  });

  log("ad:linked", { metaAdId, creativeDbId: creativeDb.id, rowsUpdated: updated.count });

  return NextResponse.json({
    ok: true,
    metaAdId,
    metaCreativeId,
    creativeDbId: creativeDb.id,
    tokenUsed: usingPageToken ? "page" : "user",
    media: {
      imageHash: media.imageHash,
      videoId: media.videoId,
      videoStreamId: media.videoStreamId,
      hasVideoUrl: Boolean(media.videoUrl),
      hasThumbnail: Boolean(media.thumbnailUrl),
      hasImageUrl: Boolean(media.imageUrl),
    },
    hydrated: {
      images: { inserted: imageResult.inserted, skipped: imageResult.skipped },
      videos: { inserted: videoResult.inserted, skipped: videoResult.skipped },
    },
  });
}