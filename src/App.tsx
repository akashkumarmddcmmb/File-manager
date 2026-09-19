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
import { SettingsModal } from './components/SettingsModal';
import { ArchiveExtractorModal } from './components/ArchiveExtractorModal';
import { ZipCompressModal } from './components/ZipCompressModal';
import { LegalModal } from './components/LegalModal';
import { FeedbackModal } from './components/FeedbackModal';
import { NotificationShade } from './components/NotificationShade';
import { FloatingNotificationBar } from './components/FloatingNotificationBar';
import { FileItemCard } from './components/FileItemCard';
import { translations } from './utils/translations';
import { isArchiveFile } from './utils/archiveUtils';
import { formatBytes } from './utils/storage';
import { isDemoFile, filterOutDemoFiles, hasDemoFiles, STORAGE_HIDE_DEMO_KEY } from './utils/demoData';
import { resolveMediaSrc } from './utils/mediaUtils';
import { AppNotification } from './types';
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
  createNativeFolder,
  copyNativeFile,
  moveNativeFile,
  triggerHapticFeedback
} from './utils/nativeStorage';
import { saveFileBlob } from './utils/idbStorage';
import { 
  initNotificationChannels, 
  requestNativeNotificationPermission, 
  postNativeSystemNotification,
  cancelNativeNotification
} from './utils/nativeNotifications';

const STORAGE_FILES_KEY = 'google_files_app_files_v1';
const STORAGE_FOLDERS_KEY = 'google_files_app_folders_v1';
const STORAGE_JUNK_KEY = 'google_files_app_junk_v1';

export default function App() {
  // 1. Files & Folders state with LocalStorage persistence & clean native mode support
  const [files, setFiles] = useState<FileItem[]>(() => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const hideDemo = localStorage.getItem(STORAGE_HIDE_DEMO_KEY) === 'true';

      const saved = localStorage.getItem(STORAGE_FILES_KEY);
      if (saved) {
        const parsed: FileItem[] = JSON.parse(saved);
        if (isNative || hideDemo) {
          return filterOutDemoFiles(parsed);
        }
        const initialMap = new Map(initialFiles.map(f => [f.id, f]));
        return parsed.map(f => {
          const init = initialMap.get(f.id);
          if (init && init.thumbnail && !f.thumbnail) {
            return { ...f, thumbnail: init.thumbnail };
          }
          return f;
        });
      }

      // If running on native Android installation or user requested clean mode, start empty with no demo files!
      if (isNative || hideDemo) {
        return [];
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

  // Battery Optimization: Debounce heavy JSON serialization to LocalStorage to save CPU and battery
  const filesSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (filesSaveTimerRef.current) clearTimeout(filesSaveTimerRef.current);
    filesSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
      } catch (e) {
        console.error(e);
      }
    }, 1000);
    return () => {
      if (filesSaveTimerRef.current) clearTimeout(filesSaveTimerRef.current);
    };
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

  const lastStorageScanTimestampRef = useRef<number>(0);

  const loadRealDeviceStorage = async (showFeedback = false) => {
    try {
      const native = await isNativePlatform();
      setIsNative(native);
      if (!native) return;

      const now = Date.now();
      // Battery Optimization: Throttle auto-scanning on focus/visibility change (min 60s gap unless manually requested)
      if (!showFeedback && lastStorageScanTimestampRef.current > 0 && (now - lastStorageScanTimestampRef.current < 60000)) {
        return;
      }
      lastStorageScanTimestampRef.current = now;

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
              // When real device files are scanned, filter out demo/mock files so only real device files are shown
              const userCustomFiles = prev.filter(f => !f.id.startsWith('img-') && !f.id.startsWith('vid-') && !f.id.startsWith('aud-') && !f.id.startsWith('doc-') && !f.id.startsWith('app-') && !f.id.startsWith('arch-'));
              const existingKeys = new Set(userCustomFiles.map(f => f.url || f.name));
              const newRealFiles = result.files.filter(f => !existingKeys.has(f.url || f.name));
              return [...newRealFiles, ...userCustomFiles];
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
    initNotificationChannels();
    requestNativeNotificationPermission().catch(e => console.warn(e));

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

  // Automatic Theme State ('system' | 'light' | 'dark')
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('akash_files_theme') as 'system' | 'light' | 'dark') || 'system';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('akash_files_theme') || 'system';
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  });

  // Listen to system theme changes & themePreference updates automatically
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (eMatches: boolean) => {
      let dark = false;
      if (themePreference === 'dark') {
        dark = true;
      } else if (themePreference === 'light') {
        dark = false;
      } else {
        dark = eMatches;
      }
      setIsDarkMode(dark);
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      if (themePreference === 'system') {
        applyTheme(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themePreference]);

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationShadeOpen, setIsNotificationShadeOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newFolderParentPath, setNewFolderParentPath] = useState<string | null>(null);

  // Notifications Manager Helpers
  const addOrUpdateNotification = (notif: AppNotification) => {
    setNotifications(prev => {
      const idx = prev.findIndex(n => n.id === notif.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = notif;
        return copy;
      }
      return [notif, ...prev];
    });

    // Also dispatch to Android Native Status Bar / Notification shade using deterministic ID (replaces existing notification)
    postNativeSystemNotification({
      id: notif.id,
      title: notif.title,
      body: notif.description,
      channelId: notif.type === 'media-playback' ? 'files_media' : notif.type === 'file-operation' || notif.type === 'transfer' ? 'files_transfers' : 'files_general',
      extra: { notifId: notif.id, type: notif.type }
    }).catch(e => console.warn(e));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    cancelNativeNotification(id).catch(e => console.warn(e));
  };

  const clearAllNotifications = () => {
    // Keep in-progress, clear completed
    setNotifications(prev => prev.filter(n => n.status === 'in-progress'));
    showToast(language === 'hi' ? 'सूचनाएं साफ़ की गईं' : 'Notifications cleared');
  };

  // Demo Files Management
  const isDemoFilesActive = hasDemoFiles(files);

  const handleClearDemoFiles = () => {
    setFiles(prev => filterOutDemoFiles(prev));
    try {
      localStorage.setItem(STORAGE_HIDE_DEMO_KEY, 'true');
    } catch (e) {
      console.error(e);
    }
    showToast(
      language === 'hi'
        ? 'सभी डेमो फ़ाइलें हटा दी गईं। अब केवल आपकी असली फ़ाइलें दिखाई देंगी।'
        : 'All demo files removed. Showing only genuine user storage.'
    );
  };

  const handleRestoreDemoFiles = () => {
    try {
      localStorage.removeItem(STORAGE_HIDE_DEMO_KEY);
    } catch (e) {
      console.error(e);
    }
    setFiles(prev => {
      const userFiles = filterOutDemoFiles(prev);
      return [...initialFiles, ...userFiles];
    });
    showToast(
      language === 'hi'
        ? 'सैंपल डेमो फ़ाइलें लोड की गईं।'
        : 'Sample demo files loaded.'
    );
  };

  const handleFeedbackSubmitted = (fb: any) => {
    addOrUpdateNotification({
      id: `notif-fb-${Date.now()}`,
      type: 'feedback',
      title: language === 'hi' ? 'फ़ीडबैक डेवलपर को भेजा गया' : 'Feedback Sent to Developer',
      description: `${fb.subject} (${fb.category}) • Delivered to Akash Kumar`,
      status: 'completed',
      timestamp: 'Just now',
    });
  };

  // Dedicated Media Player States (Audio, Video, PDF Reader)
  const [currentAudio, setCurrentAudio] = useState<FileItem | null>(null);
  const [audioPlaylist, setAudioPlaylist] = useState<FileItem[]>([]);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState<number>(1);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const [videoPlayerFile, setVideoPlayerFile] = useState<FileItem | null>(null);
  const [pdfViewerFile, setPdfViewerFile] = useState<FileItem | null>(null);

  // Sync background HTML audio element with currentAudio & playback rate
  useEffect(() => {
    if (!audioElementRef.current) return;
    if (currentAudio) {
      const src = resolveMediaSrc(currentAudio.url);
      if (src) {
        audioElementRef.current.src = src;
        audioElementRef.current.playbackRate = audioPlaybackSpeed;
        if (isAudioPlaying) {
          const promise = audioElementRef.current.play();
          if (promise !== undefined) {
            promise.catch(e => {
              console.warn('Audio play error:', e);
              setIsAudioPlaying(false);
            });
          }
        }
      }
    } else {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
  }, [currentAudio]);

  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = audioPlaybackSpeed;
    }
  }, [audioPlaybackSpeed]);

  useEffect(() => {
    if (!audioElementRef.current || !currentAudio) return;
    if (isAudioPlaying) {
      const promise = audioElementRef.current.play();
      if (promise !== undefined) {
        promise.catch(e => {
          console.warn('Audio play error:', e);
          setIsAudioPlaying(false);
        });
      }
    } else {
      audioElementRef.current.pause();
    }
  }, [isAudioPlaying]);

  // Sync notifications with Media Playback (Audio)
  useEffect(() => {
    if (currentAudio) {
      addOrUpdateNotification({
        id: 'media-audio-player',
        type: 'media-playback',
        title: currentAudio.name,
        description: isAudioPlaying 
          ? (language === 'hi' ? 'ऑडियो बज रहा है (Playing)' : 'Playing background audio')
          : (language === 'hi' ? 'ऑडियो रुका हुआ है (Paused)' : 'Audio paused'),
        progress: audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : undefined,
        status: 'in-progress',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mediaDetails: {
          title: currentAudio.name,
          artist: 'Files by Akash Kumar Audio',
          isPlaying: isAudioPlaying,
          thumbnail: currentAudio.thumbnail,
          duration: audioDuration,
          currentTime: audioCurrentTime,
        },
      });

      // Sync OS MediaSession API for Android Notification Shade & Lockscreen Media Controls
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentAudio.name,
            artist: 'Files by Akash Kumar',
            album: currentAudio.folder || 'Music',
            artwork: currentAudio.thumbnail 
              ? [{ src: currentAudio.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
              : []
          });

          navigator.mediaSession.setActionHandler('play', () => setIsAudioPlaying(true));
          navigator.mediaSession.setActionHandler('pause', () => setIsAudioPlaying(false));
          navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
          navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && audioElementRef.current) {
              audioElementRef.current.currentTime = details.seekTime;
              setAudioCurrentTime(details.seekTime);
            }
          });

          if ('setPositionState' in navigator.mediaSession && audioDuration > 0 && isFinite(audioDuration)) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audioDuration,
                playbackRate: audioPlaybackSpeed || 1,
                position: Math.min(audioCurrentTime, audioDuration),
              });
            } catch (e) {}
          }
        } catch (err) {
          console.warn('MediaSession error:', err);
        }
      }
    } else {
      dismissNotification('media-audio-player');
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = null;
        } catch (e) {}
      }
    }
  }, [currentAudio?.id, currentAudio?.name, isAudioPlaying, language]);

  // Sync notifications with Video Player
  useEffect(() => {
    if (videoPlayerFile) {
      addOrUpdateNotification({
        id: 'media-video-player',
        type: 'media-playback',
        title: videoPlayerFile.name,
        description: language === 'hi' ? 'वीडियो प्लेयर सक्रिय है' : 'Video player active',
        status: 'in-progress',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mediaDetails: {
          title: videoPlayerFile.name,
          artist: 'Files Video Player',
          isPlaying: true,
          thumbnail: videoPlayerFile.thumbnail,
        },
      });
    } else {
      dismissNotification('media-video-player');
    }
  }, [videoPlayerFile, language]);

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
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | null>(null);

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
    const notifId = `archive-extract-${Date.now()}`;
    addOrUpdateNotification({
      id: notifId,
      type: 'archive',
      title: language === 'hi' ? 'ज़िप फ़ाइल अनपैक हो गई' : 'Archive unzipped successfully',
      description: `${extractedFiles.length} ${language === 'hi' ? 'फ़ाइलें निकाली गईं' : 'file(s) extracted'}`,
      progress: 100,
      status: 'completed',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: {
        targetPath: currentFolderPath,
      },
    });
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
    const notifId = `archive-zip-${Date.now()}`;
    addOrUpdateNotification({
      id: notifId,
      type: 'archive',
      title: language === 'hi' ? 'ज़िप फ़ाइल तैयार' : 'ZIP archive created',
      description: `${createdZip.name} (${formatBytes(createdZip.size, 1)})`,
      progress: 100,
      status: 'completed',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: {
        targetPath: currentFolderPath,
      },
    });
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
  const handleUploadFiles = async (fileList: FileList, targetFolder = '/Download') => {
    const newItems: FileItem[] = [];

    for (const file of Array.from(fileList)) {
      const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const { type, mimeType } = classifyFile(file.name, file.type);
      const objectUrl = URL.createObjectURL(file);

      // Save large blob into IndexedDB to prevent localStorage 5MB quota overflow
      await saveFileBlob(fileId, file);

      newItems.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type,
        mimeType,
        folder: targetFolder,
        storageDevice: isFolderViewOpen ? activeStorageDevice : 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: objectUrl,
        thumbnail: type === 'image' || type === 'video' ? objectUrl : undefined,
        isLarge: file.size > 10 * 1024 * 1024,
      });
    }

    if (newItems.length > 0) {
      setFiles(prev => [...newItems, ...prev]);
      const notifId = `upload-${Date.now()}`;
      addOrUpdateNotification({
        id: notifId,
        type: 'upload',
        title: language === 'hi' ? 'फ़ाइलें अपलोड हो गईं' : 'Files uploaded',
        description: `${newItems.length} ${language === 'hi' ? 'फ़ाइलें जोड़ी गईं:' : 'file(s) added to:'} ${targetFolder}`,
        progress: 100,
        status: 'completed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: {
          targetPath: targetFolder,
        },
      });
      showToast(`${newItems.length} ${t.fileUploaded}`);
    }
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
    const junkToClean = junkBytes;
    const notifId = `clean-${Date.now()}`;
    
    addOrUpdateNotification({
      id: notifId,
      type: 'clean',
      title: language === 'hi' ? 'जंक फ़ाइलें साफ़ की जा रही हैं...' : 'Cleaning junk cache files...',
      description: `${formatBytes(junkToClean, 1)} temporary cache & APK residue`,
      progress: 30,
      status: 'in-progress',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setTimeout(() => {
      addOrUpdateNotification({
        id: notifId,
        type: 'clean',
        title: language === 'hi' ? 'जंक फ़ाइलें साफ़ की जा रही हैं...' : 'Cleaning junk cache files...',
        description: 'Removing thumbnail cache & app residue...',
        progress: 80,
        status: 'in-progress',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }, 400);

    setTimeout(() => {
      setJunkBytes(0);
      addOrUpdateNotification({
        id: notifId,
        type: 'clean',
        title: language === 'hi' ? 'जंक फ़ाइलें साफ़ हो गईं' : 'Junk files cleaned',
        description: `${language === 'hi' ? 'खाली की गई जगह:' : 'Freed up'} +${formatBytes(junkToClean, 1)}`,
        progress: 100,
        status: 'completed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      showToast(t.junkCleaned);
    }, 900);
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

  const handleCreateFolder = async (
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

    // Create actual folder on native disk if on Android
    try {
      const isNat = await isNativePlatform();
      if (isNat) {
        await createNativeFolder(fullPath);
      }
    } catch (e) {
      console.warn('Native create folder warning:', e);
    }
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

        const dt = 0.5; // 500ms interval for smooth progress and battery optimization
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
    }, 500);

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

  // Sync ongoing Copy / Move / Transfer operations to Notification Shade
  useEffect(() => {
    if (!transferTask) return;
    const isCompleted = transferTask.status === 'completed';
    const isPaused = transferTask.status === 'paused';
    const isCancelled = transferTask.status === 'cancelled';
    const percent = transferTask.totalBytes > 0 
      ? Math.round((transferTask.transferredBytes / transferTask.totalBytes) * 100) 
      : (isCompleted ? 100 : 0);

    const opName = transferTask.operation === 'copy' 
      ? (language === 'hi' ? 'फ़ाइलें कॉपी हो रही हैं' : 'Copying files') 
      : (language === 'hi' ? 'फ़ाइलें स्थानांतरित (Move) हो रही हैं' : 'Moving files');

    const curFile = transferTask.files[transferTask.currentFileIndex]?.name || 'Files';
    const targetPath = transferTask.targetFolder;

    addOrUpdateNotification({
      id: transferTask.id,
      type: 'file-operation',
      title: isCompleted 
        ? (language === 'hi' ? 'फ़ाइलें सफलतापूर्वक ट्रांसफर हुईं' : 'Files transferred successfully')
        : opName,
      description: isCompleted
        ? `${transferTask.files.length} ${language === 'hi' ? 'फ़ाइलें सेव हुईं:' : 'files saved to:'} ${targetPath}`
        : `${curFile} • ${formatBytes(transferTask.transferredBytes, 1)} / ${formatBytes(transferTask.totalBytes, 1)}`,
      progress: percent,
      speed: isCompleted ? 'Completed' : `${transferTask.speedMbps} MB/s`,
      status: isCompleted ? 'completed' : isPaused ? 'paused' : isCancelled ? 'failed' : 'in-progress',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: {
        cancelable: !isCompleted && !isCancelled,
        targetPath: isCompleted ? targetPath : undefined,
      },
    });
  }, [transferTask, language]);

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
      className="min-h-screen bg-[#f0f4f1] dark:bg-[#131814] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 relative transition-colors duration-200"
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
              {language === 'hi' ? 'फ़ाइलें यहाँ छोड़ें (Files by Akash Kumar)' : 'Drop files here to upload into Files by Akash Kumar'}
            </p>
            <p className="text-xs text-neutral-500">
              Files will be saved directly into {isFolderViewOpen ? currentFolderPath : '/Download'}
            </p>
          </div>
        </div>
      )}

      {/* Android Floating Heads-Up / Top Notification Bar */}
      <FloatingNotificationBar
        activeNotification={notifications.find(n => n.status === 'in-progress') || null}
        totalActiveCount={notifications.filter(n => n.status === 'in-progress').length}
        onOpenShade={() => setIsNotificationShadeOpen(true)}
        isAudioPlaying={isAudioPlaying}
        onPlayPauseAudio={() => setIsAudioPlaying(!isAudioPlaying)}
      />

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
        onOpenNotifications={() => setIsNotificationShadeOpen(true)}
        activeNotificationCount={notifications.length}
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
            onRefreshStorage={loadRealDeviceStorage}
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
                hasDemoFiles={isDemoFilesActive}
                onClearDemoFiles={handleClearDemoFiles}
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
                hasDemoFiles={isDemoFilesActive}
                onClearDemoFiles={handleClearDemoFiles}
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotifications={() => setIsNotificationShadeOpen(true)}
        activeNotificationCount={notifications.length}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenLegal={(tab) => setLegalModalTab(tab)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
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
        onOpenLegal={(tab) => setLegalModalTab(tab)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        language={language}
      />

      {/* Hidden Global Audio Element for Background Music Playback */}
      <audio
        ref={audioElementRef}
        onError={() => {
          setIsAudioPlaying(false);
        }}
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
        playbackSpeed={audioPlaybackSpeed}
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
        onChangeSpeed={(speed) => setAudioPlaybackSpeed(speed)}
        onSelectTrack={(track) => {
          setCurrentAudio(track);
          setIsAudioPlaying(true);
        }}
        onToggleStar={handleToggleStar}
        onMoveToTrash={(id) => handleMoveToTrash(id)}
        onQuickCopy={(f) => handleQuickCopy(f)}
        onQuickCut={(f) => handleQuickCut(f)}
        onMoveToSafeFolder={(id) => {
          setFiles(prev => prev.map(f => f.id === id ? { ...f, isSafe: true } : f));
          showToast(language === 'hi' ? 'सेफ़ फ़ोल्डर में भेजा गया 🔒' : 'Moved to Safe folder 🔒');
        }}
        onSetAsRingtone={(f) => {
          showToast(language === 'hi' ? `"${f.name}" रिंगटोन सेट की गई 🔔` : `"${f.name}" set as ringtone 🔔`);
        }}
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

      {/* Privacy Policy & Terms of Service Modal */}
      <LegalModal
        isOpen={legalModalTab !== null}
        initialTab={legalModalTab || 'privacy'}
        language={language}
        onClose={() => setLegalModalTab(null)}
      />

      {/* Comprehensive Application Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        onLanguageChange={(newLang) => setLanguage(newLang)}
        storage={storage}
        onOpenStorageBreakdown={() => {
          setIsSettingsOpen(false);
          setIsStorageBreakdownOpen(true);
        }}
        onOpenLegal={(tab) => {
          setIsSettingsOpen(false);
          setLegalModalTab(tab);
        }}
        showToast={showToast}
        hasDemoFiles={isDemoFilesActive}
        onClearDemoFiles={handleClearDemoFiles}
        onRestoreDemoFiles={handleRestoreDemoFiles}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        themePreference={themePreference}
        onThemeChange={(newTheme) => setThemePreference(newTheme)}
      />

      {/* Developer Feedback & Ticket Log Sheet Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        userAccount={userAccount}
        onOpenAccount={() => {
          setIsFeedbackOpen(false);
          setIsAccountOpen(true);
        }}
        onSignIn={handleSignIn}
        storage={storage}
        language={language}
        showToast={showToast}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />

      {/* Android 14/15 Notification Shade & Ongoing Tasks Overlay */}
      <NotificationShade
        isOpen={isNotificationShadeOpen}
        onClose={() => setIsNotificationShadeOpen(false)}
        notifications={notifications}
        onDismissNotification={dismissNotification}
        onClearAllNotifications={clearAllNotifications}
        onCancelTask={(id) => {
          if (transferTask && transferTask.id === id) {
            handleCancelTransfer();
          }
          dismissNotification(id);
        }}
        onNavigateToFolder={(targetPath) => {
          setIsFolderViewOpen(true);
          setCurrentFolderPath(targetPath);
        }}
        isAudioPlaying={isAudioPlaying}
        onPlayPauseAudio={() => setIsAudioPlaying(!isAudioPlaying)}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        language={language}
      />
    </div>
  );
}
