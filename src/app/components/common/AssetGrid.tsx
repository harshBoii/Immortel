'use client';

import React from 'react';
import { AssetCard, type AssetCardData } from './AssetCard';

type AssetGridProps = {
  assets: AssetCardData[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssetClick?: (asset: AssetCardData) => void;
  onViewVideo?: (asset: AssetCardData) => void;
};

export function AssetGrid({ assets, onApprove, onReject, onAssetClick, onViewVideo }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">No assets yet</p>
        <p className="text-xs text-muted-foreground mt-1">Upload videos, images, or documents above</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onApprove={onApprove}
          onReject={onReject}
          onClick={asset.assetType === 'VIDEO' ? onAssetClick : undefined}
          onViewVideo={asset.assetType === 'VIDEO' ? onViewVideo : undefined}
        />
      ))}
    </div>
  );
}
