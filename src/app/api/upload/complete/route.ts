import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CompleteMultipartUploadCommand,
  CompletedPart,
} from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { verifyJWT, getSession } from "@/lib/auth";
import { enqueueAssetStreamUpload } from "@/lib/stream";

const uploadCompleteSchema = z.object({
  sessionId: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1),
      })
    )
    .min(1),
  assetType: z.enum(["VIDEO", "IMAGE", "DOCUMENT"]),
  companyId: z.string().min(1),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
});

export async function POST(request: Request) {
  try {
    const { employee, error: authError } = await verifyJWT(request);
    if (authError) {
      const session = await getSession();
      if (!session?.companyId) {
        console.error("[UPLOAD COMPLETE] Auth failed:", authError);
        return NextResponse.json(
          { success: false, error: authError },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const parsed = uploadCompleteSchema.safeParse(body);
    if (!parsed.success) {
      console.error(
        "[UPLOAD COMPLETE] Validation failed:",
        parsed.error.flatten()
      );
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      sessionId,
      uploadId,
      parts,
      assetType,
      companyId,
      priority = "NORMAL",
    } = parsed.data;

    const session = await prisma.uploadSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Upload session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, error: "Upload session is not in progress" },
        { status: 400 }
      );
    }

    // Note: uploadId is stored in the DB with a length limit (255 chars) in UploadSession.
    // When creating the session we clamp the stored uploadId to that limit, so here we
    // validate by ensuring the incoming uploadId starts with the stored prefix.
    if (!uploadId.startsWith(session.uploadId)) {
      return NextResponse.json(
        { success: false, error: "uploadId does not match session" },
        { status: 400 }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Upload session has expired" },
        { status: 400 }
      );
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }

    const completedParts: CompletedPart[] = parts.map((p) => ({
      PartNumber: p.partNumber,
      ETag: p.etag,
    }));

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: session.key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: completedParts,
      },
    });

    await r2.send(completeCommand);

    const metadataJson =
      session.metadata && session.metadata.length > 0
        ? JSON.parse(session.metadata)
        : {};

    const isVideo = assetType === "VIDEO";

    const asset = await prisma.asset.create({
      data: {
        assetType,
        title:
          (metadataJson.title as string | undefined) ??
          session.fileName.replace(/\.[^/.]+$/, ""),
        filename: session.fileName,
        originalSize: session.fileSize,
        status: isVideo ? "PROCESSING" : "READY",
        r2Key: session.key,
        r2Bucket: bucket,
        mimeType: session.fileType,
        companyId,
        metadata: {
          uploadSessionId: session.id,
          ...metadataJson,
        },
        ...(isVideo && { intelligenceStatus: "PROCESSING" }),
      },
    });

    const updatedSession = await prisma.uploadSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        uploadedParts: parts.map((p) => p.partNumber),
      },
    });

    console.log(
      `✅ [UPLOAD COMPLETE] Session ${updatedSession.id} finalized. Asset ${asset.id} created.`
    );

    let queue: Awaited<ReturnType<typeof enqueueAssetStreamUpload>> | null = null;
    if (isVideo) {
      // For videos, enqueue for Cloudflare Stream processing
      queue = await enqueueAssetStreamUpload(asset.id, priority);

      // Trigger external pipeline (process-from-api) in background; do not await
      const baseUrl = process.env.PROCESSING_API_BASE ?? process.env.CLIPFOX_PROCESSING_URL;
      const appUrl =
        process.env.NEXT_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ??
        "http://localhost:3000";

      if (baseUrl) {
        const api_url = `${appUrl.replace(/\/$/, "")}/api/videos/${asset.id}/download`;
        fetch(`${baseUrl.replace(/\/$/, "")}/process-from-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_url,
            asset_Id: asset.id,
            asset_type: "VIDEO",
            scene_preset: "long_video",
            max_scene_duration: 60.0,
            whisper_model_size: "large-v3",
            yolo_model_size: "yolov8n.pt",
            yolo_confidence: 0.25,
            device: "auto",
            blur_threshold: 100.0,
            search_window: 0.5,
            adaptive_keyframes: true,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              console.error("[UPLOAD COMPLETE] process-from-api failed:", res.status, text);
            }
          })
          .catch((err) => console.error("[UPLOAD COMPLETE] process-from-api error:", err));
      }
    }

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      assetType,
      uploadSessionId: session.id,
      queuedForStream: isVideo,
      ...(queue
        ? {
            queueId: queue.id,
            queueStatus: queue.status,
            priority: queue.priority,
          }
        : {}),
    });
  } catch (error) {
    console.error("[UPLOAD COMPLETE ERROR]", error);
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: "Upload completion failed",
        message:
          process.env.NODE_ENV === "development" ? err.message : "An error occurred",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
      { status: 500 }
    );
  }
}

