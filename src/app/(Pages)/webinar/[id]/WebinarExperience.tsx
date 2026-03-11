'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WebinarPlayer } from '@/app/components/webinar/WebinarPlayer';
import { SimulatedChatPanel, SimulatedChatMessage } from '@/app/components/webinar/SimulatedChatPanel';
import { AttendeeGrid, WebinarParticipant } from '@/app/components/webinar/AttendeeGrid';

type WebinarDetailResponse = {
  success: boolean;
  data?: {
    webinar: {
      id: string;
      title: string;
      description?: string | null;
      status: string;
      scheduledAt?: string | null;
    };
    asset: {
      id: string;
      title: string;
      duration?: number | null;
      playbackUrl?: string | null;
      thumbnailUrl?: string | null;
    } | null;
    simulated: {
      chatScript: {
        messages: SimulatedChatMessage[];
      };
      participants: {
        participants: WebinarParticipant[];
      };
    };
  };
  error?: string;
};

type WebinarExperienceProps = {
  webinarId: string;
  initialOffsetSeconds: number;
};

export default function WebinarExperience({
  webinarId,
  initialOffsetSeconds,
}: WebinarExperienceProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentSecond, setCurrentSecond] = React.useState(initialOffsetSeconds);
  const [response, setResponse] = React.useState<WebinarDetailResponse['data'] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/webinars/${webinarId}`);
        const json = (await res.json()) as WebinarDetailResponse;
        if (!json.success) {
          throw new Error(json.error || 'Unable to load webinar.');
        }
        if (!cancelled) {
          setResponse(json.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [webinarId]);

  const webinar = response?.webinar;
  const asset = response?.asset;
  const simulated = response?.simulated;
  const effectiveOffset = Math.max(0, initialOffsetSeconds || 0);

  const handleLeave = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading webinar…</p>
        </div>
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          {error || 'Webinar not found.'}
        </div>
      </div>
    );
  }

  const playbackUrl = asset?.playbackUrl ?? '';
  const participantsList = simulated?.participants.participants ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
      {/* Top navigation bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="10 2 2 12 10 22 10 2" /><polygon points="14 2 22 12 14 22 14 2" /></svg>
          </div>
          <span className="text-base font-bold text-gray-900">Immortel</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Webinar title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">{webinar.title}</h1>
      </div>

      {/* Main content: 75/25 split */}
      <div className="flex flex-1 gap-4 px-6 pb-4 overflow-hidden">
        {/* Left pane - 75% */}
        <div className="flex w-3/4 flex-col gap-3 min-h-0">
          {/* Video player */}
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {playbackUrl ? (
              <WebinarPlayer
                src={playbackUrl}
                poster={asset?.thumbnailUrl}
                durationSeconds={asset?.duration ?? undefined}
                initialOffsetSeconds={effectiveOffset}
                onTimeUpdate={setCurrentSecond}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 text-sm text-gray-500">
                Video asset not linked to this webinar yet.
              </div>
            )}
          </div>

          {/* Attendee grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AttendeeGrid participants={participantsList} />
          </div>
        </div>

        {/* Right pane - 25% */}
        <div className="w-1/4 min-w-[280px] flex flex-col min-h-0">
          <SimulatedChatPanel
            webinarTitle={webinar.title}
            messages={simulated?.chatScript.messages ?? []}
            currentSecond={currentSecond}
            participants={participantsList.map((p) => ({
              name: p.name,
              initials: p.initials,
              avatarColor: p.avatarColor,
            }))}
            onLeave={handleLeave}
          />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-gray-200 bg-white px-6 py-2.5">
        <div className="mx-auto flex max-w-md items-center justify-center gap-5">
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M1 14s1-2 5-2 5 2 5 2V4S7 6 5 6 1 4 1 4z" /></svg>
          </button>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </button>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
          </button>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          </button>
          <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
