import React from 'react';
import {
  Bell,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Copy,
  Trash2,
  Share2,
  Sparkles,
  FileArchive,
  UploadCloud,
  CheckCircle2,
  Clock,
  Volume2,
  FolderOpen,
  Layers,
  Inbox,
  Lock
} from 'lucide-react';
import { AppNotification, Language } from '../types';
import { translations } from '../utils/translations';

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
  onOpenLockScreen?: () => void;
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
  onOpenLockScreen,
  language,
}) => {
  if (!isOpen) return null;

  const activeCount = notifications.length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'file-operation':
        return <Copy size={16} className="text-blue-600" />;
      case 'media-playback':
        return <Volume2 size={16} className="text-purple-600" />;
      case 'transfer':
        return <Share2 size={16} className="text-emerald-600" />;
      case 'clean':
        return <Sparkles size={16} className="text-amber-600" />;
      case 'archive':
        return <FileArchive size={16} className="text-orange-600" />;
      case 'upload':
        return <UploadCloud size={16} className="text-cyan-600" />;
      default:
        return <Bell size={16} className="text-blue-600" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-neutral-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Google Files Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  {language === 'hi' ? 'सूचनाएं व सक्रिय कार्य' : 'Notifications & Activity'}
                </h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                    {activeCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {language === 'hi' ? 'फ़ाइल स्थानांतरण, कार्य प्रगति व अपडेट' : 'File transfers, background tasks & updates'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClearAllNotifications}
                className="text-xs font-semibold text-neutral-600 hover:text-rose-600 px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'सभी हटाएं' : 'Clear all'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-neutral-50/50">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto mb-3 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">
                {language === 'hi' ? 'कोई नया कार्य या सूचना नहीं है' : 'All caught up!'}
              </h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1 leading-relaxed">
                {language === 'hi'
                  ? 'फ़ाइल कॉपी, ट्रांसफर, बैकग्राउंड टास्क या मीडिया प्लेबैक होने पर यहाँ लाइव दिखेगा।'
                  : 'Active transfers, downloads, background processes and media controls will appear here.'}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all relative overflow-hidden"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200/60">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate flex items-center gap-1.5">
                        <span>{notif.title}</span>
                        {notif.status === 'in-progress' && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate mt-0.5">
                        {notif.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {notif.timestamp}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDismissNotification(notif.id)}
                      className="text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar (if in-progress or specified) */}
                {typeof notif.progress === 'number' && (
                  <div className="mt-3 mb-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 mb-1">
                      <span>{notif.speed || (notif.status === 'completed' ? 'Done' : 'Processing...')}</span>
                      <span className="text-blue-600 font-bold">{Math.round(notif.progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          notif.status === 'completed'
                            ? 'bg-emerald-500'
                            : notif.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, notif.progress))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Media Playback Card Layout */}
                {notif.type === 'media-playback' && notif.mediaDetails && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3 bg-purple-50/50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {notif.mediaDetails.thumbnail ? (
                        <img
                          src={notif.mediaDetails.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <Volume2 size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">
                          {notif.mediaDetails.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {notif.mediaDetails.artist || 'Files Music Player'}
                        </div>
                      </div>
                    </div>

                    {/* Media playback buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onPrevTrack && (
                        <button
                          type="button"
                          onClick={onPrevTrack}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          <SkipBack size={16} />
                        </button>
                      )}
                      {onPlayPauseAudio && (
                        <button
                          type="button"
                          onClick={onPlayPauseAudio}
                          className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          {isAudioPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                        </button>
                      )}
                      {onNextTrack && (
                        <button
                          type="button"
                          onClick={onNextTrack}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          <SkipForward size={16} />
                        </button>
                      )}
                      {onOpenLockScreen && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenLockScreen();
                          }}
                          className="p-1.5 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-100 transition-colors cursor-pointer"
                          title={language === 'hi' ? 'स्क्रीन लॉक प्लेयर' : 'Lock Screen Player'}
                        >
                          <Lock size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Notification Action Buttons */}
                <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                  {notif.actions?.targetPath && onNavigateToFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToFolder(notif.actions!.targetPath!);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FolderOpen size={13} />
                      <span>{language === 'hi' ? 'फ़ोल्डर खोलें' : 'Open Folder'}</span>
                    </button>
                  )}

                  {notif.actions?.cancelable && notif.status === 'in-progress' && onCancelTask && (
                    <button
                      type="button"
                      onClick={() => onCancelTask(notif.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-white border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 px-5">
          <span>Files by Akash Kumar</span>
          <button
            onClick={onClose}
            className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

