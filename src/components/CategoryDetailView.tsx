import React, { useState, useMemo } from 'react';
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
  FolderInput
} from 'lucide-react';
import { FileCategory, FileItem, ViewMode, SortOption, Language } from '../types';
import { filterFilesByCategory, sortFiles, formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { FileItemCard } from './FileItemCard';

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
}) => {
  const t = translations[language];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');

  const categoryFiles = useMemo(() => {
    let list = filterFilesByCategory(files, category);
    
    // Sub filter logic
    if (activeSubFilter !== 'all') {
      if (activeSubFilter === 'pdf') {
        list = list.filter(f => f.name.toLowerCase().endsWith('.pdf'));
      } else if (activeSubFilter === 'large') {
        list = list.filter(f => f.size > 10 * 1024 * 1024);
      } else if (activeSubFilter === 'camera') {
        list = list.filter(f => f.folder.includes('Camera'));
      } else if (activeSubFilter === 'screenshots') {
        list = list.filter(f => f.folder.includes('Screenshots'));
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

  const totalSize = categoryFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-3 pb-24 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
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

        {/* Action icons / Select All */}
        <div className="flex items-center gap-1.5">
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
          </>
        )}

        {category === 'documents' && (
          <button
            onClick={() => setActiveSubFilter('pdf')}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
              activeSubFilter === 'pdf'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            PDF Documents
          </button>
        )}

        <button
          onClick={() => setActiveSubFilter('large')}
          className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
            activeSubFilter === 'large'
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          Large (&gt;10MB)
        </button>
      </div>

      {/* Batch Action Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-20 bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <span className="text-xs font-semibold text-blue-900">
            {selectedIds.length} {t.batchSelected}
          </span>
          <div className="flex items-center gap-1.5">
            {onBatchCopy && (
              <button
                onClick={() => {
                  const selectedFiles = files.filter(f => selectedIds.includes(f.id));
                  onBatchCopy(selectedFiles);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
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
                className="px-2.5 py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Move selected to SD Card or Folder"
              >
                <FolderInput size={13} />
                <span>{t.moveTo}</span>
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
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3' 
              : 'space-y-2'
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
              isSelectionMode={selectedIds.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
