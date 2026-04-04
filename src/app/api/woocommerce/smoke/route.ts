import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWooCommerceRestApiForCompany, parseWooCommerceAxiosError } from "@/lib/woocommerce/client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const resolved = await getWooCommerceRestApiForCompany(session.companyId);
  if (!resolved.ok) {
    const err =
      resolved.error === "NO_STORE"
        ? "No WooCommerce store connected for this workspace"
        : "Could not decrypt stored credentials";
    return NextResponse.json({ success: false, error: err }, { status: 404 });
  }

  const { client, store } = resolved;

  try {
    const res = await client.get("products", { per_page: 1 });
    const headers = res.headers as Record<string, string | undefined> & {
      get?: (name: string) => string | undefined;
    };
    const total =
      headers.get?.("x-wp-total") ??
      headers["x-wp-total"] ??
      headers["X-WP-Total"];
    return NextResponse.json({
      success: true,
      data: {
        storeUrl: store.storeUrl,
        keyPermissions: store.keyPermissions,
        sampleProductCountHeader: total ?? null,
        ok: true,
      },
    });
  } catch (e) {
    const parsed = parseWooCommerceAxiosError(e);
    return NextResponse.json(
      {
        success: false,
        error: parsed.message,
        code: parsed.code,
        httpStatus: parsed.httpStatus,
      },
      { status: parsed.httpStatus && parsed.httpStatus < 500 ? parsed.httpStatus : 502 }
    );
  }
}
