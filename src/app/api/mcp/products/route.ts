import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200
      ? pageSize
      : 50;

  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const [products, total] = await Promise.all([
    (prisma as any).shopifyProduct.findMany({
      where: {
        companyId: session.companyId,
      },
      orderBy: {
        shopifyUpdatedAt: "desc",
      },
      skip,
      take,
    }),
    (prisma as any).shopifyProduct.count({
      where: {
        companyId: session.companyId,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: products,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
    },
  });
}

