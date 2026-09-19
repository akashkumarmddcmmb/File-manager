import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Minimize2, 
  Maximize2,
  ChevronDown,
  Share2, 
  Music, 
  ListMusic, 
  ExternalLink,
  Info,
  Sparkles
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { openRealFile, shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';

interface AudioPlayerModalProps {
  isOpen: boolean;
  file: FileItem | null;
  playlist: FileItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  language: Language;
  onClose: () => void;
  onMinimize: () => void;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSelectTrack: (file: FileItem) => void;
  onToggleStar?: (id: string) => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  file,
  playlist,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  language,
  onClose,
  onMinimize,
  onPlayPause,
  onSeek,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  onSelectTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'playlist' | 'details'>('player');
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  if (!isOpen || !file) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const toggleBrowserFullscreen = () => {
    triggerHapticFeedback();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-full bg-gradient-to-b from-[#18191c] via-[#0d0e11] to-[#08090a] text-white flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="w-full px-4 py-3 pt-safe border-b border-white/5 bg-white/[0.02] backdrop-blur-md shrink-0 flex flex-col gap-2.5">
        {/* Top Control Strip */}
        <div className="flex items-center justify-between gap-2">
          {/* Minimize / Collapse down */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              onMinimize();
            }}
            className="p-2 -ml-1 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            title={language === 'hi' ? 'छोटा करें' : 'Minimize to Mini Player'}
          >
            <ChevronDown size={26} />
          </button>

          {/* Center Title */}
          <div className="flex-1 text-center min-w-0 px-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block truncate">
              {language === 'hi' ? 'अभी बज रहा है' : 'Now Playing'}
            </span>
            <p className="text-xs text-neutral-400 truncate max-w-[240px] mx-auto mt-0.5">
              {file.folder}
            </p>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1 shrink-0 -mr-1">
            <button
              onClick={toggleBrowserFullscreen}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title={isBrowserFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isBrowserFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
            </button>

            <button
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Clean Segmented Tab Switcher */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-white/10 p-1 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setActiveTab('player');
              }}
              className={`px-3.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'player' 
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Music size={13} />
              <span>{language === 'hi' ? 'प्लेयर' : 'Player'}</span>
            </button>

            <button
              onClick={() => {
                triggerHapticFeedback();
                setActiveTab('playlist');
              }}
              className={`px-3.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'playlist' 
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <ListMusic size={13} />
              <span>{language === 'hi' ? 'प्लेलिस्ट' : 'Playlist'}</span>
              <span className="text-[10px] opacity-80">({playlist.length})</span>
            </button>

            <button
              onClick={() => {
                triggerHapticFeedback();
                setActiveTab('details');
              }}
              className={`px-3.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'details' 
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Info size={13} />
              <span>{language === 'hi' ? 'विवरण' : 'Info'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT (FULL SCREEN VIEW) */}
      <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* TAB 1: MAIN FULL SCREEN DISC PLAYER */}
        {activeTab === 'player' && (
          <div className="w-full max-w-lg flex flex-col items-center text-center space-y-5 sm:space-y-6 animate-in fade-in duration-200">
            {/* Vinyl Disc Artwork with Rotation Animation */}
            <div className="relative group my-1">
              <div className={`w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 p-2 shadow-2xl shadow-amber-500/20 flex items-center justify-center ${
                isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
              }`}>
                <div className="w-full h-full rounded-full bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center relative overflow-hidden shadow-inner">
                  {/* Vinyl grooves */}
                  <div className="absolute inset-4 rounded-full border border-neutral-800/80" />
                  <div className="absolute inset-9 rounded-full border border-neutral-800/60" />
                  <div className="absolute inset-14 rounded-full border border-neutral-800/40" />
                  
                  {/* Center Album Label */}
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl">
                    <Music size={32} className="text-neutral-950" />
                  </div>
                </div>
              </div>

              {/* Pulsing Wave Ring when playing */}
              {isPlaying && (
                <div className="absolute -inset-2.5 rounded-full border border-amber-400/30 animate-ping pointer-events-none" />
              )}
            </div>

            {/* Audio Wave Frequency Equalizer */}
            <div className="flex items-end justify-center gap-1.5 h-9 w-60">
              {[45, 80, 100, 65, 95, 50, 85, 60, 90, 75, 85, 55, 95, 70, 40].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isPlaying ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-neutral-700'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(20, (h * (0.4 + (i % 3) * 0.25)))}%` : '20%',
                  }}
                />
              ))}
            </div>

            {/* Song Details */}
            <div className="space-y-1 w-full px-4">
              <h2 className="text-base sm:text-xl font-bold truncate text-white leading-tight" title={file.name}>
                {file.name}
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                {file.folder} • {formatBytes(file.size)}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: PLAYLIST TRACKS */}
        {activeTab === 'playlist' && (
          <div className="w-full max-w-2xl bg-neutral-900/70 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              <span>{language === 'hi' ? 'प्लेलिस्ट ट्रैक सूची' : 'Playlist Tracks'} ({playlist.length})</span>
              <span className="text-amber-400">{isShuffle ? '🔀 Shuffle Active' : ''}</span>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {playlist.map((track, idx) => {
                const isSelected = track.id === file.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      triggerHapticFeedback();
                      onSelectTrack(track);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md' 
                        : 'hover:bg-white/5 text-neutral-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {isSelected && isPlaying ? (
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.8s_infinite]" />
                            <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.6s_infinite_0.2s]" />
                            <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.7s_infinite_0.1s]" />
                          </div>
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{track.name}</p>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {formatBytes(track.size)} • {track.folder}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: DETAILS */}
        {activeTab === 'details' && (
          <div className="w-full max-w-md bg-neutral-900/70 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-neutral-100 border-b border-white/10 pb-3">
              {language === 'hi' ? 'फ़ाइल व ऑडियो जानकारी' : 'Audio Track Details'}
            </h3>
            <div className="space-y-3.5 text-xs text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'नाम' : 'Song Name'}</span>
                <span className="font-semibold text-white break-words mt-0.5 block text-sm">{file.name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'अवधि' : 'Duration'}</span>
                <span className="font-mono text-amber-400 font-semibold">{formatTime(duration)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'आकार' : 'Size'}</span>
                <span>{formatBytes(file.size)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'फ़ोल्डर पथ' : 'Folder Path'}</span>
                <span className="font-mono text-blue-400 break-all">{file.folder}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'प्रारूप' : 'Format'}</span>
                <span className="uppercase text-neutral-200">{file.mimeType}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM CONTROLLER (FULL SCREEN CONTROLS) */}
      <div className="w-full p-4 sm:p-5 pb-safe bg-black/70 backdrop-blur-lg border-t border-white/5 space-y-3.5 shrink-0">
        <div className="max-w-xl mx-auto w-full space-y-3.5">
          {/* Progress Bar & Timestamps */}
          <div className="space-y-1">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime || 0}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden"
              />
              <div 
                className="absolute top-0 left-0 h-2 bg-gradient-to-r from-amber-500 to-orange-400 rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Core Playback Buttons */}
          <div className="flex items-center justify-between px-1 sm:px-2">
            {/* Shuffle */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleShuffle();
              }}
              className={`p-2.5 sm:p-3 rounded-full transition-colors cursor-pointer ${
                isShuffle ? 'text-amber-400 bg-amber-500/20' : 'text-neutral-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle size={19} />
            </button>

            {/* Skip Back 10s */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onSeek(Math.max(0, currentTime - 10));
              }}
              className="p-2.5 sm:p-3 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
              title="-10s"
            >
              <RotateCcw size={21} />
            </button>

            {/* Previous Track */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onPrev();
              }}
              className="p-2.5 sm:p-3 text-neutral-200 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack size={24} />
            </button>

            {/* Main Play / Pause Button */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onPlayPause();
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-neutral-950 font-bold flex items-center justify-center shadow-xl shadow-amber-500/30 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={28} className="fill-neutral-950" />
              ) : (
                <Play size={28} className="fill-neutral-950 ml-1" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onNext();
              }}
              className="p-2.5 sm:p-3 text-neutral-200 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={24} />
            </button>

            {/* Skip Forward 10s */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onSeek(Math.min(duration, currentTime + 10));
              }}
              className="p-2.5 sm:p-3 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
              title="+10s"
            >
              <RotateCw size={21} />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleRepeat();
              }}
              className={`p-2.5 sm:p-3 rounded-full transition-colors cursor-pointer ${
                repeatMode !== 'off' ? 'text-amber-400 bg-amber-500/20' : 'text-neutral-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
            </button>
          </div>

          {/* Quick Actions (Open in Phone App & Share) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {file.url ? (
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  openRealFile(file.url!);
                }}
                className="py-2.5 px-3 bg-white/5 hover:bg-white/10 active:scale-98 rounded-2xl text-xs font-bold text-neutral-200 flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer whitespace-nowrap"
              >
                <ExternalLink size={14} className="text-amber-400 shrink-0" />
                <span className="truncate">
                  {language === 'hi' ? 'फ़ोन प्लेयर में बजाएं' : 'Open in Phone App'}
                </span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => {
                triggerHapticFeedback();
                if (file.url) {
                  shareNativeFile(file.name, `Music: ${file.name}`, file.url);
                }
              }}
              className="py-2.5 px-3 bg-white/5 hover:bg-white/10 active:scale-98 rounded-2xl text-xs font-bold text-neutral-200 flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer whitespace-nowrap"
            >
              <Share2 size={14} className="text-blue-400 shrink-0" />
              <span className="truncate">{language === 'hi' ? 'शेयर करें' : 'Share Track'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
