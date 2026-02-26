'use client';

import React from 'react';
import { Tooltip } from '../common/Tooltip';

export type ReelCardData = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  assetId: string;
  parentTitle: string;
  status: string;
  thumbnailUrl: string | null;
  approved?: boolean | null;
  createdAt?: string;
  hook?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  shortType?: string | null;
  parentStreamId?: string | null;
};

type ReelCardProps = {
  reel: ReelCardData;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
};

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ReelCard({ reel, onApprove, onReject }: ReelCardProps) {
  const duration = Math.floor(reel.endTime - reel.startTime);
  const isApproved = reel.approved === true;
  const isRejected = reel.approved === false;

  return (
    <div className="glass-card rounded-xl overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-muted/50 relative">
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt={reel.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <IconPlay />
          </div>
        )}
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded">
          {formatTime(reel.startTime)} – {formatTime(reel.endTime)}
        </span>
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded">
          {duration}s
        </span>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isApproved && (
            <Tooltip content="Approved">
              <span className="w-7 h-7 rounded-full bg-success/90 text-success-foreground flex items-center justify-center">
                <IconCheck />
              </span>
            </Tooltip>
          )}
          {isRejected && (
            <Tooltip content="Rejected">
              <span className="w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center">
                <IconX />
              </span>
            </Tooltip>
          )}
          {reel.approved == null && (
            <Tooltip content="Pending approval">
              <span className="w-7 h-7 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center text-xs font-medium">
                ?
              </span>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate" title={reel.title}>
          {reel.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={reel.parentTitle}>
          From: {reel.parentTitle}
        </p>
        <div className="flex items-center gap-1 mt-3">
          <Tooltip content="Approve">
            <button
              type="button"
              onClick={() => onApprove?.(reel.id)}
              className="p-2 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success transition-colors"
            >
              <IconCheck />
            </button>
          </Tooltip>
          <Tooltip content="Reject">
            <button
              type="button"
              onClick={() => onReject?.(reel.id)}
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <IconX />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
