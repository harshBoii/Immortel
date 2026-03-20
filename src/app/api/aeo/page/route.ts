import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MicroserviceAeoPageInput = {
  base_url: string;
  same_as_links: string[];
  locale: string;
  cluster_id: string | null;
  published_at: string | null;
  entity: {
    name: string;
    oneLiner?: string;
    website?: string;
    offerings?: string[];
    differentiators?: string[];
    competitors?: string[];
    // We will append this
    products?: Array<{ name: string; description: string }>;
  };
  intelligence: {
    product_docs: string;
    market_research: string;
    customer_feedback: string;
  };
  query: string;
  page_type: string;
  existing_slugs: string[];
  session_id?: string;
};

function buildPriceString(params: {
  priceMinAmount?: string | null;
  priceMaxAmount?: string | null;
  currencyCode?: string | null;
}) {
  const min = params.priceMinAmount?.trim() ?? "";
  const max = params.priceMaxAmount?.trim() ?? "";
  const currency = params.currencyCode?.trim() ?? "";

  if (!min && !max) return null;
  if (min && max) {
    const same = min === max;
    if (same) return `${currency ? `${currency} ` : ""}${min}`.trim();
    return `${currency ? `${currency} ` : ""}${min} - ${max}`.trim();
  }
  const single = min || max;
  return `${currency ? `${currency} ` : ""}${single}`.trim();
}

function buildProductDescriptionWithPrice(input: {
  description?: string | null;
  priceMinAmount?: string | null;
  priceMaxAmount?: string | null;
  currencyCode?: string | null;
}) {
  const desc = input.description?.trim() ?? "";
  const priceStr = buildPriceString(input);
  if (!priceStr) return desc;
  if (!desc) return `Price: ${priceStr}`;
  return `${desc} | Price: ${priceStr}`;
}

async function resolveCompanyIdByEntityName(entityName: string): Promise<string | null> {
  const brand = await prisma.brandEntity.findFirst({
    where: { canonicalName: { equals: entityName, mode: "insensitive" } },
    select: { companyId: true },
  });
  if (brand?.companyId) return brand.companyId;

  const company = await prisma.company.findFirst({
    where: { name: { equals: entityName, mode: "insensitive" } },
    select: { id: true },
  });
  return company?.id ?? null;
}

export async function POST(request: NextRequest) {
  const microBase = process.env.MICROSERVICE_URL;
  if (!microBase) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured" },
      { status: 500 }
    );
  }

  let input: MicroserviceAeoPageInput;
  try {
    input = (await request.json()) as MicroserviceAeoPageInput;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const entityName = input?.entity?.name?.trim();
  if (!entityName) {
    return NextResponse.json(
      { success: false, error: "Missing `entity.name`" },
      { status: 400 }
    );
  }

  const companyId = await resolveCompanyIdByEntityName(entityName);
  const products =
    companyId
      ? await prisma.shopifyProduct.findMany({
          where: { companyId },
          select: {
            title: true,
            description: true,
            priceMinAmount: true,
            priceMaxAmount: true,
            currencyCode: true,
          },
          orderBy: { shopifyUpdatedAt: "desc" },
        })
      : [];

  const formattedProducts = products.map((p) => ({
    name: p.title,
    description: buildProductDescriptionWithPrice({
      description: p.description,
      priceMinAmount: p.priceMinAmount,
      priceMaxAmount: p.priceMaxAmount,
      currencyCode: p.currencyCode,
    }),
  }));

  // Add products into the same payload shape your microservice expects.
  // (We keep the rest of `input` untouched.)
  const payload: MicroserviceAeoPageInput = {
    ...input,
    entity: {
      ...input.entity,
      products: formattedProducts,
    },
  };

  try {
    const microUrl = `${microBase.replace(/\/$/, "")}/aeo/page`;
    const res = await fetch(microUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Microservice request failed",
          status: res.status,
          microserviceBody: json ?? text ?? undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      input: payload,
      output: json ?? text,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Error contacting microservice", details: (err as Error).message },
      { status: 502 }
    );
  }
}

