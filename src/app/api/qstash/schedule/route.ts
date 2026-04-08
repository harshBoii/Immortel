// app/api/qstash/schedule/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma }                    from "@/lib/prisma"
import { scheduleAt, cancelMessage } from "@/lib/qstash"
import { getNextRunDate }            from "@/lib/qstash/scheduler"
import type { Frequency }            from "@/lib/qstash/scheduler"

// POST — call when company enables or changes their schedule
export async function POST(req: NextRequest) {
  const { companyId } = await req.json()

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company?.autoRefreshAt) {
    return NextResponse.json({ error: "Set autoRefreshAt first" }, { status: 400 })
  }

  const frequency = (company.autoRefreshFrequency ?? "MONTHLY") as Frequency
  const now       = new Date()

  // Use saved time if future, otherwise advance to next valid occurrence
  const runAt = company.autoRefreshAt > now
    ? company.autoRefreshAt
    : getNextRunDate(company.autoRefreshAt, frequency, now)

  await prisma.company.update({ where: { id: companyId }, data: { autoRefreshAt: runAt } })

  const { messageId } = await scheduleAt(companyId, runAt)

  return NextResponse.json({ success: true, scheduledAt: runAt, messageId })
}

// DELETE — cancel a pending run (company disables auto-refresh)
export async function DELETE(req: NextRequest) {
  const { messageId } = await req.json()
  await cancelMessage(messageId)
  return NextResponse.json({ success: true, cancelled: messageId })
}