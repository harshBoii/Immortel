import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

export const dynamic = "force-dynamic";

const CreatePresetSchema = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().optional(),
  questions: z.array(z.string().min(1).max(400)).default([]),
});

export async function GET() {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const presets = await (prisma as any).callQuestionPreset.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ items: presets });
}

export async function POST(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreatePresetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, isDefault, questions } = parsed.data;

  const preset = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await (tx as any).callQuestionPreset.updateMany({
        where: { companyId: session.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const existingCount = await (tx as any).callQuestionPreset.count({
      where: { companyId: session.companyId },
    });

    return (tx as any).callQuestionPreset.create({
      data: {
        companyId: session.companyId,
        name,
        questions,
        isDefault: existingCount === 0 ? true : !!isDefault,
      },
    });
  });

  return NextResponse.json({ preset }, { status: 201 });
}

