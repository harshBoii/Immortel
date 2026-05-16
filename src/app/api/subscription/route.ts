import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSubscriptionSummary } from "@/lib/subscription/get-summary";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const summary = await getSubscriptionSummary(session.companyId);
  return NextResponse.json({ success: true, ...summary });
}
