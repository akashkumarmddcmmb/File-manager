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
  RefreshCw,
  FolderArchive
} from 'lucide-react';
import { FileCategory, FileItem, ViewMode, SortOption, Language } from '../types';
import { filterFilesByCategory, sortFiles, formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { FileItemCard } from './FileItemCard';
import { shareNativeFile } from '../utils/nativeStorage';

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
}) => {
  const t = translations[language];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);

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

  const handleScanCategory = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  const categoryFiles = useMemo(() => {
    let list = filterFilesByCategory(files, category);
    
    // Sub filter logic
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
      }
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q));
    }

    return sortFiles(list, sortOption);
  }, [files, category, searchFilter, activeSubFilter, sortOption]);

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

  return (
    <div className="space-y-3 pb-24 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
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
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 capitalize">
              {categoryTitle()}
            </h2>
            <p className="text-xs text-neutral-500">
              {categoryFiles.length} {t.items} • {formatBytes(totalSize)}
            </p>
          </div>
        </div>

        {/* Action icons / Select All & Scan */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleScanCategory}
            title={language === 'hi' ? 'स्कैन और रीफ्रेश करें' : 'Scan & refresh'}
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg border border-neutral-200"
          >
            <RefreshCw size={15} className={isScanning ? 'animate-spin text-blue-600' : ''} />
          </button>
          <button
            onClick={handleSelectAll}
            className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg flex items-center gap-1.5 border border-neutral-200"
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

      {/* Quick Play All Bar for Audio Tracks */}
      {category === 'audio' && categoryFiles.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={() => onOpenPreview(categoryFiles[0])}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-neutral-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Play size={15} className="fill-neutral-950" />
            <span>{language === 'hi' ? 'सभी गाने चलाएं' : 'Play All Songs'}</span>
          </button>
          <button
            onClick={() => {
              const randomIdx = Math.floor(Math.random() * categoryFiles.length);
              onOpenPreview(categoryFiles[randomIdx]);
            }}
            className="py-2.5 px-4 bg-white hover:bg-neutral-50 active:scale-98 text-neutral-800 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 border border-neutral-200/80 shadow-xs transition-all cursor-pointer"
          >
            <Shuffle size={15} className="text-amber-600" />
            <span>{language === 'hi' ? 'शफ़ल' : 'Shuffle'}</span>
          </button>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveSubFilter('all')}
          className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
            activeSubFilter === 'all'
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          All ({filterFilesByCategory(files, category).length})
        </button>

        {category === 'audio' && (
          <>
            <button
              onClick={() => setActiveSubFilter('songs')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'songs'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Songs & Music
            </button>
            <button
              onClick={() => setActiveSubFilter('recordings')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'recordings'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Voice Recordings
            </button>
            <button
              onClick={() => setActiveSubFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'whatsapp'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              WhatsApp Audio
            </button>
          </>
        )}

        {category === 'videos' && (
          <>
            <button
              onClick={() => setActiveSubFilter('camera')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'camera'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Camera
            </button>
            <button
              onClick={() => setActiveSubFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'whatsapp'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              WhatsApp Video
            </button>
          </>
        )}

        {category === 'images' && (
          <>
            <button
              onClick={() => setActiveSubFilter('camera')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'camera'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Camera
            </button>
            <button
              onClick={() => setActiveSubFilter('screenshots')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'screenshots'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Screenshots
            </button>
            <button
              onClick={() => setActiveSubFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'whatsapp'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              WhatsApp Images
            </button>
          </>
        )}

        {category === 'documents' && (
          <>
            <button
              onClick={() => setActiveSubFilter('pdf')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'pdf'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              PDFs
            </button>
            <button
              onClick={() => setActiveSubFilter('office')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'office'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Word / Excel / Docs
            </button>
            <button
              onClick={() => setActiveSubFilter('archives')}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                activeSubFilter === 'archives'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              ZIP & Archives
            </button>
          </>
        )}

        <button
          onClick={() => setActiveSubFilter('large')}
          className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
            activeSubFilter === 'large'
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          Large ({category === 'videos' ? '>50MB' : '>10MB'})
        </button>
      </div>

      {/* Batch Action Floating Bar */}
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
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Create ZIP archive"
              >
                <FolderArchive size={13} />
                <span>{language === 'hi' ? 'ZIP बनाएं' : 'ZIP'}</span>
              </button>
            )}
            <button
              onClick={handleBatchStar}
              className="p-1.5 text-neutral-700 hover:bg-blue-100 rounded-lg transition-colors"
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

      {/* Files List/Grid */}
      {categoryFiles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200/80">
          <p className="text-sm text-neutral-500 font-medium">
            {t.noFilesFound}
          </p>
        </div>
      ) : (
        <div 
          className={
            viewMode === 'grid' 
              ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2' 
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
