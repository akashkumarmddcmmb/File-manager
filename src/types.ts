export type FileCategory = 
  | 'downloads'
  | 'images'
  | 'videos'
  | 'audio'
  | 'documents'
  | 'apps'
  | 'starred'
  | 'safe'
  | 'trash';

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'apk' | 'other';

export type StorageDevice = 'internal' | 'sdcard';

export interface FileItem {
  id: string;
  name: string;
  size: number; // in bytes
  type: FileType;
  mimeType: string;
  folder: string; // e.g. "/DCIM/Camera", "/Download", "/Documents"
  storageDevice?: StorageDevice; // 'internal' | 'sdcard'
  createdAt: string;
  updatedAt: string;
  url?: string;
  content?: string;
  thumbnail?: string;
  isStarred?: boolean;
  isSafe?: boolean;
  isTrash?: boolean;
  trashDate?: string;
  isDuplicate?: boolean;
  duplicateGroup?: string;
  isLarge?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  path: string; // e.g. "/DCIM/Camera"
  parentPath: string; // e.g. "/DCIM" or "/"
  storageDevice?: StorageDevice;
  createdAt: string;
}

export interface TransferTask {
  id: string;
  operation: 'copy' | 'move';
  sourceDevice: StorageDevice;
  targetDevice: StorageDevice;
  targetFolder: string;
  files: FileItem[];
  currentFileIndex: number;
  totalBytes: number;
  transferredBytes: number;
  speedMbps: number; // live speed in MB/s
  speedSetting: number; // target base speed in MB/s
  timeRemainingSec: number;
  status: 'transferring' | 'completed' | 'cancelled';
}

export interface StorageBreakdown {
  total: number; // total bytes (e.g. 64 * 1024 * 1024 * 1024)
  used: number;
  free: number;
  system: number;
  apps: number;
  images: number;
  videos: number;
  audio: number;
  documents: number;
  trash: number;
  junk: number;
}

export type TabType = 'clean' | 'browse' | 'share';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
export type Language = 'hi' | 'en';

export interface ClipboardState {
  operation: 'copy' | 'move';
  files: FileItem[];
}

export type AuthProvider = 'google' | 'microsoft';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  avatar?: string;
  signedInAt?: string;
}
