import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConversationsDashboard, {
  type ConversationRow,
} from "./ConversationsDashboard";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const [total, positive, negative, neutral, rows] = await Promise.all([
    prisma.conversation.count({ where: { companyId } }),
    prisma.conversation.count({ where: { companyId, sentiment: "POSITIVE" } }),
    prisma.conversation.count({ where: { companyId, sentiment: "NEGATIVE" } }),
    prisma.conversation.count({ where: { companyId, sentiment: "NEUTRAL" } }),
    prisma.conversation.findMany({
      where: { companyId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { lead: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  const initial: ConversationRow[] = rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    summary: r.summary,
    sentiment: r.sentiment,
    keywords: r.keywords,
    lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    lead: r.lead ? { id: r.lead.id, name: r.lead.name, phone: r.lead.phone } : null,
  }));

  return (
    <ConversationsDashboard
      kpis={{ total, positive, negative, neutral }}
      initial={initial}
    />
  );
}
