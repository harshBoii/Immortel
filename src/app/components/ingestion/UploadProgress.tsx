'use client';

import React from 'react';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  assetId?: string;
  error?: string;
}

type UploadProgressProps = {
  items: UploadItem[];
  onClear?: () => void;
};

export function UploadProgress({ items, onClear }: UploadProgressProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Uploads</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)]"
          >
            <span className="text-sm truncate flex-1 min-w-0" title={item.file.name}>
              {item.file.name}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0 w-32">
              {item.status === 'uploading' && (
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === 'done' && (
                <span className="text-xs text-success">Done</span>
              )}
              {item.status === 'error' && (
                <span className="text-xs text-destructive" title={item.error}>
                  Failed
                </span>
              )}
              {item.status === 'pending' && (
                <span className="text-xs text-muted-foreground">Queued</span>
              )}
              {item.status !== 'uploading' && item.status !== 'pending' && (
                <span className="text-xs text-muted-foreground">{item.progress}%</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
