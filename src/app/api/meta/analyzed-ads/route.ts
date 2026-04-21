import { NextResponse } from "next/server";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { listMetaAnalyzedAssets } from "@/lib/asset-processing";

export const runtime = "nodejs";

export async function GET() {
  try {
    const loaded = await loadIntegrationForSession();
    if (!loaded) {
      return NextResponse.json({ success: false, error: "Meta not connected" }, { status: 401 });
    }

    const items = await listMetaAnalyzedAssets({
      metaIntegrationId: loaded.integrationId,
      companyId: loaded.companyId,
    });

    return NextResponse.json({ success: true, items });
  } catch (e) {
    console.error("[meta/analyzed-ads]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

