'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Tooltip } from './Tooltip';
import { PixelatedButton } from './UI/Buttons';

export type AssetCardData = {
  id: string;
  title: string;
  filename: string;
  assetType: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
  status: string;
  thumbnailUrl?: string | null;
  approved?: boolean | null;
  duration?: number | null;
  resolution?: string | null;
  createdAt?: string | Date;
  hasIntelligence?: boolean;
  intelligenceStatus?: string | null;
};

type AssetCardProps = {
  asset: AssetCardData;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onClick?: (asset: AssetCardData) => void;
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

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconMore = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const IconDescription = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export function AssetCard({ asset, onApprove, onReject, onClick }: AssetCardProps) {
  const isVideo = asset.assetType === 'VIDEO';
  const isApproved = asset.approved === true;
  const isRejected = asset.approved === false;
  const canOpenModal = isVideo && (asset.hasIntelligence === true);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [moreOpen]);

  return (
    <div
      role={canOpenModal ? 'button' : undefined}
      tabIndex={canOpenModal ? 0 : undefined}
      onClick={canOpenModal ? () => onClick?.(asset) : undefined}
      onKeyDown={canOpenModal ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(asset); } } : undefined}
      className={`glass-card rounded-xl overflow-hidden group hover:shadow-lg transition-shadow ${canOpenModal ? 'cursor-pointer' : ''}`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted/50 relative">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            {isVideo ? (
              <IconPlay />
            ) : (
              <span className="text-xs uppercase">{asset.assetType}</span>
            )}
          </div>
        )}
        {/* Duration badge for video */}
        {isVideo && asset.duration != null && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded">
            {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toString().padStart(2, '0')}
          </span>
        )}
        {/* Approval status icon */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isVideo && !asset.hasIntelligence && (
            <Tooltip content="Intelligence required to generate shorts">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/90 text-white rounded">
                Processing…
              </span>
            </Tooltip>
          )}
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
          {asset.approved == null && (
            <Tooltip content="Pending approval">
              <span className="w-7 h-7 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center text-xs font-medium">
                ?
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Info & CTAs */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate" title={asset.title}>
          {asset.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{asset.filename}</p>

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-1.5">
            <Tooltip content="Approve">
              <PixelatedButton
                variant="approve"
                onClick={(e) => { e.stopPropagation(); onApprove?.(asset.id); }}
              >
                <IconCheck />
              </PixelatedButton>
            </Tooltip>
            <Tooltip content="Reject">
              <PixelatedButton
                variant="reject"
                onClick={(e) => { e.stopPropagation(); onReject?.(asset.id); }}
              >
                <IconX />
              </PixelatedButton>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip content="Download">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (asset.id) {
                    window.open(`/api/assets/${asset.id}/download`, '_blank');
                  }
                }}
                className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconDownload />
              </button>
            </Tooltip>
            <Tooltip content="More options">
              <div ref={moreRef} className="relative">
                <PixelatedButton
                  variant="viewMore"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreOpen((o) => !o);
                  }}
                >
                  <IconMore />
                </PixelatedButton>
                {moreOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 min-w-[160px] py-1 border-2 border-[#E91E8C] bg-[#FFE4F0] shadow-[3px_3px_0_0_#C41A75] z-10"
                    style={{ borderRadius: 0 }}
                    role="menu"
                  >
                    {isVideo && (
                      <Link
                        href={`/ingestion/asset/${asset.id}/description`}
                        onClick={(e) => { e.stopPropagation(); setMoreOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[#1a1a1a] hover:bg-[#FF2D92]/20 transition-colors"
                        role="menuitem"
                      >
                        <IconDescription />
                        See description
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
