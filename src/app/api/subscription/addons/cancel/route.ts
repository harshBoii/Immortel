import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAddOnId } from "@/lib/subscription/plans";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { addOn?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.addOn !== "string" || !isAddOnId(body.addOn)) {
    return NextResponse.json({ error: "A valid add-on is required" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { companyId: session.companyId },
    select: { id: true },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const result = await prisma.subscriptionAddOn.updateMany({
    where: {
      subscriptionId: subscription.id,
      addOnType: body.addOn,
      isActive: true,
    },
    data: { isActive: false, cancelledAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "That add-on is not active" }, { status: 400 });
  }

  return NextResponse.json({ cancelled: true });
}
