import { NextResponse } from "next/server";
import { z } from "zod";
import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const PatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { lead: { select: { id: true, name: true, phone: true } } },
      },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.campaign.findFirst({
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

  const campaign = await prisma.campaign.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      ...(parsed.data.scheduledAt !== undefined && {
        scheduledAt: parsed.data.scheduledAt
          ? new Date(parsed.data.scheduledAt)
          : null,
      }),
    },
  });
  return NextResponse.json({ campaign });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.campaign.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.campaign.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
