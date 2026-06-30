import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { activateCouponPlan } from "@/lib/subscription/activate-coupon";
import { CouponError } from "@/lib/subscription/coupon";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }

  try {
    const result = await activateCouponPlan(session.companyId, body.code);
    return NextResponse.json({
      success: true,
      couponActivated: true,
      plan: result.plan,
      planName: result.planName,
    });
  } catch (err) {
    if (err instanceof CouponError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[subscription/coupon/redeem]", err);
    return NextResponse.json(
      { error: "Could not redeem coupon. Please try again." },
      { status: 500 }
    );
  }
}
