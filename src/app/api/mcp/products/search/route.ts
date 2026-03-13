import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchProductsInElasticsearch } from "@/lib/productSearch";

type SearchBody = {
  query: string;
  page?: number;
  pageSize?: number;
  status?: string[];
  priceMin?: number;
  priceMax?: number;
  inventoryMin?: number;
  inventoryMax?: number;
};

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

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

  const page = body.page && body.page > 0 ? body.page : 1;
  const pageSize =
    body.pageSize && body.pageSize > 0 && body.pageSize <= 200
      ? body.pageSize
      : 20;

  try {
    const { hits, total } = await searchProductsInElasticsearch({
      companyId: session.companyId,
      query: body.query,
      page,
      pageSize,
      status: body.status,
      priceMinOverride: body.priceMin,
      priceMaxOverride: body.priceMax,
      inventoryMin: body.inventoryMin,
      inventoryMax: body.inventoryMax,
    });

    return NextResponse.json({
      success: true,
      data: hits,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error("Error searching products in Elasticsearch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Search failed due to an internal error",
      },
      { status: 502 }
    );
  }
}

