'use client';

type Page = {
  id: string;
  slug: string;
  locale: string;
  pageType: string;
  status: string;
  publishedAt: string | null;
  title: string;
  cluster: {
    id: string;
    name: string;
  } | null;
};

type Bounty = {
  id: string;
  query: string;
  status: string;
  confidence: number;
  difficulty: string;
  aeoPageId: string | null;
};

type Props = {
  pages: Page[];
  bounties: Bounty[];
};

export default function InfoSpreadClient({ pages, bounties }: Props) {
  const bountiesByPageId = new Map<string, Bounty[]>();
  const openBounties: Bounty[] = [];

  for (const bounty of bounties) {
    if (bounty.aeoPageId) {
      const list = bountiesByPageId.get(bounty.aeoPageId) ?? [];
      list.push(bounty);
      bountiesByPageId.set(bounty.aeoPageId, list);
    } else {
      openBounties.push(bounty);
    }
  }

  const handleHunt = async (id: string) => {
    await fetch(`/api/geo/bounty/${id}/hunt`, {
      method: "POST",
      credentials: "include",
    });
    // Rely on page reload or SWR/fetch pattern if added later.
    window.location.reload();
  };

  if (!pages.length && !bounties.length) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
        No AEO pages or bounties found for this company yet. Once you create and hunt bounties, they
        will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {openBounties.length > 0 && (
        <section className="glass-card rounded-xl border border-[var(--glass-border)] p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Open bounties</h2>
          <div className="space-y-1.5">
            {openBounties.map((bounty) => (
              <div
                key={bounty.id}
                className="flex items-start justify-between gap-2 rounded-md bg-[var(--glass)] px-2 py-1.5 text-xs"
              >
                <div className="flex-1">
                  <div className="text-[11px] text-foreground">{bounty.query}</div>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span>Status: {bounty.status}</span>
                    <span>Confidence: {Math.round(bounty.confidence)}</span>
                    <span>Difficulty: {bounty.difficulty}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleHunt(bounty.id)}
                  className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Hunt
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {pages.length > 0 && (
        <section className="space-y-4">
          {pages.map((page) => {
            const pageBounties = bountiesByPageId.get(page.id) ?? [];
            return (
              <div
                key={page.id}
                className="glass-card rounded-xl border border-[var(--glass-border)] p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{page.title}</div>
                    <div className="text-xs text-muted-foreground">
                      /{page.locale}/{page.slug}
                      {page.cluster?.name ? (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Cluster: {page.cluster.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--glass)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {page.pageType}
                    </span>
                    <span className="rounded-full bg-[var(--glass)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {page.status}
                    </span>
                    {page.publishedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        Published {new Date(page.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {pageBounties.length > 0 && (
                  <div className="mt-2 border-t border-[var(--glass-border)] pt-2">
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                      Citation bounties
                    </div>
                    <div className="space-y-1.5">
                      {pageBounties.map((bounty) => (
                        <div
                          key={bounty.id}
                          className="flex items-start justify-between gap-2 rounded-md bg-[var(--glass)] px-2 py-1.5 text-xs"
                        >
                          <div className="text-[11px] text-foreground">{bounty.query}</div>
                          <div className="flex flex-col items-end gap-0.5 text-[10px] text-muted-foreground">
                            <span>Status: {bounty.status}</span>
                            <span>Confidence: {Math.round(bounty.confidence)}</span>
                            <span>Difficulty: {bounty.difficulty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

