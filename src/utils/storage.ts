import { FileItem, FolderItem, StorageBreakdown, FileCategory, SortOption } from '../types';
import { isFileInCategory, classifyFile } from './fileClassifier';

export const TOTAL_STORAGE_BYTES = 64 * 1024 * 1024 * 1024; // 64 GB
export const SYSTEM_BYTES = 12.4 * 1024 * 1024 * 1024; // 12.4 GB Android OS
export const APPS_BASE_BYTES = 15.6 * 1024 * 1024 * 1024; // 15.6 GB installed apps

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function computeStorage(
  files: FileItem[], 
  junkBytes: number,
  realTotal?: number,
  realUsed?: number
): StorageBreakdown {
  const activeFiles = files.filter(f => !f.isTrash);
  
  let images = 0;
  let videos = 0;
  let audio = 0;
  let documents = 0;
  let apkSize = 0;
  let trash = 0;

  files.forEach(f => {
    if (f.isTrash) {
      trash += f.size;
    } else {
      const { category } = classifyFile(f.name, f.mimeType);
      switch (category) {
        case 'images':
          images += f.size;
          break;
        case 'videos':
          videos += f.size;
          break;
        case 'audio':
          audio += f.size;
          break;
        case 'apps':
          apkSize += f.size;
          break;
        case 'documents':
        default:
          documents += f.size;
          break;
      }
    }
  });

  const total = realTotal && realTotal > 0 ? realTotal : TOTAL_STORAGE_BYTES;
  const apps = APPS_BASE_BYTES + apkSize;
  const userFilesTotal = activeFiles.reduce((acc, f) => acc + f.size, 0);
  const used = realUsed && realUsed > 0 ? realUsed : (SYSTEM_BYTES + apps + userFilesTotal + junkBytes);
  const free = Math.max(0, total - used);

  return {
    total,
    used,
    free,
    system: SYSTEM_BYTES,
    apps,
    images,
    videos,
    audio,
    documents,
    trash,
    junk: junkBytes,
  };
}

export function filterFilesByCategory(files: FileItem[], category: FileCategory): FileItem[] {
  return files.filter(f => isFileInCategory(f, category));
}

export function sortFiles(files: FileItem[], sortOption: SortOption): FileItem[] {
  const copy = [...files];
  switch (sortOption) {
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case 'date-desc':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'date-asc':
      return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'size-desc':
      return copy.sort((a, b) => b.size - a.size);
    case 'size-asc':
      return copy.sort((a, b) => a.size - b.size);
    default:
      return copy;
  }
}
