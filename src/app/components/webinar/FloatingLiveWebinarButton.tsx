'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PixelatedButton } from '../common/UI/Buttons';

type ActiveWebinarResponse = {
  success: boolean;
  data?: {
    state: 'LIVE' | 'UPCOMING' | 'NONE';
    webinar: {
      id: string;
      title: string;
    } | null;
    offsetSeconds: number;
  };
  error?: string;
};

export function FloatingLiveWebinarButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleClick = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const res = await fetch('/api/webinars/active', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const json = (await res.json()) as ActiveWebinarResponse;

      if (!json.success) {
        setMessage(json.error || 'Unable to fetch webinar information.');
        return;
      }

      if (!json.data || json.data.state === 'NONE' || !json.data.webinar) {
        setMessage('No live or upcoming webinars right now.');
        return;
      }

      const offset = Math.max(0, Math.floor(json.data.offsetSeconds ?? 0));
      const search = offset > 0 ? `?offset=${offset}` : '';

      router.push(`/webinar/${json.data.webinar.id}${search}`);
    } catch (error) {
      console.error('Error resolving active webinar', error);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {message && (
        <div className="px-3 py-1.5 rounded-lg text-xs bg-background/95 text-foreground shadow-md border border-border max-w-xs">
          {message}
        </div>
      )}
      <PixelatedButton
        variant="viewMore"
        onClick={handleClick}
        className="flex items-center gap-2 shadow-lg disabled:opacity-60"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {loading ? 'Checking webinar…' : 'View Live Webinar'}
        </span>
      </PixelatedButton>
    </div>
  );
}

