// app/api/jobs/bounty-pages/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { huntBountyForCompany } from "@/lib/geo/bounty/huntForCompany"
import { approveBountyToShopify } from "@/lib/geo/bounty/approveBountyToShopify"

export const maxDuration = 300

async function handler(req: Request) {
  const { companyId } = await req.json()
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const latestTopic = await prisma.llmTopic.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })

  if (!latestTopic) {
    return NextResponse.json({
      success: true,
      summary: {
        topic: null,
        created: 0,
        hunted: 0,
        approved: 0,
        skipped: 0,
        errors: [],
      },
    })
  }

  const prompts = await prisma.prompt.findMany({
    where: { topicId: latestTopic.id, isActive: true, ishunted: false },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true, query: true },
  })

  const summary = {
    topic: { id: latestTopic.id, name: latestTopic.name },
    created: 0,
    hunted: 0,
    approved: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const p of prompts) {
    const query = p.query?.trim()
    if (!query) {
      summary.skipped++
      continue
    }

    try {
      const existing = await prisma.citationBounty.findFirst({
        where: { companyId, query },
        select: { id: true, aeoPageId: true, status: true },
        orderBy: { createdAt: "desc" },
      })

      if (existing?.aeoPageId) {
        summary.skipped++
        await prisma.prompt.update({ where: { id: p.id }, data: { ishunted: true } }).catch(() => {})
        continue
      }

      if (existing && existing.status !== "OPEN") {
        summary.skipped++
        summary.errors.push(`[skip] ${query}: existing bounty not OPEN (${existing.status})`)
        continue
      }

      const bounty = existing?.id
        ? { id: existing.id }
        : await prisma.citationBounty.create({
            data: {
              companyId,
              query,
              pageType: "USE_CASE",
              confidence: 50,
              status: "OPEN",
            },
            select: { id: true },
          })

      if (!existing) summary.created++

      const hunt = await huntBountyForCompany({ companyId, bountyId: bounty.id })
      if (hunt?.aeoPageId) summary.hunted++

      await prisma.prompt.update({ where: { id: p.id }, data: { ishunted: true } })

      try {
        await approveBountyToShopify({ companyId, bountyId: bounty.id })
        summary.approved++
      } catch (e) {
        // Best-effort: skip approval failures (e.g. no Shopify connected)
        summary.errors.push(`[approve] ${query}: ${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e) {
      summary.errors.push(`[auto] ${query}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log("[jobs/bounty-pages] completed", { companyId, ...summary })
  return NextResponse.json({ success: true, summary })
}

export const POST = verifySignatureAppRouter(handler)

