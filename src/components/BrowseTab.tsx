import React from 'react';
import { 
  Download, 
  Image as ImageIcon, 
  Film, 
  Music, 
  FileText, 
  Package, 
  Star, 
  ShieldCheck, 
  Trash2, 
  Smartphone,
  ChevronRight,
  HardDrive,
  CreditCard,
  MoreVertical
} from 'lucide-react';
import { FileCategory, FileItem, StorageBreakdown, ViewMode, SortOption, Language, StorageDevice } from '../types';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { triggerHapticFeedback, StorageVolumeInfo } from '../utils/nativeStorage';
import { ShieldAlert, RefreshCw, FolderLock } from 'lucide-react';
import { FileMediaThumbnail } from './FileMediaThumbnail';

interface BrowseTabProps {
  files: FileItem[];
  storage: StorageBreakdown;
  viewMode: ViewMode;
  sortOption: SortOption;
  language: Language;
  realVolumes?: { internal: StorageVolumeInfo | null; sdcard: StorageVolumeInfo | null } | null;
  permStatus?: { granted: boolean; needsManageSettings: boolean };
  isScanningStorage?: boolean;
  onRequestPermissions?: () => void;
  onRefreshStorage?: () => void;
  onSelectCategory: (cat: FileCategory) => void;
  onOpenFolderView: (device?: StorageDevice) => void;
  onOpenSafeFolder: () => void;
  onOpenTrash: () => void;
  onOpenPreview: (file: FileItem) => void;
  onToggleStar: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onMoveToSafe?: (id: string) => void;
  onRename?: (file: FileItem) => void;
  onShowInfo: (file: FileItem) => void;
  onCopyTo?: (file: FileItem) => void;
  onMoveTo?: (file: FileItem) => void;
  hasDemoFiles?: boolean;
  onClearDemoFiles?: () => void;
}

export const BrowseTab: React.FC<BrowseTabProps> = ({
  files,
  storage,
  viewMode,
  sortOption,
  language,
  realVolumes,
  permStatus,
  isScanningStorage,
  onRequestPermissions,
  onRefreshStorage,
  onSelectCategory,
  onOpenFolderView,
  onOpenSafeFolder,
  onOpenTrash,
  onOpenPreview,
  onToggleStar,
  onMoveToTrash,
  onMoveToSafe,
  onRename,
  onShowInfo,
  onCopyTo,
  onMoveTo,
  hasDemoFiles = false,
  onClearDemoFiles,
}) => {
  const t = translations[language];

  // Active (non-trash, non-safe) files for recents
  const activeFiles = files.filter(f => !f.isTrash && !f.isSafe);
  const recentFiles = [...activeFiles].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);

  // Counts & sizes for categories
  const downloadsFiles = files.filter(f => !f.isTrash && !f.isSafe && f.folder.toLowerCase().includes('download'));
  const imagesFiles = files.filter(f => !f.isTrash && !f.isSafe && f.type === 'image');
  const videosFiles = files.filter(f => !f.isTrash && !f.isSafe && f.type === 'video');
  const audioFiles = files.filter(f => !f.isTrash && !f.isSafe && f.type === 'audio');
  const docsFiles = files.filter(f => !f.isTrash && !f.isSafe && (f.type === 'document' || f.type === 'archive' || f.type === 'other'));
  const appsFiles = files.filter(f => !f.isTrash && !f.isSafe && (f.type === 'apk' || f.name.endsWith('.apk')));
  const starredFiles = files.filter(f => !f.isTrash && !f.isSafe && f.isStarred);
  const safeFiles = files.filter(f => !f.isTrash && f.isSafe);
  const trashFiles = files.filter(f => f.isTrash);

  // Storage calculations from real volumes or fallback
  const internalTotal = realVolumes?.internal ? realVolumes.internal.totalBytes : storage.total;
  const internalUsed = realVolumes?.internal ? realVolumes.internal.usedBytes : storage.used;
  const internalFree = realVolumes?.internal ? realVolumes.internal.freeBytes : storage.free;

  const sdCardTotalBytes = realVolumes?.sdcard ? realVolumes.sdcard.totalBytes : (128 * 1024 * 1024 * 1024);
  const sdCardUsedBytes = realVolumes?.sdcard ? realVolumes.sdcard.usedBytes : (44.8 * 1024 * 1024 * 1024);
  const sdCardFreeBytes = realVolumes?.sdcard ? realVolumes.sdcard.freeBytes : (sdCardTotalBytes - sdCardUsedBytes);
  const sdCardLabel = realVolumes?.sdcard ? realVolumes.sdcard.name : 'SanDisk 128 GB';

  // Official Google Files Category Icons & Pastel Circles
  const categories = [
    {
      id: 'downloads' as FileCategory,
      name: t.downloads,
      icon: <Download size={22} className="text-[#1a73e8]" />,
      iconBg: 'bg-[#e8f0fe]',
      count: downloadsFiles.length,
      size: downloadsFiles.reduce((acc, f) => acc + f.size, 0),
    },
    {
      id: 'images' as FileCategory,
      name: t.images,
      icon: <ImageIcon size={22} className="text-[#00796b]" />,
      iconBg: 'bg-[#e0f2f1]',
      count: imagesFiles.length,
      size: imagesFiles.reduce((acc, f) => acc + f.size, 0),
    },
    {
      id: 'videos' as FileCategory,
      name: t.videos,
      icon: <Film size={22} className="text-[#d93025]" />,
      iconBg: 'bg-[#fce8e6]',
      count: videosFiles.length,
      size: videosFiles.reduce((acc, f) => acc + f.size, 0),
    },
    {
      id: 'audio' as FileCategory,
      name: t.audio,
      icon: <Music size={22} className="text-[#b06000]" />,
      iconBg: 'bg-[#fef7e0]',
      count: audioFiles.length,
      size: audioFiles.reduce((acc, f) => acc + f.size, 0),
    },
    {
      id: 'documents' as FileCategory,
      name: t.documents,
      icon: <FileText size={22} className="text-[#185abc]" />,
      iconBg: 'bg-[#e8eaf6]',
      count: docsFiles.length,
      size: docsFiles.reduce((acc, f) => acc + f.size, 0),
    },
    {
      id: 'apps' as FileCategory,
      name: t.apps,
      icon: <Package size={22} className="text-[#137333]" />,
      iconBg: 'bg-[#e6f4ea]',
      count: appsFiles.length,
      size: appsFiles.reduce((acc, f) => acc + f.size, 0),
    },
  ];

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Optional Demo Files Notification Banner */}
      {hasDemoFiles && onClearDemoFiles && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <HardDrive size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-amber-900">
                  {language === 'hi' ? 'डेमो फ़ाइलें लोड हैं' : 'Sample Demo Files Active'}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-amber-200 text-amber-900">
                  DEMO
                </span>
              </div>
              <div className="text-[11px] text-amber-700 leading-tight mt-0.5">
                {language === 'hi' ? 'इंस्टॉल के बाद असली उपयोग के लिए डेमो फ़ाइलें हटाएं' : 'Remove sample files to start with clean real storage'}
              </div>
            </div>
          </div>
          <button
            onClick={onClearDemoFiles}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            {language === 'hi' ? 'फ़ाइलें हटाएं' : 'Clear Demo'}
          </button>
        </div>
      )}

      {/* 1. Recent Files Section (Horizontal Carousel) */}
      {recentFiles.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">
              {t.recent}
            </h2>
            <button
              onClick={() => onSelectCategory('images')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>{t.seeAll}</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
            {recentFiles.map(file => (
              <div
                key={file.id}
                onClick={() => onOpenPreview(file)}
                className="group w-36 sm:w-40 shrink-0 snap-start bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Thumbnail / Preview container */}
                <div className="w-full h-28 bg-[#f8fafd] flex items-center justify-center overflow-hidden relative">
                  <FileMediaThumbnail
                    file={file}
                    className="w-full h-full"
                    showBadge={true}
                    showPlayOverlay={true}
                  />
                </div>

                {/* File Title & Size */}
                <div className="p-2.5 min-w-0 bg-white">
                  <p className="text-xs font-medium text-neutral-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Categories Grid (Material 3 Two-column / Three-column layout) */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-neutral-800 tracking-tight px-1">
          {t.categories}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`category-${cat.id}`}
              onClick={() => {
                triggerHapticFeedback();
                onSelectCategory(cat.id);
              }}
              className="w-full bg-white p-3.5 rounded-2xl border border-neutral-200/90 hover:border-neutral-300 hover:shadow-xs transition-all flex items-center justify-between text-left group cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-full ${cat.iconBg} flex items-center justify-center shrink-0`}>
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-900 truncate">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                    {cat.count} {t.items} • {formatBytes(cat.size)}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-800 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* 3. Collections (Starred, Safe Folder, Trash) */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-neutral-800 tracking-tight px-1">
          {t.collections}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Starred */}
          <button
            id="collection-starred"
            onClick={() => onSelectCategory('starred')}
            className="bg-white p-3.5 rounded-2xl border border-neutral-200/90 hover:border-amber-300 hover:shadow-xs transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#fef7e0] flex items-center justify-center shrink-0">
                <Star size={22} className="text-[#f29900] fill-[#f29900]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 truncate">
                  {t.starred}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {starredFiles.length} {t.items}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-800 transition-colors shrink-0" />
          </button>

          {/* Safe Folder */}
          <button
            id="collection-safe-folder"
            onClick={onOpenSafeFolder}
            className="bg-white p-3.5 rounded-2xl border border-neutral-200/90 hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#e8f0fe] flex items-center justify-center shrink-0">
                <ShieldCheck size={22} className="text-[#1a73e8]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 truncate">
                  {t.safeFolder}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {safeFiles.length > 0 ? `${safeFiles.length} locked files` : 'Protected with PIN'}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-800 transition-colors shrink-0" />
          </button>

          {/* Trash */}
          <button
            id="collection-trash"
            onClick={onOpenTrash}
            className="bg-white p-3.5 rounded-2xl border border-neutral-200/90 hover:border-neutral-400 hover:shadow-xs transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#f1f3f4] flex items-center justify-center shrink-0">
                <Trash2 size={22} className="text-[#5f6368]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 truncate">
                  {t.trash}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {trashFiles.length} {t.items} ({formatBytes(trashFiles.reduce((a, b) => a + b.size, 0))})
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-800 transition-colors shrink-0" />
          </button>
        </div>
      </section>

      {/* Permission Banner if Storage Access not granted on Android 11+ */}
      {permStatus && !permStatus.granted && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <FolderLock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900">
                {language === 'hi' ? 'फ़ोन मेमोरी व SD कार्ड अनुमति आवश्यक है' : 'Device & SD Card Access Required'}
              </h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                {language === 'hi'
                  ? 'आपके डिवाइस की इंटरनल मेमोरी और मेमोरी कार्ड (SD Card) को एक्सेस करने के लिए Android की "All Files Access" अनुमति देना आवश्यक है।'
                  : 'Grant All Files Access so Files by Akash Kumar can display your songs, videos, documents and SD card files.'}
              </p>
              {onRequestPermissions && (
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    onRequestPermissions();
                  }}
                  className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white text-xs font-medium rounded-full shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert size={14} />
                  {language === 'hi' ? 'अनुमति दें (Allow Storage Access)' : 'Grant Storage Access'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Storage Devices (Internal Storage & SD Card) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">
            {t.storageDevices}
          </h2>
          {onRefreshStorage && (
            <button
              onClick={() => {
                triggerHapticFeedback();
                onRefreshStorage();
              }}
              disabled={isScanningStorage}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium cursor-pointer"
            >
              <RefreshCw size={12} className={isScanningStorage ? 'animate-spin' : ''} />
              {isScanningStorage 
                ? (language === 'hi' ? 'स्कैन हो रहा है...' : 'Scanning...') 
                : (language === 'hi' ? 'डिवाइस रिफ्रेश करें' : 'Rescan Storage')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Internal Storage Card */}
          <div
            id="storage-device-internal"
            onClick={() => onOpenFolderView('internal')}
            className="bg-white p-4 rounded-2xl border border-neutral-200/90 hover:border-blue-400 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                <Smartphone size={24} />
              </div>
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 truncate">
                    {t.internalStorage}
                  </h3>
                  <span className="text-[11px] font-medium text-neutral-500">
                    {Math.round((internalUsed / internalTotal) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mt-1.5 mb-1">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (internalUsed / internalTotal) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  {formatBytes(internalFree)} {t.free} of {formatBytes(internalTotal, 0)}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

          {/* SD Card (Memory Card) Card */}
          <div
            id="storage-device-sdcard"
            onClick={() => onOpenFolderView('sdcard')}
            className="bg-white p-4 rounded-2xl border border-neutral-200/90 hover:border-purple-400 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/80">
                <CreditCard size={24} />
              </div>
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-neutral-900 truncate">
                      {t.sdCard}
                    </h3>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-700 rounded-md truncate max-w-[120px]">
                      {sdCardLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-purple-600">
                    {Math.round((sdCardUsedBytes / sdCardTotalBytes) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mt-1.5 mb-1">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (sdCardUsedBytes / sdCardTotalBytes) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  {formatBytes(sdCardFreeBytes)} {t.free} of {formatBytes(sdCardTotalBytes, 0)}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-neutral-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>
      </section>
    </div>
  );
};
