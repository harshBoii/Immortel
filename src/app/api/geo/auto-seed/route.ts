import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

  if (!websiteUrl || !linkedinUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Website URL and LinkedIn URL are required before auto-filling. Update them in your GEO profile first.",
        missing: {
          website: !websiteUrl,
          linkedin: !linkedinUrl,
        },
      },
      { status: 400 }
    );
  }

  const base = process.env.MICROSERVICE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured on the server." },
      { status: 500 }
    );
  }

  const seedUrl = `${base.replace(/\/$/, "")}/company/seed`;

  let payload: any;
  try {
    const res = await fetch(seedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // FastAPI / Pydantic expects snake_case fields
      body: JSON.stringify({
        website_url: websiteUrl,
        linkedin_url: linkedinUrl,
        // you can later thread this through from session if desired
        // session_id: session.id ?? "company-seeder-session",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch data from enrichment service.",
          status: res.status,
          body: text || undefined,
        },
        { status: 502 }
      );
    }

    payload = await res.json();
  } catch (err) {
    console.error("Auto-seed microservice error:", err);
    return NextResponse.json(
      { success: false, error: "Error contacting enrichment service." },
      { status: 502 }
    );
  }

  const microCompany = payload?.company as
    | {
        description?: string | null;
        logoUrl?: string | null;
        website?: string | null;
        email?: string | null;
      }
    | undefined;

  const microBrandEntity = payload?.brandEntity as
    | {
        canonicalName?: string | null;
        aliases?: string[] | null;
        entityType?: string | null;
        oneLiner?: string | null;
        about?: string | null;
        industry?: string | null;
        category?: string | null;
        headquartersCity?: string | null;
        headquartersCountry?: string | null;
        foundedYear?: number | null;
        employeeRange?: string | null;
        businessModel?: string | null;
        topics?: string[] | null;
        keywords?: string[] | null;
        targetAudiences?: string[] | null;
        authorityScore?: number | null;
        citationCount?: number | null;
        lastCrawledAt?: string | null;
        completenessScore?: number | null;
        lastEnrichedAt?: string | null;
        enrichmentSource?: string | null;
      }
    | undefined;

  const microOfferings =
    (payload?.offerings as
      | Array<{
          name: string;
          slug: string;
          description?: string | null;
          offeringType?: string | null;
          url?: string | null;
          keywords?: string[] | null;
          useCases?: string[] | null;
          targetAudiences?: string[] | null;
          differentiators?: string[] | null;
          competitors?: string[] | null;
          isPrimary?: boolean | null;
          isActive?: boolean | null;
        }>
      | undefined) ?? [];

  const microBranding = payload?.branding as
    | {
        logoUrl?: string | null;
        faviconUrl?: string | null;
        banner?: string | null;
        themeMusic?: string | null;
        companyAddress?: string | null;
      }
    | undefined;

  // Apply enrichment updates (no long-running interactive transaction; operations are idempotent)
  if (microCompany) {
    const data: Prisma.CompanyUpdateInput = {};
    if (microCompany.description !== undefined) data.description = microCompany.description;
    if (microCompany.logoUrl !== undefined) data.logoUrl = microCompany.logoUrl;
    if (microCompany.website !== undefined) data.website = microCompany.website;
    if (microCompany.email !== undefined && microCompany.email) data.email = microCompany.email;

    if (Object.keys(data).length > 0) {
      await prisma.company.update({ where: { id: companyId }, data });
    }
  }

  let brandEntity = await prisma.brandEntity.findUnique({ where: { companyId } });

  if (microBrandEntity) {
    const beCreate: Prisma.BrandEntityUncheckedCreateInput = {
      companyId,
    };
    const beUpdate: Prisma.BrandEntityUpdateInput = {};

    if (microBrandEntity.canonicalName !== undefined) {
      beCreate.canonicalName = microBrandEntity.canonicalName;
      beUpdate.canonicalName = microBrandEntity.canonicalName;
    }
    if (microBrandEntity.aliases !== undefined) {
      const aliases = microBrandEntity.aliases ?? [];
      beCreate.aliases = aliases;
      beUpdate.aliases = aliases;
    }
    if (microBrandEntity.entityType !== undefined) {
      const entityType = microBrandEntity.entityType ?? "Organization";
      beCreate.entityType = entityType;
      beUpdate.entityType = entityType;
    }
    if (microBrandEntity.oneLiner !== undefined) {
      beCreate.oneLiner = microBrandEntity.oneLiner;
      beUpdate.oneLiner = microBrandEntity.oneLiner;
    }
    if (microBrandEntity.about !== undefined) {
      beCreate.about = microBrandEntity.about;
      beUpdate.about = microBrandEntity.about;
    }
    if (microBrandEntity.industry !== undefined) {
      beCreate.industry = microBrandEntity.industry;
      beUpdate.industry = microBrandEntity.industry;
    }
    if (microBrandEntity.category !== undefined) {
      beCreate.category = microBrandEntity.category;
      beUpdate.category = microBrandEntity.category;
    }
    if (microBrandEntity.headquartersCity !== undefined) {
      beCreate.headquartersCity = microBrandEntity.headquartersCity;
      beUpdate.headquartersCity = microBrandEntity.headquartersCity;
    }
    if (microBrandEntity.headquartersCountry !== undefined) {
      beCreate.headquartersCountry = microBrandEntity.headquartersCountry;
      beUpdate.headquartersCountry = microBrandEntity.headquartersCountry;
    }
    if (microBrandEntity.foundedYear !== undefined) {
      beCreate.foundedYear = microBrandEntity.foundedYear ?? null;
      beUpdate.foundedYear = microBrandEntity.foundedYear ?? null;
    }
    if (microBrandEntity.employeeRange !== undefined) {
      beCreate.employeeRange = microBrandEntity.employeeRange;
      beUpdate.employeeRange = microBrandEntity.employeeRange;
    }
    if (microBrandEntity.businessModel !== undefined) {
      beCreate.businessModel = microBrandEntity.businessModel;
      beUpdate.businessModel = microBrandEntity.businessModel;
    }
    if (microBrandEntity.topics !== undefined) {
      const topics = microBrandEntity.topics ?? [];
      beCreate.topics = topics;
      beUpdate.topics = topics;
    }
    if (microBrandEntity.keywords !== undefined) {
      const keywords = microBrandEntity.keywords ?? [];
      beCreate.keywords = keywords;
      beUpdate.keywords = keywords;
    }
    if (microBrandEntity.targetAudiences !== undefined) {
      const audiences = microBrandEntity.targetAudiences ?? [];
      beCreate.targetAudiences = audiences;
      beUpdate.targetAudiences = audiences;
    }
    if (microBrandEntity.authorityScore !== undefined) {
      beCreate.authorityScore = microBrandEntity.authorityScore;
      beUpdate.authorityScore = microBrandEntity.authorityScore;
    }
    if (microBrandEntity.citationCount !== undefined) {
      const count = microBrandEntity.citationCount ?? 0;
      beCreate.citationCount = count;
      beUpdate.citationCount = count;
    }
    if (microBrandEntity.lastCrawledAt !== undefined) {
      const value = microBrandEntity.lastCrawledAt
        ? new Date(microBrandEntity.lastCrawledAt)
        : null;
      beCreate.lastCrawledAt = value;
      beUpdate.lastCrawledAt = value;
    }
    if (microBrandEntity.completenessScore !== undefined) {
      const score = microBrandEntity.completenessScore ?? 0;
      beCreate.completenessScore = score;
      beUpdate.completenessScore = score;
    }
    if (microBrandEntity.lastEnrichedAt !== undefined) {
      const value = microBrandEntity.lastEnrichedAt
        ? new Date(microBrandEntity.lastEnrichedAt)
        : null;
      beCreate.lastEnrichedAt = value;
      beUpdate.lastEnrichedAt = value;
    }
    if (microBrandEntity.enrichmentSource !== undefined) {
      beCreate.enrichmentSource = microBrandEntity.enrichmentSource;
      beUpdate.enrichmentSource = microBrandEntity.enrichmentSource;
    }

    brandEntity = await prisma.brandEntity.upsert({
      where: { companyId },
      create: beCreate,
      update: beUpdate,
    });
  }

  if (brandEntity && microOfferings.length > 0) {
    for (const o of microOfferings) {
      const createData: Prisma.EntityOfferingUncheckedCreateInput = {
        entityId: brandEntity.id,
        name: o.name,
        slug: o.slug,
      };
      const updateData: Prisma.EntityOfferingUpdateInput = {};
      if (o.description !== undefined) {
        createData.description = o.description;
        updateData.description = o.description;
      }
      if (o.offeringType !== undefined) {
        const t = o.offeringType as any; // align enum by name
        createData.offeringType = t;
        updateData.offeringType = t;
      }
      if (o.url !== undefined) {
        createData.url = o.url;
        updateData.url = o.url;
      }
      if (o.keywords !== undefined) {
        const keywords = o.keywords ?? [];
        createData.keywords = keywords;
        updateData.keywords = keywords;
      }
      if (o.useCases !== undefined) {
        const useCases = o.useCases ?? [];
        createData.useCases = useCases;
        updateData.useCases = useCases;
      }
      if (o.targetAudiences !== undefined) {
        const audiences = o.targetAudiences ?? [];
        createData.targetAudiences = audiences;
        updateData.targetAudiences = audiences;
      }
      if (o.differentiators !== undefined) {
        const diffs = o.differentiators ?? [];
        createData.differentiators = diffs;
        updateData.differentiators = diffs;
      }
      if (o.competitors !== undefined) {
        const competitors = o.competitors ?? [];
        createData.competitors = competitors;
        updateData.competitors = competitors;
      }
      if (o.isPrimary !== undefined) {
        const primary = !!o.isPrimary;
        createData.isPrimary = primary;
        updateData.isPrimary = primary;
      }
      if (o.isActive !== undefined) {
        const active = !!o.isActive;
        createData.isActive = active;
        updateData.isActive = active;
      }

      await prisma.entityOffering.upsert({
        where: {
          entityId_slug: {
            entityId: brandEntity.id,
            slug: o.slug,
          },
        },
        create: createData,
        update: updateData,
      });
    }
  }

  if (microBranding) {
    const brandingCreate: Prisma.CompanyBrandingUncheckedCreateInput = {
      companyId,
    };
    const brandingUpdate: Prisma.CompanyBrandingUpdateInput = {};
    if (microBranding.logoUrl !== undefined) {
      brandingCreate.logoUrl = microBranding.logoUrl;
      brandingUpdate.logoUrl = microBranding.logoUrl;
    }
    if (microBranding.faviconUrl !== undefined) {
      brandingCreate.faviconUrl = microBranding.faviconUrl;
      brandingUpdate.faviconUrl = microBranding.faviconUrl;
    }
    if (microBranding.banner !== undefined) {
      brandingCreate.banner = microBranding.banner;
      brandingUpdate.banner = microBranding.banner;
    }
    if (microBranding.themeMusic !== undefined) {
      brandingCreate.themeMusic = microBranding.themeMusic;
      brandingUpdate.themeMusic = microBranding.themeMusic;
    }
    if (microBranding.companyAddress !== undefined) {
      // allow null to clear address
      brandingCreate.companyAddress = microBranding.companyAddress ?? undefined;
      brandingUpdate.companyAddress = microBranding.companyAddress ?? undefined;
    }

    await prisma.companyBranding.upsert({
      where: { companyId },
      create: brandingCreate,
      update: brandingUpdate,
    });
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

