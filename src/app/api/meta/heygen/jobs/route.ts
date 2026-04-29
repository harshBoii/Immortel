import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanySession } from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const session = await requireCompanySession();

    const rows = await (prisma as any).videoGenerationJob.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      ok: true,
      items: rows.map((r: any) => ({
        id: r.id,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        heygenStatus: r.heygenStatus,
        progressMessage: r.progressMessage ?? null,
        heygenVideoId: r.heygenVideoId ?? null,
        assetId: r.assetId ?? null,
        downloadUrl: r.downloadUrl ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        playbackUrl: r.playbackUrl ?? null,
        metadata: r.metadata ?? {},
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list jobs";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

