import React from 'react';
import {
  Bell,
  Copy,
  Volume2,
  Share2,
  Sparkles,
  FileArchive,
  UploadCloud,
  ChevronRight,
  Play,
  Pause
} from 'lucide-react';
import { AppNotification } from '../types';

interface FloatingNotificationBarProps {
  activeNotification: AppNotification | null;
  totalActiveCount: number;
  onOpenShade: () => void;
  isAudioPlaying?: boolean;
  onPlayPauseAudio?: () => void;
}

export const FloatingNotificationBar: React.FC<FloatingNotificationBarProps> = ({
  activeNotification,
  totalActiveCount,
  onOpenShade,
  isAudioPlaying = false,
  onPlayPauseAudio
}) => {
  if (!activeNotification) return null;

  const getIcon = () => {
    switch (activeNotification.type) {
      case 'file-operation':
        return <Copy size={15} className="text-blue-600" />;
      case 'media-playback':
        return <Volume2 size={15} className="text-purple-600" />;
      case 'transfer':
        return <Share2 size={15} className="text-emerald-600" />;
      case 'clean':
        return <Sparkles size={15} className="text-amber-600" />;
      case 'archive':
        return <FileArchive size={15} className="text-orange-600" />;
      case 'upload':
        return <UploadCloud size={15} className="text-cyan-600" />;
      default:
        return <Bell size={15} className="text-blue-600" />;
    }
  };

  return (
    <aside
      aria-label="Active background process"
      onClick={onOpenShade}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-white/95 backdrop-blur-md text-neutral-900 px-3.5 py-2.5 rounded-2xl shadow-xl border border-blue-200/80 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 transition-all animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-900 truncate">
              {activeNotification.title}
            </span>
            {totalActiveCount > 1 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[9px] font-bold">
                +{totalActiveCount - 1}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 truncate mt-0.5">
            <span className="truncate">{activeNotification.description}</span>
            {typeof activeNotification.progress === 'number' && (
              <span className="text-blue-600 font-bold ml-2 shrink-0">
                {Math.round(activeNotification.progress)}%
              </span>
            )}
          </div>
          {typeof activeNotification.progress === 'number' && (
            <div className="w-full h-1 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, activeNotification.progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {activeNotification.type === 'media-playback' && onPlayPauseAudio && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPauseAudio();
            }}
            className="p-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer"
          >
            {isAudioPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>
        )}
        <ChevronRight size={16} className="text-neutral-400" />
      </div>
    </aside>
  );
};

