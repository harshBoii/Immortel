import { NextResponse } from "next/server";
import { z } from "zod";
import { CompleteMultipartUploadCommand, type CompletedPart } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { enqueueAssetStreamUpload } from "@/lib/stream";
import { requireValidUploadToken } from "../_token";

export const runtime = "nodejs";
export const maxDuration = 300;

const completeSchema = z.object({
  sessionId: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1),
      }),
    )
    .min(1),
  assetType: z.enum(["VIDEO", "IMAGE", "DOCUMENT"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
});

export async function POST(request: Request) {
  try {
    const { companyId, allowedTypes } = requireValidUploadToken(request);

    const body = await request.json().catch(() => null);
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const { sessionId, uploadId, parts, assetType, priority = "NORMAL" } = parsed.data;
    if (allowedTypes && assetType !== "DOCUMENT" && !allowedTypes.includes(assetType)) {
      return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 403 });
    }

    const session = await prisma.uploadSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ success: false, error: "Upload session not found" }, { status: 404 });
    }
    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json({ success: false, error: "Upload session is not in progress" }, { status: 400 });
    }
    if (!uploadId.startsWith(session.uploadId)) {
      return NextResponse.json({ success: false, error: "uploadId does not match session" }, { status: 400 });
    }
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Upload session has expired" }, { status: 400 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error("R2_BUCKET_NAME is not configured");

    const completedParts: CompletedPart[] = parts.map((p) => ({
      PartNumber: p.partNumber,
      ETag: p.etag,
    }));

    await r2.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: session.key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completedParts },
      }),
    );

    const isVideo = assetType === "VIDEO";
    const asset = await prisma.asset.create({
      data: {
        assetType,
        title: session.fileName.replace(/\.[^/.]+$/, ""),
        filename: session.fileName,
        originalSize: session.fileSize,
        status: isVideo ? "PROCESSING" : "READY",
        r2Key: session.key,
        r2Bucket: bucket,
        mimeType: session.fileType,
        companyId,
        metadata: {
          uploadSessionId: session.id,
          source: "claude_upload",
        },
        ...(isVideo ? { intelligenceStatus: "PROCESSING" } : {}),
      },
      select: { id: true },
    });

    await prisma.uploadSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", uploadedParts: parts.map((p) => p.partNumber) },
    });

    let queue: Awaited<ReturnType<typeof enqueueAssetStreamUpload>> | null = null;
    if (isVideo) {
      queue = await enqueueAssetStreamUpload(asset.id, priority);
    }

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      queuedForStream: isVideo,
      ...(queue ? { queueId: queue.id, queueStatus: queue.status } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload complete failed";
    const status =
      msg === "MISSING_UPLOAD_TOKEN" || msg === "INVALID_UPLOAD_TOKEN" ? 401 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

