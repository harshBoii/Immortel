import { NextResponse } from "next/server";
import { z } from "zod";
import {
  Prisma,
  FollowUpPriority,
  FollowUpReason,
  FollowUpStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const CreateSchema = z.object({
  leadId: z.string().min(1),
  reason: z.nativeEnum(FollowUpReason).optional(),
  customReason: z.string().max(255).optional().nullable(),
  dueAt: z.string().datetime(),
  priority: z.nativeEnum(FollowUpPriority).optional(),
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
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const due = url.searchParams.get("due"); // "today" | "overdue" | "upcoming"

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const where: Prisma.FollowUpWhereInput = {
    companyId: session.companyId,
    ...(status &&
      Object.values(FollowUpStatus).includes(status as FollowUpStatus) && {
        status: status as FollowUpStatus,
      }),
    ...(priority &&
      Object.values(FollowUpPriority).includes(priority as FollowUpPriority) && {
        priority: priority as FollowUpPriority,
      }),
    ...(due === "today" && {
      dueAt: { gte: startOfDay, lte: endOfDay },
    }),
    ...(due === "overdue" && {
      dueAt: { lt: now },
      status: FollowUpStatus.PENDING,
    }),
    ...(due === "upcoming" && {
      dueAt: { gt: endOfDay },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lead: { select: { id: true, name: true, phone: true, stage: true } },
      },
    }),
    prisma.followUp.count({ where }),
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
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, companyId: session.companyId },
    select: { id: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const followUp = await prisma.followUp.create({
    data: {
      companyId: session.companyId,
      leadId: lead.id,
      reason: parsed.data.reason ?? FollowUpReason.OTHER,
      customReason: parsed.data.customReason ?? null,
      dueAt: new Date(parsed.data.dueAt),
      priority: parsed.data.priority ?? FollowUpPriority.MEDIUM,
      status: FollowUpStatus.PENDING,
    },
  });

  return NextResponse.json({ followUp }, { status: 201 });
}
