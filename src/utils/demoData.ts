import { FileItem } from '../types';
import { initialFiles, initialFolders } from '../data/initialFiles';

export const STORAGE_HIDE_DEMO_KEY = 'akash_files_hide_demo';

/**
 * Checks if a given file is a built-in demo/sample file
 */
export function isDemoFile(file: FileItem): boolean {
  if (file.isDemo) return true;
  const demoPrefixes = ['img-', 'vid-', 'aud-', 'doc-', 'app-', 'arch-'];
  return demoPrefixes.some(prefix => file.id.startsWith(prefix));
}

/**
 * Filter out all demo/sample mock files, leaving only user-created, uploaded, or real device files
 */
export function filterOutDemoFiles(files: FileItem[]): FileItem[] {
  return files.filter(f => !isDemoFile(f));
}

/**
 * Check if the current file list contains any demo files
 */
export function hasDemoFiles(files: FileItem[]): boolean {
  return files.some(f => isDemoFile(f));
}

/**
 * Check if demo mode is disabled in user preferences
 */
export function isDemoModeDisabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_HIDE_DEMO_KEY) === 'true';
  } catch {
    return false;
  }
}
