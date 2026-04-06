import { prisma } from "@/lib/prisma";

export async function loadSerializedDataMineForCompany(companyId: string) {
  const [sources, company, brandEntity, offerings, branding] = await Promise.all([
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
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, description: true, logoUrl: true, website: true, email: true },
    }),
    prisma.brandEntity.findUnique({ where: { companyId } }),
    prisma.brandEntity.findUnique({ where: { companyId }, select: { id: true } }).then((e) =>
      e ? prisma.entityOffering.findMany({ where: { entityId: e.id }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }) : []
    ),
    prisma.companyBranding.findUnique({ where: { companyId } }),
  ]);

  const serializedSources = sources.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    asset: s.asset ? { ...s.asset, createdAt: s.asset.createdAt.toISOString() } : null,
  }));

  const serializedBrandEntity = brandEntity
    ? {
        ...brandEntity,
        createdAt: brandEntity.createdAt.toISOString(),
        updatedAt: brandEntity.updatedAt.toISOString(),
        lastCrawledAt: brandEntity.lastCrawledAt?.toISOString() ?? null,
        lastEnrichedAt: brandEntity.lastEnrichedAt?.toISOString() ?? null,
      }
    : null;

  const serializedOfferings = offerings.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  const serializedBranding = branding
    ? {
        ...branding,
        createdAt: branding.createdAt.toISOString(),
        updatedAt: branding.updatedAt.toISOString(),
      }
    : null;

  return {
    sources: serializedSources,
    company: company ?? null,
    brandEntity: serializedBrandEntity,
    offerings: serializedOfferings,
    branding: serializedBranding,
  };
}
