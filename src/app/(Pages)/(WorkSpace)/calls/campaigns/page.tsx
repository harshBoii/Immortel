import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";
import CampaignsDashboard, { type CampaignRow } from "./CampaignsDashboard";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const [active, paused, drafts, ended, rows] = await Promise.all([
    prisma.campaign.count({ where: { companyId, status: CampaignStatus.RUNNING } }),
    prisma.campaign.count({ where: { companyId, status: CampaignStatus.PAUSED } }),
    prisma.campaign.count({ where: { companyId, status: CampaignStatus.DRAFT } }),
    prisma.campaign.count({ where: { companyId, status: CampaignStatus.COMPLETED } }),
    prisma.campaign.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const initial: CampaignRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    status: r.status,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    startedAt: r.startedAt?.toISOString() ?? null,
    sentCount: r.sentCount,
    deliveredCount: r.deliveredCount,
    replyCount: r.replyCount,
    conversionCount: r.conversionCount,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <CampaignsDashboard
      kpis={{ active, paused, drafts, ended }}
      initial={initial}
    />
  );
}
