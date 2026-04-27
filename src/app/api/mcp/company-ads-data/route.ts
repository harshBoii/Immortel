import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyByPassword } from "@/lib/mcp/companyPasswordAuth";
import type { MetaAdMetrics, MetaCreative, MetaMedia } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  password?: unknown;
  email?: unknown;
  companyName?: unknown;
  userName?: unknown;
};

type AdWithNarrow = {
  id: string;
  metaAdId: string;
  name: string | null;
  status: string | null;
  adSet: { name: string | null; metaAdSetId: string };
  creative: MetaCreativeNarrow | null;
};

type MetaCreativeNarrow = Pick<
  MetaCreative,
  | "id"
  | "metaCreativeId"
  | "headline"
  | "primaryText"
  | "imageHash"
  | "videoId"
  | "imageUrl"
  | "videoUrl"
  | "thumbnailUrl"
  | "landingUrl"
  | "ctaType"
>;

type MetricsSnapshot = Pick<
  MetaAdMetrics,
  "impressions" | "clicks" | "ctr" | "spend" | "roas" | "cpc" | "datePreset"
> & { recordedAt: string };

function serializeMetaMedia(
  m: Pick<
    MetaMedia,
    | "id"
    | "kind"
    | "imageHash"
    | "videoId"
    | "imageUrl"
    | "videoUrl"
    | "thumbnailUrl"
    | "videoStreamId"
    | "status"
    | "width"
    | "height"
    | "durationMs"
    | "filename"
  >,
) {
  return {
    id: m.id,
    kind: m.kind,
    imageHash: m.imageHash,
    videoId: m.videoId,
    imageUrl: m.imageUrl,
    videoUrl: m.videoUrl,
    thumbnailUrl: m.thumbnailUrl,
    videoStreamId: m.videoStreamId,
    status: m.status,
    width: m.width,
    height: m.height,
    durationMs: m.durationMs,
    filename: m.filename,
  };
}

function mediaBlockForCreative(
  c: MetaCreativeNarrow | null,
  byImage: Map<string, ReturnType<typeof serializeMetaMedia>>,
  byVideo: Map<string, ReturnType<typeof serializeMetaMedia>>,
) {
  if (!c) {
    return {
      creative: null as {
        imageUrl: string | null;
        videoUrl: string | null;
        thumbnailUrl: string | null;
        imageHash: string | null;
        videoId: string | null;
      } | null,
      linkedMetaMedia: [] as ReturnType<typeof serializeMetaMedia>[],
    };
  }
  const linked: ReturnType<typeof serializeMetaMedia>[] = [];
  const seen = new Set<string>();
  if (c.imageHash) {
    const row = byImage.get(c.imageHash);
    if (row) {
      linked.push(row);
      seen.add(row.id);
    }
  }
  if (c.videoId) {
    const row = byVideo.get(c.videoId);
    if (row && !seen.has(row.id)) {
      linked.push(row);
    }
  }
  return {
    creative: {
      imageUrl: c.imageUrl,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
      imageHash: c.imageHash,
      videoId: c.videoId,
    },
    linkedMetaMedia: linked,
  };
}

function pack(
  ad: AdWithNarrow,
  metrics: MetaAdMetrics,
  byImage: Map<string, ReturnType<typeof serializeMetaMedia>>,
  byVideo: Map<string, ReturnType<typeof serializeMetaMedia>>,
) {
  const c = ad.creative;
  return {
    ad: {
      id: ad.id,
      metaAdId: ad.metaAdId,
      name: ad.name,
      status: ad.status,
      adSet: ad.adSet,
    },
    metrics: {
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      ctr: metrics.ctr,
      roas: metrics.roas,
      spend: metrics.spend,
      cpc: metrics.cpc,
      datePreset: metrics.datePreset,
      recordedAt: metrics.recordedAt.toISOString(),
    },
    creative: c
      ? {
          id: c.id,
          metaCreativeId: c.metaCreativeId,
          headline: c.headline,
          primaryText: c.primaryText,
          ctaType: c.ctaType,
          landingUrl: c.landingUrl,
        }
      : null,
    media: {
      ...mediaBlockForCreative(c, byImage, byVideo),
    },
  };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json(
      { success: false, error: "`password` is required" },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email : undefined;
  const companyName = typeof body.companyName === "string" ? body.companyName : undefined;
  const userName = typeof body.userName === "string" ? body.userName : undefined;

  const company = await resolveCompanyByPassword(password, { email, companyName, userName });
  if (!company) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const integration = await prisma.metaIntegration.findUnique({
    where: { companyId: company.id },
    select: { id: true },
  });

  const companyOut = {
    id: company.id,
    name: company.name,
    slug: company.slug,
    email: company.email,
    userName: company.userName,
  };

  if (!integration) {
    return NextResponse.json({
      success: true,
      company: companyOut,
      meta: { connected: false, message: "No Meta integration for this company." },
      topByImpressions: [],
      topByClicks: [],
      topByRoas: [],
    });
  }

  const ads = (await prisma.metaAd.findMany({
    where: { metaIntegrationId: integration.id },
    select: {
      id: true,
      metaAdId: true,
      name: true,
      status: true,
      adSet: { select: { name: true, metaAdSetId: true } },
      creative: {
        select: {
          id: true,
          metaCreativeId: true,
          headline: true,
          primaryText: true,
          imageHash: true,
          videoId: true,
          imageUrl: true,
          videoUrl: true,
          thumbnailUrl: true,
          landingUrl: true,
          ctaType: true,
        },
      },
    },
  })) as AdWithNarrow[];

  const metaAdIds = ads.map((a) => a.metaAdId);
  const metricsRows =
    metaAdIds.length === 0
      ? []
      : await prisma.metaAdMetrics.findMany({
          where: { metaAdId: { in: metaAdIds } },
          orderBy: { recordedAt: "desc" },
        });

  const latestByMetaAd = new Map<string, MetaAdMetrics>();
  for (const m of metricsRows) {
    if (!latestByMetaAd.has(m.metaAdId)) {
      latestByMetaAd.set(m.metaAdId, m);
    }
  }

  const withMetrics = ads
    .map((ad) => {
      const m = latestByMetaAd.get(ad.metaAdId);
      return m ? { ad, metrics: m } : null;
    })
    .filter((x): x is { ad: AdWithNarrow; metrics: MetaAdMetrics } => x != null);

  const topByImpressions = [...withMetrics]
    .sort((a, b) => b.metrics.impressions - a.metrics.impressions)
    .slice(0, 5);

  const topByClicks = [...withMetrics]
    .sort((a, b) => b.metrics.clicks - a.metrics.clicks)
    .slice(0, 5);

  const withRoas = withMetrics.filter(
    (x) => x.metrics.roas != null && Number.isFinite(x.metrics.roas as number),
  );
  const topByRoas = [...withRoas]
    .sort((a, b) => (b.metrics.roas ?? 0) - (a.metrics.roas ?? 0))
    .slice(0, 5);

  const selected = new Map<string, { ad: AdWithNarrow; metrics: MetaAdMetrics }>();
  for (const x of [...topByImpressions, ...topByClicks, ...topByRoas]) {
    selected.set(x.ad.id, x);
  }

  const imageHashes = new Set<string>();
  const videoIds = new Set<string>();
  for (const { ad } of selected.values()) {
    if (ad.creative?.imageHash) imageHashes.add(ad.creative.imageHash);
    if (ad.creative?.videoId) videoIds.add(ad.creative.videoId);
  }

  const or: Array<
    { metaIntegrationId: string; imageHash: string } | { metaIntegrationId: string; videoId: string }
  > = [
    ...[...imageHashes].map((imageHash) => ({ metaIntegrationId: integration.id, imageHash })),
    ...[...videoIds].map((videoId) => ({ metaIntegrationId: integration.id, videoId })),
  ];

  const mediaList =
    or.length === 0
      ? []
      : await prisma.metaMedia.findMany({
          where: { OR: or },
          select: {
            id: true,
            kind: true,
            imageHash: true,
            videoId: true,
            imageUrl: true,
            videoUrl: true,
            thumbnailUrl: true,
            videoStreamId: true,
            status: true,
            width: true,
            height: true,
            durationMs: true,
            filename: true,
          },
        });

  const byImage = new Map<string, ReturnType<typeof serializeMetaMedia>>();
  const byVideo = new Map<string, ReturnType<typeof serializeMetaMedia>>();
  for (const m of mediaList) {
    const s = serializeMetaMedia(m);
    if (m.imageHash) byImage.set(m.imageHash, s);
    if (m.videoId) byVideo.set(m.videoId, s);
  }

  return NextResponse.json({
    success: true,
    company: companyOut,
    meta: { connected: true, metaIntegrationId: integration.id },
    topByImpressions: topByImpressions.map((x) => pack(x.ad, x.metrics, byImage, byVideo)),
    topByClicks: topByClicks.map((x) => pack(x.ad, x.metrics, byImage, byVideo)),
    topByRoas: topByRoas.map((x) => pack(x.ad, x.metrics, byImage, byVideo)),
  });
}
