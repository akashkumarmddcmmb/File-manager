import React, { useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Languages,
  Eye,
  ShieldCheck,
  KeyRound,
  Share2,
  HardDrive,
  Sparkles,
  Music,
  Trash2,
  FileText,
  Info,
  Check,
  ChevronRight,
  Smartphone,
  Sliders,
  Clock,
  RotateCcw,
  SunMoon,
  Volume2,
  MessageSquare,
  Bell,
  Zap
} from 'lucide-react';
import { Language, StorageBreakdown } from '../types';
import { translations } from '../utils/translations';
import { formatBytes } from '../utils/storage';
import { saveVaultPin, verifyVaultPin } from '../utils/cryptoVault';
import { APP_INFO } from '../constants/appInfo';
import { 
  requestNativeNotificationPermission, 
  checkNativeNotificationPermission, 
  postNativeSystemNotification 
} from '../utils/nativeNotifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  storage: StorageBreakdown;
  onOpenStorageBreakdown: () => void;
  onOpenLegal: (tab: 'privacy' | 'terms') => void;
  showToast: (msg: string) => void;
  hasDemoFiles?: boolean;
  onClearDemoFiles?: () => void;
  onRestoreDemoFiles?: () => void;
  onOpenFeedback?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  storage,
  onOpenStorageBreakdown,
  onOpenLegal,
  showToast,
  hasDemoFiles = false,
  onClearDemoFiles,
  onRestoreDemoFiles,
  onOpenFeedback,
}) => {
  const t = translations[language];

  // Setting States persisted in localStorage
  const [showHiddenFiles, setShowHiddenFiles] = useState(() => {
    return localStorage.getItem('akash_files_show_hidden') === 'true';
  });

  const [autoCleanAlert, setAutoCleanAlert] = useState(() => {
    return localStorage.getItem('akash_files_auto_clean_alert') !== 'false';
  });

  const [bgAudioPlayback, setBgAudioPlayback] = useState(() => {
    return localStorage.getItem('akash_files_bg_audio') !== 'false';
  });

  const [autoLockDuration, setAutoLockDuration] = useState(() => {
    return localStorage.getItem('akash_files_auto_lock') || 'immediate';
  });

  const [deviceName, setDeviceName] = useState(() => {
    return localStorage.getItem('akash_files_device_name') || "Akash's Android Device";
  });

  const [quickShareVisibility, setQuickShareVisibility] = useState(() => {
    return localStorage.getItem('akash_files_share_visibility') || 'all';
  });

  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('akash_files_theme') || 'system';
  });

  const [nativeNotifGranted, setNativeNotifGranted] = useState(false);

  React.useEffect(() => {
    checkNativeNotificationPermission().then(granted => {
      setNativeNotifGranted(granted);
    });
  }, [isOpen]);

  const handleRequestNativeNotif = async () => {
    const granted = await requestNativeNotificationPermission();
    setNativeNotifGranted(granted);
    if (granted) {
      showToast(language === 'hi' ? 'सिस्टम नोटिफ़िकेशन अनुमति प्राप्त हुई ✅' : 'System Notification Permission Allowed ✅');
      postNativeSystemNotification({
        title: 'Files by Akash Kumar',
        body: language === 'hi' ? 'सिस्टम स्टेटस बार नोटिफ़िकेशन सक्रिय है!' : 'System status bar notifications are active!',
        channelId: 'files_general',
      });
    } else {
      showToast(language === 'hi' ? 'कृपया Android सेटिंग में "Allow Notifications" चालू करें' : 'Please enable "Allow Notifications" in Android Settings');
    }
  };

  const handleTestNativeNotif = async () => {
    await postNativeSystemNotification({
      title: language === 'hi' ? 'फ़ाइल कार्य व स्थानांतरण सक्रिय' : 'File Activity Active',
      body: language === 'hi' ? 'स्टेटस बार को नीचे स्लाइड करके यह सूचना देखें।' : 'Pull down your status bar to view this notification.',
      channelId: 'files_transfers',
    });
    showToast(language === 'hi' ? 'स्टेटस बार में टेस्ट नोटिफ़िकेशन भेजा गया! ऊपर से नीचे स्लाइड करें।' : 'Test notification sent to status bar! Pull down from top.');
  };

  // PIN Change State
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  if (!isOpen) return null;

  const handleToggleHiddenFiles = () => {
    const next = !showHiddenFiles;
    setShowHiddenFiles(next);
    localStorage.setItem('akash_files_show_hidden', String(next));
    showToast(next ? (language === 'hi' ? 'छुपी हुई फ़ाइलें दिखाई जा रही हैं' : 'Showing hidden files') : (language === 'hi' ? 'छुपी हुई फ़ाइलें छिपाई गईं' : 'Hidden files hidden'));
  };

  const handleToggleAutoClean = () => {
    const next = !autoCleanAlert;
    setAutoCleanAlert(next);
    localStorage.setItem('akash_files_auto_clean_alert', String(next));
    showToast(next ? (language === 'hi' ? 'जंक अलर्ट चालू किया गया' : 'Junk cleaning alert enabled') : (language === 'hi' ? 'जंक अलर्ट बंद किया गया' : 'Junk cleaning alert disabled'));
  };

  const handleToggleBgAudio = () => {
    const next = !bgAudioPlayback;
    setBgAudioPlayback(next);
    localStorage.setItem('akash_files_bg_audio', String(next));
    showToast(next ? (language === 'hi' ? 'बैकग्राउंड प्लेबैक चालू' : 'Background audio enabled') : (language === 'hi' ? 'बैकग्राउंड प्लेबैक बंद' : 'Background audio disabled'));
  };

  const handleChangeAutoLock = (duration: string) => {
    setAutoLockDuration(duration);
    localStorage.setItem('akash_files_auto_lock', duration);
    showToast(language === 'hi' ? 'ऑटो-लॉक प्राथमिकता अपडेट की गई' : 'Auto-lock updated');
  };

  const handleSaveDeviceName = (name: string) => {
    setDeviceName(name);
    localStorage.setItem('akash_files_device_name', name);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError(language === 'hi' ? 'नया पिन ठीक 4 अंकों का होना चाहिए' : 'New PIN must be exactly 4 digits');
      return;
    }

    const isValidOld = await verifyVaultPin(oldPin);
    if (!isValidOld) {
      setPinError(language === 'hi' ? 'वर्तमान पिन गलत है' : 'Current PIN is incorrect');
      return;
    }

    await saveVaultPin(newPin);
    setIsChangingPin(false);
    setOldPin('');
    setNewPin('');
    showToast(language === 'hi' ? 'सेफ़ फ़ोल्डर पिन सफलतापूर्वक बदल दिया गया' : 'Safe Folder PIN updated successfully');
  };

  const handleClearCache = () => {
    showToast(t.cacheClearedToast);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('akash_files_show_hidden');
    localStorage.removeItem('akash_files_auto_clean_alert');
    localStorage.removeItem('akash_files_bg_audio');
    localStorage.removeItem('akash_files_auto_lock');
    localStorage.removeItem('akash_files_device_name');
    setShowHiddenFiles(false);
    setAutoCleanAlert(true);
    setBgAudioPlayback(true);
    setAutoLockDuration('immediate');
    setDeviceName("Akash's Android Device");
    showToast(language === 'hi' ? 'सेटिंग्स डिफ़ॉल्ट पर रीसेट कर दी गईं' : 'Settings reset to default');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#f8fafd] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                {t.settings}
              </h2>
              <p className="text-[11px] text-neutral-500">
                Files by Akash Kumar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* 1. GENERAL & LANGUAGE */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <Sliders size={14} className="text-blue-600" />
              <span>{t.general}</span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Languages size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    भाषा / App Language
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {language === 'hi' ? 'हिन्दी (Hindi)' : 'English (English)'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    language === 'en' ? 'bg-white text-blue-600 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('hi')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    language === 'hi' ? 'bg-white text-purple-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>

            <div className="border-t border-neutral-100" />

            {/* Show Hidden Files Toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                  <Eye size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {t.showHiddenFiles}
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight">
                    {t.showHiddenFilesDesc}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleHiddenFiles}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  showHiddenFiles ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>

          {/* 2. STORAGE & AUTO-CLEAN (DEDICATED OPTION) */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <HardDrive size={14} className="text-blue-600" />
              <span>{language === 'hi' ? 'स्टोरेज एवं क्लीनर प्रबंधन' : 'Storage & Auto-Clean'}</span>
            </div>

            {/* Storage Breakdown Quick Open */}
            <div 
              onClick={() => {
                onClose();
                onOpenStorageBreakdown();
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <HardDrive size={16} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-blue-950">
                    {t.storageBreakdown}
                  </div>
                  <div className="text-[11px] text-blue-700">
                    {formatBytes(storage.used, 0)} {t.used} of {formatBytes(storage.total, 0)}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-blue-600" />
            </div>

            {/* Auto Clean Reminder */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {t.autoCleanReminder}
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight">
                    {t.autoCleanReminderDesc}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoClean}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  autoCleanAlert ? 'bg-amber-500 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>

          {/* 3. SAFE FOLDER & SECURITY */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>{t.safeFolderSettings}</span>
            </div>

            {/* Change PIN Action */}
            {!isChangingPin ? (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                      {t.changePin}
                    </div>
                    <div className="text-[11px] text-neutral-500 leading-tight">
                      {t.changePinDesc}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangingPin(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {language === 'hi' ? 'बदलें' : 'Update'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePinSubmit} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="text-xs font-semibold text-neutral-800">
                  {language === 'hi' ? 'सेफ़ फ़ोल्डर पिन बदलें' : 'Update Safe Folder PIN'}
                </div>
                {pinError && (
                  <div className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded-lg">
                    {pinError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">
                      {language === 'hi' ? 'वर्तमान पिन' : 'Current PIN'}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value)}
                      placeholder="****"
                      className="w-full mt-1 px-3 py-1.5 text-center tracking-widest text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">
                      {language === 'hi' ? 'नया 4-अंकीय पिन' : 'New 4-digit PIN'}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="****"
                      className="w-full mt-1 px-3 py-1.5 text-center tracking-widest text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPin(false);
                      setPinError('');
                    }}
                    className="px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    Save PIN
                  </button>
                </div>
              </form>
            )}

            <div className="border-t border-neutral-100" />

            {/* Auto Lock Timer */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                  <Clock size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {t.autoLock}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {autoLockDuration === 'immediate'
                      ? t.autoLockImmediate
                      : autoLockDuration === '1min'
                      ? t.autoLock1Min
                      : t.autoLock5Min}
                  </div>
                </div>
              </div>
              <select
                value={autoLockDuration}
                onChange={(e) => handleChangeAutoLock(e.target.value)}
                className="text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="immediate">{t.autoLockImmediate}</option>
                <option value="1min">{t.autoLock1Min}</option>
                <option value="5min">{t.autoLock5Min}</option>
              </select>
            </div>
          </div>

          {/* 4. QUICK SHARE & DEVICE SETTINGS */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <Share2 size={14} className="text-blue-600" />
              <span>{t.quickShareSettings}</span>
            </div>

            {/* Device Name Input */}
            <div className="py-1">
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                {t.deviceName}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => handleSaveDeviceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="Device Name"
                />
              </div>
            </div>

            <div className="border-t border-neutral-100" />

            {/* Visibility Option */}
            <div className="flex items-center justify-between py-1">
              <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                {t.quickShareVisibility}
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setQuickShareVisibility('all');
                    localStorage.setItem('akash_files_share_visibility', 'all');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    quickShareVisibility === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {t.visibleToAll}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickShareVisibility('hidden');
                    localStorage.setItem('akash_files_share_visibility', 'hidden');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    quickShareVisibility === 'hidden' ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {t.visibleHidden}
                </button>
              </div>
            </div>
          </div>

          {/* 5. MEDIA & AUDIO PLAYBACK */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <Music size={14} className="text-purple-600" />
              <span>{t.mediaPlayback}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Volume2 size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {t.bgAudio}
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight">
                    {t.bgAudioDesc}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleBgAudio}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  bgAudioPlayback ? 'bg-purple-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>

          {/* 6. ANDROID SYSTEM NOTIFICATIONS (STATUS BAR) */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <Bell size={14} className="text-blue-600" />
              <span>{language === 'hi' ? 'Android स्टेटस बार नोटिफ़िकेशन' : 'Android Status Bar Notifications'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  nativeNotifGranted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Bell size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                      {language === 'hi' ? 'सिस्टम सूचनाएं (Allow Notifications)' : 'Allow Notifications'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      nativeNotifGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {nativeNotifGranted ? (language === 'hi' ? 'चालू / ON' : 'ALLOWED') : (language === 'hi' ? 'अनुमति दें' : 'PERMISSION NEEDED')}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                    {language === 'hi'
                      ? 'फ़ाइल कॉपी, ट्रांसफर और बैकग्राउंड कार्य फोन के स्टेटस बार (Notification Shade) में दिखेंगे।'
                      : 'File transfers, background tasks and alerts will appear in Android Status Bar.'}
                  </div>
                </div>
              </div>

              {!nativeNotifGranted ? (
                <button
                  type="button"
                  onClick={handleRequestNativeNotif}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  {language === 'hi' ? 'चालू करें' : 'Enable'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestNativeNotif}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer shrink-0 border border-blue-200/80"
                >
                  {language === 'hi' ? 'टेस्ट करें' : 'Test Bar'}
                </button>
              )}
            </div>
          </div>

          {/* BATTERY SAVER & CPU OPTIMIZATION MODE */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 bg-linear-to-r from-emerald-50/40 to-teal-50/20 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <Zap size={14} className="text-emerald-600" />
              <span>{language === 'hi' ? 'बैटरी बचत मोड (Low Battery Consumption)' : 'Battery Optimization Mode'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Zap size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                      {language === 'hi' ? 'अल्ट्रा बैटरी सेविंग सक्रिय है' : 'Ultra Battery Saver Active'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                      {language === 'hi' ? 'ऑप्टिमाइज्ड (Active)' : 'OPTIMIZED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600 leading-tight mt-0.5">
                    {language === 'hi'
                      ? 'थ्रॉटल्ड बैकग्राउंड स्कैनिंग, डिबाउंस्ड स्टोरेज राइट्स और 50% कम CPU वेक-अप्स से बैटरी की खपत बहुत कम होगी।'
                      : 'Throttled background scans, debounced writes, and reduced CPU wakeups minimize battery drainage.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. DEMO & SAMPLE FILES MANAGEMENT */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <HardDrive size={14} className="text-amber-600" />
              <span>{t.demoFiles}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  hasDemoFiles ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <HardDrive size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                      {hasDemoFiles 
                        ? (language === 'hi' ? 'डेमो फ़ाइलें सक्रिय हैं' : 'Sample Demo Files Active')
                        : (language === 'hi' ? 'वास्तविक डिवाइस मोड (Clean Mode)' : 'Real Clean Storage Mode')}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      hasDemoFiles ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {hasDemoFiles 
                        ? (language === 'hi' ? 'डेमो' : 'DEMO') 
                        : (language === 'hi' ? 'क्लीन / असली' : 'CLEAN')}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                    {hasDemoFiles 
                      ? (language === 'hi' ? 'इंस्टॉल के बाद खाली व असली उपयोग के लिए डेमो फ़ाइलें हटाएं' : 'Remove sample files for clean actual storage usage')
                      : (language === 'hi' ? 'कोई डेमो फ़ाइल नहीं है, केवल आपकी असली फ़ाइलें दिखेंगी' : 'No demo files loaded. Displaying only genuine user storage')}
                  </div>
                </div>
              </div>

              {hasDemoFiles ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onClearDemoFiles) onClearDemoFiles();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 transition-colors cursor-pointer shrink-0"
                >
                  {t.clearDemoFiles}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onRestoreDemoFiles) onRestoreDemoFiles();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                >
                  {t.restoreDemoFiles}
                </button>
              )}
            </div>
          </div>

          {/* 7. CLEAR CACHE & RESET */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {t.clearCache}
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight">
                    {t.clearCacheDesc}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'साफ़ करें' : 'Clear'}
              </button>
            </div>

            <div className="border-t border-neutral-100" />

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center">
                  <RotateCcw size={17} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {language === 'hi' ? 'डिफ़ॉल्ट सेटिंग्स रीसेट करें' : 'Reset Preferences'}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {language === 'hi' ? 'सभी कॉन्फ़िगरेशन मूल मान पर रीसेट करें' : 'Restore original app settings'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* 7. ABOUT & LEGAL */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <Info size={14} className="text-blue-600" />
              <span>{t.aboutApp}</span>
            </div>

            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-neutral-600">{t.appVersion}</span>
              <span className="font-semibold text-neutral-900">{APP_INFO.fullVersionString} (Official)</span>
            </div>

            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-neutral-600">{t.developer}</span>
              <span className="font-semibold text-blue-600">{APP_INFO.developer}</span>
            </div>

            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-neutral-600">Contact / Support</span>
              <span className="font-medium text-neutral-500">{APP_INFO.email}</span>
            </div>

            {onOpenFeedback && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFeedback();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 rounded-xl text-xs font-semibold text-blue-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600" />
                    <span>{language === 'hi' ? 'डेवलपर को फ़ीडबैक भेजें (Send Feedback)' : 'Send Feedback to Developer'}</span>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                    Open Portal
                  </span>
                </button>
              </div>
            )}

            <div className="border-t border-neutral-100 pt-2 flex items-center justify-around">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal('privacy');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                <ShieldCheck size={15} />
                <span>{t.privacyPolicy}</span>
              </button>

              <span className="text-neutral-300">•</span>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegal('terms');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                <FileText size={15} />
                <span>{t.termsOfService}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-neutral-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'संपन्न (Done)' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
