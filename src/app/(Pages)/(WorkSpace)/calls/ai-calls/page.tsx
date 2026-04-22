import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CallOutcome, CallStatus } from "@prisma/client";
import AiCallsDashboard, { type CallRow } from "./AiCallsDashboard";

export const dynamic = "force-dynamic";

export default async function AiCallsPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [last24, connected, converted, dropped, avgDurAgg, rows] = await Promise.all([
    prisma.call.count({ where: { companyId, createdAt: { gte: since24h } } }),
    prisma.call.count({
      where: { companyId, status: CallStatus.COMPLETED, createdAt: { gte: since24h } },
    }),
    prisma.call.count({
      where: { companyId, outcome: CallOutcome.CONVERTED, createdAt: { gte: since24h } },
    }),
    prisma.call.count({
      where: {
        companyId,
        status: { in: [CallStatus.DROPPED, CallStatus.FAILED] },
        createdAt: { gte: since24h },
      },
    }),
    prisma.call.aggregate({
      where: { companyId, status: CallStatus.COMPLETED, createdAt: { gte: since24h } },
      _avg: { durationSec: true },
    }),
    prisma.call.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { lead: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  const kpis = {
    last24,
    connected,
    converted,
    dropped,
    avgDurationSec: avgDurAgg._avg.durationSec ?? 0,
    connectRate: last24 > 0 ? (connected / last24) * 100 : 0,
  };

  const initial: CallRow[] = rows.map((r) => ({
    id: r.id,
    externalCallId: r.externalCallId,
    direction: r.direction,
    status: r.status,
    outcome: r.outcome,
    sentiment: r.sentiment,
    durationSec: r.durationSec,
    costCents: r.costCents,
    createdAt: r.createdAt.toISOString(),
    startedAt: r.startedAt?.toISOString() ?? null,
    endedAt: r.endedAt?.toISOString() ?? null,
    recordingUrl: r.recordingUrl,
    dropReason: r.dropReason,
    failureReason: r.failureReason,
    lead: r.lead
      ? { id: r.lead.id, name: r.lead.name, phone: r.lead.phone }
      : null,
  }));

  return <AiCallsDashboard kpis={kpis} initial={initial} />;
}
