'use client';

import React from 'react';

export type WebinarCardData = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  isRecurring: boolean;
  assetId?: string | null;
  assetTitle?: string | null;
  createdAt?: string;
};

type WebinarCardProps = {
  webinar: WebinarCardData;
};

export function WebinarCard({ webinar }: WebinarCardProps) {
  const scheduleLabel = webinar.isRecurring
    ? 'Recurring'
    : webinar.scheduledAt
      ? new Date(webinar.scheduledAt).toLocaleString()
      : '—';

  return (
    <div className="glass-card rounded-xl overflow-hidden p-4 hover:shadow-lg transition-shadow">
      <p className="text-sm font-medium text-foreground truncate" title={webinar.title}>
        {webinar.title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
        {webinar.description || 'No description'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded bg-muted/80 text-muted-foreground">
          {webinar.status}
        </span>
        <span className="text-muted-foreground">{scheduleLabel}</span>
      </div>
      {webinar.assetTitle && (
        <p className="text-xs text-muted-foreground mt-1 truncate">
          Asset: {webinar.assetTitle}
        </p>
      )}
    </div>
  );
}
