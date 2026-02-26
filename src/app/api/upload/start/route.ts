import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateMultipartUploadCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { verifyJWT, getSession } from "@/lib/auth";
import { sanitizeMetadata } from "@/lib/upload";

const uploadStartSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  fileType: z.string().min(1),
  assetType: z.enum(["VIDEO", "IMAGE", "DOCUMENT"]),
  campaignId: z.string().optional(),
  stepId: z.string().optional(),
  stepName: z.string().optional(),
  metadata: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    let userId: string | null = null;
    const { employee, error: authError } = await verifyJWT(request);
    if (authError) {
      const session = await getSession();
      if (session?.companyId) {
        userId = session.companyId;
      } else {
        console.error("[UPLOAD START] Auth failed:", authError);
        return NextResponse.json(
          { success: false, error: authError },
          { status: 401 }
        );
      }
    } else {
      userId = employee!.id;
    }
    const user = { id: userId!, email: (employee as { email?: string })?.email ?? "" };

    const body = await request.json();
    console.log("[UPLOAD START] User:", user.email, "Body:", body);

    const parsed = uploadStartSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[UPLOAD START] Validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      fileName,
      fileSize,
      fileType,
      assetType,
      campaignId,
      stepId,
      stepName,
      metadata,
    } = parsed.data;

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${campaignId ?? "uncategorized"}/${timestamp}-${sanitizedFileName}`;

    const partSize = 10 * 1024 * 1024;
    const totalParts = Math.ceil(fileSize / partSize);

    console.log(`[UPLOAD START] File: ${fileName}`);
    console.log(`[UPLOAD START] Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[UPLOAD START] Parts: ${totalParts}`);

    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      Metadata: {
        originalName: sanitizeMetadata(fileName),
        campaignId: campaignId ?? "",
        uploaderId: user.id,
        uploaderEmail: user.email,
        assetType,
        ...(metadata?.title && { title: sanitizeMetadata(metadata.title) }),
        ...(metadata?.description && {
          description: sanitizeMetadata(metadata.description),
        }),
      },
    });

    const multipartUpload = await r2.send(createCommand);
    const uploadId = multipartUpload.UploadId;

    if (!uploadId) {
      throw new Error("Failed to initialize multipart upload in R2");
    }

    console.log(`[UPLOAD START] R2 Upload ID: ${uploadId}`);

    const urls: { partNumber: number; url: string }[] = [];
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      const signedUrl = await getSignedUrl(r2, uploadPartCommand, {
        expiresIn: 3600,
      });

      urls.push({
        partNumber,
        url: signedUrl,
      });
    }

    console.log(`[UPLOAD START] Generated ${urls.length} presigned URLs`);

    // Clamp values to column sizes in UploadSession model to avoid P2000 errors
    const safeUploadId = `${uploadId}`.slice(0, 255);
    const safeKey = `${key}`.slice(0, 500);
    const safeFileName = fileName.slice(0, 255);
    const safeFileType = fileType.slice(0, 200);

    const uploadSession = await prisma.uploadSession.create({
      data: {
        uploadId: safeUploadId,
        key: safeKey,
        fileName: safeFileName,
        fileSize: BigInt(fileSize),
        fileType: safeFileType,
        totalParts,
        uploadedParts: [],
        status: "IN_PROGRESS",
        campaignId: campaignId ?? null,
        uploadedBy: user.id,
        metadata: JSON.stringify({
          ...(stepId && { stepId }),
          ...(stepName && { stepName }),
        }),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    console.log(`✅ [UPLOAD START] Session created: ${uploadSession.id}`);

    return NextResponse.json({
      success: true,
      upload: {
        uploadId,
        key,
        partSize,
        totalParts,
        sessionId: uploadSession.id,
        assetType,
      },
      urls,
      message: "Upload initialized successfully",
    });
  } catch (error) {
    console.error("❌ [UPLOAD START ERROR]", error);

    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: "Upload initialization failed",
        message:
          process.env.NODE_ENV === "development" ? err.message : "An error occurred",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
      { status: 500 }
    );
  }
}

