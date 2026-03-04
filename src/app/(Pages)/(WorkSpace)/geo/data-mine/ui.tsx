'use client';

import { useCallback, useMemo, useState } from "react";
import { useUploadWithProgress } from "../../ingestion/useUploadWithProgress";
import { AssetVideoModal } from "@/app/components/ingestion";
import { ImagePreviewModal } from "@/app/components/general/ImagePreviewModal";
import { DocumentPreviewModal } from "@/app/components/general/DocumentPreviewModal";
import type { AssetCardData } from "@/app/components/common/AssetCard";

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
};

type TabId = "file" | "text" | "url";
type FilterType = "ALL" | "FILE" | "TEXT" | "URL";
type SortField = "date" | "label" | "type";
type SortDir = "asc" | "desc";

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

export default function DataMinePageClient({ initialSources }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("file");
  const [sources, setSources] = useState<GeoDataSource[]>(initialSources);

  const [fileLabel, setFileLabel] = useState("");
  const [textLabel, setTextLabel] = useState("");
  const [textContent, setTextContent] = useState("");
  const [urlLabel, setUrlLabel] = useState("");
  const [urlValue, setUrlValue] = useState("");
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
            label: fileLabel.trim() || item.file.name,
            assetId: item.assetId,
          }),
        });
        const data = await res.json();
        if (data?.success && data.source) {
          setSources((prev) => [data.source as GeoDataSource, ...prev]);
        }
      }
      clearItems();
      setFileLabel("");
    },
    [startUpload, clearItems, fileLabel]
  );

  const handleCreateTextSource = useCallback(async () => {
    if (!textLabel.trim() || !textContent.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/geo/data-mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceType: "TEXT", label: textLabel.trim(), rawContent: textContent }),
      });
      const data = await res.json();
      if (data?.success && data.source) {
        setSources((prev) => [data.source as GeoDataSource, ...prev]);
        setTextLabel("");
        setTextContent("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [textLabel, textContent]);

  const handleCreateUrlSource = useCallback(async () => {
    if (!urlLabel.trim() || !urlValue.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/geo/data-mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceType: "URL", label: urlLabel.trim(), rawContent: urlValue.trim() }),
      });
      const data = await res.json();
      if (data?.success && data.source) {
        setSources((prev) => [data.source as GeoDataSource, ...prev]);
        setUrlLabel("");
        setUrlValue("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [urlLabel, urlValue]);

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
    <div className="space-y-8">
      {/* Add data source */}
      <section className="glass-card rounded-xl border border-[var(--glass-border)] p-5">
        <h2 className="text-sm font-semibold text-foreground">Add data source</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload files, paste text, or add URLs that should be used as context when hunting GEO bounties.
        </p>

        <div className="mt-4 flex gap-2 border-b border-[var(--glass-border)] pb-2 text-xs">
          {(["file", "text", "url"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md capitalize ${
                activeTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-[var(--glass-hover)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === "file" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={fileLabel}
                  onChange={(e) => setFileLabel(e.target.value)}
                  placeholder="e.g. Immortel AI product deck"
                />
              </div>
              <input
                type="file"
                multiple
                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) handleFileUpload(files);
                }}
              />
              {uploadItems.length > 0 && (
                <div className="space-y-1">
                  {uploadItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-[var(--glass)] px-2 py-1 text-xs">
                      <span className="truncate">{item.file.name}</span>
                      <span className="text-muted-foreground">{item.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={textLabel} onChange={(e) => setTextLabel(e.target.value)} placeholder="e.g. Product docs: Immortel AI" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <textarea className="h-40 w-full rounded-md border bg-background px-3 py-2 text-xs" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste any relevant context, specs, FAQs, etc." />
              </div>
              <button type="button" onClick={handleCreateTextSource} disabled={isSubmitting || !textLabel.trim() || !textContent.trim()} className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                Save text source
              </button>
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={urlLabel} onChange={(e) => setUrlLabel(e.target.value)} placeholder="e.g. Product marketing site" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">URL</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://example.com/docs" />
              </div>
              <button type="button" onClick={handleCreateUrlSource} disabled={isSubmitting || !urlLabel.trim() || !urlValue.trim()} className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                Save URL source
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sources list with filters */}
      <section className="glass-card rounded-xl border border-[var(--glass-border)] p-5">
        <h2 className="text-sm font-semibold text-foreground">Your data sources</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          These sources will be used as context when hunting GEO bounties and generating AEO pages.
        </p>

        {/* Filters bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><IconSearch /></span>
            <input
              className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-xs"
              placeholder="Search sources…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-xs text-foreground"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
          >
            <option value="ALL">All types</option>
            <option value="FILE">Files</option>
            <option value="TEXT">Text</option>
            <option value="URL">URLs</option>
          </select>

          {/* Sort field */}
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-xs text-foreground"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="date">Date</option>
            <option value="label">Label</option>
            <option value="type">Type</option>
          </select>

          {/* Sort direction */}
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-md border bg-background px-2 py-1.5 text-xs text-foreground hover:bg-[var(--glass-hover)]"
          >
            {sortDir === "desc" ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* Sources */}
        {filteredSorted.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-[var(--glass-border)] p-4 text-xs text-muted-foreground">
            {sources.length === 0 ? "No data sources yet. Add files, text, or URLs above." : "No sources match your filters."}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {filteredSorted.map((source) => (
              <div
                key={source.id}
                className={`flex items-start gap-3 rounded-lg bg-[var(--glass)] px-3 py-2.5 text-xs transition-opacity ${
                  source.isActive ? "" : "opacity-50"
                }`}
              >
                {/* Thumbnail */}
                <button type="button" onClick={() => handlePreview(source)} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                  {renderThumbnail(source)}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{sourceTypeIcon(source)}</span>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {source.sourceType === "FILE" && source.asset
                        ? source.asset.assetType
                        : source.sourceType}
                    </span>
                    <span className="font-medium text-foreground truncate">{source.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {renderSourcePreview(source) || "No preview available"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatCreatedAt(source.createdAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePreview(source)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <IconEye /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(source.id, source.isActive)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {source.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(source.id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
