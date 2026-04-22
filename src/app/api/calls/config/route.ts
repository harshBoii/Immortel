import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  languageMode: z.string().min(1).max(32).optional(),
  voiceMode: z.string().min(1).max(32).optional(),
  voiceId: z.string().max(255).optional().nullable(),
  llmProvider: z.string().min(1).max(32).optional(),
  agentName: z.string().max(120).optional().nullable(),
  agentTone: z.string().max(500).optional().nullable(),
  systemPrompt: z.string().max(5000).optional().nullable(),
  openingGreeting: z.string().max(500).optional().nullable(),
  useSarvamTts: z.boolean().optional(),
  sarvamSpeaker: z.string().max(32).optional().nullable(),
});

export async function GET() {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await (prisma as any).callConfig.findUnique({
    where: { companyId: session.companyId },
  });

  return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const config = await (prisma as any).callConfig.upsert({
    where: { companyId: session.companyId },
    create: {
      companyId: session.companyId,
      ...(parsed.data as Record<string, unknown>),
    },
    update: {
      ...(parsed.data as Record<string, unknown>),
    },
  });

  return NextResponse.json({ config });
}

