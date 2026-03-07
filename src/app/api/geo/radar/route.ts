import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type RadarInput = {
  company: { name: string; website: string; linkedin: string };
  brandEntity: {
    category: string;
    topics: string[];
    keywords: string[];
  };
  competitors: string[];
  models: string[];
};

type RadarOutput = {
  topics: string[];
  prompts: string[];
  citations: Array<{
    prompt: string;
    model: string;
    companies: Array< { name: string; rank: number }>;
  }>;
  metrics: {
    share_of_voice: number;
    top3_rate: number;
    query_coverage: number;
    competitor_rank: number;
    topic_authority: number;
  };
};

type RadarMetrics = RadarOutput["metrics"];

type RadarServiceResponse =
  | RadarOutput
  | {
      input?: RadarInput;
      output?: RadarOutput;
    };

function isRadarEnvelope(
  value: RadarServiceResponse
): value is { input?: RadarInput; output?: RadarOutput } {
  return typeof value === "object" && value !== null && "output" in value;
}

function normalizePercentMetric(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  // Service can return either percentage (5.3) or ratio (0.053)
  return value <= 1 ? value * 100 : value;
}

function normalizeRadarMetrics(metrics: RadarMetrics): RadarMetrics {
  return {
    share_of_voice: normalizePercentMetric(metrics.share_of_voice) ?? 0,
    top3_rate: normalizePercentMetric(metrics.top3_rate) ?? 0,
    query_coverage: normalizePercentMetric(metrics.query_coverage) ?? 0,
    competitor_rank: metrics.competitor_rank,
    topic_authority: metrics.topic_authority,
  };
}

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const [company, brandEntity, geoDataSources] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, website: true },
    }),
    prisma.brandEntity.findUnique({
      where: { companyId },
      include: {
        sameAsLinks: true,
        offerings: true,
      },
    }),
    prisma.geoDataSource.findMany({
      where: {
        companyId,
        sourceType: "URL",
        label: { in: ["LinkedIn", "Website URL"] },
        isActive: true,
      },
      select: { label: true, rawContent: true },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  const website =
    company.website ??
    geoDataSources.find((s) => s.label === "Website URL")?.rawContent?.trim() ??
    "";
  const linkedin =
    brandEntity?.sameAsLinks.find((l) =>
      l.platform.toLowerCase().includes("linkedin")
    )?.url ??
    geoDataSources.find((s) => s.label === "LinkedIn")?.rawContent?.trim() ??
    "";

  const primaryOffering =
    brandEntity?.offerings.find((o) => o.isPrimary) ?? brandEntity?.offerings[0];
  const competitors = primaryOffering?.competitors ?? [];
  const topics = brandEntity?.topics ?? [];
  const keywords = brandEntity?.keywords ?? [];
  const category = brandEntity?.category ?? "";

  const input: RadarInput = {
    company: {
      name: company.name,
      website: website || "https://example.com",
      linkedin: linkedin || "https://linkedin.com",
    },
    brandEntity: {
      category,
      topics,
      keywords,
    },
    competitors,
    models: ["gpt-4o", "claude-3.5", "gemini-1.5"],
  };

  const base = process.env.MICROSERVICE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured" },
      { status: 500 }
    );
  }

  const radarUrl = `${base.replace(/\/$/, "")}/company/radar`;
  let payload: RadarServiceResponse;

  try {
    const res = await fetch(radarUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        session_id: `company-radar-${companyId}`,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: "Radar microservice failed",
          status: res.status,
          body: text || undefined,
        },
        { status: 502 }
      );
    }

    payload = await res.json();
  } catch (err) {
    console.error("Radar microservice error:", err);
    return NextResponse.json(
      { success: false, error: "Error contacting radar service" },
      { status: 502 }
    );
  }

  const radarOutput: RadarOutput | null = isRadarEnvelope(payload)
    ? payload.output ?? null
    : payload;
  if (!radarOutput) {
    return NextResponse.json(
      { success: false, error: "Invalid radar response" },
      { status: 502 }
    );
  }

  // Persist to DB (avoid interactive transaction to prevent pool timeout P2028)
  const normalizedMetrics = normalizeRadarMetrics(radarOutput.metrics);
  const modelsUsed = [...new Set(radarOutput.citations.map((c) => c.model))];

  const metricModels = modelsUsed.length ? modelsUsed : ["aggregate"];
  await prisma.llmRadarMetric.createMany({
    data: metricModels.map((model) => ({
      companyId,
      model,
      shareOfVoice: normalizedMetrics.share_of_voice,
      top3Rate: normalizedMetrics.top3_rate,
      queryCoverage: normalizedMetrics.query_coverage,
      competitorRank: normalizedMetrics.competitor_rank,
      topicAuthority: normalizedMetrics.topic_authority,
      avgRank: normalizedMetrics.competitor_rank,
    })),
  });

  // Persist output.topics into LlmTopic (upsert by name)
  const topicNames = [...new Set((radarOutput.topics ?? []).filter((t): t is string => Boolean(t?.trim())))];
  const topicIdMap = new Map<string, string>();
  for (const name of topicNames) {
    const topic = await prisma.llmTopic.upsert({
      where: { name },
      create: { name, description: null },
      update: {},
      select: { id: true },
    });
    topicIdMap.set(name, topic.id);
  }

  const uniquePrompts = [...new Set(radarOutput.citations.map((c) => c.prompt))];
  const existingPrompts = uniquePrompts.length
    ? await prisma.prompt.findMany({
        where: { query: { in: uniquePrompts } },
        select: { id: true, query: true },
      })
    : [];

  const promptMap = new Map<string, string>();
  for (const p of existingPrompts) {
    promptMap.set(p.query, p.id);
  }

  for (const promptQuery of uniquePrompts) {
    if (promptMap.has(promptQuery)) continue;
    const topicId = topicIdMap.get(promptQuery) ?? null;
    const created = await prisma.prompt.create({
      data: {
        query: promptQuery,
        topic: promptQuery,
        topicId,
        isActive: true,
      },
    });
    promptMap.set(promptQuery, created.id);
  }

  const execMap = new Map<string, string>();
  const uniqueExecPairs = [
    ...new Set(radarOutput.citations.map((c) => `${c.prompt}|||${c.model}`)),
  ];

  for (const pair of uniqueExecPairs) {
    const [promptQuery, model] = pair.split("|||");
    const promptId = promptMap.get(promptQuery);
    if (!promptId) continue;
    const exec = await prisma.promptExecution.create({
      data: {
        promptId,
        model,
        response: "",
      },
    });
    execMap.set(`${promptId}:${model}`, exec.id);
  }

  const citationRows: Array<{
    executionId: string;
    companyId: string | null;
    mentionedName: string;
    rank: number | null;
  }> = [];

  for (const cit of radarOutput.citations) {
    const promptId = promptMap.get(cit.prompt);
    if (!promptId) continue;
    const execId = execMap.get(`${promptId}:${cit.model}`);
    if (!execId) continue;

    for (const comp of cit.companies) {
      const ourCompany = comp.name.toLowerCase() === company.name.toLowerCase();
      citationRows.push({
        executionId: execId,
        companyId: ourCompany ? companyId : null,
        mentionedName: comp.name,
        rank: comp.rank ?? null,
      });
    }
  }

  if (citationRows.length) {
    await prisma.citation.createMany({
      data: citationRows,
    });
  }

  return NextResponse.json({
    success: true,
    input,
    output: {
      topics: radarOutput.topics,
      prompts: radarOutput.prompts,
      citations: radarOutput.citations,
      metrics: normalizedMetrics,
    },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const [metrics, company] = await Promise.all([
    prisma.llmRadarMetric.findMany({
      where: { companyId },
      orderBy: { calculatedAt: "desc" },
      take: 10,
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    }),
  ]);

  const latest = metrics[0];
  const latestMeaningful =
    metrics.find(
      (m) =>
        (m.shareOfVoice != null && m.shareOfVoice > 0) ||
        (m.top3Rate != null && m.top3Rate > 0) ||
        (m.queryCoverage != null && m.queryCoverage > 0) ||
        m.competitorRank != null ||
        m.topicAuthority != null
    ) ?? latest;

  return NextResponse.json({
    success: true,
    company: company ?? null,
    metrics: metrics.map((m) => ({
      id: m.id,
      model: m.model,
      shareOfVoice: normalizePercentMetric(m.shareOfVoice),
      share_of_voice: normalizePercentMetric(m.shareOfVoice),
      top3Rate: normalizePercentMetric(m.top3Rate),
      top3_rate: normalizePercentMetric(m.top3Rate),
      queryCoverage: normalizePercentMetric(m.queryCoverage),
      query_coverage: normalizePercentMetric(m.queryCoverage),
      competitorRank: m.competitorRank,
      competitor_rank: m.competitorRank,
      topicAuthority: m.topicAuthority,
      topic_authority: m.topicAuthority,
      calculatedAt: m.calculatedAt.toISOString(),
    })),
    latest: latestMeaningful
      ? {
          shareOfVoice: normalizePercentMetric(latestMeaningful.shareOfVoice),
          share_of_voice: normalizePercentMetric(latestMeaningful.shareOfVoice),
          top3Rate: normalizePercentMetric(latestMeaningful.top3Rate),
          top3_rate: normalizePercentMetric(latestMeaningful.top3Rate),
          queryCoverage: normalizePercentMetric(latestMeaningful.queryCoverage),
          query_coverage: normalizePercentMetric(latestMeaningful.queryCoverage),
          competitorRank: latestMeaningful.competitorRank,
          competitor_rank: latestMeaningful.competitorRank,
          topicAuthority: latestMeaningful.topicAuthority,
          topic_authority: latestMeaningful.topicAuthority,
          calculatedAt: latestMeaningful.calculatedAt.toISOString(),
        }
      : null,
  });
}
