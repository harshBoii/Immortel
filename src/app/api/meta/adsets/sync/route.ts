import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AdSetRow = {
  id?: string;
  name?: string;
  status?: string;
  daily_budget?: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_strategy?: string;
  targeting?: Record<string, unknown>;
  start_time?: string;
  end_time?: string;
};

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const campaigns = await prisma.metaCampaign.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    select: { id: true, metaCampaignId: true },
  });

  const fields =
    "id,name,status,daily_budget,optimization_goal,billing_event,bid_strategy,targeting,start_time,end_time";

  let synced = 0;

  for (const c of campaigns) {
    const rows: AdSetRow[] = [];
    let after: string | undefined;

    try {
      for (;;) {
        const params: Record<string, string | number | boolean | undefined> = {
          fields,
          limit: 100,
        };
        if (after) params.after = after;

        const page = (await graphGet(`${c.metaCampaignId}/adsets`, params, {
          accessToken: loaded.accessToken,
        })) as {
          data?: AdSetRow[];
          paging?: { cursors?: { after?: string } };
        };

        const chunk = page.data ?? [];
        rows.push(...chunk);
        after = page.paging?.cursors?.after;
        if (!after || chunk.length === 0) break;
      }
    } catch {
      continue;
    }

    for (const a of rows) {
      if (!a.id) continue;
      const daily = a.daily_budget ? parseInt(String(a.daily_budget), 10) : 0;
      const targeting = (a.targeting ?? {}) as Prisma.InputJsonValue;
      const start = a.start_time ? new Date(a.start_time) : null;
      const end = a.end_time ? new Date(a.end_time) : null;

      await prisma.metaAdSet.upsert({
        where: {
          metaIntegrationId_metaAdSetId: {
            metaIntegrationId: loaded.integrationId,
            metaAdSetId: a.id,
          },
        },
        create: {
          metaIntegrationId: loaded.integrationId,
          campaignId: c.id,
          metaAdSetId: a.id,
          name: a.name ?? null,
          status: a.status ?? null,
          dailyBudget: Number.isFinite(daily) ? daily : null,
          optimizationGoal: a.optimization_goal ?? null,
          billingEvent: a.billing_event ?? null,
          bidStrategy: a.bid_strategy ?? null,
          targeting,
          startTime: start,
          endTime: end,
        },
        update: {
          name: a.name ?? null,
          status: a.status ?? null,
          dailyBudget: Number.isFinite(daily) ? daily : null,
          optimizationGoal: a.optimization_goal ?? null,
          billingEvent: a.billing_event ?? null,
          bidStrategy: a.bid_strategy ?? null,
          targeting,
          startTime: start,
          endTime: end,
        },
      });
      synced += 1;
    }
  }

  return NextResponse.json({ ok: true, synced });
}
