import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft,
  X, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  ChevronDown,
  Share2, 
  Star,
  MoreVertical,
  Music, 
  ListMusic, 
  ExternalLink,
  Info,
  Trash2,
  FolderOutput,
  Copy,
  Lock,
  BellRing,
  Gauge,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { openRealFile, shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';

interface AudioPlayerModalProps {
  isOpen: boolean;
  file: FileItem | null;
  playlist: FileItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  playbackSpeed?: number;
  language: Language;
  onClose: () => void;
  onMinimize: () => void;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onChangeSpeed?: (speed: number) => void;
  onSelectTrack: (file: FileItem) => void;
  onToggleStar?: (id: string) => void;
  onMoveToTrash?: (id: string) => void;
  onQuickCopy?: (file: FileItem) => void;
  onQuickCut?: (file: FileItem) => void;
  onMoveToSafeFolder?: (id: string) => void;
  onSetAsRingtone?: (file: FileItem) => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  file,
  playlist,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  playbackSpeed = 1,
  language,
  onClose,
  onMinimize,
  onPlayPause,
  onSeek,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  onChangeSpeed,
  onSelectTrack,
  onToggleStar,
  onMoveToTrash,
  onQuickCopy,
  onQuickCut,
  onMoveToSafeFolder,
  onSetAsRingtone,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'playlist' | 'details'>('player');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  if (!isOpen || !file) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isStarred = file.isStarred || false;

  // Speeds available in Google Files
  const speedOptions = [0.5, 0.8, 1.0, 1.25, 1.5, 2.0];

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-full bg-[#101216] text-white flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. TOP BAR (Matching Google Files 1:1) */}
      <div className="w-full px-3 py-2.5 pt-safe bg-[#101216] border-b border-white/5 shrink-0 flex items-center justify-between z-20">
        {/* Left: Back Arrow */}
        <button
          onClick={() => {
            triggerHapticFeedback();
            onMinimize();
          }}
          className="p-2 text-neutral-200 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
          title={language === 'hi' ? 'पीछे जाएँ' : 'Back'}
        >
          <ArrowLeft size={24} />
        </button>

        {/* Center Title */}
        <div className="flex-1 text-center min-w-0 px-2">
          <span className="text-xs font-semibold text-neutral-300 block truncate">
            {language === 'hi' ? 'ऑडियो प्लेयर' : 'Audio Player'}
          </span>
        </div>

        {/* Right Action Icons: Share, Star, Three-Dots Menu */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          {/* Share */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              if (file.url) {
                shareNativeFile(file.name, `Audio: ${file.name}`, file.url);
              }
            }}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={language === 'hi' ? 'शेयर करें' : 'Share'}
          >
            <Share2 size={20} />
          </button>

          {/* Star / Favorite */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              if (onToggleStar) onToggleStar(file.id);
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isStarred ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            title={isStarred ? 'Starred' : 'Star file'}
          >
            <Star size={20} className={isStarred ? 'fill-amber-400' : ''} />
          </button>

          {/* Three Dots Menu */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={language === 'hi' ? 'अधिक विकल्प' : 'More options'}
          >
            <MoreVertical size={20} />
          </button>

          {/* GOOGLE FILES OPTIONS POPUP MENU */}
          {isMenuOpen && (
            <div className="absolute right-0 top-12 w-64 bg-[#1e2026] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
              {/* 1. Open with */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  if (file.url) openRealFile(file.url);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <ExternalLink size={18} className="text-neutral-400" />
                <span>{language === 'hi' ? 'ऐप के साथ खोलें (Open with)' : 'Open with'}</span>
              </button>

              {/* 2. Move to Trash */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  if (onMoveToTrash) onMoveToTrash(file.id);
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 size={18} />
                <span>{language === 'hi' ? 'ट्रैश में भेजें (Move to Trash)' : 'Move to Trash'}</span>
              </button>

              {/* 3. Move to */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  if (onQuickCut) onQuickCut(file);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <FolderOutput size={18} className="text-neutral-400" />
                <span>{language === 'hi' ? 'स्थानांतरित करें (Move to)' : 'Move to'}</span>
              </button>

              {/* 4. Copy to */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  if (onQuickCopy) onQuickCopy(file);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Copy size={18} className="text-neutral-400" />
                <span>{language === 'hi' ? 'कॉपी करें (Copy to)' : 'Copy to'}</span>
              </button>

              {/* 5. Move to Safe folder */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  if (onMoveToSafeFolder) onMoveToSafeFolder(file.id);
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Lock size={18} className="text-amber-400" />
                <span>{language === 'hi' ? 'सेफ़ फ़ोल्डर में भेजें' : 'Move to Safe folder'}</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              {/* 6. File info */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  setActiveTab('details');
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Info size={18} className="text-blue-400" />
                <span>{language === 'hi' ? 'फ़ाइल की जानकारी (File info)' : 'File info'}</span>
              </button>

              {/* 7. Set as ringtone */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  if (onSetAsRingtone) onSetAsRingtone(file);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <BellRing size={18} className="text-emerald-400" />
                <span>{language === 'hi' ? 'रिंगटोन सेट करें (Set as ringtone)' : 'Set as ringtone'}</span>
              </button>

              {/* 8. Playback speed */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  triggerHapticFeedback();
                  setIsSpeedModalOpen(true);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Gauge size={18} className="text-purple-400" />
                  <span>{language === 'hi' ? 'प्लेबैक स्पीड (Playback speed)' : 'Playback speed'}</span>
                </div>
                <span className="text-xs bg-white/10 font-bold px-2 py-0.5 rounded-md text-amber-300">
                  {playbackSpeed}x
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SEGMENTED TAB SELECTOR (Player / Playlist / Details) */}
      <div className="w-full px-4 py-2 bg-[#121419] border-b border-white/5 flex items-center justify-center shrink-0">
        <div className="inline-flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => {
              triggerHapticFeedback();
              setActiveTab('player');
            }}
            className={`px-4 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'player' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Music size={13} />
            <span>{language === 'hi' ? 'प्लेयर' : 'Player'}</span>
          </button>

          <button
            onClick={() => {
              triggerHapticFeedback();
              setActiveTab('playlist');
            }}
            className={`px-4 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'playlist' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ListMusic size={13} />
            <span>{language === 'hi' ? 'प्लेलिस्ट' : 'Playlist'}</span>
            <span className="text-[10px] opacity-80">({playlist.length})</span>
          </button>

          <button
            onClick={() => {
              triggerHapticFeedback();
              setActiveTab('details');
            }}
            className={`px-4 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'details' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Info size={13} />
            <span>{language === 'hi' ? 'विवरण' : 'Details'}</span>
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* TAB 1: MAIN GOOGLE FILES AUDIO PLAYER */}
        {activeTab === 'player' && (
          <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center text-center space-y-6 animate-in fade-in duration-200">
            {/* ALBUM ART / COVER DISPLAY (Matches Google Files video frame 00:10 1:1) */}
            <div className="relative group my-2 w-full max-w-[280px] aspect-square">
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black relative flex items-center justify-center">
                {file.thumbnail ? (
                  <img 
                    src={file.thumbnail} 
                    alt={file.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-emerald-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-xl">
                      <Music size={40} />
                    </div>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
                      {file.folder || 'Music'}
                    </span>
                  </div>
                )}

                {/* Animated Beat Visualizer Overlay when playing */}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center gap-1.5 px-6">
                    {[35, 75, 100, 60, 90, 45, 80, 55, 95, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-amber-400 rounded-full animate-pulse shadow-sm shadow-amber-400/80"
                        style={{
                          height: `${h}%`,
                          animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TRACK TITLE & SUBTITLE */}
            <div className="space-y-1 w-full px-2">
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2" title={file.name}>
                {file.name}
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                {file.folder ? `${file.folder} • ` : ''}{formatBytes(file.size)}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: PLAYLIST VIEW */}
        {activeTab === 'playlist' && (
          <div className="w-full max-w-lg bg-[#181a20] rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              <span>{language === 'hi' ? 'प्लेलिस्ट ट्रैक सूची' : 'Playlist Tracks'} ({playlist.length})</span>
              <span className="text-amber-400">{isShuffle ? '🔀 Shuffle On' : ''}</span>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {playlist.map((track, idx) => {
                const isSelected = track.id === file.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      triggerHapticFeedback();
                      onSelectTrack(track);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md' 
                        : 'hover:bg-white/5 text-neutral-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {isSelected && isPlaying ? (
                          <Music size={16} className="animate-bounce" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{track.name}</p>
                        <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {formatBytes(track.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: DETAILS */}
        {activeTab === 'details' && (
          <div className="w-full max-w-md bg-[#181a20] rounded-3xl p-5 border border-white/10 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-neutral-100 border-b border-white/10 pb-3">
              {language === 'hi' ? 'ऑडियो जानकारी' : 'Track Details'}
            </h3>
            <div className="space-y-3 text-xs text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[10px] font-medium uppercase tracking-wider">{language === 'hi' ? 'नाम' : 'Song Name'}</span>
                <span className="font-semibold text-white break-words mt-0.5 block text-sm">{file.name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-medium uppercase tracking-wider">{language === 'hi' ? 'अवधि' : 'Duration'}</span>
                <span className="font-mono text-amber-400 font-semibold">{formatTime(duration)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-medium uppercase tracking-wider">{language === 'hi' ? 'आकार' : 'Size'}</span>
                <span>{formatBytes(file.size)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-medium uppercase tracking-wider">{language === 'hi' ? 'फ़ोल्डर पथ' : 'Folder Path'}</span>
                <span className="font-mono text-blue-400 break-all">{file.folder}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-medium uppercase tracking-wider">{language === 'hi' ? 'प्लेबैक स्पीड' : 'Playback Speed'}</span>
                <span className="text-amber-300 font-bold">{playbackSpeed}x</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM CONTROLLER (Progress Bar + Play/Pause Controls) */}
      <div className="w-full p-4 pb-safe bg-[#0d0f13] border-t border-white/10 space-y-3 shrink-0">
        <div className="max-w-md mx-auto w-full space-y-3">
          {/* Progress Timeline Scrubber */}
          <div className="space-y-1">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime || 0}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-hidden"
              />
              <div 
                className="absolute top-0 left-0 h-1.5 bg-white rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Core Controls Row (Shuffle, Prev, Play/Pause, Next, Repeat) */}
          <div className="flex items-center justify-between px-2 sm:px-4">
            {/* Shuffle */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleShuffle();
              }}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                isShuffle ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle size={20} />
            </button>

            {/* Previous */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onPrev();
              }}
              className="p-2.5 text-neutral-200 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack size={26} />
            </button>

            {/* Big Round Play / Pause Button */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onPlayPause();
              }}
              className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold flex items-center justify-center shadow-xl transition-all cursor-pointer shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={28} className="fill-black" />
              ) : (
                <Play size={28} className="fill-black ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onNext();
              }}
              className="p-2.5 text-neutral-200 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={26} />
            </button>

            {/* Repeat */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleRepeat();
              }}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                repeatMode !== 'off' ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* PLAYBACK SPEED SELECTION MODAL */}
      {isSpeedModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsSpeedModalOpen(false)}
        >
          <div 
            className="w-full max-w-xs bg-[#1e2026] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 font-bold text-sm text-neutral-100">
                <Gauge size={18} className="text-purple-400" />
                <span>{language === 'hi' ? 'प्लेबैक स्पीड' : 'Playback Speed'}</span>
              </div>
              <button
                onClick={() => setIsSpeedModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              {speedOptions.map((spd) => {
                const isSelected = playbackSpeed === spd;
                return (
                  <button
                    key={spd}
                    onClick={() => {
                      triggerHapticFeedback();
                      if (onChangeSpeed) onChangeSpeed(spd);
                      setIsSpeedModalOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-white/5 text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    <span>{spd === 1.0 ? (language === 'hi' ? 'सामान्य (Normal 1.0x)' : 'Normal (1.0x)') : `${spd}x`}</span>
                    {isSelected && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
