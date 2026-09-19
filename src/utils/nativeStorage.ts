import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { FileItem, FolderItem } from '../types';
import { classifyFile } from './fileClassifier';
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
  files?: string[]
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
      const shareData: ShareData = {
        title,
        text,
        url: url && url.startsWith('http') ? url : window.location.href,
      };
      await navigator.share(shareData);
      return true;
    } catch (webShareErr: unknown) {
      if ((webShareErr as Error)?.name === 'AbortError') {
        return true; // User cancelled the share sheet cleanly
      }
      console.warn('Web Share API error:', webShareErr);
    }
  }

  // 3. Fallback: Copy to clipboard or trigger download
  try {
    if (url && (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http'))) {
      const a = document.createElement('a');
      a.href = url;
      a.download = title || 'shared-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${title}\n${text}`);
      return true;
    }
  } catch (fallbackErr) {
    console.error('All share methods failed:', fallbackErr);
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
    const res = await RealDeviceStorage.openFileWithApp({ path });
    return res.success;
  } catch (e) {
    console.error('Open file error:', e);
    return false;
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

        collectedFiles.push({
          id: f.id,
          name: f.name,
          size: f.size,
          type: resolvedType,
          mimeType: f.mimeType || classification.mimeType,
          folder: f.folder,
          storageDevice: f.storageDevice || (f.path.includes('emulated') ? 'internal' : 'sdcard'),
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

            collectedFiles.push({
              id: f.id,
              name: f.name,
              size: f.size,
              type: resolvedType,
              mimeType: f.mimeType || classification.mimeType,
              folder: f.folder,
              storageDevice: f.storageDevice || (f.path.includes('emulated') ? 'internal' : 'sdcard'),
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
          storageDevice: fold.storageDevice,
          createdAt: new Date(fold.lastModified || Date.now()).toISOString(),
        });
      }
    }

    // Add SD card root if detected
    if (volumes.sdcard) {
      collectedFolders.unshift({
        id: 'sdcard-root',
        name: volumes.sdcard.name,
        path: volumes.sdcard.path,
        parentPath: '',
        storageDevice: 'sdcard',
        createdAt: new Date().toISOString(),
      });
      // Also list SD card root folders & files
      try {
        const sdList = await RealDeviceStorage.listDirectory({ path: volumes.sdcard.path });
        if (sdList) {
          if (sdList.folders) {
            for (const fold of sdList.folders) {
              collectedFolders.push({
                id: fold.id,
                name: fold.name,
                path: fold.path,
                parentPath: fold.parentPath,
                storageDevice: 'sdcard',
                createdAt: new Date(fold.lastModified || Date.now()).toISOString(),
              });
            }
          }
          if (sdList.files) {
            for (const f of sdList.files) {
              const key = f.path || f.name;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueFiles.push({
                  id: f.id,
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  mimeType: f.mimeType,
                  folder: f.folder,
                  storageDevice: 'sdcard',
                  url: f.path,
                  createdAt: new Date(f.lastModified || Date.now()).toISOString(),
                  updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
                });
              }
            }
          }
        }
      } catch {
        // SD read fallback
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
  if (!isNative) return null;

  try {
    const res = await RealDeviceStorage.scanMediaCategory({ category });
    if (!res || !res.files) return null;

    return res.files.map(f => {
      const webUrl = resolveMediaSrc(f.path) || f.path;
      
      const classification = classifyFile(f.name, f.mimeType);
      const resolvedType = f.type && f.type !== 'other' ? f.type : classification.type;

      return {
        id: f.id,
        name: f.name,
        size: f.size,
        type: resolvedType,
        mimeType: f.mimeType || classification.mimeType,
        folder: f.folder,
        storageDevice: f.storageDevice || (f.path.includes('emulated') ? 'internal' : 'sdcard'),
        url: f.path,
        thumbnail: resolvedType === 'image' || resolvedType === 'video' ? webUrl : undefined,
        createdAt: new Date(f.lastModified || Date.now()).toISOString(),
        updatedAt: new Date(f.lastModified || Date.now()).toISOString(),
      };
    });
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
