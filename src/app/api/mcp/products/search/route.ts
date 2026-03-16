import { NextResponse } from "next/server";
import { resolveCompany } from "@/lib/mcpCompanyResolver";
import { searchProductsInElasticsearch } from "@/lib/productSearch";

type SearchBody = {
  query: string;
  companyId?: string;
  companyName?: string;
  page?: number;
  pageSize?: number;
  status?: string[];
  priceMin?: number;
  priceMax?: number;
  inventoryMin?: number;
  inventoryMax?: number;
};

export async function POST(request: Request) {
  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body?.query || typeof body.query !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing `query` in request body" },
      { status: 400 }
    );
  }

  if (!body.companyId && !body.companyName) {
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

  const page = body.page && body.page > 0 ? body.page : 1;
  const pageSize =
    body.pageSize && body.pageSize > 0 && body.pageSize <= 200
      ? body.pageSize
      : 20;

  try {
    const { hits, total } = await searchProductsInElasticsearch({
      companyId: company.id,
      query: body.query,
      page,
      pageSize,
      status: body.status,
      priceMinOverride: body.priceMin,
      priceMaxOverride: body.priceMax,
      inventoryMin: body.inventoryMin,
      inventoryMax: body.inventoryMax,
    });

    const formatted = hits.map((p: any) => ({
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
      pagination: { page, pageSize, total },
    });
  } catch (error) {
    console.error("Error searching products in Elasticsearch:", error);
    return NextResponse.json(
      { success: false, error: "Search failed due to an internal error" },
      { status: 502 }
    );
  }
}
