import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyRadarOutput, parseRadarMicroservicePayload } from "@/lib/geo/radar/applyRadarOutput";

const WEBHOOK_SECRET = process.env.GEO_RADAR_WEBHOOK_SECRET;

function validateAuth(request: Request): boolean {
  if (!WEBHOOK_SECRET) return true;
  const header = request.headers.get("x-geo-radar-secret") ?? request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7) === WEBHOOK_SECRET;
  }
  return header === WEBHOOK_SECRET;
}

/**
 * Ingests the same radar JSON shape returned by the `/company/radar` microservice
 * (bare output or `{ input?, output }`) plus `companyId`, and runs the same DB upsert path as POST /api/geo/radar.
 *
 * Body: `{ companyId: string }` and either `output: RadarOutput` or top-level fields matching RadarOutput.
 * Auth: set GEO_RADAR_WEBHOOK_SECRET and send `Authorization: Bearer <secret>` or `x-geo-radar-secret: <secret>`.
 */
export async function POST(request: Request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const companyId =
      typeof body.companyId === "string" && body.companyId.trim()
        ? body.companyId.trim()
        : typeof body.company_id === "string" && body.company_id.trim()
          ? body.company_id.trim()
          : null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Missing companyId (or company_id)" },
        { status: 400 }
      );
    }

    const { companyId: _c, company_id: _ci, ...radarPayload } = body;
    const radarOutput = parseRadarMicroservicePayload(radarPayload);
    if (!radarOutput) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid radar payload: expected microservice output with metrics and citations array (or output: { ... })",
        },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const { normalizedMetrics } = await applyRadarOutput(prisma, company, radarOutput);

    return NextResponse.json({
      success: true,
      companyId,
      output: {
        topics: radarOutput.topics,
        prompts: radarOutput.prompts,
        citations: radarOutput.citations,
        metrics: normalizedMetrics,
      },
    });
  } catch (e) {
    console.error("[geo/radar/webhook]", e);
    return NextResponse.json(
      { success: false, error: (e as Error).message ?? "Server error" },
      { status: 500 }
    );
  }
}
