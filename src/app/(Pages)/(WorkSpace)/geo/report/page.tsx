import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload";
import { loadGeoKnightTopicViews } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";
import { aggregateCitationContextFromIntel } from "@/lib/geo/radar/aggregateCitationContext";
import { buildDailySparkSeries } from "./spark-data";
import { pickHighlightPrompts } from "./pick-highlight-prompts";
import IntelligenceReport from "./IntelligenceReport";

export default async function IntelligenceReportPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const [payload, geoKnight, rivals] = await Promise.all([
    buildRadarGetPayload(prisma, companyId),
    loadGeoKnightTopicViews(companyId),
    prisma.companyRival.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { rivalCompany: { select: { id: true, name: true } } },
    }),
  ]);

  const rivalsForCharts = rivals
    .map((r) => r.rivalCompany)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const sparkSeries = buildDailySparkSeries(payload.sovSeries);
  const contextRows = aggregateCitationContextFromIntel(payload.citationIntelligence);
  const highlightPrompts = pickHighlightPrompts(geoKnight.topicViews);

  return (
    <IntelligenceReport
      payload={payload}
      geoKnight={geoKnight}
      rivalsForCharts={rivalsForCharts}
      sparkSeries={sparkSeries}
      contextRows={contextRows}
      highlightPrompts={highlightPrompts}
    />
  );
}
