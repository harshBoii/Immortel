"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Flame,
  Snowflake,
  TrendingUp,
  UserPlus,
  Upload,
  PhoneCall,
  Search,
  Sparkles,
} from "lucide-react";
import type { LeadStage } from "@prisma/client";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import { CallsTable, type CallsTableColumn } from "@/app/components/calls/common/CallsTable";
import { FilterChips } from "@/app/components/calls/common/FilterChips";
import { DetailDrawer } from "@/app/components/calls/common/DetailDrawer";
import { formatRelative } from "@/app/components/calls/common/format";

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  industry: string | null;
  source: string | null;
  productProvider?: "Shopify" | "WooCommerce" | null;
  productExternalId?: string | null;
  productName?: string | null;
  intentScore: number;
  stage: LeadStage;
  tags: string[];
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Kpis = {
  total: number;
  hot: number;
  warm: number;
  uncontacted: number;
  convertedToday: number;
};

const STAGE_CHIPS: { id: string; label: string; stage?: LeadStage }[] = [
  { id: "all", label: "All" },
  { id: "NEW", label: "New", stage: "NEW" },
  { id: "CONTACTED", label: "Contacted", stage: "CONTACTED" },
  { id: "WARM", label: "Warm", stage: "WARM" },
  { id: "HOT", label: "Hot", stage: "HOT" },
  { id: "QUALIFIED", label: "Qualified", stage: "QUALIFIED" },
  { id: "CLOSED", label: "Closed", stage: "CLOSED" },
  { id: "COLD", label: "Cold", stage: "COLD" },
];

function stageBadge(stage: LeadStage) {
  const map: Record<LeadStage, string> = {
    NEW: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    CONTACTED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    WARM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    HOT: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    COLD: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    QUALIFIED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    CLOSED: "bg-emerald-600/10 text-emerald-600 border-emerald-600/20",
    LOST: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${map[stage]}`}
    >
      {stage}
    </span>
  );
}

export default function LeadsDashboard({
  initialLeads,
  kpis,
}: {
  initialLeads: LeadRow[];
  kpis: Kpis;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, stageFilter]);

  const aiSuggested = useMemo(
    () =>
      [...leads]
        .filter((l) => l.intentScore >= 60 && l.stage !== "CLOSED" && l.stage !== "LOST")
        .sort((a, b) => b.intentScore - a.intentScore)
        .slice(0, 5),
    [leads]
  );

  async function refresh() {
    const r = await fetch("/api/calls/leads?pageSize=100", { cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as { items: LeadRow[] };
    setLeads(j.items);
  }

  async function startAICall(lead: LeadRow) {
    const body = {
      to: lead.phone,
      name: lead.name,
      company: "",
      product: "Our Product",
      perks_of_product: "",
      info_about_lead: lead.notes ?? "",
      languageMode: "english",
      voiceMode: "speed",
      llm_provider: "groq",
      leadId: lead.id,
    };
    const res = await fetch("/api/calling-agent/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Call failed: ${j.error ?? res.statusText}`);
      return;
    }
    alert(`AI call queued for ${lead.name}`);
    startTransition(() => router.refresh());
  }

  const columns: CallsTableColumn<LeadRow>[] = [
    {
      key: "name",
      header: "Lead",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-[11px] text-muted-foreground/70">{r.phone}</span>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      cell: (r) => stageBadge(r.stage),
    },
    {
      key: "intent",
      header: "Intent",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-14 rounded-full bg-[var(--glass-hover)]">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
              style={{ width: `${Math.max(4, r.intentScore)}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold tabular-nums">{r.intentScore}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      cell: (r) => <span className="text-muted-foreground">{r.city ?? "—"}</span>,
    },
    {
      key: "source",
      header: "Source",
      cell: (r) => (
        <span className="text-[12px] text-muted-foreground/80">{r.source ?? "—"}</span>
      ),
    },
    {
      key: "last",
      header: "Last Contact",
      cell: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {formatRelative(r.lastContactAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void startAICall(r);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-1 text-[11px] font-medium text-foreground hover:bg-[var(--sibling-primary)]/10 hover:text-[var(--sibling-primary)] transition-colors"
          >
            <PhoneCall className="w-3 h-3" /> Call
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Leads"
        description="Prospects sourced across channels. Start an AI call, run a campaign, or schedule a follow-up."
        actions={
          <>
            <button
              type="button"
              onClick={() => setOpenImport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--glass-hover)] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <button
              type="button"
              onClick={() => setOpenAdd(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Lead
            </button>
          </>
        }
      />

      <KpiRow
        items={[
          { label: "Total Leads", value: kpis.total.toLocaleString(), icon: Users },
          { label: "Hot Leads", value: kpis.hot.toLocaleString(), icon: Flame },
          { label: "Warm Leads", value: kpis.warm.toLocaleString(), icon: TrendingUp },
          { label: "Uncontacted", value: kpis.uncontacted.toLocaleString(), icon: Snowflake },
          {
            label: "Converted Today",
            value: kpis.convertedToday.toLocaleString(),
            icon: Sparkles,
          },
          {
            label: "Shown",
            value: filtered.length.toLocaleString(),
            hint: `of ${leads.length} loaded`,
          },
        ]}
      />

      {aiSuggested.length > 0 && (
        <section className="glass-card rounded-xl border border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)]/5 p-4">
          <header className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--sibling-primary)]" />
            <h2 className="font-heading text-sm font-semibold">AI Suggested — High Intent</h2>
          </header>
          <p className="mt-0.5 text-[12px] text-muted-foreground/80">
            Leads with the highest scoring — dial these first.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {aiSuggested.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => startAICall(l)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--sibling-primary)]/10 transition-colors"
              >
                <span>{l.name}</span>
                <span className="rounded-full bg-[var(--sibling-primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sibling-primary)]">
                  {l.intentScore}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          chips={STAGE_CHIPS.map((c) => ({ id: c.id, label: c.label }))}
          activeId={stageFilter}
          onChange={setStageFilter}
        />
        <label className="relative inline-flex max-w-xs flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 py-2 pl-8 pr-3 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
          />
        </label>
      </div>

      <CallsTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        onRowClick={(r) => setActiveLead(r)}
        empty={
          <div className="text-sm text-muted-foreground">
            No leads yet. <button onClick={() => setOpenAdd(true)} className="text-[var(--sibling-primary)] hover:underline">Add your first lead</button> or import a CSV.
          </div>
        }
      />

      <AddLeadDrawer
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={() => {
          setOpenAdd(false);
          void refresh();
          startTransition(() => router.refresh());
        }}
      />
      <ImportDrawer
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImported={() => {
          setOpenImport(false);
          void refresh();
          startTransition(() => router.refresh());
        }}
      />
      <LeadDetailDrawer
        lead={activeLead}
        onClose={() => setActiveLead(null)}
        onAction={(action) => {
          if (!activeLead) return;
          if (action === "call") startAICall(activeLead);
        }}
      />

      {isPending && (
        <div className="text-[12px] text-muted-foreground/70">Refreshing…</div>
      )}
    </div>
  );
}

function AddLeadDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const tags = String(fd.get("tags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const productExternalIdRaw = String(fd.get("productExternalId") ?? "").trim();
    const productNameRaw = String(fd.get("productName") ?? "").trim();

    const productProvider =
      productExternalIdRaw.startsWith("gid://")
        ? "Shopify"
        : /^\d+$/.test(productExternalIdRaw)
          ? "WooCommerce"
          : null;

    const body: Record<string, unknown> = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email") || null,
      city: fd.get("city") || null,
      industry: fd.get("industry") || null,
      source: fd.get("source") || null,
      intentScore: Number(fd.get("intentScore") ?? 0),
      notes: fd.get("notes") || null,
      tags,
      productProvider,
      productExternalId: productExternalIdRaw || null,
      productName: productNameRaw || null,
    };
    const res = await fetch("/api/calls/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create lead");
      return;
    }
    onCreated();
  }

  return (
    <DetailDrawer open={open} title="Add Lead" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 text-[13px]">
        <Field label="Name" name="name" required />
        <Field label="Phone" name="phone" required placeholder="+15551234567" />
        <Field label="Email" name="email" type="email" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" />
          <Field label="Industry" name="industry" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source" name="source" placeholder="Meta Ads, Website, etc." />
          <Field label="Intent (0–100)" name="intentScore" type="number" defaultValue="0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Product ID (Shopify GID / Woo ID)"
            name="productExternalId"
            placeholder="gid://shopify/Product/... or 1234"
          />
          <Field label="Product name" name="productName" placeholder="Fallback for lookup" />
        </div>
        <Field label="Tags (comma separated)" name="tags" />
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Notes
          </span>
          <textarea
            name="notes"
            rows={3}
            className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
          />
        </label>
        {error && <div className="text-[12px] text-rose-500">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Lead"}
        </button>
      </form>
    </DetailDrawer>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
      />
    </label>
  );
}

function ImportDrawer({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUpload() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/calls/leads/import", { method: "POST", body: fd });
    setSubmitting(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "Import failed");
      return;
    }
    setResult({ created: j.created, skipped: j.skipped });
  }

  return (
    <DetailDrawer open={open} title="Import Leads (CSV)" onClose={onClose}>
      <div className="flex flex-col gap-3 text-[13px]">
        <p className="text-muted-foreground/80">
          Required columns: <code>name</code>, <code>phone</code>. Optional:{" "}
          <code>
            email, city, industry, source, intentScore, tags, notes, timezone, product_id,
            product_name
          </code>
          .
          Tags may be pipe-separated (<code>a|b|c</code>).
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-[12px]"
        />
        <button
          type="button"
          disabled={!file || submitting}
          onClick={onUpload}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Uploading…" : "Upload"}
        </button>
        {error && <div className="text-[12px] text-rose-500">{error}</div>}
        {result && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[12px] text-emerald-600">
            Imported {result.created} leads · {result.skipped} skipped.{" "}
            <button onClick={onImported} className="underline">
              Close
            </button>
          </div>
        )}
      </div>
    </DetailDrawer>
  );
}

function LeadDetailDrawer({
  lead,
  onClose,
  onAction,
}: {
  lead: LeadRow | null;
  onClose: () => void;
  onAction: (a: "call") => void;
}) {
  return (
    <DetailDrawer
      open={!!lead}
      title={lead?.name ?? ""}
      subtitle={lead?.phone}
      onClose={onClose}
      footer={
        lead ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/calls/ai-calls?leadId=${lead.id}`}
              className="text-[12px] text-[var(--sibling-primary)] hover:underline"
            >
              View call history →
            </Link>
            <button
              type="button"
              onClick={() => onAction("call")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[12px] font-semibold text-white hover:brightness-110"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Start AI Call
            </button>
          </div>
        ) : null
      }
    >
      {lead && (
        <dl className="grid grid-cols-1 gap-3 text-[13px]">
          <Def label="Stage" value={stageBadge(lead.stage)} />
          <Def label="Intent" value={`${lead.intentScore} / 100`} />
          <Def label="Email" value={lead.email ?? "—"} />
          <Def label="City" value={lead.city ?? "—"} />
          <Def label="Industry" value={lead.industry ?? "—"} />
          <Def label="Source" value={lead.source ?? "—"} />
          <Def label="Last Contact" value={formatRelative(lead.lastContactAt)} />
          <Def
            label="Tags"
            value={
              lead.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-0.5 text-[10.5px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          <Def label="Notes" value={lead.notes ?? "—"} />
        </dl>
      )}
    </DetailDrawer>
  );
}

function Def({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--glass-border)]/60 pb-2 last:border-b-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
