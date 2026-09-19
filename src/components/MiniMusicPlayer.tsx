import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music, Lock } from 'lucide-react';
import { FileItem } from '../types';
import { triggerHapticFeedback } from '../utils/nativeStorage';

interface MiniMusicPlayerProps {
  file: FileItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onExpand: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev?: () => void;
  onOpenLockScreen?: () => void;
  onClose: () => void;
}

export const MiniMusicPlayer: React.FC<MiniMusicPlayerProps> = ({
  file,
  isPlaying,
  currentTime,
  duration,
  onExpand,
  onPlayPause,
  onNext,
  onPrev,
  onOpenLockScreen,
  onClose,
}) => {
  if (!file) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      onClick={onExpand}
      className="fixed bottom-[calc(66px+max(0.375rem,env(safe-area-inset-bottom)))] left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 bg-neutral-900/95 backdrop-blur-md text-white rounded-2xl border border-neutral-700/80 shadow-2xl p-2.5 flex items-center justify-between gap-3 cursor-pointer select-none animate-in slide-in-from-bottom-3 duration-250 active:scale-[0.99] transition-transform"
    >
      {/* Top micro progress bar */}
      <div className="absolute top-0 left-3 right-3 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-amber-500 rounded-full transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Album art icon + title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-neutral-950 font-bold shrink-0 shadow-xs relative">
          {isPlaying ? (
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.8s_infinite]" />
              <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.6s_infinite_0.2s]" />
              <span className="w-1 bg-neutral-950 rounded-xs animate-[bounce_0.7s_infinite_0.1s]" />
            </div>
          ) : (
            <Music size={18} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate text-white" title={file.name}>
            {file.name}
          </p>
          <p className="text-[10px] text-neutral-400 truncate">
            {file.folder}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {onPrev && (
          <button
            onClick={() => {
              triggerHapticFeedback();
              onPrev();
            }}
            className="p-1.5 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800/80 transition-colors cursor-pointer"
            title="Previous"
          >
            <SkipBack size={16} />
          </button>
        )}

        <button
          onClick={() => {
            triggerHapticFeedback();
            onPlayPause();
          }}
          className="p-2 text-white hover:text-amber-400 rounded-full hover:bg-neutral-800/80 transition-colors cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} className="fill-white" /> : <Play size={18} className="fill-white" />}
        </button>

        <button
          onClick={() => {
            triggerHapticFeedback();
            onNext();
          }}
          className="p-1.5 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800/80 transition-colors cursor-pointer"
          title="Next"
        >
          <SkipForward size={16} />
        </button>

        {onOpenLockScreen && (
          <button
            onClick={() => {
              triggerHapticFeedback();
              onOpenLockScreen();
            }}
            className="p-1.5 bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/25 rounded-full transition-colors cursor-pointer border border-emerald-500/30 shadow-xs"
            title="लॉकस्क्रीन प्लेयर (Lock Screen Player)"
          >
            <Lock size={15} />
          </button>
        )}

        <button
          onClick={() => {
            triggerHapticFeedback();
            onClose();
          }}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800/80 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
