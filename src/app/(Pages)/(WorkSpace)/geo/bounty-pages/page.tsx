import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export default async function GeneratedBountyPagesPage() {
  const session = await getSession();
  const companyId = session?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
          Sign in as a company user to view generated bounty pages.
        </div>
      </div>
    );
  }

  const bounties = await prisma.citationBounty.findMany({
    where: {
      companyId,
      aeoPageId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      aeoPage: {
        select: {
          id: true,
          slug: true,
          locale: true,
          title: true,
          description: true,
          status: true,
          pageType: true,
          publishedAt: true,
          canonicalUrl: true,
        },
      },
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground font-heading">
        GEO · Generated Bounty Pages
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {bounties.length} generated page{bounties.length === 1 ? "" : "s"} found.
      </p>

      {bounties.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
          No generated bounty pages yet. Use the Bounty section to run hunts and create pages.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bounties.map((b) => {
            const page = b.aeoPage;
            return (
              <div
                key={b.id}
                className="glass-card rounded-xl border border-[var(--glass-border)] p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-[240px]">
                    <div className="text-sm font-semibold text-foreground">
                      {page?.title ?? "(Untitled AEO page)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bounty ID: <span className="text-foreground">{b.id}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Query: {b.query}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Status: {b.status}</span>
                    <span>Confidence: {Math.round(b.confidence)}</span>
                    <span>Difficulty: {b.difficulty}</span>
                    {page?.pageType ? <span>Page type: {page.pageType}</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/geo/bounty/${b.id}/hunt`}
                    className="rounded-md bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    View generated hunt
                  </Link>
                  {page?.canonicalUrl ? (
                    <a
                      href={page.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] px-3 py-1 text-[12px] font-medium text-foreground hover:bg-[var(--glass-hover)]"
                    >
                      Open canonical URL
                    </a>
                  ) : null}
                  {page?.locale && page?.slug ? (
                    <div className="text-xs text-muted-foreground">
                      /{page.locale}/{page.slug}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

