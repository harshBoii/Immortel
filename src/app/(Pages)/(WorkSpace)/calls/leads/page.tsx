import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadStage } from "@prisma/client";
import LeadsDashboard from "./LeadsDashboard";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const [
    total,
    hot,
    warm,
    uncontacted,
    convertedToday,
    initialLeads,
  ] = await Promise.all([
    prisma.lead.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId, stage: LeadStage.HOT } }),
    prisma.lead.count({ where: { companyId, stage: LeadStage.WARM } }),
    prisma.lead.count({ where: { companyId, lastContactAt: null } }),
    prisma.call.count({
      where: {
        companyId,
        outcome: "CONVERTED",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.lead.findMany({
      where: { companyId },
      orderBy: [{ intentScore: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  return (
    <LeadsDashboard
      initialLeads={initialLeads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        lastContactAt: l.lastContactAt?.toISOString() ?? null,
      }))}
      kpis={{ total, hot, warm, uncontacted, convertedToday }}
    />
  );
}
