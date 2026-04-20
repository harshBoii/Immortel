import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const items = await prisma.metaAdSet.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    include: { campaign: { select: { id: true, name: true, metaCampaignId: true } } },
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
  if (!campaignDbId || !name) {
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

  const targeting = (body?.targeting && typeof body.targeting === "object"
    ? body.targeting
    : defaultTargeting) as Prisma.InputJsonValue;

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
    created = (await graphPost(`${loaded.actId}/adsets`, payload, {
      accessToken: loaded.accessToken,
    })) as { id?: string };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ad set create failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const metaAdSetId = created.id;
  if (!metaAdSetId) {
    return NextResponse.json({ error: "Meta did not return ad set id" }, { status: 502 });
  }

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

  return NextResponse.json({ adSet: row });
}
