import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Difficulty } from "@prisma/client";

type BountyRequest = {
  company: { name: string; website: string; linkedin: string };
  brandEntity: {
    category: string;
    topics: string[];
    keywords: string[];
  };
  competitors: string[];
  models: string[];
  session_id: string;
};

type BountyNiche = {
  topic: string;
  description: string;
  difficulty: string;
  prompts: string[];
  prompt_count: number;
};

type BountyResponse = {
  niches: BountyNiche[];
  summary?: {
    total_niches: number;
    total_prompts: number;
    by_difficulty: { easy: number; medium: number; hard: number };
  };
};

type TopicPromptAnalysisCompany = { name: string; rank?: number | null };
type TopicPromptAnalysisByModel = {
  model: string;
  companies?: TopicPromptAnalysisCompany[];
};
type TopicPromptAnalysisConsensus = {
  name: string;
  avg_rank?: number | null;
  mentions?: number | null;
};
type TopicPromptAnalysisPrompt = {
  prompt: string;
  link?: string;
  reason?: string;
  use?: string;
  estimated_revenue?: number | null;
  cited_companies_by_model?: TopicPromptAnalysisByModel[];
  cited_companies_consensus?: TopicPromptAnalysisConsensus[];
};
type TopicPromptAnalysisItem = {
  topic: string;
  link?: string;
  reason?: string;
  use?: string;
  prompts?: TopicPromptAnalysisPrompt[];
};

type RawResponseWithPrompt = {
  prompt: string;
  model: string;
  response?: string | null;
  error?: string | null;
};

type ResponseByPromptItem = {
  model: string;
  response?: string | null;
  error?: string | null;
};

type BountyServiceOutput = Partial<BountyResponse> & {
  topic_prompt_analysis?: TopicPromptAnalysisItem[];
  raw_responses_with_prompt?: RawResponseWithPrompt[];
  responses_by_prompt?: Record<string, ResponseByPromptItem[]>;
  revenue_by_prompt?: Record<string, PromptRevenuePayload>;
};

type PromptRevenuePayload = {
  monthlyPromptReach?: number | null;
  visibilityWeight?: number | null;
  ctr?: number | null;
  cvr?: number | null;
  aov?: number | null;
  estimatedRevenue?: number | null;
};

function mapDifficulty(s: string): Difficulty {
  const lower = (s ?? "").toLowerCase();
  if (lower === "easy") return "EASY";
  if (lower === "hard") return "HARD";
  return "MEDIUM";
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const [company, brandEntity] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, website: true },
    }),
    prisma.brandEntity.findUnique({
      where: { companyId },
      include: {
        sameAsLinks: true,
        offerings: { where: { isActive: true }, take: 5 },
      },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  const linkedin =
    brandEntity?.sameAsLinks.find((l) =>
      l.platform.toLowerCase().includes("linkedin")
    )?.url ?? "";
  const primaryOffering =
    brandEntity?.offerings?.find((o) => o.isPrimary) ?? brandEntity?.offerings?.[0];
  const competitors = primaryOffering?.competitors ?? [];
  const topics = brandEntity?.topics ?? [];
  const keywords = brandEntity?.keywords ?? [];
  const category = brandEntity?.category ?? "";

  const body: BountyRequest = {
    company: {
      name: company.name,
      website: company.website ?? "https://example.com",
      linkedin: linkedin || "https://linkedin.com",
    },
    brandEntity: {
      category,
      topics,
      keywords,
    },
    competitors,
    models: ["gpt-5.4-nano", "claude-haiku-4-5-20251001", "gemini-3.1-flash-lite-preview"],
    session_id: `bounty-${companyId}-${Date.now()}`,
  };

  const base = process.env.MICROSERVICE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured" },
      { status: 500 }
    );
  }

  const bountyUrl = `${base.replace(/\/$/, "")}/company/bounty`;
  let data: BountyServiceOutput;

  try {
    const res = await fetch(bountyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: "Bounty microservice failed",
          status: res.status,
          body: text || undefined,
        },
        { status: 502 }
      );
    }

    const raw = await res.json();
    data = raw?.niches || raw?.topic_prompt_analysis ? raw : (raw?.output ?? raw);
  } catch (err) {
    console.error("Bounty microservice error:", err);
    return NextResponse.json(
      { success: false, error: "Error contacting bounty service" },
      { status: 502 }
    );
  }

  const topicPromptAnalysis = Array.isArray(data?.topic_prompt_analysis)
    ? data.topic_prompt_analysis
    : [];
  const revenueByPrompt =
    data?.revenue_by_prompt && typeof data.revenue_by_prompt === "object"
      ? data.revenue_by_prompt
      : {};

  // Newer service shape: topic_prompt_analysis with prompt reasons + rival rankings.
  if (topicPromptAnalysis.length > 0) {
    const topicReasonByName = new Map<string, string | null>();
    for (const item of topicPromptAnalysis) {
      const name = item.topic?.trim();
      if (!name) continue;
      topicReasonByName.set(name, item.reason?.trim() || null);
    }

    const topicNames = [
      ...new Set(
        topicPromptAnalysis.map((t) => t.topic).filter((t): t is string => Boolean(t?.trim()))
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

    const promptMeta = new Map<
      string,
      {
        topicName: string;
        reason: string | null;
        estimatedRevenue: number | null;
        byModel: NonNullable<TopicPromptAnalysisPrompt["cited_companies_by_model"]>;
        consensus: NonNullable<TopicPromptAnalysisPrompt["cited_companies_consensus"]>;
      }
    >();
    for (const item of topicPromptAnalysis) {
      const topicName = item.topic?.trim();
      if (!topicName) continue;
      for (const p of item.prompts ?? []) {
        const q = p.prompt?.trim();
        if (!q || promptMeta.has(q)) continue;
        promptMeta.set(q, {
          topicName,
          reason: p.reason?.trim() || null,
          estimatedRevenue: toNullableNumber(p.estimated_revenue),
          byModel: p.cited_companies_by_model ?? [],
          consensus: p.cited_companies_consensus ?? [],
        });
      }
    }

    const promptQueries = [...promptMeta.keys()];
    const existing = promptQueries.length
      ? await prisma.prompt.findMany({
          where: { query: { in: promptQueries } },
          select: { id: true, query: true, topicId: true },
        })
      : [];
    const promptMap = new Map<string, { id: string; topicId: string | null }>();
    for (const p of existing) {
      if (!promptMap.has(p.query)) promptMap.set(p.query, { id: p.id, topicId: p.topicId });
    }

    for (const query of promptQueries) {
      const meta = promptMeta.get(query);
      if (!meta) continue;
      const topicId = topicIdMap.get(meta.topicName) ?? null;
      const prev = promptMap.get(query);
      if (prev) {
        await prisma.prompt.update({
          where: { id: prev.id },
          data: {
            topicId: topicId ?? prev.topicId,
            topic: meta.topicName,
            reason: meta.reason ?? undefined,
          },
        });
        promptMap.set(query, { id: prev.id, topicId: topicId ?? prev.topicId });
      } else {
        const created = await prisma.prompt.create({
          data: {
            query,
            topic: meta.topicName,
            topicId,
            reason: meta.reason ?? null,
            isActive: true,
          },
          select: { id: true, topicId: true },
        });
        promptMap.set(query, { id: created.id, topicId: created.topicId });
      }
    }

    const promptRevenueRows = Object.entries(revenueByPrompt)
      .map(([query, payload]) => {
        const normalizedQuery = query?.trim();
        if (!normalizedQuery) return null;
        const promptId = promptMap.get(normalizedQuery)?.id;
        if (!promptId) return null;
        return {
          promptId,
          monthlyPromptReach: toNullableNumber(payload?.monthlyPromptReach),
          visibilityWeight: toNullableNumber(payload?.visibilityWeight),
          ctr: toNullableNumber(payload?.ctr),
          cvr: toNullableNumber(payload?.cvr),
          aov: toNullableNumber(payload?.aov),
          estimatedRevenue:
            toNullableNumber(payload?.estimatedRevenue) ??
            toNullableNumber(promptMeta.get(normalizedQuery)?.estimatedRevenue),
        };
      })
      .filter(
        (
          row
        ): row is {
          promptId: string;
          monthlyPromptReach: number | null;
          visibilityWeight: number | null;
          ctr: number | null;
          cvr: number | null;
          aov: number | null;
          estimatedRevenue: number | null;
        } => Boolean(row)
      );

    for (const row of promptRevenueRows) {
      await prisma.promptRevenue.upsert({
        where: { promptId: row.promptId },
        create: row,
        update: row,
      });
    }

    // Persist raw model outputs, grouped by prompt (responses_by_prompt) and/or flat list.
    const responsesByPrompt =
      data?.responses_by_prompt && typeof data.responses_by_prompt === "object"
        ? data.responses_by_prompt
        : {};
    const flatRaw = Array.isArray(data?.raw_responses_with_prompt)
      ? data.raw_responses_with_prompt
      : [];

    const executionRows: Array<{ promptId: string; model: string; response: string }> = [];
    const executionUnique = new Set<string>();

    for (const [promptQueryRaw, entries] of Object.entries(responsesByPrompt)) {
      const promptQuery = promptQueryRaw?.trim();
      if (!promptQuery) continue;
      const promptId = promptMap.get(promptQuery)?.id;
      if (!promptId) continue;
      if (!Array.isArray(entries)) continue;

      for (const e of entries) {
        const model = e?.model?.trim();
        if (!model) continue;
        const r = (e.response ?? "")?.toString();
        const err = (e.error ?? "")?.toString();
        const body = (r?.trim() || (err?.trim() ? `[error] ${err.trim()}` : "")).trim();
        if (!body) continue;

        const key = `${promptId}|||${model}|||${body}`;
        if (executionUnique.has(key)) continue;
        executionUnique.add(key);
        executionRows.push({ promptId, model, response: body });
      }
    }

    for (const item of flatRaw) {
      const promptQuery = item.prompt?.trim();
      const model = item.model?.trim();
      if (!promptQuery || !model) continue;
      const promptId = promptMap.get(promptQuery)?.id;
      if (!promptId) continue;
      const r = (item.response ?? "")?.toString();
      const err = (item.error ?? "")?.toString();
      const body = (r?.trim() || (err?.trim() ? `[error] ${err.trim()}` : "")).trim();
      if (!body) continue;

      const key = `${promptId}|||${model}|||${body}`;
      if (executionUnique.has(key)) continue;
      executionUnique.add(key);
      executionRows.push({ promptId, model, response: body });
    }

    if (executionRows.length > 0) {
      // Keep inserts reasonable if service returns huge payloads.
      const capped = executionRows.slice(0, 800);
      await prisma.promptExecution.createMany({ data: capped });
    }

    const promptIds = promptQueries
      .map((q) => promptMap.get(q)?.id)
      .filter((id): id is string => Boolean(id));

    if (promptIds.length > 0) {
      await prisma.promptRivalByModel.deleteMany({ where: { promptId: { in: promptIds } } });
      await prisma.promptRivalConsensus.deleteMany({ where: { promptId: { in: promptIds } } });

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

      for (const [query, meta] of promptMeta.entries()) {
        const promptId = promptMap.get(query)?.id;
        if (!promptId) continue;

        for (const modelEntry of meta.byModel) {
          const model = modelEntry.model?.trim();
          if (!model) continue;
          for (const comp of modelEntry.companies ?? []) {
            const name = comp.name?.trim();
            if (!name) continue;
            byModelRows.push({
              promptId,
              model,
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
        const unique = new Map<
          string,
          { promptId: string; model: string; companyName: string; rank: number | null }
        >();
        for (const row of byModelRows) {
          const key = `${row.promptId}|||${row.model}|||${row.companyName.toLowerCase()}`;
          const prev = unique.get(key);
          if (!prev || (row.rank ?? 999) < (prev.rank ?? 999)) unique.set(key, row);
        }
        await prisma.promptRivalByModel.createMany({
          data: [...unique.values()],
          skipDuplicates: true,
        });
      }

      if (consensusRows.length) {
        const unique = new Map<
          string,
          { promptId: string; companyName: string; avgRank: number | null; mentions: number }
        >();
        for (const row of consensusRows) {
          const key = `${row.promptId}|||${row.companyName.toLowerCase()}`;
          const prev = unique.get(key);
          if (!prev) {
            unique.set(key, row);
            continue;
          }
          const mergedMentions = Math.max(prev.mentions, row.mentions);
          const mergedAvgRank =
            prev.avgRank == null
              ? row.avgRank
              : row.avgRank == null
                ? prev.avgRank
                : Math.min(prev.avgRank, row.avgRank);
          unique.set(key, { ...prev, mentions: mergedMentions, avgRank: mergedAvgRank });
        }
        await prisma.promptRivalConsensus.createMany({
          data: [...unique.values()],
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      topic_prompt_analysis: topicPromptAnalysis,
    });
  }

  if (!data?.niches?.length) {
    return NextResponse.json({
      success: true,
      niches: [],
      summary: data?.summary ?? null,
    });
  }

  for (const niche of data.niches) {
    const topicName = niche.topic?.trim();
    if (!topicName) continue;

    const difficulty = mapDifficulty(niche.difficulty);

    const llmTopic = await prisma.llmTopic.upsert({
      where: { companyId_name: { companyId, name: topicName } },
      create: {
        companyId,
        name: topicName,
        description: niche.description ?? null,
        difficulty,
      },
      update: {
        description: niche.description ?? undefined,
        difficulty,
      },
      select: { id: true },
    });

    const existingPrompts = await prisma.prompt.findMany({
      where: { topicId: llmTopic.id },
      select: { query: true },
    });
    const existingSet = new Set(existingPrompts.map((p) => p.query));

    for (const query of niche.prompts ?? []) {
      const q = query?.trim();
      if (!q || existingSet.has(q)) continue;

      await prisma.prompt.create({
        data: {
          query: q,
          topic: topicName,
          topicId: llmTopic.id,
          isActive: true,
        },
      });
      existingSet.add(q);
    }
  }

  const createdOrExistingPrompts = await prisma.prompt.findMany({
    where: { query: { in: Object.keys(revenueByPrompt) } },
    select: { id: true, query: true },
  });
  for (const prompt of createdOrExistingPrompts) {
    const payload = revenueByPrompt[prompt.query];
    if (!payload) continue;
    await prisma.promptRevenue.upsert({
      where: { promptId: prompt.id },
      create: {
        promptId: prompt.id,
        monthlyPromptReach: toNullableNumber(payload.monthlyPromptReach),
        visibilityWeight: toNullableNumber(payload.visibilityWeight),
        ctr: toNullableNumber(payload.ctr),
        cvr: toNullableNumber(payload.cvr),
        aov: toNullableNumber(payload.aov),
        estimatedRevenue: toNullableNumber(payload.estimatedRevenue),
      },
      update: {
        monthlyPromptReach: toNullableNumber(payload.monthlyPromptReach),
        visibilityWeight: toNullableNumber(payload.visibilityWeight),
        ctr: toNullableNumber(payload.ctr),
        cvr: toNullableNumber(payload.cvr),
        aov: toNullableNumber(payload.aov),
        estimatedRevenue: toNullableNumber(payload.estimatedRevenue),
      },
    });
  }

  return NextResponse.json({
    success: true,
    niches: data.niches,
    summary: data.summary ?? null,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const topics = await prisma.llmTopic.findMany({
    where: { companyId: session.companyId },
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

  return NextResponse.json({
    success: true,
    niches,
    summary: {
      total_niches: niches.length,
      total_prompts: niches.reduce((s, n) => s + n.prompt_count, 0),
      by_difficulty: byDifficulty,
    },
  });
}
