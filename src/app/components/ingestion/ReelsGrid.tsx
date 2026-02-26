'use client';

import React from 'react';
import { ReelCard, type ReelCardData } from './ReelCard';

type ReelsGridProps = {
  reels: ReelCardData[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
};

export function ReelsGrid({ reels, onApprove, onReject }: ReelsGridProps) {
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
        <ReelCard
          key={reel.id}
          reel={reel}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
