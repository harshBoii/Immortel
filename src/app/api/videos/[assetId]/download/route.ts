import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePresignedUrl } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    return NextResponse.json(
      { success: false, error: "Asset not found" },
      { status: 404 }
    );
  }

  const url = await generatePresignedUrl(asset.r2Key, asset.r2Bucket, 3600);
  return NextResponse.redirect(url);
}

