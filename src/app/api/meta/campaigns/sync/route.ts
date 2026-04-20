import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type CampaignRow = {
  id?: string;
  name?: string;
  objective?: string;
  status?: string;
  daily_budget?: string;
  special_ad_category?: string;
};

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const fields = "id,name,objective,status,daily_budget,special_ad_category";
  const rows: CampaignRow[] = [];
  let after: string | undefined;

  try {
    for (;;) {
      const params: Record<string, string | number | boolean | undefined> = {
        fields,
        limit: 100,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${loaded.actId}/campaigns`, params, {
        accessToken: loaded.accessToken,
      })) as {
        data?: CampaignRow[];
        paging?: { cursors?: { after?: string } };
      };

      const chunk = page.data ?? [];
      rows.push(...chunk);
      after = page.paging?.cursors?.after;
      if (!after || chunk.length === 0) break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const emptyTargeting: Prisma.InputJsonValue = {};
  let upserted = 0;

  for (const c of rows) {
    if (!c.id) continue;
    const daily = c.daily_budget ? parseInt(String(c.daily_budget), 10) : 0;
    await prisma.metaCampaign.upsert({
      where: {
        metaIntegrationId_metaCampaignId: {
          metaIntegrationId: loaded.integrationId,
          metaCampaignId: c.id,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        metaCampaignId: c.id,
        name: c.name ?? "Campaign",
        objective: c.objective ?? "OUTCOME_TRAFFIC",
        status: c.status ?? "PAUSED",
        dailyBudget: Number.isFinite(daily) ? daily : 0,
        specialAdCategory: c.special_ad_category ?? null,
        targeting: emptyTargeting,
      },
      update: {
        name: c.name ?? "Campaign",
        objective: c.objective ?? "OUTCOME_TRAFFIC",
        status: c.status ?? "PAUSED",
        dailyBudget: Number.isFinite(daily) ? daily : 0,
        specialAdCategory: c.special_ad_category ?? null,
      },
    });
    upserted += 1;
  }

  return NextResponse.json({ ok: true, synced: upserted });
}
