/**
 * W3C Media Session API Manager
 * Configures OS Lock Screen, Android Notification Shade, Bluetooth, and Smartwatch controls.
 * Ensures the user can see track info on the lock screen, play/pause, seek forward/backward (+10s / -10s),
 * scrub the progress bar, and switch to next / previous tracks ("gana badal sako aur aage piche kar sako").
 */

import { FileItem } from '../types';
import { generateDefaultCoverArt } from './audioSynthesizer';

export interface MediaSessionConfig {
  file: FileItem | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  playbackRate?: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeekTo: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onStop?: () => void;
}

export function isMediaSessionSupported(): boolean {
  return typeof window !== 'undefined' && 'mediaSession' in navigator;
}

export function resolveAudioArtist(file: FileItem | null): string {
  if (!file) return 'Unknown Artist';
  if (file.artist) return file.artist;
  const name = file.name.toLowerCase();
  if (name.includes('kitni hasrat')) return 'Kumar Sanu, Sadhana Sargam';
  if (name.includes('saiyan se chhup')) return 'Anuradha Paudwal, Udit Narayan';
  if (name.includes('rahman')) return 'A. R. Rahman';
  if (name.includes('retro') || name.includes('90s')) return 'Alka Yagnik, Kumar Sanu';
  if (file.folder && file.folder !== '/' && !file.folder.toLowerCase().includes('download')) {
    return file.folder.replace(/^\//, '').split('/')[0];
  }
  return 'Files Music Player';
}

export function resolveAudioAlbum(file: FileItem | null): string {
  if (!file) return 'Audio';
  if (file.album) return file.album;
  const name = file.name.toLowerCase();
  if (name.includes('kitni hasrat')) return 'Saajan / 90s Romantic Hits';
  if (name.includes('saiyan se chhup')) return 'Bollywood Melodies';
  if (name.includes('rahman')) return 'Best of Rahman';
  if (file.folder && file.folder !== '/') return file.folder.replace(/^\//, '');
  return 'Music Album';
}

/**
 * Configure or update the active OS Lock Screen Media Session
 */
export function syncMediaSession(config: MediaSessionConfig): void {
  if (!isMediaSessionSupported()) return;

  const {
    file,
    isPlaying,
    duration,
    currentTime,
    playbackRate = 1,
    onPlay,
    onPause,
    onNext,
    onPrev,
    onSeekTo,
    onSeekBy,
    onStop
  } = config;

  if (!file) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch (e) {
      console.warn('Error clearing media session:', e);
    }
    return;
  }

  try {
    // 1. Set Track Title, Artist, Album, and multi-resolution Artwork
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    const coverUrl = file.thumbnail || generateDefaultCoverArt(file.name);
    const artist = resolveAudioArtist(file);
    const album = resolveAudioAlbum(file);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: cleanTitle,
      artist: artist,
      album: album,
      artwork: [
        { src: coverUrl, sizes: '96x96', type: 'image/png' },
        { src: coverUrl, sizes: '128x128', type: 'image/png' },
        { src: coverUrl, sizes: '192x192', type: 'image/png' },
        { src: coverUrl, sizes: '256x256', type: 'image/png' },
        { src: coverUrl, sizes: '384x384', type: 'image/png' },
        { src: coverUrl, sizes: '512x512', type: 'image/png' },
      ],
    });

    // 2. Playback State (Essential for lock screen widgets to show Pause vs Play icon)
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // 3. Register All Action Handlers (Seek forward/backward, next/prev tracks, scrub)
    // Play
    setActionHandlerSafe('play', () => {
      onPlay();
    });

    // Pause
    setActionHandlerSafe('pause', () => {
      onPause();
    });

    // Previous Track ("gana badal sako")
    setActionHandlerSafe('previoustrack', () => {
      onPrev();
    });

    // Next Track ("gana badal sako")
    setActionHandlerSafe('nexttrack', () => {
      onNext();
    });

    // Seek Backward ("aage piche kar sako" - default 10s jump)
    setActionHandlerSafe('seekbackward', (details) => {
      const skip = details?.seekOffset || 10;
      onSeekBy(-skip);
    });

    // Seek Forward ("aage piche kar sako" - default 10s jump)
    setActionHandlerSafe('seekforward', (details) => {
      const skip = details?.seekOffset || 10;
      onSeekBy(skip);
    });

    // Seek To (Scrubbing lock screen timeline)
    setActionHandlerSafe('seekto', (details) => {
      if (details?.seekTime !== undefined && details.seekTime >= 0) {
        onSeekTo(details.seekTime);
      }
    });

    // Stop
    setActionHandlerSafe('stop', () => {
      if (onStop) {
        onStop();
      } else {
        onPause();
      }
    });

    // 4. Update Position State (For lock screen seekbar)
    updateMediaSessionPosition(currentTime, duration, playbackRate);
  } catch (err) {
    console.warn('Error syncing MediaSession:', err);
  }
}

/**
 * Safely updates navigator.mediaSession position state
 */
export function updateMediaSessionPosition(
  currentTime: number,
  duration: number,
  playbackRate: number = 1
): void {
  if (!isMediaSessionSupported()) return;

  if (
    'setPositionState' in navigator.mediaSession &&
    duration > 0 &&
    isFinite(duration) &&
    !isNaN(duration)
  ) {
    try {
      const validPosition = Math.max(0, Math.min(currentTime, duration));
      navigator.mediaSession.setPositionState({
        duration: Math.max(duration, 0.1),
        playbackRate: Math.max(0.1, playbackRate),
        position: validPosition,
      });
    } catch (e) {
      // Ignore transient position state errors
    }
  }
}

function setActionHandlerSafe(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch (e) {
    // Some older browsers don't support specific action types (like seekto or seekforward)
  }
}
