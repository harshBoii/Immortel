import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

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
    if (min === max) {
      return `${currency ? `${currency} ` : ""}${min}`.trim();
    }
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

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: bountyId } = await context.params;
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const bounty = await prisma.citationBounty.findFirst({
    where: { id: bountyId, companyId },
  });

  if (!bounty) {
    return NextResponse.json({ success: false, error: "Bounty not found" }, { status: 404 });
  }

  if (bounty.status !== "OPEN") {
    return NextResponse.json({ success: false, error: "Only OPEN bounties can be hunted" }, { status: 400 });
  }

  // Load company context: BrandEntity, offerings, profile, GeoDataSources
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
      { success: false, error: "Missing BrandEntity for company; configure GEO data first." },
      { status: 400 }
    );
  }

  const brand = company.brandEntity;
  const intelligence = brand.intelligence;
  const profile = company.aeoGenerationProfiles[0] ?? null;
  const geoSources = company.geoDataSources ?? [];

  const baseUrl = profile?.baseUrl ?? company.website ?? "";
  const locale = profile?.locale ?? "en";
  const clusterId = profile?.clusterId ?? "cluster-immortel-comparison";
  const existingSlugs = profile?.existingSlugs ?? [];

  // Per spec: dummy same_as_links for now (microservice can evolve later).
  const dummySameAsLinksUrl = "https://example.com/dummy";
  const sameAsLinks = [dummySameAsLinksUrl];

  const primaryOffering = brand.offerings.find((o) => o.isPrimary) ?? brand.offerings[0] ?? null;
  const fallbackDifferentiators = [
    "LangGraph-based stateful agents",
    "Human-in-the-loop review",
    "Schema.org native output",
  ];
  const fallbackCompetitors = ["Jasper AI", "Writer.com", "Copy.ai"];

  const differentiators = primaryOffering?.differentiators?.length
    ? primaryOffering.differentiators
    : fallbackDifferentiators;
  const competitors = primaryOffering?.competitors?.length
    ? primaryOffering.competitors
    : fallbackCompetitors;

  const shopifyProducts = await prisma.shopifyProduct.findMany({
    where: { companyId },
    select: {
      title: true,
      description: true,
      priceMinAmount: true,
      priceMaxAmount: true,
      currencyCode: true,
    },
    orderBy: { shopifyUpdatedAt: "desc" },
  });

  // Per spec: offerings must reflect *all* company inventory products (no hardcoding).
  const offerings = shopifyProducts.map((p) => ({
    name: p.title ?? "",
    description: buildProductDescriptionWithPrice({
      description: p.description,
      priceMinAmount: p.priceMinAmount,
      priceMaxAmount: p.priceMaxAmount,
      currencyCode: p.currencyCode,
    }),
  }));

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
    // Per spec (temporary): keep the underscored key too.
    same_as_links_: dummySameAsLinksUrl,
    locale,
    cluster_id: clusterId,
    published_at: null as null,
    entity: {
      name: brand.canonicalName ?? company.name,
      oneLiner: brand.oneLiner ?? company.description ?? "",
      website: company.website ?? "",
      offerings,
      differentiators,
      competitors,
    },
    intelligence: {
      product_docs: productDocs,
      market_research: marketResearch,
      customer_feedback: customerFeedback,
    },
    query: bounty.query,
    existing_slugs: existingSlugs,
  };

  // Mark bounty as IN_PROGRESS
  await prisma.citationBounty.update({
    where: { id: bounty.id },
    data: { status: "IN_PROGRESS" },
  });

  try {
    const generatorUrl = `${process.env.MICROSERVICE_URL}/aeo/page`;
    const res = await fetch(generatorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Generator responded with ${res.status}`);
    }

    type GeneratorPage = {
      slug?: string | null;
      seoTitle?: string | null;
      headline?: string | null;
      body?: string | null;
      summary?: unknown;
      seoDescription?: string | null;
      facts?: unknown;
      faq?: unknown;
      claims?: unknown;
      jsonLd?: unknown;
    };

    type GeneratorResponse = {
      page?: GeneratorPage | null;
      data?: { page?: GeneratorPage | null } | null;
      slug?: string | null;
    };

    const result = (await res.json()) as GeneratorResponse;
    // Debug: inspect what the microservice returned (truncated to avoid huge logs).
    try {
      const payloadPreview = {
        base_url: payload.base_url,
        locale: payload.locale,
        cluster_id: payload.cluster_id,
        entity: payload.entity?.name,
        offeringsCount: payload.entity?.offerings?.length ?? null,
      };
      const resultPreview = JSON.stringify(result).slice(0, 2000);
      console.log("[geo/bounty/hunt] microservice response", {
        url: generatorUrl,
        status: res.status,
        sent: payloadPreview,
        responsePreview: resultPreview,
      });
    } catch {
      console.log("[geo/bounty/hunt] microservice response (unserializable preview)", {
        url: generatorUrl,
        status: res.status,
      });
    }
    const page = result.page ?? result?.data?.page ?? null;
    if (!page) {
      throw new Error("Generator response missing page field");
    }

    const slug: string = page.slug ?? result.slug ?? "";
    const title: string = page.seoTitle ?? page.headline ?? bounty.query;
    const description: string =
      page.body ??
      (typeof page.summary === "string" ? page.summary : null) ??
      page.seoDescription ??
      `Generated AEO page for query: ${bounty.query}`;

    const aeoPage = await prisma.aeoPage.create({
      data: {
        companyId,
        slug: slug || `bounty-${bounty.id}`,
        locale,
        pageType: bounty.pageType,
        status: "DRAFT",
        title,
        description,
        facts: (page.facts ?? []) as unknown as Prisma.InputJsonValue,
        faq: (page.faq ?? []) as unknown as Prisma.InputJsonValue,
        claims: (page.claims ?? []) as unknown as Prisma.InputJsonValue,
        summary: (page.summary ?? {}) as unknown as Prisma.InputJsonValue,
        knowledgeGraph: (page.jsonLd ?? {}) as unknown as Prisma.InputJsonValue,
        seoTitle: page.seoTitle ?? null,
        seoDescription: page.seoDescription ?? null,
        canonicalUrl: baseUrl && slug ? `${baseUrl.replace(/\/$/, "")}/${slug}` : null,
      },
    });

    await prisma.citationBounty.update({
      where: { id: bounty.id },
      data: {
        status: "HUNTED",
        huntedAt: new Date(),
        aeoPageId: aeoPage.id,
        generationContext: payload as unknown as Prisma.InputJsonValue,
      },
    });

    const response = { success: true, aeoPageId: aeoPage.id };
    console.log("[geo/bounty/hunt] returning response", response);
    return NextResponse.json(response);
  } catch (err) {
    console.error("Bounty hunt failed:", err);
    await prisma.citationBounty.update({
      where: { id: bounty.id },
      data: { status: "OPEN" },
    });
    return NextResponse.json(
      { success: false, error: (err as Error).message ?? "Bounty hunt failed" },
      { status: 500 }
    );
  }
}

