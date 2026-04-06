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
  id: string; companyId: string; sourceType: GeoSourceType; label: string;
  rawContent: string | null; isActive: boolean; createdAt: string;
  asset?: { id: string; assetType: string; title: string; filename: string; status: string;
    thumbnailUrl?: string | null; playbackUrl?: string | null; duration?: number | null;
    resolution?: string | null; createdAt: string; } | null;
};
type RivalCompany = { id: string; name: string; slug: string; domain: string | null; website: string | null;
  logoUrl: string | null; description: string | null; isExternal: boolean; createdAt: string; updatedAt: string; };
type RivalLink = { id: string; companyId: string; rivalCompanyId: string; createdAt: string; rivalCompany: RivalCompany; };

type Props = {
  initialSources: GeoDataSource[];
  initialCompany: { id: string; name: string; description: string | null; logoUrl: string | null; website: string | null; email: string | null; } | null;
  initialBrandEntity: { id: string; canonicalName: string | null; aliases: string[]; entityType: string; oneLiner: string | null;
    about: string | null; industry: string | null; category: string | null; headquartersCity: string | null;
    headquartersCountry: string | null; foundedYear: number | null; employeeRange: string | null; businessModel: string | null;
    topics: string[]; keywords: string[]; targetAudiences: string[]; } | null;
  initialOfferings: Array<{ id: string; name: string; slug: string; description: string | null; offeringType: string; url: string | null;
    keywords: string[]; useCases: string[]; targetAudiences: string[]; differentiators: string[]; competitors: string[];
    isPrimary: boolean; isActive: boolean; createdAt: string; updatedAt: string; }>;
  initialBranding: { id: string; logoUrl: string | null; faviconUrl: string | null; banner: string | null; themeMusic: string | null;
    primaryColor: string; secondaryColor: string; bgColor: string; surfaceColor: string; textColor: string; companyAddress: string | null; } | null;
};

type TabId = "file" | "text" | "url";
type BrandSectionTab = "company" | "entity" | "offerings" | "branding" | "library";
type FilterType = "ALL" | "FILE" | "TEXT" | "URL";
type SortField = "date" | "label" | "type";
type SortDir = "asc" | "desc";

const SOURCE_LABEL_PRESETS = ["Pitch deck", "Product deck", "LinkedIn", "Website URL", "Video/images", "Others"] as const;
type SourceLabelPreset = (typeof SOURCE_LABEL_PRESETS)[number];

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconFile = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconText = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>;
const IconLink = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconPlay = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconSparkle = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.88 5.76L20 10l-5.76 1.88L12 18l-1.88-5.76L4 10l5.76-1.88z"/></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconExternalLink = () => <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconSwords = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="21" x2="9" y2="19"/></svg>;
const IconDatabase = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCreatedAt(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} at ${iso.slice(11, 16)} UTC`;
}
function sourceTypeIcon(s: GeoDataSource) {
  if (s.sourceType === "FILE" && s.asset) {
    switch (s.asset.assetType) { case "VIDEO": return <IconPlay />; case "IMAGE": return <IconImage />; default: return <IconFile />; }
  }
  if (s.sourceType === "TEXT") return <IconText />;
  if (s.sourceType === "URL") return <IconLink />;
  return <IconFile />;
}
function arrToText(arr: string[]) { return (arr && arr.length) ? arr.join(", ") : ""; }
function textToArr(text: string) { return text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean); }
function getInitials(name: string) { return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2); }

// ─── Style tokens ─────────────────────────────────────────────────────────────
const inputClass = "w-full rounded-lg border border-[var(--glass-border)] bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors";
const labelClass = "block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all";
const btnGhost = "inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] transition-colors";
const btnDestructive = "inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors";

// ─── FieldGroup ───────────────────────────────────────────────────────────────
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--glass-border)]/50 bg-[var(--glass)]/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{label}</p>
      {children}
    </div>
  );
}

// ─── CompanyProfileForm ───────────────────────────────────────────────────────
function CompanyProfileForm({ company, onSave }: { company: NonNullable<Props["initialCompany"]>; onSave: (p: { description?: string; logoUrl?: string; website?: string; email?: string }) => void; }) {
  const [description, setDescription] = useState(company.description ?? "");
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ description: description.trim() || undefined, logoUrl: logoUrl.trim() || undefined, website: website.trim() || undefined, email: email.trim() }); }
    finally { setSaving(false); }
  }, [onSave, description, logoUrl, website, email]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)]/50 bg-gradient-to-r from-primary/5 to-transparent p-3.5">
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold select-none">{getInitials(company.name)}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{company.name}</p>
          <p className="text-[11px] text-muted-foreground/60">Company profile</p>
        </div>
      </div>
      <FieldGroup label="Identity">
        <div className="space-y-1.5">
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what the company does…" />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Logo URL</label>
          <input className={inputClass} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
        </div>
      </FieldGroup>
      <FieldGroup label="Contact & Web">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Website</label><input className={inputClass} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Email</label><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@company.com" required /></div>
        </div>
      </FieldGroup>
      <div className="flex justify-end pt-1"><button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save profile"}</button></div>
    </form>
  );
}

// ─── BrandEntityForm ──────────────────────────────────────────────────────────
function BrandEntityForm({ brandEntity, onSave }: { brandEntity: Props["initialBrandEntity"]; onSave: (p: Record<string, unknown>) => void; }) {
  const [canonicalName, setCanonicalName] = useState(brandEntity?.canonicalName ?? "");
  const [oneLiner, setOneLiner] = useState(brandEntity?.oneLiner ?? "");
  const [about, setAbout] = useState(brandEntity?.about ?? "");
  const [industry, setIndustry] = useState(brandEntity?.industry ?? "");
  const [category, setCategory] = useState(brandEntity?.category ?? "");
  const [headquartersCity, setHeadquartersCity] = useState(brandEntity?.headquartersCity ?? "");
  const [headquartersCountry, setHeadquartersCountry] = useState(brandEntity?.headquartersCountry ?? "");
  const [foundedYear, setFoundedYear] = useState<string | number>(brandEntity?.foundedYear ?? "");
  const [employeeRange, setEmployeeRange] = useState(brandEntity?.employeeRange ?? "");
  const [businessModel, setBusinessModel] = useState(brandEntity?.businessModel ?? "");
  const [topicsText, setTopicsText] = useState(arrToText(brandEntity?.topics ?? []));
  const [keywordsText, setKeywordsText] = useState(arrToText(brandEntity?.keywords ?? []));
  const [targetAudiencesText, setTargetAudiencesText] = useState(arrToText(brandEntity?.targetAudiences ?? []));
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await onSave({ canonicalName: canonicalName.trim() || null, oneLiner: oneLiner.trim() || null, about: about.trim() || null,
        industry: industry.trim() || null, category: category.trim() || null, headquartersCity: headquartersCity.trim() || null,
        headquartersCountry: headquartersCountry.trim() || null, foundedYear: foundedYear === "" ? null : Number(foundedYear),
        employeeRange: employeeRange.trim() || null, businessModel: businessModel.trim() || null,
        topics: textToArr(topicsText), keywords: textToArr(keywordsText), targetAudiences: textToArr(targetAudiencesText) });
    } finally { setSaving(false); }
  }, [onSave, canonicalName, oneLiner, about, industry, category, headquartersCity, headquartersCountry, foundedYear, employeeRange, businessModel, topicsText, keywordsText, targetAudiencesText]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldGroup label="Core identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Canonical name</label><input className={inputClass} value={canonicalName} onChange={(e) => setCanonicalName(e.target.value)} placeholder="Acme Inc." /></div>
          <div className="space-y-1.5"><label className={labelClass}>One-liner <span className="normal-case font-normal text-muted-foreground/40">(≤160 chars)</span></label><input className={inputClass} maxLength={500} value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="Short citation-ready description" /></div>
        </div>
        <div className="space-y-1.5"><label className={labelClass}>About</label><textarea className={inputClass} rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Longer description" /></div>
      </FieldGroup>
      <FieldGroup label="Classification">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Industry</label><input className={inputClass} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. SaaS" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Category</label><input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Marketing" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Business model</label><input className={inputClass} value={businessModel} onChange={(e) => setBusinessModel(e.target.value)} placeholder="B2B, B2C" /></div>
        </div>
      </FieldGroup>
      <FieldGroup label="Location & Scale">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>HQ city</label><input className={inputClass} value={headquartersCity} onChange={(e) => setHeadquartersCity(e.target.value)} placeholder="San Francisco" /></div>
          <div className="space-y-1.5"><label className={labelClass}>HQ country</label><input className={inputClass} value={headquartersCountry} onChange={(e) => setHeadquartersCountry(e.target.value)} placeholder="United States" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Founded year</label><input className={inputClass} type="number" min={1800} max={2100} value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="2020" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Team size</label><input className={inputClass} value={employeeRange} onChange={(e) => setEmployeeRange(e.target.value)} placeholder="1–50" /></div>
        </div>
      </FieldGroup>
      <FieldGroup label="AEO Signals">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Topics <span className="normal-case font-normal text-muted-foreground/40">(comma or newline)</span></label><textarea className={inputClass} rows={2} value={topicsText} onChange={(e) => setTopicsText(e.target.value)} placeholder="video marketing, AI clips" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Keywords <span className="normal-case font-normal text-muted-foreground/40">(comma or newline)</span></label><textarea className={inputClass} rows={2} value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><label className={labelClass}>Target audiences <span className="normal-case font-normal text-muted-foreground/40">(comma or newline)</span></label><textarea className={inputClass} rows={2} value={targetAudiencesText} onChange={(e) => setTargetAudiencesText(e.target.value)} /></div>
      </FieldGroup>
      <div className="flex justify-end pt-1"><button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save brand entity"}</button></div>
    </form>
  );
}

// ─── OfferingsSection ─────────────────────────────────────────────────────────
function OfferingsSection({ offerings, hasBrandEntity, onCreate, onUpdate, onDelete }: {
  offerings: Props["initialOfferings"]; hasBrandEntity: boolean;
  onCreate: (p: Record<string, unknown>) => void; onUpdate: (id: string, p: Record<string, unknown>) => void; onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [offeringType, setOfferingType] = useState("PRODUCT");
  const [url, setUrl] = useState(""); const [differentiatorsText, setDifferentiatorsText] = useState(""); const [competitorsText, setCompetitorsText] = useState("");
  const [isPrimary, setIsPrimary] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); const [viewOffering, setViewOffering] = useState<Props["initialOfferings"][0] | null>(null);

  const typeLabel = (t: string) => ({ PRODUCT: "Product", SERVICE: "Service", FEATURE: "Feature", INTEGRATION: "Integration", PLAN: "Plan" }[t] ?? t);
  const typeBadge = (t: string) => ({ PRODUCT: "bg-blue-500/10 text-blue-400", SERVICE: "bg-violet-500/10 text-violet-400", FEATURE: "bg-amber-500/10 text-amber-400", INTEGRATION: "bg-cyan-500/10 text-cyan-400", PLAN: "bg-emerald-500/10 text-emerald-400" }[t] ?? "bg-primary/10 text-primary");

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setSubmitting(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined, offeringType, url: url.trim() || undefined, differentiators: textToArr(differentiatorsText), competitors: textToArr(competitorsText), isPrimary });
      setName(""); setDescription(""); setUrl(""); setDifferentiatorsText(""); setCompetitorsText(""); setIsPrimary(false);
    } finally { setSubmitting(false); }
  }, [onCreate, name, description, offeringType, url, differentiatorsText, competitorsText, isPrimary]);

  if (!hasBrandEntity) return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--glass-border)] p-10 text-center">
      <p className="text-xs text-muted-foreground max-w-xs">Create and save a Brand identity in the <strong className="text-foreground/70">"Brand identity"</strong> tab first, then add offerings here.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-[var(--glass-border)]/60 bg-[var(--glass)]/20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Add offering</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Product or service name" required /></div>
          <div className="space-y-1.5">
            <label className={labelClass}>Type</label>
            <div className="flex items-center gap-2 h-[38px] rounded-lg border border-[var(--glass-border)] bg-background/60 px-3">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${typeBadge(offeringType)}`}>{typeLabel(offeringType)}</span>
              <ViewMoreDropdown tooltipContent="Offering type" align="left">{(close) => (<div className="py-1">{(["PRODUCT","SERVICE","FEATURE","INTEGRATION","PLAN"] as const).map((t) => (<button key={t} type="button" onClick={() => { setOfferingType(t); close(); }} className={`w-full px-3 py-2 text-left text-sm ${offeringType === t ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>{typeLabel(t)}</button>))}</div>)}</ViewMoreDropdown>
            </div>
          </div>
        </div>
        <div className="space-y-1.5"><label className={labelClass}>Description</label><textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-1.5"><label className={labelClass}>URL</label><input className={inputClass} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Landing page" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Differentiators <span className="normal-case font-normal text-muted-foreground/40">(comma or newline)</span></label><textarea className={inputClass} rows={2} value={differentiatorsText} onChange={(e) => setDifferentiatorsText(e.target.value)} placeholder="no watermark, AI-powered" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Competitors <span className="normal-case font-normal text-muted-foreground/40">(comma or newline)</span></label><textarea className={inputClass} rows={2} value={competitorsText} onChange={(e) => setCompetitorsText(e.target.value)} placeholder="Opus Clip, Vidyo.ai" /></div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground"><input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded border-[var(--glass-border)] accent-primary" />Mark as primary</label>
          <button type="submit" disabled={submitting || !name.trim()} className={btnPrimary}><IconPlus />{submitting ? "Adding…" : "Add offering"}</button>
        </div>
      </form>
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-1">Offerings ({offerings.length})</p>
        {offerings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--glass-border)] p-5 text-center text-xs text-muted-foreground">No offerings yet.</div>
        ) : (
          <ul className="space-y-2" role="list">
            {offerings.map((o) => (
              <li key={o.id} className="rounded-xl border border-[var(--glass-border)]/60 bg-[var(--glass)]/30 hover:bg-[var(--glass)]/50 transition-colors">
                {editingId === o.id ? (
                  <div className="p-3"><OfferingEditRow offering={o} onSave={(p) => { onUpdate(o.id, p); setEditingId(null); }} onCancel={() => setEditingId(null)} /></div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{o.name}</span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${typeBadge(o.offeringType)}`}>{typeLabel(o.offeringType)}</span>
                        {o.isPrimary && <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">Primary</span>}
                        {!o.isActive && <span className="inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Inactive</span>}
                      </div>
                      {o.differentiators?.length > 0 && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{o.differentiators.join(" · ")}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button type="button" onClick={() => setViewOffering(o)} className={btnGhost}><IconEye />View</button>
                      <button type="button" onClick={() => setEditingId(o.id)} className={btnGhost}>Edit</button>
                      <button type="button" onClick={() => onDelete(o.id)} className={btnDestructive}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {viewOffering && (
        <div
  className="fixed inset-0 bg-white/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
  onClick={() => setViewOffering(null)}
>
    <div
      className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden shadow-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Modal header ── */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--color-divider)] bg-[var(--color-surface-2)]">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {viewOffering.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${typeBadge(viewOffering.offeringType)}`}>
              {typeLabel(viewOffering.offeringType)}
            </span>
            {viewOffering.isPrimary && (
              <span className="inline-flex items-center rounded-md bg-[var(--color-success-highlight)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success)]">
                Primary
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setViewOffering(null)}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-dynamic)] text-[var(--color-text-muted)] transition-colors"
          aria-label="Close"
        >
          <IconClose />
        </button>
      </div>

      {/* ── Modal body ── */}
      <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-auto">
        {viewOffering.description && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] mb-1.5">
              Description
            </p>
            <p className="text-xs leading-relaxed text-[var(--color-text)]">
              {viewOffering.description}
            </p>
          </div>
        )}

        {viewOffering.url && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] mb-1.5">
              URL
            </p>
            <a
              href={viewOffering.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline break-all"
            >
              {viewOffering.url}
              <IconExternalLink />
            </a>
          </div>
        )}

        {([
          { label: "Differentiators",  items: viewOffering.differentiators  },
          { label: "Use cases",        items: viewOffering.useCases          },
          { label: "Target audiences", items: viewOffering.targetAudiences   },
          { label: "Competitors",      items: viewOffering.competitors       },
        ] as const).map(({ label, items }) =>
          items?.length > 0 ? (
            <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] mb-2">
                {label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  </div>
)}    
</div>
  );
}

// ─── OfferingEditRow ──────────────────────────────────────────────────────────
function OfferingEditRow({ offering, onSave, onCancel }: { offering: Props["initialOfferings"][0]; onSave: (p: Record<string, unknown>) => void; onCancel: () => void; }) {
  const [name, setName] = useState(offering.name); const [offeringType, setOfferingType] = useState(offering.offeringType);
  const [differentiatorsText, setDifferentiatorsText] = useState(arrToText(offering.differentiators ?? []));
  const [competitorsText, setCompetitorsText] = useState(arrToText(offering.competitors ?? []));
  const [isPrimary, setIsPrimary] = useState(offering.isPrimary); const [isActive, setIsActive] = useState(offering.isActive); const [saving, setSaving] = useState(false);
  const typeLabel = (t: string) => ({ PRODUCT: "Product", SERVICE: "Service", FEATURE: "Feature", INTEGRATION: "Integration", PLAN: "Plan" }[t] ?? t);
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ name: name.trim(), offeringType, differentiators: textToArr(differentiatorsText), competitors: textToArr(competitorsText), isPrimary, isActive }); }
    finally { setSaving(false); }
  }, [onSave, name, offeringType, differentiatorsText, competitorsText, isPrimary, isActive]);
  return (
    <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
      <input className="w-32 rounded-lg border border-[var(--glass-border)] bg-background/60 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <div className="flex items-center gap-1 rounded-lg border border-[var(--glass-border)] bg-background/60 px-2 py-1.5 text-xs"><span className="text-foreground/80">{typeLabel(offeringType)}</span><ViewMoreDropdown tooltipContent="Type" align="left">{(close) => (<div className="py-1">{(["PRODUCT","SERVICE","FEATURE","INTEGRATION","PLAN"] as const).map((t) => (<button key={t} type="button" onClick={() => { setOfferingType(t); close(); }} className={`w-full px-3 py-2 text-left text-sm ${offeringType === t ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>{typeLabel(t)}</button>))}</div>)}</ViewMoreDropdown></div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded accent-primary" /> Primary</label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded accent-primary" /> Active</label>
      <div className="flex gap-1.5 ml-auto"><button type="submit" disabled={saving} className={btnPrimary} style={{ padding: "5px 12px" }}>{saving ? "Saving…" : "Save"}</button><button type="button" onClick={onCancel} className={btnGhost} style={{ padding: "5px 12px" }}>Cancel</button></div>
    </form>
  );
}

// ─── BrandingForm ─────────────────────────────────────────────────────────────
function BrandingForm({ branding, onSave }: { branding: Props["initialBranding"]; onSave: (p: Record<string, unknown>) => void; }) {
  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl ?? ""); const [faviconUrl, setFaviconUrl] = useState(branding?.faviconUrl ?? "");
  const [banner, setBanner] = useState(branding?.banner ?? ""); const [themeMusic, setThemeMusic] = useState(branding?.themeMusic ?? "");
  const [primaryColor, setPrimaryColor] = useState(branding?.primaryColor ?? "#D7765A"); const [secondaryColor, setSecondaryColor] = useState(branding?.secondaryColor ?? "#8B5CF6");
  const [bgColor, setBgColor] = useState(branding?.bgColor ?? "#141414"); const [surfaceColor, setSurfaceColor] = useState(branding?.surfaceColor ?? "#181818");
  const [textColor, setTextColor] = useState(branding?.textColor ?? "#FFFFFF"); const [companyAddress, setCompanyAddress] = useState(branding?.companyAddress ?? ""); const [saving, setSaving] = useState(false);
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ logoUrl: logoUrl.trim() || null, faviconUrl: faviconUrl.trim() || null, banner: banner.trim() || null, themeMusic: themeMusic.trim() || null, primaryColor: primaryColor || "#D7765A", secondaryColor: secondaryColor || "#8B5CF6", bgColor: bgColor || "#141414", surfaceColor: surfaceColor || "#181818", textColor: textColor || "#FFFFFF", companyAddress: companyAddress.trim() || null }); }
    finally { setSaving(false); }
  }, [onSave, logoUrl, faviconUrl, banner, themeMusic, primaryColor, secondaryColor, bgColor, surfaceColor, textColor, companyAddress]);
  const colorFields = [{ label: "Primary", value: primaryColor, set: setPrimaryColor }, { label: "Secondary", value: secondaryColor, set: setSecondaryColor }, { label: "Background", value: bgColor, set: setBgColor }, { label: "Surface", value: surfaceColor, set: setSurfaceColor }, { label: "Text", value: textColor, set: setTextColor }];
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldGroup label="Assets">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={labelClass}>Logo URL</label><input className={inputClass} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Favicon URL</label><input className={inputClass} type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Banner URL</label><input className={inputClass} type="url" value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><label className={labelClass}>Theme music URL</label><input className={inputClass} type="url" value={themeMusic} onChange={(e) => setThemeMusic(e.target.value)} placeholder="https://…" /></div>
        </div>
        <div className="space-y-1.5"><label className={labelClass}>Company address</label><input className={inputClass} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 Main St, City, Country" /></div>
      </FieldGroup>
      <FieldGroup label="Color palette">
        <div className="flex rounded-lg overflow-hidden h-7 border border-[var(--glass-border)]/60 mb-1">{colorFields.map(({ label, value }) => (<div key={label} className="flex-1 relative group" style={{ backgroundColor: value }} title={label}><div className="absolute inset-0 flex items-end justify-center pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[8px] font-bold bg-black/50 text-white px-1 rounded">{label}</span></div></div>))}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {colorFields.map(({ label, value, set }) => (
            <div key={label} className="space-y-1.5"><label className={labelClass}>{label}</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0"><input type="color" value={value} onChange={(e) => set(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" /><div className="h-8 w-8 rounded-lg border-2 border-[var(--glass-border)] cursor-pointer" style={{ backgroundColor: value }} /></div>
                <input className={`${inputClass} font-mono text-xs`} value={value} onChange={(e) => set(e.target.value)} placeholder="#hex" />
              </div>
            </div>
          ))}
        </div>
      </FieldGroup>
      <div className="flex justify-end pt-1"><button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save branding"}</button></div>
    </form>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function DataMinePageClient({ initialSources, initialCompany, initialBrandEntity, initialOfferings, initialBranding }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("file");
  const [brandSectionTab, setBrandSectionTab] = useState<BrandSectionTab>("company");
  const [sources, setSources] = useState<GeoDataSource[]>(initialSources);
  const [company, setCompany] = useState(initialCompany);
  const [brandEntity, setBrandEntity] = useState(initialBrandEntity);
  const [offerings, setOfferings] = useState(initialOfferings);
  const [branding, setBranding] = useState(initialBranding);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const [rivals, setRivals] = useState<RivalLink[]>([]);
  const [rivalsLoading, setRivalsLoading] = useState(false);
  const [rivalsMessage, setRivalsMessage] = useState<string | null>(null);
  const [rivalDomain, setRivalDomain] = useState("");
  const [rivalCompanyName, setRivalCompanyName] = useState("");
  const [isAddingRival, setIsAddingRival] = useState(false);
  const [editingRivalId, setEditingRivalId] = useState<string | null>(null);
  const [editingRivalName, setEditingRivalName] = useState("");
  const [isSavingRivalName, setIsSavingRivalName] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [selectedSourceLabel, setSelectedSourceLabel] = useState<SourceLabelPreset>("Product deck");
  const [otherLabelSpecify, setOtherLabelSpecify] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [videoAsset, setVideoAsset] = useState<AssetCardData | null>(null);
  const [imagePreview, setImagePreview] = useState<{ src: string; title: string } | null>(null);
  const [docPreview, setDocPreview] = useState<{ downloadUrl: string; title: string; filename: string } | null>(null);
  const [textPreview, setTextPreview] = useState<{ label: string; content: string } | null>(null);

  const { items: uploadItems, startUpload, clearItems } = useUploadWithProgress();
  const effectiveLabel = selectedSourceLabel === "Others" ? (otherLabelSpecify.trim() || "Others") : selectedSourceLabel;

  useEffect(() => { if (selectedSourceLabel === "Website URL" || selectedSourceLabel === "LinkedIn") setActiveTab("url"); }, [selectedSourceLabel]);

  const loadRivals = useCallback(async () => {
    setRivalsLoading(true); setRivalsMessage(null);
    try {
      const res = await fetch("/api/company/rivals", { method: "GET", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setRivalsMessage(data?.error ?? "Failed to load rivals."); return; }
      setRivals(Array.isArray(data.rivals) ? (data.rivals as RivalLink[]) : []);
    } catch (err) { console.error("Load rivals error", err); setRivalsMessage("Something went wrong while loading rivals."); }
    finally { setRivalsLoading(false); }
  }, []);
  useEffect(() => { loadRivals(); }, [loadRivals]);

  const handleAutoFillFromGeo = useCallback(async () => {
    setIsAutoFilling(true); setAutoFillMessage(null);
    try {
      const res = await fetch("/api/geo/auto-seed", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data?.success) { setAutoFillMessage(data?.error ?? (data?.missing ? "Website URL is required before auto-filling." : "Failed to auto-fill company data.")); return; }
      if (data.company) setCompany(data.company); if (data.brandEntity) setBrandEntity(data.brandEntity);
      if (Array.isArray(data.offerings)) setOfferings(data.offerings); if (data.branding) setBranding(data.branding);
      setAutoFillMessage("Company profile, brand entity, offerings, and branding were updated from GEO.");
    } catch (err) { console.error("Auto-fill error", err); setAutoFillMessage("Something went wrong while auto-filling. Please try again."); }
    finally { setIsAutoFilling(false); }
  }, []);

  const handleAddRival = useCallback(async () => {
    const domain = rivalDomain.trim(); const name = rivalCompanyName.trim(); if (!domain) return;
    setIsAddingRival(true); setRivalsMessage(null);
    try {
      const res = await fetch("/api/company/rivals", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ domain, name: name || undefined }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setRivalsMessage(data?.error ?? "Failed to add rival."); return; }
      setRivalDomain(""); setRivalCompanyName(""); await loadRivals();
      setRivalsMessage(data?.created ? "Rival added." : "Rival already exists.");
    } catch (err) { console.error("Add rival error", err); setRivalsMessage("Something went wrong while adding rival."); }
    finally { setIsAddingRival(false); }
  }, [rivalDomain, rivalCompanyName, loadRivals]);

  const handleRemoveRival = useCallback(async (rivalCompanyId: string) => {
    if (!rivalCompanyId) return; setRivalsMessage(null);
    try {
      const res = await fetch(`/api/company/rivals/${encodeURIComponent(rivalCompanyId)}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setRivalsMessage(data?.error ?? "Failed to remove rival."); return; }
      await loadRivals(); setRivalsMessage("Rival removed.");
    } catch (err) { setRivalsMessage("Something went wrong while removing rival."); }
  }, [loadRivals]);

  const handleStartEditRivalName = useCallback((r: RivalLink) => { setRivalsMessage(null); setEditingRivalId(r.rivalCompanyId); setEditingRivalName(r.rivalCompany?.name ?? ""); }, []);
  const handleCancelEditRivalName = useCallback(() => { setEditingRivalId(null); setEditingRivalName(""); }, []);

  const handleSaveRivalName = useCallback(async () => {
    const rivalCompanyId = editingRivalId; const name = editingRivalName.trim(); if (!rivalCompanyId || !name) return;
    setIsSavingRivalName(true); setRivalsMessage(null);
    try {
      const res = await fetch(`/api/company/rivals/${encodeURIComponent(rivalCompanyId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setRivalsMessage(data?.error ?? "Failed to update rival name."); return; }
      await loadRivals(); setRivalsMessage("Rival name updated."); setEditingRivalId(null); setEditingRivalName("");
    } catch (err) { setRivalsMessage("Something went wrong while updating rival name."); }
    finally { setIsSavingRivalName(false); }
  }, [editingRivalId, editingRivalName, loadRivals]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const completed = await startUpload(files, () => {});
    for (const item of completed) {
      if (!item.assetId) continue;
      const res = await fetch("/api/geo/data-mine", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ sourceType: "FILE", label: effectiveLabel || item.file.name, assetId: item.assetId }) });
      const data = await res.json();
      if (data?.success && data.source) setSources((prev) => [data.source as GeoDataSource, ...prev]);
    }
    clearItems();
  }, [startUpload, clearItems, effectiveLabel]);

  const handleCreateTextSource = useCallback(async () => {
    if (!textContent.trim()) return; setIsSubmitting(true);
    try {
      const res = await fetch("/api/geo/data-mine", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ sourceType: "TEXT", label: effectiveLabel, rawContent: textContent }) });
      const data = await res.json();
      if (data?.success && data.source) { setSources((prev) => [data.source as GeoDataSource, ...prev]); setTextContent(""); }
    } finally { setIsSubmitting(false); }
  }, [effectiveLabel, textContent]);

  const handleCreateUrlSource = useCallback(async () => {
    if (!urlValue.trim()) return; setIsSubmitting(true);
    try {
      const res = await fetch("/api/geo/data-mine", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ sourceType: "URL", label: effectiveLabel, rawContent: urlValue.trim() }) });
      const data = await res.json();
      if (data?.success && data.source) { setSources((prev) => [data.source as GeoDataSource, ...prev]); setUrlValue(""); }
    } finally { setIsSubmitting(false); }
  }, [effectiveLabel, urlValue]);

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/geo/data-mine/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ isActive: !isActive }) });
    const data = await res.json();
    if (data?.success && data.source) setSources((prev) => prev.map((s) => (s.id === id ? (data.source as GeoDataSource) : s)));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/geo/data-mine/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (data?.success) setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handlePreview = useCallback((source: GeoDataSource) => {
    if (source.sourceType === "FILE" && source.asset) {
      const a = source.asset;
      if (a.assetType === "VIDEO") setVideoAsset({ id: a.id, title: a.title || source.label, filename: a.filename, assetType: "VIDEO", status: a.status, thumbnailUrl: a.thumbnailUrl, duration: a.duration, resolution: a.resolution });
      else if (a.assetType === "IMAGE") setImagePreview({ src: a.thumbnailUrl || `/api/assets/${a.id}/download`, title: source.label || a.filename });
      else setDocPreview({ downloadUrl: `/api/assets/${a.id}/download`, title: source.label || a.title, filename: a.filename });
    } else if (source.sourceType === "TEXT") setTextPreview({ label: source.label, content: source.rawContent ?? "" });
    else if (source.sourceType === "URL" && source.rawContent) window.open(source.rawContent, "_blank", "noopener,noreferrer");
  }, []);

  const saveCompanyProfile = useCallback(async (payload: Parameters<typeof CompanyProfileForm>[0]["onSave"] extends (p: infer P) => unknown ? P : never) => {
    const res = await fetch("/api/geo/company-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    const data = await res.json(); if (data?.success && data.company) setCompany(data.company);
  }, []);
  const saveBrandEntity = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/geo/brand-entity", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    const data = await res.json(); if (data?.success && data.brandEntity) setBrandEntity(data.brandEntity);
  }, []);
  const createOffering = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/geo/offerings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    const data = await res.json(); if (data?.success && data.offering) setOfferings((prev) => [...prev, data.offering]);
  }, []);
  const updateOffering = useCallback(async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/geo/offerings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    const data = await res.json(); if (data?.success && data.offering) setOfferings((prev) => prev.map((o) => (o.id === id ? data.offering : o)));
  }, []);
  const deleteOffering = useCallback(async (id: string) => {
    const res = await fetch(`/api/geo/offerings/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json(); if (data?.success) setOfferings((prev) => prev.filter((o) => o.id !== id));
  }, []);
  const saveBranding = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/geo/branding", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    const data = await res.json(); if (data?.success && data.branding) setBranding(data.branding);
  }, []);

  const filteredSorted = useMemo(() => {
    let result = [...sources];
    if (filterType !== "ALL") result = result.filter((s) => s.sourceType === filterType);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); result = result.filter((s) => s.label.toLowerCase().includes(q) || (s.rawContent ?? "").toLowerCase().includes(q) || (s.asset?.filename ?? "").toLowerCase().includes(q)); }
    result.sort((a, b) => { let cmp = 0; if (sortField === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); else if (sortField === "label") cmp = a.label.localeCompare(b.label); else cmp = a.sourceType.localeCompare(b.sourceType); return sortDir === "desc" ? -cmp : cmp; });
    return result;
  }, [sources, filterType, sortField, sortDir, searchQuery]);

  const renderThumbnail = (source: GeoDataSource) => {
    if (source.sourceType === "FILE" && source.asset) {
      const a = source.asset;
      if (a.thumbnailUrl) return <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50"><img src={a.thumbnailUrl} alt={a.title} className="w-full h-full object-cover" />{a.assetType === "VIDEO" && <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white"><IconPlay /></div>}</div>;
      return <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)]/60 flex items-center justify-center text-muted-foreground">{a.assetType === "VIDEO" ? <IconPlay /> : a.assetType === "IMAGE" ? <IconImage /> : <IconFile />}</div>;
    }
    return <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)]/60 flex items-center justify-center text-muted-foreground">{source.sourceType === "TEXT" ? <IconText /> : <IconLink />}</div>;
  };
  const renderSourcePreview = (source: GeoDataSource) => {
    if (source.sourceType === "FILE" && source.asset) return source.asset.filename || source.asset.title;
    if (source.sourceType === "URL") return source.rawContent ?? "";
    const text = source.rawContent ?? ""; return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  };

  const BRAND_TABS: { id: BrandSectionTab; label: string; icon: React.ReactNode }[] = [
    { id: "company",   label: "Company",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: "entity",    label: "Identity",  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { id: "offerings", label: "Offerings", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg> },
    { id: "branding",  label: "Branding",  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17 4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.17l-4.74 8H6l-3-5h3l1.23 2.06L11 9"/></svg> },
    { id: "library",   label: "Library",   icon: <IconDatabase /> },
  ];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 lg:gap-7 items-start">

      {/* ══ LEFT: Data Mine card (only) ══════════════════════════════════════ */}
      <div className="flex-1 min-w-0">
        <section className="glass-card card-anime-float rounded-2xl overflow-hidden" aria-labelledby="data-mine-heading">

          {/* ── Reworked header ─────────────────────────────────────────────── */}
          <div className="relative border-b border-[var(--glass-border)]/60 bg-gradient-to-br from-[var(--glass)]/80 via-[var(--glass)]/40 to-transparent">
            {/* top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/30 to-transparent rounded-t-2xl" />

            <div className="px-6 pt-5 pb-0">
              {/* title row */}
              <div className="flex items-center justify-between gap-4 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <IconDatabase />
                  </div>
                  <div>
                    <h2 id="data-mine-heading" className="text-sm font-semibold text-foreground leading-none">Data Mine</h2>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Canonical entity &amp; AEO configuration</p>
                  </div>
                </div>
                {/* stat pills */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)]/60 bg-[var(--glass)]/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    {sources.length} source{sources.length !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)]/60 bg-[var(--glass)]/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/></svg>
                    {offerings.length} offering{offerings.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* tab nav */}
              <nav className="mt-4 flex items-end gap-0.5" aria-label="Data Mine sections">
                {BRAND_TABS.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBrandSectionTab(id)}
                    className={`
                      group relative flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-medium rounded-t-lg
                      transition-all duration-150 whitespace-nowrap
                      ${brandSectionTab === id
                        ? "text-primary bg-background/70 shadow-[0_-1px_0_0_var(--glass-border)] z-10"
                        : "text-muted-foreground hover:text-foreground hover:bg-[var(--glass)]/30"}
                    `}
                  >
                    <span className={`transition-colors ${brandSectionTab === id ? "text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"}`}>
                      {icon}
                    </span>
                    {label}
                    {brandSectionTab === id && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* ── Tab content ─────────────────────────────────────────────────── */}
          <div className="p-6">
            {/* Centered content wrapper */}
            <div className="mx-auto max-w-2xl">
              {brandSectionTab === "company" && (company ? <CompanyProfileForm company={company} onSave={saveCompanyProfile} /> : <p className="text-xs text-muted-foreground text-center py-6">Company not found.</p>)}
              {brandSectionTab === "entity" && <BrandEntityForm brandEntity={brandEntity} onSave={saveBrandEntity} />}
              {brandSectionTab === "offerings" && <OfferingsSection offerings={offerings} hasBrandEntity={!!brandEntity} onCreate={createOffering} onUpdate={updateOffering} onDelete={deleteOffering} />}
              {brandSectionTab === "branding" && <BrandingForm branding={branding} onSave={saveBranding} />}

              {/* Source Library */}
              {brandSectionTab === "library" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Ingested sources used as context when hunting GEO bounties and generating AEO pages.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"><IconSearch /></span>
                      <input className="w-full rounded-lg border border-[var(--glass-border)] bg-background/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors" placeholder="Search sources…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex gap-1">
                      {(["ALL", "FILE", "TEXT", "URL"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setFilterType(t)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${filterType === t ? "bg-primary/15 text-primary" : "border border-[var(--glass-border)]/60 bg-[var(--glass)] text-muted-foreground hover:text-foreground"}`}>
                          {t === "ALL" ? "All" : t}
                        </button>
                      ))}
                    </div>
                    <ViewMoreDropdown tooltipContent="Sort" align="right">
                      {(close) => (
                        <div className="py-1">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Sort by</div>
                          {(["date", "label", "type"] as const).map((s) => (<button key={s} type="button" onClick={() => { setSortField(s); close(); }} className={`w-full px-3 py-2 text-left text-sm capitalize ${sortField === s ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>{s}</button>))}
                          <div className="border-t border-[var(--glass-border)] my-1" />
                          <button type="button" onClick={() => { setSortDir("desc"); close(); }} className={`w-full px-3 py-2 text-left text-sm ${sortDir === "desc" ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>Newest first</button>
                          <button type="button" onClick={() => { setSortDir("asc"); close(); }} className={`w-full px-3 py-2 text-left text-sm ${sortDir === "asc" ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"}`}>Oldest first</button>
                        </div>
                      )}
                    </ViewMoreDropdown>
                  </div>
                  {filteredSorted.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--glass-border)] p-6 text-center text-xs text-muted-foreground">
                      {sources.length === 0 ? "No sources yet. Add sources from the panel on the right." : "No sources match your filters."}
                    </div>
                  ) : (
                    <ul className="space-y-2" role="list">
                      {filteredSorted.map((source) => (
                        <li key={source.id} className={`flex items-start gap-3 rounded-xl border border-[var(--glass-border)]/50 bg-[var(--glass)]/30 hover:bg-[var(--glass)]/50 px-3.5 py-3 text-xs transition-all ${source.isActive ? "" : "opacity-50"}`}>
                          <button type="button" onClick={() => handlePreview(source)} className="flex-shrink-0 hover:opacity-80 transition-opacity rounded-lg overflow-hidden">{renderThumbnail(source)}</button>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.sourceType === "FILE" ? "bg-blue-500/10 text-blue-400" : source.sourceType === "TEXT" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>{sourceTypeIcon(source)}{source.sourceType === "FILE" && source.asset ? source.asset.assetType : source.sourceType}</span>
                              <span className="font-semibold text-foreground truncate">{source.label}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{renderSourcePreview(source) || "No preview"}</p>
                            <p className="text-[10px] text-muted-foreground/50">{formatCreatedAt(source.createdAt)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <button type="button" onClick={() => handlePreview(source)} className={btnGhost} style={{ padding: "3px 8px" }}><IconEye />Preview</button>
                            <button type="button" onClick={() => handleToggleActive(source.id, source.isActive)} className={btnGhost} style={{ padding: "3px 8px" }}>{source.isActive ? "Disable" : "Enable"}</button>
                            <button type="button" onClick={() => handleDelete(source.id)} className={btnDestructive} style={{ padding: "3px 8px" }}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ══ RIGHT sidebar: Add source + Auto-fill + Rivals ═══════════════════ */}
      <aside className="w-full lg:w-[300px] xl:w-[320px] shrink-0">
        <div className="lg:sticky lg:top-6 space-y-4">

          {/* Add source */}
          <section className="glass-card card-anime-float rounded-2xl overflow-hidden" aria-labelledby="ingest-heading">
            {/* section header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--glass-border)]/60 bg-gradient-to-r from-[var(--glass)]/60 to-transparent">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                <IconUpload />
              </div>
              <div className="min-w-0">
                <h2 id="ingest-heading" className="text-xs font-semibold text-foreground leading-none">Add source</h2>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Files, text, or URLs</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Label chips */}
              <div className="space-y-1.5">
                <label className={labelClass}>Label</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCE_LABEL_PRESETS.filter((p) => p !== "Others").map((preset) => (
                    <button key={preset} type="button" onClick={() => { setSelectedSourceLabel(preset); setOtherLabelSpecify(""); }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${selectedSourceLabel === preset ? "bg-primary/15 text-primary border border-primary/30" : "border border-[var(--glass-border)]/60 bg-[var(--glass)] text-muted-foreground hover:text-foreground"}`}>
                      {preset}
                    </button>
                  ))}
                  <button type="button" onClick={() => setSelectedSourceLabel("Others")}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${selectedSourceLabel === "Others" ? "bg-primary/15 text-primary border border-primary/30" : "border border-[var(--glass-border)]/60 bg-[var(--glass)] text-muted-foreground hover:text-foreground"}`}>
                    Other…
                  </button>
                </div>
                {selectedSourceLabel === "Others" && <input type="text" className={inputClass} value={otherLabelSpecify} onChange={(e) => setOtherLabelSpecify(e.target.value)} placeholder="Specify label…" />}
              </div>

              {/* Segmented tabs */}
              <div className="flex rounded-lg border border-[var(--glass-border)]/60 overflow-hidden bg-[var(--glass)]/40">
                {(["file", "text", "url"] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${activeTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]"}`}>
                    {tab === "file" ? "File" : tab === "text" ? "Text" : "URL"}
                  </button>
                ))}
              </div>

              {activeTab === "file" && (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--glass-border)]/60 bg-[var(--glass)]/20 hover:bg-[var(--glass)]/40 cursor-pointer transition-colors p-5 text-center">
                    <span className="text-muted-foreground/50"><IconUpload /></span>
                    <span className="text-xs text-muted-foreground">Click to choose files</span>
                    <input type="file" multiple className="sr-only" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) handleFileUpload(files); }} />
                  </label>
                  {uploadItems.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-[var(--glass-border)]/50 bg-[var(--glass)]/50 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] text-foreground truncate">{item.file.name}</span><span className="text-[11px] text-primary font-semibold tabular-nums ml-2">{item.progress}%</span></div>
                          <div className="h-1 rounded-full bg-[var(--glass-border)]/40 overflow-hidden"><div className="h-full bg-primary/60 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "text" && (
                <div className="space-y-2">
                  <textarea className={`${inputClass} h-28 resize-y min-h-[80px]`} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste context, specs, FAQs…" />
                  <button type="button" onClick={handleCreateTextSource} disabled={isSubmitting || !textContent.trim()} className={`${btnPrimary} w-full justify-center`}>{isSubmitting ? "Saving…" : "Save text source"}</button>
                </div>
              )}
              {activeTab === "url" && (
                <div className="space-y-2">
                  <input className={inputClass} type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://…" />
                  <button type="button" onClick={handleCreateUrlSource} disabled={isSubmitting || !urlValue.trim()} className={`${btnPrimary} w-full justify-center`}>{isSubmitting ? "Saving…" : "Save URL source"}</button>
                </div>
              )}
            </div>
          </section>

          {/* Auto-fill */}
          <section className="glass-card card-anime-float rounded-2xl overflow-hidden" aria-labelledby="auto-fill-heading">
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--glass-border)]/60 bg-gradient-to-r from-[var(--glass)]/60 to-transparent">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                <IconSparkle />
              </div>
              <div className="min-w-0">
                <h2 id="auto-fill-heading" className="text-xs font-semibold text-foreground leading-none">Auto-fill GEO profile</h2>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Powered by Immortell AI</p>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">Use your Sources to prefill company profile, brand entity, offerings, and branding.</p>
              <button type="button" onClick={handleAutoFillFromGeo} disabled={isAutoFilling} className={`${btnPrimary} w-full justify-center gap-2`}>
                {isAutoFilling ? <MiniLoadingAnimation /> : <><IconSparkle />Auto-fill Using Immortell AI</>}
              </button>
              {autoFillMessage && <p className={`text-[11px] leading-relaxed ${autoFillMessage.includes("updated") ? "text-emerald-400" : "text-muted-foreground"}`}>{autoFillMessage}</p>}
              {!company?.website && <p className="text-[11px] text-amber-400/80">Add your website URL in the Company tab first.</p>}
            </div>
          </section>

          {/* Rival companies — right sidebar */}
          <section className="glass-card card-anime-float rounded-2xl overflow-hidden" aria-labelledby="rivals-heading">
            {/* section header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-[var(--glass-border)]/60 bg-gradient-to-r from-[var(--glass)]/60 to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 text-destructive/70 flex-shrink-0">
                  <IconSwords />
                </div>
                <div className="min-w-0">
                  <h2 id="rivals-heading" className="text-xs font-semibold text-foreground leading-none">Rival companies</h2>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {rivals.length > 0 ? `${rivals.length} tracked` : "Track competitors"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={loadRivals} disabled={rivalsLoading}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)]/60 bg-[var(--glass)]/40 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                <IconRefresh />{rivalsLoading ? "…" : "Refresh"}
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Add rival form */}
              <div className="space-y-2">
                <input className={inputClass} value={rivalCompanyName} onChange={(e) => setRivalCompanyName(e.target.value)} placeholder="Company name (optional)" aria-label="Rival company name" />
                <div className="flex gap-2">
                  <input className={`${inputClass} flex-1`} value={rivalDomain} onChange={(e) => setRivalDomain(e.target.value)} placeholder="example.com or https://…" aria-label="Rival domain" />
                  <button type="button" onClick={handleAddRival} disabled={isAddingRival || !rivalDomain.trim()}
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50 transition-colors">
                    <IconPlus />{isAddingRival ? "…" : "Add"}
                  </button>
                </div>
              </div>

              {rivalsMessage && <p className="text-[11px] text-muted-foreground">{rivalsMessage}</p>}

              {/* Rivals list */}
              <div className="space-y-1.5">
                {rivalsLoading ? (
                  <div className="flex items-center justify-center py-4"><span className="text-[11px] text-muted-foreground">Loading…</span></div>
                ) : rivals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--glass-border)]/60 py-5 text-center">
                    <span className="text-muted-foreground/30"><IconSwords /></span>
                    <p className="text-[11px] text-muted-foreground/60">No rivals yet</p>
                  </div>
                ) : (
                  rivals.slice(0, 12).map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-[var(--glass-border)]/40 bg-[var(--glass)]/20 hover:bg-[var(--glass)]/40 px-3 py-2.5 transition-colors">
                      {/* avatar initial */}
                      <div className="h-7 w-7 flex-shrink-0 rounded-lg bg-[var(--glass-border)]/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground select-none">
                        {(r.rivalCompany?.name ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingRivalId === r.rivalCompanyId ? (
                          <div className="space-y-1.5">
                            <input className={inputClass} value={editingRivalName} onChange={(e) => setEditingRivalName(e.target.value)} placeholder="Rival name" style={{ fontSize: "12px", padding: "4px 8px" }} />
                            <div className="flex gap-1.5">
                              <button type="button" onClick={handleSaveRivalName} disabled={isSavingRivalName || !editingRivalName.trim()} className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50">{isSavingRivalName ? "…" : "Save"}</button>
                              <button type="button" onClick={handleCancelEditRivalName} className="rounded-md border border-[var(--glass-border)] px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-foreground truncate">{r.rivalCompany?.name ?? r.rivalCompanyId}</p>
                            <p className="text-[10px] text-muted-foreground/60 truncate">{r.rivalCompany?.domain ?? r.rivalCompany?.website ?? ""}</p>
                          </>
                        )}
                      </div>
                      {editingRivalId !== r.rivalCompanyId && (
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          <button type="button" onClick={() => handleStartEditRivalName(r)} disabled={editingRivalId !== null && editingRivalId !== r.rivalCompanyId} className={btnGhost} style={{ padding: "2px 8px", fontSize: "10px" }}>Edit</button>
                          <button type="button" onClick={() => handleRemoveRival(r.rivalCompanyId)} disabled={isSavingRivalName} className={btnDestructive} style={{ padding: "2px 8px", fontSize: "10px" }}>Remove</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

        </div>
      </aside>

      {/* ── Modals ── */}
      <AssetVideoModal isOpen={videoAsset != null} asset={videoAsset} onClose={() => setVideoAsset(null)} />
      {imagePreview && <ImagePreviewModal isOpen src={imagePreview.src} title={imagePreview.title} onClose={() => setImagePreview(null)} />}
      {docPreview && <DocumentPreviewModal isOpen downloadUrl={docPreview.downloadUrl} title={docPreview.title} filename={docPreview.filename} onClose={() => setDocPreview(null)} />}
      {textPreview && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTextPreview(null)}>
          <div className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden flex flex-col border border-[var(--glass-border)]/80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)]/60">
              <p className="text-sm font-semibold text-foreground truncate">{textPreview.label}</p>
              <button type="button" onClick={() => setTextPreview(null)} className="p-1.5 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground" aria-label="Close"><IconClose /></button>
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