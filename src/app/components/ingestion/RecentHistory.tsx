'use client';

import React from 'react';
import Link from 'next/link';
import { Tooltip } from '../common/Tooltip';
import type { AssetCardData } from '../common/AssetCard';

type RecentHistoryItem = {
  id: AssetCardData['id'];
  title: AssetCardData['title'];
  filename: AssetCardData['filename'];
  assetType: AssetCardData['assetType'];
  status: AssetCardData['status'];
  createdAt?: AssetCardData['createdAt'];
};

type RecentHistoryProps = {
  items: RecentHistoryItem[];
};

function formatDate(value: string | Date | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function RecentHistory({ items }: RecentHistoryProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden h-fit">
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent history</h3>
      </div>
      <div className="p-2 max-h-[400px] overflow-y-auto glass-scrollbar">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No uploads yet</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--glass-hover)] transition-colors"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.status === 'READY' ? 'bg-success' : item.status === 'PROCESSING' ? 'bg-warning' : 'bg-muted-foreground'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="p-2 border-t border-[var(--glass-border)]">
        <Tooltip content="View all uploaded assets and metadata">
          <Link
            href="/ingestion/history"
            className="block w-full text-center py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            View more
          </Link>
        </Tooltip>
      </div>
    </div>
  );
}
