import { FileItem, FolderItem, StorageBreakdown, FileCategory, SortOption } from '../types';

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
      switch (f.type) {
        case 'image':
          images += f.size;
          break;
        case 'video':
          videos += f.size;
          break;
        case 'audio':
          audio += f.size;
          break;
        case 'document':
          documents += f.size;
          break;
        case 'apk':
          apkSize += f.size;
          break;
        default:
          documents += f.size;
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
  switch (category) {
    case 'downloads':
      return files.filter(f => !f.isTrash && !f.isSafe && (f.folder.toLowerCase().includes('download')));
    case 'images':
      return files.filter(f => !f.isTrash && !f.isSafe && f.type === 'image');
    case 'videos':
      return files.filter(f => !f.isTrash && !f.isSafe && f.type === 'video');
    case 'audio':
      return files.filter(f => !f.isTrash && !f.isSafe && f.type === 'audio');
    case 'documents':
      return files.filter(f => !f.isTrash && !f.isSafe && (f.type === 'document' || f.type === 'archive' || f.type === 'other'));
    case 'apps':
      return files.filter(f => !f.isTrash && !f.isSafe && (f.type === 'apk' || f.name.endsWith('.apk')));
    case 'starred':
      return files.filter(f => !f.isTrash && !f.isSafe && f.isStarred);
    case 'safe':
      return files.filter(f => !f.isTrash && f.isSafe);
    case 'trash':
      return files.filter(f => f.isTrash);
    default:
      return files.filter(f => !f.isTrash && !f.isSafe);
  }
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
