import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scheduleAt } from "@/lib/qstash"
import { getNextRunDate } from "@/lib/qstash/scheduler"
import type { Frequency } from "@/lib/qstash/scheduler"

type FrequencyInput = Frequency

function isFrequency(value: unknown): value is FrequencyInput {
  return (
    value === "DAILY" ||
    value === "WEEKLY" ||
    value === "MID_WEEKLY" ||
    value === "MID_MONTHLY" ||
    value === "MONTHLY"
  )
}

function parseTimeToTodayAnchor(time: string, now: Date) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim())
  if (!m) return null

  const hours = Number(m[1])
  const minutes = Number(m[2])
  const anchor = new Date(now)
  anchor.setHours(hours, minutes, 0, 0)
  return anchor
}

export async function GET() {
  const session = await getSession()
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      id: true,
      autoRefreshAt: true,
      autoRefreshFrequency: true,
      autoRefreshLastRunAt: true,
    },
  })

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    schedule: {
      autoRefreshAt: company.autoRefreshAt,
      autoRefreshFrequency: company.autoRefreshFrequency ?? "MONTHLY",
      autoRefreshLastRunAt: company.autoRefreshLastRunAt,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as
    | { frequency?: unknown; time?: unknown }
    | null

  const frequencyRaw = body?.frequency
  const timeRaw = body?.time

  if (!isFrequency(frequencyRaw)) {
    return NextResponse.json(
      { success: false, error: "Invalid frequency" },
      { status: 400 }
    )
  }
  if (typeof timeRaw !== "string") {
    return NextResponse.json({ success: false, error: "Invalid time" }, { status: 400 })
  }

  const now = new Date()
  const anchor = parseTimeToTodayAnchor(timeRaw, now)
  if (!anchor) {
    return NextResponse.json(
      { success: false, error: "Time must be HH:MM (24h)" },
      { status: 400 }
    )
  }

  const runAt = anchor > now ? anchor : getNextRunDate(anchor, frequencyRaw, now)

  await prisma.company.update({
    where: { id: session.companyId },
    data: {
      autoRefreshFrequency: frequencyRaw,
      autoRefreshAt: runAt,
    },
  })

  let messageId: string | null = null
  try {
    const res = await scheduleAt(session.companyId, runAt)
    messageId = res.messageId ?? null
  } catch (err) {
    // Scheduling can fail if env vars are missing; the schedule is still saved in DB.
    console.error("Failed to schedule QStash message:", err)
  }

  return NextResponse.json({
    success: true,
    schedule: {
      autoRefreshAt: runAt,
      autoRefreshFrequency: frequencyRaw,
    },
    messageId,
  })
}

