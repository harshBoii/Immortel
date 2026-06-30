import { NextResponse } from "next/server";
import { validateCouponCode } from "@/lib/subscription/coupon";

export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }

  const result = await validateCouponCode(body.code);
  return NextResponse.json(result);
}
