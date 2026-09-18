import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Folder, 
  Share2, 
  Trash2, 
  ShieldCheck, 
  HardDrive, 
  Settings, 
  HelpCircle, 
  Languages, 
  ChevronRight, 
  Info,
  User,
  LogIn,
  FileText,
  Lock,
  Bell
} from 'lucide-react';
import { TabType, Language, StorageBreakdown, UserAccount } from '../types';
import { GoogleFilesLogo } from './GoogleFilesLogo';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { GoogleLogoIcon, MicrosoftLogoIcon } from './AccountModal';
import { APP_INFO } from '../constants/appInfo';

interface GoogleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  storage: StorageBreakdown;
  language: Language;
  onToggleLanguage: () => void;
  onOpenSafeFolder: () => void;
  onOpenTrash: () => void;
  onOpenStorageBreakdown: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  activeNotificationCount?: number;
  onOpenAccount: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
  onOpenFeedback?: () => void;
  userAccount?: UserAccount | null;
}

export const GoogleDrawer: React.FC<GoogleDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  storage,
  language,
  onToggleLanguage,
  onOpenSafeFolder,
  onOpenTrash,
  onOpenStorageBreakdown,
  onOpenSettings,
  onOpenNotifications,
  activeNotificationCount = 0,
  onOpenAccount,
  onOpenLegal,
  onOpenFeedback,
  userAccount,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const t = translations[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-[#f8fafd]">
          <div className="flex items-center gap-3">
            <GoogleFilesLogo size={32} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-neutral-900 tracking-tight">
                  {t.appName}
                </span>
                <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded-md">
                  by Akash Kumar
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Version {APP_INFO.version} (Official)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Account Section */}
        <div 
          onClick={() => {
            onClose();
            onOpenAccount();
          }}
          className={`mx-4 mt-3 p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors group border ${
            userAccount 
              ? 'bg-neutral-50 hover:bg-blue-50/60 border-neutral-200/80' 
              : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200/80'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {userAccount ? (
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-blue-100">
                  {userAccount.name ? userAccount.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs border border-neutral-200">
                  {userAccount.provider === 'google' ? (
                    <GoogleLogoIcon size={12} />
                  ) : (
                    <MicrosoftLogoIcon size={12} />
                  )}
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 ring-2 ring-blue-100">
                <User size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                {userAccount ? userAccount.name : t.signIn}
              </p>
              <p className="text-[11px] text-neutral-500 truncate">
                {userAccount ? userAccount.email : 'Google / Microsoft'}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-neutral-400 group-hover:text-blue-600 transition-colors shrink-0" />
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {/* Main Tabs */}
          <button
            onClick={() => {
              onSelectTab('clean');
              onClose();
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'clean' 
                ? 'bg-blue-100/70 text-blue-800 font-semibold' 
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Sparkles size={20} className={activeTab === 'clean' ? 'text-blue-700' : 'text-neutral-500'} />
            <span>{t.clean}</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('browse');
              onClose();
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'browse' 
                ? 'bg-blue-100/70 text-blue-800 font-semibold' 
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Folder size={20} className={activeTab === 'browse' ? 'text-blue-700' : 'text-neutral-500'} />
            <span>{t.browse}</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('share');
              onClose();
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'share' 
                ? 'bg-blue-100/70 text-blue-800 font-semibold' 
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Share2 size={20} className={activeTab === 'share' ? 'text-blue-700' : 'text-neutral-500'} />
            <span>{t.shareNear}</span>
          </button>

          <div className="my-2 border-t border-neutral-100" />

          {/* Collections Section */}
          <div className="px-4 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t.collections}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenSafeFolder();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <ShieldCheck size={20} className="text-emerald-600" />
            <span>{t.safeFolder}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenTrash();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Trash2 size={20} className="text-neutral-500" />
            <span>{t.trash}</span>
          </button>

          <div className="my-2 border-t border-neutral-100" />

          {/* Storage Information */}
          <div 
            onClick={() => {
              onClose();
              onOpenStorageBreakdown();
            }}
            className="p-3 mx-2 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 mb-1.5">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-blue-600" />
                <span>{t.storageBreakdown}</span>
              </div>
              <span className="text-[11px] text-blue-600 font-bold">
                {formatBytes(storage.used, 0)} / {formatBytes(storage.total, 0)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(100, Math.round((storage.used / storage.total) * 100))}%` }}
                className="bg-blue-600 h-full rounded-full"
              />
            </div>
          </div>

          <div className="my-2 border-t border-neutral-100" />

          {/* Settings and Tools */}
          <button
            onClick={() => onToggleLanguage()}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Languages size={20} className="text-purple-600" />
              <span>भाषा (Language)</span>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
              {language === 'hi' ? 'हिन्दी' : 'English'}
            </span>
          </button>

          {/* Notifications and Tasks */}
          {onOpenNotifications && (
            <button
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Bell size={20} className="text-blue-600" />
                <span>{language === 'hi' ? 'सूचनाएं व सक्रिय कार्य' : 'Notifications & Tasks'}</span>
              </div>
              {activeNotificationCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 animate-pulse">
                  {activeNotificationCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Settings size={20} className="text-neutral-500" />
            <span>{t.settings}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onOpenLegal) onOpenLegal('privacy');
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <ShieldCheck size={20} className="text-emerald-600" />
            <span>{language === 'hi' ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onOpenLegal) onOpenLegal('terms');
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <FileText size={20} className="text-blue-600" />
            <span>{language === 'hi' ? 'नियम और शर्तें (Terms of Service)' : 'Terms of Service'}</span>
          </button>

          <button
            onClick={() => {
              if (onOpenFeedback) {
                onClose();
                onOpenFeedback();
              } else {
                setShowHelp(prev => !prev);
              }
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <HelpCircle size={20} className="text-blue-600" />
            <div className="flex flex-col text-left">
              <span>{t.feedback || 'Help & feedback'}</span>
              <span className="text-[10px] text-neutral-400 font-normal">
                {language === 'hi' ? 'डेवलपर आकाश कुमार को फ़ीडबैक भेजें' : 'Send feedback to developer'}
              </span>
            </div>
          </button>

          {showHelp && (
            <div className="mx-3 my-2 p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950 mb-1">
                <Info size={14} className="text-blue-600" />
                <span>{APP_INFO.fullVersionString} (Official)</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Full offline file manager with Storage Cleaning, Internal & SD Card Explorer, MP3 Music Player, Video Player, PDF Reader, High-Speed Transfers, and Cloud Account Sync.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-neutral-100 bg-[#f8fafd] text-[11px] text-neutral-400 text-center">
          {APP_INFO.developer} • {APP_INFO.version} ({APP_INFO.edition})
        </div>
      </div>
    </div>
  );
};
