import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolvePromptRevenueUsd } from "@/lib/geo/promptRevenueResolve";
import GeoKnightClient, { type TopicView } from "./client";

type RivalConsensus = {
  companyName: string;
  avgRank: number | null;
  mentions: number;
};

type RivalByModel = {
  model: string;
  companyName: string;
  rank: number | null;
};

export default async function GeoKnightPage() {
  const session = await getSession();
  const companyId = session?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
          Sign in as a company user to view GeoKnight.
        </div>
      </div>
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  const topics = await prisma.llmTopic.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      prompts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          query: true,
          reason: true,
          createdAt: true,
          revenue: {
            select: {
              monthlyPromptReach: true,
              visibilityWeight: true,
              ctr: true,
              cvr: true,
              aov: true,
              estimatedRevenue: true,
            },
          },
        },
      },
    },
  });

  const promptIds = topics.flatMap((t) => t.prompts.map((p) => p.id));

  const [consensusRows, byModelRows] = promptIds.length
    ? await Promise.all([
        prisma.promptRivalConsensus.findMany({
          where: { promptId: { in: promptIds } },
          orderBy: [{ avgRank: "asc" }, { mentions: "desc" }],
          select: {
            promptId: true,
            companyName: true,
            avgRank: true,
            mentions: true,
          },
        }),
        prisma.promptRivalByModel.findMany({
          where: { promptId: { in: promptIds } },
          orderBy: [{ model: "asc" }, { rank: "asc" }],
          select: {
            promptId: true,
            model: true,
            companyName: true,
            rank: true,
          },
        }),
      ])
    : [[], []];

  const consensusByPrompt = new Map<string, RivalConsensus[]>();
  for (const row of consensusRows) {
    const list = consensusByPrompt.get(row.promptId) ?? [];
    list.push({
      companyName: row.companyName,
      avgRank: row.avgRank,
      mentions: row.mentions,
    });
    consensusByPrompt.set(row.promptId, list);
  }

  const byModelByPrompt = new Map<string, RivalByModel[]>();
  for (const row of byModelRows) {
    const list = byModelByPrompt.get(row.promptId) ?? [];
    list.push({
      model: row.model,
      companyName: row.companyName,
      rank: row.rank,
    });
    byModelByPrompt.set(row.promptId, list);
  }

  const topicViews: TopicView[] = topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    reason: topic.reason ?? topic.description ?? null,
    difficulty: topic.difficulty,
    createdAt: topic.createdAt.toISOString(),
    prompts: topic.prompts.map((prompt) => ({
      id: prompt.id,
      query: prompt.query,
      reason: prompt.reason ?? null,
      createdAt: prompt.createdAt.toISOString(),
      revenue: (() => {
        const rev = prompt.revenue;
        if (!rev) return null;
        const resolved = resolvePromptRevenueUsd(rev);
        if (resolved == null || !Number.isFinite(resolved)) return null;
        return {
          estimatedRevenue: resolved,
          monthlyPromptReach: rev.monthlyPromptReach ?? null,
          visibilityWeight: rev.visibilityWeight ?? null,
          ctr: rev.ctr ?? null,
          cvr: rev.cvr ?? null,
          aov: rev.aov ?? null,
        };
      })(),
      consensus: consensusByPrompt.get(prompt.id) ?? [],
      byModel: byModelByPrompt.get(prompt.id) ?? [],
    })),
  }));

  return <GeoKnightClient topics={topicViews} companyName={company?.name ?? null} />;
}

