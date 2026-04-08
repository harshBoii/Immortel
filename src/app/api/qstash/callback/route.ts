// // app/api/qstash/callback/route.ts
// import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
// import { NextResponse }              from "next/server"
// import { prisma }                    from "@/lib/prisma"
// import { scheduleAt }                from "@/lib/qstash"
// import { getNextRunDate }            from "@/lib/qstash/scheduler"
// import { seedCompany, refreshCompanyRadar, refreshCompanyBounty } from "@/lib/qstash/company-jobs"
// import type { Frequency }            from "@/lib/qstash/scheduler"

// async function handler(req: Request) {
//   const { companyId } = await req.json()

//   if (!companyId) {
//     return NextResponse.json({ error: "Missing companyId" }, { status: 400 })
//   }

//   const company = await prisma.company.findUnique({ where: { id: companyId } })
//   if (!company) {
//     return NextResponse.json({ error: "Company not found" }, { status: 404 })
//   }

//   // Run all 3 jobs concurrently — each failure is captured independently
//   const results = await Promise.all([
//     seedCompany(company)
//       .then(() => ({ job: "job1", ok: true }))
//       .catch((e: Error) => ({ job: "job1", ok: false, error: e.message })),
//     refreshCompanyRadar(company)
//       .then(() => ({ job: "job2", ok: true }))
//       .catch((e: Error) => ({ job: "job2", ok: false, error: e.message })),
//     refreshCompanyBounty(company)
//       .then(() => ({ job: "job3", ok: true }))
//       .catch((e: Error) => ({ job: "job3", ok: false, error: e.message })),
//   ])

//   // Calculate + persist next run
//   const frequency = (company.autoRefreshFrequency ?? "MONTHLY") as Frequency
//   const nextRunAt = getNextRunDate(company.autoRefreshAt ?? new Date(), frequency)

//   await prisma.company.update({
//     where: { id: companyId },
//     data: {
//       autoRefreshLastRunAt: new Date(),
//       autoRefreshAt: nextRunAt,
//     },
//   })

//   // Auto-reschedule the next run
//   const { messageId } = await scheduleAt(companyId, nextRunAt)

//   return NextResponse.json({ success: true, results, nextRunAt, messageId })
// }

// // Rejects any request not signed by QStash
// export const POST = verifySignatureAppRouter(handler)

// app/api/qstash/callback/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { NextResponse }              from "next/server"
import { prisma }                    from "@/lib/prisma"
import { scheduleAt, publishJob }    from "@/lib/qstash"
import { getNextRunDate }            from "@/lib/qstash/scheduler"
import type { Frequency }            from "@/lib/qstash/scheduler"

async function handler(req: Request) {
  const { companyId } = await req.json()
  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 })
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  // ── 1. Reschedule FIRST (doesn't depend on job results) ─────────────────────
  const frequency = (company.autoRefreshFrequency ?? "MONTHLY") as Frequency
  const nextRunAt = getNextRunDate(company.autoRefreshAt ?? new Date(), frequency)
  const { messageId } = await scheduleAt(companyId, nextRunAt)

  await prisma.company.update({
    where: { id: companyId },
    data: {
      autoRefreshLastRunAt: new Date(),
      autoRefreshAt:        nextRunAt,
    },
  })

  // ── 2. Fan out — dispatch 3 independent job messages ────────────────────────
  await Promise.all([
    publishJob("/api/jobs/seed",   { companyId }),
    publishJob("/api/jobs/radar",  { companyId }),
    publishJob("/api/jobs/bounty", { companyId }),
  ])

  // ── 3. Return immediately — QStash is happy ✅ ───────────────────────────────
  return NextResponse.json({ success: true, nextRunAt, messageId })
}

export const POST = verifySignatureAppRouter(handler)