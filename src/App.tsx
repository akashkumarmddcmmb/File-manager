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
  TransferTask
} from './types';
import { computeStorage, sortFiles } from './utils/storage';
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
import { FileItemCard } from './components/FileItemCard';
import { translations } from './utils/translations';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { 
  scanNativeStorage, 
  isNativePlatform, 
  checkStoragePermissionStatus, 
  requestAllFilesAccess, 
  StorageVolumeInfo,
  openRealFile
} from './utils/nativeStorage';

const STORAGE_FILES_KEY = 'google_files_app_files_v1';
const STORAGE_FOLDERS_KEY = 'google_files_app_folders_v1';
const STORAGE_JUNK_KEY = 'google_files_app_junk_v1';

export default function App() {
  // 1. Files & Folders state with LocalStorage persistence
  const [files, setFiles] = useState<FileItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FILES_KEY);
      if (saved) return JSON.parse(saved);
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

  const handleOpenPreview = (file: FileItem) => {
    if (file.type === 'audio') {
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

  // 5. Preferences
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [isDragOver, setIsDragOver] = useState(false);

  // Hidden file input for real uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadFolderRef = useRef<string>('/Download');

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

        let type: FileItem['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (
          file.type.includes('pdf') ||
          file.type.includes('document') ||
          file.type.includes('sheet') ||
          file.type.includes('text')
        ) {
          type = 'document';
        } else if (file.name.endsWith('.apk')) {
          type = 'apk';
        }

        reader.onload = () => {
          const result = reader.result as string;
          newItems.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: file.size,
            type,
            mimeType: file.type || 'application/octet-stream',
            folder: targetFolder,
            storageDevice: isFolderViewOpen ? activeStorageDevice : 'internal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            url: type === 'image' || type === 'video' || type === 'audio' ? result : undefined,
            thumbnail: type === 'image' ? result : undefined,
            content: type === 'document' && file.type.includes('text') ? result : undefined,
            isLarge: file.size > 10 * 1024 * 1024,
          });
          resolve();
        };

        if (type === 'image' || type === 'video' || type === 'audio') {
          reader.readAsDataURL(file);
        } else if (file.type.includes('text')) {
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

  const handleConfirmTransfer = (
    targetDevice: StorageDevice,
    targetFolder: string,
    initialSpeedMbps: number
  ) => {
    const filesToTransfer = copyMoveModal.files;
    if (filesToTransfer.length === 0) return;

    const totalBytes = filesToTransfer.reduce((sum, f) => sum + f.size, 0);
    const speed = initialSpeedMbps > 0 ? initialSpeedMbps : 45;
    const estSec = Math.max(1, Math.ceil(totalBytes / (speed * 1024 * 1024)));

    const newTask: TransferTask = {
      id: `task-${Date.now()}`,
      operation: copyMoveModal.operation,
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
            `${prev.files.length} ${prev.operation === 'move' ? 'moved' : 'copied'} to ${targetLabel}`
          );

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
        onToggleViewMode={() => setViewMode(v => (v === 'grid' ? 'list' : 'grid'))}
        sortOption={sortOption}
        onSelectSortOption={setSortOption}
        language={language}
        onToggleLanguage={() => setLanguage(l => (l === 'en' ? 'hi' : 'en'))}
        onUploadClick={() => triggerUpload(isFolderViewOpen ? currentFolderPath : '/Download')}
        onNewFolderClick={() => setNewFolderParentPath(isFolderViewOpen ? currentFolderPath : '/')}
        onOpenStorageBreakdown={() => setIsStorageBreakdownOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
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
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
                    : 'space-y-2'
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
              <ShareTab files={files} language={language} />
            )}
          </>
        )}
      </main>

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
        userEmail="akashkumarmddcmmb@gmail.com"
        userName="Akash Kumar"
      />

      {/* Google Account Profile Popover Sheet */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        storage={storage}
        userEmail="akashkumarmddcmmb@gmail.com"
        userName="Akash Kumar"
        onOpenStorageBreakdown={() => {
          setIsAccountOpen(false);
          setIsStorageBreakdownOpen(true);
        }}
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
    </div>
  );
}
