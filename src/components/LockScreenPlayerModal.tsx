import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Lock, 
  Unlock, 
  Wifi, 
  Battery, 
  Music, 
  Volume2, 
  ChevronUp 
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { triggerHapticFeedback } from '../utils/nativeStorage';

interface LockScreenPlayerModalProps {
  isOpen: boolean;
  file: FileItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  language: Language;
  onClose: () => void;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
}

export const LockScreenPlayerModal: React.FC<LockScreenPlayerModalProps> = ({
  isOpen,
  file,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  language,
  onClose,
  onPlayPause,
  onSeek,
  onSeekBy,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Real-time clock for lock screen
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setDateStr(
        now.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [language]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const cleanTitle = file ? file.name.replace(/\.[^/.]+$/, '') : 'No audio playing';

  return (
    <div 
      id="screen-lock-modal-overlay"
      className="fixed inset-0 z-50 w-full h-full bg-black/90 backdrop-blur-2xl text-white flex flex-col justify-between p-6 select-none overflow-hidden animate-in fade-in duration-300"
    >
      {/* Background ambient album art glow */}
      {file?.thumbnail && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-3xl scale-125 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${file.thumbnail})` }}
        />
      )}

      {/* 1. TOP STATUS BAR */}
      <div className="w-full flex items-center justify-between text-xs text-neutral-300 z-10 pt-safe">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-400">
          <Lock size={13} className="text-amber-400 animate-pulse mr-1" />
          <span className="text-[10px] font-bold text-neutral-300 tracking-wider">
            {language === 'hi' ? 'स्क्रीन लॉक' : 'LOCKED'}
          </span>
          <Wifi size={14} className="ml-2" />
          <Battery size={15} />
        </div>
      </div>

      {/* 2. LOCK SCREEN CLOCK & DATE */}
      <div className="w-full text-center my-auto py-2 z-10 space-y-1">
        <h1 className="text-7xl sm:text-8xl font-light tracking-tight text-white/95 font-sans drop-shadow-md">
          {timeStr}
        </h1>
        <p className="text-sm sm:text-base font-medium text-neutral-300 capitalize drop-shadow-sm">
          {dateStr}
        </p>
      </div>

      {/* 3. MATERIAL YOU LOCK SCREEN MEDIA WIDGET */}
      {file && (
        <div 
          id="lockscreen-media-widget"
          className="w-full max-w-md mx-auto bg-neutral-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl z-10 space-y-3.5 transition-all duration-300"
        >
          {/* Header row: Album art + Track Details + Sound wave visualizer */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Album Art with pulse */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-white/20 bg-neutral-800 shrink-0 relative flex items-center justify-center">
              {file.thumbnail ? (
                <img 
                  src={file.thumbnail} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-emerald-800 to-teal-600 flex items-center justify-center text-white">
                  <Music size={24} />
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <Volume2 size={16} className="text-emerald-400 animate-pulse" />
                </div>
              )}
            </div>

            {/* Song title and artist */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  {isPlaying ? (language === 'hi' ? 'बज रहा है' : 'PLAYING') : (language === 'hi' ? 'रुका हुआ' : 'PAUSED')}
                </span>
                <span className="text-[11px] text-neutral-400 truncate">Files by Google</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5" title={cleanTitle}>
                {cleanTitle}
              </h3>
              <p className="text-xs text-neutral-400 truncate">
                {file.folder ? file.folder.replace(/^\//, '') : 'Music'} • {formatBytes(file.size)}
              </p>
            </div>
          </div>

          {/* Scrubber timeline ("Aage Piche Kar Sakein") */}
          <div className="space-y-1">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime || 0}
                onChange={(e) => {
                  const targetSec = Number(e.target.value);
                  onSeek(targetSec);
                }}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-hidden"
              />
              <div 
                className="absolute top-0 left-0 h-1.5 bg-emerald-400 rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Full Media Controls: Previous, -10s, Play/Pause, +10s, Next */}
          <div className="flex items-center justify-between px-1 sm:px-2 pt-1">
            {/* Previous Track ("Gana Badal Sako") */}
            <button
              id="lockscreen-btn-prev"
              onClick={() => {
                triggerHapticFeedback();
                onPrev();
              }}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
              title={language === 'hi' ? 'पिछला गाना' : 'Previous Song'}
            >
              <SkipBack size={24} />
            </button>

            {/* Seek -10s Backward ("Aage Piche Kar Sako") */}
            <button
              id="lockscreen-btn-seek-back"
              onClick={() => {
                triggerHapticFeedback();
                onSeekBy(-10);
              }}
              className="p-2 text-neutral-300 hover:text-amber-400 hover:bg-white/10 rounded-full transition-all flex flex-col items-center cursor-pointer relative"
              title={language === 'hi' ? '10 सेकंड पीछे' : 'Rewind 10s'}
            >
              <RotateCcw size={22} />
              <span className="text-[9px] font-extrabold absolute top-[9px] text-neutral-300">10</span>
            </button>

            {/* Core Play / Pause Button */}
            <button
              id="lockscreen-btn-play-pause"
              onClick={() => {
                triggerHapticFeedback();
                onPlayPause();
              }}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white hover:bg-neutral-100 active:scale-95 text-neutral-950 font-bold flex items-center justify-center shadow-2xl transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={24} className="fill-neutral-950" />
              ) : (
                <Play size={24} className="fill-neutral-950 ml-0.5" />
              )}
            </button>

            {/* Seek +10s Forward ("Aage Piche Kar Sako") */}
            <button
              id="lockscreen-btn-seek-forward"
              onClick={() => {
                triggerHapticFeedback();
                onSeekBy(10);
              }}
              className="p-2 text-neutral-300 hover:text-amber-400 hover:bg-white/10 rounded-full transition-all flex flex-col items-center cursor-pointer relative"
              title={language === 'hi' ? '10 सेकंड आगे' : 'Forward 10s'}
            >
              <RotateCw size={22} />
              <span className="text-[9px] font-extrabold absolute top-[9px] text-neutral-300">10</span>
            </button>

            {/* Next Track ("Gana Badal Sako") */}
            <button
              id="lockscreen-btn-next"
              onClick={() => {
                triggerHapticFeedback();
                onNext();
              }}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
              title={language === 'hi' ? 'अगला गाना' : 'Next Song'}
            >
              <SkipForward size={24} />
            </button>
          </div>

          {/* Quick info note */}
          <div className="text-center pt-1 border-t border-white/10 text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
            <span>✨ {language === 'hi' ? 'लॉक स्क्रीन मीडिया कंट्रोल सक्रिय है' : 'Lock screen media controls active'}</span>
          </div>
        </div>
      )}

      {/* 4. BOTTOM UNLOCK ACTION */}
      <div className="w-full flex flex-col items-center justify-center space-y-2 z-10 pb-safe pt-4">
        <button
          id="btn-unlock-screen"
          onClick={() => {
            triggerHapticFeedback();
            onClose();
          }}
          className="group flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <ChevronUp size={22} className="animate-bounce text-emerald-400" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-white shadow-lg group-hover:bg-white/20 transition-all">
            <Unlock size={14} className="text-emerald-400" />
            <span>{language === 'hi' ? 'स्क्रीन अनलॉक करने के लिए टैप करें' : 'Tap or swipe to unlock'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
