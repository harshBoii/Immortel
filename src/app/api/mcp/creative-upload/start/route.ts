import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateMultipartUploadCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { requireValidUploadToken } from "../_token";

export const runtime = "nodejs";
export const maxDuration = 300;

const startSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  fileType: z.string().min(1),
  assetType: z.enum(["VIDEO", "IMAGE", "DOCUMENT"]),
});

export async function POST(request: Request) {
  try {
    const { companyId, allowedTypes } = requireValidUploadToken(request);

    const body = await request.json().catch(() => null);
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const { fileName, fileSize, fileType, assetType } = parsed.data;
    if (allowedTypes && assetType !== "DOCUMENT" && !allowedTypes.includes(assetType)) {
      return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 403 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error("R2_BUCKET_NAME is not configured");

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/claude/${companyId}/${timestamp}-${sanitizedFileName}`.slice(0, 500);

    const partSize = 10 * 1024 * 1024;
    const totalParts = Math.ceil(fileSize / partSize);

    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      Metadata: {
        originalName: sanitizedFileName.slice(0, 255),
        uploaderId: companyId,
        assetType,
        source: "claude_upload",
      },
    });

    const multipartUpload = await r2.send(createCommand);
    const uploadId = multipartUpload.UploadId;
    if (!uploadId) throw new Error("Failed to initialize multipart upload in R2");

    const urls: { partNumber: number; url: string }[] = [];
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });
      const signedUrl = await getSignedUrl(r2, uploadPartCommand, { expiresIn: 3600 });
      urls.push({ partNumber, url: signedUrl });
    }

    const uploadSession = await prisma.uploadSession.create({
      data: {
        uploadId: `${uploadId}`.slice(0, 255),
        key,
        fileName: fileName.slice(0, 255),
        fileSize: BigInt(fileSize),
        fileType: fileType.slice(0, 200),
        totalParts,
        uploadedParts: [],
        status: "IN_PROGRESS",
        campaignId: null,
        uploadedBy: companyId,
        metadata: JSON.stringify({ source: "claude_upload" }),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload start failed";
    const status =
      msg === "MISSING_UPLOAD_TOKEN" || msg === "INVALID_UPLOAD_TOKEN" ? 401 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

