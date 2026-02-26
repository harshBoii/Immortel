'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import type { ReelCardData } from '../ReelCard';

type PreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reel: ReelCardData | null;
};

const STREAM_CUSTOMER = process.env.NEXT_PUBLIC_STREAM_CUSTOMER ?? 'customer-5f6vfk6lgnhsk276';

function buildHlsUrl(streamId: string) {
  return `https://${STREAM_CUSTOMER}.cloudflarestream.com/${streamId}/manifest/video.m3u8`;
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ─── Custom clip player ─── */

type ClipPlayerProps = {
  streamId: string;
  startTime: number;
  endTime: number;
  title?: string;
  hook?: string | null;
};

function ClipPlayer({ streamId, startTime, endTime, title, hook }: ClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const clipDuration = endTime - startTime;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowControls(true);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = buildHlsUrl(streamId);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: startTime });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.currentTime = startTime;
        video.muted = false;
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = startTime;
        video.muted = false;
        video.play().catch(() => {});
      }, { once: true });
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(hideTimer.current);
    };
  }, [streamId, startTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      const ct = video.currentTime;
      const rel = Math.max(0, ct - startTime);
      const pct = Math.min(1, rel / clipDuration);
      setProgress(pct);
      setElapsed(rel);

      if (ct >= endTime - 0.15) {
        video.currentTime = startTime;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const onPlay = () => { setPlaying(true); setLoading(false); rafRef.current = requestAnimationFrame(tick); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onSeeked = () => {
      if (video.currentTime < startTime - 0.5 || video.currentTime > endTime + 0.5) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('seeked', onSeeked);
      cancelAnimationFrame(rafRef.current);
    };
  }, [startTime, endTime, clipDuration]);

  useEffect(() => { scheduleHide(); }, [playing, scheduleHide]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    scheduleHide();
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = startTime + pct * clipDuration;
  };

  return (
    <div className="absolute inset-0 bg-black select-none" onClick={togglePlay} onMouseMove={scheduleHide}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        preload="auto"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Play/pause center tap feedback */}
      <AnimatePresence>
        {showControls && !playing && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="p-5 rounded-full bg-black/40 backdrop-blur-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title chip top-left */}
      {title && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none max-w-[85%]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md bg-black/50 border border-white/10">
            <span className="text-white font-semibold text-[10px] leading-tight truncate tracking-wide uppercase">
              {title}
            </span>
          </div>
        </div>
      )}

      {/* Hook / subtitle at bottom */}
      {hook && (
        <div className="absolute bottom-16 left-0 right-0 z-30 pointer-events-none px-4">
          <p className="text-white text-[11px] leading-snug text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2">
            {hook}
          </p>
        </div>
      )}

      {/* Custom progress bar + time — always visible at the very bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Time labels */}
        <div className="flex items-center justify-between px-3 pb-0.5">
          <span className="text-[9px] text-white/80 font-mono tabular-nums drop-shadow">
            {fmt(elapsed)}
          </span>
          <span className="text-[9px] text-white/80 font-mono tabular-nums drop-shadow">
            {fmt(clipDuration)}
          </span>
        </div>
        {/* Track */}
        <div
          ref={progressRef}
          className="h-[3px] w-full bg-white/20 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-white rounded-r-full transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Close icon ─── */

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ─── Modal ─── */

export function ReelPreviewModal({ isOpen, onClose, reel }: PreviewModalProps) {
  if (!isOpen || !reel) return null;

  const hasStream = Boolean(reel.parentStreamId);
  const durationSec = Math.floor(reel.endTime - reel.startTime);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col lg:flex-row"
          >
            {/* Left: metadata */}
            <div className="lg:w-[45%] p-6 overflow-y-auto border-r border-[var(--glass-border)]">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">Short Preview</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <IconX />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Title</span>
                  <p className="text-sm font-medium text-foreground">{reel.title}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Parent video</span>
                  <p className="text-sm text-foreground">{reel.parentTitle}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Segment</span>
                  <p className="text-sm text-foreground">
                    {fmt(reel.startTime)} – {fmt(reel.endTime)} ({durationSec}s)
                  </p>
                </div>
                {reel.hook && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Hook</span>
                    <p className="text-sm text-foreground">{reel.hook}</p>
                  </div>
                )}
                {reel.description && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Description</span>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{reel.description}</p>
                  </div>
                )}
                {reel.category && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Category</span>
                    <p className="text-sm text-foreground">{reel.category}</p>
                  </div>
                )}
                {reel.shortType && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Style</span>
                    <p className="text-sm text-foreground">{reel.shortType}</p>
                  </div>
                )}
                {reel.tags && reel.tags.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {reel.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Status</span>
                  <p className="text-sm text-foreground">{reel.status}</p>
                </div>
                {reel.createdAt && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Created</span>
                    <p className="text-sm text-foreground">{new Date(reel.createdAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: mobile phone frame with custom player */}
            <div className="lg:w-[55%] p-6 flex flex-col items-center justify-center bg-[var(--glass-hover)] relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--glass-active)] text-muted-foreground hover:text-foreground hidden lg:flex z-10"
              >
                <IconX />
              </button>

              <div className="w-full max-w-[300px]">
                <div className="relative mx-auto w-full">
                  <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-[6px] border-gray-800">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-gray-900 rounded-b-2xl z-10" />

                    {/* Screen */}
                    <div
                      className="relative bg-black rounded-[2.5rem] overflow-hidden"
                      style={{ aspectRatio: '9/16' }}
                    >
                      {hasStream ? (
                        <ClipPlayer
                          streamId={reel.parentStreamId!}
                          startTime={reel.startTime}
                          endTime={reel.endTime}
                          title={reel.title}
                          hook={reel.hook}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white/50 px-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p className="text-sm">Stream not available</p>
                            <p className="text-xs mt-1">Parent video is still processing</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full" />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Tap to play · {fmt(reel.startTime)} – {fmt(reel.endTime)}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
