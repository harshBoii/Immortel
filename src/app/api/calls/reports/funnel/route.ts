import { NextResponse } from "next/server";
import { CallStatus, CallOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

export async function GET(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.max(
    1,
    Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10) || 30)
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = { companyId: session.companyId, createdAt: { gte: since } };

  const [leadsCreated, called, answered, interested, converted] = await Promise.all([
    prisma.lead.count({
      where: { companyId: session.companyId, createdAt: { gte: since } },
    }),
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, status: CallStatus.COMPLETED } }),
    prisma.call.count({
      where: {
        ...where,
        outcome: { in: [CallOutcome.INTERESTED, CallOutcome.CONVERTED] },
      },
    }),
    prisma.call.count({ where: { ...where, outcome: CallOutcome.CONVERTED } }),
  ]);

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  const calls = await prisma.call.findMany({
    where,
    select: { createdAt: true, status: true, outcome: true },
  });
  const daily: Record<string, { calls: number; completed: number; converted: number }> = {};
  for (const c of calls) {
    const key = dayKey(c.createdAt);
    const bucket = daily[key] ?? { calls: 0, completed: 0, converted: 0 };
    bucket.calls += 1;
    if (c.status === CallStatus.COMPLETED) bucket.completed += 1;
    if (c.outcome === CallOutcome.CONVERTED) bucket.converted += 1;
    daily[key] = bucket;
  }

  const timeseries = Object.entries(daily)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return NextResponse.json({
    windowDays: days,
    funnel: [
      { stage: "Leads", count: leadsCreated },
      { stage: "Called", count: called },
      { stage: "Answered", count: answered },
      { stage: "Interested", count: interested },
      { stage: "Converted", count: converted },
    ],
    timeseries,
  });
}
