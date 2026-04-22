import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, CampaignStatus, CampaignType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const AudienceFilterSchema = z
  .object({
    stage: z.array(z.string()).optional(),
    city: z.array(z.string()).optional(),
    industry: z.array(z.string()).optional(),
    source: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    minIntentScore: z.number().int().min(0).max(100).optional(),
    uncontactedOnly: z.boolean().optional(),
  })
  .partial();

const VoiceScriptSchema = z
  .object({
    product: z.string().max(255).optional(),
    perks_of_product: z.string().optional(),
    info_about_lead: z.string().optional(),
    system_prompt: z.string().optional(),
    opening_greeting: z.string().optional(),
    agent_name: z.string().max(120).optional(),
    agent_role: z.string().max(120).optional(),
    questions_to_ask: z.string().optional(),
    language: z.string().max(32).optional(),
    voiceId: z.string().max(80).optional(),
    voiceMode: z.enum(["quality", "speed", "eleven_v3"]).optional(),
    llm_provider: z
      .enum(["gemini", "openai", "claude", "groq", "sarvam"])
      .optional(),
  })
  .partial();

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.nativeEnum(CampaignType),
  scheduledAt: z.string().datetime().optional().nullable(),
  audience: AudienceFilterSchema.optional(),
  script: VoiceScriptSchema.optional(),
});

export async function GET(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50)
  );
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  const where: Prisma.CampaignWhereInput = {
    companyId: session.companyId,
    ...(type &&
      Object.values(CampaignType).includes(type as CampaignType) && {
        type: type as CampaignType,
      }),
    ...(status &&
      Object.values(CampaignStatus).includes(status as CampaignStatus) && {
        status: status as CampaignStatus,
      }),
  };

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
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

  const parsed = CreateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, type, scheduledAt, audience, script } = parsed.data;

  // Keep both filter + script in the `audience` JSON column so non-voice types also persist.
  const audiencePayload: Prisma.InputJsonValue = {
    filter: audience ?? {},
    script: script ?? {},
  };

  const campaign = await prisma.campaign.create({
    data: {
      companyId: session.companyId,
      name,
      type,
      audience: audiencePayload,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: CampaignStatus.DRAFT,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
