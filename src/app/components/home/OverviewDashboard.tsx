import Image from "next/image";
import Link from "next/link";
import WelcomeAnimation from "../animations/welcome";

import type { HomeOverviewSnapshot } from "@/lib/home/getHomeOverviewStats";

function formatSnapshotUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function DashLink({
  href,
  title,
  description,
  className = "",
}: {
  href: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 transition-all duration-200 hover:border-[var(--sibling-primary)]/35 hover:bg-[var(--glass-hover)]/50 hover:shadow-md ${className}`}
    >
      <p className="text-sm font-semibold text-foreground group-hover:text-[var(--sibling-primary)]">
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}

/** GEO suite link cards: same language as DashLink, with a thin colored accent border. */
function GeoSuiteCard({
  href,
  title,
  description,
  borderClassName,
  className = "",
}: {
  href: string;
  title: string;
  description: string;
  /** Tailwind border utilities, e.g. `border border-red-500/45` */
  borderClassName: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block min-h-[108px] rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 transition-all duration-200 hover:bg-[var(--glass-hover)]/50 hover:shadow-md md:min-h-[120px] md:p-5 ${borderClassName} ${className}`}
    >
      <p className="text-sm font-semibold text-foreground group-hover:text-[var(--sibling-primary)]">
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}

export function OverviewDashboard({
  snapshot,
}: {
  snapshot: HomeOverviewSnapshot;
}) {
  const overviewRows: { label: string; value: string }[] = [
    { label: "Company name", value: snapshot.companyName },
    {
      label: "Connected Shopify store",
      value: snapshot.shopifyStoreLabel ?? "—",
    },
    {
      label: "Products in inventory",
      value: snapshot.productCount.toLocaleString("en-US"),
    },
    {
      label: "Prompts generated",
      value: snapshot.promptCount.toLocaleString("en-US"),
    },
    {
      label: "Expected prompts revenue",
      value: formatSnapshotUsd(snapshot.expectedPromptRevenueUsd),
    },
  ];

  return (
    <div className="min-h-[45vh] px-4 pb-10 pt-2 md:px-8">
      <div className="mx-auto max-w-[1200px]">
        {/* Asymmetric top zone: wide manifesto + offset GEO stack */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-5">
          <section className="glass-card card-anime-float relative flex flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] p-6 md:p-8 lg:col-span-7 lg:min-h-[300px]">
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="relative mb-5 min-h-[34.75rem] w-full sm:min-h-[5.5rem] lg:mb-7 lg:min-h-[28.5rem] lg:flex-1 ">
                <div className="absolute inset-0">
                  <Image
                    src="/Immortel_Logo.png"
                    alt="Immortel"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 90vw, 640px"
                    priority
                  />
                </div>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sibling-accent)]">
                Immortel
              </p>
              <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Own how AI talks about you.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                Immortel is your company workspace for generative engine optimization: see LLM
                citations, prioritize prompts and bounties, publish AEO-ready pages, and feed the
                models with curated content and shop data—so answers in ChatGPT, Gemini, and
                beyond stay aligned with your brand.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass)]/80 px-3 py-1 text-[11px] font-medium text-foreground/90">
                  GEO intelligence
                </span>
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass)]/80 px-3 py-1 text-[11px] font-medium text-foreground/90">
                  Content ingestion
                </span>
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass)]/80 px-3 py-1 text-[11px] font-medium text-foreground/90">
                  Shop and connections
                </span>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4 lg:col-span-5 lg:-mt-2 lg:justify-end">
            <WelcomeAnimation />
            <section className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-4 shadow-sm lg:translate-x-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sibling-accent)]">
                Company snapshot
              </p>
              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--glass-border)] bg-background/40">
                <table className="w-full border-collapse text-left text-sm">
                  <tbody>
                    {overviewRows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-[var(--glass-border)] last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="w-[45%] min-w-0 py-2.5 pl-3 pr-2 text-xs font-medium text-muted-foreground md:w-[42%]"
                        >
                          {row.label}
                        </th>
                        <td className="py-2.5 pl-2 pr-3 text-xs font-semibold text-foreground md:text-sm">
                          <span className="break-words">{row.value}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded-xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--glass)] to-[var(--glass)]/70 p-5 shadow-sm lg:translate-x-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sibling-accent)]">
                GEO pulse
              </p>
              <p className="mt-2 text-sm text-foreground/90">
                Radar shows citation visibility across models. Bounty and GeoKnight turn topics
                into action. Data Mine and Info Spread keep your entity consistent everywhere.
              </p>
              <Link
                href="/geo/radar"
                className="mt-4 inline-flex text-xs font-semibold text-[var(--sibling-primary)] hover:underline"
              >
                Open Company Radar →
              </Link>
            </section>
            <section className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/55 p-5 lg:-rotate-[0.4deg] lg:shadow-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sibling-accent)]">
                Content fuel
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload raw assets, reels, and webinars—then track them in history. Richer source
                material improves downstream GEO and AEO outputs.
              </p>
              <Link
                href="/ingestion"
                className="mt-3 inline-flex text-xs font-semibold text-[var(--sibling-primary)] hover:underline"
              >
                Go to Ingestion →
              </Link>
            </section>
          </div>
        </div>

        {/* Bento-style GEO grid — irregular spans */}
        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
            GEO suite
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground md:text-sm">
            Everything under GEO works together: entity configuration, spread analysis, radar
            metrics, topic battles, bounty hunting, and generated pages.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-2">
            <GeoSuiteCard
              href="/geo/data-mine"
              title="Data Mine"
              description="Curate the canonical entity, intelligence, and generator configuration used for AEO pages."
              borderClassName="border-red-500/40 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.12)] hover:border-red-500/65"
              className="xl:col-span-2 xl:row-span-1"
            />
            <GeoSuiteCard
              href="/geo/info-spread"
              title="Info Spread"
              description="See how your GEO entity is represented across generated AEO pages and citation bounties."
              borderClassName="border-blue-600/35 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.1)] hover:border-blue-600/60"
              className="xl:col-span-2"
            />
            <GeoSuiteCard
              href="/geo/radar"
              title="Company Radar"
              description="LLM citation visibility across prompts and models. Refresh for the latest from the radar service."
              borderClassName="border-amber-500/45 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)] hover:border-amber-500/70"
            />
            <GeoSuiteCard
              href="/geo/geoknight"
              title="GeoKnight"
              description="Strategic watchtower for topic battles, rival consensus, and simulating prompt responses."
              borderClassName="border-red-600/38 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.1)] hover:border-red-600/65"
            />
            <GeoSuiteCard
              href="/geo/bounty"
              title="Bounty"
              description="Discover topic niches, prompt coverage, revenue hints, and hunt opportunities."
              borderClassName="border-sky-600/40 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.11)] hover:border-sky-600/65"
              className="sm:col-span-2 xl:col-span-1"
            />
            <GeoSuiteCard
              href="/geo/bounty-pages"
              title="Generated Bounty Pages"
              description="Review AEO pages produced from successful bounty hunts."
              borderClassName="border-yellow-500/42 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.12)] hover:border-yellow-500/68"
            />
          </div>
        </div>

        {/* Bottom asymmetric split: content vs commerce */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
          <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 p-6 lg:col-span-5 lg:rounded-3xl lg:rounded-br-xl lg:border-r-2 lg:border-r-[var(--sibling-primary)]/25">
            <h2 className="font-heading text-lg font-semibold text-foreground">Content pipeline</h2>
            <p className="mt-2 text-xs text-muted-foreground md:text-sm">
              Centralize uploads and history so marketing and GEO share one source of truth.
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/ingestion"
                  className="text-sm font-medium text-foreground underline-offset-2 hover:text-[var(--sibling-primary)] hover:underline"
                >
                  Upload
                </Link>
                <p className="text-xs text-muted-foreground">
                  Videos, images, documents, reels, webinars—ingest and organize.
                </p>
              </li>
              <li>
                <Link
                  href="/ingestion/history"
                  className="text-sm font-medium text-foreground underline-offset-2 hover:text-[var(--sibling-primary)] hover:underline"
                >
                  History
                </Link>
                <p className="text-xs text-muted-foreground">
                  Past uploads, metadata, and approval flows in one timeline.
                </p>
              </li>
            </ul>
          </section>

          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)]/40 p-6 lg:col-span-7 lg:ml-4 lg:rounded-tl-sm lg:rounded-br-3xl">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Shop and connections
              </h2>
              <p className="mt-2 text-xs text-muted-foreground md:text-sm">
                Wire commerce and protocols so product truth flows into prompts and automations.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DashLink
                href="/shop/products"
                title="Shop Intel · Products"
                description="Catalog signals that inform offers and GEO context."
              />
              <DashLink
                href="/connection/mcp"
                title="Connection hub"
                description="MCP, Shopify, ACP, and UCP from one place."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
