import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStreamThumbnailUrl } from "@/lib/ingestion";

const generateBodySchema = z.object({
  num_micro_assets: z.number().int().min(1).max(50).optional(),
  duration: z.number().optional(),
  short_type: z.string().optional(),
  model_name: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { assetId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = generateBodySchema.safeParse(body);
    const opts = parsed.success ? parsed.data : {};

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, companyId: session.companyId },
      include: { _count: { select: { intelligence: true } } },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    const hasIntelligence = (asset._count?.intelligence ?? 0) > 0;
    const intelligenceReady = asset.intelligenceStatus === "READY" || hasIntelligence;
    if (!intelligenceReady) {
      return NextResponse.json(
        { success: false, error: "Process intelligence first. Intelligence is not ready for this asset." },
        { status: 403 }
      );
    }

    const baseUrl = process.env.PROCESSING_API_BASE ?? process.env.CLIPFOX_PROCESSING_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "Processing API not configured" },
        { status: 503 }
      );
    }

    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/generate-micro-assets/${assetId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: opts.model_name ?? "gpt-4o",
          num_micro_assets: opts.num_micro_assets ?? 10,
          duration: opts.duration ?? 45,
          short_type: opts.short_type ?? "CASUAL",
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[GENERATE-MICRO-ASSETS] Python API error:", res.status, text);
      return NextResponse.json(
        { success: false, error: text || "Micro-asset generation failed" },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const data = await res.json();
    const microAssetsRaw = data.micro_assets?.microAssets ?? data.microAssets ?? data.micro_assets ?? [];
    const list = Array.isArray(microAssetsRaw) ? microAssetsRaw : [];

    const companyId = session.companyId;
    const created: string[] = [];
    const validShortTypes = ["EDUCATIONAL", "FLASHY", "CASUAL", "STORY", "PROMOTIONAL"] as const;

    for (const item of list) {
      const startTime = Number(item.startTime ?? item.startSeconds ?? 0);
      const endTime = Number(item.endTime ?? item.endSeconds ?? startTime + 45);
      const title = String(item.title ?? item.label ?? `Clip ${startTime}s`);
      const hook = item.hook ?? item.insight ?? item.description ?? null;
      const thumbnail =
        asset.streamId && asset.assetType === "VIDEO"
          ? buildStreamThumbnailUrl(asset.streamId, startTime)
          : null;
      const rawType = (item.shortType ?? item.short_type ?? "CASUAL").toUpperCase();
      const shortType = validShortTypes.includes(rawType as typeof validShortTypes[number])
        ? (rawType as typeof validShortTypes[number])
        : "CASUAL";

      const micro = await prisma.microAsset.create({
        data: {
          assetId,
          companyId,
          title,
          startTime,
          endTime,
          hook,
          thumbnail,
          status: "DRAFT",
          shortType,
          aiGenerated: true,
          confidence: item.confidence ?? null,
        },
      });
      created.push(micro.id);
    }

    return NextResponse.json({
      success: true,
      micro_assets_count: created.length,
      ids: created,
    });
  } catch (error) {
    console.error("[GENERATE-MICRO-ASSETS]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
