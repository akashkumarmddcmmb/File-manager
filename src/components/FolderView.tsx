import React, { useState, useEffect } from 'react';
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
  Edit2,
  Loader2,
  Scissors,
  ClipboardPaste,
  List,
  Grid,
  FolderArchive
} from 'lucide-react';
import { FileItem, FolderItem, ViewMode, SortOption, Language, StorageDevice, ClipboardState } from '../types';
import { formatBytes, sortFiles } from '../utils/storage';
import { translations } from '../utils/translations';
import { listRealDirectoryFiles, triggerHapticFeedback } from '../utils/nativeStorage';
import { FileItemCard } from './FileItemCard';

interface FolderViewProps {
  currentPath: string;
  folders: FolderItem[];
  files: FileItem[];
  viewMode: ViewMode;
  onToggleViewMode?: () => void;
  sortOption: SortOption;
  language: Language;
  currentDevice?: StorageDevice;
  clipboard?: ClipboardState | null;
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
  onCopyToClipboard?: (files: FileItem[]) => void;
  onCutToClipboard?: (files: FileItem[]) => void;
  onPasteClipboard?: () => void;
  onClearClipboard?: () => void;
  onQuickCopy?: (file: FileItem) => void;
  onQuickCut?: (file: FileItem) => void;
  onExtractArchive?: (file: FileItem) => void;
  onCompressZip?: (files: FileItem[]) => void;
  onRegisterSelectionClearer?: (clearer: (() => boolean) | null) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  currentPath,
  folders,
  files,
  viewMode,
  onToggleViewMode,
  sortOption,
  language,
  currentDevice = 'internal',
  clipboard,
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
  onCopyToClipboard,
  onCutToClipboard,
  onPasteClipboard,
  onClearClipboard,
  onQuickCopy,
  onQuickCut,
  onExtractArchive,
  onCompressZip,
  onRegisterSelectionClearer,
}) => {
  const t = translations[language];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
  const [liveItems, setLiveItems] = useState<{ files: FileItem[]; folders: FolderItem[] } | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);

  // Dynamically query files and subfolders from the native filesystem when navigating
  useEffect(() => {
    let isMounted = true;
    if (currentPath && (currentPath.startsWith('/storage') || currentPath.startsWith('/'))) {
      setIsLoadingPath(true);
      listRealDirectoryFiles(currentPath)
        .then(res => {
          if (isMounted) {
            if (res && (res.files.length > 0 || res.folders.length > 0)) {
              setLiveItems(res);
            } else {
              setLiveItems(null);
            }
            setIsLoadingPath(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLiveItems(null);
            setIsLoadingPath(false);
          }
        });
    } else {
      setLiveItems(null);
      setIsLoadingPath(false);
    }
    return () => {
      isMounted = false;
    };
  }, [currentPath]);

  // Helper to determine if an item belongs to the selected storage device
  const isTargetDevice = (device?: string, path = '') => {
    if (currentDevice === 'sdcard') {
      return device === 'sdcard' || (path.startsWith('/storage/') && !path.includes('emulated'));
    }
    return (device || 'internal') === 'internal' && (!path.startsWith('/storage/') || path.includes('emulated'));
  };

  // Normalize current path for comparisons
  const normCurrentPath = currentPath.replace(/\/$/, '') || '/';

  // Subfolders fallback from props if not fetched from native
  const subFolders = folders.filter(f => {
    if (!isTargetDevice(f.storageDevice, f.path)) return false;
    const normParent = (f.parentPath || '').replace(/\/$/, '') || '/';
    if (normCurrentPath === '/' || normCurrentPath === '/storage/emulated/0') {
      return normParent === '/' || normParent === '' || normParent === '/storage/emulated/0' || !f.parentPath;
    }
    return normParent === normCurrentPath;
  });

  // Files fallback from props if not fetched from native
  const currentFiles = files.filter(f => {
    if (f.isTrash || f.isSafe) return false;
    if (!isTargetDevice(f.storageDevice, f.folder)) return false;
    const normFolder = (f.folder || '').replace(/\/$/, '') || '/';
    if (normCurrentPath === '/' || normCurrentPath === '/storage/emulated/0') {
      return normFolder === '/' || normFolder === '' || normFolder === '/storage/emulated/0';
    }
    return normFolder === normCurrentPath || normFolder.endsWith(normCurrentPath);
  });

  const displayFolders = liveItems ? liveItems.folders : subFolders;
  const displayFiles = sortFiles(
    liveItems ? liveItems.files.filter(f => !f.isTrash && !f.isSafe) : currentFiles,
    sortOption
  );

  // Compute clean breadcrumbs based on device root
  let baseRootPath = '/';
  let baseRootLabel = currentDevice === 'sdcard' ? t.sdCard : t.internalStorage;

  if (currentDevice === 'sdcard') {
    if (currentPath.startsWith('/storage/')) {
      const parts = currentPath.split('/').filter(Boolean);
      // parts[0] = 'storage', parts[1] = '0000-0000' or uuid
      if (parts.length >= 2) {
        baseRootPath = `/storage/${parts[1]}`;
      }
    }
  } else {
    if (currentPath.startsWith('/storage/emulated/0')) {
      baseRootPath = '/storage/emulated/0';
    }
  }

  // Calculate relative segments
  let relativePath = '';
  if (currentPath.startsWith(baseRootPath)) {
    relativePath = currentPath.slice(baseRootPath.length);
  } else {
    relativePath = currentPath;
  }
  const breadcrumbSegments = relativePath.split('/').filter(Boolean);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleNavigate = (path: string) => {
    triggerHapticFeedback();
    onNavigatePath(path);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Top Header with Breadcrumbs */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHapticFeedback();
                if (selectedIds.length > 0) {
                  setSelectedIds([]);
                } else {
                  onBack();
                }
              }}
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
              {isLoadingPath && (
                <Loader2 size={14} className="animate-spin text-neutral-400 ml-1" />
              )}
            </div>
          </div>

          {/* Quick Actions for this folder */}
          <div className="flex items-center gap-2">
            {clipboard && clipboard.files.length > 0 && onPasteClipboard && (
              <button
                id="btn-folder-paste-quick"
                onClick={() => {
                  triggerHapticFeedback();
                  onPasteClipboard();
                }}
                title={language === 'hi' ? 'यहाँ पेस्ट करें' : 'Paste here'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <ClipboardPaste size={14} />
                <span>{language === 'hi' ? 'यहाँ पेस्ट करें' : 'Paste here'}</span>
                <span className="bg-emerald-800/60 px-1.5 py-0.5 rounded-full text-[10px]">
                  {clipboard.files.length}
                </span>
              </button>
            )}
            {onToggleViewMode && (
              <button
                id="btn-folder-view-toggle"
                onClick={() => {
                  triggerHapticFeedback();
                  onToggleViewMode();
                }}
                title={
                  viewMode === 'grid'
                    ? (language === 'hi' ? 'सूची दृश्य में बदलें' : 'Switch to List view')
                    : (language === 'hi' ? 'ग्रिड दृश्य में बदलें' : 'Switch to Grid view')
                }
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
              </button>
            )}
            <button
              onClick={() => onCreateFolder(currentPath)}
              title={t.newFolder}
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <FolderPlus size={18} />
            </button>
            <button
              onClick={() => onUploadToFolder(currentPath)}
              title={t.uploadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-colors cursor-pointer"
            >
              <Upload size={14} />
              <span>{t.uploadFile}</span>
            </button>
          </div>
        </div>

        {/* Interactive Breadcrumb Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-neutral-600 pt-1 pb-0.5 border-t border-neutral-100 scrollbar-none">
          <button
            onClick={() => handleNavigate(baseRootPath)}
            className={`font-medium hover:text-blue-600 px-2 py-0.5 rounded-md transition-colors shrink-0 ${
              currentPath === baseRootPath || currentPath === '/'
                ? 'text-blue-600 bg-blue-50 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {baseRootLabel}
          </button>

          {breadcrumbSegments.map((segment, idx) => {
            const subRel = '/' + breadcrumbSegments.slice(0, idx + 1).join('/');
            const pathSoFar = baseRootPath === '/' ? subRel : `${baseRootPath}${subRel}`;
            const isLast = idx === breadcrumbSegments.length - 1;
            return (
              <React.Fragment key={pathSoFar}>
                <ChevronRight size={14} className="text-neutral-400 shrink-0" />
                <button
                  onClick={() => handleNavigate(pathSoFar)}
                  className={`font-medium hover:text-blue-600 px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                    isLast ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {segment}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Clipboard Active Notification Banner */}
      {clipboard && clipboard.files.length > 0 && (
        <div className="bg-blue-50/90 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <ClipboardPaste size={16} />
            </div>
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-neutral-900 truncate">
                {clipboard.files.length} {language === 'hi' ? 'फ़ाइलें' : 'file(s)'} {clipboard.operation === 'copy' ? (language === 'hi' ? 'कॉपी की गईं' : 'copied') : (language === 'hi' ? 'कट की गईं' : 'cut')}
              </p>
              <p className="text-[11px] text-neutral-500 truncate">
                {language === 'hi' ? 'इस फ़ोल्डर में पेस्ट करने के लिए बटन दबाएं' : 'Ready to paste in this folder'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onClearClipboard && (
              <button
                onClick={onClearClipboard}
                className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-xl cursor-pointer"
              >
                {language === 'hi' ? 'हटाएँ' : 'Cancel'}
              </button>
            )}
            {onPasteClipboard && (
              <button
                id="btn-folder-banner-paste"
                onClick={() => {
                  triggerHapticFeedback();
                  onPasteClipboard();
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <ClipboardPaste size={14} />
                <span>{language === 'hi' ? 'यहाँ पेस्ट करें' : 'Paste here'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Batch Actions Bar in Folder View */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <span className="text-xs font-semibold text-blue-900">
            {selectedIds.length} {t.batchSelected}
          </span>
          <div className="flex items-center gap-1.5">
            {onCopyToClipboard && (
              <button
                onClick={() => {
                  const sel = (liveItems?.files || files).filter(f => selectedIds.includes(f.id));
                  onCopyToClipboard(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Copy to clipboard"
              >
                <Copy size={13} />
                <span>{t.copy}</span>
              </button>
            )}
            {onCutToClipboard && (
              <button
                onClick={() => {
                  const sel = (liveItems?.files || files).filter(f => selectedIds.includes(f.id));
                  onCutToClipboard(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Cut to clipboard"
              >
                <Scissors size={13} />
                <span>{t.cut}</span>
              </button>
            )}
            {onBatchCopy && (
              <button
                onClick={() => {
                  const sel = (liveItems?.files || files).filter(f => selectedIds.includes(f.id));
                  onBatchCopy(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} />
                <span>{t.copyTo}</span>
              </button>
            )}
            {onBatchMove && (
              <button
                onClick={() => {
                  const sel = (liveItems?.files || files).filter(f => selectedIds.includes(f.id));
                  onBatchMove(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FolderInput size={13} />
                <span>{t.moveTo}</span>
              </button>
            )}
            {onCompressZip && (
              <button
                onClick={() => {
                  const sel = (liveItems?.files || files).filter(f => selectedIds.includes(f.id));
                  onCompressZip(sel);
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Create ZIP archive"
              >
                <FolderArchive size={13} />
                <span>{language === 'hi' ? 'ZIP बनाएं' : 'ZIP'}</span>
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
      {displayFolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
            {language === 'hi' ? 'फ़ोल्डर्स' : 'Folders'} ({displayFolders.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {displayFolders.map(folder => (
              <div
                key={folder.id}
                onClick={() => handleNavigate(folder.path)}
                className="p-3 bg-white hover:bg-neutral-50 active:scale-[0.99] rounded-xl border border-neutral-200/80 shadow-2xs flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/70">
                    <Folder size={22} className="fill-amber-500/20" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-neutral-800 truncate group-hover:text-blue-600">
                      {folder.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {currentDevice === 'sdcard' ? 'SD Card' : 'Internal'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files in this directory */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
          {language === 'hi' ? 'फ़ाइलें' : 'Files'} ({displayFiles.length})
        </h3>

        {displayFiles.length === 0 && displayFolders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-neutral-200/80 space-y-2">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Folder size={24} />
            </div>
            <p className="text-sm text-neutral-700 font-medium">
              {language === 'hi' ? 'यह फ़ोल्डर खाली है' : 'This folder is empty'}
            </p>
            <p className="text-xs text-neutral-400">
              {language === 'hi'
                ? 'फ़ाइल अपलोड करने या नया फ़ोल्डर बनाने के लिए ऊपर दिए गए बटनों का उपयोग करें'
                : 'Upload files or create subfolders using the buttons above'}
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
            {displayFiles.map(file => (
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
    </div>
  );
};
