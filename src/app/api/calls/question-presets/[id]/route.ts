import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
  questions: z.array(z.string().min(1).max(400)).max(4).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
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

  const preset = await prisma.$transaction(async (tx) => {
    const existing = await (tx as any).callQuestionPreset.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true },
    });
    if (!existing) return null;

    if (parsed.data.isDefault) {
      await (tx as any).callQuestionPreset.updateMany({
        where: { companyId: session.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return (tx as any).callQuestionPreset.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.questions !== undefined && { questions: parsed.data.questions }),
        ...(parsed.data.isDefault !== undefined && { isDefault: parsed.data.isDefault }),
      },
    });
  });

  if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ preset });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await (prisma as any).callQuestionPreset.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true, isDefault: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await (prisma as any).callQuestionPreset.delete({ where: { id } });

  // If we deleted the default, pick the most recently updated preset as new default.
  if (existing.isDefault) {
    const next = await (prisma as any).callQuestionPreset.findFirst({
      where: { companyId: session.companyId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (next) {
      await (prisma as any).callQuestionPreset.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}

