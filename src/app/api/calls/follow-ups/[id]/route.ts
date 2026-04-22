import { NextResponse } from "next/server";
import { z } from "zod";
import { FollowUpPriority, FollowUpStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const PatchSchema = z.object({
  status: z.nativeEnum(FollowUpStatus).optional(),
  priority: z.nativeEnum(FollowUpPriority).optional(),
  dueAt: z.string().datetime().optional(),
  customReason: z.string().max(255).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.followUp.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.followUp.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      ...(parsed.data.dueAt && { dueAt: new Date(parsed.data.dueAt) }),
      ...(parsed.data.status === FollowUpStatus.DONE && {
        completedAt: new Date(),
      }),
    },
  });

  return NextResponse.json({ followUp: updated });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.followUp.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.followUp.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
