import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";


export async function GET() {
  console.log("[api/meta/ads][GET] request");
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    console.log("[api/meta/ads][GET] response", { status: 401, error: "Meta not connected" });
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  console.log("[api/meta/ads][GET] session", {
    integrationId: loaded.integrationId,
  });

  const items = await prisma.metaAd.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    select: {
      id: true,
      metaAdId: true,
      name: true,
      status: true,
      updatedAt: true,
      adSet: { select: { id: true, name: true, metaAdSetId: true } },
      creative: { select: { id: true, headline: true, metaCreativeId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const metaAdIds = items.map((a) => a.metaAdId);
  const metricsRows =
    metaAdIds.length === 0
      ? []
      : await prisma.metaAdMetrics.findMany({
          where: { metaAdId: { in: metaAdIds } },
          orderBy: { recordedAt: "desc" },
          select: {
            metaAdId: true,
            impressions: true,
            clicks: true,
            ctr: true,
            roas: true,
            recordedAt: true,
          },
        });

  const latestByMetaAdId = new Map<
    string,
    { impressions: number; clicks: number; ctr: number; roas: number | null }
  >();
  for (const m of metricsRows) {
    if (!latestByMetaAdId.has(m.metaAdId)) {
      latestByMetaAdId.set(m.metaAdId, {
        impressions: m.impressions,
        clicks: m.clicks,
        ctr: m.ctr,
        roas: m.roas,
      });
    }
  }

  const payload = items.map((row) => ({
    ...row,
    metrics: latestByMetaAdId.get(row.metaAdId) ?? null,
  }));

  console.log("[api/meta/ads][GET] response", {
    status: 200,
    items: payload.length,
    sampleMetaAdIds: payload.slice(0, 3).map((x) => x.metaAdId),
  });
  return NextResponse.json({ items: payload });
}

export async function POST(req: Request) {
  console.log("[api/meta/ads][POST] request");
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    console.log("[api/meta/ads][POST] response", { status: 401, error: "Meta not connected" });
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    adSetDbId?: unknown;
    creativeDbId?: unknown;
    name?: unknown;
  } | null;

  const adSetDbId = typeof body?.adSetDbId === "string" ? body.adSetDbId : "";
  const creativeDbId = typeof body?.creativeDbId === "string" ? body.creativeDbId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "Ad";

  console.log("[api/meta/ads][POST] parsed_body", {
    integrationId: loaded.integrationId,
    adSetDbId: adSetDbId || null,
    creativeDbId: creativeDbId || null,
    name,
  });

  if (!adSetDbId || !creativeDbId) {
    return NextResponse.json({ error: "adSetDbId and creativeDbId are required" }, { status: 400 });
  }

  const adSet = await prisma.metaAdSet.findFirst({
    where: { id: adSetDbId, metaIntegrationId: loaded.integrationId },
  });
  if (!adSet) {
    return NextResponse.json({ error: "Ad set not found" }, { status: 404 });
  }

  const creative = await prisma.metaCreative.findFirst({
    where: { id: creativeDbId, metaIntegrationId: loaded.integrationId },
  });
  if (!creative?.metaCreativeId) {
    return NextResponse.json({ error: "Creative not found or missing Meta id" }, { status: 400 });
  }

  let created: { id?: string };
  try {
    console.log("[api/meta/ads][POST] graphPost", {
      endpoint: `${loaded.actId}/ads`,
      name,
      metaAdSetId: adSet.metaAdSetId,
      metaCreativeId: creative.metaCreativeId,
      status: "PAUSED",
    });

    created = (await graphPost(
      `${loaded.actId}/ads`,
      {
        name,
        adset_id: adSet.metaAdSetId,
        // graphPost already JSON.stringifies objects — pass as-is
        creative: { creative_id: creative.metaCreativeId },
        status: "PAUSED",
      },
      { accessToken: loaded.accessToken },
    )) as { id?: string };
  } catch (e) {
    // FIX: MetaGraphError stores the response body in `.payload`, not `.response.data`
    const metaPayload = (e as any)?.payload ?? null;
    const msg = e instanceof Error ? e.message : "Ad create failed";
    console.log("[api/meta/ads][POST] response", {
      status: 502,
      error: msg,
      // This now logs the FULL Meta error: { error: { code, error_subcode, message, fbtrace_id } }
      metaPayload,
    });
    return NextResponse.json({ error: msg, metaPayload }, { status: 502 });
  }

  const metaAdId = created.id;
  if (!metaAdId) {
    return NextResponse.json({ error: "Meta did not return ad id" }, { status: 502 });
  }

  console.log("[api/meta/ads][POST] graphPost_response", { metaAdId });

  const row = await prisma.metaAd.create({
    data: {
      metaIntegrationId: loaded.integrationId,
      adSetId: adSet.id,
      metaCreativeDbId: creative.id,
      metaAdId,
      name,
      status: "PAUSED",
    },
  });

  console.log("[api/meta/ads][POST] response", { status: 200, metaAdId, adDbId: row.id });
  return NextResponse.json({ ad: row });
}