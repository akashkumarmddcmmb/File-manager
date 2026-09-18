import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Copy,
  Move,
  Trash2,
  Share2,
  Sparkles,
  FileArchive,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wifi,
  Bluetooth,
  Moon,
  Volume2,
  Zap,
  FolderOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AppNotification, Language } from '../types';
import { translations } from '../utils/translations';
import { formatBytes } from '../utils/storage';

interface NotificationShadeProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onDismissNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onCancelTask?: (id: string) => void;
  onNavigateToFolder?: (folderPath: string) => void;
  // Media controls
  isAudioPlaying?: boolean;
  onPlayPauseAudio?: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  language: Language;
}

export const NotificationShade: React.FC<NotificationShadeProps> = ({
  isOpen,
  onClose,
  notifications,
  onDismissNotification,
  onClearAllNotifications,
  onCancelTask,
  onNavigateToFolder,
  isAudioPlaying = false,
  onPlayPauseAudio,
  onNextTrack,
  onPrevTrack,
  language,
}) => {
  const t = translations[language];
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Quick Toggles state (simulated Android system controls)
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [btEnabled, setBtEnabled] = useState(true);
  const [quickShareEnabled, setQuickShareEnabled] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const activeCount = notifications.length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'file-operation':
        return <Copy size={16} className="text-blue-500" />;
      case 'media-playback':
        return <Volume2 size={16} className="text-purple-500" />;
      case 'transfer':
        return <Share2 size={16} className="text-emerald-500" />;
      case 'clean':
        return <Sparkles size={16} className="text-amber-500" />;
      case 'archive':
        return <FileArchive size={16} className="text-orange-500" />;
      case 'upload':
        return <UploadCloud size={16} className="text-cyan-500" />;
      default:
        return <Bell size={16} className="text-neutral-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-start bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-[#1b1c1e] text-white shadow-2xl rounded-b-3xl overflow-hidden flex flex-col max-h-[90vh] border-b border-neutral-700/60 animate-in slide-in-from-top-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android 14 Material You Status Bar Header */}
        <div className="pt-3 px-5 pb-3 bg-[#131416] border-b border-neutral-800/80">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">{currentTime}</span>
              <span>•</span>
              <span className="text-xs text-neutral-400">{currentDate}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <Wifi size={14} className={wifiEnabled ? 'text-white' : 'text-neutral-600'} />
              <Bluetooth size={14} className={btEnabled ? 'text-white' : 'text-neutral-600'} />
              <span className="text-[11px] font-semibold">100%</span>
            </div>
          </div>

          {/* Android Quick Settings Pill Tiles */}
          <div className="grid grid-cols-4 gap-2 mt-3 mb-1">
            <button
              type="button"
              onClick={() => setWifiEnabled(!wifiEnabled)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors cursor-pointer ${
                wifiEnabled ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Wifi size={18} className="mb-1" />
              <span className="text-[10px] font-medium">Wi-Fi</span>
            </button>

            <button
              type="button"
              onClick={() => setBtEnabled(!btEnabled)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors cursor-pointer ${
                btEnabled ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Bluetooth size={18} className="mb-1" />
              <span className="text-[10px] font-medium">Bluetooth</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickShareEnabled(!quickShareEnabled)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors cursor-pointer ${
                quickShareEnabled ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Share2 size={18} className="mb-1" />
              <span className="text-[10px] font-medium">Quick Share</span>
            </button>

            <button
              type="button"
              onClick={() => setDndEnabled(!dndEnabled)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors cursor-pointer ${
                dndEnabled ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Moon size={18} className="mb-1" />
              <span className="text-[10px] font-medium">DND</span>
            </button>
          </div>
        </div>

        {/* Notifications Bar Section Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1b1c1e] border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-blue-400" />
            <span className="text-xs font-semibold text-neutral-200 tracking-wide">
              {language === 'hi' ? 'सक्रिय कार्य एवं सूचनाएं' : 'Ongoing Tasks & Notifications'}
            </span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px]">
                {activeCount}
              </span>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAllNotifications}
              className="text-[11px] font-medium text-neutral-400 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'सभी हटाएं' : 'Clear all'}
            </button>
          )}
        </div>

        {/* Notifications List Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-neutral-600 opacity-60" />
              <p className="text-xs font-medium">
                {language === 'hi' ? 'कोई सक्रिय कार्य या सूचना नहीं है' : 'No ongoing background tasks'}
              </p>
              <p className="text-[11px] text-neutral-600 mt-1">
                {language === 'hi'
                  ? 'फ़ाइल कॉपी, पेस्ट, मीडिया प्लेबैक व ट्रांसफर यहाँ दिखाई देंगे'
                  : 'File copying, pasting, media playback and transfers will appear here'}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-[#26282b] hover:bg-[#2d3034] rounded-2xl p-3.5 border border-neutral-700/50 shadow-md transition-all relative overflow-hidden group"
              >
                {/* Header row of notification card */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{notif.title}</span>
                        {notif.status === 'in-progress' && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {notif.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {notif.timestamp}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDismissNotification(notif.id)}
                      className="text-neutral-500 hover:text-neutral-300 p-1 rounded-full hover:bg-neutral-700/50 transition-colors"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar (if in-progress or specified) */}
                {typeof notif.progress === 'number' && (
                  <div className="mt-2.5 mb-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 mb-1">
                      <span>{notif.speed || (notif.status === 'completed' ? 'Done' : 'Processing...')}</span>
                      <span className="text-blue-400">{Math.round(notif.progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          notif.status === 'completed'
                            ? 'bg-emerald-500'
                            : notif.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, notif.progress))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Media Playback Card Layout */}
                {notif.type === 'media-playback' && notif.mediaDetails && (
                  <div className="mt-2 pt-2 border-t border-neutral-700/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {notif.mediaDetails.thumbnail ? (
                        <img
                          src={notif.mediaDetails.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-950/70 text-purple-400 flex items-center justify-center shrink-0">
                          <Volume2 size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-purple-200 truncate">
                          {notif.mediaDetails.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {notif.mediaDetails.artist || 'Files Audio Player'}
                        </div>
                      </div>
                    </div>

                    {/* Media playback buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onPrevTrack && (
                        <button
                          type="button"
                          onClick={onPrevTrack}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-700 transition-colors"
                        >
                          <SkipBack size={16} />
                        </button>
                      )}
                      {onPlayPauseAudio && (
                        <button
                          type="button"
                          onClick={onPlayPauseAudio}
                          className="p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors"
                        >
                          {isAudioPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                        </button>
                      )}
                      {onNextTrack && (
                        <button
                          type="button"
                          onClick={onNextTrack}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-700 transition-colors"
                        >
                          <SkipForward size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Notification Action Buttons */}
                <div className="mt-2.5 flex items-center justify-end gap-2 text-xs">
                  {notif.actions?.targetPath && onNavigateToFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToFolder(notif.actions!.targetPath!);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <FolderOpen size={13} className="text-blue-400" />
                      <span>{language === 'hi' ? 'फ़ोल्डर खोलें' : 'Open Folder'}</span>
                    </button>
                  )}

                  {notif.actions?.cancelable && notif.status === 'in-progress' && onCancelTask && (
                    <button
                      type="button"
                      onClick={() => onCancelTask(notif.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Shade Pull Handle */}
        <div 
          onClick={onClose}
          className="py-2.5 bg-[#131416] hover:bg-[#18191c] flex items-center justify-center cursor-pointer border-t border-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <div className="w-12 h-1 rounded-full bg-neutral-700" />
        </div>
      </div>
    </div>
  );
};
