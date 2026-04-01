'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUploadWithProgress } from "../../ingestion/useUploadWithProgress";
import { AssetVideoModal } from "@/app/components/ingestion";
import { ImagePreviewModal } from "@/app/components/general/ImagePreviewModal";
import { DocumentPreviewModal } from "@/app/components/general/DocumentPreviewModal";
import { ViewMoreDropdown } from "@/app/components/common/UI/ViewMoreDropdown";
import type { AssetCardData } from "@/app/components/common/AssetCard";
import MiniLoadingAnimation from "@/app/components/animations/loading/miniLoading";

type GeoSourceType = "FILE" | "TEXT" | "URL";

type GeoDataSource = {
  id: string;
  companyId: string;
  sourceType: GeoSourceType;
  label: string;
  rawContent: string | null;
  isActive: boolean;
  createdAt: string;
  asset?: {
    id: string;
    assetType: string;
    title: string;
    filename: string;
    status: string;
    thumbnailUrl?: string | null;
    playbackUrl?: string | null;
    duration?: number | null;
    resolution?: string | null;
    createdAt: string;
  } | null;
};

type Props = {
  initialSources: GeoDataSource[];
  initialCompany: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    email: string | null;
  } | null;
  initialBrandEntity: {
    id: string;
    canonicalName: string | null;
    aliases: string[];
    entityType: string;
    oneLiner: string | null;
    about: string | null;
    industry: string | null;
    category: string | null;
    headquartersCity: string | null;
    headquartersCountry: string | null;
    foundedYear: number | null;
    employeeRange: string | null;
    businessModel: string | null;
    topics: string[];
    keywords: string[];
    targetAudiences: string[];
  } | null;
  initialOfferings: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    offeringType: string;
    url: string | null;
    keywords: string[];
    useCases: string[];
    targetAudiences: string[];
    differentiators: string[];
    competitors: string[];
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  initialBranding: {
    id: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    banner: string | null;
    themeMusic: string | null;
    primaryColor: string;
    secondaryColor: string;
    bgColor: string;
    surfaceColor: string;
    textColor: string;
    companyAddress: string | null;
  } | null;
};

type TabId = "file" | "text" | "url";
type BrandSectionTab = "company" | "entity" | "offerings" | "branding" | "library";
type FilterType = "ALL" | "FILE" | "TEXT" | "URL";
type SortField = "date" | "label" | "type";
type SortDir = "asc" | "desc";

const SOURCE_LABEL_PRESETS = [
  "Pitch deck",
  "Product deck",
  "LinkedIn",
  "Website URL",
  "Video/images",
  "Others",
] as const;
type SourceLabelPreset = (typeof SOURCE_LABEL_PRESETS)[number];

const IconFile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconText = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="17" y1="10" x2="3" y2="10" />
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" />
    <line x1="17" y1="18" x2="3" y2="18" />
  </svg>
);

const IconLink = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconImage = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

function formatCreatedAt(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const iso = d.toISOString(); // always UTC, consistent on server & client
  const datePart = iso.slice(0, 10); // YYYY-MM-DD
  const timePart = iso.slice(11, 16); // HH:MM
  return `${datePart} at ${timePart} UTC`;
}

function sourceTypeIcon(s: GeoDataSource) {
  if (s.sourceType === "FILE" && s.asset) {
    switch (s.asset.assetType) {
      case "VIDEO": return <IconPlay />;
      case "IMAGE": return <IconImage />;
      default: return <IconFile />;
    }
  }
  if (s.sourceType === "TEXT") return <IconText />;
  if (s.sourceType === "URL") return <IconLink />;
  return <IconFile />;
}

function arrToText(arr: string[]) {
  return (arr && arr.length) ? arr.join(", ") : "";
}
function textToArr(text: string) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const inputClass = "w-full rounded-md border border-[var(--glass-border)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";
const labelClass = "text-xs font-medium text-muted-foreground";
const btnPrimary = "inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60";

function CompanyProfileForm({
  company,
  onSave,
}: {
  company: NonNullable<Props["initialCompany"]>;
  onSave: (p: { description?: string; logoUrl?: string; website?: string; email?: string }) => void;
}) {
  const [description, setDescription] = useState(company.description ?? "");
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [saving, setSaving] = useState(false);
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await onSave({ description: description.trim() || undefined, logoUrl: logoUrl.trim() || undefined, website: website.trim() || undefined, email: email.trim() });
      } finally {
        setSaving(false);
      }
    },
    [onSave, description, logoUrl, website, email]
  );
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <label className={labelClass}>Company name</label>
        <p className="text-sm text-foreground font-medium">{company.name}</p>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Description</label>
        <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Company description" />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Logo URL</label>
        <input className={inputClass} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Website</label>
        <input className={inputClass} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Email</label>
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@company.com" required />
      </div>
      <button type="submit" disabled={saving} className={btnPrimary}>Save profile</button>
    </form>
  );
}

function BrandEntityForm({
  brandEntity,
  onSave,
}: {
  brandEntity: Props["initialBrandEntity"];
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [canonicalName, setCanonicalName] = useState(brandEntity?.canonicalName ?? "");
  const [oneLiner, setOneLiner] = useState(brandEntity?.oneLiner ?? "");
  const [about, setAbout] = useState(brandEntity?.about ?? "");
  const [industry, setIndustry] = useState(brandEntity?.industry ?? "");
  const [category, setCategory] = useState(brandEntity?.category ?? "");
  const [headquartersCity, setHeadquartersCity] = useState(brandEntity?.headquartersCity ?? "");
  const [headquartersCountry, setHeadquartersCountry] = useState(brandEntity?.headquartersCountry ?? "");
  const [foundedYear, setFoundedYear] = useState(brandEntity?.foundedYear ?? "");
  const [employeeRange, setEmployeeRange] = useState(brandEntity?.employeeRange ?? "");
  const [businessModel, setBusinessModel] = useState(brandEntity?.businessModel ?? "");
  const [topicsText, setTopicsText] = useState(arrToText(brandEntity?.topics ?? []));
  const [keywordsText, setKeywordsText] = useState(arrToText(brandEntity?.keywords ?? []));
  const [targetAudiencesText, setTargetAudiencesText] = useState(arrToText(brandEntity?.targetAudiences ?? []));
  const [saving, setSaving] = useState(false);
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await onSave({
          canonicalName: canonicalName.trim() || null,
          oneLiner: oneLiner.trim() || null,
          about: about.trim() || null,
          industry: industry.trim() || null,
          category: category.trim() || null,
          headquartersCity: headquartersCity.trim() || null,
          headquartersCountry: headquartersCountry.trim() || null,
          foundedYear: foundedYear === "" ? null : Number(foundedYear),
          employeeRange: employeeRange.trim() || null,
          businessModel: businessModel.trim() || null,
          topics: textToArr(topicsText),
          keywords: textToArr(keywordsText),
          targetAudiences: textToArr(targetAudiencesText),
        });
      } finally {
        setSaving(false);
      }
    },
    [onSave, canonicalName, oneLiner, about, industry, category, headquartersCity, headquartersCountry, foundedYear, employeeRange, businessModel, topicsText, keywordsText, targetAudiencesText]
  );
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Canonical name</label>
          <input className={inputClass} value={canonicalName} onChange={(e) => setCanonicalName(e.target.value)} placeholder="Acme Inc." />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>One-liner (≤160 chars)</label>
          <input className={inputClass} maxLength={500} value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="Short citation-ready description" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>About</label>
        <textarea className={inputClass} rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Longer description" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Industry</label>
          <input className={inputClass} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. SaaS" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Category</label>
          <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Marketing" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Headquarters city</label>
          <input className={inputClass} value={headquartersCity} onChange={(e) => setHeadquartersCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Headquarters country</label>
          <input className={inputClass} value={headquartersCountry} onChange={(e) => setHeadquartersCountry(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Founded year</label>
          <input className={inputClass} type="number" min={1800} max={2100} value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="2020" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Employee range</label>
          <input className={inputClass} value={employeeRange} onChange={(e) => setEmployeeRange(e.target.value)} placeholder="1-10" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Business model</label>
          <input className={inputClass} value={businessModel} onChange={(e) => setBusinessModel(e.target.value)} placeholder="B2B, B2C" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Topics (comma or newline)</label>
        <textarea className={inputClass} rows={2} value={topicsText} onChange={(e) => setTopicsText(e.target.value)} placeholder="video marketing, AI clips" />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Keywords (comma or newline)</label>
        <textarea className={inputClass} rows={2} value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Target audiences (comma or newline)</label>
        <textarea className={inputClass} rows={2} value={targetAudiencesText} onChange={(e) => setTargetAudiencesText(e.target.value)} />
      </div>
      <button type="submit" disabled={saving} className={btnPrimary}>Save brand entity</button>
    </form>
  );
}

function OfferingsSection({
  offerings,
  hasBrandEntity,
  onCreate,
  onUpdate,
  onDelete,
}: {
  offerings: Props["initialOfferings"];
  hasBrandEntity: boolean;
  onCreate: (p: Record<string, unknown>) => void;
  onUpdate: (id: string, p: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [offeringType, setOfferingType] = useState("PRODUCT");
  const [url, setUrl] = useState("");
  const [differentiatorsText, setDifferentiatorsText] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOffering, setViewOffering] = useState<Props["initialOfferings"][0] | null>(null);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setSubmitting(true);
      try {
        await onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          offeringType,
          url: url.trim() || undefined,
          differentiators: textToArr(differentiatorsText),
          competitors: textToArr(competitorsText),
          isPrimary,
        });
        setName("");
        setDescription("");
        setUrl("");
        setDifferentiatorsText("");
        setCompetitorsText("");
        setIsPrimary(false);
      } finally {
        setSubmitting(false);
      }
    },
    [onCreate, name, description, offeringType, url, differentiatorsText, competitorsText, isPrimary]
  );

  if (!hasBrandEntity) {
    return (
      <div className="rounded-md border border-dashed border-[var(--glass-border)] p-4 text-xs text-muted-foreground">
        Create and save a Brand identity in the &quot;Brand identity&quot; tab first, then add offerings here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-4 max-w-xl p-4 rounded-lg bg-[var(--glass)] card-anime-float">
        <h3 className="text-xs font-semibold text-foreground">Add offering</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Product or service name" required />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Type</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{offeringType === "PRODUCT" ? "Product" : offeringType === "SERVICE" ? "Service" : offeringType === "FEATURE" ? "Feature" : offeringType === "INTEGRATION" ? "Integration" : "Plan"}</span>
              <ViewMoreDropdown tooltipContent="Offering type" align="left">
                {(close) => (
                  <div className="py-1">
                    {(["PRODUCT", "SERVICE", "FEATURE", "INTEGRATION", "PLAN"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => { setOfferingType(t); close(); }} className={`w-full px-3 py-2 text-left text-sm ${offeringType === t ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>
                        {t === "PRODUCT" ? "Product" : t === "SERVICE" ? "Service" : t === "FEATURE" ? "Feature" : t === "INTEGRATION" ? "Integration" : "Plan"}
                      </button>
                    ))}
                  </div>
                )}
              </ViewMoreDropdown>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>URL</label>
          <input className={inputClass} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Landing page" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Differentiators (comma or newline)</label>
          <textarea className={inputClass} rows={2} value={differentiatorsText} onChange={(e) => setDifferentiatorsText(e.target.value)} placeholder="no watermark, AI-powered" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Competitors (comma or newline)</label>
          <textarea className={inputClass} rows={2} value={competitorsText} onChange={(e) => setCompetitorsText(e.target.value)} placeholder="Opus Clip, Vidyo.ai" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isPrimary" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded border-[var(--glass-border)]" />
          <label htmlFor="isPrimary" className={labelClass}>Primary offering</label>
        </div>
        <button type="submit" disabled={submitting || !name.trim()} className={btnPrimary}>Add offering</button>
      </form>

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2">Offerings ({offerings.length})</h3>
        {offerings.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--glass-border)] p-4 text-xs text-muted-foreground">No offerings yet.</div>
        ) : (
          <ul className="space-y-2">
            {offerings.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[var(--glass)]/90 to-[var(--glass)] px-3.5 py-2.5 text-xs card-anime-float"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{o.name}</span>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {o.offeringType.toLowerCase()}
                    </span>
                    {o.isPrimary && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        Primary
                      </span>
                    )}
                    {!o.isActive && (
                      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  {o.differentiators?.length ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {o.differentiators.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {editingId === o.id ? (
                    <OfferingEditRow offering={o} onSave={(p) => { onUpdate(o.id, p); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewOffering(o)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-background/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(o.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-background/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(o.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/5 px-2.5 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {viewOffering && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setViewOffering(null)}
        >
          <div
            className="w-full max-w-3xl glass-card rounded-3xl overflow-hidden flex flex-col border border-[var(--glass-border)]/80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--glass-border)]/80 bg-gradient-to-r from-background/80 to-background/40">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground truncate">{viewOffering.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {viewOffering.offeringType}
                  </span>
                  {viewOffering.isPrimary && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">
                      Primary
                    </span>
                  )}
                  {!viewOffering.isActive && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewOffering(null)}
                className="p-2 rounded-full hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-auto text-xs text-foreground">
              {viewOffering.description && (
                <div className="rounded-xl bg-[var(--glass)]/70 border border-[var(--glass-border)]/70 p-3.5">
                  <p className="font-medium text-[11px] text-muted-foreground mb-1.5">Description</p>
                  <p className="leading-relaxed text-foreground/90">{viewOffering.description}</p>
                </div>
              )}
              {viewOffering.url && (
                <div className="rounded-xl bg-[var(--glass)]/70 border border-[var(--glass-border)]/70 p-3.5">
                  <p className="font-medium text-[11px] text-muted-foreground mb-1.5">URL</p>
                  <a
                    href={viewOffering.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                  >
                    {viewOffering.url}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              )}
              {viewOffering.differentiators?.length > 0 && (
                <div className="rounded-xl bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-3.5">
                  <p className="font-medium text-[11px] text-muted-foreground mb-1">Differentiators</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viewOffering.differentiators.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {viewOffering.useCases?.length > 0 && (
                <div className="rounded-xl bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-3.5">
                  <p className="font-medium text-[11px] text-muted-foreground mb-1">Use cases</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viewOffering.useCases.map((u, idx) => (
                      <li key={idx}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
              {viewOffering.targetAudiences?.length > 0 && (
                <div className="rounded-xl bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-3.5">
                  <p className="font-medium text-[11px] text-muted-foreground mb-1">Target audiences</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viewOffering.targetAudiences.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {viewOffering.competitors?.length > 0 && (
                <div className="rounded-xl bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-3.5">
                  <p className="font-medium text-[11px] text-muted-foreground mb-1">Competitors</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viewOffering.competitors.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OfferingEditRow({
  offering,
  onSave,
  onCancel,
}: {
  offering: Props["initialOfferings"][0];
  onSave: (p: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(offering.name);
  const [description, setDescription] = useState(offering.description ?? "");
  const [offeringType, setOfferingType] = useState(offering.offeringType);
  const [url, setUrl] = useState(offering.url ?? "");
  const [differentiatorsText, setDifferentiatorsText] = useState(arrToText(offering.differentiators ?? []));
  const [competitorsText, setCompetitorsText] = useState(arrToText(offering.competitors ?? []));
  const [isPrimary, setIsPrimary] = useState(offering.isPrimary);
  const [isActive, setIsActive] = useState(offering.isActive);
  const [saving, setSaving] = useState(false);
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await onSave({
          name: name.trim(),
          description: description.trim() || null,
          offeringType,
          url: url.trim() || null,
          differentiators: textToArr(differentiatorsText),
          competitors: textToArr(competitorsText),
          isPrimary,
          isActive,
        });
      } finally {
        setSaving(false);
      }
    },
    [onSave, name, description, offeringType, url, differentiatorsText, competitorsText, isPrimary, isActive]
  );
  return (
    <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
      <input className="w-24 rounded border border-[var(--glass-border)] bg-background px-2 py-1 text-xs text-foreground" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <div className="flex items-center gap-1">
        <span className="text-xs text-foreground">{offeringType === "PRODUCT" ? "Product" : offeringType === "SERVICE" ? "Service" : offeringType === "FEATURE" ? "Feature" : offeringType === "INTEGRATION" ? "Integration" : "Plan"}</span>
        <ViewMoreDropdown tooltipContent="Offering type" align="left">
          {(close) => (
            <div className="py-1">
              {(["PRODUCT", "SERVICE", "FEATURE", "INTEGRATION", "PLAN"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setOfferingType(t); close(); }} className={`w-full px-3 py-2 text-left text-sm ${offeringType === t ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>
                  {t === "PRODUCT" ? "Product" : t === "SERVICE" ? "Service" : t === "FEATURE" ? "Feature" : t === "INTEGRATION" ? "Integration" : "Plan"}
                </button>
              ))}
            </div>
          )}
        </ViewMoreDropdown>
      </div>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded border-[var(--glass-border)]" /> Primary</label>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-[var(--glass-border)]" /> Active</label>
      <button type="submit" disabled={saving} className={btnPrimary}>Save</button>
      <button type="button" onClick={onCancel} className="rounded-md border border-[var(--glass-border)] px-2 py-1 text-xs hover:bg-[var(--glass-hover)] text-foreground">Cancel</button>
    </form>
  );
}

function BrandingForm({
  branding,
  onSave,
}: {
  branding: Props["initialBranding"];
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(branding?.faviconUrl ?? "");
  const [banner, setBanner] = useState(branding?.banner ?? "");
  const [themeMusic, setThemeMusic] = useState(branding?.themeMusic ?? "");
  const [primaryColor, setPrimaryColor] = useState(branding?.primaryColor ?? "#D7765A");
  const [secondaryColor, setSecondaryColor] = useState(branding?.secondaryColor ?? "#8B5CF6");
  const [bgColor, setBgColor] = useState(branding?.bgColor ?? "#141414");
  const [surfaceColor, setSurfaceColor] = useState(branding?.surfaceColor ?? "#181818");
  const [textColor, setTextColor] = useState(branding?.textColor ?? "#FFFFFF");
  const [companyAddress, setCompanyAddress] = useState(branding?.companyAddress ?? "");
  const [saving, setSaving] = useState(false);
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await onSave({
          logoUrl: logoUrl.trim() || null,
          faviconUrl: faviconUrl.trim() || null,
          banner: banner.trim() || null,
          themeMusic: themeMusic.trim() || null,
          primaryColor: primaryColor || "#D7765A",
          secondaryColor: secondaryColor || "#8B5CF6",
          bgColor: bgColor || "#141414",
          surfaceColor: surfaceColor || "#181818",
          textColor: textColor || "#FFFFFF",
          companyAddress: companyAddress.trim() || null,
        });
      } finally {
        setSaving(false);
      }
    },
    [onSave, logoUrl, faviconUrl, banner, themeMusic, primaryColor, secondaryColor, bgColor, surfaceColor, textColor, companyAddress]
  );
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Logo URL</label>
          <input className={inputClass} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Favicon URL</label>
          <input className={inputClass} type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Banner URL</label>
          <input className={inputClass} type="url" value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Theme music URL</label>
          <input className={inputClass} type="url" value={themeMusic} onChange={(e) => setThemeMusic(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Company address</label>
        <input className={inputClass} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 Main St, City, Country" />
      </div>
      <h3 className="text-xs font-semibold text-foreground pt-2">Colors</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Primary", value: primaryColor, set: setPrimaryColor },
          { label: "Secondary", value: secondaryColor, set: setSecondaryColor },
          { label: "Background", value: bgColor, set: setBgColor },
          { label: "Surface", value: surfaceColor, set: setSurfaceColor },
          { label: "Text", value: textColor, set: setTextColor },
        ].map(({ label, value, set }) => (
          <div key={label} className="space-y-1.5">
            <label className={labelClass}>{label}</label>
            <div className="flex gap-2">
              <input type="color" value={value} onChange={(e) => set(e.target.value)} className="h-9 w-12 rounded border border-[var(--glass-border)] cursor-pointer" />
              <input className={inputClass} value={value} onChange={(e) => set(e.target.value)} placeholder="#hex" />
            </div>
          </div>
        ))}
      </div>
      <button type="submit" disabled={saving} className={btnPrimary}>Save branding</button>
    </form>
  );
}

export default function DataMinePageClient({
  initialSources,
  initialCompany,
  initialBrandEntity,
  initialOfferings,
  initialBranding,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("file");
  const [brandSectionTab, setBrandSectionTab] = useState<BrandSectionTab>("company");
  const [sources, setSources] = useState<GeoDataSource[]>(initialSources);
  const [company, setCompany] = useState(initialCompany);
  const [brandEntity, setBrandEntity] = useState(initialBrandEntity);
  const [offerings, setOfferings] = useState(initialOfferings);
  const [branding, setBranding] = useState(initialBranding);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);

  const [textContent, setTextContent] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [selectedSourceLabel, setSelectedSourceLabel] = useState<SourceLabelPreset>("Product deck");
  const [otherLabelSpecify, setOtherLabelSpecify] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview modals
  const [videoAsset, setVideoAsset] = useState<AssetCardData | null>(null);
  const [imagePreview, setImagePreview] = useState<{ src: string; title: string } | null>(null);
  const [docPreview, setDocPreview] = useState<{ downloadUrl: string; title: string; filename: string } | null>(null);
  const [textPreview, setTextPreview] = useState<{ label: string; content: string } | null>(null);

  const { items: uploadItems, startUpload, clearItems } = useUploadWithProgress();

  const effectiveLabel = selectedSourceLabel === "Others" ? (otherLabelSpecify.trim() || "Others") : selectedSourceLabel;

  // Preselect URL tab when label implies URL (Website URL, LinkedIn)
  useEffect(() => {
    if (selectedSourceLabel === "Website URL" || selectedSourceLabel === "LinkedIn") {
      setActiveTab("url");
    }
  }, [selectedSourceLabel]);

  const handleAutoFillFromGeo = useCallback(async () => {
    setIsAutoFilling(true);
    setAutoFillMessage(null);
    try {
      const res = await fetch("/api/geo/auto-seed", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        const msg: string =
          data?.error ??
          (data?.missing
            ? "Website URL is required before auto-filling."
            : "Failed to auto-fill company data.");
        setAutoFillMessage(msg);
        return;
      }

      if (data.company) setCompany(data.company);
      if (data.brandEntity) setBrandEntity(data.brandEntity);
      if (Array.isArray(data.offerings)) setOfferings(data.offerings);
      if (data.branding) setBranding(data.branding);

      setAutoFillMessage("Company profile, brand entity, offerings, and branding were updated from GEO.");
    } catch (err) {
      console.error("Auto-fill error", err);
      setAutoFillMessage("Something went wrong while auto-filling. Please try again.");
    } finally {
      setIsAutoFilling(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const completed = await startUpload(files, () => {});
      for (const item of completed) {
        if (!item.assetId) continue;
        const res = await fetch("/api/geo/data-mine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sourceType: "FILE",
            label: effectiveLabel || item.file.name,
            assetId: item.assetId,
          }),
        });
        const data = await res.json();
        if (data?.success && data.source) {
          setSources((prev) => [data.source as GeoDataSource, ...prev]);
        }
      }
      clearItems();
    },
    [startUpload, clearItems, effectiveLabel]
  );

  const handleCreateTextSource = useCallback(async () => {
    if (!textContent.trim()) return;
    const label = effectiveLabel;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/geo/data-mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceType: "TEXT", label, rawContent: textContent }),
      });
      const data = await res.json();
      if (data?.success && data.source) {
        setSources((prev) => [data.source as GeoDataSource, ...prev]);
        setTextContent("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [effectiveLabel, textContent]);

  const handleCreateUrlSource = useCallback(async () => {
    if (!urlValue.trim()) return;
    const label = effectiveLabel;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/geo/data-mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceType: "URL", label, rawContent: urlValue.trim() }),
      });
      const data = await res.json();
      if (data?.success && data.source) {
        setSources((prev) => [data.source as GeoDataSource, ...prev]);
        setUrlValue("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [effectiveLabel, urlValue]);

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/geo/data-mine/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = await res.json();
    if (data?.success && data.source) {
      setSources((prev) => prev.map((s) => (s.id === id ? (data.source as GeoDataSource) : s)));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/geo/data-mine/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (data?.success) {
      setSources((prev) => prev.filter((s) => s.id !== id));
    }
  }, []);

  const handlePreview = useCallback((source: GeoDataSource) => {
    if (source.sourceType === "FILE" && source.asset) {
      const a = source.asset;
      if (a.assetType === "VIDEO") {
        setVideoAsset({
          id: a.id,
          title: a.title || source.label,
          filename: a.filename,
          assetType: "VIDEO",
          status: a.status,
          thumbnailUrl: a.thumbnailUrl,
          duration: a.duration,
          resolution: a.resolution,
        });
      } else if (a.assetType === "IMAGE") {
        const src = a.thumbnailUrl || `/api/assets/${a.id}/download`;
        setImagePreview({ src, title: source.label || a.filename });
      } else {
        setDocPreview({
          downloadUrl: `/api/assets/${a.id}/download`,
          title: source.label || a.title,
          filename: a.filename,
        });
      }
    } else if (source.sourceType === "TEXT") {
      setTextPreview({ label: source.label, content: source.rawContent ?? "" });
    } else if (source.sourceType === "URL" && source.rawContent) {
      window.open(source.rawContent, "_blank", "noopener,noreferrer");
    }
  }, []);

  const saveCompanyProfile = useCallback(async (payload: { description?: string; logoUrl?: string; website?: string; email?: string }) => {
    const res = await fetch("/api/geo/company-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.success && data.company) setCompany(data.company);
  }, []);

  const saveBrandEntity = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/geo/brand-entity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.success && data.brandEntity) setBrandEntity(data.brandEntity);
  }, []);

  const createOffering = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/geo/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.success && data.offering) setOfferings((prev) => [...prev, data.offering]);
  }, []);

  const updateOffering = useCallback(async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/geo/offerings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.success && data.offering) setOfferings((prev) => prev.map((o) => (o.id === id ? data.offering : o)));
  }, []);

  const deleteOffering = useCallback(async (id: string) => {
    const res = await fetch(`/api/geo/offerings/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (data?.success) setOfferings((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const saveBranding = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/geo/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.success && data.branding) setBranding(data.branding);
  }, []);

  const filteredSorted = useMemo(() => {
    let result = [...sources];

    if (filterType !== "ALL") {
      result = result.filter((s) => s.sourceType === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          (s.rawContent ?? "").toLowerCase().includes(q) ||
          (s.asset?.filename ?? "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "label":
          cmp = a.label.localeCompare(b.label);
          break;
        case "type":
          cmp = a.sourceType.localeCompare(b.sourceType);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [sources, filterType, sortField, sortDir, searchQuery]);

  const renderThumbnail = (source: GeoDataSource) => {
    if (source.sourceType === "FILE" && source.asset) {
      const a = source.asset;
      if (a.thumbnailUrl) {
        return (
          <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50">
            <img src={a.thumbnailUrl} alt={a.title} className="w-full h-full object-cover" />
            {a.assetType === "VIDEO" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <IconPlay />
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
          {a.assetType === "VIDEO" ? <IconPlay /> : a.assetType === "IMAGE" ? <IconImage /> : <IconFile />}
        </div>
      );
    }

    return (
      <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
        {source.sourceType === "TEXT" ? <IconText /> : <IconLink />}
      </div>
    );
  };

  const renderSourcePreview = (source: GeoDataSource) => {
    if (source.sourceType === "FILE" && source.asset) {
      return source.asset.filename || source.asset.title;
    }
    if (source.sourceType === "URL") return source.rawContent ?? "";
    const text = source.rawContent ?? "";
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  };

  return (
    <div className="flex gap-6 lg:gap-8">
      {/* Left: main content (~70%) */}
      <div className="flex-1 min-w-0">
        <section className="glass-card card-anime-float rounded-xl p-5" aria-labelledby="data-mine-heading">
          <h2 id="data-mine-heading" className="text-sm font-semibold text-foreground">Data Mine</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Company profile, brand identity, offerings, visual branding, and source library for GEO and AEO.
          </p>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-[var(--glass-border)] pb-2 text-xs">
          {(
            [
              { id: "company", label: "Company profile" },
              { id: "entity", label: "Brand identity" },
              { id: "offerings", label: "Products & offerings" },
              { id: "branding", label: "Visual branding" },
              { id: "library", label: "Source library" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBrandSectionTab(id)}
              className={`px-3 py-1.5 rounded-md ${
                brandSectionTab === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-[var(--glass-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {brandSectionTab === "company" && (
            company ? <CompanyProfileForm company={company} onSave={saveCompanyProfile} /> : <div className="text-xs text-muted-foreground">Company not found.</div>
          )}
          {brandSectionTab === "entity" && (
            <BrandEntityForm brandEntity={brandEntity} onSave={saveBrandEntity} />
          )}
          {brandSectionTab === "offerings" && (
            <OfferingsSection
              offerings={offerings}
              hasBrandEntity={!!brandEntity}
              onCreate={createOffering}
              onUpdate={updateOffering}
              onDelete={deleteOffering}
            />
          )}
          {brandSectionTab === "branding" && (
            <BrandingForm branding={branding} onSave={saveBranding} />
          )}

          {/* Source library */}
          {brandSectionTab === "library" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Ingested sources used as context when hunting GEO bounties and generating AEO pages.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><IconSearch /></span>
                  <input
                    className="w-full rounded-md border border-[var(--glass-border)] bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                    placeholder="Search sources…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <ViewMoreDropdown tooltipContent="Filter & sort" align="right">
                  {(close) => (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</div>
                      {(["ALL", "FILE", "TEXT", "URL"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => { setFilterType(t); close(); }} className={`w-full px-3 py-2 text-left text-sm ${filterType === t ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>
                          {t === "ALL" ? "All types" : t === "FILE" ? "Files" : t === "TEXT" ? "Text" : "URLs"}
                        </button>
                      ))}
                      <div className="border-t border-[var(--glass-border)] my-1" />
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sort by</div>
                      {(["date", "label", "type"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => { setSortField(s); close(); }} className={`w-full px-3 py-2 text-left text-sm capitalize ${sortField === s ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>
                          {s}
                        </button>
                      ))}
                      <div className="border-t border-[var(--glass-border)] my-1" />
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Order</div>
                      <button type="button" onClick={() => { setSortDir("desc"); close(); }} className={`w-full px-3 py-2 text-left text-sm ${sortDir === "desc" ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>Newest</button>
                      <button type="button" onClick={() => { setSortDir("asc"); close(); }} className={`w-full px-3 py-2 text-left text-sm ${sortDir === "asc" ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>Oldest</button>
                    </div>
                  )}
                </ViewMoreDropdown>
              </div>
              {filteredSorted.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--glass-border)] p-4 text-xs text-muted-foreground">
                  {sources.length === 0 ? "No sources yet. Add sources from the panel on the right." : "No sources match your filters."}
                </div>
              ) : (
                <ul className="space-y-2" role="list">
                  {filteredSorted.map((source) => (
                    <li
                      key={source.id}
                      className={`flex items-start gap-3 rounded-lg bg-[var(--glass)] px-3 py-2.5 text-xs transition-opacity card-anime-float ${source.isActive ? "" : "opacity-50"}`}
                    >
                      <button type="button" onClick={() => handlePreview(source)} className="flex-shrink-0 hover:opacity-80 transition-opacity rounded-lg overflow-hidden">
                        {renderThumbnail(source)}
                      </button>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground" aria-hidden>{sourceTypeIcon(source)}</span>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {source.sourceType === "FILE" && source.asset ? source.asset.assetType : source.sourceType}
                          </span>
                          <span className="font-medium text-foreground truncate">{source.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{renderSourcePreview(source) || "No preview"}</p>
                        <p className="text-[10px] text-muted-foreground">{formatCreatedAt(source.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <button type="button" onClick={() => handlePreview(source)} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"> <IconEye /> Preview </button>
                        <button type="button" onClick={() => handleToggleActive(source.id, source.isActive)} className="text-[10px] text-muted-foreground hover:text-foreground">{source.isActive ? "Disable" : "Enable"}</button>
                        <button type="button" onClick={() => handleDelete(source.id)} className="text-[10px] text-muted-foreground hover:text-destructive">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
      </div>

      {/* Right: source ingestion sidebar (~30%) */}
      <aside className="w-full lg:w-[32%] xl:max-w-[400px] shrink-0">
        <div className="lg:sticky lg:top-6">
          <div className="space-y-4">
            <section className="glass-card card-anime-float rounded-xl p-5" aria-labelledby="ingest-heading">
              <h2 id="ingest-heading" className="text-sm font-semibold text-foreground">Add source</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload files, paste text, or add URLs. Choose a label below.
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  {/* <label className={labelClass}>Label</label> */}
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {selectedSourceLabel === "Others"
                        ? otherLabelSpecify.trim() || "Others"
                        : selectedSourceLabel}
                    </span>
                    <ViewMoreDropdown tooltipContent="Select label" align="left">
                      {(close) => (
                        <div className="py-1">
                          {SOURCE_LABEL_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setSelectedSourceLabel(preset);
                                if (preset !== "Others") {
                                  setOtherLabelSpecify("");
                                }
                                close();
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs ${
                                selectedSourceLabel === preset
                                  ? "text-primary font-medium bg-primary/10"
                                  : "text-foreground hover:bg-[var(--glass-hover)]"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      )}
                    </ViewMoreDropdown>
                  </div>
                  {selectedSourceLabel === "Others" && (
                    <input
                      type="text"
                      className={inputClass}
                      value={otherLabelSpecify}
                      onChange={(e) => setOtherLabelSpecify(e.target.value)}
                      placeholder="please specify"
                      aria-label="Custom label"
                    />
                  )}
                </div>
                <div className="flex gap-1.5 border-b border-[var(--glass-border)] pb-2 text-xs">
                  {(["file", "text", "url"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-2 py-1.5 rounded-md capitalize ${activeTab === tab ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-[var(--glass-hover)]"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {activeTab === "file" && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      multiple
                      className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) handleFileUpload(files); }}
                    />
                    {uploadItems.length > 0 && (
                      <div className="space-y-1">
                        {uploadItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-md bg-[var(--glass)] px-2 py-1.5 text-xs">
                            <span className="truncate">{item.file.name}</span>
                            <span className="text-muted-foreground tabular-nums">{item.progress}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "text" && (
                  <div className="space-y-3">
                    <textarea className={`${inputClass} h-32 resize-y min-h-[80px]`} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste context, specs, FAQs…" />
                    <button type="button" onClick={handleCreateTextSource} disabled={isSubmitting || !textContent.trim()} className={`${btnPrimary} w-full`}>Save text source</button>
                  </div>
                )}
                {activeTab === "url" && (
                  <div className="space-y-3">
                    <input className={inputClass} type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://..." />
                    <button type="button" onClick={handleCreateUrlSource} disabled={isSubmitting || !urlValue.trim()} className={`${btnPrimary} w-full`}>Save URL source</button>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-card card-anime-float rounded-xl p-5" aria-labelledby="auto-fill-heading">
              <h2 id="auto-fill-heading" className="text-sm font-semibold text-foreground">Auto-fill GEO profile</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your Sources to prefill company profile, brand entity, offerings, and branding.
              </p>
              <button
                type="button"
                onClick={handleAutoFillFromGeo}
                disabled={isAutoFilling}
                className={`${btnPrimary} mt-3 w-full justify-center`}
              >
                {isAutoFilling ? (
                  <MiniLoadingAnimation />
                 ) : (
                  "Auto-fill Using Immortell AI"
                )}
              </button>
              {autoFillMessage && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {autoFillMessage}
                </p>
              )}
              {!company?.website && (
                <p className="mt-2 text-[11px] text-amber-400">
                  Add your website URL in the Company profile tab before running auto-fill.
                </p>
              )}
            </section>
          </div>
        </div>
      </aside>

      {/* Video preview modal (reusing existing) */}
      <AssetVideoModal
        isOpen={videoAsset != null}
        asset={videoAsset}
        onClose={() => setVideoAsset(null)}
      />

      {/* Image preview modal */}
      {imagePreview && (
        <ImagePreviewModal
          isOpen
          src={imagePreview.src}
          title={imagePreview.title}
          onClose={() => setImagePreview(null)}
        />
      )}

      {/* Document preview modal */}
      {docPreview && (
        <DocumentPreviewModal
          isOpen
          downloadUrl={docPreview.downloadUrl}
          title={docPreview.title}
          filename={docPreview.filename}
          onClose={() => setDocPreview(null)}
        />
      )}

      {/* Text preview modal */}
      {textPreview && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setTextPreview(null)}
        >
          <div
            className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--glass-border)]">
              <p className="text-sm font-semibold text-foreground truncate">{textPreview.label}</p>
              <button
                type="button"
                onClick={() => setTextPreview(null)}
                className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-auto">
              <pre className="whitespace-pre-wrap text-xs text-foreground font-mono leading-relaxed">{textPreview.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
