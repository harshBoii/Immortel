import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

type AdRow = {
  id?: string;
  name?: string;
  status?: string;
  adset_id?: string;
  creative?: { id?: string };
};

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const fields = "id,name,status,adset_id,creative{id}";
  const rows: AdRow[] = [];
  let after: string | undefined;

  try {
    for (;;) {
      const params: Record<string, string | number | boolean | undefined> = {
        fields,
        limit: 100,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${loaded.actId}/ads`, params, {
        accessToken: loaded.accessToken,
      })) as {
        data?: AdRow[];
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

  const adSets = await prisma.metaAdSet.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    select: { id: true, metaAdSetId: true },
  });
  const setByMeta = new Map(adSets.map((s) => [s.metaAdSetId, s.id]));

  const creatives = await prisma.metaCreative.findMany({
    where: { metaIntegrationId: loaded.integrationId },
    select: { id: true, metaCreativeId: true },
  });
  const crByMeta = new Map(
    creatives
      .filter((c): c is { id: string; metaCreativeId: string } => Boolean(c.metaCreativeId))
      .map((c) => [c.metaCreativeId, c.id]),
  );

  let synced = 0;

  for (const a of rows) {
    if (!a.id) continue;
    const adSetDb = a.adset_id ? setByMeta.get(a.adset_id) : undefined;
    if (!adSetDb) continue;

    const creativeDb =
      a.creative?.id && crByMeta.has(a.creative.id) ? crByMeta.get(a.creative.id)! : null;

    await prisma.metaAd.upsert({
      where: {
        metaIntegrationId_metaAdId: {
          metaIntegrationId: loaded.integrationId,
          metaAdId: a.id,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        adSetId: adSetDb,
        metaAdId: a.id,
        name: a.name ?? null,
        status: a.status ?? null,
        metaCreativeDbId: creativeDb,
      },
      update: {
        name: a.name ?? null,
        status: a.status ?? null,
        metaCreativeDbId: creativeDb,
      },
    });
    synced += 1;
  }

  return NextResponse.json({ ok: true, synced });
}
