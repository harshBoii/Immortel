import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import { streamToR2 } from "@/lib/cloudfare/r2/upload";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  const rows = await prisma.metaMedia.findMany({
    where: { metaIntegrationId: loaded.integrationId, kind: "video" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  console.log("[api/meta/advideos][POST] request");
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    console.log("[api/meta/advideos][POST] response", { status: 401, error: "Meta not connected" });
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    console.log("[api/meta/advideos][POST] response", { status: 400, error: "Invalid multipart body" });
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const isBlob =
    file != null &&
    typeof file === "object" &&
    typeof (file as Blob).arrayBuffer === "function";
  if (!isBlob) {
    console.log("[api/meta/advideos][POST] response", {
      status: 400,
      error: "file is required (multipart field name: file)",
    });
    return NextResponse.json(
      { error: "file is required (multipart field name: file)" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("video/")) {
    console.log("[api/meta/advideos][POST] response", { status: 400, error: "Expected a video file", mime });
    return NextResponse.json({ error: "Expected a video file" }, { status: 400 });
  }

  try {
    console.log("[api/meta/advideos][POST] r2_upload_start", {
      integrationId: loaded.integrationId,
      filename: (file as any)?.name ?? null,
      bytes: (file as any)?.size ?? null,
      mime,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload start failed";
    console.log("[api/meta/advideos][POST] response", { status: 500, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    console.log("[api/meta/advideos][POST] response", { status: 500, error: "R2_BUCKET_NAME is not configured" });
    return NextResponse.json({ error: "R2_BUCKET_NAME is not configured" }, { status: 500 });
  }
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    console.log("[api/meta/advideos][POST] response", { status: 500, error: "R2_PUBLIC_BASE_URL is not configured" });
    return NextResponse.json({ error: "R2_PUBLIC_BASE_URL is not configured" }, { status: 500 });
  }

  const timestamp = Date.now();
  const originalName = (typeof (file as any)?.name === "string" && (file as any).name) || "video.mp4";
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 200);
  const r2Key = `uploads/meta/${loaded.integrationId}/${timestamp}-${safeName}`.slice(0, 500);

  try {
    await streamToR2({
      body: file as Blob,
      key: r2Key,
      contentType: mime,
      bucket,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "R2 upload failed";
    console.log("[api/meta/advideos][POST] response", { status: 500, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const publicUrl = `${base}/${r2Key.replace(/^\/+/, "")}`;
  console.log("[api/meta/advideos][POST] r2_upload_done", { r2Key, publicUrl });

  let videoId: string | null = null;
  let status: "ready" | "processing" = "ready";
  try {
    const adv = (await graphPost(
      `${loaded.actId}/advideos`,
      { file_url: publicUrl },
      { accessToken: loaded.accessToken },
    )) as { id?: string };
    videoId = adv.id ?? null;
    console.log("[api/meta/advideos][POST] meta_response", { ok: true, videoId });
  } catch (e) {
    status = "processing";
    const msg = e instanceof Error ? e.message : "advideos create failed";
    const metaPayload = (e as any)?.payload ?? null;
    console.log("[api/meta/advideos][POST] meta_response", { ok: false, error: msg, metaPayload });
  }

  const bytes = (file as any)?.size ?? null;

  const row = videoId
    ? await prisma.metaMedia.upsert({
        where: {
          metaIntegrationId_videoId: { metaIntegrationId: loaded.integrationId, videoId },
        },
        create: {
          metaIntegrationId: loaded.integrationId,
          kind: "video",
          videoId,
          videoUrl: publicUrl,
          videoStreamId: null,
          thumbnailUrl: null,
          r2Key,
          filename: originalName || null,
          mimeType: mime,
          bytes,
          durationMs: null,
          status,
        },
        update: {
          videoUrl: publicUrl,
          r2Key,
          filename: originalName || null,
          mimeType: mime,
          bytes,
          status,
        },
      })
    : await prisma.metaMedia.create({
        data: {
          metaIntegrationId: loaded.integrationId,
          kind: "video",
          videoId: null,
          videoUrl: publicUrl,
          videoStreamId: null,
          thumbnailUrl: null,
          r2Key,
          filename: originalName || null,
          mimeType: mime,
          bytes,
          durationMs: null,
          status,
        },
      });

  console.log("[api/meta/advideos][POST] db_write", {
    ok: true,
    operation: videoId ? "upsert(metaIntegrationId_videoId)" : "create(videoId=null)",
    metaMediaDbId: row.id,
    videoId: row.videoId,
    r2Key: row.r2Key,
    status: row.status,
  });

  console.log("[api/meta/advideos][POST] response", {
    httpStatus: 200,
    metaMediaDbId: row.id,
    videoId: row.videoId,
    r2Key: row.r2Key,
    status: row.status,
  });

  return NextResponse.json({
    id: row.id,
    videoId: row.videoId,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    status: row.status,
  });
}
