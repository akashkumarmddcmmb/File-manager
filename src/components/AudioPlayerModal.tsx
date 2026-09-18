import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
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
  Volume2, 
  VolumeX, 
  Minimize2, 
  Star, 
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
  onToggleStar,
}) => {
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen || !file) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-neutral-800/80 max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHapticFeedback();
                onMinimize();
              }}
              className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-neutral-800/80 rounded-full transition-colors cursor-pointer"
              title={language === 'hi' ? 'छोटा करें' : 'Minimize Player'}
            >
              <Minimize2 size={20} />
            </button>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles size={11} />
                {language === 'hi' ? 'म्यूज़िक प्लेयर' : 'Music Player'}
              </span>
              <p className="text-xs text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
                {file.folder}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`p-2 rounded-full transition-colors ${
                showPlaylist ? 'bg-amber-500/20 text-amber-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={language === 'hi' ? 'प्लेलिस्ट' : 'Playlist'}
            >
              <ListMusic size={20} />
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body: Either Player Visualizer or Playlist */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          {showPlaylist ? (
            /* Playlist View */
            <div className="w-full space-y-2 max-h-[380px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs text-neutral-400 font-medium">
                <span>{language === 'hi' ? 'सभी गाने' : 'Playlist Tracks'} ({playlist.length})</span>
                <span className="text-[11px] text-amber-400">{isShuffle ? 'Shuffle On' : ''}</span>
              </div>
              {playlist.map((track, idx) => {
                const isSelected = track.id === file.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      triggerHapticFeedback();
                      onSelectTrack(track);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' 
                        : 'hover:bg-neutral-800/60 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {isSelected && isPlaying ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.8s_infinite]" />
                            <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.6s_infinite_0.2s]" />
                            <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.7s_infinite_0.1s]" />
                          </div>
                        ) : (
                          <span className="text-xs">{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{track.name}</p>
                        <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {formatBytes(track.size)} • {track.folder}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Main Player Visualizer */
            <div className="w-full flex flex-col items-center text-center space-y-6">
              {/* Disc Artwork / Equalizer */}
              <div className="relative group">
                <div className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 p-1.5 shadow-2xl flex items-center justify-center ${
                  isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                }`}>
                  <div className="w-full h-full rounded-full bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center relative overflow-hidden">
                    {/* Vinyl grooves */}
                    <div className="absolute inset-4 rounded-full border border-neutral-800/80" />
                    <div className="absolute inset-8 rounded-full border border-neutral-800/60" />
                    <div className="absolute inset-12 rounded-full border border-neutral-800/40" />
                    
                    {/* Center label */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <Music size={28} className="text-neutral-950" />
                    </div>
                  </div>
                </div>

                {/* Animated Pulsing Waveform Ring */}
                {isPlaying && (
                  <div className="absolute -inset-2 rounded-full border-2 border-amber-400/20 animate-ping pointer-events-none" />
                )}
              </div>

              {/* Animated Frequency Bars */}
              <div className="flex items-end justify-center gap-1.5 h-8 w-44">
                {[40, 75, 100, 60, 90, 45, 80, 55, 95, 70, 85, 50].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isPlaying ? 'bg-amber-400' : 'bg-neutral-700'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(15, (h * (0.4 + (i % 3) * 0.2)))}%` : '20%',
                    }}
                  />
                ))}
              </div>

              {/* Song Title & Info */}
              <div className="space-y-1 w-full px-4">
                <h3 className="text-base sm:text-lg font-bold truncate text-white" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-xs text-neutral-400 truncate">
                  {file.folder} • {formatBytes(file.size)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Player Controls & Scrubber */}
        <div className="p-6 bg-neutral-900/90 border-t border-neutral-800/80 space-y-4">
          {/* Progress Bar with Timestamps */}
          <div className="space-y-1.5">
            <div className="relative group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime || 0}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden"
              />
              <div 
                className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-400 rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Core Playback Buttons */}
          <div className="flex items-center justify-between px-2">
            {/* Shuffle */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleShuffle();
              }}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                isShuffle ? 'text-amber-400 bg-amber-500/15' : 'text-neutral-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle size={18} />
            </button>

            {/* Skip Back 10s */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onSeek(Math.max(0, currentTime - 10));
              }}
              className="p-2.5 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
              title="-10s"
            >
              <RotateCcw size={20} />
            </button>

            {/* Previous Track */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onPrev();
              }}
              className="p-2.5 text-neutral-200 hover:text-white rounded-full transition-colors cursor-pointer"
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
              className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-neutral-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
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
              className="p-2.5 text-neutral-200 hover:text-white rounded-full transition-colors cursor-pointer"
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
              className="p-2.5 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
              title="+10s"
            >
              <RotateCw size={20} />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleRepeat();
              }}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                repeatMode !== 'off' ? 'text-amber-400 bg-amber-500/15' : 'text-neutral-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          {/* Extra Mobile Actions: Open in Phone Player & Share */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {file.url && (
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  openRealFile(file.url!);
                }}
                className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 active:scale-98 rounded-xl text-xs font-semibold text-neutral-200 flex items-center justify-center gap-1.5 transition-all border border-neutral-700 cursor-pointer"
              >
                <ExternalLink size={14} className="text-amber-400" />
                <span className="truncate">
                  {language === 'hi' ? 'फ़ोन प्लेयर में बजाएं' : 'Open in Music App'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHapticFeedback();
                if (file.url) {
                  shareNativeFile(file.name, `Sharing ${file.name}`, file.url);
                }
              }}
              className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 active:scale-98 rounded-xl text-xs font-semibold text-neutral-200 flex items-center justify-center gap-1.5 transition-all border border-neutral-700 cursor-pointer"
            >
              <Share2 size={14} className="text-blue-400" />
              <span className="truncate">{language === 'hi' ? 'शेयर करें' : 'Share Song'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
