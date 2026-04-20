import { NextResponse } from "next/server";
import { MetaGraphError, graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import {
  getImageAccessUrl,
  getMetaBucket,
  getPresignedGetUrl,
  metaImageKey,
  StreamBody,
  streamToR2,
} from "@/lib/cloudfare";

export const runtime = "nodejs";
export const maxDuration = 300;

function logAdimagesError(stage: string, err: unknown, extra?: Record<string, unknown>) {
  const base =
    err instanceof Error
      ? { stage, message: err.message, stack: err.stack, name: err.name }
      : { stage, err: String(err) };
  if (err instanceof MetaGraphError) {
    Object.assign(base, { graphStatus: err.status, graphPayload: err.payload });
  }
  console.error("[api/meta/adimages]", { ...base, ...extra });
}

export async function GET(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  const rows = await prisma.metaMedia.findMany({
    where: { metaIntegrationId: loaded.integrationId, kind: "image" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const bucket = getMetaBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "R2_META_BUCKET or R2_BUCKET_NAME must be set" },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Expected an image file" }, { status: 400 });
  }

  const key = metaImageKey(loaded.companyId, file.name || "image");
  try {
    await streamToR2({
      body: file.stream() as unknown as StreamBody,
      key,
      contentType: mime,
      bucket,
    });
  } catch (e) {
    logAdimagesError("r2_upload", e, { key, bucket });
    const msg = e instanceof Error ? e.message : "R2 upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let presigned: string;
  try {
    presigned = await getPresignedGetUrl(key, 86400);
  } catch (e) {
    logAdimagesError("presign", e, { key, bucket });
    const msg = e instanceof Error ? e.message : "Presign failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const displayUrl = getImageAccessUrl(key, presigned);

  let graphRes: unknown;
  try {
    graphRes = await graphPost(
      `${loaded.actId}/adimages`,
      {
        url: displayUrl,
      },
      { accessToken: loaded.accessToken },
    );
  } catch (e) {
    logAdimagesError("meta_adimages", e, { actId: loaded.actId, displayUrl: displayUrl.slice(0, 120) });
    const msg = e instanceof Error ? e.message : "Meta adimages failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const images = (graphRes as { images?: Record<string, { hash?: string; width?: number; height?: number }> })
    ?.images;
  const first = images ? Object.values(images)[0] : undefined;
  const imageHash = first?.hash;
  if (!imageHash) {
    logAdimagesError("meta_no_hash", new Error("missing image hash"), {
      graphRes,
      actId: loaded.actId,
    });
    return NextResponse.json(
      { error: "Meta did not return an image hash", detail: graphRes },
      { status: 502 },
    );
  }

  try {
    const row = await prisma.metaMedia.create({
      data: {
        metaIntegrationId: loaded.integrationId,
        kind: "image",
        imageHash,
        r2Key: key,
        imageUrl: displayUrl,
        mimeType: mime,
        bytes: file.size || null,
        width: first?.width ?? null,
        height: first?.height ?? null,
        status: "ready",
      },
    });

    return NextResponse.json({
      id: row.id,
      imageHash: row.imageHash,
      imageUrl: row.imageUrl,
    });
  } catch (e) {
    logAdimagesError("prisma_create", e, { imageHash, integrationId: loaded.integrationId });
    const msg = e instanceof Error ? e.message : "Failed to save media row";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
