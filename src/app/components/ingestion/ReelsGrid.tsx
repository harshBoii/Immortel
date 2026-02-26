'use client';

import React from 'react';
import { AssetCard, type AssetCardData } from '../common/AssetCard';
import type { ReelCardData } from './ReelCard';

type ReelsGridProps = {
  reels: ReelCardData[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewVideo?: (reel: ReelCardData) => void;
};

function reelToAssetCardData(reel: ReelCardData): AssetCardData {
  const durationSec = Math.floor(reel.endTime - reel.startTime);
  return {
    id: reel.id,
    title: reel.title,
    filename: `From: ${reel.parentTitle}`,
    assetType: 'VIDEO',
    status: reel.status,
    thumbnailUrl: reel.thumbnailUrl,
    approved: reel.approved,
    duration: durationSec,
    resolution: null,
    createdAt: reel.createdAt ?? undefined,
    hasIntelligence: false,
    intelligenceStatus: null,
    sourceAssetId: reel.assetId,
    startTime: reel.startTime,
    endTime: reel.endTime,
  };
}

export function ReelsGrid({ reels, onApprove, onReject, onViewVideo }: ReelsGridProps) {
  const reelMap = new Map(reels.map((r) => [r.id, r]));

  if (reels.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">No reels yet</p>
        <p className="text-xs text-muted-foreground mt-1">Generate shorts from a video with intelligence ready</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {reels.map((reel) => (
        <AssetCard
          key={reel.id}
          asset={reelToAssetCardData(reel)}
          onApprove={onApprove}
          onReject={onReject}
          onViewVideo={(asset) => {
            const original = reelMap.get(asset.id);
            if (original && onViewVideo) onViewVideo(original);
          }}
        />
      ))}
    </div>
  );
}
