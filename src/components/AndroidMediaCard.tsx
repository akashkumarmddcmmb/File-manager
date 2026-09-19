import React, { useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { FileItem, Language } from '../types';
import { triggerHapticFeedback } from '../utils/nativeStorage';

interface AndroidMediaCardProps {
  file: FileItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  language?: Language;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onOpenOutputSheet?: () => void;
  className?: string;
}

export const AndroidMediaCard: React.FC<AndroidMediaCardProps> = ({
  file,
  isPlaying,
  currentTime,
  duration,
  language = 'en',
  onPlayPause,
  onSeek,
  onNext,
  onPrev,
  onOpenOutputSheet,
  className = '',
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentDisplayTime = isSeeking ? seekValue : currentTime;
  const validDuration = duration > 0 ? duration : 100;
  const progressPercent = Math.min(100, Math.max(0, (currentDisplayTime / validDuration) * 100));

  const cleanTitle = file ? file.name.replace(/\.[^/.]+$/, '') : 'Saiyan Se Chhup Ke(MP3_160...';
  const cleanArtist = file?.folder ? file.folder.replace(/^\//, '') : 'Anuradha Paudwal - Topic';

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSeekValue(val);
    if (!isSeeking) setIsSeeking(true);
  };

  const handleSliderCommit = () => {
    if (isSeeking) {
      onSeek(seekValue);
      setIsSeeking(false);
    }
  };

  return (
    <div 
      id="android-media-player-card"
      className={`w-full max-w-[360px] mx-auto bg-[#202124] text-white rounded-[28px] p-5 shadow-2xl border border-white/5 select-none transition-all duration-300 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. TOP ROW: Album Artwork + Title & Artist + Media Output Icon */}
      <div className="flex items-center justify-between gap-3.5 min-w-0">
        {/* Album Artwork Thumbnail with App Origin Badge */}
        <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-md bg-neutral-800 shrink-0 border border-white/10 flex items-center justify-center">
          {file?.thumbnail ? (
            <img 
              src={file.thumbnail} 
              alt={file.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-sky-900 via-indigo-800 to-purple-900 flex items-center justify-center text-white">
              <Volume2 size={22} className="text-white/90" />
            </div>
          )}

          {/* Tiny App Origin Badge in bottom-left corner of thumbnail (as in screenshot) */}
          <div className="absolute bottom-1 left-1 w-4 h-4 rounded-md bg-white shadow-xs flex items-center justify-center p-0.5">
            <svg viewBox="0 0 24 24" className="w-full h-full text-blue-600 fill-current">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        {/* Track Title and Artist / Topic */}
        <div className="min-w-0 flex-1 pr-1">
          <h3 
            className="text-[15px] sm:text-base font-semibold text-white tracking-tight truncate leading-tight" 
            title={cleanTitle}
          >
            {cleanTitle}
          </h3>
          <p className="text-[13px] text-[#9aa0a6] truncate mt-1 font-normal leading-tight">
            {cleanArtist}
          </p>
        </div>

        {/* Right: Exact Android 13/14 Media Output Icon (concentric arcs over triangle) */}
        <button
          id="btn-media-output-selector"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            if (onOpenOutputSheet) onOpenOutputSheet();
          }}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
          title={language === 'hi' ? 'ऑडियो आउटपुट डिवाइस' : 'Media output device'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-white">
            {/* Base triangle */}
            <polygon points="12,12 8,19 16,19" fill="currentColor" />
            {/* Inner arc */}
            <path d="M7.5 10 C9.5 8 14.5 8 16.5 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Outer arc */}
            <path d="M4.5 7 C8.5 4 15.5 4 19.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 2. MIDDLE ROW: Scrubber Progress Line with White Circular Thumb & Timestamps */}
      <div className="mt-5 space-y-1.5" ref={progressBarRef}>
        {/* Interactive Progress Slider Container */}
        <div className="relative flex items-center h-4 group cursor-pointer">
          {/* Base Unplayed Track (Muted Grey Line) */}
          <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden">
            {/* Played Track (Solid White Line) */}
            <div 
              className="h-full bg-white transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* White Circular Thumb Dot (Exact match to screenshot!) */}
          <div 
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none transition-all duration-75 transform -translate-x-1/2"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Transparent full-width slider input on top for touch/mouse interaction */}
          <input
            type="range"
            min={0}
            max={validDuration}
            value={currentDisplayTime}
            onChange={handleSliderChange}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={handleSliderCommit}
            onTouchStart={() => setIsSeeking(true)}
            onTouchEnd={handleSliderCommit}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Timestamps: Left (Current Time) and Right (Total Duration) */}
        <div className="flex justify-between text-xs font-mono text-[#9aa0a6] px-0.5">
          <span>{formatTime(currentDisplayTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Exactly 3 Centered Big Controls (Previous, Play/Pause, Next) */}
      <div className="flex items-center justify-around px-2 pt-2">
        {/* Previous Track: Solid vertical bar + left-pointing triangle */}
        <button
          id="btn-android-media-prev"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            onPrev();
          }}
          className="p-3 text-white hover:text-neutral-200 active:scale-90 transition-transform cursor-pointer"
          title={language === 'hi' ? 'पिछला गाना' : 'Previous Song'}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="text-white">
            <rect x="3" y="4" width="2.5" height="16" rx="1" />
            <polygon points="21,4 8,12 21,20" />
          </svg>
        </button>

        {/* Play / Pause: Solid Play Triangle or Pause Two Vertical Bars */}
        <button
          id="btn-android-media-play-pause"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            onPlayPause();
          }}
          className="p-3 text-white hover:text-neutral-200 active:scale-90 transition-transform cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            /* Pause: Two solid rounded vertical bars */
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <rect x="5" y="4" width="4.5" height="16" rx="1.5" />
              <rect x="14.5" y="4" width="4.5" height="16" rx="1.5" />
            </svg>
          ) : (
            /* Play: Solid right-pointing triangle */
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-0.5">
              <polygon points="6,3 21,12 6,21" />
            </svg>
          )}
        </button>

        {/* Next Track: Solid right-pointing triangle + vertical bar */}
        <button
          id="btn-android-media-next"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            onNext();
          }}
          className="p-3 text-white hover:text-neutral-200 active:scale-90 transition-transform cursor-pointer"
          title={language === 'hi' ? 'अगला गाना' : 'Next Song'}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="text-white">
            <polygon points="3,4 16,12 3,20" />
            <rect x="18.5" y="4" width="2.5" height="16" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};
