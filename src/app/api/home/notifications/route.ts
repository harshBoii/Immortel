import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolvePromptRevenueUsd } from "@/lib/geo/promptRevenueResolve"

function pickRandom<T>(arr: T[], n: number): T[] {
  if (n <= 0) return []
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}

export async function GET() {
  const session = await getSession()
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const companyId = session.companyId

  const rows = await prisma.prompt.findMany({
    where: {
      isActive: true,
      llmTopic: { companyId },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      query: true,
      reason: true,
      expectedRevenue: true,
      llmTopic: { select: { name: true } },
      revenue: {
        select: {
          estimatedRevenue: true,
          monthlyPromptReach: true,
          visibilityWeight: true,
          ctr: true,
          cvr: true,
          aov: true,
        },
      },
    },
  })

  const picked = pickRandom(rows, 3).map((p) => {
    const estimatedRevenueUsd = resolvePromptRevenueUsd(p.revenue) ?? p.expectedRevenue ?? null
    return {
      id: p.id,
      query: p.query,
      reason: p.reason ?? null,
      topic: p.llmTopic?.name ?? p.query?.slice(0, 48) ?? "Prompt",
      estimatedRevenueUsd,
    }
  })

  return NextResponse.json({
    success: true,
    prompts: picked,
  })
}

