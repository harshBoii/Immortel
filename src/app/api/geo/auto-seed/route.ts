import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { seedCompanyFromWebsite } from "@/lib/geo/enrichment/seedCompanyFromWebsite";

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const [company, urlSources] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        website: true,
        email: true,
      },
    }),
    prisma.geoDataSource.findMany({
      where: {
        companyId,
        sourceType: "URL",
        label: {
          in: ["LinkedIn", "Website URL"],
        },
        isActive: true,
      },
      select: {
        label: true,
        rawContent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  const websiteUrl =
    urlSources.find((s) => s.label === "Website URL")?.rawContent?.trim() ||
    null;
  const linkedinUrl =
    urlSources.find((s) => s.label === "LinkedIn")?.rawContent?.trim() ||
    null;

  // LinkedIn is optional; we only require the website URL to seed/enrich company info.
  if (!websiteUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "Website URL is required before auto-filling. Update it in your GEO profile first.",
        missing: {
          website: !websiteUrl,
          linkedin: false,
        },
      },
      { status: 400 }
    );
  }

  try {
    await seedCompanyFromWebsite(prisma, { companyId, websiteUrl, linkedinUrl });
  } catch (err) {
    console.error("Auto-seed microservice error:", err);
    const status = (err as any)?.status;
    const body = (err as any)?.body;
    if (typeof status === "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch data from enrichment service.",
          status,
          body: body || undefined,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Error contacting enrichment service." },
      { status: 502 }
    );
  }

  const [nextCompany, nextBrandEntity, nextOfferingsRaw, nextBrandingRaw] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        website: true,
        email: true,
      },
    }),
    prisma.brandEntity.findUnique({ where: { companyId } }),
    brandEntity
      ? prisma.entityOffering.findMany({
          where: { entityId: brandEntity.id },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    prisma.companyBranding.findUnique({ where: { companyId } }),
  ]);

  const nextOfferings = nextOfferingsRaw;
  const nextBranding = nextBrandingRaw;

  const serializedBrandEntity = nextBrandEntity
    ? {
        ...nextBrandEntity,
        createdAt: nextBrandEntity.createdAt.toISOString(),
        updatedAt: nextBrandEntity.updatedAt.toISOString(),
        lastCrawledAt: nextBrandEntity.lastCrawledAt?.toISOString() ?? null,
        lastEnrichedAt: nextBrandEntity.lastEnrichedAt?.toISOString() ?? null,
      }
    : null;

  const serializedOfferings = nextOfferings.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  const serializedBranding = nextBranding
    ? {
        ...nextBranding,
        createdAt: nextBranding.createdAt.toISOString(),
        updatedAt: nextBranding.updatedAt.toISOString(),
      }
    : null;

  return NextResponse.json({
    success: true,
    company: nextCompany,
    brandEntity: serializedBrandEntity,
    offerings: serializedOfferings,
    branding: serializedBranding,
  });
}

