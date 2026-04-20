import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ adId: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { adId } = await ctx.params;
  if (!adId) {
    return NextResponse.json({ error: "adId required" }, { status: 400 });
  }

  const ad = await prisma.metaAd.findFirst({
    where: { metaIntegrationId: loaded.integrationId, metaAdId: adId },
  });
  if (!ad) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  try {
    await graphPost(
      adId,
      {
        status: "ACTIVE",
      },
      { accessToken: loaded.accessToken },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Activate failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const updated = await prisma.metaAd.update({
    where: { id: ad.id },
    data: {
      status: "ACTIVE",
      publishedAt: new Date(),
      reviewStatus: "IN_REVIEW",
    },
  });

  return NextResponse.json({ ad: updated });
}
