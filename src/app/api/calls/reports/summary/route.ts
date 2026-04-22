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

  const [
    totalCalls,
    completedCalls,
    droppedCalls,
    failedCalls,
    convertedCalls,
    interestedCalls,
    totalLeads,
    newLeads,
    activeCampaigns,
    openFollowUps,
    aggregates,
  ] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, status: CallStatus.COMPLETED } }),
    prisma.call.count({ where: { ...where, status: CallStatus.DROPPED } }),
    prisma.call.count({ where: { ...where, status: CallStatus.FAILED } }),
    prisma.call.count({ where: { ...where, outcome: CallOutcome.CONVERTED } }),
    prisma.call.count({ where: { ...where, outcome: CallOutcome.INTERESTED } }),
    prisma.lead.count({ where: { companyId: session.companyId } }),
    prisma.lead.count({
      where: { companyId: session.companyId, createdAt: { gte: since } },
    }),
    prisma.campaign.count({
      where: { companyId: session.companyId, status: "RUNNING" },
    }),
    prisma.followUp.count({
      where: { companyId: session.companyId, status: "PENDING" },
    }),
    prisma.call.aggregate({
      where: { ...where, status: CallStatus.COMPLETED },
      _avg: { durationSec: true },
      _sum: { costCents: true, durationSec: true },
    }),
  ]);

  const answerRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
  const conversionRate =
    completedCalls > 0 ? (convertedCalls / completedCalls) * 100 : 0;
  const dropRate = totalCalls > 0 ? (droppedCalls / totalCalls) * 100 : 0;

  return NextResponse.json({
    windowDays: days,
    totals: {
      calls: totalCalls,
      completed: completedCalls,
      dropped: droppedCalls,
      failed: failedCalls,
      converted: convertedCalls,
      interested: interestedCalls,
      leads: totalLeads,
      newLeads,
      activeCampaigns,
      openFollowUps,
    },
    rates: {
      answerRate,
      conversionRate,
      dropRate,
    },
    call: {
      avgDurationSec: aggregates._avg.durationSec ?? 0,
      totalDurationSec: aggregates._sum.durationSec ?? 0,
      totalCostCents: aggregates._sum.costCents ?? 0,
    },
  });
}
