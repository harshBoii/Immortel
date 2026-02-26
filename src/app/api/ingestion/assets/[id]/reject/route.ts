import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get("viewMode") ?? "raw";

    if (viewMode === "reels") {
      const micro = await prisma.microAsset.findFirst({
        where: { id, companyId: session.companyId },
      });
      if (!micro) {
        return NextResponse.json(
          { success: false, error: "Micro asset not found" },
          { status: 404 }
        );
      }
      await prisma.microAsset.update({
        where: { id },
        data: { is_approved: false, approved_at: null },
      });
      return NextResponse.json({ success: true });
    }

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }
    const metadata = (asset.metadata as Record<string, unknown>) ?? {};
    await prisma.asset.update({
      where: { id },
      data: { metadata: { ...metadata, approved: false } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INGESTION REJECT]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
