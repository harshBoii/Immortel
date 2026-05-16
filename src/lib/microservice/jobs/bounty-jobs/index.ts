// lib/jobs/run-bounty.ts
import { prisma }          from "@/lib/prisma"
import type { Difficulty } from "@prisma/client"
import { requireLimit } from "@/lib/subscription/check-limit"
import { incrementUsage } from "@/lib/subscription/increment-usage"

// ─── Types (move out of route file) ──────────────────────────────────────────
type BountyRequest = {
  company:     { name: string; website: string; linkedin: string }
  brandEntity: { category: string; topics: string[]; keywords: string[] }
  competitors: string[]
  models:      string[]
  session_id:  string
}
type BountyNiche = {
  topic: string; description: string; difficulty: string
  prompts: string[]; prompt_count: number
}
type BountyResponse = {
  niches:   BountyNiche[]
  summary?: { total_niches: number; total_prompts: number; by_difficulty: { easy: number; medium: number; hard: number } }
}
type TopicPromptAnalysisCompany   = { name: string; rank?: number | null }
type TopicPromptAnalysisByModel   = { model: string; companies?: TopicPromptAnalysisCompany[] }
type TopicPromptAnalysisConsensus = { name: string; avg_rank?: number | null; mentions?: number | null }
type TopicPromptAnalysisPrompt = {
  prompt: string; link?: string; reason?: string; use?: string
  estimated_revenue?: number | null
  cited_companies_by_model?:    TopicPromptAnalysisByModel[]
  cited_companies_consensus?:   TopicPromptAnalysisConsensus[]
}
type TopicPromptAnalysisItem = {
  topic: string; link?: string; reason?: string; use?: string
  prompts?: TopicPromptAnalysisPrompt[]
}
type RawResponseWithPrompt  = { prompt: string; model: string; response?: string | null; error?: string | null }
type ResponseByPromptItem   = { model: string; response?: string | null; error?: string | null }
type PromptRevenuePayload   = {
  monthlyPromptReach?: number | null; visibilityWeight?: number | null
  ctr?: number | null; cvr?: number | null; aov?: number | null; estimatedRevenue?: number | null
}
type BountyServiceOutput = Partial<BountyResponse> & {
  topic_prompt_analysis?:    TopicPromptAnalysisItem[]
  raw_responses_with_prompt?: RawResponseWithPrompt[]
  responses_by_prompt?:      Record<string, ResponseByPromptItem[]>
  revenue_by_prompt?:        Record<string, PromptRevenuePayload>
  output?:                   unknown
}

function mapDifficulty(s: string): Difficulty {
  const l = (s ?? "").toLowerCase()
  if (l === "easy") return "EASY"
  if (l === "hard") return "HARD"
  return "MEDIUM"
}
function toNullableNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return value
}

// ─── Main service function ────────────────────────────────────────────────────
export async function runBountyJob(companyId: string) {
  const [company, brandEntity] = await Promise.all([
    prisma.company.findUnique({
      where:  { id: companyId },
      select: { id: true, name: true, website: true },
    }),
    prisma.brandEntity.findUnique({
      where:   { companyId },
      include: {
        sameAsLinks: true,
        offerings:   { where: { isActive: true }, take: 5 },
      },
    }),
  ])

  if (!company) throw new Error(`Company not found: ${companyId}`)

  const linkedin         = brandEntity?.sameAsLinks.find((l) => l.platform.toLowerCase().includes("linkedin"))?.url ?? ""
  const primaryOffering  = brandEntity?.offerings?.find((o) => o.isPrimary) ?? brandEntity?.offerings?.[0]
  const competitors      = primaryOffering?.competitors ?? []
  const topics           = brandEntity?.topics   ?? []
  const keywords         = brandEntity?.keywords ?? []
  const category         = brandEntity?.category ?? ""

  const body: BountyRequest = {
    company:     { name: company.name, website: company.website ?? "https://example.com", linkedin: linkedin || "https://linkedin.com" },
    brandEntity: { category, topics, keywords },
    competitors,
    models:     ["gpt-5.4-nano", "claude-haiku-4-5-20251001", "gemini-3.1-flash-lite-preview"],
    session_id: `bounty-${companyId}-${Date.now()}`,
  }

  const base = process.env.MICROSERVICE_URL
  if (!base) throw new Error("MICROSERVICE_URL is not configured")

  await requireLimit(companyId, "bountyGenerator")

  const res = await fetch(`${base.replace(/\/$/, "")}/company/bounty`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Bounty microservice failed (${res.status}): ${text}`)
  }

  const raw: BountyServiceOutput = await res.json()
  const data: BountyServiceOutput = raw?.niches || raw?.topic_prompt_analysis ? raw as BountyServiceOutput : (raw?.output ?? raw) as BountyServiceOutput

  await incrementUsage(companyId, "bountyGenerator")

  const topicPromptAnalysis = Array.isArray(data?.topic_prompt_analysis) ? data.topic_prompt_analysis : []
  const revenueByPrompt     = data?.revenue_by_prompt && typeof data.revenue_by_prompt === "object" ? data.revenue_by_prompt : {}

  // ── Newer shape: topic_prompt_analysis ──────────────────────────────────────
  if (topicPromptAnalysis.length > 0) {
    const topicReasonByName = new Map<string, string | null>()
    for (const item of topicPromptAnalysis) {
      const name = item.topic?.trim()
      if (name) topicReasonByName.set(name, item.reason?.trim() || null)
    }

    const topicNames  = [...new Set(topicPromptAnalysis.map((t) => t.topic).filter((t): t is string => Boolean(t?.trim())))]
    const topicIdMap  = new Map<string, string>()

    for (const name of topicNames) {
      const reason = topicReasonByName.get(name) ?? null
      const topic  = await prisma.llmTopic.upsert({
        where:  { companyId_name: { companyId, name } },
        create: { companyId, name, description: reason, reason },
        update: { reason, ...(reason ? { description: reason } : {}) },
        select: { id: true },
      })
      topicIdMap.set(name, topic.id)
    }

    const promptMeta = new Map<string, {
      topicName: string; reason: string | null; estimatedRevenue: number | null
      byModel:   NonNullable<TopicPromptAnalysisPrompt["cited_companies_by_model"]>
      consensus: NonNullable<TopicPromptAnalysisPrompt["cited_companies_consensus"]>
    }>()

    for (const item of topicPromptAnalysis) {
      const topicName = item.topic?.trim()
      if (!topicName) continue
      for (const p of item.prompts ?? []) {
        const q = p.prompt?.trim()
        if (!q || promptMeta.has(q)) continue
        promptMeta.set(q, {
          topicName,
          reason:           p.reason?.trim() || null,
          estimatedRevenue: toNullableNumber(p.estimated_revenue),
          byModel:          p.cited_companies_by_model   ?? [],
          consensus:        p.cited_companies_consensus  ?? [],
        })
      }
    }

    const promptQueries = [...promptMeta.keys()]
    const existing      = promptQueries.length
      ? await prisma.prompt.findMany({ where: { query: { in: promptQueries } }, select: { id: true, query: true, topicId: true } })
      : []
    const promptMap = new Map<string, { id: string; topicId: string | null }>()
    for (const p of existing) {
      if (!promptMap.has(p.query)) promptMap.set(p.query, { id: p.id, topicId: p.topicId })
    }

    for (const query of promptQueries) {
      const meta    = promptMeta.get(query)!
      const topicId = topicIdMap.get(meta.topicName) ?? null
      const prev    = promptMap.get(query)
      if (prev) {
        await prisma.prompt.update({
          where: { id: prev.id },
          data:  { topicId: topicId ?? prev.topicId, topic: meta.topicName, reason: meta.reason ?? undefined },
        })
        promptMap.set(query, { id: prev.id, topicId: topicId ?? prev.topicId })
      } else {
        const created = await prisma.prompt.create({
          data:   { query, topic: meta.topicName, topicId, reason: meta.reason ?? null, isActive: true },
          select: { id: true, topicId: true },
        })
        promptMap.set(query, { id: created.id, topicId: created.topicId })
      }
    }

    // Revenue
    const promptRevenueRows = Object.entries(revenueByPrompt).flatMap(([query, payload]) => {
      const q        = query?.trim()
      const promptId = q ? promptMap.get(q)?.id : undefined
      if (!q || !promptId) return []
      return [{
        promptId,
        monthlyPromptReach: toNullableNumber(payload?.monthlyPromptReach),
        visibilityWeight:   toNullableNumber(payload?.visibilityWeight),
        ctr:                toNullableNumber(payload?.ctr),
        cvr:                toNullableNumber(payload?.cvr),
        aov:                toNullableNumber(payload?.aov),
        estimatedRevenue:   toNullableNumber(payload?.estimatedRevenue) ?? toNullableNumber(promptMeta.get(q)?.estimatedRevenue),
      }]
    })
    for (const row of promptRevenueRows) {
      await prisma.promptRevenue.upsert({ where: { promptId: row.promptId }, create: row, update: row })
    }

    // Raw model responses
    const responsesByPrompt = data?.responses_by_prompt ?? {}
    const flatRaw           = Array.isArray(data?.raw_responses_with_prompt) ? data.raw_responses_with_prompt : []
    const executionRows: Array<{ promptId: string; model: string; response: string }> = []
    const executionUnique   = new Set<string>()

    const addExecution = (promptQuery: string, model: string, r: string, err: string) => {
      const promptId = promptMap.get(promptQuery?.trim())?.id
      if (!promptId || !model?.trim()) return
      const body     = (r?.trim() || (err?.trim() ? `[error] ${err.trim()}` : "")).trim()
      if (!body) return
      const key = `${promptId}|||${model}|||${body}`
      if (executionUnique.has(key)) return
      executionUnique.add(key)
      executionRows.push({ promptId, model: model.trim(), response: body })
    }

    for (const [pq, entries] of Object.entries(responsesByPrompt)) {
      if (!Array.isArray(entries)) continue
      for (const e of entries) addExecution(pq, e?.model, e?.response ?? "", e?.error ?? "")
    }
    for (const item of flatRaw) addExecution(item.prompt, item.model, item.response ?? "", item.error ?? "")

    if (executionRows.length > 0) {
      await prisma.promptExecution.createMany({ data: executionRows.slice(0, 800) })
    }

    // Rival rankings
    const promptIds = promptQueries.map((q) => promptMap.get(q)?.id).filter((id): id is string => Boolean(id))
    if (promptIds.length > 0) {
      await prisma.promptRivalByModel.deleteMany({   where: { promptId: { in: promptIds } } })
      await prisma.promptRivalConsensus.deleteMany({ where: { promptId: { in: promptIds } } })

      const byModelRows:   Array<{ promptId: string; model: string; companyName: string; rank: number | null }> = []
      const consensusRows: Array<{ promptId: string; companyName: string; avgRank: number | null; mentions: number }> = []

      for (const [query, meta] of promptMeta.entries()) {
        const promptId = promptMap.get(query)?.id
        if (!promptId) continue
        for (const modelEntry of meta.byModel) {
          const model = modelEntry.model?.trim()
          if (!model) continue
          for (const comp of modelEntry.companies ?? []) {
            const name = comp.name?.trim()
            if (name) byModelRows.push({ promptId, model, companyName: name, rank: comp.rank ?? null })
          }
        }
        for (const comp of meta.consensus) {
          const name = comp.name?.trim()
          if (name) consensusRows.push({ promptId, companyName: name, avgRank: comp.avg_rank ?? null, mentions: Math.max(0, comp.mentions ?? 0) })
        }
      }

      if (byModelRows.length) {
        const unique = new Map<string, typeof byModelRows[0]>()
        for (const row of byModelRows) {
          const key  = `${row.promptId}|||${row.model}|||${row.companyName.toLowerCase()}`
          const prev = unique.get(key)
          if (!prev || (row.rank ?? 999) < (prev.rank ?? 999)) unique.set(key, row)
        }
        await prisma.promptRivalByModel.createMany({ data: [...unique.values()], skipDuplicates: true })
      }

      if (consensusRows.length) {
        const unique = new Map<string, typeof consensusRows[0]>()
        for (const row of consensusRows) {
          const key  = `${row.promptId}|||${row.companyName.toLowerCase()}`
          const prev = unique.get(key)
          if (!prev) { unique.set(key, row); continue }
          unique.set(key, {
            ...prev,
            mentions: Math.max(prev.mentions, row.mentions),
            avgRank:  prev.avgRank == null ? row.avgRank : row.avgRank == null ? prev.avgRank : Math.min(prev.avgRank, row.avgRank),
          })
        }
        await prisma.promptRivalConsensus.createMany({ data: [...unique.values()], skipDuplicates: true })
      }
    }

    return { topic_prompt_analysis: topicPromptAnalysis }
  }

  // ── Legacy shape: niches ─────────────────────────────────────────────────────
  if (!data?.niches?.length) return { niches: [], summary: data?.summary ?? null }

  for (const niche of data.niches) {
    const topicName = niche.topic?.trim()
    if (!topicName) continue
    const difficulty = mapDifficulty(niche.difficulty)
    const llmTopic   = await prisma.llmTopic.upsert({
      where:  { companyId_name: { companyId, name: topicName } },
      create: { companyId, name: topicName, description: niche.description ?? null, difficulty },
      update: { description: niche.description ?? undefined, difficulty },
      select: { id: true },
    })

    const existingSet = new Set(
      (await prisma.prompt.findMany({ where: { topicId: llmTopic.id }, select: { query: true } }))
        .map((p) => p.query)
    )
    for (const query of niche.prompts ?? []) {
      const q = query?.trim()
      if (!q || existingSet.has(q)) continue
      await prisma.prompt.create({ data: { query: q, topic: topicName, topicId: llmTopic.id, isActive: true } })
      existingSet.add(q)
    }
  }

  const createdPrompts = await prisma.prompt.findMany({
    where:  { query: { in: Object.keys(revenueByPrompt) } },
    select: { id: true, query: true },
  })
  for (const prompt of createdPrompts) {
    const payload = revenueByPrompt[prompt.query]
    if (!payload) continue
    const row = {
      promptId:           prompt.id,
      monthlyPromptReach: toNullableNumber(payload.monthlyPromptReach),
      visibilityWeight:   toNullableNumber(payload.visibilityWeight),
      ctr:                toNullableNumber(payload.ctr),
      cvr:                toNullableNumber(payload.cvr),
      aov:                toNullableNumber(payload.aov),
      estimatedRevenue:   toNullableNumber(payload.estimatedRevenue),
    }
    await prisma.promptRevenue.upsert({ where: { promptId: prompt.id }, create: row, update: row })
  }

  return { niches: data.niches, summary: data.summary ?? null }
}