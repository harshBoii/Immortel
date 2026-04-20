import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const items = await prisma.metaAd.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    include: {
      adSet: { select: { id: true, name: true, metaAdSetId: true } },
      creative: { select: { id: true, headline: true, metaCreativeId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
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
    created = (await graphPost(
      `${loaded.actId}/ads`,
      {
        name,
        adset_id: adSet.metaAdSetId,
        creative: { creative_id: creative.metaCreativeId },
        status: "PAUSED",
      },
      { accessToken: loaded.accessToken },
    )) as { id?: string };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ad create failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const metaAdId = created.id;
  if (!metaAdId) {
    return NextResponse.json({ error: "Meta did not return ad id" }, { status: 502 });
  }

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

  await prisma.metaCampaign.update({
    where: { id: adSet.campaignId },
    data: { metaAdId },
  });

  return NextResponse.json({ ad: row });
}
