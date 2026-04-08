// lib/jobs/run-seed.ts
import { prisma }                  from "@/lib/prisma"
import { seedCompanyFromWebsite }  from "@/lib/geo/enrichment/seedCompanyFromWebsite"

export async function runSeedJob(companyId: string) {
  // Resolve website + linkedin — same sources the radar job uses
  const [company, brandEntity, geoDataSources] = await Promise.all([
    prisma.company.findUnique({
      where:  { id: companyId },
      select: { website: true },
    }),
    prisma.brandEntity.findUnique({
      where:   { companyId },
      include: { sameAsLinks: true },
    }),
    prisma.geoDataSource.findMany({
      where: {
        companyId,
        sourceType: "URL",
        label:      { in: ["LinkedIn", "Website URL"] },
        isActive:   true,
      },
      select: { label: true, rawContent: true },
    }),
  ])

  const websiteUrl =
    company?.website ??
    geoDataSources.find((s) => s.label === "Website URL")?.rawContent?.trim()

  if (!websiteUrl) throw new Error(`No website URL found for company: ${companyId}`)

  const linkedinUrl =
    brandEntity?.sameAsLinks.find((l) => l.platform.toLowerCase().includes("linkedin"))?.url ??
    geoDataSources.find((s) => s.label === "LinkedIn")?.rawContent?.trim() ??
    null

  return seedCompanyFromWebsite(prisma, { companyId, websiteUrl, linkedinUrl })
}