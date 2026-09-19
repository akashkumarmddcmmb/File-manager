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
  X,
  MoreVertical
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
  onShare?: (fileOrFiles: FileItem | FileItem[]) => void;
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
  onShare,
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
  const [showBatchMenu, setShowBatchMenu] = useState(false);

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
    const selected = files.filter(f => selectedIds.includes(f.id));
    if (onShare) {
      onShare(selected);
      setSelectedIds([]);
    } else {
      const urls = selected.map(f => f.url).filter(Boolean) as string[];
      const names = selected.map(f => f.name).join(', ');
      shareNativeFile(
        `${selected.length} files`,
        `Sharing: ${names}`,
        urls[0],
        urls,
        selected
      );
      setSelectedIds([]);
    }
  };

  const totalSize = categoryFiles.reduce((acc, f) => acc + f.size, 0);
  const totalAllCategorySize = allCategoryFiles.reduce((acc, f) => acc + f.size, 0);
  const selectedFiles = useMemo(() => files.filter(f => selectedIds.includes(f.id)), [files, selectedIds]);

  return (
    <div className="space-y-3.5 pb-24 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#1e231f] p-3.5 sm:p-4 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
        {selectedIds.length > 0 ? (
          /* Selection Mode Header with 3-Dot Batch Actions */
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds([])}
                className="p-2 -ml-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                title={language === 'hi' ? 'चयन हटाएं' : 'Clear selection'}
              >
                <X size={20} />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  {selectedIds.length} {t.batchSelected}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 cursor-pointer"
              >
                {selectedIds.length === categoryFiles.length && categoryFiles.length > 0 ? (
                  <>
                    <CheckSquare size={14} className="text-blue-600" />
                    <span>{language === 'hi' ? 'चयन हटाएं' : 'Deselect'}</span>
                  </>
                ) : (
                  <>
                    <Square size={14} />
                    <span>{t.selectAll}</span>
                  </>
                )}
              </button>

              {/* 3-Dot Actions Menu for Selection */}
              <div className="relative">
                <button
                  onClick={() => setShowBatchMenu(!showBatchMenu)}
                  title={language === 'hi' ? 'अधिक विकल्प' : 'More options'}
                  className="p-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
                >
                  <MoreVertical size={18} />
                </button>

                {showBatchMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBatchMenu(false)} />
                    <div className="absolute right-0 mt-1 w-52 sm:w-56 bg-white dark:bg-[#1e231f] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto">
                      <div className="px-3.5 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border-b border-blue-100 dark:border-blue-900/40 mb-1">
                        <span>{language === 'hi' ? `${selectedFiles.length} फ़ाइलें चुनी गईं` : `${selectedFiles.length} files selected`}</span>
                      </div>

                      {/* 1. Share */}
                      <button
                        onClick={() => {
                          setShowBatchMenu(false);
                          handleBatchShare();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer"
                      >
                        <Share2 size={15} className="shrink-0" />
                        <span>{language === 'hi' ? `शेयर करें (${selectedFiles.length})` : `Share (${selectedFiles.length})`}</span>
                      </button>

                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                      {/* 2. Copy */}
                      {onCopyToClipboard && (
                        <button
                          onClick={() => {
                            setShowBatchMenu(false);
                            onCopyToClipboard(selectedFiles);
                            setSelectedIds([]);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
                        >
                          <Copy size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{language === 'hi' ? `कॉपी करें (${selectedFiles.length})` : `Copy (${selectedFiles.length})`}</span>
                        </button>
                      )}

                      {/* 3. Cut */}
                      {onCutToClipboard && (
                        <button
                          onClick={() => {
                            setShowBatchMenu(false);
                            onCutToClipboard(selectedFiles);
                            setSelectedIds([]);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
                        >
                          <Scissors size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>{language === 'hi' ? `कट (यहाँ से हटाएँ) (${selectedFiles.length})` : `Cut (${selectedFiles.length})`}</span>
                        </button>
                      )}

                      {/* 4. Copy to... */}
                      {onBatchCopy && (
                        <button
                          onClick={() => {
                            setShowBatchMenu(false);
                            onBatchCopy(selectedFiles);
                            setSelectedIds([]);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
                        >
                          <FolderInput size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{language === 'hi' ? 'कॉपी करें...' : 'Copy to...'}</span>
                        </button>
                      )}

                      {/* 5. Move to... */}
                      {onBatchMove && (
                        <button
                          onClick={() => {
                            setShowBatchMenu(false);
                            onBatchMove(selectedFiles);
                            setSelectedIds([]);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
                        >
                          <FolderInput size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>{language === 'hi' ? 'यहाँ ले जाएँ...' : 'Move to...'}</span>
                        </button>
                      )}

                      {/* 6. ZIP */}
                      {onCompressZip && (
                        <button
                          onClick={() => {
                            setShowBatchMenu(false);
                            onCompressZip(selectedFiles);
                            setSelectedIds([]);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
                        >
                          <FolderArchive size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{language === 'hi' ? `ZIP बनाएं (${selectedFiles.length})` : `Create ZIP (${selectedFiles.length})`}</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                      {/* 7. Star */}
                      <button
                        onClick={() => {
                          setShowBatchMenu(false);
                          handleBatchStar();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                      >
                        <Star size={15} className="text-amber-500 shrink-0" />
                        <span>{language === 'hi' ? 'स्टार मार्क करें' : 'Add to Starred'}</span>
                      </button>

                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                      {/* 8. Trash / Delete */}
                      <button
                        onClick={() => {
                          setShowBatchMenu(false);
                          handleBatchDelete();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} className="shrink-0" />
                        <span>{language === 'hi' ? `हटाएं (${selectedFiles.length})` : `Delete (${selectedFiles.length})`}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Normal Header */
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
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

            {/* Action icons / Search / Select All */}
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
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl flex items-center gap-1.5 border border-neutral-200 cursor-pointer"
              >
                <Square size={14} />
                <span>{t.selectAll}</span>
              </button>
            </div>
          </>
        )}
      </div>

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
          All ({allCategoryFiles.length})
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
              onCompressZip={onCompressZip}
              language={language}
              isSelectionMode={selectedIds.length > 0}
              selectedFiles={selectedFiles}
              onShare={onShare ? (f) => onShare(f) : undefined}
              onBatchShare={handleBatchShare}
              onBatchCopy={onBatchCopy ? (sel) => { onBatchCopy(sel); setSelectedIds([]); } : undefined}
              onBatchMove={onBatchMove ? (sel) => { onBatchMove(sel); setSelectedIds([]); } : undefined}
              onBatchTrash={handleBatchDelete}
              onBatchStar={handleBatchStar}
              onCopyToClipboard={onCopyToClipboard ? (sel) => { onCopyToClipboard(sel); setSelectedIds([]); } : undefined}
              onCutToClipboard={onCutToClipboard ? (sel) => { onCutToClipboard(sel); setSelectedIds([]); } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
