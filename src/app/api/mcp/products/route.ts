import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompany } from "@/lib/mcpCompanyResolver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const companyId = searchParams.get("companyId") ?? undefined;
  const companyName = searchParams.get("companyName") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  if (!companyId && !companyName) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide `companyId` or `companyName` as a query parameter",
      },
      { status: 400 }
    );
  }

  const company = await resolveCompany({ companyId, companyName });
  if (!company) {
    return NextResponse.json(
      { success: false, error: "Company not found" },
      { status: 404 }
    );
  }

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200
      ? pageSize
      : 50;

  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const [products, total] = await Promise.all([
    (prisma as any).shopifyProduct.findMany({
      where: { companyId: company.id },
      orderBy: { shopifyUpdatedAt: "desc" },
      skip,
      take,
    }),
    (prisma as any).shopifyProduct.count({
      where: { companyId: company.id },
    }),
  ]);

  const formatted = products.map((p: any) => ({
    ...p,
    featuredImage: p.featuredImageUrl
      ? {
          url: p.featuredImageUrl,
          altText: p.featuredImageAltText,
          width: p.featuredImageWidth,
          height: p.featuredImageHeight,
        }
      : null,
    featuredImageUrl: undefined,
    featuredImageAltText: undefined,
    featuredImageWidth: undefined,
    featuredImageHeight: undefined,
  }));

  return NextResponse.json({
    success: true,
    company: { id: company.id, name: company.name, slug: company.slug },
    data: formatted,
    pagination: { page: safePage, pageSize: safePageSize, total },
  });
}
