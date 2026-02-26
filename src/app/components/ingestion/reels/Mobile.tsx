'use client';

import { motion } from 'framer-motion';
import { Play, Loader2, Download, AlertCircle } from 'lucide-react';

const DEFAULT_ACCENT = '#FF6B35';
const DEFAULT_LOGO = '/logo.svg';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function BrandLogo({ logoUrl, className = 'w-5 h-5' }) {
  const src = logoUrl || DEFAULT_LOGO;
  return <img src={src} alt="Logo" className={className} />;
}

export default function MobileShortPreview({
  loadingVideo,
  videoUrl,
  selectedReel,
  videoRef,
  isPlaying,
  onPlayPause,
  onPlay,
  onPause,
  aspectRatio,
  onAspectRatioChange,
  downloadingPreview,
  onDownloadPreview,
  branding,
}) {
  const primaryColor = branding?.primaryColor || DEFAULT_ACCENT;
  const logoUrl = branding?.logoUrl || null;
  const bannerUrl = branding?.banner || null;

  const is4x3 = aspectRatio === '4:3';

  return (
    <div className="w-full max-w-[360px]">
      {/* Mobile Phone Frame */}
      <div className="relative mx-auto w-full">
        <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-8 border-gray-800">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10" />

          {/* Screen Container - 9:16 aspect ratio */}
          <div className="relative bg-black rounded-[2.5rem] overflow-hidden py-27" style={{ aspectRatio: '9/16' }}>
            {loadingVideo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            ) : videoUrl ? (
              <>
                {/* Video Background - scaled to fit with black bars (like FFmpeg pad) */}
                <div className="absolute inset-0 bg-black flex items-center justify-center h-40">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-w-full max-h-full object-contain"
                    playsInline
                    onPlay={onPlay}
                    onPause={onPause}
                  />
                </div>

                {/* Play/Pause Overlay */}
                <div
                  onClick={onPlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-black/10 transition-colors cursor-pointer z-20"
                >
                  {!isPlaying && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="p-4 rounded-full bg-white/20 backdrop-blur-md"
                    >
                      <Play className="w-8 h-8 text-white fill-white" />
                    </motion.div>
                  )}
                </div>

                {/* Overlays - layout depends on aspect ratio */}
                {is4x3 ? (
                  /* 4:3 - Full top and bottom banners with company branding */
                  <>
                    {/* Top Banner - no orange line, content spaced from edges */}
                    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none" style={{ height: '9.375%' }}>
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : { backgroundColor: 'rgba(0,0,0,0.75)' }}
                      />
                      {!bannerUrl && <div className="absolute inset-0 bg-black/75" />}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 py-1.5 mt-27">
                        {logoUrl && (
                          <div className="flex-shrink-0">
                            <BrandLogo logoUrl={logoUrl} className="w-6 h-6 object-contain" />
                          </div>
                        )}
                        <h3
                          className="text-white font-bold text-sm leading-tight text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] "
                          style={{ letterSpacing: '0.05em' }}
                        >
                          {selectedReel?.title?.toUpperCase() || 'SELECT A REEL'}
                        </h3>
                      </div>
                    </div>

                    {/* Bottom Banner - no orange line, content spaced from edges */}
                    <div className="absolute bottom-10 left-0 right-0 z-30 pointer-events-none" style={{ height: '9.375%' }}>
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : { backgroundColor: 'rgba(0,0,0,0.75)' }}
                      />
                      {!bannerUrl && <div className="absolute inset-0 bg-black/75" />}
                      <div className="absolute inset-0 flex items-center justify-center px-4 py-1.5 ">
                        <p className="text-white text-[11px] leading-tight text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2 mb-30">
                          {selectedReel?.hook || 'Select a reel to preview...'}
                        </p>
                      </div>
                      <div
                        className="absolute right-3 bottom-2 font-bold text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ color: primaryColor }}
                      >
                        ClipFox
                      </div>
                    </div>
                  </>
                ) : (
                  /* 9:16 - Top-left chip (logo + title), subtitle at bottom */
                  <>
                    {/* Top-left chip with logo + title */}
                    <div className="absolute top-3 left-3 z-30 pointer-events-none max-w-[85%]">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md bg-black/60 border border-white/10">
                        <div className="flex-shrink-0">
                          <BrandLogo logoUrl={logoUrl} className="w-5 h-5 object-contain" />
                        </div>
                        <h3
                          className="text-white font-bold text-xs leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate"
                          style={{ letterSpacing: '0.03em' }}
                        >
                          {selectedReel?.title?.toUpperCase() || 'SELECT A REEL'}
                        </h3>
                      </div>
                    </div>

                    {/* Bottom subtitle + branding */}
                    <div className="absolute bottom-14 left-0 right-0 z-30 pointer-events-none px-4 pr-12">
                      <p className="text-white text-[11px] leading-tight text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                        {selectedReel?.hook || 'Select a reel to preview...'}
                      </p>
                    </div>
                    <div
                      className="absolute bottom-14 right-3 z-30 pointer-events-none font-bold text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                      style={{ color: primaryColor }}
                    >
                      ClipFox
                    </div>
                  </>
                )}

                {/* Time indicator - very bottom, outside borders */}
                {selectedReel && (
                  <div className="absolute bottom-0.5 left-1 right-1 px-1.5 py-0.5 rounded-sm bg-black/50 backdrop-blur-sm text-white text-[8px] font-medium text-center z-50">
                    {formatTime(selectedReel.startTime)} - {formatTime(selectedReel.endTime)}
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Video not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* Aspect ratio + Preview disclaimer + Download button */}
      <div className="mt-6 space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <label htmlFor="aspect-ratio" className="text-xs font-medium text-muted-foreground">
            Aspect ratio:
          </label>
          <select
            id="aspect-ratio"
            value={aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm text-foreground focus:ring-2 focus:ring-[var(--clipfox-primary)]/50 focus:border-[var(--clipfox-primary)] outline-none"
          >
            <option value="9:16">9:16 (Vertical)</option>
            <option value="4:3">4:3 (Landscape)</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground max-w-[700px] mx-auto leading-relaxed">
        Preview only. Your final short will be higher quality with full branding and AI editing        
        </p>
        <button
          type="button"
          onClick={onDownloadPreview}
          disabled={!selectedReel || downloadingPreview}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm text-white bg-[length:200%_100%] hover:bg-right transition-[background-position] duration-500 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
          style={{
            backgroundImage: `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd, ${primaryColor})`,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)',
          }}
        >
          {downloadingPreview ? (
            <>
              <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 shrink-0" />
              Create Short with this Segment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
