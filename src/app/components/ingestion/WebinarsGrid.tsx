'use client';

import React from 'react';
import { WebinarCard, type WebinarCardData } from './WebinarCard';

type WebinarsGridProps = {
  webinars: WebinarCardData[];
};

export function WebinarsGrid({ webinars }: WebinarsGridProps) {
  if (webinars.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">No webinars yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create a webinar from a video asset</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {webinars.map((webinar) => (
        <WebinarCard key={webinar.id} webinar={webinar} />
      ))}
    </div>
  );
}
