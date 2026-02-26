import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStreamThumbnailUrl } from "@/lib/ingestion";

export type ViewMode = "raw" | "reels" | "webinars";
export type SortBy = "time" | "size";
export type SortOrder = "asc" | "desc";

export interface AssetCardData {
  id: string;
  title: string;
  filename: string;
  assetType: "VIDEO" | "IMAGE" | "DOCUMENT";
  status: string;
  thumbnailUrl?: string | null;
  approved?: boolean | null;
  duration?: number | null;
  resolution?: string | null;
  createdAt?: string;
  hasIntelligence?: boolean;
  intelligenceStatus?: string | null;
}

export interface ReelCardData {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  assetId: string;
  parentTitle: string;
  status: string;
  thumbnailUrl: string | null;
  approved?: boolean | null;
  createdAt?: string;
}

export interface WebinarCardData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  isRecurring: boolean;
  assetId?: string | null;
  assetTitle?: string | null;
  createdAt?: string;
}

function parseQuery(
  request: Request
): { viewMode: ViewMode; sortBy: SortBy; sortOrder: SortOrder; search: string } {
  const { searchParams } = new URL(request.url);
  const viewMode = (searchParams.get("viewMode") ?? "raw") as ViewMode;
  const sortBy = (searchParams.get("sortBy") ?? "time") as SortBy;
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as SortOrder;
  const search = searchParams.get("search") ?? "";
  return { viewMode, sortBy, sortOrder, search };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const companyId = session.companyId;
    const { viewMode, sortBy, sortOrder, search } = parseQuery(request);

    if (viewMode === "raw") {
      const orderBy =
        sortBy === "size"
          ? [{ originalSize: sortOrder as "asc" | "desc" } as const]
          : [{ createdAt: sortOrder as "asc" | "desc" } as const];

      const assets = await prisma.asset.findMany({
        where: {
          companyId,
          ...(search.trim()
            ? {
                OR: [
                  { title: { contains: search.trim(), mode: "insensitive" } },
                  { filename: { contains: search.trim(), mode: "insensitive" } },
                  { tags: { has: search.trim() } },
                ],
              }
            : {}),
        },
        orderBy,
        include: {
          _count: { select: { intelligence: true } },
        },
      });

      const list: AssetCardData[] = assets.map((a: any) => {
        const meta = (a.metadata as Record<string, unknown>) ?? {};
        return {
          id: a.id,
          title: a.title,
          filename: a.filename,
          assetType: a.assetType,
          status: a.status,
          thumbnailUrl: a.thumbnailUrl,
          approved: meta.approved as boolean | undefined ?? null,
          duration:
            a.duration != null && typeof a.duration === "number" && a.duration >= 0
              ? a.duration
              : null,
          resolution: a.resolution ?? null,
          createdAt: a.createdAt.toISOString(),
          hasIntelligence: (a._count?.intelligence ?? 0) > 0,
          intelligenceStatus: a.intelligenceStatus ?? null,
        };
      });
      return NextResponse.json({ success: true, data: list });
    }

    if (viewMode === "reels") {
      const orderBy =
        sortBy === "size"
          ? [{ endTime: sortOrder as "asc" | "desc" } as const]
          : [{ createdAt: sortOrder as "asc" | "desc" } as const];

      const microAssets = await prisma.microAsset.findMany({
        where: {
          companyId,
          ...(search.trim()
            ? {
                OR: [
                  { title: { contains: search.trim(), mode: "insensitive" } },
                  { description: { contains: search.trim(), mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy,
        include: { asset: true },
      });

      const list: ReelCardData[] = microAssets.map((m: any) => {
        const parent = m.asset;
        const thumbnailUrl =
          parent?.streamId && parent.assetType === "VIDEO"
            ? buildStreamThumbnailUrl(parent.streamId, m.startTime)
            : parent?.thumbnailUrl ?? null;
        return {
          id: m.id,
          title: m.title,
          startTime: m.startTime,
          endTime: m.endTime,
          assetId: m.assetId,
          parentTitle: parent?.title ?? "",
          status: m.status,
          thumbnailUrl,
          approved: m.is_approved,
          createdAt: m.createdAt.toISOString(),
          hook: m.hook ?? null,
          description: m.description ?? null,
          category: m.category ?? null,
          tags: m.tags ?? [],
          shortType: m.shortType ?? null,
          parentStreamId: parent?.streamId ?? null,
        };
      });
      return NextResponse.json({ success: true, data: list });
    }

    if (viewMode === "webinars") {
      const orderBy =
        sortBy === "size"
          ? [{ scheduledAt: sortOrder as "asc" | "desc" } as const]
          : [{ createdAt: sortOrder as "asc" | "desc" } as const];

      const webinars = await prisma.webinar.findMany({
        where: {
          companyId,
          ...(search.trim()
            ? {
                OR: [
                  { title: { contains: search.trim(), mode: "insensitive" } },
                  { description: { contains: search.trim(), mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy,
        include: { asset: true },
      });

      const list: WebinarCardData[] = webinars.map((w) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        status: w.status,
        scheduledAt: w.scheduledAt?.toISOString() ?? null,
        isRecurring: w.isRecurring,
        assetId: w.assetId,
        assetTitle: w.asset?.title ?? null,
        createdAt: w.createdAt.toISOString(),
      }));
      return NextResponse.json({ success: true, data: list });
    }

    return NextResponse.json(
      { success: false, error: "Invalid viewMode" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[INGESTION ASSETS]", error);
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: err.message ?? "Failed to fetch ingestion assets",
      },
      { status: 500 }
    );
  }
}
