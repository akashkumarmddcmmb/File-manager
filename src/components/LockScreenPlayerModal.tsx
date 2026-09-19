import React, { useState, useEffect, useRef } from 'react';
import { 
  Cast, 
  Volume2, 
  Flashlight, 
  Camera, 
  Check, 
  X,
  Speaker,
  Headphones,
  Tv,
  Radio
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { triggerHapticFeedback } from '../utils/nativeStorage';
import { AndroidMediaCard } from './AndroidMediaCard';

interface LockScreenPlayerModalProps {
  isOpen: boolean;
  file: FileItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  language: Language;
  onClose: () => void;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
}

export const LockScreenPlayerModal: React.FC<LockScreenPlayerModalProps> = ({
  isOpen,
  file,
  isPlaying,
  currentTime,
  duration,
  language,
  onClose,
  onPlayPause,
  onSeek,
  onNext,
  onPrev,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [networkSpeed, setNetworkSpeed] = useState('0.00 KB/s');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isOutputSheetOpen, setIsOutputSheetOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<'speaker' | 'bluetooth' | 'cast'>('speaker');
  const [outputVolume, setOutputVolume] = useState(85);

  const touchStartYRef = useRef<number | null>(null);

  // Real-time lock screen clock matching user's phone format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // 12-hour format without AM/PM like Android lock screen (e.g. 3:01)
      const hours = now.getHours() % 12 || 12;
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);

      // "Sat, Sep 19" format
      if (language === 'hi') {
        const weekdayHi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'][now.getDay()];
        const monthHi = ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अग', 'सितं', 'अक्टू', 'नव', 'दिसं'][now.getMonth()];
        setDateStr(`${weekdayHi}, ${now.getDate()} ${monthHi}`);
      } else {
        const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
        const month = now.toLocaleDateString('en-US', { month: 'short' });
        setDateStr(`${weekday}, ${month} ${now.getDate()}`);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [language]);

  // Network speed fluctuations (e.g., 0.00 KB/s as in screenshot)
  useEffect(() => {
    if (!isOpen) return;
    const speeds = ['0.00 KB/s', '1.24 KB/s', '0.00 KB/s', '2.10 KB/s'];
    let idx = 0;
    const speedTimer = setInterval(() => {
      idx = (idx + 1) % speeds.length;
      setNetworkSpeed(speeds[idx]);
    }, 4000);
    return () => clearInterval(speedTimer);
  }, [isOpen]);

  if (!isOpen) return null;

  // Swipe up to unlock handler
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      if (deltaY < -50) {
        // Swiped up
        triggerHapticFeedback();
        onClose();
      }
      touchStartYRef.current = null;
    }
  };

  return (
    <div 
      id="screen-lock-modal-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 w-full h-full text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden animate-in fade-in duration-300"
      style={{
        background: 'linear-gradient(175deg, #181236 0%, #261b47 30%, #3e2866 50%, #907e9e 75%, #ebe2ed 100%)',
      }}
    >
      {/* Exact soft organic wallpaper curves matching the user's screenshot */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-90" 
        preserveAspectRatio="none" 
        viewBox="0 0 400 800"
      >
        <defs>
          <linearGradient id="curveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#432c6e" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#87759d" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f3eae4" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#251648" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#685482" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ded1dc" stopOpacity="0.9" />
          </linearGradient>
          <filter id="wallpaperBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        {/* Soft curving petal/waves from screenshot */}
        <path 
          d="M0,320 C100,280 200,340 280,440 C340,520 380,620 400,680 L400,800 L0,800 Z" 
          fill="url(#curveGrad1)" 
          filter="url(#wallpaperBlur)"
        />
        <path 
          d="M0,520 C90,460 210,540 310,640 C360,690 390,750 400,800 L0,800 Z" 
          fill="url(#curveGrad2)" 
          filter="url(#wallpaperBlur)"
        />
      </svg>

      {/* Flashlight screen illumination beam effect */}
      {isFlashlightOn && (
        <div className="absolute inset-0 bg-white/35 backdrop-blur-xs pointer-events-none z-30 animate-pulse transition-opacity duration-300" />
      )}

      {/* 1. TOP STATUS BAR (Exact match to screenshot: Jio True5G – Vi India, 0.00 KB/s, Vo5G 1, VoLTE 2, 5G+, Battery 46%) */}
      <div className="w-full flex items-center justify-between text-xs text-white/95 z-20 pt-safe font-sans select-none">
        {/* Left: Carrier */}
        <div className="flex items-center gap-1.5 font-medium tracking-tight text-[13px] text-white drop-shadow-xs">
          <span>Jio True5G – Vi India</span>
        </div>

        {/* Right: Network speed, Vo5G/VoLTE, Signal Bars, 5G+, Battery with 46% */}
        <div className="flex items-center gap-1.5 text-[11px] font-sans text-white drop-shadow-xs">
          {/* Live speed meter */}
          <div className="flex flex-col items-end leading-none text-[9px] font-mono mr-0.5">
            <span>{networkSpeed.split(' ')[0]}</span>
            <span className="text-[8px] opacity-80">{networkSpeed.split(' ')[1]}</span>
          </div>

          {/* Vo5G 1 & VoLTE 2 Badges from screenshot */}
          <div className="flex flex-col text-[7px] font-bold leading-none border border-white/40 rounded-xs px-0.5 py-[1px] text-white/90">
            <span>Vo5G 1</span>
            <span>VoLTE 2</span>
          </div>

          {/* Signal bars */}
          <div className="flex items-end gap-[1px] h-3 px-0.5">
            <div className="w-[2px] h-1 bg-white rounded-xs" />
            <div className="w-[2px] h-1.5 bg-white rounded-xs" />
            <div className="w-[2px] h-2 bg-white rounded-xs" />
            <div className="w-[2px] h-2.5 bg-white rounded-xs" />
            <div className="w-[2px] h-3 bg-white rounded-xs" />
          </div>

          {/* 5G+ Badge */}
          <span className="text-[10px] font-bold tracking-tight px-0.5">5G+</span>

          {/* Battery pill with 46% inside (as in screenshot) */}
          <div className="relative flex items-center">
            <div className="w-7 h-3.5 border border-white/90 rounded-full px-1 flex items-center justify-center relative">
              <span className="text-[9px] font-bold text-white leading-none">46</span>
              <div 
                className="absolute left-0.5 top-0.5 bottom-0.5 bg-white/30 rounded-full pointer-events-none"
                style={{ width: '46%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. BIG DIGITAL CLOCK & DATE (Exact Android Lockscreen layout: Sat, Sep 19 on top, then huge 3:01) */}
      <div className="w-full text-center mt-6 sm:mt-10 z-20 space-y-0.5">
        <p className="text-base sm:text-lg font-normal tracking-wide text-white/95 drop-shadow-sm">
          {dateStr}
        </p>
        <h1 className="text-8xl sm:text-[110px] font-normal font-sans tracking-tight text-white leading-none drop-shadow-md py-1">
          {timeStr}
        </h1>
      </div>

      {/* 3. HERO MP3 PLAYER CARD (Exact Pixel-to-Pixel match to the User's Red Box!) */}
      <div className="w-full z-20 my-auto py-2">
        <AndroidMediaCard
          file={file}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          language={language}
          onPlayPause={onPlayPause}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
          onOpenOutputSheet={() => setIsOutputSheetOpen(true)}
        />
      </div>

      {/* 4. BOTTOM SHORTCUTS & UNLOCK (Flashlight on Left, Camera on Right, Unlock in Center) */}
      <div className="w-full flex items-center justify-between z-20 pb-safe pt-4 px-2">
        {/* Flashlight Shortcut (Circular Button with Flashlight Icon) */}
        <button
          id="btn-lockscreen-flashlight"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            setIsFlashlightOn(!isFlashlightOn);
          }}
          className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg ${
            isFlashlightOn 
              ? 'bg-amber-400 text-neutral-950 shadow-amber-400/50' 
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={isFlashlightOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
        >
          <Flashlight size={22} className={isFlashlightOn ? 'fill-neutral-950 text-neutral-950' : 'text-neutral-950'} />
        </button>

        {/* Center: Tap or Swipe up to unlock */}
        <button
          id="btn-lockscreen-unlock-hint"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            onClose();
          }}
          className="text-center cursor-pointer group active:scale-95 transition-transform px-4 py-2"
        >
          <span className="text-[11px] sm:text-xs text-white/75 font-normal tracking-wide group-hover:text-white transition-colors">
            {language === 'hi' ? 'अनलॉक करने के लिए ऊपर स्वाइप करें' : 'Swipe up to unlock'}
          </span>
        </button>

        {/* Camera Shortcut (Circular Button with Camera Icon) */}
        <button
          id="btn-lockscreen-camera"
          type="button"
          onClick={() => {
            triggerHapticFeedback();
            onClose();
          }}
          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md flex items-center justify-center text-neutral-950 transition-all cursor-pointer shadow-lg"
          title="Open Camera"
        >
          <Camera size={22} />
        </button>
      </div>

      {/* 5. ANDROID MATERIAL YOU MEDIA OUTPUT BOTTOM SHEET (Opened via Cast Icon on the Card) */}
      {isOutputSheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsOutputSheetOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#232429] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-emerald-400" />
                <h3 className="text-base font-semibold text-white">
                  {language === 'hi' ? 'मीडिया आउटपुट डिवाइस' : 'Media Output'}
                </h3>
              </div>
              <button 
                onClick={() => setIsOutputSheetOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Playing Track Info */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                {file?.thumbnail ? (
                  <img src={file.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Volume2 size={20} className="m-2.5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate text-white">
                  {file ? file.name.replace(/\.[^/.]+$/, '') : 'Saiyan Se Chhup Ke'}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {file?.folder ? file.folder.replace(/^\//, '') : 'Anuradha Paudwal - Topic'}
                </div>
              </div>
            </div>

            {/* Output Device Options */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  setSelectedOutput('speaker');
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedOutput === 'speaker' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Speaker size={18} />
                  <div className="text-left">
                    <div className="text-sm font-semibold">
                      {language === 'hi' ? 'यह फ़ोन (फ़ोन स्पीकर)' : 'This Phone (Phone speaker)'}
                    </div>
                    <div className="text-xs opacity-75">
                      {language === 'hi' ? 'सक्रिय ऑडियो आउटपुट' : 'Active audio output'}
                    </div>
                  </div>
                </div>
                {selectedOutput === 'speaker' && <Check size={18} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  setSelectedOutput('bluetooth');
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedOutput === 'bluetooth' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Headphones size={18} />
                  <div className="text-left">
                    <div className="text-sm font-semibold">
                      {language === 'hi' ? 'ब्लूटूथ ईयरबड्स / हेडसेट' : 'Bluetooth Headset / Earbuds'}
                    </div>
                    <div className="text-xs opacity-75">
                      {language === 'hi' ? 'कनेक्टेड' : 'Connected'}
                    </div>
                  </div>
                </div>
                {selectedOutput === 'bluetooth' && <Check size={18} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  setSelectedOutput('cast');
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedOutput === 'cast' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tv size={18} />
                  <div className="text-left">
                    <div className="text-sm font-semibold">
                      {language === 'hi' ? 'स्मार्ट टीवी / गूगल कास्ट' : 'Smart TV / Google Cast'}
                    </div>
                    <div className="text-xs opacity-75">
                      {language === 'hi' ? 'वाई-फ़ाई कास्टिंग' : 'Wi-Fi Casting'}
                    </div>
                  </div>
                </div>
                {selectedOutput === 'cast' && <Check size={18} />}
              </button>
            </div>

            {/* Volume Control */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{language === 'hi' ? 'आउटपुट वॉल्यूम' : 'Output Volume'}</span>
                <span>{outputVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={outputVolume}
                onChange={(e) => setOutputVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
