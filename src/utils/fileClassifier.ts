import { FileItem, FileType, FileCategory } from '../types';

export interface FileClassification {
  type: FileType;
  mimeType: string;
  category: FileCategory;
  extension: string;
}

const EXT_REGEX = /\.([a-zA-Z0-9]+)$/;

export function getFileExtension(filename: string): string {
  const match = filename.match(EXT_REGEX);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Universal file type and category detector based on filename and optional mime
 */
export function classifyFile(filename: string, mime?: string): FileClassification {
  const ext = getFileExtension(filename);
  const lowerMime = (mime || '').toLowerCase();

  // 1. Audio check
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma', 'amr', 'mid', 'midi', 'aiff', 'alac', 'ape', 'ac3', 'dts', 'mka', 'ra', 'pcm'];
  if (lowerMime.startsWith('audio/') || audioExtensions.includes(ext)) {
    return {
      type: 'audio',
      mimeType: mime || `audio/${ext === 'mp3' ? 'mpeg' : ext}`,
      category: 'audio',
      extension: ext,
    };
  }

  // 2. Video check
  const videoExtensions = ['mp4', 'mkv', 'webm', 'avi', 'mov', '3gp', 'flv', 'wmv', 'ts', 'm4v', 'ogv', 'vob', 'divx', 'f4v', 'rmvb', 'mpg', 'mpeg', 'm2ts'];
  if (lowerMime.startsWith('video/') || videoExtensions.includes(ext)) {
    return {
      type: 'video',
      mimeType: mime || `video/${ext === 'mov' ? 'quicktime' : ext}`,
      category: 'videos',
      extension: ext,
    };
  }

  // 3. Image check
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif', 'raw', 'avif', 'ico', 'tiff', 'tif', 'cr2', 'nef', 'arw', 'dng'];
  if (lowerMime.startsWith('image/') || imageExtensions.includes(ext)) {
    return {
      type: 'image',
      mimeType: mime || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      category: 'images',
      extension: ext,
    };
  }

  // 4. Apps (APK) check
  const apkExtensions = ['apk', 'xapk', 'apks', 'aab', 'ipa'];
  if (lowerMime.includes('android.package-archive') || apkExtensions.includes(ext)) {
    return {
      type: 'apk',
      mimeType: 'application/vnd.android.package-archive',
      category: 'apps',
      extension: ext,
    };
  }

  // 5. Archives
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'tgz'];
  if (archiveExtensions.includes(ext) || lowerMime.includes('zip') || lowerMime.includes('compressed')) {
    return {
      type: 'archive',
      mimeType: mime || 'application/zip',
      category: 'documents',
      extension: ext,
    };
  }

  // 6. Documents
  const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'tsv', 'odt', 'ods', 'odp', 'epub', 'mobi', 'md', 'pages', 'numbers', 'key', 'json', 'xml', 'html', 'htm'];
  if (
    documentExtensions.includes(ext) ||
    lowerMime.includes('pdf') ||
    lowerMime.includes('document') ||
    lowerMime.includes('sheet') ||
    lowerMime.includes('presentation') ||
    lowerMime.includes('text/')
  ) {
    return {
      type: 'document',
      mimeType: mime || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      category: 'documents',
      extension: ext,
    };
  }

  return {
    type: 'other',
    mimeType: mime || 'application/octet-stream',
    category: 'documents',
    extension: ext,
  };
}

/**
 * Checks whether a given file belongs to a requested category
 */
export function isFileInCategory(file: FileItem, category: FileCategory): boolean {
  if (file.isTrash && category !== 'trash') return false;
  if (file.isSafe && category !== 'safe') return false;

  switch (category) {
    case 'downloads':
      return (
        file.folder.toLowerCase().includes('download') ||
        file.name.toLowerCase().includes('download')
      );

    case 'images': {
      if (file.type === 'image') return true;
      const { category: cat } = classifyFile(file.name, file.mimeType);
      return cat === 'images';
    }

    case 'videos': {
      if (file.type === 'video') return true;
      const { category: cat } = classifyFile(file.name, file.mimeType);
      return cat === 'videos';
    }

    case 'audio': {
      if (file.type === 'audio') return true;
      const { category: cat } = classifyFile(file.name, file.mimeType);
      return cat === 'audio';
    }

    case 'documents': {
      if (file.type === 'document' || file.type === 'archive' || file.type === 'other') return true;
      const { category: cat } = classifyFile(file.name, file.mimeType);
      return cat === 'documents';
    }

    case 'apps': {
      if (file.type === 'apk') return true;
      const { category: cat } = classifyFile(file.name, file.mimeType);
      return cat === 'apps';
    }

    case 'starred':
      return !!file.isStarred;

    case 'safe':
      return !!file.isSafe;

    case 'trash':
      return !!file.isTrash;

    default:
      return true;
  }
}
