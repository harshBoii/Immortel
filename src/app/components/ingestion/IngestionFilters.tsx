'use client';

import React from 'react';

export type ViewMode = 'raw' | 'reels' | 'webinars';
export type SortBy = 'time' | 'size';
export type SortOrder = 'asc' | 'desc';

type IngestionFiltersProps = {
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;
  onViewModeChange: (mode: ViewMode) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onSearchChange: (query: string) => void;
};

export function IngestionFilters({
  viewMode,
  sortBy,
  sortOrder,
  searchQuery,
  onViewModeChange,
  onSortByChange,
  onSortOrderChange,
  onSearchChange,
}: IngestionFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-stretch sm:items-center">
      {/* View mode slider / segmented control */}
      <div className="flex rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] p-1">
        {(['raw', 'reels', 'webinars'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              viewMode === mode
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-border)]'
            }`}
          >
            {mode === 'raw' ? 'Raw assets' : mode === 'reels' ? 'Reels' : 'Webinars'}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Sort by</span>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          className="px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="time">Time</option>
          <option value="size">Size</option>
        </select>
        <button
          type="button"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground transition-colors"
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[180px]">
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
    </div>
  );
}
