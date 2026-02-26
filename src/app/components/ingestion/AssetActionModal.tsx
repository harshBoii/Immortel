'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { AssetCardData } from '../common/AssetCard';
import { Tooltip } from '../common/Tooltip';

type AssetActionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetCardData | null;
  onComplete?: (action: 'webinar' | 'shorts', data: Record<string, unknown>) => void;
};

type Path = 'choice' | 'webinar' | 'shorts' | null;
type WebinarStep = 0 | 1 | 2;
type ShortsStep = 0 | 1 | 2 | 3 | 4;

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function parseDuration(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 45 : n;
}

function platformToShortType(platform: string): string {
  if (platform === 'TikTok') return 'FLASHY';
  if (platform === 'Reels') return 'CASUAL';
  if (platform === 'YouTube Shorts') return 'EDUCATIONAL';
  return 'CASUAL';
}

export function AssetActionModal({ isOpen, onClose, asset, onComplete }: AssetActionModalProps) {
  const [path, setPath] = useState<Path>(null);
  const [webinarStep, setWebinarStep] = useState<WebinarStep>(0);
  const [shortsStep, setShortsStep] = useState<ShortsStep>(0);
  const [webinarSubmitting, setWebinarSubmitting] = useState(false);
  const [shortsSubmitting, setShortsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [webinarTitle, setWebinarTitle] = useState('');
  const [webinarSchedule, setWebinarSchedule] = useState<'24x7' | 'scheduled' | ''>('');
  const [webinarScheduleType, setWebinarScheduleType] = useState<'recurring' | 'onetime'>('recurring');
  const [webinarDays, setWebinarDays] = useState<number[]>([]);
  const [webinarDate, setWebinarDate] = useState('');
  const [webinarStartTime, setWebinarStartTime] = useState('');
  const [webinarEndTime, setWebinarEndTime] = useState('');

  const [shortsCount, setShortsCount] = useState<number | ''>(3);
  const [shortsDuration, setShortsDuration] = useState('');
  const [shortsPlatform, setShortsPlatform] = useState('');
  const [shortsStyle, setShortsStyle] = useState('');

  const reset = () => {
    setPath(null);
    setWebinarStep(0);
    setShortsStep(0);
    setWebinarTitle('');
    setWebinarSchedule('');
    setWebinarScheduleType('recurring');
    setWebinarDays([]);
    setWebinarDate('');
    setWebinarStartTime('');
    setWebinarEndTime('');
    setShortsCount(3);
    setShortsDuration('');
    setShortsPlatform('');
    setShortsStyle('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBack = () => {
    if (path === 'webinar' && webinarStep > 1) setWebinarStep((s) => (s - 1) as WebinarStep);
    else if (path === 'shorts' && shortsStep > 1) setShortsStep((s) => (s - 1) as ShortsStep);
    else setPath(null);
  };

  const renderChoice = () => (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">What would you like to do with this asset?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { setPath('webinar'); setWebinarStep(1); }}
          className="p-4 rounded-xl border-2 border-[var(--glass-border)] hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
        >
          <span className="text-2xl mb-2 block">🎥</span>
          <span className="font-semibold text-foreground">Use As Webinar</span>
          <p className="text-xs text-muted-foreground mt-1">Schedule as a live or on-demand webinar</p>
        </button>
        <button
          type="button"
          onClick={() => { setPath('shorts'); setShortsStep(1); }}
          className="p-4 rounded-xl border-2 border-[var(--glass-border)] hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
        >
          <span className="text-2xl mb-2 block">✂️</span>
          <span className="font-semibold text-foreground">Generate Shorts</span>
          <p className="text-xs text-muted-foreground mt-1">Create clips for TikTok, Reels, or YouTube Shorts</p>
        </button>
      </div>
    </div>
  );

  const renderWebinarFlow = () => {
    switch (webinarStep) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Give your webinar a title</p>
            <input
              type="text"
              value={webinarTitle}
              onChange={(e) => setWebinarTitle(e.target.value)}
              placeholder="e.g. Product Launch Q&A"
              className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={() => setWebinarStep(2)}
              disabled={!webinarTitle.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">When should the webinar be active?</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setWebinarSchedule('24x7')}
                className={`w-full p-4 rounded-xl border text-left transition-all ${webinarSchedule === '24x7' ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
              >
                <span className="font-semibold">Active 24×7</span>
                <p className="text-xs text-muted-foreground mt-1">Webinar is always available, on-demand anytime</p>
              </button>
              <button
                type="button"
                onClick={() => setWebinarSchedule('scheduled')}
                className={`w-full p-4 rounded-xl border text-left transition-all ${webinarSchedule === 'scheduled' ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
              >
                <span className="font-semibold">Schedule a time (IST)</span>
                <p className="text-xs text-muted-foreground mt-1">Run during specific hours, e.g. every day 5–7 PM</p>
              </button>
            </div>
            {webinarSchedule === 'scheduled' && (
              <div className="pt-2 space-y-3 border-t border-[var(--glass-border)]">
                <p className="text-xs text-muted-foreground">Day or date</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setWebinarScheduleType('recurring'); setWebinarDate(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${webinarScheduleType === 'recurring' ? 'border-primary bg-primary/10 text-primary border' : 'border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
                  >
                    Recurring
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWebinarScheduleType('onetime'); setWebinarDays([]); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${webinarScheduleType === 'onetime' ? 'border-primary bg-primary/10 text-primary border' : 'border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
                  >
                    One-time
                  </button>
                </div>
                {webinarScheduleType === 'recurring' ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => {
                        const selected = webinarDays.includes(i);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              setWebinarDays((prev) =>
                                selected ? prev.filter((d) => d !== i) : [...prev, i].sort((a, b) => a - b)
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selected ? 'bg-primary text-primary-foreground' : 'border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWebinarDays([0, 1, 2, 3, 4, 5, 6])}
                      className="text-xs text-primary hover:underline"
                    >
                      Every day
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="date"
                      value={webinarDate}
                      onChange={(e) => setWebinarDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Time (IST)</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={webinarStartTime}
                    onChange={(e) => setWebinarStartTime(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={webinarEndTime}
                    onChange={(e) => setWebinarEndTime(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">IST</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setWebinarStep(1)} className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                Back
              </button>
              <button
                type="button"
                disabled={
                  webinarSubmitting ||
                  !webinarSchedule ||
                  (webinarSchedule === 'scheduled' &&
                    (!webinarStartTime ||
                      !webinarEndTime ||
                      (webinarScheduleType === 'recurring' && webinarDays.length === 0) ||
                      (webinarScheduleType === 'onetime' && !webinarDate)))
                }
                onClick={async () => {
                  setError(null);
                  setWebinarSubmitting(true);
                  const payload =
                    webinarSchedule === '24x7'
                      ? { title: webinarTitle, schedule: '24x7', assetId: asset?.id }
                      : webinarScheduleType === 'recurring'
                        ? { title: webinarTitle, schedule: 'scheduled', type: 'recurring', daysOfWeek: webinarDays, startTime: webinarStartTime, endTime: webinarEndTime, timezone: 'IST', assetId: asset?.id }
                        : { title: webinarTitle, schedule: 'scheduled', type: 'onetime', date: webinarDate, startTime: webinarStartTime, endTime: webinarEndTime, timezone: 'IST', assetId: asset?.id };
                  try {
                    const res = await fetch('/api/webinars', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                      setError(data.error || 'Failed to create webinar');
                      return;
                    }
                    onComplete?.('webinar', payload);
                    handleClose();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setWebinarSubmitting(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {webinarSubmitting ? 'Creating…' : 'Confirm'}
              </button>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  const renderShortsFlow = () => {
    switch (shortsStep) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How many shorts do you want to generate?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setShortsCount(n)}
                  className={`py-3 rounded-xl border transition-all ${shortsCount === n ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Custom:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={typeof shortsCount === 'number' && ![1, 2, 3, 5, 10].includes(shortsCount) ? shortsCount : ''}
                onChange={(e) => setShortsCount(e.target.value === '' ? '' : Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                placeholder="1–50"
                className="w-20 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShortsStep(0)} className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                Back
              </button>
              <button
                type="button"
                onClick={() => setShortsStep(2)}
                disabled={!shortsCount || shortsCount < 1}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Target duration for each short?</p>
            <div className="grid grid-cols-3 gap-2">
              {['15 sec', '30 sec', '60 sec'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setShortsDuration(d)}
                  className={`py-3 rounded-xl border transition-all ${shortsDuration === d ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShortsStep(1)} className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                Back
              </button>
              <button
                type="button"
                onClick={() => setShortsStep(3)}
                disabled={!shortsDuration}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Which platform style?</p>
            <div className="grid grid-cols-2 gap-2">
              {['TikTok', 'Reels', 'YouTube Shorts', 'Generic'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setShortsPlatform(p)}
                  className={`py-3 rounded-xl border transition-all ${shortsPlatform === p ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShortsStep(2); setError(null); }} className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                Back
              </button>
              <button
                type="button"
                disabled={!shortsPlatform || !asset?.id || shortsSubmitting}
                onClick={async () => {
                  setError(null);
                  setShortsSubmitting(true);
                  const count = typeof shortsCount === 'number' ? shortsCount : 3;
                  const duration = parseDuration(shortsDuration || '30 sec');
                  const short_type = platformToShortType(shortsPlatform || 'Generic');
                  try {
                    const res = await fetch(`/api/assets/${asset!.id}/generate-micro-assets`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        num_micro_assets: count,
                        duration,
                        short_type,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                      setError(data.error || 'Failed to generate shorts');
                      return;
                    }
                    onComplete?.('shorts', {
                      count,
                      duration: shortsDuration,
                      platform: shortsPlatform,
                      style: shortsStyle,
                      micro_assets_count: data.micro_assets_count,
                    });
                    handleClose();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setShortsSubmitting(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shortsSubmitting ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const stepLabel = path === 'webinar'
    ? `Webinar · Step ${webinarStep}/2`
    : path === 'shorts'
      ? `Shorts · Step ${shortsStep}/3`
      : 'Choose action';

  if (!isOpen) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-card rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{stepLabel}</h2>
            {asset && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{asset.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(path === 'webinar' && webinarStep > 1) || (path === 'shorts' && shortsStep > 1) ? (
              <Tooltip content="Go back">
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground"
                >
                  ←
                </button>
              </Tooltip>
            ) : null}
            <Tooltip content="Close">
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground"
              >
                <IconX />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {path === null && renderChoice()}
            {path === 'webinar' && renderWebinarFlow()}
            {path === 'shorts' && renderShortsFlow()}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
