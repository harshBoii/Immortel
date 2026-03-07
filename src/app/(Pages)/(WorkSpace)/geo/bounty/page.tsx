import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BountyView } from "@/app/components/geo/bounty";

export default async function BountyPage() {
  const session = await getSession();
  const companyId = session?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
          Sign in as a company user to view Bounty.
        </div>
      </div>
    );
  }

  const topics = await prisma.llmTopic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      prompts: {
        where: { isActive: true },
        select: { id: true, query: true },
      },
    },
  });

  const niches = topics.map((t) => ({
    id: t.id,
    topic: t.name,
    description: t.description ?? "",
    difficulty: t.difficulty,
    prompts: t.prompts.map((p) => ({ id: p.id, query: p.query })),
    prompt_count: t.prompts.length,
  }));

  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const n of niches) {
    const k = n.difficulty.toLowerCase();
    if (k in byDifficulty) (byDifficulty as Record<string, number>)[k]++;
  }

  const summary = {
    total_niches: niches.length,
    total_prompts: niches.reduce((s, n) => s + n.prompt_count, 0),
    by_difficulty: byDifficulty,
  };

  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <BountyView initialNiches={niches} summary={summary} />
    </div>
  );
}
