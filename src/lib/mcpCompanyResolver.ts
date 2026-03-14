import { prisma } from "./prisma";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Resolves a company from an MCP request.
 * Callers can pass `companyId` (exact Prisma cuid) or `companyName`
 * (the company's display name or slug — case-insensitive).
 *
 * Examples:
 *   resolveCompany({ companyId: "cmmdo04q9..." })
 *   resolveCompany({ companyName: "MoonKnight" })
 *   resolveCompany({ companyName: "moonknight" })
 */
export async function resolveCompany(params: {
  companyId?: string;
  companyName?: string;
}): Promise<CompanyRow | null> {
  const { companyId, companyName } = params;

  if (companyId) {
    return (prisma as any).company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true },
    });
  }

  if (companyName) {
    const normalized = companyName.trim().toLowerCase().replace(/\s+/g, "-");

    // Try slug first (exact match after normalising)
    const bySlug = await (prisma as any).company.findFirst({
      where: { slug: normalized },
      select: { id: true, name: true, slug: true },
    });
    if (bySlug) return bySlug;

    // Fall back to case-insensitive name match
    const all: CompanyRow[] = await (prisma as any).company.findMany({
      select: { id: true, name: true, slug: true },
    });

    return (
      all.find(
        (c) => c.name.toLowerCase() === companyName.trim().toLowerCase()
      ) ?? null
    );
  }

  return null;
}
