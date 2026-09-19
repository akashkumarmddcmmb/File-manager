import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  PhoneCall, 
  Bell, 
  AlarmClock, 
  FolderPlus, 
  Play, 
  Pause, 
  Check, 
  Settings, 
  Music, 
  Volume2, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  Sliders
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { 
  setFileAsRingtone, 
  checkCanWriteSettings, 
  requestOpenWriteSettings,
  triggerHapticFeedback,
  ImpactStyle
} from '../utils/nativeStorage';

interface RingtoneSetModalProps {
  isOpen: boolean;
  file: FileItem | null;
  language: Language;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export type RingtoneTypeOption = 'ringtone' | 'notification' | 'alarm' | 'all' | 'folder';

export const RingtoneSetModal: React.FC<RingtoneSetModalProps> = ({
  isOpen,
  file,
  language,
  onClose,
  onSuccess,
}) => {
  const [selectedType, setSelectedType] = useState<RingtoneTypeOption>('ringtone');
  const [startOffset, setStartOffset] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setIsPlayingPreview(false);
      setNeedsPermission(false);
      // Check system write settings permission on Android
      checkCanWriteSettings().then((canWrite) => {
        setNeedsPermission(!canWrite);
        setPermissionChecked(true);
      });
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPlayingPreview(false);
    }
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleTogglePreview = () => {
    triggerHapticFeedback(ImpactStyle.Light);
    if (isPlayingPreview) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPlayingPreview(false);
      return;
    }

    try {
      if (!previewAudioRef.current) {
        const audio = new Audio(file.url || '');
        audio.currentTime = startOffset;
        audio.onended = () => setIsPlayingPreview(false);
        audio.onerror = () => {
          // Play a pleasant simulated ringtone chime if URL is invalid
          playChimePreview();
        };
        previewAudioRef.current = audio;
      } else {
        previewAudioRef.current.currentTime = startOffset;
      }

      previewAudioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(() => {
        playChimePreview();
      });
    } catch {
      playChimePreview();
    }
  };

  const playChimePreview = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      setIsPlayingPreview(true);
      setTimeout(() => setIsPlayingPreview(false), 600);
    } catch {
      setIsPlayingPreview(false);
    }
  };

  const handleOpenSettings = async () => {
    triggerHapticFeedback(ImpactStyle.Medium);
    await requestOpenWriteSettings();
  };

  const handleApplyRingtone = async () => {
    if (!file) return;
    setIsApplying(true);
    triggerHapticFeedback(ImpactStyle.Heavy);

    try {
      if (selectedType === 'folder') {
        // Copy to system Ringtones directory
        const res = await setFileAsRingtone(file.url || file.name, 'ringtone', file.name);
        if (res.needsPermission) {
          setNeedsPermission(true);
          setIsApplying(false);
          return;
        }
        onSuccess(
          language === 'hi' 
            ? `"${file.name}" को सिस्टम रिंगटोन फ़ोल्डर में सहेजा गया!` 
            : `"${file.name}" saved to device Ringtones folder!`
        );
        onClose();
        return;
      }

      const res = await setFileAsRingtone(
        file.url || file.name, 
        selectedType as 'ringtone' | 'notification' | 'alarm' | 'all',
        file.name
      );

      if (res.needsPermission) {
        setNeedsPermission(true);
        setIsApplying(false);
        return;
      }

      if (res.success) {
        let msg = '';
        if (selectedType === 'ringtone') {
          msg = language === 'hi' 
            ? `"${file.name}" को कॉल रिंगटोन के रूप में सेट कर दिया गया है! 📞`
            : `"${file.name}" set as Phone Ringtone! 📞`;
        } else if (selectedType === 'notification') {
          msg = language === 'hi'
            ? `"${file.name}" को नोटिफिकेशन टोन के रूप में सेट कर दिया गया है! 🔔`
            : `"${file.name}" set as Notification Sound! 🔔`;
        } else if (selectedType === 'alarm') {
          msg = language === 'hi'
            ? `"${file.name}" को अलार्म ध्वनि के रूप में सेट कर दिया गया है! ⏰`
            : `"${file.name}" set as Alarm Sound! ⏰`;
        } else {
          msg = language === 'hi'
            ? `"${file.name}" को कॉल, नोटिफिकेशन और अलार्म सभी पर सेट कर दिया गया है! 🎵`
            : `"${file.name}" set as Ringtone, Notification & Alarm! 🎵`;
        }
        onSuccess(msg);
        onClose();
      } else {
        onSuccess(
          language === 'hi'
            ? `रिंगटोन सेट करने में त्रुटि: ${res.message || 'कृपया दोबारा प्रयास करें'}`
            : `Failed to set ringtone: ${res.message || 'Please try again'}`
        );
      }
    } catch (err: any) {
      onSuccess(
        language === 'hi'
          ? 'रिंगटोन सेट करते समय कोई समस्या आई'
          : `Error setting ringtone: ${err?.message || 'Unknown error'}`
      );
    } finally {
      setIsApplying(false);
    }
  };

  const options = [
    {
      id: 'ringtone',
      title: language === 'hi' ? 'फ़ोन रिंगटोन (कॉल टोन)' : 'Phone Ringtone',
      description: language === 'hi' ? 'सभी इनकमिंग कॉल्स के लिए मुख्य रिंगटोन' : 'Default ringtone for incoming phone calls',
      icon: <PhoneCall size={20} className="text-emerald-500 shrink-0" />,
      tag: language === 'hi' ? 'कॉल' : 'Calls',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    },
    {
      id: 'notification',
      title: language === 'hi' ? 'नोटिफिकेशन ध्वनि (संदेश टोन)' : 'Notification Sound',
      description: language === 'hi' ? 'संदेश, व्हाट्सएप और अलर्ट के लिए ध्वनि' : 'Sound for messages, alerts and app notifications',
      icon: <Bell size={20} className="text-blue-500 shrink-0" />,
      tag: language === 'hi' ? 'मैसेज' : 'Alerts',
      color: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    },
    {
      id: 'alarm',
      title: language === 'hi' ? 'अलार्म टोन (जागने की ध्वनि)' : 'Alarm Sound',
      description: language === 'hi' ? 'सुबह के अलार्म और घड़ी के लिए टोन' : 'Default wake-up tone for clock alarms',
      icon: <AlarmClock size={20} className="text-amber-500 shrink-0" />,
      tag: language === 'hi' ? 'अलार्म' : 'Alarm',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
    {
      id: 'all',
      title: language === 'hi' ? 'तीनों पर सेट करें (कॉल + मैसेज + अलार्म)' : 'Set as All Sounds',
      description: language === 'hi' ? 'एक साथ रिंगटोन, नोटिफिकेशन और अलार्म पर लागू करें' : 'Set for Phone Call, Notification & Alarm simultaneously',
      icon: <Sparkles size={20} className="text-purple-500 shrink-0" />,
      tag: language === 'hi' ? 'सभी' : 'All',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
    {
      id: 'folder',
      title: language === 'hi' ? 'सिस्टम रिंगटोन फ़ोल्डर में सहेजें (/Ringtones)' : 'Save to /Ringtones Folder',
      description: language === 'hi' ? 'डिवाइस की सेटिंग्स और अन्य सभी ऐप्स में चुनने के लिए' : 'Copies file to device Ringtones directory for Android Settings',
      icon: <FolderPlus size={20} className="text-teal-500 shrink-0" />,
      tag: language === 'hi' ? 'संग्रह' : 'Library',
      color: 'border-teal-500/40 bg-teal-500/10 text-teal-400',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#1e2026] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <PhoneCall size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-100 leading-tight">
                {language === 'hi' ? 'रिंगटोन और ध्वनि सेट करें' : 'Set Ringtone & Sound'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {language === 'hi' ? 'कॉल, नोटिफिकेशन या अलार्म चुनें' : 'Choose call, notification or alarm'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(ImpactStyle.Light);
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Audio Card Preview */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-900 to-teal-800 flex items-center justify-center shrink-0 shadow-md">
              <Music size={20} className="text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                <span className={`px-1.5 py-0.2 rounded font-bold ${
                  file.storageDevice === 'sdcard' ? 'bg-purple-900/60 text-purple-300' : 'bg-blue-900/60 text-blue-300'
                }`}>
                  {file.storageDevice === 'sdcard' ? 'SD Card' : 'Internal'}
                </span>
                <span>{formatBytes(file.size)}</span>
              </div>
            </div>
          </div>

          {/* Test Preview Button */}
          <button
            onClick={handleTogglePreview}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isPlayingPreview 
                ? 'bg-emerald-500 text-black font-bold animate-pulse' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={language === 'hi' ? 'रिंगटोन का प्रिव्यू सुनें' : 'Listen preview'}
          >
            {isPlayingPreview ? (
              <>
                <Pause size={14} className="fill-current" />
                <span>{language === 'hi' ? 'रोकें' : 'Stop'}</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-current ml-0.5" />
                <span>{language === 'hi' ? 'सुनें' : 'Preview'}</span>
              </>
            )}
          </button>
        </div>

        {/* Optional: Chorus / Start Offset Selector */}
        <div className="space-y-1.5 bg-black/20 p-3 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <Sliders size={13} className="text-amber-400" />
              <span>{language === 'hi' ? 'रिंगटोन की शुरुआत (कोरस / हुक)' : 'Ringtone start point'}</span>
            </span>
            <span className="font-mono text-amber-400 font-bold text-xs">
              00:{startOffset < 10 ? `0${startOffset}` : startOffset}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[0, 15, 30, 45].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  triggerHapticFeedback(ImpactStyle.Light);
                  setStartOffset(sec);
                  if (previewAudioRef.current) {
                    previewAudioRef.current.currentTime = sec;
                  }
                }}
                className={`py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  startOffset === sec 
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs' 
                    : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                }`}
              >
                {sec === 0 ? (language === 'hi' ? 'शुरुआत' : 'Start') : `${sec}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Android Permission Banner if needed */}
        {needsPermission && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-300 leading-snug">
                  {language === 'hi' ? 'Android सेटिंग्स अनुमति आवश्यक है' : 'Android Permission Required'}
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {language === 'hi' 
                    ? 'सिस्टम रिंगटोन बदलने के लिए Android "सिस्टम सेटिंग्स संशोधित करें (Modify system settings)" अनुमति मांगता है।'
                    : 'Android requires "Modify system settings" permission to change ringtones and alerts.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenSettings}
              className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings size={14} />
              <span>{language === 'hi' ? 'सेटिंग्स में अनुमति दें' : 'Grant in Settings'}</span>
              <ExternalLink size={13} />
            </button>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
            {language === 'hi' ? 'कहाँ सेट करना चाहते हैं?' : 'Where do you want to set?'}
          </label>

          <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
            {options.map((opt) => {
              const isSelected = selectedType === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    triggerHapticFeedback(ImpactStyle.Light);
                    setSelectedType(opt.id as RingtoneTypeOption);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected 
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md' 
                      : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  <div className="pt-0.5">{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{opt.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${opt.color}`}>
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-neutral-600'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(ImpactStyle.Light);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={isApplying}
            onClick={handleApplyRingtone}
            className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 disabled:opacity-50 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {isApplying ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : (
              <Check size={16} strokeWidth={2.5} />
            )}
            <span>
              {isApplying 
                ? (language === 'hi' ? 'सेट किया जा रहा है...' : 'Applying...') 
                : (language === 'hi' ? 'रिंगटोन सेट करें' : 'Apply Ringtone')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
