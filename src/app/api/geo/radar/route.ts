// app/api/geo/radar/route.ts  (POST handler only — keep your GET as-is)
import { NextResponse } from "next/server"
import { getSession }   from "@/lib/auth"
import { runRadarJob } from "@/lib/microservice/jobs/radar-job"
import { SubscriptionLimitError } from "@/lib/subscription/check-limit"
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getSession()
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }
  try {
    const result = await runRadarJob(session.companyId)  
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof SubscriptionLimitError) {
      return NextResponse.json(
        { success: false, error: err.message, usage: err.usage },
        { status: 403 }
      )
    }
    console.error("Radar error:", err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 })
  }
}

// GET stays exactly as you have it
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
