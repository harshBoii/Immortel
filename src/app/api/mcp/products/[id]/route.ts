import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompany } from "@/lib/mcpCompanyResolver";
import { getProxiedImageUrl } from "@/lib/imageProxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);

  const companyId = searchParams.get("companyId") ?? undefined;
  const companyName = searchParams.get("companyName") ?? undefined;

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

  const product = await (prisma as any).shopifyProduct.findFirst({
    where: { id, companyId: company.id },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  const proxiedUrl = getProxiedImageUrl((product as any).featuredImageUrl);

  const formatted: any = {
    ...product,
    featuredImage: proxiedUrl
      ? {
          url: proxiedUrl,
          altText: (product as any).featuredImageAltText,
          width: (product as any).featuredImageWidth,
          height: (product as any).featuredImageHeight,
        }
      : null,
    featuredImageUrl: undefined,
    featuredImageAltText: undefined,
    featuredImageWidth: undefined,
    featuredImageHeight: undefined,
  };

  return NextResponse.json({
    success: true,
    company: { id: company.id, name: company.name, slug: company.slug },
    data: formatted,
  });
}
