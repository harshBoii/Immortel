import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET() {
  console.log("[api/meta/adsets][GET] request");
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    console.log("[api/meta/adsets][GET] response", { status: 401, error: "Meta not connected" });
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  console.log("[api/meta/adsets][GET] session", { integrationId: loaded.integrationId });

  const items = await prisma.metaAdSet.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    include: { campaign: { select: { id: true, name: true, metaCampaignId: true } } },
    orderBy: { updatedAt: "desc" },
  });
  console.log("[api/meta/adsets][GET] response", {
    status: 200,
    items: items.length,
    sampleMetaAdSetIds: items.slice(0, 3).map((x) => x.metaAdSetId),
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  console.log("[api/meta/adsets][POST] request");
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    console.log("[api/meta/adsets][POST] response", { status: 401, error: "Meta not connected" });
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    campaignDbId?: unknown;
    name?: unknown;
    dailyBudgetPaise?: unknown;
    optimizationGoal?: unknown;
    billingEvent?: unknown;
    bidStrategy?: unknown;
    startTimeIso?: unknown;
    targeting?: unknown;
  } | null;

  const campaignDbId = typeof body?.campaignDbId === "string" ? body.campaignDbId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  console.log("[api/meta/adsets][POST] parsed_body", {
    integrationId: loaded.integrationId,
    campaignDbId: campaignDbId || null,
    name,
    dailyBudgetPaise: body?.dailyBudgetPaise ?? null,
    optimizationGoal: body?.optimizationGoal ?? null,
    billingEvent: body?.billingEvent ?? null,
    bidStrategy: body?.bidStrategy ?? null,
    startTimeIso: body?.startTimeIso ?? null,
    hasTargeting: Boolean(body?.targeting && typeof body.targeting === "object"),
  });
  if (!campaignDbId || !name) {
    console.log("[api/meta/adsets][POST] response", {
      status: 400,
      error: "campaignDbId and name are required",
    });
    return NextResponse.json({ error: "campaignDbId and name are required" }, { status: 400 });
  }

  const dailyBudgetPaise =
    typeof body?.dailyBudgetPaise === "number" && Number.isFinite(body.dailyBudgetPaise)
      ? Math.max(0, Math.floor(body.dailyBudgetPaise))
      : 0;

  const optimizationGoal =
    typeof body?.optimizationGoal === "string" ? body.optimizationGoal : "LINK_CLICKS";
  const billingEvent =
    typeof body?.billingEvent === "string" ? body.billingEvent : "IMPRESSIONS";
  const bidStrategy =
    typeof body?.bidStrategy === "string" ? body.bidStrategy : "LOWEST_COST_WITHOUT_CAP";

  const campaign = await prisma.metaCampaign.findFirst({
    where: { id: campaignDbId, metaIntegrationId: loaded.integrationId },
  });
  if (!campaign) {
    console.log("[api/meta/adsets][POST] response", { status: 404, error: "Campaign not found", campaignDbId });
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const defaultTargeting: Prisma.InputJsonValue = {
    geo_locations: { countries: ["IN"] },
    age_min: 18,
    age_max: 45,
    publisher_platforms: ["facebook", "instagram"],
    facebook_positions: ["feed"],
    instagram_positions: ["stream", "story"],
  };

  const targetingRaw = (body?.targeting && typeof body.targeting === "object"
    ? body.targeting
    : defaultTargeting) as Prisma.InputJsonValue;

  // Meta requires targeting_automation.advantage_audience to be explicitly set (1 or 0).
  // See error_subcode: 1870227 ("Advantage audience flag required").
  const targeting =
    targetingRaw && typeof targetingRaw === "object" && !Array.isArray(targetingRaw)
      ? (() => {
          const t = targetingRaw as Record<string, unknown>;
          const existingAutomation =
            t.targeting_automation &&
            typeof t.targeting_automation === "object" &&
            !Array.isArray(t.targeting_automation)
              ? (t.targeting_automation as Record<string, unknown>)
              : {};

          const existingAdv = existingAutomation.advantage_audience;
          const advantage_audience = existingAdv === 0 || existingAdv === 1 ? existingAdv : 0;

          return {
            ...t,
            targeting_automation: {
              ...existingAutomation,
              advantage_audience,
            },
          } satisfies Prisma.InputJsonValue;
        })()
      : targetingRaw;

  const startTime =
    typeof body?.startTimeIso === "string" && body.startTimeIso
      ? Math.floor(new Date(body.startTimeIso).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = {
    name,
    campaign_id: campaign.metaCampaignId,
    status: "PAUSED",
    daily_budget: dailyBudgetPaise,
    billing_event: billingEvent,
    optimization_goal: optimizationGoal,
    bid_strategy: bidStrategy,
    targeting,
    start_time: startTime,
  };

  let created: { id?: string };
  try {
    console.log("[api/meta/adsets][POST] graphPost", {
      endpoint: `${loaded.actId}/adsets`,
      name,
      metaCampaignId: campaign.metaCampaignId,
      daily_budget: dailyBudgetPaise,
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      bid_strategy: bidStrategy,
      advantage_audience:
        targeting && typeof targeting === "object" && !Array.isArray(targeting)
          ? ((targeting as Record<string, unknown>).targeting_automation as any)?.advantage_audience ??
            null
          : null,
      start_time: startTime,
    });
    created = (await graphPost(`${loaded.actId}/adsets`, payload, {
      accessToken: loaded.accessToken,
    })) as { id?: string };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ad set create failed";
    const metaPayload = (e as any)?.payload ?? null;
    console.log("[api/meta/adsets][POST] response", { status: 502, error: msg, metaPayload });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const metaAdSetId = created.id;
  if (!metaAdSetId) {
    console.log("[api/meta/adsets][POST] response", { status: 502, error: "Meta did not return ad set id" });
    return NextResponse.json({ error: "Meta did not return ad set id" }, { status: 502 });
  }

  console.log("[api/meta/adsets][POST] graphPost_response", { metaAdSetId });

  const row = await prisma.metaAdSet.create({
    data: {
      metaIntegrationId: loaded.integrationId,
      campaignId: campaign.id,
      metaAdSetId,
      name,
      status: "PAUSED",
      dailyBudget: dailyBudgetPaise,
      optimizationGoal,
      billingEvent,
      bidStrategy,
      targeting,
      startTime: new Date(startTime * 1000),
    },
  });

  await prisma.metaCampaign.update({
    where: { id: campaign.id },
    data: { metaAdSetId },
  });

  console.log("[api/meta/adsets][POST] response", { status: 200, metaAdSetId, adSetDbId: row.id });
  return NextResponse.json({ adSet: row });
}
