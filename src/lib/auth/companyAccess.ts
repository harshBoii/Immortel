import { prisma } from "@/lib/prisma";

export type SessionCompany = {
  id: string;
  organizationId: string | null;
  isOrg: boolean;
};

export async function getSessionCompany(companyId: string): Promise<SessionCompany | null> {
  const row = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, organizationId: true, isOrg: true },
  });
  return row;
}

/**
 * Returns true if the session company may read/write data for `targetCompanyId`.
 * Any company in the same organization may switch workspace to a sibling (no extra password).
 */
export async function canAccessCompanyId(
  sessionCompany: SessionCompany,
  targetCompanyId: string
): Promise<boolean> {
  if (targetCompanyId === sessionCompany.id) return true;
  if (!sessionCompany.organizationId) return false;
  const target = await prisma.company.findUnique({
    where: { id: targetCompanyId },
    select: { organizationId: true },
  });
  return target?.organizationId === sessionCompany.organizationId;
}

export async function assertCanAccessCompanyId(
  sessionCompanyId: string,
  targetCompanyId: string
): Promise<void> {
  const sessionCompany = await getSessionCompany(sessionCompanyId);
  if (!sessionCompany) {
    throw new Error("Unauthorized");
  }
  const ok = await canAccessCompanyId(sessionCompany, targetCompanyId);
  if (!ok) {
    throw new Error("Forbidden");
  }
}

/** HQ dashboard: any company in a multi-company org (subsidiary or HQ) may load aggregated /hq data. */
export async function assertHqDashboardAccess(sessionCompanyId: string): Promise<{
  organizationId: string;
  organizationName: string;
  companyIds: string[];
  companies: Array<{ id: string; name: string; isOrg: boolean }>;
}> {
  const company = await prisma.company.findUnique({
    where: { id: sessionCompanyId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          _count: { select: { companies: true } },
        },
      },
    },
  });
  if (!company?.organizationId || !company.organization) {
    throw new Error("Forbidden");
  }
  if (company.organization._count.companies < 1) {
    throw new Error("Forbidden");
  }
  const companies = await prisma.company.findMany({
    where: { organizationId: company.organizationId },
    select: { id: true, name: true, isOrg: true },
    orderBy: { name: "asc" },
  });
  return {
    organizationId: company.organizationId,
    organizationName: company.organization.name,
    companyIds: companies.map((c) => c.id),
    companies,
  };
}

/**
 * Resolves which company IDs to aggregate for HQ overview (query param subset).
 */
export function resolveHqCompanyFilter(
  allowedIds: string[],
  requested: string[] | null
): string[] {
  if (!requested?.length) return allowedIds;
  const allowed = new Set(allowedIds);
  const filtered = requested.filter((id) => allowed.has(id));
  return filtered.length > 0 ? filtered : allowedIds;
}
