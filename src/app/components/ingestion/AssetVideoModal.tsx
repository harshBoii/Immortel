'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import type { AssetCardData } from '../common/AssetCard';

type AssetVideoModalProps = {
  isOpen: boolean;
  asset: AssetCardData | null;
  onClose: () => void;
};

type LoadedAsset = {
  id: string;
  title: string;
  filename: string;
  duration: number | null;
  resolution: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  streamId: string | null;
};

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

type PlayerProps = {
  src: string;
  poster?: string | null;
  title: string;
  durationHint?: number | null;
};

type QualityLevel = { index: number; height: number; label: string };

function FullVideoPlayer({ src, poster, title, durationHint }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const durationRef = useRef<number>(durationHint ?? 0);
  const [displayDuration, setDisplayDuration] = useState(durationHint ?? 0);
  const [current, setCurrent] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafRef = useRef<number>(0);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [activeQuality, setActiveQuality] = useState(-1);
  const [showQuality, setShowQuality] = useState(false);
  const qualityRef = useRef<HTMLDivElement>(null);
  const volumeWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (qualityRef.current && !qualityRef.current.contains(e.target as Node)) setShowQuality(false);
      if (volumeWrapRef.current && !volumeWrapRef.current.contains(e.target as Node)) setShowVolume(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const scheduleHide = useCallback(() => {
    if (!playing) {
      setShowChrome(true);
      return;
    }
    setShowChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowChrome(false), 2500);
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels: QualityLevel[] = hls.levels.map((l, i) => ({
          index: i,
          height: l.height,
          label: `${l.height}p`,
        }));
        setQualities(levels);
        setActiveQuality(-1);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncDuration = () => {
      const d = video.duration;
      if (d && Number.isFinite(d) && d > 0) {
        durationRef.current = d;
        setDisplayDuration(d);
      }
    };

    const update = () => {
      setCurrent(video.currentTime || 0);
      syncDuration();
      rafRef.current = requestAnimationFrame(update);
    };

    const onPlay = () => { setPlaying(true); setLoading(false); cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(update); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(rafRef.current); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('durationchange', syncDuration);
    video.addEventListener('loadedmetadata', syncDuration);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('durationchange', syncDuration);
      video.removeEventListener('loadedmetadata', syncDuration);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => { scheduleHide(); }, [playing, scheduleHide]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.muted = muted; video.play().catch(() => {}); }
    else video.pause();
    scheduleHide();
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const video = videoRef.current;
    const bar = progressBarRef.current;
    const dur = durationRef.current;
    if (!video || !bar || dur <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * dur;
    scheduleHide();
  };

  const handleVolumeClick = (e: React.MouseEvent) => {
    const bar = volumeBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(pct);
    if (pct > 0 && muted) setMuted(false);
    if (pct === 0) setMuted(true);
  };

  const handleQualityChange = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setActiveQuality(index);
    setShowQuality(false);
  };

  const dur = displayDuration;
  const progress = dur > 0 ? Math.max(0, Math.min(1, current / dur)) : 0;

  const VolumeIcon = () => {
    if (muted || volume === 0) return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
        <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
    if (volume < 0.5) return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );
  };

  return (
    <div
      className="relative w-full bg-black rounded-2xl overflow-hidden select-none"
      style={{ aspectRatio: '16/9' }}
      onClick={togglePlay}
      onMouseMove={scheduleHide}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        poster={poster ?? undefined}
        playsInline
        controls={false}
        preload="auto"
      />

      {/* Top gradient & title */}
      <AnimatePresence>
        {showChrome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-0 pt-3 pb-6 px-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none"
          >
            <p className="text-xs font-medium text-white/90 truncate max-w-[80%] drop-shadow">
              {title}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center play indicator */}
      <AnimatePresence>
        {showChrome && !playing && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="p-5 rounded-full bg-black/45 backdrop-blur-md shadow-lg shadow-black/60">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 border-[3px] border-white/25 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Bottom controls */}
      <AnimatePresence>
        {showChrome && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 pb-3 pt-8 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div
              ref={progressBarRef}
              className="h-[3px] rounded-full bg-white/20 cursor-pointer mb-2.5 group/bar"
              onClick={handleProgressClick}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-white to-white/80 shadow-[0_0_6px_rgba(255,255,255,0.7)] relative"
                style={{ width: `${progress * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2.5">
              {/* Play/pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition shrink-0"
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="6" y="5" width="4" height="14" rx="0.5" />
                    <rect x="14" y="5" width="4" height="14" rx="0.5" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                )}
              </button>

              {/* Volume */}
              <div ref={volumeWrapRef} className="relative flex items-center shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                  className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition"
                >
                  <VolumeIcon />
                </button>
                <div
                  className="ml-1.5 flex items-center"
                  onMouseEnter={() => setShowVolume(true)}
                  onMouseLeave={() => setShowVolume(false)}
                >
                  <div
                    className={`overflow-hidden transition-[width] duration-200 ${showVolume ? 'w-[70px]' : 'w-0'}`}
                  >
                    <div
                      ref={volumeBarRef}
                      className="h-[3px] w-[70px] rounded-full bg-white/20 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleVolumeClick(e); }}
                    >
                      <div
                        className="h-full rounded-full bg-white/80"
                        style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex-1 text-[11px] text-white/70 font-mono tabular-nums flex items-center gap-1">
                <span>{fmt(current)}</span>
                <span className="text-white/40">/</span>
                <span>{dur > 0 ? fmt(dur) : '--:--'}</span>
              </div>

              {/* Quality */}
              {qualities.length > 1 && (
                <div ref={qualityRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowQuality((q) => !q); }}
                    className="h-6 px-2 rounded bg-white/15 text-[10px] font-medium text-white hover:bg-white/25 transition flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    {activeQuality === -1 ? 'Auto' : qualities.find((q) => q.index === activeQuality)?.label ?? 'Auto'}
                  </button>
                  {showQuality && (
                    <div className="absolute bottom-full right-0 mb-1 min-w-[100px] py-1 rounded-lg bg-black/90 border border-white/10 shadow-xl backdrop-blur-md z-10">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleQualityChange(-1); }}
                        className={`w-full px-3 py-1.5 text-left text-[11px] transition ${activeQuality === -1 ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                      >
                        Auto
                      </button>
                      {qualities.sort((a, b) => b.height - a.height).map((q) => (
                        <button
                          key={q.index}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleQualityChange(q.index); }}
                          className={`w-full px-3 py-1.5 text-left text-[11px] transition ${activeQuality === q.index ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const IconX = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function AssetVideoModal({ isOpen, asset, onClose }: AssetVideoModalProps) {
  const [loaded, setLoaded] = useState<LoadedAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDetails = async () => {
      if (!isOpen || !asset) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assets/${asset.id}/description`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (!cancelled) setError(json.error ?? 'Failed to load video');
          return;
        }
        const a = json.data.asset as LoadedAsset;
        if (!cancelled) setLoaded(a);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [isOpen, asset?.id]);

  if (!isOpen || !asset) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl glass-card rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--glass-border)] bg-gradient-to-r from-background/80 via-background/40 to-background/80">
              <div>
                <p className="text-sm font-semibold text-foreground truncate max-w-[260px]">
                  {asset.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                  {asset.filename}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground"
              >
                <IconX />
              </button>
            </div>

            <div className="p-4 pb-5">
              {error && (
                <div className="glass-card rounded-xl p-6 text-center text-sm text-destructive">
                  {error}
                </div>
              )}
              {!error && (!loaded || loading) && (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
                    <div className="w-8 h-8 border-[3px] border-[var(--glass-border)] border-t-primary rounded-full animate-spin" />
                    <span>Preparing Stream playback…</span>
                  </div>
                </div>
              )}
              {loaded && loaded.playbackUrl && !error && (
                <FullVideoPlayer
                  src={loaded.playbackUrl}
                  poster={loaded.thumbnailUrl}
                  title={loaded.title}
                  durationHint={loaded.duration}
                />
              )}
              {loaded && !loaded.playbackUrl && !error && (
                <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                  Stream not ready yet for this video.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

