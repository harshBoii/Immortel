import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "No company in session" }, { status: 200 });
  }

  const companyId = session.companyId;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      brandEntity: {
        include: {
          sameAsLinks: true,
          offerings: true,
          intelligence: true,
        },
      },
      aeoGenerationProfiles: {
        orderBy: { createdAt: "asc" },
      },
      geoDataSources: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!company || !company.brandEntity) {
    return NextResponse.json(
      { error: "Missing BrandEntity for company; configure GEO data first." },
      { status: 200 }
    );
  }

  const brand = company.brandEntity;
  const intelligence = brand.intelligence;
  const profile = company.aeoGenerationProfiles[0] ?? null;
  const geoSources = company.geoDataSources ?? [];

  const baseUrl = profile?.baseUrl ?? "";
  const locale = profile?.locale ?? "en";
  const clusterId = profile?.clusterId ?? null;
  const existingSlugs = profile?.existingSlugs ?? [];
  const defaultQuery = profile?.defaultQuery ?? "";
  const defaultPageType = profile?.defaultPageType ?? "COMPARISON";

  const sameAsLinks = brand.sameAsLinks.map((link) => link.url);

  const primaryOffering = brand.offerings.find((o) => o.isPrimary) ?? brand.offerings[0] ?? null;

  const offerings = primaryOffering ? [primaryOffering.name] : [];

  const differentiators = primaryOffering?.differentiators ?? [];
  const competitors = primaryOffering?.competitors ?? [];

  // Aggregate GeoDataSource raw content into buckets
  const lowerIncludes = (label: string, needles: string[]) =>
    needles.some((n) => label.toLowerCase().includes(n));

  let productDocs = intelligence?.productDocs ?? "";
  let marketResearch = intelligence?.marketResearch ?? "";
  let customerFeedback = intelligence?.customerFeedback ?? "";

  for (const source of geoSources) {
    const label = source.label ?? "";
    const content = source.rawContent ?? "";
    if (!content) continue;

    if (
      lowerIncludes(label, ["research", "market", "competitor", "analysis"]) ||
      source.sourceType === "URL"
    ) {
      marketResearch += (marketResearch ? "\n\n" : "") + content;
    } else if (lowerIncludes(label, ["feedback", "testimonial", "review"])) {
      customerFeedback += (customerFeedback ? "\n\n" : "") + content;
    } else {
      productDocs += (productDocs ? "\n\n" : "") + content;
    }
  }

  const payload = {
    base_url: baseUrl,
    same_as_links: sameAsLinks,
    locale,
    cluster_id: clusterId,
    published_at: null as null,
    entity: {
      name: brand.canonicalName ?? company.name,
      oneLiner: brand.oneLiner ?? company.description ?? "",
      offerings,
      differentiators,
      competitors,
    },
    intelligence: {
      product_docs: productDocs,
      market_research: marketResearch,
      customer_feedback: customerFeedback,
    },
    query: defaultQuery,
    page_type: defaultPageType,
    existing_slugs: existingSlugs,
  };

  return NextResponse.json(payload);
}

