import { NextResponse } from "next/server";
import { z } from "zod";
import { IntegrationProvider, Prisma, LeadStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(6).max(32),
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
  productProvider: z.nativeEnum(IntegrationProvider).optional().nullable(),
  productExternalId: z.string().max(255).optional().nullable(),
  productName: z.string().max(500).optional().nullable(),
  questionPresetId: z.string().max(255).optional().nullable(),
  questionsToAsk: z.array(z.string().min(1).max(400)).optional(),
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
  const search = (url.searchParams.get("search") ?? "").trim();
  const stage = url.searchParams.get("stage");
  const city = url.searchParams.get("city");
  const industry = url.searchParams.get("industry");
  const source = url.searchParams.get("source");
  const uncontacted = url.searchParams.get("uncontacted") === "1";

  const where: Prisma.LeadWhereInput = {
    companyId: session.companyId,
    ...(stage &&
      Object.values(LeadStage).includes(stage as LeadStage) && {
        stage: stage as LeadStage,
      }),
    ...(city && { city }),
    ...(industry && { industry }),
    ...(source && { source }),
    ...(uncontacted && { lastContactAt: null }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ intentScore: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
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

  const parsed = CreateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: ({
      companyId: session.companyId,
      ...parsed.data,
      tags: parsed.data.tags ?? [],
      questionsToAsk: parsed.data.questionsToAsk ?? [],
    } as unknown as Parameters<typeof prisma.lead.create>[0]["data"]),
  });

  return NextResponse.json({ lead }, { status: 201 });
}
