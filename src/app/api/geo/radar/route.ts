import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncBountyRevenueForCompany } from "@/lib/geo/radar/bountySync";
import {
  persistPromptMetricsForCompany,
  resolveTopicIdForPromptQuery,
} from "@/lib/geo/radar/persistPromptMetrics";
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload";

type RadarInput = {
  company: { name: string; website: string; linkedin: string; about?: string };
  brandEntity: {
    category: string;
    topics: string[];
    keywords: string[];
    offerings?: Array<{
      product?: string;
      productType?: string;
      url?: string;
      differentiators: string[];
      useCases: string[];
      targetAudiences: string[];
      competitorGroups: string[];
    }>;
  };
  competitors: string[];
  models: string[];
  llmTopics?: string[];
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
  topic_prompt_analysis?: TopicPromptAnalysisItem[];
};

type RadarMetrics = RadarOutput["metrics"];

type TopicPromptAnalysisItem = {
  topic: string;
  link?: string;
  reason?: string;
  prompts?: TopicPromptAnalysisPromptItem[];
};

type TopicPromptAnalysisPromptItem = {
  prompt: string;
  link?: string;
  reason?: string;
  cited_companies_by_model?: Array<{
    model: string;
    companies: Array<{ name: string; rank?: number | null }>;
  }>;
  cited_companies_consensus?: Array<{
    name: string;
    avg_rank?: number | null;
    mentions?: number | null;
  }>;
};

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

  const [company, brandEntity, geoDataSources, llmTopics, shopifyProducts] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, website: true, description: true },
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
    prisma.llmTopic.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        prompts: {
          where: { isActive: true },
          select: { query: true },
        },
      },
    }),
    prisma.shopifyProduct.findMany({
      where: { companyId },
      orderBy: { shopifyUpdatedAt: "desc" },
      select: {
        title: true,
        onlineStoreUrl: true,
      },
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

  const brandOfferings =
    brandEntity?.offerings.map((o) => ({
      product: o.name ?? undefined,
      productType: o.offeringType ?? undefined,
      url: o.url ?? undefined,
      differentiators: o.differentiators ?? [],
      useCases: o.useCases ?? [],
      targetAudiences: o.targetAudiences ?? [],
      competitorGroups: o.competitors ?? [],
    })) ?? [];

  const shopifyOfferings = shopifyProducts
    .filter((p) => Boolean(p.title?.trim()))
    .map((p) => ({
      product: p.title.trim(),
      productType: "PRODUCT",
      url: p.onlineStoreUrl ?? undefined,
      differentiators: [] as string[],
      useCases: [] as string[],
      targetAudiences: [] as string[],
      competitorGroups: [] as string[],
    }));

  const offerings = [...brandOfferings, ...shopifyOfferings];

  const input: RadarInput = {
    company: {
      name: company.name,
      website: website || "https://example.com",
      linkedin: linkedin || "https://linkedin.com",
      about: brandEntity?.about ?? company.description ?? undefined,
    },
    brandEntity: {
      category,
      topics,
      keywords,
      ...(offerings.length > 0 ? { offerings } : {}),
    },
    competitors,
    models: ["gpt-4o", "claude-3.5", "gemini-1.5"],
    ...(llmTopics.length > 0
      ? {
          llmTopics: llmTopics.map((t) => t.name),
        }
      : {}),
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
  const topicPromptAnalysis = Array.isArray(radarOutput.topic_prompt_analysis)
    ? radarOutput.topic_prompt_analysis
    : [];
  const topicReasonByName = new Map<string, string | null>();
  for (const item of topicPromptAnalysis) {
    const name = item.topic?.trim();
    if (!name) continue;
    topicReasonByName.set(name, item.reason?.trim() || null);
  }
  const topicNames = [
    ...new Set(
      [
        ...(radarOutput.topics ?? []),
        ...topicPromptAnalysis.map((t) => t.topic),
      ].filter((t): t is string => Boolean(t?.trim()))
    ),
  ];
  const topicIdMap = new Map<string, string>();
  for (const name of topicNames) {
    const reason = topicReasonByName.get(name) ?? null;
    const topic = await prisma.llmTopic.upsert({
      where: { companyId_name: { companyId, name } },
      create: {
        companyId,
        name,
        description: reason,
        reason,
      },
      update: {
        reason,
        ...(reason ? { description: reason } : {}),
      },
      select: { id: true },
    });
    topicIdMap.set(name, topic.id);
  }

  const analysisPromptMeta = new Map<
    string,
    {
      topicName: string;
      reason: string | null;
      byModel: NonNullable<TopicPromptAnalysisPromptItem["cited_companies_by_model"]>;
      consensus: NonNullable<TopicPromptAnalysisPromptItem["cited_companies_consensus"]>;
    }
  >();
  for (const item of topicPromptAnalysis) {
    const topicName = item.topic?.trim();
    if (!topicName) continue;
    for (const p of item.prompts ?? []) {
      const q = p.prompt?.trim();
      if (!q || analysisPromptMeta.has(q)) continue;
      analysisPromptMeta.set(q, {
        topicName,
        reason: p.reason?.trim() || null,
        byModel: p.cited_companies_by_model ?? [],
        consensus: p.cited_companies_consensus ?? [],
      });
    }
  }

  const uniquePrompts = [
    ...new Set([
      ...radarOutput.citations.map((c) => c.prompt),
      ...(radarOutput.prompts ?? []),
      ...[...analysisPromptMeta.keys()],
    ]),
  ];
  const existingPrompts = uniquePrompts.length
    ? await prisma.prompt.findMany({
        where: { query: { in: uniquePrompts } },
        select: { id: true, query: true, topicId: true },
      })
    : [];

  const promptMap = new Map<string, { id: string; topicId: string | null }>();
  for (const p of existingPrompts) {
    if (!promptMap.has(p.query)) {
      promptMap.set(p.query, { id: p.id, topicId: p.topicId });
    }
  }

  for (const promptQuery of uniquePrompts) {
    const meta = analysisPromptMeta.get(promptQuery);
    const topicIdFromAnalysis =
      meta?.topicName != null ? topicIdMap.get(meta.topicName) ?? null : null;
    const topicId =
      topicIdFromAnalysis ??
      resolveTopicIdForPromptQuery(promptQuery, topicNames, topicIdMap) ??
      null;
    const existing = promptMap.get(promptQuery);
    if (existing) {
      await prisma.prompt.update({
        where: { id: existing.id },
        data: {
          topicId: topicId ?? existing.topicId,
          topic: meta?.topicName ?? topicNames[0] ?? promptQuery,
          reason: meta?.reason ?? undefined,
        },
      });
      promptMap.set(promptQuery, { id: existing.id, topicId: topicId ?? existing.topicId });
      continue;
    }
    const created = await prisma.prompt.create({
      data: {
        query: promptQuery,
        topic: meta?.topicName ?? topicNames[0] ?? promptQuery,
        topicId,
        reason: meta?.reason ?? null,
        isActive: true,
      },
    });
    promptMap.set(promptQuery, { id: created.id, topicId });
  }

  const execMap = new Map<string, string>();
  const uniqueExecPairs = [
    ...new Set(radarOutput.citations.map((c) => `${c.prompt}|||${c.model}`)),
  ];

  for (const pair of uniqueExecPairs) {
    const [promptQuery, model] = pair.split("|||");
    const promptId = promptMap.get(promptQuery)?.id;
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
    const promptId = promptMap.get(cit.prompt)?.id;
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

  // Persist prompt rival rankings from topic_prompt_analysis.
  const promptIdsWithAnalysis = [...analysisPromptMeta.keys()]
    .map((q) => promptMap.get(q)?.id)
    .filter((id): id is string => Boolean(id));
  if (promptIdsWithAnalysis.length > 0) {
    await prisma.promptRivalByModel.deleteMany({
      where: { promptId: { in: promptIdsWithAnalysis } },
    });
    await prisma.promptRivalConsensus.deleteMany({
      where: { promptId: { in: promptIdsWithAnalysis } },
    });

    const byModelRows: Array<{
      promptId: string;
      model: string;
      companyName: string;
      rank: number | null;
    }> = [];
    const consensusRows: Array<{
      promptId: string;
      companyName: string;
      avgRank: number | null;
      mentions: number;
    }> = [];

    for (const [query, meta] of analysisPromptMeta.entries()) {
      const promptId = promptMap.get(query)?.id;
      if (!promptId) continue;
      for (const modelEntry of meta.byModel) {
        for (const comp of modelEntry.companies ?? []) {
          const name = comp.name?.trim();
          if (!name) continue;
          byModelRows.push({
            promptId,
            model: modelEntry.model,
            companyName: name,
            rank: comp.rank ?? null,
          });
        }
      }
      for (const comp of meta.consensus) {
        const name = comp.name?.trim();
        if (!name) continue;
        consensusRows.push({
          promptId,
          companyName: name,
          avgRank: comp.avg_rank ?? null,
          mentions: Math.max(0, comp.mentions ?? 0),
        });
      }
    }

    if (byModelRows.length) {
      await prisma.promptRivalByModel.createMany({ data: byModelRows });
    }
    if (consensusRows.length) {
      await prisma.promptRivalConsensus.createMany({ data: consensusRows });
    }
  }

  await syncBountyRevenueForCompany(prisma, companyId);
  await persistPromptMetricsForCompany(prisma, companyId);

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
  const payload = await buildRadarGetPayload(prisma, companyId);

  return NextResponse.json({
    success: true,
    ...payload,
    metrics: payload.metrics.map((m) => ({
      ...m,
      share_of_voice: m.shareOfVoice,
      top3_rate: m.top3Rate,
      query_coverage: m.queryCoverage,
      competitor_rank: m.competitorRank,
      topic_authority: m.topicAuthority,
    })),
    latest: payload.latest
      ? {
          ...payload.latest,
          share_of_voice: payload.latest.shareOfVoice,
          top3_rate: payload.latest.top3Rate,
          query_coverage: payload.latest.queryCoverage,
          competitor_rank: payload.latest.competitorRank,
          topic_authority: payload.latest.topicAuthority,
        }
      : null,
  });
}
