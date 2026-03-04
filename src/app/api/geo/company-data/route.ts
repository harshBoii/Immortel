import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/geo/company-data?companyId=xxx
 *
 * Returns all Data Mine CRUD data for a company in a structured format.
 * No authentication required. companyId query param is required.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim();

  if (!companyId) {
    return NextResponse.json(
      { success: false, error: "companyId query parameter is required" },
      { status: 400 }
    );
  }

  const [company, brandEntity, offerings, branding, dataSources] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        website: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.brandEntity.findUnique({ where: { companyId } }),
    prisma.brandEntity
      .findUnique({ where: { companyId }, select: { id: true } })
      .then((e) =>
        e
          ? prisma.entityOffering.findMany({
              where: { entityId: e.id },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            })
          : []
      ),
    prisma.companyBranding.findUnique({ where: { companyId } }),
    prisma.geoDataSource.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        asset: {
          select: {
            id: true,
            assetType: true,
            title: true,
            filename: true,
            status: true,
            thumbnailUrl: true,
            playbackUrl: true,
            duration: true,
            resolution: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  const data = {
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      logoUrl: company.logoUrl,
      website: company.website,
      email: company.email,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    },
    brandEntity: brandEntity
      ? {
          id: brandEntity.id,
          companyId: brandEntity.companyId,
          canonicalName: brandEntity.canonicalName,
          aliases: brandEntity.aliases,
          entityType: brandEntity.entityType,
          oneLiner: brandEntity.oneLiner,
          about: brandEntity.about,
          industry: brandEntity.industry,
          category: brandEntity.category,
          headquartersCity: brandEntity.headquartersCity,
          headquartersCountry: brandEntity.headquartersCountry,
          foundedYear: brandEntity.foundedYear,
          employeeRange: brandEntity.employeeRange,
          businessModel: brandEntity.businessModel,
          topics: brandEntity.topics,
          keywords: brandEntity.keywords,
          targetAudiences: brandEntity.targetAudiences,
          authorityScore: brandEntity.authorityScore,
          citationCount: brandEntity.citationCount,
          lastCrawledAt: brandEntity.lastCrawledAt?.toISOString() ?? null,
          completenessScore: brandEntity.completenessScore,
          lastEnrichedAt: brandEntity.lastEnrichedAt?.toISOString() ?? null,
          enrichmentSource: brandEntity.enrichmentSource,
          createdAt: brandEntity.createdAt.toISOString(),
          updatedAt: brandEntity.updatedAt.toISOString(),
        }
      : null,
    offerings: offerings.map((o) => ({
      id: o.id,
      entityId: o.entityId,
      name: o.name,
      slug: o.slug,
      description: o.description,
      offeringType: o.offeringType,
      url: o.url,
      keywords: o.keywords,
      useCases: o.useCases,
      targetAudiences: o.targetAudiences,
      differentiators: o.differentiators,
      competitors: o.competitors,
      isPrimary: o.isPrimary,
      isActive: o.isActive,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    branding: branding
      ? {
          id: branding.id,
          companyId: branding.companyId,
          logoUrl: branding.logoUrl,
          faviconUrl: branding.faviconUrl,
          banner: branding.banner,
          themeMusic: branding.themeMusic,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          bgColor: branding.bgColor,
          surfaceColor: branding.surfaceColor,
          textColor: branding.textColor,
          companyAddress: branding.companyAddress,
          createdAt: branding.createdAt.toISOString(),
          updatedAt: branding.updatedAt.toISOString(),
        }
      : null,
    dataSources: dataSources.map((s) => ({
      id: s.id,
      companyId: s.companyId,
      sourceType: s.sourceType,
      label: s.label,
      assetId: s.assetId,
      rawContent: s.rawContent,
      processedContent: s.processedContent,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      asset: s.asset
        ? {
            id: s.asset.id,
            assetType: s.asset.assetType,
            title: s.asset.title,
            filename: s.asset.filename,
            status: s.asset.status,
            thumbnailUrl: s.asset.thumbnailUrl,
            playbackUrl: s.asset.playbackUrl,
            duration: s.asset.duration,
            resolution: s.asset.resolution,
            createdAt: s.asset.createdAt.toISOString(),
          }
        : null,
    })),
  };

  return NextResponse.json({
    success: true,
    companyId: company.id,
    data,
  });
}
