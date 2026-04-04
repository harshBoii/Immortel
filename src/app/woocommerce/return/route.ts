import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/http/get-app-base-url";

/**
 * Browser redirect after merchant approves WooCommerce app auth.
 * WooCommerce appends e.g. ?success=1&user_id=...
 */
export async function GET(request: NextRequest) {
  const baseUrl = getAppBaseUrl(request);
  const dest = new URL("/connection/woocommerce", baseUrl);

  const success = request.nextUrl.searchParams.get("success");
  if (success === "1" || success === "true") {
    dest.searchParams.set("woocommerce_connected", "1");
  } else {
    dest.searchParams.set("error", "wc_auth_denied");
  }

  return NextResponse.redirect(dest.toString());
}
