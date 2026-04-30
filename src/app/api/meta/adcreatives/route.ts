import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

export async function GET() {
  console.log("[api/meta/adcreatives][GET] request");
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    console.log("[api/meta/adcreatives][GET] response", { status: 401, error: "Meta not connected" });
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  console.log("[api/meta/adcreatives][GET] session", { integrationId: loaded.integrationId });

  const items = await prisma.metaCreative.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    orderBy: { createdAt: "desc" },
  });
  console.log("[api/meta/adcreatives][GET] response", {
    status: 200,
    items: items.length,
    sampleMetaCreativeIds: items.slice(0, 3).map((x) => x.metaCreativeId),
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  console.log("[api/meta/adcreatives][POST] request");
  const loaded = await loadIntegrationForSession();
  // Add right after `const loaded = await loadIntegrationForSession();`
  const debugToken = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${loaded?.accessToken}&access_token=${loaded?.accessToken}`
  );
  const debugJson = await debugToken.json();
  console.log("[debug] token_info", JSON.stringify(debugJson.data, null, 2));
// Look at `app_id` in the output — does it match your new Business app?
  if (!loaded) {
    console.log("[api/meta/adcreatives][POST] response", { status: 401, error: "Meta not connected" });
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

  console.log("[api/meta/adcreatives][POST] parsed_body", {
    integrationId: loaded.integrationId,
    mediaId: mediaId || null,
    headline,
    primaryTextLength: primaryText.length,
    descriptionLength: description.length,
    ctaType,
    landingUrl,
    name,
  });

  if (!mediaId || !headline || !primaryText || !landingUrl) {
    console.log("[api/meta/adcreatives][POST] response", {
      status: 400,
      error: "mediaId, headline, primaryText, and landingUrl are required",
    });
    return NextResponse.json(
      { error: "mediaId, headline, primaryText, and landingUrl are required" },
      { status: 400 },
    );
  }

  const media = await prisma.metaMedia.findFirst({
    where: { id: mediaId, metaIntegrationId: loaded.integrationId, kind: "image" },
  });
  if (!media?.imageHash) {
    console.log("[api/meta/adcreatives][POST] response", {
      status: 400,
      error: "Image media not found or missing image hash",
      mediaId,
    });
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
    console.log("[api/meta/adcreatives][POST] graphPost", {
      endpoint: `${loaded.actId}/adcreatives`,
      name,
      pageId: loaded.fbPageId,
      imageHash: media.imageHash,
      ctaType,
      landingUrl,
    });
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
    const metaPayload = (e as any)?.payload ?? null;
    console.log("[api/meta/adcreatives][POST] response", { status: 502, error: msg, metaPayload });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const metaCreativeId = created.id;
  if (!metaCreativeId) {
    console.log("[api/meta/adcreatives][POST] response", {
      status: 502,
      error: "Meta did not return creative id",
    });
    return NextResponse.json({ error: "Meta did not return creative id" }, { status: 502 });
  }

  console.log("[api/meta/adcreatives][POST] meta_response", {
    ok: true,
    metaCreativeId,
  });

  const row = await prisma.metaCreative.upsert({
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
      headline,
      primaryText,
      description: description || null,
      ctaType,
      landingUrl,
      imageUrl: media.imageUrl,
      aiGenerated: false,
    },
    update: {
      imageHash: media.imageHash,
      headline,
      primaryText,
      description: description || null,
      ctaType,
      landingUrl,
      imageUrl: media.imageUrl,
    },
  });

  console.log("[api/meta/adcreatives][POST] db_upsert", {
    ok: true,
    creativeDbId: row.id,
    metaCreativeId: row.metaCreativeId,
  });

  console.log("[api/meta/adcreatives][POST] response", {
    status: 200,
    metaCreativeId,
    creativeDbId: row.id,
  });
  return NextResponse.json({ creative: row });
}
