import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { getMetaBucket } from "@/lib/cloudfare";
import { metaVideoKey } from "@/lib/cloudfare";
import { streamToR2, type StreamBody } from "@/lib/cloudfare";

export const runtime = "nodejs";
export const maxDuration = 300;

const GRAPH_BASE = "https://graph.facebook.com/v25.0";

type PageWithToken = { id: string; name: string; access_token: string };

async function resolvePageAccessToken(userToken: string): Promise<string> {
  try {
    const url = new URL(`${GRAPH_BASE}/me/accounts`);
    url.searchParams.set("fields", "id,name,access_token");
    url.searchParams.set("limit", "10");
    url.searchParams.set("access_token", userToken);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return userToken;
    const json = (await res.json()) as { data?: PageWithToken[]; error?: { message?: string } };
    if (json.error) return userToken;
    const pages = json.data ?? [];
    const pageToken = pages[0]?.access_token;
    return pageToken || userToken;
  } catch {
    return userToken;
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx]!;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function fetchMetaVideoSource(opts: { videoId: string; accessToken: string }) {
  const url = new URL(`${GRAPH_BASE}/${opts.videoId}`);
  url.searchParams.set("fields", "source,picture,title");
  url.searchParams.set("access_token", opts.accessToken);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Meta video API HTTP ${res.status} for videoId ${opts.videoId}`);
  }
  const json = (await res.json()) as { source?: string };
  if (!json.source) throw new Error(`Meta video ${opts.videoId} missing source`);
  return json.source;
}

type BackfillRow = { id: string; videoId: string | null };

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ ok: false, error: "Meta not connected" }, { status: 401 });
  }

  const bucket = getMetaBucket();
  if (!bucket) {
    return NextResponse.json(
      { ok: false, error: "R2_META_BUCKET or R2_BUCKET_NAME must be set" },
      { status: 500 },
    );
  }

  const pageToken = await resolvePageAccessToken(loaded.accessToken);

  let scanned = 0;
  let updated = 0;
  const failed: Array<{ metaMediaId: string; videoId: string; error: string }> = [];

  // Page through all missing r2Key rows to avoid loading everything in memory.
  let cursorId: string | null = null;
  const pageSize = 100;
  const concurrency = 3;

  for (;;) {
    const rows: BackfillRow[] = await prisma.metaMedia.findMany({
      where: {
        metaIntegrationId: loaded.integrationId,
        kind: "video",
        r2Key: null,
        videoId: { not: null },
      },
      ...(cursorId
        ? { cursor: { id: cursorId }, skip: 1 }
        : {}),
      take: pageSize,
      orderBy: { id: "asc" },
      select: { id: true, videoId: true },
    });

    if (rows.length === 0) break;
    scanned += rows.length;
    cursorId = rows[rows.length - 1]!.id;

    await runWithConcurrency<BackfillRow>(rows, concurrency, async (row) => {
      try {
        const videoId = row.videoId!;
        const source = await fetchMetaVideoSource({ videoId, accessToken: pageToken });
        const dl = await fetch(source, { cache: "no-store" });
        if (!dl.ok || !dl.body) {
          throw new Error(`meta source download HTTP ${dl.status}`);
        }
        const mimeType = dl.headers.get("content-type") || "video/mp4";
        const contentLengthHeader = dl.headers.get("content-length");
        const bytes = contentLengthHeader ? Number(contentLengthHeader) : null;
        const key = metaVideoKey(loaded.companyId, videoId);

        await streamToR2({
          body: dl.body as unknown as StreamBody,
          key,
          contentType: mimeType,
          bucket,
        });

        await prisma.metaMedia.update({
          where: { id: row.id },
          data: {
            r2Key: key,
            mimeType,
            bytes: Number.isFinite(bytes as any) ? (bytes as any) : null,
            status: "ready",
          },
        });
        updated += 1;
      } catch (e) {
        failed.push({
          metaMediaId: row.id,
          videoId: row.videoId ?? "unknown",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
  }

  const remaining = await prisma.metaMedia.count({
    where: {
      metaIntegrationId: loaded.integrationId,
      kind: "video",
      r2Key: null,
      videoId: { not: null },
    },
  });

  return NextResponse.json({
    ok: true,
    scanned,
    updated,
    failedCount: failed.length,
    failed: failed.slice(0, 50),
    remaining,
    note:
      remaining > 0
        ? "Re-run this endpoint to continue backfilling remaining videos."
        : "All video MetaMedia rows have r2Key populated.",
  });
}

