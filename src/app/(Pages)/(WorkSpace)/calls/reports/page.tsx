import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CallOutcome, CallStatus } from "@prisma/client";
import ReportsDashboard from "./ReportsDashboard";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function ReportsPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    totalCalls,
    completed,
    dropped,
    failed,
    converted,
    interested,
    leadsCreated,
    aggregates,
    calls,
    byOutcome,
  ] = await Promise.all([
    prisma.call.count({ where: { companyId, createdAt: { gte: since } } }),
    prisma.call.count({
      where: { companyId, createdAt: { gte: since }, status: CallStatus.COMPLETED },
    }),
    prisma.call.count({
      where: { companyId, createdAt: { gte: since }, status: CallStatus.DROPPED },
    }),
    prisma.call.count({
      where: { companyId, createdAt: { gte: since }, status: CallStatus.FAILED },
    }),
    prisma.call.count({
      where: { companyId, createdAt: { gte: since }, outcome: CallOutcome.CONVERTED },
    }),
    prisma.call.count({
      where: { companyId, createdAt: { gte: since }, outcome: CallOutcome.INTERESTED },
    }),
    prisma.lead.count({ where: { companyId, createdAt: { gte: since } } }),
    prisma.call.aggregate({
      where: { companyId, createdAt: { gte: since }, status: CallStatus.COMPLETED },
      _avg: { durationSec: true },
      _sum: { durationSec: true, costCents: true },
    }),
    prisma.call.findMany({
      where: { companyId, createdAt: { gte: since } },
      select: { createdAt: true, status: true, outcome: true, durationSec: true },
    }),
    prisma.call.groupBy({
      by: ["outcome"],
      where: { companyId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  // Daily buckets
  const daily: Record<string, { date: string; calls: number; completed: number; converted: number }> =
    {};
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    daily[key] = { date: key, calls: 0, completed: 0, converted: 0 };
  }
  for (const c of calls) {
    const key = c.createdAt.toISOString().slice(0, 10);
    if (!daily[key]) continue;
    daily[key].calls += 1;
    if (c.status === CallStatus.COMPLETED) daily[key].completed += 1;
    if (c.outcome === CallOutcome.CONVERTED) daily[key].converted += 1;
  }
  const timeseries = Object.values(daily);

  const funnel = [
    { stage: "Leads", count: leadsCreated },
    { stage: "Called", count: totalCalls },
    { stage: "Answered", count: completed },
    { stage: "Interested", count: interested + converted },
    { stage: "Converted", count: converted },
  ];

  const outcomeBreakdown = byOutcome.map((o) => ({
    outcome: o.outcome ?? "UNKNOWN",
    count: o._count._all,
  }));

  return (
    <ReportsDashboard
      windowDays={WINDOW_DAYS}
      kpis={{
        totalCalls,
        completed,
        dropped,
        failed,
        converted,
        interested,
        leadsCreated,
        avgDurationSec: aggregates._avg.durationSec ?? 0,
        totalDurationSec: aggregates._sum.durationSec ?? 0,
        totalCostCents: aggregates._sum.costCents ?? 0,
      }}
      timeseries={timeseries}
      funnel={funnel}
      outcomeBreakdown={outcomeBreakdown}
    />
  );
}
