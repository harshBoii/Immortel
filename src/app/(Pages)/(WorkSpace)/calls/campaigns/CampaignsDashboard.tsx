"use client";

import { useMemo, useState } from "react";
import {
  Megaphone,
  Play,
  PauseCircle,
  Plus,
  Volume2,
  MessageSquare,
  Mail,
  Phone,
} from "lucide-react";
import type { CampaignStatus, CampaignType } from "@prisma/client";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import {
  CallsTable,
  type CallsTableColumn,
} from "@/app/components/calls/common/CallsTable";
import { FilterChips } from "@/app/components/calls/common/FilterChips";
import { DetailDrawer } from "@/app/components/calls/common/DetailDrawer";
import { formatRelative } from "@/app/components/calls/common/format";

export type CampaignRow = {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  sentCount: number;
  deliveredCount: number;
  replyCount: number;
  conversionCount: number;
  createdAt: string;
};

type Kpis = {
  active: number;
  paused: number;
  drafts: number;
  ended: number;
};

const TYPE_CHIPS = [
  { id: "all", label: "All" },
  { id: "VOICE", label: "Voice" },
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "SMS", label: "SMS" },
  { id: "EMAIL", label: "Email" },
];

const TYPE_ICONS: Record<CampaignType, React.ComponentType<{ className?: string }>> = {
  VOICE: Volume2,
  WHATSAPP: MessageSquare,
  SMS: Phone,
  EMAIL: Mail,
};

function statusBadge(s: CampaignStatus) {
  const map: Record<CampaignStatus, string> = {
    DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    RUNNING: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    PAUSED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    COMPLETED: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${map[s]}`}
    >
      {s}
    </span>
  );
}

export default function CampaignsDashboard({
  kpis,
  initial,
}: {
  kpis: Kpis;
  initial: CampaignRow[];
}) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initial);
  const [typeFilter, setTypeFilter] = useState("all");
  const [openCreate, setOpenCreate] = useState(false);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return campaigns;
    return campaigns.filter((c) => c.type === typeFilter);
  }, [campaigns, typeFilter]);

  async function refresh() {
    const r = await fetch("/api/calls/campaigns?pageSize=100", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { items: CampaignRow[] };
      setCampaigns(j.items);
    }
  }

  async function start(c: CampaignRow) {
    if (c.type !== "VOICE") {
      alert(`${c.type} campaigns aren't wired yet — voice only.`);
      return;
    }
    if (!confirm(`Start "${c.name}"? This will dispatch calls to all matching leads.`))
      return;
    const r = await fetch(`/api/calls/campaigns/${c.id}/start`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(`Failed: ${j.error ?? r.statusText}`);
      return;
    }
    alert(`Dispatched ${j.triggered} / ${j.total}. ${j.failed} failed.`);
    await refresh();
  }

  async function setStatus(c: CampaignRow, status: CampaignStatus) {
    const r = await fetch(`/api/calls/campaigns/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) await refresh();
  }

  const columns: CallsTableColumn<CampaignRow>[] = [
    {
      key: "name",
      header: "Campaign",
      cell: (r) => {
        const Icon = TYPE_ICONS[r.type];
        return (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)]">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="text-[11px] text-muted-foreground/70">
                {r.type}
                {r.type !== "VOICE" && (
                  <span className="ml-1 rounded-sm bg-amber-500/15 px-1 text-[9px] font-semibold uppercase text-amber-500">
                    Coming Soon
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      },
    },
    { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
    {
      key: "sent",
      header: "Sent",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.sentCount}</span>,
    },
    {
      key: "delivered",
      header: "Delivered",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.deliveredCount}</span>,
    },
    {
      key: "replied",
      header: "Replied",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.replyCount}</span>,
    },
    {
      key: "converted",
      header: "Converted",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums font-semibold text-emerald-500">
          {r.conversionCount}
        </span>
      ),
    },
    {
      key: "when",
      header: "Created",
      cell: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {formatRelative(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.type === "VOICE" && (r.status === "DRAFT" || r.status === "PAUSED") && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void start(r);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/25"
            >
              <Play className="w-3 h-3" /> Start
            </button>
          )}
          {r.status === "RUNNING" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void setStatus(r, "PAUSED" as CampaignStatus);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-500 hover:bg-amber-500/25"
            >
              <PauseCircle className="w-3 h-3" /> Pause
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Campaigns"
        description="Run outbound voice campaigns across your leads. SMS / WhatsApp / Email coming soon."
        actions={
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </button>
        }
      />

      <KpiRow
        items={[
          { label: "Active", value: kpis.active.toLocaleString(), icon: Play },
          { label: "Paused", value: kpis.paused.toLocaleString(), icon: PauseCircle },
          { label: "Drafts", value: kpis.drafts.toLocaleString(), icon: Megaphone },
          { label: "Completed", value: kpis.ended.toLocaleString() },
          { label: "Total", value: campaigns.length.toLocaleString() },
          {
            label: "Voice",
            value: campaigns.filter((c) => c.type === "VOICE").length.toLocaleString(),
            icon: Volume2,
          },
        ]}
      />

      <FilterChips chips={TYPE_CHIPS} activeId={typeFilter} onChange={setTypeFilter} />

      <CallsTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        empty={
          <div className="text-sm text-muted-foreground">
            No campaigns yet. Click <em>New Campaign</em> to create your first voice
            campaign.
          </div>
        }
      />

      <CreateCampaignDrawer
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setOpenCreate(false);
          void refresh();
        }}
      />
    </div>
  );
}

function CreateCampaignDrawer({
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
  const [type, setType] = useState<CampaignType>("VOICE");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const audience = {
      stage: (fd.getAll("stage") as string[]).filter(Boolean),
      minIntentScore: Number(fd.get("minIntent") ?? 0) || 0,
      uncontactedOnly: fd.get("uncontactedOnly") === "on",
    };

    const script =
      type === "VOICE"
        ? {
            product: String(fd.get("product") ?? ""),
            perks_of_product: String(fd.get("perks") ?? ""),
            opening_greeting: String(fd.get("opening") ?? ""),
            system_prompt: String(fd.get("system_prompt") ?? ""),
            questions_to_ask: String(fd.get("questions") ?? ""),
            language: String(fd.get("language") ?? "English"),
            llm_provider: "groq",
            voiceMode: "speed",
          }
        : {};

    const body = {
      name: String(fd.get("name") ?? "").trim(),
      type,
      audience,
      script,
    };

    const res = await fetch("/api/calls/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed");
      return;
    }
    onCreated();
  }

  return (
    <DetailDrawer
      open={open}
      title="New Campaign"
      onClose={onClose}
      widthClass="w-full sm:w-[560px]"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3 text-[13px]">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Name *
          </span>
          <input
            name="name"
            required
            className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
          />
        </label>

        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Channel
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["VOICE", "WHATSAPP", "SMS", "EMAIL"] as CampaignType[]).map((t) => {
              const disabled = t !== "VOICE";
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => !disabled && setType(t)}
                  disabled={disabled}
                  className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]"
                      : disabled
                        ? "border-[var(--glass-border)] bg-[var(--glass)]/30 text-muted-foreground/40 cursor-not-allowed"
                        : "border-[var(--glass-border)] bg-[var(--glass)]/60 hover:bg-[var(--glass-hover)]"
                  }`}
                >
                  {t}
                  {disabled && (
                    <span className="ml-1.5 text-[9px] uppercase">Soon</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <fieldset className="rounded-lg border border-[var(--glass-border)] p-3">
          <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Audience Filter
          </legend>
          <label className="flex flex-col gap-1">
            <span className="text-[11px]">Stages (blank = all)</span>
            <select name="stage" multiple className="h-24 rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2 text-[12px]">
              {["NEW", "CONTACTED", "WARM", "HOT", "QUALIFIED", "COLD"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-[11px]">Min Intent Score</span>
            <input
              name="minIntent"
              type="number"
              min={0}
              max={100}
              defaultValue={0}
              className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-[12px]">
            <input name="uncontactedOnly" type="checkbox" /> Uncontacted only
          </label>
        </fieldset>

        {type === "VOICE" && (
          <fieldset className="rounded-lg border border-[var(--glass-border)] p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Voice Script
            </legend>
            <label className="flex flex-col gap-1">
              <span className="text-[11px]">Product / offer</span>
              <input
                name="product"
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
              />
            </label>
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[11px]">Perks</span>
              <textarea
                name="perks"
                rows={2}
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
              />
            </label>
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[11px]">Opening greeting</span>
              <input
                name="opening"
                placeholder="Hi, this is Neha from…"
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
              />
            </label>
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[11px]">System prompt</span>
              <textarea
                name="system_prompt"
                rows={3}
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
              />
            </label>
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[11px]">Questions to ask</span>
              <textarea
                name="questions"
                rows={2}
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
              />
            </label>
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[11px]">Language</span>
              <select
                name="language"
                defaultValue="English"
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5"
              >
                {["English", "Hindi", "Marathi", "Tamil", "Telugu", "Bengali"].map(
                  (l) => (
                    <option key={l}>{l}</option>
                  )
                )}
              </select>
            </label>
          </fieldset>
        )}

        {error && <div className="text-[12px] text-rose-500">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Campaign"}
        </button>
      </form>
    </DetailDrawer>
  );
}
