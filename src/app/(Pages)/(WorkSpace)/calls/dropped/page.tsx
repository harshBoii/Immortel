import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CallOutcome, CallStatus, Prisma } from "@prisma/client";
import DroppedDashboard, { type DroppedRow } from "./DroppedDashboard";

export const dynamic = "force-dynamic";

export default async function DroppedPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const where: Prisma.CallWhereInput = {
    companyId,
    OR: [
      { status: { in: [CallStatus.DROPPED, CallStatus.FAILED] } },
      { outcome: CallOutcome.NO_ANSWER },
    ],
  };

  const [total, last24, short, noAnswer, network, rows] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, createdAt: { gte: since24h } } }),
    prisma.call.count({ where: { ...where, durationSec: { lt: 10 } } }),
    prisma.call.count({
      where: { companyId, outcome: CallOutcome.NO_ANSWER },
    }),
    prisma.call.count({
      where: { ...where, dropReason: { contains: "network", mode: "insensitive" } },
    }),
    prisma.call.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { lead: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  const initial: DroppedRow[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    outcome: r.outcome,
    durationSec: r.durationSec,
    dropReason: r.dropReason,
    failureReason: r.failureReason,
    createdAt: r.createdAt.toISOString(),
    lead: r.lead
      ? { id: r.lead.id, name: r.lead.name, phone: r.lead.phone }
      : null,
  }));

  return (
    <DroppedDashboard
      kpis={{ total, last24, short, noAnswer, network }}
      initial={initial}
    />
  );
}
