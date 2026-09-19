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
  FolderArchive,
  X,
  MoreVertical,
  Share2,
  Square,
  CheckSquare
} from 'lucide-react';
import { FileItem, FolderItem, ViewMode, SortOption, Language, StorageDevice, ClipboardState } from '../types';
import { formatBytes, sortFiles } from '../utils/storage';
import { translations } from '../utils/translations';
import { listRealDirectoryFiles, triggerHapticFeedback, shareNativeFile } from '../utils/nativeStorage';
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
  onShare?: (fileOrFiles: FileItem | FileItem[]) => void;
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
  onShare,
  onRegisterSelectionClearer,
}) => {
  const t = translations[language];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const selectedFiles = displayFiles.filter(f => selectedIds.includes(f.id));

  const handleSelectAll = () => {
    if (selectedIds.length === displayFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayFiles.map(f => f.id));
    }
  };

  const handleBatchShare = () => {
    if (selectedIds.length === 0) return;
    if (onShare) {
      onShare(selectedFiles);
      setSelectedIds([]);
    } else {
      const urls = selectedFiles.map(f => f.url).filter(Boolean) as string[];
      const names = selectedFiles.map(f => f.name).join(', ');
      shareNativeFile(
        `${selectedFiles.length} files`,
        `Sharing: ${names}`,
        urls[0],
        urls,
        selectedFiles
      );
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Minimal Sleek Header Bar */}
      <div className="flex items-center justify-between gap-3 px-2 py-2 bg-white dark:bg-[#1e231f] rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
        {selectedIds.length > 0 ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setSelectedIds([]);
                }}
                className="p-2 -ml-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer shrink-0"
                title={language === 'hi' ? 'चयन हटाएं' : 'Clear selection'}
              >
                <X size={20} />
              </button>
              <div className="min-w-0">
                <span className="text-base font-bold text-neutral-900 dark:text-white truncate">
                  {selectedIds.length} {t.batchSelected}
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 cursor-pointer"
              >
                {selectedIds.length === displayFiles.length && displayFiles.length > 0 ? (
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

              {/* 3-Dot Batch Actions Menu */}
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

                      {/* Share */}
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

                      {/* Copy */}
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

                      {/* Cut */}
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

                      {/* Copy to... */}
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

                      {/* Move to... */}
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

                      {/* ZIP */}
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

                      {/* Delete */}
                      {onBatchTrash && (
                        <button
                          onClick={() => {
                            setShowBatchMenu(false);
                            onBatchTrash(selectedIds);
                            setSelectedIds([]);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} className="shrink-0" />
                          <span>{language === 'hi' ? `हटाएं (${selectedFiles.length})` : `Delete (${selectedFiles.length})`}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  onBack();
                }}
                className="p-2 -ml-1 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer shrink-0"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0 flex items-center gap-2">
                {currentDevice === 'sdcard' ? (
                  <CreditCard size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
                ) : (
                  <HardDrive size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {breadcrumbSegments.length > 0 
                    ? breadcrumbSegments[breadcrumbSegments.length - 1] 
                    : (currentDevice === 'sdcard' ? t.sdCard : t.internalStorage)}
                </span>
                {isLoadingPath && (
                  <Loader2 size={14} className="animate-spin text-neutral-400 shrink-0" />
                )}
              </div>
            </div>

            {/* Minimal Action Icons */}
            <div className="flex items-center gap-1 shrink-0">
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
                  className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                >
                  {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
                </button>
              )}
              <button
                onClick={() => onCreateFolder(currentPath)}
                title={t.newFolder}
                className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              >
                <FolderPlus size={18} />
              </button>
            </div>
          </>
        )}
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
                onCompressZip={onCompressZip}
                language={language}
                isSelectionMode={selectedIds.length > 0}
                selectedFiles={selectedFiles}
                onShare={onShare ? (f) => onShare(f) : undefined}
                onBatchShare={handleBatchShare}
                onBatchCopy={onBatchCopy ? (sel) => { onBatchCopy(sel); setSelectedIds([]); } : undefined}
                onBatchMove={onBatchMove ? (sel) => { onBatchMove(sel); setSelectedIds([]); } : undefined}
                onBatchTrash={onBatchTrash ? () => { onBatchTrash(selectedIds); setSelectedIds([]); } : undefined}
                onBatchStar={onToggleStar ? () => { selectedIds.forEach(id => onToggleStar(id)); setSelectedIds([]); } : undefined}
                onCopyToClipboard={onCopyToClipboard ? (sel) => { onCopyToClipboard(sel); setSelectedIds([]); } : undefined}
                onCutToClipboard={onCutToClipboard ? (sel) => { onCutToClipboard(sel); setSelectedIds([]); } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
