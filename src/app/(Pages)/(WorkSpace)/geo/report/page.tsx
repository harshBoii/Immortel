import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload";
import { loadGeoKnightTopicViews } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";
import { buildDailySparkSeries } from "./spark-data";
import { pickHighlightPrompts } from "./pick-highlight-prompts";
import IntelligenceReport from "./IntelligenceReport";

export default async function IntelligenceReportPage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const companyId = session.companyId;

  const [payload, geoKnight, rivals, bountyPagesRaw] = await Promise.all([
    buildRadarGetPayload(prisma, companyId),
    loadGeoKnightTopicViews(companyId),
    prisma.companyRival.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { rivalCompany: { select: { id: true, name: true } } },
    }),
    prisma.citationBounty.findMany({
      where: { companyId, aeoPageId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        query: true,
        aeoPage: { select: { id: true, title: true } },
      },
    }),
  ]);

  const bountyPages = bountyPagesRaw
    .filter((b) => b.aeoPage)
    .map((b) => ({
      bountyId: b.id,
      query: b.query,
      pageTitle: b.aeoPage!.title,
      pageId: b.aeoPage!.id,
    }));

  const rivalsForCharts = rivals
    .map((r) => r.rivalCompany)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const sparkSeries = buildDailySparkSeries(payload.sovSeries);
  const highlightPrompts = pickHighlightPrompts(geoKnight.topicViews);

  return (
    <IntelligenceReport
      payload={payload}
      geoKnight={geoKnight}
      rivalsForCharts={rivalsForCharts}
      sparkSeries={sparkSeries}
      bountyPages={bountyPages}
      highlightPrompts={highlightPrompts}
    />
  );
}
