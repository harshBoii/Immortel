import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const items = await prisma.metaCreative.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    mediaId?: unknown;
    headline?: unknown;
    primaryText?: unknown;
    description?: unknown;
    ctaType?: unknown;
    landingUrl?: unknown;
    name?: unknown;
  } | null;

  const mediaId = typeof body?.mediaId === "string" ? body.mediaId : "";
  const headline = typeof body?.headline === "string" ? body.headline.trim() : "";
  const primaryText = typeof body?.primaryText === "string" ? body.primaryText.trim() : "";
  const landingUrl = typeof body?.landingUrl === "string" ? body.landingUrl.trim() : "";
  const ctaType = typeof body?.ctaType === "string" ? body.ctaType.trim() : "LEARN_MORE";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : headline || "Creative";

  if (!mediaId || !headline || !primaryText || !landingUrl) {
    return NextResponse.json(
      { error: "mediaId, headline, primaryText, and landingUrl are required" },
      { status: 400 },
    );
  }

  const media = await prisma.metaMedia.findFirst({
    where: { id: mediaId, metaIntegrationId: loaded.integrationId, kind: "image" },
  });
  if (!media?.imageHash) {
    return NextResponse.json(
      { error: "Image media not found or missing image hash" },
      { status: 400 },
    );
  }

  const object_story_spec = {
    page_id: loaded.fbPageId,
    link_data: {
      message: primaryText,
      link: landingUrl,
      name: headline,
      ...(description ? { description } : {}),
      call_to_action: {
        type: ctaType,
      },
      image_hash: media.imageHash,
    },
  };

  let created: { id?: string };
  try {
    created = (await graphPost(
      `${loaded.actId}/adcreatives`,
      {
        name,
        object_story_spec,
      },
      { accessToken: loaded.accessToken },
    )) as { id?: string };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ad creative create failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const metaCreativeId = created.id;
  if (!metaCreativeId) {
    return NextResponse.json({ error: "Meta did not return creative id" }, { status: 502 });
  }

  const row = await prisma.metaCreative.create({
    data: {
      metaIntegrationId: loaded.integrationId,
      metaCampaignId: null,
      metaCreativeId,
      imageHash: media.imageHash,
      headline,
      primaryText,
      description: description || null,
      ctaType,
      landingUrl,
      imageUrl: media.imageUrl,
      aiGenerated: false,
    },
  });

  return NextResponse.json({ creative: row });
}
