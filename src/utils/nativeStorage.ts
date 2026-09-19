import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
export { ImpactStyle };
import { Share } from '@capacitor/share';
import { FileItem, FolderItem } from '../types';
import { initialFiles } from '../data/initialFiles';
import { classifyFile, isFileInCategory } from './fileClassifier';
import { resolveMediaSrc } from './mediaUtils';

export interface StorageVolumeInfo {
  name: string;
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
}

export interface RealStoragePluginInterface {
  checkPermission(): Promise<{ granted: boolean; sdkInt: number; needsManageSettings: boolean }>;
  requestAllFilesPermission(): Promise<{ openedSettings: boolean; granted: boolean }>;
  getStorageVolumes(): Promise<{
    internal: StorageVolumeInfo;
    sdcard: StorageVolumeInfo | null;
  }>;
  listDirectory(options: { path?: string }): Promise<{
    currentPath: string;
    exists: boolean;
    canRead: boolean;
    files: Array<{
      id: string;
      name: string;
      path: string;
      folder: string;
      size: number;
      lastModified: number;
      extension: string;
      mimeType: string;
      type: FileItem['type'];
      storageDevice?: 'internal' | 'sdcard';
    }>;
    folders: Array<{
      id: string;
      name: string;
      path: string;
      parentPath: string;
      lastModified: number;
      storageDevice: 'internal' | 'sdcard';
    }>;
  }>;
  scanMediaCategory(options: { category: string }): Promise<{
    files: Array<{
      id: string;
      name: string;
      path: string;
      folder: string;
      size: number;
      lastModified: number;
      extension: string;
      mimeType: string;
      type: FileItem['type'];
      storageDevice?: 'internal' | 'sdcard';
    }>;
  }>;
  deleteFile(options: { path: string }): Promise<{ success: boolean }>;
  openFileWithApp(options: { path: string }): Promise<{ success: boolean }>;
  createDirectory(options: { path: string }): Promise<{ success: boolean; path?: string }>;
  copyFile(options: { sourcePath: string; targetFolderPath: string }): Promise<{
    success: boolean;
    newPath?: string;
    name?: string;
    size?: number;
  }>;
  moveFile(options: { sourcePath: string; targetFolderPath: string }): Promise<{
    success: boolean;
    newPath?: string;
    name?: string;
  }>;
  canWriteSettings(): Promise<{ canWrite: boolean }>;
  openWriteSettings(): Promise<{ opened: boolean }>;
  setAsRingtone(options: {
    path: string;
    ringtoneType?: 'ringtone' | 'notification' | 'alarm' | 'all';
    title?: string;
  }): Promise<{
    success: boolean;
    needsPermission?: boolean;
    message?: string;
    ringtoneType?: string;
    targetPath?: string;
    uri?: string;
  }>;
}

export const RealDeviceStorage = registerPlugin<RealStoragePluginInterface>('RealDeviceStorage');

/**
 * Trigger subtle Android haptic feedback on user taps & interactions
 */
export async function triggerHapticFeedback(style: ImpactStyle = ImpactStyle.Light) {
  try {
    await Haptics.impact({ style });
  } catch {
    // Silently fall back if on browser/unsupported
  }
}

/**
 * Native Android & Web Share sheet for files / links
 */
export async function shareNativeFile(
  title: string, 
  text: string, 
  url?: string,
  files?: string[],
  fileItem?: FileItem | FileItem[]
): Promise<boolean> {
  await triggerHapticFeedback(ImpactStyle.Medium);

  // 1. Try Capacitor Native Share plugin (Android/iOS)
  try {
    const isNative = await isNativePlatform();
    if (isNative) {
      await Share.share({
        title,
        text,
        url: url && !url.startsWith('blob:') && !url.startsWith('data:') ? url : undefined,
        files: files && files.length > 0 ? files : (url && url.startsWith('file://') ? [url] : undefined),
        dialogTitle: 'Files by Akash Kumar - Share',
      });
      return true;
    }
  } catch (err) {
    console.warn('Native Capacitor Share error, falling back:', err);
  }

  // 2. Try Web Share API (Mobile Browsers, Chrome, Safari, PWA)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // If we have a blob URL, convert it to a File object for native file sharing sheet
      if (url && (url.startsWith('blob:') || url.startsWith('data:'))) {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          const fileObj = new File([blob], title || 'shared-file', { type: blob.type || 'application/octet-stream' });
          if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
            await navigator.share({
              title,
              text,
              files: [fileObj]
            });
            return true;
          }
        } catch (blobErr) {
          console.warn('Blob share conversion failed:', blobErr);
        }
      }

      const shareData: ShareData = {
        title,
        text,
        url: url && url.startsWith('http') ? url : window.location.href,
      };
      await navigator.share(shareData);
      return true;
    } catch (webShareErr: unknown) {
      if ((webShareErr as Error)?.name === 'AbortError') {
        return true; // User cancelled cleanly
      }
      console.warn('Web Share API error, falling back to Share Modal:', webShareErr);
    }
  }

  // 3. Fallback: Dispatch custom share modal event to open rich Material 3 Share Sheet
  if (typeof window !== 'undefined') {
    const filesList = Array.isArray(fileItem) ? fileItem : (fileItem ? [fileItem] : undefined);
    const primaryFile = filesList && filesList.length > 0 ? filesList[0] : {
      id: 'shared-' + Date.now(),
      name: title,
      size: 1024,
      type: 'document',
      updatedAt: new Date().toISOString(),
      folder: 'Storage',
      url: url || window.location.href
    };

    window.dispatchEvent(new CustomEvent('akash_open_share_modal', {
      detail: {
        title,
        text,
        url,
        file: primaryFile,
        files: filesList || [primaryFile]
      }
    }));
    return true;
  }

  return false;
}

/**
 * Checks if running as a real native Android/iOS application via Capacitor
 */
export async function isNativePlatform(): Promise<boolean> {
  try {
    const info = await Device.getInfo();
    return info.platform === 'android' || info.platform === 'ios';
  } catch {
    return false;
  }
}

/**
 * Check if Android 11+ "All files access" is granted
 */
export async function checkStoragePermissionStatus(): Promise<{
  granted: boolean;
  needsManageSettings: boolean;
}> {
  const isNative = await isNativePlatform();
  if (!isNative) {
    return { granted: true, needsManageSettings: false };
  }

  try {
    const res = await RealDeviceStorage.checkPermission();
    return {
      granted: res.granted,
      needsManageSettings: res.needsManageSettings,
    };
  } catch (e) {
    console.warn('Check permission error, falling back:', e);
    return { granted: false, needsManageSettings: true };
  }
}

/**
 * Prompt user to open Android Settings to toggle "Allow management of all files"
 */
export async function requestAllFilesAccess(): Promise<boolean> {
  try {
    await triggerHapticFeedback(ImpactStyle.Heavy);
    const res = await RealDeviceStorage.requestAllFilesPermission();
    return res.granted;
  } catch (e) {
    console.error('Request all files access error:', e);
    return false;
  }
}

/**
 * Open file in real Android default app (e.g. Gallery, Music Player, PDF reader)
 */
export async function openRealFile(path: string): Promise<boolean> {
  try {
    await triggerHapticFeedback(ImpactStyle.Light);
    const isNative = await isNativePlatform();
    if (isNative) {
      const res = await RealDeviceStorage.openFileWithApp({ path });
      return res.success;
    }
    // Web fallback
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
      window.open(path, '_blank');
      return true;
    }
    return true;
  } catch (e) {
    console.error('Open file error:', e);
    return false;
  }
}

export interface RingtoneResult {
  success: boolean;
  needsPermission?: boolean;
  message?: string;
  ringtoneType?: 'ringtone' | 'notification' | 'alarm' | 'all';
  targetPath?: string;
  uri?: string;
}

/**
 * Check if the app has permission to write system settings (for ringtone)
 */
export async function checkCanWriteSettings(): Promise<boolean> {
  const isNative = await isNativePlatform();
  if (!isNative) return true;
  try {
    const res = await RealDeviceStorage.canWriteSettings();
    return res.canWrite;
  } catch (e) {
    return true;
  }
}

/**
 * Open Android system settings for WRITE_SETTINGS permission
 */
export async function requestOpenWriteSettings(): Promise<boolean> {
  const isNative = await isNativePlatform();
  if (!isNative) return true;
  try {
    const res = await RealDeviceStorage.openWriteSettings();
    return res.opened;
  } catch (e) {
    return false;
  }
}

/**
 * Set an audio file as Phone Ringtone, Notification Sound, or Alarm Sound
 */
export async function setFileAsRingtone(
  path: string,
  ringtoneType: 'ringtone' | 'notification' | 'alarm' | 'all' = 'ringtone',
  title?: string
): Promise<RingtoneResult> {
  await triggerHapticFeedback(ImpactStyle.Medium);
  const isNative = await isNativePlatform();
  if (!isNative) {
    try {
      const current = JSON.parse(localStorage.getItem('files_app_custom_ringtones') || '{}');
      current[ringtoneType] = {
        path,
        title: title || path.split('/').pop() || 'Custom Ringtone',
        timestamp: Date.now(),
      };
      localStorage.setItem('files_app_custom_ringtones', JSON.stringify(current));
    } catch (e) {}
    return { success: true, ringtoneType };
  }
  try {
    const res = await RealDeviceStorage.setAsRingtone({ path, ringtoneType, title });
    return {
      ...res,
      ringtoneType: res.ringtoneType as any
    };
  } catch (e: any) {
    console.error('Error in setAsRingtone:', e);
    return { success: false, message: e?.message || 'Error setting ringtone' };
  }
}

/**
 * Delete a real file from storage
 */
export async function deleteRealFile(path: string): Promise<boolean> {
  try {
    await triggerHapticFeedback(ImpactStyle.Medium);
    const res = await RealDeviceStorage.deleteFile({ path });
    return res.success;
  } catch (e) {
    console.error('Delete real file error:', e);
    return false;
  }
}

/**
 * Create a new real directory on device storage
 */
export async function createNativeFolder(path: string): Promise<boolean> {
  try {
    const isNative = await isNativePlatform();
    if (!isNative) return true;
    const res = await RealDeviceStorage.createDirectory({ path });
    return res.success;
  } catch (e) {
    console.error('Create native folder error:', e);
    return false;
  }
}

/**
 * Copy a physical file from sourcePath to targetFolderPath on Android
 */
export async function copyNativeFile(
  sourcePath: string,
  targetFolderPath: string
): Promise<{ success: boolean; newPath?: string; name?: string; size?: number }> {
  try {
    const isNative = await isNativePlatform();
    if (!isNative) return { success: true };
    await triggerHapticFeedback(ImpactStyle.Light);
    const res = await RealDeviceStorage.copyFile({ sourcePath, targetFolderPath });
    return res;
  } catch (e) {
    console.error('Copy native file error:', e);
    return { success: false };
  }
}

/**
 * Move a physical file from sourcePath to targetFolderPath on Android
 */
export async function moveNativeFile(
  sourcePath: string,
  targetFolderPath: string
): Promise<{ success: boolean; newPath?: string; name?: string }> {
  try {
    const isNative = await isNativePlatform();
    if (!isNative) return { success: true };
    await triggerHapticFeedback(ImpactStyle.Light);
    const res = await RealDeviceStorage.moveFile({ sourcePath, targetFolderPath });
    return res;
  } catch (e) {
    console.error('Move native file error:', e);
    return { success: false };
  }
}

/**
 * Fetch real Storage Volumes (Internal & SD Card)
 */
export async function getRealStorageVolumes(): Promise<{
  internal: StorageVolumeInfo | null;
  sdcard: StorageVolumeInfo | null;
}> {
  const isNative = await isNativePlatform();
  if (!isNative) {
    return { internal: null, sdcard: null };
  }

  try {
    const res = await RealDeviceStorage.getStorageVolumes();
    return {
      internal: res.internal || null,
      sdcard: res.sdcard || null,
    };
  } catch (e) {
    console.warn('Get storage volumes error:', e);
    return { internal: null, sdcard: null };
  }
}

/**
 * Accurately detects whether a given file path belongs to internal phone storage or external SD card
 */
export function detectStorageDevice(filePath: string, explicitDevice?: 'internal' | 'sdcard'): 'internal' | 'sdcard' {
  if (explicitDevice === 'sdcard') return 'sdcard';
  if (explicitDevice === 'internal') return 'internal';
  if (!filePath) return 'internal';

  const lower = filePath.toLowerCase();

  // Explicit SD card / external storage indicators (check first to avoid misclassifying SD Card folders named /sdcard1 or /SD Card/...)
  if (
    lower.includes('sd card') ||
    lower.includes('sdcard1') ||
    lower.includes('extsdcard') ||
    lower.includes('external_sd') ||
    lower.includes('external') ||
    lower.includes('media_rw') ||
    lower.includes('micro_sd') ||
    lower.includes('microsd') ||
    lower.includes('removable') ||
    lower.includes('sd-') ||
    /\/storage\/[0-9a-f]{4}-[0-9a-f]{4}/i.test(filePath) ||
    (lower.startsWith('/storage/') && !lower.includes('emulated') && !lower.includes('/self/'))
  ) {
    return 'sdcard';
  }

  // Internal storage signatures
  if (
    lower.includes('/storage/emulated/') ||
    lower.includes('/storage/self/primary') ||
    lower.startsWith('/sdcard/') ||
    lower === '/sdcard'
  ) {
    return 'internal';
  }

  return 'internal';
}

/**
 * Deep scans an SD card path for media files, with special focus on Audio, Music, Recordings, Downloads
 */
export async function scanSdCardMediaFiles(
  sdCardPath: string, 
  targetCategory?: string
): Promise<{ files: FileItem[]; folders: FolderItem[] }> {
  const foundFiles: FileItem[] = [];
  const foundFolders: FolderItem[] = [];
  const seenPaths = new Set<string>();

  try {
    // 1. List root of SD card
    const rootListing = await RealDeviceStorage.listDirectory({ path: sdCardPath }).catch(() => null);
    if (!rootListing) return { files: foundFiles, folders: foundFolders };

    const foldersToScan: string[] = [];

    // Collect root folders
    if (rootListing.folders) {
      for (const fold of rootListing.folders) {
        foundFolders.push({
          id: fold.id,
          name: fold.name,
          path: fold.path,
          parentPath: fold.parentPath,
          storageDevice: 'sdcard',
          createdAt: new Date(fold.lastModified || Date.now()).toISOString(),
        });
        foldersToScan.push(fold.path);
      }
    }

    // Process root files
    if (rootListing.files) {
      for (const f of rootListing.files) {
        const key = f.path || f.name;
        if (!seenPaths.has(key)) {
          seenPaths.add(key);
          const classification = classifyFile(f.name, f.mimeType);
          const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;

          if (!targetCategory || classification.category === targetCategory || resolvedType === targetCategory) {
            foundFiles.push({
              id: f.id,
              name: f.name,
              size: f.size,
              type: resolvedType,
              mimeType: f.mimeType || classification.mimeType,
              folder: f.folder || '/SD Card',
              storageDevice: 'sdcard',
              url: f.path,
              thumbnail: resolvedType === 'image' || resolvedType === 'video' ? (resolveMediaSrc(f.path) || f.path) : undefined,
              createdAt: new Date(f.lastModified || Date.now()).toISOString(),
              updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
            });
          }
        }
      }
    }

    // Standard media directories to always ensure we check on SD Card and External Storage
    const candidateMediaFolderNames = [
      'Music', 'Audio', 'Songs', 'Recordings', 'Download', 'Downloads', 
      'Podcasts', 'Ringtones', 'Notifications', 'Alarms', 'DCIM', 'Movies', 
      'Media', 'Albums', 'WhatsApp/Media/WhatsApp Audio', 'WhatsApp/Media/WhatsApp Voice Notes',
      'Voice', 'Voice Recorder', 'Sounds', 'Sound', 'Bluetooth', 'SHAREit/audio',
      'Telegram/Telegram Audio', 'DJ_Mix', 'DJ_Songs', 'Bollywood', 'Bhakti', 'Oldies',
      'MIUI/sound_recorder', 'Audios', 'MP3', 'mp3'
    ];

    for (const cand of candidateMediaFolderNames) {
      const fullCandPath = `${sdCardPath.replace(/\/+$/, '')}/${cand}`;
      if (!foldersToScan.includes(fullCandPath)) {
        foldersToScan.push(fullCandPath);
      }
    }

    // Now scan each folder (and subfolders like Music/Albums)
    for (const folderPath of foldersToScan) {
      try {
        const dirRes = await RealDeviceStorage.listDirectory({ path: folderPath }).catch(() => null);
        if (!dirRes) continue;

        // Subfolders inside this folder (e.g. Music/Albums, Music/Artists)
        const nestedFolders: string[] = [];
        if (dirRes.folders) {
          for (const subFold of dirRes.folders) {
            foundFolders.push({
              id: subFold.id,
              name: subFold.name,
              path: subFold.path,
              parentPath: subFold.parentPath,
              storageDevice: 'sdcard',
              createdAt: new Date(subFold.lastModified || Date.now()).toISOString(),
            });
            nestedFolders.push(subFold.path);
          }
        }

        // Files inside this folder
        if (dirRes.files) {
          for (const f of dirRes.files) {
            const key = f.path || f.name;
            if (!seenPaths.has(key)) {
              seenPaths.add(key);
              const classification = classifyFile(f.name, f.mimeType);
              const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;

              if (!targetCategory || classification.category === targetCategory || resolvedType === targetCategory) {
                foundFiles.push({
                  id: f.id,
                  name: f.name,
                  size: f.size,
                  type: resolvedType,
                  mimeType: f.mimeType || classification.mimeType,
                  folder: f.folder || folderPath,
                  storageDevice: 'sdcard',
                  url: f.path,
                  thumbnail: resolvedType === 'image' || resolvedType === 'video' ? (resolveMediaSrc(f.path) || f.path) : undefined,
                  createdAt: new Date(f.lastModified || Date.now()).toISOString(),
                  updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
                });
              }
            }
          }
        }

        // Scan nested subfolders (e.g. Albums inside Music)
        for (const nestedPath of nestedFolders.slice(0, 10)) {
          try {
            const nestedRes = await RealDeviceStorage.listDirectory({ path: nestedPath }).catch(() => null);
            if (nestedRes && nestedRes.files) {
              for (const f of nestedRes.files) {
                const key = f.path || f.name;
                if (!seenPaths.has(key)) {
                  seenPaths.add(key);
                  const classification = classifyFile(f.name, f.mimeType);
                  const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;

                  if (!targetCategory || classification.category === targetCategory || resolvedType === targetCategory) {
                    foundFiles.push({
                      id: f.id,
                      name: f.name,
                      size: f.size,
                      type: resolvedType,
                      mimeType: f.mimeType || classification.mimeType,
                      folder: f.folder || nestedPath,
                      storageDevice: 'sdcard',
                      url: f.path,
                      thumbnail: resolvedType === 'image' || resolvedType === 'video' ? (resolveMediaSrc(f.path) || f.path) : undefined,
                      createdAt: new Date(f.lastModified || Date.now()).toISOString(),
                      updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
                    });
                  }
                }
              }
            }
          } catch {
            // Nested scan fallback
          }
        }
      } catch {
        // Folder scan fallback
      }
    }
  } catch (err) {
    console.warn('Error scanning SD card media files:', err);
  }

  return { files: foundFiles, folders: foundFolders };
}

/**
 * Scan real files and folders from the device
 */
export async function scanNativeStorage(): Promise<{
  files: FileItem[];
  folders: FolderItem[];
  volumes?: { internal: StorageVolumeInfo | null; sdcard: StorageVolumeInfo | null };
} | null> {
  const isNative = await isNativePlatform();
  if (!isNative) {
    return null;
  }

  try {
    const perm = await checkStoragePermissionStatus();
    if (!perm.granted) {
      console.log('All files permission not granted yet');
    }

    // 1. Get real volume info
    const volumes = await getRealStorageVolumes();

    // 2. Fetch root directory items (DCIM, Download, Documents, Music, Pictures, etc.)
    const internalRoot = volumes.internal?.path || '/storage/emulated/0';
    const rootDirResult = await RealDeviceStorage.listDirectory({ path: internalRoot }).catch(() => null);

    // 3. Scan media categories (Audio, Images, Video, Downloads, Docs)
    const mediaCategories = ['audio', 'images', 'videos', 'documents', 'apps', 'downloads'];
    const collectedFiles: FileItem[] = [];

    if (rootDirResult && rootDirResult.files) {
      for (const f of rootDirResult.files) {
        const webUrl = resolveMediaSrc(f.path) || f.path;
        
        const classification = classifyFile(f.name, f.mimeType);
        const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;
        const device = detectStorageDevice(f.path, f.storageDevice);

        collectedFiles.push({
          id: f.id,
          name: f.name,
          size: f.size,
          type: resolvedType,
          mimeType: f.mimeType || classification.mimeType,
          folder: f.folder,
          storageDevice: device,
          url: f.path,
          thumbnail: resolvedType === 'image' || resolvedType === 'video' ? webUrl : undefined,
          createdAt: new Date(f.lastModified || Date.now()).toISOString(),
          updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
        });
      }
    }

    // Also scan common media stores for complete coverage
    for (const cat of ['audio', 'images', 'videos', 'documents', 'apps']) {
      try {
        const catRes = await RealDeviceStorage.scanMediaCategory({ category: cat });
        if (catRes && catRes.files) {
          for (const f of catRes.files) {
            const webUrl = resolveMediaSrc(f.path) || f.path;

            const classification = classifyFile(f.name, f.mimeType);
            const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;
            const device = detectStorageDevice(f.path, f.storageDevice);

            collectedFiles.push({
              id: f.id,
              name: f.name,
              size: f.size,
              type: resolvedType,
              mimeType: f.mimeType || classification.mimeType,
              folder: f.folder,
              storageDevice: device,
              url: f.path,
              thumbnail: resolvedType === 'image' || resolvedType === 'video' ? webUrl : undefined,
              createdAt: new Date(f.lastModified || Date.now()).toISOString(),
              updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
            });
          }
        }
      } catch (catErr) {
        // continue
      }
    }

    // Deduplicate files by path/id
    const seen = new Set<string>();
    const uniqueFiles: FileItem[] = [];
    for (const file of collectedFiles) {
      const key = file.url || file.name;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFiles.push(file);
      }
    }

    // Build Folder items
    const collectedFolders: FolderItem[] = [];
    if (rootDirResult && rootDirResult.folders) {
      for (const fold of rootDirResult.folders) {
        collectedFolders.push({
          id: fold.id,
          name: fold.name,
          path: fold.path,
          parentPath: fold.parentPath,
          storageDevice: fold.storageDevice || detectStorageDevice(fold.path),
          createdAt: new Date(fold.lastModified || Date.now()).toISOString(),
        });
      }
    }

    // 4. Discover SD card volumes: from getRealStorageVolumes OR checking /storage entries
    const sdCardPaths: { name: string; path: string }[] = [];
    if (volumes.sdcard && volumes.sdcard.path) {
      sdCardPaths.push({ name: volumes.sdcard.name || 'SD Card', path: volumes.sdcard.path });
    }

    // Probe /storage for external SD cards
    try {
      const storageDir = await RealDeviceStorage.listDirectory({ path: '/storage' }).catch(() => null);
      if (storageDir && storageDir.folders) {
        for (const fold of storageDir.folders) {
          const lower = fold.name.toLowerCase();
          if (lower !== 'emulated' && lower !== 'self' && !sdCardPaths.some(p => p.path === fold.path)) {
            sdCardPaths.push({
              name: fold.name.length <= 10 && fold.name.includes('-') ? `SD Card (${fold.name})` : (fold.name || 'SD Card'),
              path: fold.path,
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // Now scan each discovered SD card comprehensively
    for (const sd of sdCardPaths) {
      collectedFolders.unshift({
        id: `sdcard-${sd.name}`,
        name: sd.name,
        path: sd.path,
        parentPath: '',
        storageDevice: 'sdcard',
        createdAt: new Date().toISOString(),
      });

      const sdMedia = await scanSdCardMediaFiles(sd.path);
      for (const fold of sdMedia.folders) {
        collectedFolders.push(fold);
      }
      for (const f of sdMedia.files) {
        const key = f.url || f.name;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFiles.push(f);
        }
      }
    }

    return {
      files: uniqueFiles,
      folders: collectedFolders,
      volumes,
    };
  } catch (err) {
    console.error('Error scanning native real storage:', err);
    return null;
  }
}

/**
 * Deep scan for all files in a specific category (audio, videos, images, documents, apps, downloads)
 * across both Internal Storage and SD Card.
 */
export async function scanCategoryFilesFromDevice(category: string): Promise<FileItem[] | null> {
  const isNative = await isNativePlatform();
  if (!isNative) {
    // In web preview or simulated environment, return all category files from initialFiles
    return initialFiles.filter(f => isFileInCategory(f, category as any));
  }

  try {
    const combinedFiles: FileItem[] = [];
    const seen = new Set<string>();

    // 1. Query Android MediaStore
    try {
      const res = await RealDeviceStorage.scanMediaCategory({ category });
      if (res && res.files) {
        for (const f of res.files) {
          const webUrl = resolveMediaSrc(f.path) || f.path;
          const classification = classifyFile(f.name, f.mimeType);
          const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;
          const device = detectStorageDevice(f.path, f.storageDevice);

          const item: FileItem = {
            id: f.id,
            name: f.name,
            size: f.size,
            type: resolvedType,
            mimeType: f.mimeType || classification.mimeType,
            folder: f.folder,
            storageDevice: device,
            url: f.path,
            thumbnail: resolvedType === 'image' || resolvedType === 'video' ? webUrl : undefined,
            createdAt: new Date(f.lastModified || Date.now()).toISOString(),
            updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
          };
          const key = item.url || item.name;
          if (!seen.has(key)) {
            seen.add(key);
            combinedFiles.push(item);
          }
        }
      }
    } catch {
      // media store fallback
    }

    // 2. Scan internal storage candidate media folders directly
    const volumes = await getRealStorageVolumes();
    const internalPath = volumes.internal?.path || '/storage/emulated/0';
    const internalCandidateFolders = [
      `${internalPath}/Music`,
      `${internalPath}/Download`,
      `${internalPath}/Recordings`,
      `${internalPath}/Audio`,
      `${internalPath}/Sounds`,
      `${internalPath}/Voice`,
      `${internalPath}/WhatsApp/Media/WhatsApp Audio`,
      `${internalPath}/WhatsApp/Media/WhatsApp Voice Notes`,
      `${internalPath}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio`,
      `${internalPath}/Telegram/Telegram Audio`,
      `${internalPath}/Bluetooth`,
      `${internalPath}/SHAREit/audio`,
      `${internalPath}/MIUI/sound_recorder`
    ];

    for (const folderPath of internalCandidateFolders) {
      try {
        const dirRes = await RealDeviceStorage.listDirectory({ path: folderPath }).catch(() => null);
        if (dirRes && dirRes.files) {
          for (const f of dirRes.files) {
            const key = f.path || f.name;
            if (!seen.has(key)) {
              const classification = classifyFile(f.name, f.mimeType);
              const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;
              if (!category || category === 'all' || classification.category === category || resolvedType === category) {
                seen.add(key);
                combinedFiles.push({
                  id: f.id,
                  name: f.name,
                  size: f.size,
                  type: resolvedType,
                  mimeType: f.mimeType || classification.mimeType,
                  folder: f.folder || folderPath,
                  storageDevice: 'internal',
                  url: f.path,
                  thumbnail: resolvedType === 'image' || resolvedType === 'video' ? (resolveMediaSrc(f.path) || f.path) : undefined,
                  createdAt: new Date(f.lastModified || Date.now()).toISOString(),
                  updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
                });
              }
            }
          }
        }
      } catch {
        // continue
      }
    }

    // 3. Direct filesystem scan of SD Card & MicroSD for this category
    const sdPaths: string[] = [];
    if (volumes.sdcard?.path) {
      sdPaths.push(volumes.sdcard.path);
    }

    try {
      const storageDir = await RealDeviceStorage.listDirectory({ path: '/storage' }).catch(() => null);
      if (storageDir && storageDir.folders) {
        for (const fold of storageDir.folders) {
          const lower = fold.name.toLowerCase();
          if (lower !== 'emulated' && lower !== 'self' && !sdPaths.includes(fold.path)) {
            sdPaths.push(fold.path);
          }
        }
      }
    } catch {
      // ignore
    }

    for (const p of sdPaths) {
      const sdRes = await scanSdCardMediaFiles(p, category);
      for (const f of sdRes.files) {
        const key = f.url || f.name;
        if (!seen.has(key)) {
          seen.add(key);
          combinedFiles.push(f);
        }
      }
    }

    return combinedFiles;
  } catch (e) {
    console.warn('Category deep scan error:', e);
    return null;
  }
}

/**
 * Dynamically list files and folders inside any real device path (internal or SD card)
 */
export async function listRealDirectoryFiles(targetPath: string): Promise<{
  files: FileItem[];
  folders: FolderItem[];
} | null> {
  const isNative = await isNativePlatform();
  if (!isNative) return null;

  try {
    const res = await RealDeviceStorage.listDirectory({ path: targetPath });
    if (!res || !res.exists) return null;

    const isInternal = targetPath.includes('emulated') || !targetPath.startsWith('/storage/');
    const dev = isInternal ? 'internal' : 'sdcard';

    const files: FileItem[] = (res.files || []).map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      mimeType: f.mimeType,
      folder: f.folder,
      storageDevice: f.storageDevice || dev,
      url: f.path,
      createdAt: new Date(f.lastModified || Date.now()).toISOString(),
      updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
    }));

    const folders: FolderItem[] = (res.folders || []).map(fold => ({
      id: fold.id,
      name: fold.name,
      path: fold.path,
      parentPath: fold.parentPath,
      storageDevice: fold.storageDevice || dev,
      createdAt: new Date(fold.lastModified || Date.now()).toISOString(),
    }));

    return { files, folders };
  } catch (e) {
    console.warn('Failed to dynamically list path:', targetPath, e);
    return null;
  }
}
