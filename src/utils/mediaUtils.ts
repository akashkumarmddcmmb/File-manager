import { Capacitor } from '@capacitor/core';
import { FileItem } from '../types';

/**
 * Resolves a local or remote file path into a WebView-renderable URL.
 * In Capacitor Android WebView, this converts native `/storage/...` paths
 * to `http://localhost/_capacitor_file_/storage/...` so images, videos, and audio can be loaded directly.
 */
export function resolveMediaSrc(urlOrPath?: string): string | undefined {
  if (!urlOrPath) return undefined;

  // If already standard web URL, blob URL, or data URI
  if (
    urlOrPath.startsWith('http://') ||
    urlOrPath.startsWith('https://') ||
    urlOrPath.startsWith('data:') ||
    urlOrPath.startsWith('blob:')
  ) {
    return urlOrPath;
  }

  // Native filesystem path (/storage/emulated/0/... or file://...)
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.convertFileSrc) {
      const converted = Capacitor.convertFileSrc(urlOrPath);
      // Properly encode URI characters (spaces, brackets, special symbols)
      // to avoid Java IllegalArgumentException in Android WebView
      return encodeURI(converted);
    }
  } catch (err) {
    console.warn('Capacitor convertFileSrc error:', err);
  }

  return encodeURI(urlOrPath);
}

/**
 * Returns the best resolved preview / thumbnail source for a FileItem
 */
export function getFileThumbnailUrl(file: FileItem): string | undefined {
  if (file.thumbnail) {
    return resolveMediaSrc(file.thumbnail);
  }
  if (file.url) {
    return resolveMediaSrc(file.url);
  }
  return undefined;
}
