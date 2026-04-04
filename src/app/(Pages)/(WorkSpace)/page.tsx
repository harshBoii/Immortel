import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload";
import { loadGeoKnightTopicViews } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";
import { aggregateCitationContextFromIntel } from "@/lib/geo/radar/aggregateCitationContext";
import { buildDailySparkSeries } from "./geo/report/spark-data";
import { pickHighlightPrompts } from "./geo/report/pick-highlight-prompts";
import HomeDashboard from "@/app/components/home/HomeDashboard";

function citationTypeLabel(query: string) {
  const q = query.toLowerCase();
  if (q.includes(" vs ") || q.includes("compare")) return "Comparison";
  if (q.includes("alternative")) return "Alternatives";
  if (q.includes("best") || q.includes("top")) return "Recommendations";
  if (q.includes("tool") || q.includes("platform") || q.includes("software")) return "Discovery";
  return "Citation";
}

export default async function HomePage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const [payload, geoKnight, rivals, ownCompanyCitations] = await Promise.all([
    buildRadarGetPayload(prisma, companyId),
    loadGeoKnightTopicViews(companyId),
    prisma.companyRival.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { rivalCompany: { select: { id: true, name: true } } },
    }),
    prisma.citation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        execution: {
          include: {
            prompt: { select: { query: true } },
          },
        },
      },
    }),
  ]);

  const rivalsForCharts = rivals
    .map((r) => r.rivalCompany)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const sparkSeries = buildDailySparkSeries(payload.sovSeries);
  const contextRows = aggregateCitationContextFromIntel(payload.citationIntelligence);
  const highlightPrompts = pickHighlightPrompts(geoKnight.topicViews);

  // Build recentCitations with sibling companies per execution
  const executionIds = Array.from(new Set(ownCompanyCitations.map((c) => c.executionId)));
  const executionCitations = executionIds.length
    ? await prisma.citation.findMany({
        where: { executionId: { in: executionIds } },
        select: { executionId: true, mentionedName: true, rank: true },
      })
    : [];

  const siblingsByExecution = new Map<string, Array<{ name: string; rank: number | null }>>();
  for (const cit of executionCitations) {
    const list = siblingsByExecution.get(cit.executionId) ?? [];
    list.push({ name: cit.mentionedName, rank: cit.rank });
    siblingsByExecution.set(cit.executionId, list);
  }

  const recentCitations = ownCompanyCitations.map((c) => {
    const siblings = (siblingsByExecution.get(c.executionId) ?? []).sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99)
    );
    return {
      id: c.id,
      prompt: c.execution.prompt.query,
      model: c.execution.model,
      rank: c.rank,
      type: citationTypeLabel(c.execution.prompt.query),
      companies: siblings,
    };
  });

  return (
    <HomeDashboard
      payload={payload}
      geoKnight={geoKnight}
      rivalsForCharts={rivalsForCharts}
      sparkSeries={sparkSeries}
      contextRows={contextRows}
      highlightPrompts={highlightPrompts}
      recentCitations={recentCitations}
    />
  );
}
