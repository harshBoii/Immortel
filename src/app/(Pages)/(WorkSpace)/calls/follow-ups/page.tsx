import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FollowUpStatus } from "@prisma/client";
import FollowUpsDashboard, { type FollowUpRow } from "./FollowUpsDashboard";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [pending, overdue, today, completedToday, rows] = await Promise.all([
    prisma.followUp.count({ where: { companyId, status: FollowUpStatus.PENDING } }),
    prisma.followUp.count({
      where: { companyId, status: FollowUpStatus.PENDING, dueAt: { lt: now } },
    }),
    prisma.followUp.count({
      where: { companyId, dueAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.followUp.count({
      where: {
        companyId,
        status: FollowUpStatus.DONE,
        completedAt: { gte: startOfDay },
      },
    }),
    prisma.followUp.findMany({
      where: { companyId, status: { in: ["PENDING", "SNOOZED"] } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 100,
      include: { lead: { select: { id: true, name: true, phone: true, stage: true } } },
    }),
  ]);

  const initial: FollowUpRow[] = rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    customReason: r.customReason,
    dueAt: r.dueAt.toISOString(),
    priority: r.priority,
    status: r.status,
    lead: r.lead
      ? { id: r.lead.id, name: r.lead.name, phone: r.lead.phone, stage: r.lead.stage }
      : null,
  }));

  return (
    <FollowUpsDashboard
      kpis={{ pending, overdue, today, completedToday }}
      initial={initial}
    />
  );
}
