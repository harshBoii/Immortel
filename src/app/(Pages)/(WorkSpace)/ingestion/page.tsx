'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  UploadSection,
  UploadProgress,
  AssetGrid,
  ReelsGrid,
  WebinarsGrid,
  AssetActionModal,
  RecentHistory,
  WebinarVsShortsChart,
  ApprovedAssetsPieChart,
  IngestionFilters,
} from '@/app/components/ingestion';
import type {
  AssetCardData,
  ReelCardData,
  WebinarCardData,
  ContentUsageData,
  ViewMode,
  SortBy,
  SortOrder,
} from '@/app/components/ingestion';
import { useUploadWithProgress } from './useUploadWithProgress';

const DEFAULT_CONTENT_USAGE: ContentUsageData = {
  webinar24x7: 0,
  webinarScheduledRecurring: 0,
  webinarScheduledOnetime: 0,
  shortsTiktok: 0,
  shortsReels: 0,
  shortsYoutube: 0,
  shortsGeneric: 0,
};

function buildQuery(viewMode: ViewMode, sortBy: SortBy, sortOrder: SortOrder, search: string) {
  const p = new URLSearchParams();
  p.set('viewMode', viewMode);
  p.set('sortBy', sortBy);
  p.set('sortOrder', sortOrder);
  if (search.trim()) p.set('search', search.trim());
  return p.toString();
}

export default function IngestionPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('raw');
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<AssetCardData[]>([]);
  const [reels, setReels] = useState<ReelCardData[]>([]);
  const [webinars, setWebinars] = useState<WebinarCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAsset, setModalAsset] = useState<AssetCardData | null>(null);
  const [contentUsage, setContentUsage] = useState<ContentUsageData>(DEFAULT_CONTENT_USAGE);

  const { items: uploadItems, startUpload, clearItems } = useUploadWithProgress();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery(viewMode, sortBy, sortOrder, searchQuery);
      const res = await fetch(`/api/ingestion/assets?${q}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        setAssets([]);
        setReels([]);
        setWebinars([]);
        return;
      }
      const list = data.data ?? [];
      if (viewMode === 'raw') {
        setAssets(Array.isArray(list) ? list : []);
        setReels([]);
        setWebinars([]);
      } else if (viewMode === 'reels') {
        setReels(Array.isArray(list) ? list : []);
        setAssets([]);
        setWebinars([]);
      } else {
        setWebinars(Array.isArray(list) ? list : []);
        setAssets([]);
        setReels([]);
      }
    } finally {
      setLoading(false);
    }
  }, [viewMode, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      startUpload(Array.from(files), () => {});
    },
    [startUpload]
  );

  const isUploading = uploadItems.some((i) => i.status === 'uploading' || i.status === 'pending');
  const doneCount = uploadItems.filter((i) => i.status === 'done' && i.assetId).length;
  useEffect(() => {
    if (doneCount > 0 && viewMode === 'raw') fetchData();
  }, [doneCount, viewMode]);

  const handleApprove = useCallback(
    async (id: string) => {
      const q = viewMode === 'reels' ? '?viewMode=reels' : '';
      await fetch(`/api/ingestion/assets/${id}/approve${q}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      fetchData();
    },
    [viewMode, fetchData]
  );

  const handleReject = useCallback(
    async (id: string) => {
      const q = viewMode === 'reels' ? '?viewMode=reels' : '';
      await fetch(`/api/ingestion/assets/${id}/reject${q}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      fetchData();
    },
    [viewMode, fetchData]
  );

  const handleAssetActionComplete = useCallback(
    (action: 'webinar' | 'shorts', _data: Record<string, unknown>) => {
      setContentUsage((prev) => {
        if (action === 'webinar') {
          const data = _data as { schedule?: string; type?: string };
          if (data.schedule === '24x7') return { ...prev, webinar24x7: prev.webinar24x7 + 1 };
          if (data.type === 'recurring') return { ...prev, webinarScheduledRecurring: prev.webinarScheduledRecurring + 1 };
          return { ...prev, webinarScheduledOnetime: prev.webinarScheduledOnetime + 1 };
        }
        const data = _data as { platform?: string };
        const platform = data.platform ?? 'Generic';
        if (platform === 'TikTok') return { ...prev, shortsTiktok: prev.shortsTiktok + 1 };
        if (platform === 'Reels') return { ...prev, shortsReels: prev.shortsReels + 1 };
        if (platform === 'YouTube Shorts') return { ...prev, shortsYoutube: prev.shortsYoutube + 1 };
        return { ...prev, shortsGeneric: prev.shortsGeneric + 1 };
      });
      fetchData();
    },
    [fetchData]
  );

  const approvalStats = {
    approved: viewMode === 'raw' ? assets.filter((a) => a.approved === true).length : viewMode === 'reels' ? reels.filter((r) => r.approved === true).length : 0,
    rejected: viewMode === 'raw' ? assets.filter((a) => a.approved === false).length : viewMode === 'reels' ? reels.filter((r) => r.approved === false).length : 0,
    pending: viewMode === 'raw' ? assets.filter((a) => a.approved == null).length : viewMode === 'reels' ? reels.filter((r) => r.approved == null).length : 0,
  };

  const recentItems = (viewMode === 'raw' ? assets : viewMode === 'reels' ? reels.map((r) => ({ id: r.id, title: r.title, filename: `${r.startTime}-${r.endTime}s`, assetType: 'VIDEO' as const, status: r.status, createdAt: r.createdAt ?? '' })) : webinars.map((w) => ({ id: w.id, title: w.title, filename: '', assetType: 'VIDEO' as const, status: w.status, createdAt: w.createdAt ?? '' }))).slice(0, 5);

  return (
    <div className="p-6 h-full">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground font-heading mb-4">Upload</h1>
            <UploadSection onFilesSelected={handleFilesSelected} disabled={isUploading} />
            <UploadProgress items={uploadItems} onClear={clearItems} />
          </div>

          <div>
            <h2 className="text-lg font-medium text-foreground mb-4">Assets</h2>
            <IngestionFilters
              viewMode={viewMode}
              sortBy={sortBy}
              sortOrder={sortOrder}
              searchQuery={searchQuery}
              onViewModeChange={setViewMode}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
              onSearchChange={setSearchQuery}
            />
            <div className="mt-4">
              {loading ? (
                <div className="glass-card rounded-xl p-12 text-center text-muted-foreground text-sm">Loading…</div>
              ) : viewMode === 'raw' ? (
                <AssetGrid
                  assets={assets}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onAssetClick={(asset) => {
                    if (asset.assetType === 'VIDEO' && (asset as AssetCardData & { hasIntelligence?: boolean }).hasIntelligence) {
                      setModalAsset(asset);
                    }
                  }}
                />
              ) : viewMode === 'reels' ? (
                <ReelsGrid reels={reels} onApprove={handleApprove} onReject={handleReject} />
              ) : (
                <WebinarsGrid webinars={webinars} />
              )}
            </div>
          </div>
        </div>

        <aside className="lg:w-96 flex-shrink-0 space-y-6">
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Content usage</h3>
            <p className="text-xs text-muted-foreground mb-3">Webinar vs Shorts by subpath</p>
            <WebinarVsShortsChart data={contentUsage} />
          </div>
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Asset approval</h3>
            <p className="text-xs text-muted-foreground mb-3">Approved vs Rejected vs Pending</p>
            <ApprovedAssetsPieChart data={approvalStats} />
          </div>
          <RecentHistory items={recentItems} />
        </aside>
      </div>

      <AssetActionModal
        isOpen={modalAsset != null}
        onClose={() => setModalAsset(null)}
        asset={modalAsset}
        onComplete={handleAssetActionComplete}
      />
    </div>
  );
}
