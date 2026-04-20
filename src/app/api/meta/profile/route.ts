import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { accessToken, adAccountId, fbPageId, actId } = loaded;

  try {
    const integ = await prisma.metaIntegration.findUnique({
      where: { id: loaded.integrationId },
      select: { lastRefreshed: true },
    });

    const acctRes = (await graphGet(
      "me/adaccounts",
      { fields: "name,account_id", limit: "200" },
      { accessToken },
    )) as { data?: Array<{ name?: string; account_id?: string }> };

    const norm = (id: string) => id.replace(/^act_/, "");
    const target = norm(adAccountId);
    const match = acctRes.data?.find((a) => norm(a.account_id ?? "") === target);

    const pagesRes = (await graphGet(
      "me/accounts",
      { fields: "name,id" },
      { accessToken },
    )) as { data?: Array<{ name?: string; id?: string }> };

    const pageMatch = pagesRes.data?.find((p) => p.id === fbPageId);

    return NextResponse.json({
      meta: {
        adAccountId,
        fbPageId,
        lastRefreshed: integ?.lastRefreshed?.toISOString() ?? null,
      },
      actId,
      adAccountName: match?.name ?? null,
      pageName: pageMatch?.name ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Profile fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
