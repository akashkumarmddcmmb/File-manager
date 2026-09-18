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
  CreditCard,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { TabType, Language, StorageBreakdown } from '../types';
import { GoogleFilesLogo } from './GoogleFilesLogo';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';

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
  onOpenAccount: () => void;
  userEmail?: string;
  userName?: string;
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
  onOpenAccount,
  userEmail = 'akashkumarmddcmmb@gmail.com',
  userName = 'Akash Kumar',
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
                  by Google
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Version 1.0 (Official UI)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Account Card */}
        <div 
          onClick={() => {
            onClose();
            onOpenAccount();
          }}
          className="mx-4 mt-3 p-3 bg-blue-50/60 hover:bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-xs shrink-0 ring-2 ring-blue-100">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate group-hover:text-blue-600 transition-colors">
                {userName}
              </p>
              <p className="text-[11px] text-neutral-500 truncate">
                {userEmail}
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

          {/* Section Divider */}
          <hr className="my-2 border-neutral-200/80" />

          {/* Collections */}
          <button
            onClick={() => {
              onClose();
              onOpenSafeFolder();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <ShieldCheck size={20} className="text-blue-600" />
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

          {/* Section Divider */}
          <hr className="my-2 border-neutral-200/80" />

          {/* Storage & Devices */}
          <button
            onClick={() => {
              onClose();
              onOpenStorageBreakdown();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <HardDrive size={20} className="text-neutral-500" />
              <span>{t.storageBreakdown}</span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold">
              {formatBytes(storage.used, 1)} / {formatBytes(storage.total, 0)}
            </span>
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLanguage}
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

          <button
            onClick={() => {
              onClose();
              onOpenStorageBreakdown();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Settings size={20} className="text-neutral-500" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setShowHelp(prev => !prev)}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <HelpCircle size={20} className="text-neutral-500" />
            <span>Help & feedback</span>
          </button>

          {showHelp && (
            <div className="mx-3 my-2 p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950 mb-1">
                <Info size={14} className="text-blue-600" />
                <span>Google Files v2.4 (Offline)</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Full offline file manager with Storage Cleaning, Internal & SD Card Explorer, MP3 Music Player, Video Player, PDF Reader, and High-Speed Transfers.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-neutral-100 bg-[#f8fafd] text-[11px] text-neutral-400 text-center">
          Google LLC • Offline Edition
        </div>
      </div>
    </div>
  );
};
