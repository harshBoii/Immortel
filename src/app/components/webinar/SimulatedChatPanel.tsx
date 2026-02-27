'use client';

import React from 'react';

export type SimulatedChatMessage = {
  id: string;
  author: string;
  avatarUrl?: string;
  role?: 'host' | 'attendee';
  text: string;
  atSecond: number;
};

type SimulatedChatPanelProps = {
  webinarTitle: string;
  messages: SimulatedChatMessage[];
  currentSecond: number;
  participants: Array<{ name: string; initials: string; avatarColor?: string }>;
  onLeave?: () => void;
};

const AVATAR_COLORS = [
  '#6366f1', '#3b82f6', '#f97316', '#8b5cf6', '#ef4444',
  '#14b8a6', '#f59e0b', '#ec4899', '#10b981',
];

function getAuthorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getTimeAgo(messageSecond: number, currentSecond: number): string {
  const diff = currentSecond - messageSecond;
  if (diff < 60) return 'Just now';
  const mins = Math.floor(diff / 60);
  return `${mins} min`;
}

export function SimulatedChatPanel({
  webinarTitle,
  messages,
  currentSecond,
  participants,
  onLeave,
}: SimulatedChatPanelProps) {
  const [visibleMessages, setVisibleMessages] = React.useState<SimulatedChatMessage[]>([]);
  const [userMessages, setUserMessages] = React.useState<SimulatedChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const shownIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const newlyVisible = messages.filter(
      (m) => m.atSecond <= currentSecond && !shownIdsRef.current.has(m.id),
    );
    if (newlyVisible.length) {
      newlyVisible.forEach((m) => shownIdsRef.current.add(m.id));
      setVisibleMessages((prev) => [...prev, ...newlyVisible].sort((a, b) => a.atSecond - b.atSecond));
    }
  }, [currentSecond, messages]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages, userMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const newMessage: SimulatedChatMessage = {
      id: `user-${Date.now()}`,
      author: 'You',
      text: trimmed,
      atSecond: currentSecond,
      role: 'attendee',
    };
    setUserMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  const allMessages = [...visibleMessages, ...userMessages].sort((a, b) => a.atSecond - b.atSecond);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-bold text-gray-900 tracking-wide uppercase">LIVE CHAT</span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        </div>
      </div>

      {/* Webinar info */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-900 leading-tight">{webinarTitle}</span>
          <span className="text-[10px] text-gray-500">Webinar</span>
        </div>
      </div>

      {/* "LIVE CHAT" section label */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">LIVE CHAT</span>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-2"
      >
        {allMessages.map((message) => {
          const color = message.author === 'You' ? '#3b82f6' : getAuthorColor(message.author);
          const isHost = message.role === 'host';
          const initials = message.author
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={message.id} className="flex gap-2.5">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900">{message.author}</span>
                  {isHost && (
                    <span className="rounded bg-blue-500 px-1 py-0.5 text-[8px] font-bold text-white leading-none">
                      HOST
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400 shrink-0">
                    {getTimeAgo(message.atSecond, currentSecond)}
                  </span>
                </div>
                <p className="whitespace-pre-line text-xs text-gray-600 leading-relaxed mt-0.5">{message.text}</p>
              </div>
            </div>
          );
        })}
        {!allMessages.length && (
          <p className="text-xs text-gray-400 py-4 text-center">
            Chat will appear as the webinar progresses.
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white disabled:bg-gray-300 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </form>

      {/* Participant avatars row + Leave button */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {participants.slice(0, 5).map((p, i) => (
            <div
              key={p.name + i}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold text-white ring-2 ring-white"
              style={{ backgroundColor: p.avatarColor || AVATAR_COLORS[i % AVATAR_COLORS.length] }}
            >
              {p.initials.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {participants.length > 5 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[8px] font-bold text-gray-600 ring-2 ring-white">
              +{participants.length - 5}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-lg bg-red-500 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
