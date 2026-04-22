import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const PatchLeadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(6).max(32).optional(),
  email: z.string().email().max(255).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  intentScore: z.number().int().min(0).max(100).optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  ownerUserId: z.string().max(255).optional().nullable(),
  tags: z.array(z.string().max(60)).optional(),
  notes: z.string().optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lead = await prisma.lead.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      calls: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { transcript: true },
      },
      followUps: {
        orderBy: { dueAt: "asc" },
        where: { status: { in: ["PENDING", "SNOOZED"] } },
      },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.lead.findFirst({
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
  const parsed = PatchLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  return NextResponse.json({ lead });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.lead.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lead.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
