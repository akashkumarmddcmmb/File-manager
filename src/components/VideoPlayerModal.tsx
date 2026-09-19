import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Share2, 
  Film,
  PictureInPicture2,
  Ratio,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { openRealFile, shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';

interface VideoPlayerModalProps {
  isOpen: boolean;
  file: FileItem | null;
  language: Language;
  onClose: () => void;
  onToggleStar?: (id: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  file,
  language,
  onClose,
  onToggleStar,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3.5s of no touch/mouse interaction
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3500);
  };

  useEffect(() => {
    if (isOpen) {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isOpen, isPlaying]);

  if (!isOpen || !file) return null;

  const resolvedSrc = file.url && file.url.startsWith('/') 
    ? Capacitor.convertFileSrc(file.url) 
    : file.url;

  const handlePlayPause = () => {
    triggerHapticFeedback();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      resetControlsTimeout();
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSkip = (seconds: number) => {
    triggerHapticFeedback();
    if (videoRef.current) {
      const next = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
      videoRef.current.currentTime = next;
      setCurrentTime(next);
      resetControlsTimeout();
    }
  };

  const handleSpeedChange = (rate: number) => {
    triggerHapticFeedback();
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      resetControlsTimeout();
    }
  };

  const toggleFullscreen = () => {
    triggerHapticFeedback();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  };

  const togglePictureInPicture = async () => {
    triggerHapticFeedback();
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error', e);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 w-full h-full bg-black text-white flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={resetControlsTimeout}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* 1. TOP APP BAR OVERLAY */}
      <div 
        className={`w-full z-30 transition-all duration-300 bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 py-3 pt-safe flex items-center justify-between gap-3 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="p-2.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={22} />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold truncate text-white leading-tight" title={file.name}>
              {file.name}
            </h3>
            <p className="text-[11px] text-neutral-400 truncate">
              {formatBytes(file.size)} • {file.folder}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Aspect Ratio Fit */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              setFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
            }}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={fitMode === 'contain' ? 'Fit Screen' : 'Fill Screen'}
          >
            <Ratio size={19} />
          </button>

          {/* PiP */}
          <button
            onClick={togglePictureInPicture}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Picture in Picture"
          >
            <PictureInPicture2 size={19} />
          </button>

          {/* Open in phone video player */}
          {file.url && (
            <button
              onClick={() => {
                triggerHapticFeedback();
                openRealFile(file.url!);
              }}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title={language === 'hi' ? 'फ़ोन वीडियो प्लेयर में चलाएं' : 'Open in Phone Video Player'}
            >
              <ExternalLink size={19} />
            </button>
          )}

          {/* Full Screen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={isBrowserFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isBrowserFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
          </button>

          {/* Share */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              if (file.url) shareNativeFile(file.name, `Video: ${file.name}`, file.url);
            }}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={19} />
          </button>
        </div>
      </div>

      {/* 2. FULL SCREEN VIDEO CANVAS */}
      <div 
        className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden"
        onClick={handlePlayPause}
      >
        <video
          ref={videoRef}
          src={resolvedSrc}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} bg-black select-none`}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Center Quick Skip & Play Indicators */}
        <div 
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-10 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-8 sm:gap-16 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleSkip(-10)}
              className="p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white transition-all backdrop-blur-md cursor-pointer border border-white/10 shadow-xl"
              title="-10 seconds"
            >
              <RotateCcw size={28} />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-rose-600/40 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={34} className="fill-white" />
              ) : (
                <Play size={34} className="fill-white ml-1" />
              )}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white transition-all backdrop-blur-md cursor-pointer border border-white/10 shadow-xl"
              title="+10 seconds"
            >
              <RotateCw size={28} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM CONTROL BAR OVERLAY */}
      <div 
        className={`w-full z-30 transition-all duration-300 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 py-4 pb-safe space-y-2.5 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Slider */}
        <div className="space-y-1">
          <div className="relative group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime || 0}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-neutral-700/80 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-hidden"
            />
            <div 
              className="absolute top-0 left-0 h-2 bg-rose-500 rounded-lg pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-300 font-mono font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Bottom Control Strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-rose-400 p-1.5 cursor-pointer"
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button
              onClick={() => {
                triggerHapticFeedback();
                setIsMuted(!isMuted);
              }}
              className="text-neutral-300 hover:text-white p-1.5 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            <span className="text-xs text-neutral-300 font-mono hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 relative">
            {/* Playback speed selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer border border-white/10"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 z-30 min-w-[80px]">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-3 py-1.5 text-xs rounded-xl text-left transition-colors cursor-pointer ${
                        playbackRate === rate ? 'bg-rose-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-neutral-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title={isBrowserFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isBrowserFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
