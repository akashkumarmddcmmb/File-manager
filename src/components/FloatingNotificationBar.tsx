import React from 'react';
import {
  Bell,
  Copy,
  Volume2,
  Share2,
  Sparkles,
  FileArchive,
  UploadCloud,
  ChevronDown,
  Play,
  Pause,
  X
} from 'lucide-react';
import { AppNotification, Language } from '../types';

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
        return <Copy size={14} className="text-blue-400" />;
      case 'media-playback':
        return <Volume2 size={14} className="text-purple-400" />;
      case 'transfer':
        return <Share2 size={14} className="text-emerald-400" />;
      case 'clean':
        return <Sparkles size={14} className="text-amber-400" />;
      case 'archive':
        return <FileArchive size={14} className="text-orange-400" />;
      case 'upload':
        return <UploadCloud size={14} className="text-cyan-400" />;
      default:
        return <Bell size={14} className="text-blue-400" />;
    }
  };

  return (
    <aside
      aria-label="Active background process"
      onClick={onOpenShade}
      className="fixed top-2 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-[#1e2023]/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-neutral-700/60 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-[#25282c] transition-all animate-in slide-in-from-top-4 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-100 truncate">
              {activeNotification.title}
            </span>
            {totalActiveCount > 1 && (
              <span className="px-1.5 py-0.2 bg-blue-600/40 text-blue-300 rounded-full text-[9px] font-bold">
                +{totalActiveCount - 1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400 truncate">
            <span>{activeNotification.description}</span>
            {typeof activeNotification.progress === 'number' && (
              <span className="text-blue-400 font-bold ml-auto shrink-0">
                {Math.round(activeNotification.progress)}%
              </span>
            )}
          </div>
          {typeof activeNotification.progress === 'number' && (
            <div className="w-full h-1 bg-neutral-800 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
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
            className="p-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-colors"
          >
            {isAudioPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
          </button>
        )}
        <ChevronDown size={14} className="text-neutral-400" />
      </div>
    </aside>
  );
};
