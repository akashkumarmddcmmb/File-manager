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
  Settings, 
  ExternalLink, 
  Share2, 
  Film,
  Sparkles,
  PictureInPicture2,
  Ratio
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={() => resetControlsTimeout()}
    >
      <div 
        ref={containerRef}
        className="relative w-full h-full sm:max-w-4xl sm:max-h-[88vh] bg-black sm:rounded-3xl overflow-hidden flex flex-col justify-center border border-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={resolvedSrc}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => setIsPlaying(false)}
          onClick={handlePlayPause}
        />

        {/* Top Control Bar (Overlay) */}
        <div 
          className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-4 flex items-center justify-between text-white transition-opacity duration-300 z-20 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <button
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X size={22} />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate" title={file.name}>
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
              <Ratio size={18} />
            </button>

            {/* PiP */}
            <button
              onClick={togglePictureInPicture}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <PictureInPicture2 size={18} />
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
                <ExternalLink size={18} />
              </button>
            )}

            {/* Share */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                if (file.url) shareNativeFile(file.name, `Video: ${file.name}`, file.url);
              }}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Center Quick Skip & Play Indicators (Overlay) */}
        <div 
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-10 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-8 sm:gap-14 pointer-events-auto">
            <button
              onClick={() => handleSkip(-10)}
              className="p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/70 active:scale-95 text-white transition-all backdrop-blur-xs cursor-pointer"
              title="-10 seconds"
            >
              <RotateCcw size={26} />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={32} className="fill-white" />
              ) : (
                <Play size={32} className="fill-white ml-1" />
              )}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/70 active:scale-95 text-white transition-all backdrop-blur-xs cursor-pointer"
              title="+10 seconds"
            >
              <RotateCw size={26} />
            </button>
          </div>
        </div>

        {/* Bottom Control Bar (Overlay) */}
        <div 
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-5 space-y-2.5 transition-opacity duration-300 z-20 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
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
                className="w-full h-1.5 bg-neutral-700/80 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-hidden"
              />
              <div 
                className="absolute top-0 left-0 h-1.5 bg-rose-500 rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-300 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Bottom Control Strip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-rose-400 p-1 cursor-pointer"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setIsMuted(!isMuted);
                }}
                className="text-neutral-300 hover:text-white p-1 cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <span className="text-xs text-neutral-300 font-mono hidden sm:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Playback speed selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {playbackRate}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 z-30 min-w-[72px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`px-3 py-1.5 text-xs rounded-lg text-left transition-colors ${
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
                className="p-1.5 text-neutral-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
