import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bulkIndexProducts, bulkIndexWooCommerceProducts } from "@/lib/productsIndex";
import { resolveCompany } from "@/lib/mcpCompanyResolver";

export async function POST(request: Request) {
  let body: { companyId?: string; companyName?: string; secret?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  // Reindex is a privileged operation — require the REINDEX_SECRET env var if set
  const reindexSecret = process.env.REINDEX_SECRET;
  if (reindexSecret && body?.secret !== reindexSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing or invalid secret" },
      { status: 401 }
    );
  }

  if (!body?.companyId && !body?.companyName) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide `companyId` or `companyName` in the request body",
      },
      { status: 400 }
    );
  }

  const company = await resolveCompany({
    companyId: body.companyId,
    companyName: body.companyName,
  });

  if (!company) {
    return NextResponse.json(
      { success: false, error: "Company not found" },
      { status: 404 }
    );
  }

  const [shopifyProducts, wooProducts] = await Promise.all([
    prisma.shopifyProduct.findMany({
      where: { companyId: company.id },
    }),
    prisma.wooCommerceProduct.findMany({
      where: { companyId: company.id },
    }),
  ]);

  await Promise.all([
    bulkIndexProducts(shopifyProducts),
    bulkIndexWooCommerceProducts(wooProducts),
  ]);

  return NextResponse.json({
    success: true,
    company: { id: company.id, name: company.name, slug: company.slug },
    indexed: {
      shopify: shopifyProducts.length,
      woocommerce: wooProducts.length,
      total: shopifyProducts.length + wooProducts.length,
    },
  });
}
