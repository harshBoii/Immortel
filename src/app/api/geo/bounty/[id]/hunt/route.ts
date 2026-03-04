import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

  const baseUrl = profile?.baseUrl ?? "";
  const locale = profile?.locale ?? "en";
  const clusterId = profile?.clusterId ?? null;
  const existingSlugs = profile?.existingSlugs ?? [];

  const sameAsLinks = brand.sameAsLinks.map((link) => link.url);

  const primaryOffering = brand.offerings.find((o) => o.isPrimary) ?? brand.offerings[0] ?? null;
  const offerings = primaryOffering ? [primaryOffering.name] : [];
  const differentiators = primaryOffering?.differentiators ?? [];
  const competitors = primaryOffering?.competitors ?? [];

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
    query: bounty.query,
    page_type: bounty.pageType,
    existing_slugs: existingSlugs,
  };

  // Mark bounty as IN_PROGRESS
  await prisma.citationBounty.update({
    where: { id: bounty.id },
    data: { status: "IN_PROGRESS" },
  });

  try {
    const generatorUrl = process.env.AEO_GENERATOR_URL ?? "http://localhost:8000/aeo/page";
    const res = await fetch(generatorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Generator responded with ${res.status}`);
    }

    const result = (await res.json()) as any;
    const page = result.page ?? result?.data?.page ?? null;
    if (!page) {
      throw new Error("Generator response missing page field");
    }

    const slug: string = page.slug ?? result.slug ?? "";
    const title: string = page.seoTitle ?? page.headline ?? bounty.query;
    const description: string =
      page.body ??
      page.summary ??
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
        facts: (page.facts as any) ?? [],
        faq: (page.faq as any) ?? [],
        claims: (page.claims as any) ?? [],
        summary: (page.summary as any) ?? {},
        knowledgeGraph: (page.jsonLd as any) ?? {},
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
        generationContext: payload as any,
      },
    });

    return NextResponse.json({ success: true, aeoPageId: aeoPage.id });
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

