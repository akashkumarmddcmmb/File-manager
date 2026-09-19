import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  Star, 
  Download, 
  Share2, 
  CheckSquare, 
  Square,
  Search,
  Filter,
  Copy,
  FolderInput,
  Play,
  Shuffle,
  Scissors,
  Music,
  Film,
  Image as ImageIcon,
  FileText,
  Smartphone,
  HardDrive,
  RefreshCw,
  FolderArchive,
  CheckCircle2,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { FileCategory, FileItem, ViewMode, SortOption, Language } from '../types';
import { filterFilesByCategory, sortFiles, formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { FileItemCard } from './FileItemCard';
import { shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';

interface CategoryDetailViewProps {
  category: FileCategory;
  files: FileItem[];
  viewMode: ViewMode;
  sortOption: SortOption;
  language: Language;
  onBack: () => void;
  onOpenPreview: (file: FileItem) => void;
  onToggleStar: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onMoveToSafe?: (id: string) => void;
  onRename?: (file: FileItem) => void;
  onShowInfo: (file: FileItem) => void;
  onBatchTrash: (ids: string[]) => void;
  onBatchStar: (ids: string[]) => void;
  onCopyTo?: (file: FileItem) => void;
  onMoveTo?: (file: FileItem) => void;
  onBatchCopy?: (files: FileItem[]) => void;
  onBatchMove?: (files: FileItem[]) => void;
  onCopyToClipboard?: (files: FileItem[]) => void;
  onCutToClipboard?: (files: FileItem[]) => void;
  onQuickCopy?: (file: FileItem) => void;
  onQuickCut?: (file: FileItem) => void;
  onExtractArchive?: (file: FileItem) => void;
  onCompressZip?: (files: FileItem[]) => void;
  onRegisterSelectionClearer?: (clearer: (() => boolean) | null) => void;
  onRefreshStorage?: () => void;
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  files,
  viewMode,
  sortOption,
  language,
  onBack,
  onOpenPreview,
  onToggleStar,
  onMoveToTrash,
  onMoveToSafe,
  onRename,
  onShowInfo,
  onBatchTrash,
  onBatchStar,
  onCopyTo,
  onMoveTo,
  onBatchCopy,
  onBatchMove,
  onCopyToClipboard,
  onCutToClipboard,
  onQuickCopy,
  onQuickCut,
  onExtractArchive,
  onCompressZip,
  onRegisterSelectionClearer,
  onRefreshStorage,
}) => {
  const t = translations[language];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [storageLocationFilter, setStorageLocationFilter] = useState<'all' | 'internal' | 'sdcard'>('all');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Register selection clearer for hardware/gesture back button
  useEffect(() => {
    if (onRegisterSelectionClearer) {
      if (selectedIds.length > 0) {
        onRegisterSelectionClearer(() => {
          setSelectedIds([]);
          return true;
        });
      } else {
        onRegisterSelectionClearer(null);
      }
    }
    return () => {
      if (onRegisterSelectionClearer) {
        onRegisterSelectionClearer(null);
      }
    };
  }, [selectedIds, onRegisterSelectionClearer]);

  // Base list of all files in this category from both internal and SD card
  const allCategoryFiles = useMemo(() => {
    return filterFilesByCategory(files, category);
  }, [files, category]);

  // Internal vs SD Card counts
  const internalFiles = useMemo(() => {
    return allCategoryFiles.filter(f => f.storageDevice !== 'sdcard');
  }, [allCategoryFiles]);

  const sdCardFiles = useMemo(() => {
    return allCategoryFiles.filter(f => f.storageDevice === 'sdcard');
  }, [allCategoryFiles]);

  const hasSdCardFiles = sdCardFiles.length > 0;

  // Filtered list based on location, subfilters, and search
  const categoryFiles = useMemo(() => {
    let list = allCategoryFiles;

    // 1. Storage Location Filter (All vs Internal vs SD Card)
    if (storageLocationFilter === 'internal') {
      list = list.filter(f => f.storageDevice !== 'sdcard');
    } else if (storageLocationFilter === 'sdcard') {
      list = list.filter(f => f.storageDevice === 'sdcard');
    }

    // 2. Category Sub-filter Logic
    if (activeSubFilter !== 'all') {
      if (activeSubFilter === 'pdf') {
        list = list.filter(f => f.name.toLowerCase().endsWith('.pdf'));
      } else if (activeSubFilter === 'office') {
        list = list.filter(f => /\.(doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv)$/i.test(f.name));
      } else if (activeSubFilter === 'archives') {
        list = list.filter(f => /\.(zip|rar|7z|tar|gz|bz2)$/i.test(f.name));
      } else if (activeSubFilter === 'large') {
        list = list.filter(f => f.size > (category === 'videos' ? 50 * 1024 * 1024 : 10 * 1024 * 1024));
      } else if (activeSubFilter === 'camera') {
        list = list.filter(f => f.folder.toLowerCase().includes('camera') || f.folder.toLowerCase().includes('dcim'));
      } else if (activeSubFilter === 'screenshots') {
        list = list.filter(f => f.folder.toLowerCase().includes('screenshot'));
      } else if (activeSubFilter === 'whatsapp') {
        list = list.filter(f => f.folder.toLowerCase().includes('whatsapp') || f.name.toLowerCase().includes('wa'));
      } else if (activeSubFilter === 'recordings') {
        list = list.filter(f => f.folder.toLowerCase().includes('record') || f.folder.toLowerCase().includes('voice') || /\.(m4a|amr|opus|wav)$/i.test(f.name));
      } else if (activeSubFilter === 'songs') {
        list = list.filter(f => /\.(mp3|flac|wav|m4a|aac|ogg)$/i.test(f.name) && !f.folder.toLowerCase().includes('record'));
      } else if (activeSubFilter === 'starred') {
        list = list.filter(f => f.isStarred);
      } else if (activeSubFilter === 'sdcard_only') {
        list = list.filter(f => f.storageDevice === 'sdcard');
      }
    }

    // 3. Search query filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q));
    }

    return sortFiles(list, sortOption);
  }, [allCategoryFiles, storageLocationFilter, activeSubFilter, searchFilter, sortOption, category]);

  const categoryTitle = () => {
    switch (category) {
      case 'downloads': return t.downloads;
      case 'images': return t.images;
      case 'videos': return t.videos;
      case 'audio': return t.audio;
      case 'documents': return t.documents;
      case 'apps': return t.apps;
      case 'starred': return t.starred;
      default: return 'Files';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'downloads': return <Download size={20} className="text-[#1a73e8]" />;
      case 'images': return <ImageIcon size={20} className="text-[#00796b]" />;
      case 'videos': return <Film size={20} className="text-[#d93025]" />;
      case 'audio': return <Music size={20} className="text-[#b06000]" />;
      case 'documents': return <FileText size={20} className="text-[#185abc]" />;
      case 'apps': return <HardDrive size={20} className="text-[#137333]" />;
      default: return <HardDrive size={20} className="text-neutral-700" />;
    }
  };

  const handleDeepScanCategory = () => {
    triggerHapticFeedback();
    setIsScanning(true);
    setScanMessage(
      language === 'hi' 
        ? `पूरा फ़ोन (इंटरनल व SD कार्ड) स्कैन किया जा रहा है...` 
        : `Scanning all phone storage (Internal & SD Card)...`
    );

    if (onRefreshStorage) {
      onRefreshStorage();
    }

    setTimeout(() => {
      setIsScanning(false);
      setScanMessage(
        language === 'hi'
          ? `स्कैन पूरा हुआ: कुल ${allCategoryFiles.length} फ़ाइलें मिलीं (${internalFiles.length} इंटरनल, ${sdCardFiles.length} SD कार्ड)`
          : `Scan complete: ${allCategoryFiles.length} files found (${internalFiles.length} Internal, ${sdCardFiles.length} SD Card)`
      );

      setTimeout(() => {
        setScanMessage(null);
      }, 4000);
    }, 1000);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === categoryFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categoryFiles.map(f => f.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    onBatchTrash(selectedIds);
    setSelectedIds([]);
  };

  const handleBatchStar = () => {
    if (selectedIds.length === 0) return;
    onBatchStar(selectedIds);
    setSelectedIds([]);
  };

  const handleBatchShare = () => {
    if (selectedIds.length === 0) return;
    const selectedFiles = files.filter(f => selectedIds.includes(f.id));
    const urls = selectedFiles.map(f => f.url).filter(Boolean) as string[];
    const names = selectedFiles.map(f => f.name).join(', ');
    shareNativeFile(
      `${selectedFiles.length} files`,
      `Sharing: ${names}`,
      urls[0],
      urls
    );
  };

  const totalSize = categoryFiles.reduce((acc, f) => acc + f.size, 0);
  const totalAllCategorySize = allCategoryFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-3.5 pb-24 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedIds.length > 0) {
                setSelectedIds([]);
              } else {
                onBack();
              }
            }}
            className="p-2 -ml-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
              {getCategoryIcon()}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 capitalize">
                {categoryTitle()}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {allCategoryFiles.length} {t.items} • {formatBytes(totalAllCategorySize)}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons / Search / Scan / Select All */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title={language === 'hi' ? 'खोजें' : 'Search files'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showSearch ? 'bg-blue-50 border-blue-300 text-blue-600' : 'text-neutral-600 hover:bg-neutral-100 border-neutral-200'
            }`}
          >
            <Search size={16} />
          </button>

          <button
            onClick={handleDeepScanCategory}
            title={language === 'hi' ? 'पूरा फ़ोन स्कैन करें' : 'Deep scan device'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              isScanning 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'text-blue-700 bg-blue-50/80 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <RefreshCw size={15} className={isScanning ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">
              {language === 'hi' ? 'स्कैन करें' : 'Scan Phone'}
            </span>
          </button>

          <button
            onClick={handleSelectAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl flex items-center gap-1.5 border border-neutral-200 cursor-pointer"
          >
            {selectedIds.length === categoryFiles.length && categoryFiles.length > 0 ? (
              <>
                <CheckSquare size={14} className="text-blue-600" />
                <span>Deselect</span>
              </>
            ) : (
              <>
                <Square size={14} />
                <span>{t.selectAll}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Scan Notification Feedback */}
      {scanMessage && (
        <div className="bg-blue-600 text-white p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            {isScanning ? (
              <RefreshCw size={16} className="animate-spin shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
            )}
            <span className="text-xs font-medium truncate">{scanMessage}</span>
          </div>
          <button 
            onClick={() => setScanMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search Input Filter */}
      {showSearch && (
        <div className="relative animate-in fade-in duration-150">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={
              language === 'hi' 
                ? `${categoryTitle()} में नाम या फ़ोल्डर खोजें...` 
                : `Search in ${categoryTitle()} by name or folder...`
            }
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-neutral-300 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            autoFocus
          />
          <Search size={15} className="absolute left-3 top-3.5 text-neutral-400" />
          {searchFilter && (
            <button 
              onClick={() => setSearchFilter('')}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* STORAGE SOURCE SELECTOR TABS (All Phone vs Internal vs SD Card) */}
      <div className="bg-white p-2 rounded-2xl border border-neutral-200/90 shadow-2xs">
        <div className="flex items-center justify-between px-1 pb-1.5 border-b border-neutral-100">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <Layers size={12} />
            {language === 'hi' ? 'फ़ोन स्टोरेज स्रोत' : 'Storage Source'}
          </span>
          <span className="text-[11px] font-semibold text-neutral-600">
            {language === 'hi' ? 'कुल उपलब्ध:' : 'Total:'} {allCategoryFiles.length} {t.items} ({formatBytes(totalAllCategorySize)})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-2">
          {/* All Phone Storage */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              setStorageLocationFilter('all');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
              storageLocationFilter === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200/70'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>🌐</span>
              <span>{language === 'hi' ? 'पूरा फ़ोन (All)' : 'All Storage'}</span>
            </div>
            <span className={`text-[10px] font-medium mt-0.5 ${storageLocationFilter === 'all' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {allCategoryFiles.length} {t.items}
            </span>
          </button>

          {/* Internal Storage */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              setStorageLocationFilter('internal');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
              storageLocationFilter === 'internal'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border border-blue-200/70'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Smartphone size={13} />
              <span>{language === 'hi' ? 'इंटरनल' : 'Internal'}</span>
            </div>
            <span className={`text-[10px] font-medium mt-0.5 ${storageLocationFilter === 'internal' ? 'text-blue-100' : 'text-blue-700'}`}>
              {internalFiles.length} {t.items}
            </span>
          </button>

          {/* SD Card Storage */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              setStorageLocationFilter('sdcard');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
              storageLocationFilter === 'sdcard'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50/70 hover:bg-purple-100/70 text-purple-900 border border-purple-200/70'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <HardDrive size={13} />
              <span>{language === 'hi' ? 'SD कार्ड' : 'SD Card'}</span>
            </div>
            <span className={`text-[10px] font-medium mt-0.5 ${storageLocationFilter === 'sdcard' ? 'text-purple-100' : 'text-purple-700'}`}>
              {sdCardFiles.length} {t.items}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Play All Bar for Audio Tracks */}
      {category === 'audio' && categoryFiles.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenPreview(categoryFiles[0])}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-neutral-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Play size={15} className="fill-neutral-950" />
            <span>{language === 'hi' ? 'सभी ऑडियो चलाएं' : 'Play All Songs'}</span>
          </button>
          <button
            onClick={() => {
              const randomIdx = Math.floor(Math.random() * categoryFiles.length);
              onOpenPreview(categoryFiles[randomIdx]);
            }}
            className="py-2.5 px-4 bg-white hover:bg-neutral-50 active:scale-98 text-neutral-800 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 border border-neutral-200/90 shadow-2xs transition-all cursor-pointer"
          >
            <Shuffle size={15} className="text-amber-600" />
            <span>{language === 'hi' ? 'शफ़ल' : 'Shuffle'}</span>
          </button>
        </div>
      )}

      {/* Sub-Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveSubFilter('all')}
          className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors cursor-pointer ${
            activeSubFilter === 'all'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          All ({storageLocationFilter === 'all' ? allCategoryFiles.length : storageLocationFilter === 'internal' ? internalFiles.length : sdCardFiles.length})
        </button>

        {category === 'audio' && (
          <>
            <button
              onClick={() => setActiveSubFilter('songs')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'songs'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              🎵 {language === 'hi' ? 'गाने व संगीत' : 'Songs & Music'}
            </button>
            <button
              onClick={() => setActiveSubFilter('recordings')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'recordings'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              🎙️ {language === 'hi' ? 'वॉयस रिकॉर्डिंग्स' : 'Voice Recordings'}
            </button>
            <button
              onClick={() => setActiveSubFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'whatsapp'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              💬 WhatsApp Audio
            </button>
            <button
              onClick={() => setActiveSubFilter('starred')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'starred'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              ⭐ {t.starred}
            </button>
          </>
        )}

        {category === 'videos' && (
          <>
            <button
              onClick={() => setActiveSubFilter('camera')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'camera'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              📷 {language === 'hi' ? 'कैमरा रिकॉर्डिंग्स' : 'Camera'}
            </button>
            <button
              onClick={() => setActiveSubFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'whatsapp'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              💬 WhatsApp Video
            </button>
            <button
              onClick={() => setActiveSubFilter('large')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'large'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              🎬 Large Videos (&gt;50MB)
            </button>
          </>
        )}

        {category === 'images' && (
          <>
            <button
              onClick={() => setActiveSubFilter('camera')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'camera'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              📷 Camera
            </button>
            <button
              onClick={() => setActiveSubFilter('screenshots')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'screenshots'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              📸 {language === 'hi' ? 'स्क्रीनशॉट्स' : 'Screenshots'}
            </button>
            <button
              onClick={() => setActiveSubFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'whatsapp'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              💬 WhatsApp Images
            </button>
          </>
        )}

        {category === 'documents' && (
          <>
            <button
              onClick={() => setActiveSubFilter('pdf')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'pdf'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              📑 PDFs
            </button>
            <button
              onClick={() => setActiveSubFilter('office')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'office'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              📊 Word / Excel
            </button>
            <button
              onClick={() => setActiveSubFilter('archives')}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                activeSubFilter === 'archives'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              📦 ZIP & Archives
            </button>
          </>
        )}
      </div>

      {/* Batch Action Floating Toolbar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-20 bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <span className="text-xs font-semibold text-blue-900">
            {selectedIds.length} {t.batchSelected}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBatchShare}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Share selected files"
            >
              <Share2 size={13} />
              <span>{language === 'hi' ? 'शेयर करें' : 'Share'}</span>
            </button>
            {onCopyToClipboard && (
              <button
                onClick={() => {
                  const selectedFiles = files.filter(f => selectedIds.includes(f.id));
                  onCopyToClipboard(selectedFiles);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                <Copy size={13} />
                <span>{t.copy}</span>
              </button>
            )}
            {onCutToClipboard && (
              <button
                onClick={() => {
                  const selectedFiles = files.filter(f => selectedIds.includes(f.id));
                  onCutToClipboard(selectedFiles);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cut to clipboard"
              >
                <Scissors size={13} />
                <span>{t.cut}</span>
              </button>
            )}
            {onBatchCopy && (
              <button
                onClick={() => {
                  const selectedFiles = files.filter(f => selectedIds.includes(f.id));
                  onBatchCopy(selectedFiles);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy selected to SD Card or Folder"
              >
                <Copy size={13} />
                <span>{t.copyTo}</span>
              </button>
            )}
            {onBatchMove && (
              <button
                onClick={() => {
                  const selectedFiles = files.filter(f => selectedIds.includes(f.id));
                  onBatchMove(selectedFiles);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Move selected to SD Card or Folder"
              >
                <FolderInput size={13} />
                <span>{t.moveTo}</span>
              </button>
            )}
            {onCompressZip && (
              <button
                onClick={() => {
                  const selectedFiles = files.filter(f => selectedIds.includes(f.id));
                  onCompressZip(selectedFiles);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Create ZIP archive"
              >
                <FolderArchive size={13} />
                <span>{language === 'hi' ? 'ZIP बनाएं' : 'ZIP'}</span>
              </button>
            )}
            <button
              onClick={handleBatchStar}
              className="p-1.5 text-neutral-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              title="Add to Starred"
            >
              <Star size={16} />
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t.delete}</span>
            </button>
          </div>
        </div>
      )}

      {/* Files List / Grid with Empty State */}
      {categoryFiles.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-neutral-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
            {getCategoryIcon()}
          </div>
          <p className="text-sm text-neutral-700 font-bold mb-1">
            {t.noFilesFound}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
            {storageLocationFilter === 'sdcard' 
              ? (language === 'hi' ? 'SD कार्ड पर कोई फ़ाइल नहीं मिली।' : 'No files found on SD Card for this category.')
              : (language === 'hi' ? 'इस श्रेणी में कोई फ़ाइल उपलब्ध नहीं है।' : 'No files found in this category.')}
          </p>
          <button
            onClick={handleDeepScanCategory}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>{language === 'hi' ? 'पूरा फ़ोन दोबारा स्कैन करें' : 'Rescan Entire Phone'}</span>
          </button>
        </div>
      ) : (
        <div 
          className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5' 
              : 'space-y-1.5'
          }
        >
          {categoryFiles.map(file => (
            <FileItemCard
              key={file.id}
              file={file}
              viewMode={viewMode}
              isSelected={selectedIds.includes(file.id)}
              onToggleSelect={toggleSelect}
              onOpenPreview={onOpenPreview}
              onToggleStar={onToggleStar}
              onMoveToTrash={onMoveToTrash}
              onMoveToSafe={onMoveToSafe}
              onRename={onRename}
              onShowInfo={onShowInfo}
              onCopyTo={onCopyTo}
              onMoveTo={onMoveTo}
              onQuickCopy={onQuickCopy}
              onQuickCut={onQuickCut}
              onExtractArchive={onExtractArchive}
              language={language}
              isSelectionMode={selectedIds.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
