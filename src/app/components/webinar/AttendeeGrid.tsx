'use client';

import React from 'react';

export type WebinarParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarColor?: string;
  initials: string;
  hasAvatar?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
};

type AttendeeGridProps = {
  participants: WebinarParticipant[];
};

const AVATAR_COLORS = [
  '#6366f1', '#f97316', '#8b5cf6', '#3b82f6', '#ef4444',
  '#14b8a6', '#f59e0b', '#ec4899', '#10b981', '#6366f1',
];

export function AttendeeGrid({ participants }: AttendeeGridProps) {
  const [speakingIds, setSpeakingIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!participants.length) return;
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const next = new Set<string>();
      shuffled.slice(0, Math.min(2, participants.length)).forEach((p) => next.add(p.id));
      setSpeakingIds(next);
    }, 2500);
    return () => clearInterval(interval);
  }, [participants]);

  return (
    <div className="grid grid-cols-5 gap-3 p-2">
      {participants.map((participant, idx) => {
        const isSpeaking = speakingIds.has(participant.id) || participant.isSpeaking;
        const bgColor = participant.avatarColor || AVATAR_COLORS[idx % AVATAR_COLORS.length];

        return (
          <div
            key={participant.id}
            className={`relative flex flex-col items-center gap-1.5 rounded-xl bg-[#f8f9fb] border px-3 py-3 transition-all duration-300 ${
              isSpeaking
                ? 'border-blue-400/60 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
                : 'border-gray-200/80'
            }`}
          >
            {participant.hasAvatar ? (
              <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-200 ring-2 ring-white">
                <div
                  className="h-full w-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: bgColor }}
                >
                  {participant.initials.toUpperCase()}
                </div>
              </div>
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white text-sm font-bold ring-2 ring-white"
                style={{ backgroundColor: bgColor }}
              >
                {participant.initials.toUpperCase()}
              </div>
            )}

            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-gray-700 truncate max-w-[60px]">
                {participant.name}
              </span>
            </div>

            {/* Bottom-right icons */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={participant.isMuted ? '#ef4444' : '#6b7280'} strokeWidth="2.5">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  {participant.isMuted && <line x1="1" y1="1" x2="23" y2="23" />}
                </svg>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
