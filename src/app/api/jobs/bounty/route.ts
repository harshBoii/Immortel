// app/api/jobs/bounty/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { NextResponse }              from "next/server"
import { prisma }                    from "@/lib/prisma"
import { runBountyJob }              from "@/lib/microservice/jobs/bounty-jobs"

export const maxDuration = 300

async function handler(req: Request) {
  const { companyId } = await req.json()
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await runBountyJob(company.id)
  return NextResponse.json({ success: true })
}

export const POST = verifySignatureAppRouter(handler)