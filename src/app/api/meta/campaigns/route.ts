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

  const campaigns = await prisma.metaCampaign.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items: campaigns });
}

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    objective?: unknown;
    dailyBudgetPaise?: unknown;
    specialAdCategories?: unknown;
  } | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const objective = typeof body?.objective === "string" ? body.objective.trim() : "";
  if (!name || !objective) {
    return NextResponse.json({ error: "name and objective are required" }, { status: 400 });
  }

  const dailyBudgetPaise =
    typeof body?.dailyBudgetPaise === "number" && Number.isFinite(body.dailyBudgetPaise)
      ? Math.max(0, Math.floor(body.dailyBudgetPaise))
      : 0;

  const categories = Array.isArray(body?.specialAdCategories)
    ? body!.specialAdCategories!.filter((x): x is string => typeof x === "string")
    : [];

  const special = categories.length > 0 ? categories : (["NONE"] as string[]);

  const payload: Record<string, unknown> = {
    name,
    objective,
    status: "PAUSED",
    special_ad_categories: special,
    is_adset_budget_sharing_enabled: false,
  };
  if (dailyBudgetPaise > 0) {
    payload.daily_budget = dailyBudgetPaise;
  }

  let created: { id?: string };
  try {
    created = (await graphPost(`${loaded.actId}/campaigns`, payload, {
      accessToken: loaded.accessToken,
    })) as { id?: string };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Campaign create failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const metaCampaignId = created.id;
  if (!metaCampaignId) {
    return NextResponse.json({ error: "Meta did not return campaign id" }, { status: 502 });
  }

  const emptyTargeting: Prisma.InputJsonValue = {};

  const row = await prisma.metaCampaign.create({
    data: {
      metaIntegrationId: loaded.integrationId,
      metaCampaignId,
      name,
      objective,
      status: "PAUSED",
      dailyBudget: dailyBudgetPaise,
      specialAdCategory: categories[0] ?? null,
      targeting: emptyTargeting,
    },
  });

  return NextResponse.json({ campaign: row });
}
