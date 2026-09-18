import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  FolderPlus, 
  Upload, 
  ChevronRight, 
  HardDrive, 
  CreditCard,
  Copy,
  FolderInput,
  Star,
  Trash2,
  Edit2
} from 'lucide-react';
import { FileItem, FolderItem, ViewMode, SortOption, Language, StorageDevice } from '../types';
import { formatBytes, sortFiles } from '../utils/storage';
import { translations } from '../utils/translations';
import { FileItemCard } from './FileItemCard';

interface FolderViewProps {
  currentPath: string;
  folders: FolderItem[];
  files: FileItem[];
  viewMode: ViewMode;
  sortOption: SortOption;
  language: Language;
  currentDevice?: StorageDevice;
  onNavigatePath: (path: string) => void;
  onBack: () => void;
  onCreateFolder: (parentPath: string) => void;
  onUploadToFolder: (folderPath: string) => void;
  onOpenPreview: (file: FileItem) => void;
  onToggleStar: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onMoveToSafe?: (id: string) => void;
  onRenameFile?: (file: FileItem) => void;
  onShowInfo: (file: FileItem) => void;
  onDeleteFolder?: (folderId: string) => void;
  onCopyTo?: (file: FileItem) => void;
  onMoveTo?: (file: FileItem) => void;
  onBatchCopy?: (files: FileItem[]) => void;
  onBatchMove?: (files: FileItem[]) => void;
  onBatchTrash?: (ids: string[]) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  currentPath,
  folders,
  files,
  viewMode,
  sortOption,
  language,
  currentDevice = 'internal',
  onNavigatePath,
  onBack,
  onCreateFolder,
  onUploadToFolder,
  onOpenPreview,
  onToggleStar,
  onMoveToTrash,
  onMoveToSafe,
  onRenameFile,
  onShowInfo,
  onDeleteFolder,
  onCopyTo,
  onMoveTo,
  onBatchCopy,
  onBatchMove,
  onBatchTrash,
}) => {
  const t = translations[language];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Subfolders of currentPath on this device
  const subFolders = folders.filter(
    f => (f.storageDevice || 'internal') === currentDevice && f.parentPath === currentPath
  );

  // Files in currentPath on this device
  const currentFiles = sortFiles(
    files.filter(
      f =>
        !f.isTrash &&
        !f.isSafe &&
        (f.storageDevice || 'internal') === currentDevice &&
        (f.folder === currentPath || (currentPath === '/' && f.folder === '/'))
    ),
    sortOption
  );

  // Path Breadcrumbs: e.g. "/DCIM/Camera" -> ["", "DCIM", "Camera"]
  const breadcrumbSegments = currentPath.split('/').filter(Boolean);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Top Header with Breadcrumbs */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 -ml-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {currentDevice === 'sdcard' ? (
                <CreditCard size={18} className="text-purple-600" />
              ) : (
                <HardDrive size={18} className="text-blue-600" />
              )}
              <span className="text-base font-semibold text-neutral-900">
                {currentDevice === 'sdcard' ? t.sdCard : t.internalStorage}
              </span>
            </div>
          </div>

          {/* Quick Actions for this folder */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateFolder(currentPath)}
              title={t.newFolder}
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <FolderPlus size={18} />
            </button>
            <button
              onClick={() => onUploadToFolder(currentPath)}
              title={t.uploadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-colors"
            >
              <Upload size={14} />
              <span>{t.uploadFile}</span>
            </button>
          </div>
        </div>

        {/* Interactive Breadcrumb Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-neutral-600 pt-1 pb-0.5 border-t border-neutral-100">
          <button
            onClick={() => onNavigatePath('/')}
            className={`font-medium hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors ${
              currentPath === '/' ? 'text-blue-600 bg-blue-50 font-semibold' : ''
            }`}
          >
            Root
          </button>

          {breadcrumbSegments.map((segment, idx) => {
            const pathSoFar = '/' + breadcrumbSegments.slice(0, idx + 1).join('/');
            const isLast = idx === breadcrumbSegments.length - 1;
            return (
              <React.Fragment key={pathSoFar}>
                <ChevronRight size={14} className="text-neutral-400 shrink-0" />
                <button
                  onClick={() => onNavigatePath(pathSoFar)}
                  className={`font-medium hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                    isLast ? 'text-blue-600 bg-blue-50 font-semibold' : ''
                  }`}
                >
                  {segment}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Batch Actions Bar in Folder View */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <span className="text-xs font-semibold text-blue-900">
            {selectedIds.length} {t.batchSelected}
          </span>
          <div className="flex items-center gap-1.5">
            {onBatchCopy && (
              <button
                onClick={() => {
                  const sel = files.filter(f => selectedIds.includes(f.id));
                  onBatchCopy(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} />
                <span>{t.copyTo}</span>
              </button>
            )}
            {onBatchMove && (
              <button
                onClick={() => {
                  const sel = files.filter(f => selectedIds.includes(f.id));
                  onBatchMove(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FolderInput size={13} />
                <span>{t.moveTo}</span>
              </button>
            )}
            {onBatchTrash && (
              <button
                onClick={() => {
                  onBatchTrash(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{t.delete}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subfolders list */}
      {subFolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
            Folders ({subFolders.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {subFolders.map(folder => (
              <div
                key={folder.id}
                onClick={() => onNavigatePath(folder.path)}
                className="p-3 bg-white hover:bg-neutral-50 rounded-xl border border-neutral-200/80 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Folder size={20} className="fill-amber-500/20" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-neutral-800 truncate group-hover:text-blue-600">
                      {folder.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {files.filter(f => (f.storageDevice || 'internal') === currentDevice && f.folder === folder.path).length} files
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-400 group-hover:text-neutral-700" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files in this directory */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
          Files ({currentFiles.length})
        </h3>

        {currentFiles.length === 0 && subFolders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-neutral-200/80">
            <p className="text-sm text-neutral-500 font-medium">
              This folder is empty
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Upload files or create subfolders using the buttons above
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
            {currentFiles.map(file => (
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
                onRename={onRenameFile}
                onShowInfo={onShowInfo}
                onCopyTo={onCopyTo}
                onMoveTo={onMoveTo}
                isSelectionMode={selectedIds.length > 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
