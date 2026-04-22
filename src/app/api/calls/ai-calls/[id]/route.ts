import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const call = await prisma.call.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      lead: true,
      transcript: true,
      campaign: { select: { id: true, name: true, type: true } },
    },
  });
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ call });
}
