import { NextResponse } from "next/server";
import { MetaGraphError } from "@/lib/meta/graph";
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

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v25.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

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

  const bucket = getMetaBucket().trim() || null;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (file == null || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "file is required (multipart field name: file)" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  const looksImage =
    mime.startsWith("image/") ||
    (file instanceof File && /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i.test(file.name));
  if (!looksImage) {
    return NextResponse.json({ error: "Expected an image file" }, { status: 400 });
  }

  // Read buffer once — file.stream() is a one-shot readable,
  // so we materialise it here and fan out to R2 + Meta in parallel.
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (e) {
    logAdimagesError("read_buffer", e);
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 });
  }

  const baseName = file instanceof File && file.name ? file.name : "image.jpg";
  const key = metaImageKey(loaded.companyId, baseName);

  // R2 needs a ReadableStream when mirroring. Meta form uses a File/Blob so `filename` is set in multipart.
  const r2Stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });

  const metaForm = new FormData();
  const filePart =
    typeof File !== "undefined"
      ? new File([new Uint8Array(buffer)], baseName, { type: mime || "image/jpeg" })
      : new Blob([buffer], { type: mime || "image/jpeg" });
  metaForm.append("filename", filePart);
  // Graph file uploads: put token in the query so the multipart body is only the file (reliable in Node/undici).
  const graphUrl = `${GRAPH_BASE}/${loaded.actId}/adimages?access_token=${encodeURIComponent(loaded.accessToken)}`;

  // Upload to R2 (optional) and Meta in parallel.
  let metaJsonRes: Response;
  try {
    const r2Part =
      bucket
        ? streamToR2({
            body: r2Stream as unknown as StreamBody,
            key,
            contentType: mime,
            bucket,
          })
        : Promise.resolve();
    [metaJsonRes] = await Promise.all([
      fetch(graphUrl, {
        method: "POST",
        body: metaForm,
      }),
      r2Part,
    ]);
  } catch (e) {
    logAdimagesError("parallel_upload", e, { key, actId: loaded.actId, hasBucket: Boolean(bucket) });
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let graphRes: unknown;
  try {
    graphRes = await metaJsonRes.json();
  } catch {
    return NextResponse.json({ error: "Meta returned non-JSON response" }, { status: 502 });
  }

  if (!metaJsonRes.ok || (graphRes as any)?.error) {
    const msg =
      (graphRes as any)?.error?.message ?? `Meta adimages HTTP ${metaJsonRes.status}`;
    logAdimagesError("meta_adimages", new Error(msg), {
      actId: loaded.actId,
      status: metaJsonRes.status,
      graphRes,
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const images = (
    graphRes as {
      images?: Record<
        string,
        { hash?: string; width?: number; height?: number; url?: string; permalink_url?: string }
      >;
    }
  )?.images;
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

  // With R2: presign a GET for our mirror. Without R2: use Meta’s CDN URL from the adimages response.
  let displayUrl: string;
  const r2KeyOut: string | null = bucket ? key : null;
  if (bucket) {
    try {
      const presigned = await getPresignedGetUrl(key, 86400);
      displayUrl = getImageAccessUrl(key, presigned);
    } catch (e) {
      logAdimagesError("presign", e, { key });
      const fromMeta = first?.url || first?.permalink_url;
      if (typeof fromMeta === "string" && fromMeta.length > 0) {
        displayUrl = fromMeta;
      } else {
        const msg = e instanceof Error ? e.message : "Presign failed";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
  } else {
    const fromMeta = first?.url || first?.permalink_url;
    if (typeof fromMeta !== "string" || !fromMeta.length) {
      return NextResponse.json(
        {
          error:
            "R2 is not configured and Meta did not return an image URL in the adimages response. Set R2_META_BUCKET or R2_BUCKET_NAME, or re-connect Meta with permissions that return image URLs.",
        },
        { status: 502 },
      );
    }
    displayUrl = fromMeta;
  }

  const byteSize = typeof (file as Blob).size === "number" ? (file as Blob).size : null;

  try {
    const row = await prisma.metaMedia.create({
      data: {
        metaIntegrationId: loaded.integrationId,
        kind: "image",
        imageHash,
        r2Key: r2KeyOut,
        imageUrl: displayUrl,
        mimeType: mime,
        bytes: byteSize,
        filename: baseName,
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