import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import InfoSpreadClient from "./ui";

export default async function InfoSpreadContent() {
  const session = await getSession();
  const companyId = session?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
        You&apos;re not associated with a company yet. Sign in as a company user to see AEO coverage.
      </div>
    );
  }

  const [rawPages, rawBounties] = await Promise.all([
    prisma.aeoPage.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        locale: true,
        pageType: true,
        status: true,
        publishedAt: true,
        title: true,
        cluster: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.citationBounty.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        query: true,
        status: true,
        confidence: true,
        difficulty: true,
        aeoPageId: true,
      },
    }),
  ]);

  const pages = rawPages.map((p) => ({
    ...p,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
  }));

  const bounties = rawBounties.map((b) => ({
    ...b,
  }));

  return <InfoSpreadClient pages={pages} bounties={bounties} />;
}

