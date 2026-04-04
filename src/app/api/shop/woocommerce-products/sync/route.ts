import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncWooCommerceProductsForCompany } from "@/lib/woocommerce/sync-products";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const result = await syncWooCommerceProductsForCompany(session.companyId);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    console.error("[woocommerce sync]", e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
