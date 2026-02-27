'use client';

import React from 'react';

type WebinarPlayerProps = {
  src: string;
  poster?: string | null;
  durationSeconds?: number | null;
  initialOffsetSeconds: number;
  onTimeUpdate?: (currentSeconds: number) => void;
};

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);
const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
const IconForward = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
);
const IconVolume = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
);
const IconScreen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
);
const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const IconMaximize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
);

export function WebinarPlayer({
  src,
  poster,
  durationSeconds,
  initialOffsetSeconds,
  onTimeUpdate,
}: WebinarPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const startedRef = React.useRef(false);
  const onTimeUpdateRef = React.useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const [duration, setDuration] = React.useState<number | null>(durationSeconds ?? null);
  const [volume, setVolume] = React.useState(1);
  const [showControls, setShowControls] = React.useState(true);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeDuration = duration && duration > 0 ? duration : null;

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const seekAndPlay = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const videoDuration = Number.isFinite(video.duration) ? Math.floor(video.duration) : null;
      if (videoDuration) setDuration(videoDuration);

      const maxDur = videoDuration ?? durationSeconds ?? null;
      const targetOffset =
        maxDur != null
          ? Math.min(Math.max(initialOffsetSeconds, 0), Math.max(maxDur - 1, 0))
          : Math.max(initialOffsetSeconds, 0);

      try { video.currentTime = targetOffset; } catch { /* ignore */ }
      setCurrentSeconds(targetOffset);

      video.muted = true;
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    const handleTimeUpdate = () => {
      const t = video.currentTime || 0;
      const rounded = Math.floor(t);
      setCurrentSeconds(rounded);
      onTimeUpdateRef.current?.(rounded);
    };

    video.addEventListener('loadedmetadata', seekAndPlay);
    video.addEventListener('canplay', seekAndPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);

    if (video.readyState >= 1) seekAndPlay();

    return () => {
      video.removeEventListener('loadedmetadata', seekAndPlay);
      video.removeEventListener('canplay', seekAndPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
    // Only run once on mount — offset and src are stable for the lifetime of this player
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
  };

  const progressPercent =
    safeDuration && safeDuration > 0 ? Math.min(100, (currentSeconds / safeDuration) * 100) : 0;

  const formatTime = (seconds: number | null) => {
    if (seconds == null || Number.isNaN(seconds)) return '--:--';
    const s = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(s / 60);
    const secs = s % 60;
    return `${minutes}.${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden bg-black shadow-xl group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
    >
      {/* LIVE badge + viewer count */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
        <span className="flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          LIVE
        </span>
        <span className="rounded bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white/90">
          1,284 Watching Now
        </span>
      </div>

      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="w-full h-full object-cover cursor-pointer"
        playsInline
        autoPlay
        muted
        onClick={togglePlay}
      />

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="px-3">
          <div className="h-1 rounded-full bg-white/20 overflow-hidden cursor-pointer">
            <div className="h-full bg-red-500 transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-t from-black/90 to-black/50">
          {/* Left controls */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
              {isPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <button type="button" className="text-white/70 hover:text-white transition-colors">
              <IconForward />
            </button>
            <div className="flex items-center gap-1.5">
              <button type="button" className="text-white/70 hover:text-white transition-colors">
                <IconVolume />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 accent-white appearance-none bg-white/30 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
            <span className="text-[12px] font-medium text-white/90 tabular-nums ml-1">
              {formatTime(currentSeconds)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <button type="button" className="text-white/60 hover:text-white transition-colors"><IconScreen /></button>
            <button type="button" className="text-white/60 hover:text-white transition-colors"><IconSettings /></button>
            <button type="button" className="text-white/60 hover:text-white transition-colors"><IconMaximize /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
