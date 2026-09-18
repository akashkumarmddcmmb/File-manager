import React, { useState, useEffect, useRef } from 'react';
import { initialFiles, initialFolders } from './data/initialFiles';
import { 
  FileCategory, 
  FileItem, 
  FolderItem, 
  TabType, 
  ViewMode, 
  SortOption, 
  Language,
  StorageDevice,
  TransferTask,
  ClipboardState,
  UserAccount
} from './types';
import { computeStorage, sortFiles } from './utils/storage';
import { classifyFile } from './utils/fileClassifier';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { CleanTab } from './components/CleanTab';
import { BrowseTab } from './components/BrowseTab';
import { ShareTab } from './components/ShareTab';
import { CategoryDetailView } from './components/CategoryDetailView';
import { FolderView } from './components/FolderView';
import { FileViewerModal } from './components/FileViewerModal';
import { AudioPlayerModal } from './components/AudioPlayerModal';
import { MiniMusicPlayer } from './components/MiniMusicPlayer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PdfDocumentViewerModal } from './components/PdfDocumentViewerModal';
import { SafeFolderModal } from './components/SafeFolderModal';
import { TrashModal } from './components/TrashModal';
import { StorageBreakdownModal } from './components/StorageBreakdownModal';
import { RenameModal, NewFolderModal } from './components/ActionModals';
import { TransferModal } from './components/TransferModal';
import { CopyMoveDestinationModal } from './components/CopyMoveDestinationModal';
import { GoogleDrawer } from './components/GoogleDrawer';
import { AccountModal } from './components/AccountModal';
import { ArchiveExtractorModal } from './components/ArchiveExtractorModal';
import { ZipCompressModal } from './components/ZipCompressModal';
import { FileItemCard } from './components/FileItemCard';
import { translations } from './utils/translations';
import { isArchiveFile } from './utils/archiveUtils';
import { UploadCloud, CheckCircle2, ClipboardPaste, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { 
  scanNativeStorage, 
  isNativePlatform, 
  checkStoragePermissionStatus, 
  requestAllFilesAccess, 
  StorageVolumeInfo,
  openRealFile,
  copyNativeFile,
  moveNativeFile,
  triggerHapticFeedback
} from './utils/nativeStorage';

const STORAGE_FILES_KEY = 'google_files_app_files_v1';
const STORAGE_FOLDERS_KEY = 'google_files_app_folders_v1';
const STORAGE_JUNK_KEY = 'google_files_app_junk_v1';

export default function App() {
  // 1. Files & Folders state with LocalStorage persistence
  const [files, setFiles] = useState<FileItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FILES_KEY);
      if (saved) {
        const parsed: FileItem[] = JSON.parse(saved);
        const initialMap = new Map(initialFiles.map(f => [f.id, f]));
        return parsed.map(f => {
          const init = initialMap.get(f.id);
          if (init && init.thumbnail && !f.thumbnail) {
            return { ...f, thumbnail: init.thumbnail };
          }
          return f;
        });
      }
    } catch (e) {
      console.error(e);
    }
    return initialFiles;
  });

  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialFolders;
  });

  const [junkBytes, setJunkBytes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_JUNK_KEY);
      if (saved !== null) return Number(saved);
    } catch (e) {
      console.error(e);
    }
    return 684 * 1024 * 1024; // 684 MB junk cache
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
    } catch (e) {
      console.error(e);
    }
  }, [files]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error(e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_JUNK_KEY, String(junkBytes));
    } catch (e) {
      console.error(e);
    }
  }, [junkBytes]);

  // Preferences & Toast
  const [language, setLanguage] = useState<Language>('hi');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real device native storage state
  const [isNative, setIsNative] = useState(false);
  const [permStatus, setPermStatus] = useState<{ granted: boolean; needsManageSettings: boolean }>({
    granted: true,
    needsManageSettings: false,
  });
  const [realVolumes, setRealVolumes] = useState<{
    internal: StorageVolumeInfo | null;
    sdcard: StorageVolumeInfo | null;
  } | null>(null);
  const [isScanningStorage, setIsScanningStorage] = useState(false);

  const loadRealDeviceStorage = async (showFeedback = false) => {
    try {
      const native = await isNativePlatform();
      setIsNative(native);
      if (!native) return;

      const perm = await checkStoragePermissionStatus();
      setPermStatus(perm);

      if (perm.granted) {
        setIsScanningStorage(true);
        const result = await scanNativeStorage();
        setIsScanningStorage(false);

        if (result) {
          if (result.volumes) {
            setRealVolumes(result.volumes);
          }
          if (result.files && result.files.length > 0) {
            setFiles(prev => {
              const existingKeys = new Set(prev.map(f => f.url || f.name));
              const newFiles = result.files.filter(f => !existingKeys.has(f.url || f.name));
              return [...newFiles, ...prev];
            });
          }
          if (result.folders && result.folders.length > 0) {
            setFolders(result.folders);
          }
          if (showFeedback) {
            showToast(
              language === 'hi'
                ? `डिवाइस रिफ्रेश सफल: ${result.files.length} फाइलें मिलीं`
                : `Device refreshed: ${result.files.length} files found`
            );
          }
        }
      }
    } catch (err) {
      console.error('Error loading real device storage:', err);
      setIsScanningStorage(false);
    }
  };

  // Check and read real device storage when running natively on Android
  useEffect(() => {
    loadRealDeviceStorage();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadRealDeviceStorage();
      }
    };
    const handleFocus = () => {
      loadRealDeviceStorage();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [language]);

  const handleRequestStoragePermission = async () => {
    await requestAllFilesAccess();
    showToast(
      language === 'hi' 
        ? 'कृपया All files access स्विच को ऑन (ON) करें' 
        : 'Please enable the All files access toggle in Settings'
    );
  };

  // 2. Navigation & View State
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | null>(null);
  const [isFolderViewOpen, setIsFolderViewOpen] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState('/');
  const [activeStorageDevice, setActiveStorageDevice] = useState<StorageDevice>('internal');

  // 3. Modals State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('google_files_user_account_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const handleSignIn = (account: UserAccount) => {
    setUserAccount(account);
    try {
      localStorage.setItem('google_files_user_account_v2', JSON.stringify(account));
    } catch (e) {
      console.error(e);
    }
    showToast(
      language === 'hi'
        ? `${account.provider === 'google' ? 'Google' : 'Microsoft'} खाते से साइन इन किया गया`
        : `Signed in with ${account.provider === 'google' ? 'Google' : 'Microsoft'}`
    );
  };

  const handleSignOut = () => {
    setUserAccount(null);
    try {
      localStorage.removeItem('google_files_user_account_v2');
    } catch (e) {
      console.error(e);
    }
    showToast(
      language === 'hi'
        ? 'सफलतापूर्वक साइन आउट किया गया'
        : 'Signed out successfully'
    );
  };
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isSafeFolderOpen, setIsSafeFolderOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isStorageBreakdownOpen, setIsStorageBreakdownOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newFolderParentPath, setNewFolderParentPath] = useState<string | null>(null);

  // Dedicated Media Player States (Audio, Video, PDF Reader)
  const [currentAudio, setCurrentAudio] = useState<FileItem | null>(null);
  const [audioPlaylist, setAudioPlaylist] = useState<FileItem[]>([]);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const [videoPlayerFile, setVideoPlayerFile] = useState<FileItem | null>(null);
  const [pdfViewerFile, setPdfViewerFile] = useState<FileItem | null>(null);

  // Sync background HTML audio element with currentAudio
  useEffect(() => {
    if (!audioElementRef.current) return;
    if (currentAudio) {
      const src = currentAudio.url && currentAudio.url.startsWith('/')
        ? Capacitor.convertFileSrc(currentAudio.url)
        : currentAudio.url;
      if (src) {
        audioElementRef.current.src = src;
        if (isAudioPlaying) {
          audioElementRef.current.play().catch(e => console.warn('Audio play error:', e));
        }
      }
    } else {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
  }, [currentAudio]);

  useEffect(() => {
    if (!audioElementRef.current || !currentAudio) return;
    if (isAudioPlaying) {
      audioElementRef.current.play().catch(e => console.warn('Audio play error:', e));
    } else {
      audioElementRef.current.pause();
    }
  }, [isAudioPlaying]);

  const handleNextTrack = () => {
    if (!currentAudio || audioPlaylist.length === 0) return;
    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * audioPlaylist.length);
    } else {
      const currentIndex = audioPlaylist.findIndex(t => t.id === currentAudio.id);
      nextIndex = (currentIndex + 1) % audioPlaylist.length;
    }
    setCurrentAudio(audioPlaylist[nextIndex]);
    setIsAudioPlaying(true);
  };

  const handlePrevTrack = () => {
    if (!currentAudio || audioPlaylist.length === 0) return;
    const currentIndex = audioPlaylist.findIndex(t => t.id === currentAudio.id);
    const prevIndex = (currentIndex - 1 + audioPlaylist.length) % audioPlaylist.length;
    setCurrentAudio(audioPlaylist[prevIndex]);
    setIsAudioPlaying(true);
  };

  const [archiveExtractFile, setArchiveExtractFile] = useState<FileItem | null>(null);
  const [zipCompressFiles, setZipCompressFiles] = useState<FileItem[]>([]);

  const handleExtractArchive = (file: FileItem) => {
    setArchiveExtractFile(file);
  };

  const handleArchiveExtracted = (extractedFiles: FileItem[], deleteOriginalId?: string) => {
    setFiles(prev => {
      let updated = [...prev];
      if (deleteOriginalId) {
        updated = updated.filter(f => f.id !== deleteOriginalId);
      }
      return [...extractedFiles, ...updated];
    });
    setArchiveExtractFile(null);
    showToast(
      language === 'hi'
        ? `${extractedFiles.length} फ़ाइलें सफलतापूर्वक निकाली गईं`
        : `Successfully extracted ${extractedFiles.length} file(s)`
    );
  };

  const handleCompressFiles = (selectedFiles: FileItem[]) => {
    if (selectedFiles.length === 0) return;
    setZipCompressFiles(selectedFiles);
  };

  const handleZipCreated = (createdZip: FileItem) => {
    setFiles(prev => [createdZip, ...prev]);
    setZipCompressFiles([]);
    showToast(
      language === 'hi'
        ? `ZIP फ़ाइल तैयार: ${createdZip.name}`
        : `ZIP archive created: ${createdZip.name}`
    );
  };

  const handleOpenPreview = (file: FileItem) => {
    if (isArchiveFile(file.name, file.mimeType)) {
      setArchiveExtractFile(file);
    } else if (file.type === 'audio') {
      const audios = files.filter(f => f.type === 'audio' && !f.isTrash && !f.isSafe);
      const playlist = audios.some(a => a.id === file.id) ? audios : [file, ...audios];
      setAudioPlaylist(playlist);
      setCurrentAudio(file);
      setIsAudioPlayerOpen(true);
      setIsAudioPlaying(true);
    } else if (file.type === 'video') {
      setVideoPlayerFile(file);
    } else if (file.type === 'document') {
      setPdfViewerFile(file);
    } else {
      setPreviewFile(file);
    }
  };

  // 4. Copy/Move & Transfer Simulation State
  const [copyMoveModal, setCopyMoveModal] = useState<{
    isOpen: boolean;
    operation: 'copy' | 'move';
    files: FileItem[];
  }>({
    isOpen: false,
    operation: 'copy',
    files: [],
  });

  const [transferTask, setTransferTask] = useState<TransferTask | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  // 5. Preferences
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('google_files_view_mode_v2');
      if (saved === 'list' || saved === 'grid') return saved;
    } catch (e) {
      console.error(e);
    }
    return 'list'; // Default to clean, compact list view (no giant cards)
  });
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleToggleViewMode = () => {
    setViewMode(prev => {
      const next: ViewMode = prev === 'grid' ? 'list' : 'grid';
      try {
        localStorage.setItem('google_files_view_mode_v2', next);
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Hidden file input for real uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadFolderRef = useRef<string>('/Download');

  // Step-by-Step Back Navigation Handler
  const selectionClearerRef = useRef<(() => boolean) | null>(null);
  const lastBackPressTimeRef = useRef<number>(0);
  const lastBackHandledTimestampRef = useRef<number>(0);

  const handleStepBack = (): boolean => {
    // 1. PDF Viewer open
    if (pdfViewerFile) {
      setPdfViewerFile(null);
      return true;
    }

    // 2. Video Player modal open
    if (videoPlayerFile) {
      setVideoPlayerFile(null);
      return true;
    }

    // 3. Audio Player full modal open (minimize to background/mini-player, keep playing)
    if (isAudioPlayerOpen) {
      setIsAudioPlayerOpen(false);
      return true;
    }

    // 4. File preview/info modal open
    if (previewFile) {
      setPreviewFile(null);
      return true;
    }

    // 5. Rename dialog open
    if (renameTarget) {
      setRenameTarget(null);
      return true;
    }

    // 6. New folder dialog open
    if (newFolderParentPath !== null) {
      setNewFolderParentPath(null);
      return true;
    }

    // 7. Copy/Move destination modal open
    if (copyMoveModal.isOpen) {
      setCopyMoveModal({ isOpen: false, operation: 'copy', files: [] });
      return true;
    }

    // 8. Live transfer status modal open
    if (transferTask) {
      setTransferTask(null);
      return true;
    }

    // 9. Safe folder modal open
    if (isSafeFolderOpen) {
      setIsSafeFolderOpen(false);
      return true;
    }

    // 10. Trash modal open
    if (isTrashOpen) {
      setIsTrashOpen(false);
      return true;
    }

    // 11. Storage breakdown modal open
    if (isStorageBreakdownOpen) {
      setIsStorageBreakdownOpen(false);
      return true;
    }

    // 12. Account modal open
    if (isAccountOpen) {
      setIsAccountOpen(false);
      return true;
    }

    // 13. Side drawer open
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      return true;
    }

    // 14. Active search query filter
    if (searchQuery.trim().length > 0) {
      setSearchQuery('');
      return true;
    }

    // 15. If multiple items are selected in Category or Folder view, clear selection first
    if (selectionClearerRef.current && selectionClearerRef.current()) {
      return true;
    }

    // 16. Inside Folder view: navigate up one directory level or close folder view
    if (isFolderViewOpen) {
      const rootPath = activeStorageDevice === 'sdcard' && realVolumes?.sdcard?.path
        ? realVolumes.sdcard.path
        : (realVolumes?.internal?.path || '/storage/emulated/0');
      
      const normCurrent = currentFolderPath.replace(/\/$/, '') || '/';
      const normRoot = rootPath.replace(/\/$/, '') || '/';

      if (
        normCurrent === '/' || 
        normCurrent === normRoot || 
        normCurrent === '/storage/emulated/0'
      ) {
        setIsFolderViewOpen(false);
      } else {
        const lastSlash = normCurrent.lastIndexOf('/');
        const parent = lastSlash > 0 ? normCurrent.substring(0, lastSlash) : normRoot;
        if (parent.length < normRoot.length || normCurrent === normRoot) {
          setIsFolderViewOpen(false);
        } else {
          setCurrentFolderPath(parent);
        }
      }
      return true;
    }

    // 17. Inside a Category view (e.g. Downloads, Images, Videos, Audio, Documents, Apps, Starred)
    if (selectedCategory !== null) {
      setSelectedCategory(null);
      return true;
    }

    // 18. Not on Browse tab (e.g. Clean tab or Share tab active)
    if (activeTab !== 'browse') {
      setActiveTab('browse');
      return true;
    }

    // 19. At the Root view of the app (Browse tab root): Double-back to exit protection
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 2000) {
      try {
        CapacitorApp.exitApp();
      } catch (e) {
        console.warn('Capacitor exitApp not available:', e);
      }
    } else {
      lastBackPressTimeRef.current = now;
      showToast(
        language === 'hi'
          ? 'ऐप बंद करने के लिए एक बार और बैक दबाएं'
          : 'Press back again to exit'
      );
    }
    return false;
  };

  const backHandlerRef = useRef(handleStepBack);
  backHandlerRef.current = handleStepBack;

  // Intercept Android hardware back button, edge gestures, and browser popstate
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const triggerStepBack = () => {
      const now = Date.now();
      // Debounce to prevent double step-backs if both native and popstate fire
      if (now - lastBackHandledTimestampRef.current < 250) {
        return;
      }
      lastBackHandledTimestampRef.current = now;
      if (backHandlerRef.current) {
        backHandlerRef.current();
      }
    };

    const initNativeBackHandler = async () => {
      try {
        const handle = await CapacitorApp.addListener('backButton', () => {
          triggerStepBack();
        });
        removeListener = () => handle.remove();
      } catch (err) {
        console.warn('Capacitor backButton not available on this platform:', err);
      }
    };

    initNativeBackHandler();

    const handlePopState = () => {
      triggerStepBack();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (removeListener) removeListener();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const t = translations[language];

  // Computed storage breakdown with real device storage metrics if available
  const storage = computeStorage(
    files, 
    junkBytes, 
    realVolumes?.internal?.totalBytes, 
    realVolumes?.internal?.usedBytes
  );

  // Real File Upload Handler (via Drag and Drop or File Picker)
  const handleUploadFiles = (fileList: FileList, targetFolder = '/Download') => {
    const newItems: FileItem[] = [];
    const promises: Promise<void>[] = [];

    Array.from(fileList).forEach(file => {
      const p = new Promise<void>((resolve) => {
        const reader = new FileReader();
        const { type, mimeType } = classifyFile(file.name, file.type);

        reader.onload = () => {
          const result = reader.result as string;
          newItems.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: file.size,
            type,
            mimeType,
            folder: targetFolder,
            storageDevice: isFolderViewOpen ? activeStorageDevice : 'internal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            url: result,
            thumbnail: type === 'image' || type === 'video' ? result : undefined,
            content: type === 'document' && file.type.includes('text') ? result : undefined,
            isLarge: file.size > 10 * 1024 * 1024,
          });
          resolve();
        };

        if (type === 'document' && file.type.includes('text')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
      promises.push(p);
    });

    Promise.all(promises).then(() => {
      setFiles(prev => [...newItems, ...prev]);
      showToast(`${newItems.length} ${t.fileUploaded}`);
    });
  };

  const triggerUpload = (folder = '/Download') => {
    targetUploadFolderRef.current = folder;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(
        e.dataTransfer.files, 
        isFolderViewOpen ? currentFolderPath : '/Download'
      );
    }
  };

  // Clean Tab Actions
  const handleCleanJunk = () => {
    setJunkBytes(0);
    showToast(t.junkCleaned);
  };

  const handleDeleteDuplicates = (keepId: string, deleteIds: string[]) => {
    setFiles(prev =>
      prev.map(f =>
        deleteIds.includes(f.id)
          ? { ...f, isTrash: true, trashDate: new Date().toISOString() }
          : f
      )
    );
    showToast(t.duplicatesDeleted);
  };

  // File Operations
  const handleToggleStar = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, isStarred: !f.isStarred } : f))
    );
  };

  const handleMoveToTrash = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, isTrash: true, trashDate: new Date().toISOString() } : f))
    );
    showToast(t.fileDeleted);
  };

  const handleMoveToSafe = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, isSafe: true } : f))
    );
    showToast(t.movedToSafe);
  };

  const handleRemoveFromSafe = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, isSafe: false } : f))
    );
    showToast("Removed from Safe Folder");
  };

  const handleRestoreFromTrash = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, isTrash: false, trashDate: undefined } : f))
    );
    showToast("Restored from Trash");
  };

  const handleDeletePermanently = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    showToast("Permanently deleted");
  };

  const handleEmptyTrash = () => {
    setFiles(prev => prev.filter(f => !f.isTrash));
    showToast("Trash emptied");
  };

  const handleBatchTrash = (ids: string[]) => {
    setFiles(prev =>
      prev.map(f => (ids.includes(f.id) ? { ...f, isTrash: true, trashDate: new Date().toISOString() } : f))
    );
    showToast(`${ids.length} files moved to Trash`);
  };

  const handleBatchStar = (ids: string[]) => {
    setFiles(prev =>
      prev.map(f => (ids.includes(f.id) ? { ...f, isStarred: true } : f))
    );
    showToast(`${ids.length} files added to Starred`);
  };

  const handleRenameFile = (newName: string) => {
    if (!renameTarget) return;
    setFiles(prev =>
      prev.map(f => (f.id === renameTarget.id ? { ...f, name: newName, updatedAt: new Date().toISOString() } : f))
    );
    showToast("File renamed");
  };

  const handleCreateFolder = (
    folderName: string, 
    parentPath: string, 
    device: StorageDevice = 'internal'
  ) => {
    const fullPath = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`;
    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      name: folderName,
      path: fullPath,
      parentPath: parentPath,
      storageDevice: device,
      createdAt: new Date().toISOString(),
    };
    setFolders(prev => [...prev, newFolder]);
    showToast(`${t.folderCreated}: ${folderName}`);
  };

  // -------------------------------------------------------------
  // Copy / Move & Real-time Transfer Implementation
  // -------------------------------------------------------------
  const handleInitiateCopy = (fileOrFiles: FileItem | FileItem[]) => {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (list.length === 0) return;
    setCopyMoveModal({
      isOpen: true,
      operation: 'copy',
      files: list,
    });
  };

  const handleInitiateMove = (fileOrFiles: FileItem | FileItem[]) => {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (list.length === 0) return;
    setCopyMoveModal({
      isOpen: true,
      operation: 'move',
      files: list,
    });
  };

  const handleQuickCopy = (fileOrFiles: FileItem | FileItem[]) => {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (list.length === 0) return;
    setClipboard({
      operation: 'copy',
      files: list,
    });
    triggerHapticFeedback();
    showToast(
      language === 'hi'
        ? `${list.length} फ़ाइल क्लिपबोर्ड में कॉपी की गई`
        : `${list.length} file(s) copied to clipboard`
    );
  };

  const handleQuickCut = (fileOrFiles: FileItem | FileItem[]) => {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (list.length === 0) return;
    setClipboard({
      operation: 'move',
      files: list,
    });
    triggerHapticFeedback();
    showToast(
      language === 'hi'
        ? `${list.length} फ़ाइल कट की गई (Move)`
        : `${list.length} file(s) cut to clipboard`
    );
  };

  const handleClearClipboard = () => {
    setClipboard(null);
  };

  const handleConfirmTransfer = (
    targetDevice: StorageDevice,
    targetFolder: string,
    initialSpeedMbps: number,
    customTransfer?: { operation: 'copy' | 'move'; files: FileItem[] }
  ) => {
    const filesToTransfer = customTransfer ? customTransfer.files : copyMoveModal.files;
    const op = customTransfer ? customTransfer.operation : copyMoveModal.operation;
    if (filesToTransfer.length === 0) return;

    const totalBytes = filesToTransfer.reduce((sum, f) => sum + f.size, 0);
    const speed = initialSpeedMbps > 0 ? initialSpeedMbps : 45;
    const estSec = Math.max(1, Math.ceil(totalBytes / (speed * 1024 * 1024)));

    const newTask: TransferTask = {
      id: `task-${Date.now()}`,
      operation: op,
      files: filesToTransfer,
      totalBytes,
      transferredBytes: 0,
      speedMbps: speed,
      speedSetting: speed,
      timeRemainingSec: estSec,
      currentFileIndex: 0,
      sourceDevice: filesToTransfer[0]?.storageDevice || 'internal',
      targetDevice,
      targetFolder,
      status: 'transferring',
    };

    setTransferTask(newTask);
    setCopyMoveModal({ isOpen: false, operation: 'copy', files: [] });
  };

  const handlePasteClipboard = (targetFolder?: string, targetDevice?: StorageDevice) => {
    if (!clipboard || clipboard.files.length === 0) return;

    let destFolder = targetFolder;
    let destDevice = targetDevice || activeStorageDevice;

    if (!destFolder) {
      if (isFolderViewOpen && currentFolderPath) {
        destFolder = currentFolderPath;
        destDevice = activeStorageDevice;
      } else {
        const rootPath = (activeStorageDevice === 'sdcard' && realVolumes?.sdcard?.path)
          ? realVolumes.sdcard.path
          : (realVolumes?.internal?.path || '/storage/emulated/0');
        destFolder = rootPath;
        destDevice = activeStorageDevice;
      }
    }

    handleConfirmTransfer(destDevice, destFolder, 65, clipboard);

    if (clipboard.operation === 'move') {
      setClipboard(null);
    }
  };

  // Real-time transfer simulation loop
  useEffect(() => {
    if (!transferTask || transferTask.status !== 'transferring') return;

    const interval = setInterval(() => {
      setTransferTask(prev => {
        if (!prev || prev.status !== 'transferring') return prev;

        const dt = 0.25; // 250ms interval
        // Real-world speed jitter +/- 8% around the chosen speedSetting
        const jitter = 0.92 + Math.random() * 0.16;
        const currentSpeedMbps = Math.max(1, Math.round(prev.speedSetting * jitter * 10) / 10);
        const bytesInStep = Math.round(currentSpeedMbps * 1024 * 1024 * dt);
        const nextTransferred = Math.min(prev.totalBytes, prev.transferredBytes + bytesInStep);

        // Calculate current active file index
        let accumulated = 0;
        let fileIdx = 0;
        for (let i = 0; i < prev.files.length; i++) {
          accumulated += prev.files[i].size;
          if (nextTransferred <= accumulated) {
            fileIdx = i;
            break;
          }
        }

        const remainingBytes = Math.max(0, prev.totalBytes - nextTransferred);
        const nextTimeRemaining = remainingBytes > 0
          ? Math.max(1, Math.ceil(remainingBytes / (currentSpeedMbps * 1024 * 1024)))
          : 0;

        if (nextTransferred >= prev.totalBytes) {
          // Transfer is finished!
          if (prev.operation === 'move') {
            const movedIds = prev.files.map(f => f.id);
            setFiles(currentFiles =>
              currentFiles.map(f => {
                if (movedIds.includes(f.id)) {
                  return {
                    ...f,
                    storageDevice: prev.targetDevice,
                    folder: prev.targetFolder,
                    updatedAt: new Date().toISOString(),
                  };
                }
                return f;
              })
            );
          } else {
            // Copy operation
            const newCopies: FileItem[] = prev.files.map(f => {
              const extMatch = f.name.match(/(\.[^.]+)$/);
              const ext = extMatch ? extMatch[0] : '';
              const base = extMatch ? f.name.slice(0, -ext.length) : f.name;
              const isSameLoc = f.storageDevice === prev.targetDevice && f.folder === prev.targetFolder;
              const newName = isSameLoc ? `${base}_copy${ext}` : f.name;

              return {
                ...f,
                id: `file-copy-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                name: newName,
                storageDevice: prev.targetDevice,
                folder: prev.targetFolder,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            });
            setFiles(currentFiles => [...newCopies, ...currentFiles]);
          }

          const targetLabel = prev.targetDevice === 'sdcard' ? 'SD Card' : 'Internal Storage';
          showToast(
            language === 'hi'
              ? `${prev.files.length} फ़ाइलें ${prev.operation === 'move' ? 'स्थानांतरित (Move)' : 'कॉपी'} की गईं: ${targetLabel}`
              : `${prev.files.length} ${prev.operation === 'move' ? 'moved' : 'copied'} to ${targetLabel}`
          );

          // Execute real native file operations if running on Android device
          (async () => {
            try {
              const isNat = await isNativePlatform();
              if (isNat) {
                for (const f of prev.files) {
                  const srcPath = f.url || (f as any).path;
                  if (srcPath && srcPath.startsWith('/')) {
                    if (prev.operation === 'move') {
                      await moveNativeFile(srcPath, prev.targetFolder);
                    } else {
                      await copyNativeFile(srcPath, prev.targetFolder);
                    }
                  }
                }
                await loadRealDeviceStorage();
              }
            } catch (err) {
              console.error('Native file transfer error:', err);
            }
          })();

          return {
            ...prev,
            transferredBytes: prev.totalBytes,
            currentFileIndex: prev.files.length - 1,
            timeRemainingSec: 0,
            status: 'completed',
          };
        }

        return {
          ...prev,
          transferredBytes: nextTransferred,
          speedMbps: currentSpeedMbps,
          timeRemainingSec: nextTimeRemaining,
          currentFileIndex: fileIdx,
        };
      });
    }, 250);

    return () => clearInterval(interval);
  }, [transferTask?.status, transferTask?.speedSetting, transferTask?.totalBytes]);

  const handlePauseTransfer = () => {
    setTransferTask(prev => (prev ? { ...prev, status: 'paused' } : null));
  };

  const handleResumeTransfer = () => {
    setTransferTask(prev => (prev ? { ...prev, status: 'transferring' } : null));
  };

  const handleCancelTransfer = () => {
    setTransferTask(prev => (prev ? { ...prev, status: 'cancelled' } : null));
    showToast("Transfer cancelled");
  };

  const handleSpeedChange = (newSpeedMbps: number) => {
    setTransferTask(prev => {
      if (!prev) return null;
      const remainingBytes = Math.max(0, prev.totalBytes - prev.transferredBytes);
      const estSec = Math.max(1, Math.ceil(remainingBytes / (newSpeedMbps * 1024 * 1024)));
      return {
        ...prev,
        speedSetting: newSpeedMbps,
        speedMbps: newSpeedMbps,
        timeRemainingSec: estSec,
      };
    });
  };

  // Search Results filtering
  const activeSearchResults = searchQuery.trim()
    ? sortFiles(
        files.filter(
          f =>
            !f.isTrash &&
            !f.isSafe &&
            (f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.folder.toLowerCase().includes(searchQuery.toLowerCase()))
        ),
        sortOption
      )
    : null;

  return (
    <div 
      className="min-h-screen bg-[#f8fafd] text-neutral-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for uploading */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files, targetUploadFolderRef.current);
          }
        }}
      />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 rounded-3xl m-4 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center gap-3">
            <UploadCloud size={48} className="text-blue-600 animate-bounce" />
            <p className="text-base font-semibold text-neutral-900">
              Drop files here to upload into Google Files
            </p>
            <p className="text-xs text-neutral-500">
              Files will be saved directly into {isFolderViewOpen ? currentFolderPath : '/Download'}
            </p>
          </div>
        </div>
      )}

      {/* Top Application Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        sortOption={sortOption}
        onSelectSortOption={setSortOption}
        language={language}
        onToggleLanguage={() => setLanguage(l => (l === 'en' ? 'hi' : 'en'))}
        onUploadClick={() => triggerUpload(isFolderViewOpen ? currentFolderPath : '/Download')}
        onNewFolderClick={() => setNewFolderParentPath(isFolderViewOpen ? currentFolderPath : '/')}
        onOpenStorageBreakdown={() => setIsStorageBreakdownOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        userAccount={userAccount}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
        {/* Global Search Results View */}
        {activeSearchResults !== null ? (
          <div className="space-y-4 pb-24">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-800">
                Search results for &ldquo;{searchQuery}&rdquo; ({activeSearchResults.length})
              </h2>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
              >
                Clear search
              </button>
            </div>

            {activeSearchResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
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
                {activeSearchResults.map(file => (
                  <FileItemCard
                    key={file.id}
                    file={file}
                    viewMode={viewMode}
                    isSelected={false}
                    onToggleSelect={() => {}}
                    onOpenPreview={handleOpenPreview}
                    onToggleStar={handleToggleStar}
                    onMoveToTrash={handleMoveToTrash}
                    onMoveToSafe={handleMoveToSafe}
                    onRename={setRenameTarget}
                    onShowInfo={setPreviewFile}
                    onCopyTo={handleInitiateCopy}
                    onMoveTo={handleInitiateMove}
                    onQuickCopy={handleQuickCopy}
                    onQuickCut={handleQuickCut}
                    language={language}
                    isSelectionMode={false}
                  />
                ))}
              </div>
            )}
          </div>
        ) : isFolderViewOpen ? (
          /* Internal Storage or SD Card Folder Browser View */
          <FolderView
            currentPath={currentFolderPath}
            folders={folders}
            files={files}
            viewMode={viewMode}
            onToggleViewMode={handleToggleViewMode}
            sortOption={sortOption}
            language={language}
            currentDevice={activeStorageDevice}
            onNavigatePath={setCurrentFolderPath}
            onBack={() => {
              const rootPath = activeStorageDevice === 'sdcard' && realVolumes?.sdcard?.path
                ? realVolumes.sdcard.path
                : (realVolumes?.internal?.path || '/');
              if (
                currentFolderPath === '/' || 
                currentFolderPath === rootPath || 
                currentFolderPath === '/storage/emulated/0'
              ) {
                setIsFolderViewOpen(false);
              } else {
                const parent = currentFolderPath.substring(0, currentFolderPath.lastIndexOf('/')) || rootPath;
                if (parent.length < rootPath.length) {
                  setIsFolderViewOpen(false);
                } else {
                  setCurrentFolderPath(parent);
                }
              }
            }}
            onCreateFolder={(p) => setNewFolderParentPath(p)}
            onUploadToFolder={(p) => triggerUpload(p)}
            onOpenPreview={handleOpenPreview}
            onToggleStar={handleToggleStar}
            onMoveToTrash={handleMoveToTrash}
            onMoveToSafe={handleMoveToSafe}
            onRenameFile={setRenameTarget}
            onShowInfo={setPreviewFile}
            onCopyTo={handleInitiateCopy}
            onMoveTo={handleInitiateMove}
            onBatchCopy={handleInitiateCopy}
            onBatchMove={handleInitiateMove}
            onBatchTrash={handleBatchTrash}
            clipboard={clipboard}
            onCopyToClipboard={handleQuickCopy}
            onCutToClipboard={handleQuickCut}
            onPasteClipboard={handlePasteClipboard}
            onClearClipboard={handleClearClipboard}
            onQuickCopy={handleQuickCopy}
            onQuickCut={handleQuickCut}
            onExtractArchive={handleExtractArchive}
            onCompressZip={handleCompressFiles}
            onRegisterSelectionClearer={(clearer) => { selectionClearerRef.current = clearer; }}
          />
        ) : selectedCategory ? (
          /* Specific Category Drilled-in View (Downloads, Images, Videos, Audio, Documents, Apps, Starred) */
          <CategoryDetailView
            category={selectedCategory}
            files={files}
            viewMode={viewMode}
            sortOption={sortOption}
            language={language}
            onBack={() => setSelectedCategory(null)}
            onOpenPreview={handleOpenPreview}
            onToggleStar={handleToggleStar}
            onMoveToTrash={handleMoveToTrash}
            onMoveToSafe={handleMoveToSafe}
            onRename={setRenameTarget}
            onShowInfo={setPreviewFile}
            onBatchTrash={handleBatchTrash}
            onBatchStar={handleBatchStar}
            onCopyTo={handleInitiateCopy}
            onMoveTo={handleInitiateMove}
            onBatchCopy={handleInitiateCopy}
            onBatchMove={handleInitiateMove}
            onCopyToClipboard={handleQuickCopy}
            onCutToClipboard={handleQuickCut}
            onQuickCopy={handleQuickCopy}
            onQuickCut={handleQuickCut}
            onExtractArchive={handleExtractArchive}
            onCompressZip={handleCompressFiles}
            onRegisterSelectionClearer={(clearer) => { selectionClearerRef.current = clearer; }}
          />
        ) : (
          /* Primary Tabs: Clean, Browse, Share */
          <>
            {activeTab === 'clean' && (
              <CleanTab
                storage={storage}
                files={files}
                junkBytes={junkBytes}
                onCleanJunk={handleCleanJunk}
                onDeleteDuplicates={handleDeleteDuplicates}
                onDeleteFile={handleMoveToTrash}
                onOpenStorageBreakdown={() => setIsStorageBreakdownOpen(true)}
                language={language}
              />
            )}

            {activeTab === 'browse' && (
              <BrowseTab
                files={files}
                storage={storage}
                viewMode={viewMode}
                sortOption={sortOption}
                language={language}
                realVolumes={realVolumes}
                permStatus={permStatus}
                isScanningStorage={isScanningStorage}
                onRequestPermissions={handleRequestStoragePermission}
                onRefreshStorage={() => loadRealDeviceStorage(true)}
                onSelectCategory={setSelectedCategory}
                onOpenFolderView={(device = 'internal') => {
                  setActiveStorageDevice(device);
                  const rootPath = device === 'sdcard' && realVolumes?.sdcard?.path
                    ? realVolumes.sdcard.path
                    : (device === 'internal' && realVolumes?.internal?.path ? realVolumes.internal.path : '/');
                  setCurrentFolderPath(rootPath);
                  setIsFolderViewOpen(true);
                }}
                onOpenSafeFolder={() => setIsSafeFolderOpen(true)}
                onOpenTrash={() => setIsTrashOpen(true)}
                onOpenPreview={handleOpenPreview}
                onToggleStar={handleToggleStar}
                onMoveToTrash={handleMoveToTrash}
                onMoveToSafe={handleMoveToSafe}
                onRename={setRenameTarget}
                onShowInfo={setPreviewFile}
                onCopyTo={handleInitiateCopy}
                onMoveTo={handleInitiateMove}
              />
            )}

            {activeTab === 'share' && (
              <ShareTab 
                files={files} 
                language={language} 
                onAddReceivedFiles={(newItems) => {
                  setFiles(prev => [...newItems, ...prev]);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Clipboard Bar (when files are copied/cut) */}
      {clipboard && clipboard.files.length > 0 && (
        <div 
          id="floating-clipboard-bar"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-neutral-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-neutral-700/60 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ClipboardPaste size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                {clipboard.files.length} {language === 'hi' ? 'फ़ाइल' : 'file(s)'} {clipboard.operation === 'copy' ? (language === 'hi' ? 'कॉपी की गई' : 'copied') : (language === 'hi' ? 'कट की गई' : 'cut')}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {isFolderViewOpen
                  ? (language === 'hi' ? 'इस फ़ोल्डर में पेस्ट करने के लिए टैप करें' : 'Tap to paste in this folder')
                  : (language === 'hi' ? 'फ़ोल्डर खोलें या यहाँ पेस्ट करें' : 'Browse to folder or tap to paste')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleClearClipboard}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              title={language === 'hi' ? 'रद्द करें' : 'Cancel'}
            >
              <X size={16} />
            </button>
            <button
              id="btn-floating-paste"
              onClick={() => handlePasteClipboard()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <ClipboardPaste size={14} />
              <span>{language === 'hi' ? 'पेस्ट करें' : 'Paste'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Material 3 Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedCategory(null);
          setIsFolderViewOpen(false);
          setSearchQuery('');
          setActiveTab(tab);
        }}
        language={language}
        junkBadgeCount={junkBytes > 0 ? 1 : 0}
      />

      {/* Interactive Modals */}
      <FileViewerModal
        file={previewFile}
        language={language}
        onClose={() => setPreviewFile(null)}
        onToggleStar={handleToggleStar}
        onMoveToTrash={handleMoveToTrash}
        onExtractArchive={(file) => {
          setPreviewFile(null);
          handleExtractArchive(file);
        }}
      />

      <SafeFolderModal
        files={files}
        isOpen={isSafeFolderOpen}
        language={language}
        onClose={() => setIsSafeFolderOpen(false)}
        onRemoveFromSafe={handleRemoveFromSafe}
        onOpenPreview={handleOpenPreview}
        onMoveToTrash={handleMoveToTrash}
      />

      <TrashModal
        files={files}
        isOpen={isTrashOpen}
        language={language}
        onClose={() => setIsTrashOpen(false)}
        onRestore={handleRestoreFromTrash}
        onDeletePermanently={handleDeletePermanently}
        onEmptyTrash={handleEmptyTrash}
      />

      <StorageBreakdownModal
        storage={storage}
        isOpen={isStorageBreakdownOpen}
        language={language}
        onClose={() => setIsStorageBreakdownOpen(false)}
        onGoToClean={() => {
          setSelectedCategory(null);
          setIsFolderViewOpen(false);
          setActiveTab('clean');
        }}
      />

      <RenameModal
        isOpen={renameTarget !== null}
        initialName={renameTarget?.name || ''}
        onClose={() => setRenameTarget(null)}
        onRename={handleRenameFile}
      />

      <NewFolderModal
        isOpen={newFolderParentPath !== null}
        parentPath={newFolderParentPath || '/'}
        device={activeStorageDevice}
        onClose={() => setNewFolderParentPath(null)}
        onCreate={(name, path, dev) => handleCreateFolder(name, path, dev || activeStorageDevice)}
      />

      {/* Transfer Destination & Speed Selection Modal */}
      <CopyMoveDestinationModal
        isOpen={copyMoveModal.isOpen}
        operation={copyMoveModal.operation}
        files={copyMoveModal.files}
        folders={folders}
        language={language}
        onClose={() => setCopyMoveModal({ isOpen: false, operation: 'copy', files: [] })}
        onConfirm={handleConfirmTransfer}
      />

      {/* Live Transfer Status Modal with MBPS Speed Meter & Speed Adjustment */}
      <TransferModal
        task={transferTask}
        language={language}
        onPause={handlePauseTransfer}
        onResume={handleResumeTransfer}
        onCancel={handleCancelTransfer}
        onSpeedChange={handleSpeedChange}
        onClose={() => setTransferTask(null)}
      />

      {/* Google Files Hamburger Slide-out Drawer */}
      <GoogleDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedCategory(null);
          setIsFolderViewOpen(false);
          setSearchQuery('');
          setActiveTab(tab);
        }}
        storage={storage}
        language={language}
        onToggleLanguage={() => setLanguage(l => (l === 'en' ? 'hi' : 'en'))}
        onOpenSafeFolder={() => setIsSafeFolderOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        onOpenStorageBreakdown={() => setIsStorageBreakdownOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        userAccount={userAccount}
      />

      {/* Google & Microsoft Account Profile / Sign-in Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        storage={storage}
        userAccount={userAccount}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenStorageBreakdown={() => {
          setIsAccountOpen(false);
          setIsStorageBreakdownOpen(true);
        }}
        language={language}
      />

      {/* Hidden Global Audio Element for Background Music Playback */}
      <audio
        ref={audioElementRef}
        onTimeUpdate={() => {
          if (audioElementRef.current) {
            setAudioCurrentTime(audioElementRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioElementRef.current) {
            setAudioDuration(audioElementRef.current.duration);
          }
        }}
        onEnded={() => {
          if (repeatMode === 'one') {
            if (audioElementRef.current) {
              audioElementRef.current.currentTime = 0;
              audioElementRef.current.play().catch(() => {});
            }
          } else {
            handleNextTrack();
          }
        }}
      />

      {/* Floating Mini Music Player (Persistent while browsing other files/folders) */}
      {currentAudio && !isAudioPlayerOpen && (
        <MiniMusicPlayer
          file={currentAudio}
          isPlaying={isAudioPlaying}
          currentTime={audioCurrentTime}
          duration={audioDuration}
          onExpand={() => setIsAudioPlayerOpen(true)}
          onPlayPause={() => setIsAudioPlaying(!isAudioPlaying)}
          onNext={handleNextTrack}
          onClose={() => {
            setIsAudioPlaying(false);
            setCurrentAudio(null);
          }}
        />
      )}

      {/* Full Dedicated Music Player Modal with Visualizer & Playlist */}
      <AudioPlayerModal
        isOpen={isAudioPlayerOpen}
        file={currentAudio}
        playlist={audioPlaylist}
        isPlaying={isAudioPlaying}
        currentTime={audioCurrentTime}
        duration={audioDuration}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        language={language}
        onClose={() => setIsAudioPlayerOpen(false)}
        onMinimize={() => setIsAudioPlayerOpen(false)}
        onPlayPause={() => setIsAudioPlaying(!isAudioPlaying)}
        onSeek={(secs) => {
          if (audioElementRef.current) {
            audioElementRef.current.currentTime = secs;
            setAudioCurrentTime(secs);
          }
        }}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={() => {
          setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
        }}
        onSelectTrack={(track) => {
          setCurrentAudio(track);
          setIsAudioPlaying(true);
        }}
        onToggleStar={handleToggleStar}
      />

      {/* Full Dedicated Mobile Video Player Modal */}
      <VideoPlayerModal
        isOpen={videoPlayerFile !== null}
        file={videoPlayerFile}
        language={language}
        onClose={() => setVideoPlayerFile(null)}
        onToggleStar={handleToggleStar}
      />

      {/* Full Dedicated PDF & Document Reader Modal */}
      <PdfDocumentViewerModal
        isOpen={pdfViewerFile !== null}
        file={pdfViewerFile}
        language={language}
        onClose={() => setPdfViewerFile(null)}
        onToggleStar={handleToggleStar}
      />

      {/* Archive Extractor Modal (ZIP, RAR, 7Z, TAR, GZ) */}
      <ArchiveExtractorModal
        isOpen={archiveExtractFile !== null}
        file={archiveExtractFile}
        folders={folders}
        currentFolder={currentFolderPath}
        language={language}
        onClose={() => setArchiveExtractFile(null)}
        onExtracted={handleArchiveExtracted}
      />

      {/* Archive Compressor Modal (Create ZIP) */}
      <ZipCompressModal
        isOpen={zipCompressFiles.length > 0}
        filesToCompress={zipCompressFiles}
        folders={folders}
        currentFolder={currentFolderPath}
        language={language}
        onClose={() => setZipCompressFiles([])}
        onZipCreated={handleZipCreated}
      />
    </div>
  );
}
