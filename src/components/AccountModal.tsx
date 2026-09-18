import React, { useState } from 'react';
import { 
  X, 
  HardDrive, 
  Sparkles, 
  ExternalLink, 
  LogOut, 
  User, 
  ChevronRight, 
  ArrowLeft,
  Check,
  Shield
} from 'lucide-react';
import { StorageBreakdown, UserAccount, AuthProvider, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { triggerHapticFeedback } from '../utils/nativeStorage';

export const GoogleLogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const MicrosoftLogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 23 23">
    <path fill="#f25022" d="M1 1h10v10H1z"/>
    <path fill="#7fba00" d="M12 1h10v10H12z"/>
    <path fill="#00a4ef" d="M1 12h10v10H1z"/>
    <path fill="#ffb900" d="M12 12h10v10H12z"/>
  </svg>
);

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: StorageBreakdown;
  userAccount: UserAccount | null;
  onSignIn: (account: UserAccount) => void;
  onSignOut: () => void;
  onOpenStorageBreakdown: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
  onOpenFeedback?: () => void;
  language: Language;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  storage,
  userAccount,
  onSignIn,
  onSignOut,
  onOpenStorageBreakdown,
  onOpenLegal,
  onOpenFeedback,
  language,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AuthProvider | null>(null);
  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const t = translations[language];

  if (!isOpen) return null;

  // Cloud Storage calculation based on provider
  const isGoogle = userAccount?.provider === 'google';
  const cloudTotal = isGoogle ? 15 * 1024 * 1024 * 1024 : 5 * 1024 * 1024 * 1024; // 15 GB for Google, 5 GB for OneDrive
  const cloudUsed = isGoogle ? 2.1 * 1024 * 1024 * 1024 : 1.2 * 1024 * 1024 * 1024;
  const cloudPercent = Math.round((cloudUsed / cloudTotal) * 100);

  const handleStartSignIn = (provider: AuthProvider) => {
    setSelectedProvider(provider);
    setErrorMessage('');
    if (provider === 'google') {
      setInputEmail('');
      setInputName('');
    } else {
      setInputEmail('');
      setInputName('');
    }
  };

  const handleCompleteSignIn = () => {
    if (!selectedProvider) return;
    const trimmedEmail = inputEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया एक मान्य ईमेल आईडी दर्ज करें'
          : 'Please enter a valid email address'
      );
      return;
    }

    // Determine fallback name from email
    const namePart = trimmedEmail.split('@')[0];
    const derivedName = inputName.trim() || namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      name: derivedName,
      email: trimmedEmail,
      provider: selectedProvider,
      signedInAt: new Date().toISOString(),
    };

    triggerHapticFeedback();
    onSignIn(newAccount);
    setSelectedProvider(null);
    setInputEmail('');
    setInputName('');
  };

  const handleQuickPresetSignIn = (provider: AuthProvider, email: string, name: string) => {
    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      name,
      email,
      provider,
      signedInAt: new Date().toISOString(),
    };
    triggerHapticFeedback();
    onSignIn(newAccount);
    setSelectedProvider(null);
  };

  const handleSignOutClick = () => {
    triggerHapticFeedback();
    onSignOut();
    setSelectedProvider(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Account Dialog Card (Google M3 Style) */}
      <div 
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 sm:p-6 border border-neutral-200 z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            {userAccount ? (
              userAccount.provider === 'google' ? (
                <div className="flex items-center gap-1.5">
                  <GoogleLogoIcon size={18} />
                  <span className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                    {t.googleAccount}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <MicrosoftLogoIcon size={18} />
                  <span className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                    {t.microsoftAccount}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5">
                <Shield size={18} className="text-blue-600" />
                <span className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                  {t.account}
                </span>
              </div>
            )}
          </div>

          <button 
            id="btn-close-account-modal"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. STATE: Active User Signed In */}
        {userAccount && !selectedProvider ? (
          <div className="mt-4">
            {/* User Profile Info */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-md ring-4 ring-blue-50">
                  {userAccount.name ? userAccount.name.charAt(0).toUpperCase() : 'U'}
                </div>
                {/* Provider Logo Badge in corner */}
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md border border-neutral-200">
                  {userAccount.provider === 'google' ? (
                    <GoogleLogoIcon size={14} />
                  ) : (
                    <MicrosoftLogoIcon size={14} />
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-neutral-900 mt-3 truncate max-w-[260px]">
                {userAccount.name}
              </h3>
              <p className="text-xs text-neutral-500 font-normal truncate max-w-[260px]">
                {userAccount.email}
              </p>

              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                {userAccount.provider === 'google' ? <GoogleLogoIcon size={12} /> : <MicrosoftLogoIcon size={12} />}
                <span>
                  {userAccount.provider === 'google' ? t.googleAccount : t.microsoftAccount}
                </span>
              </div>
            </div>

            {/* Storage Status Overview */}
            <div className="bg-[#f8fafd] border border-neutral-200/90 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <HardDrive size={15} className="text-blue-600" />
                  {t.internalStorage}
                </span>
                <span className="text-xs font-bold text-neutral-800">
                  {Math.round((storage.used / storage.total) * 100)}% {t.used}
                </span>
              </div>

              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-1.5">
                <div 
                  style={{ width: `${Math.min(100, Math.round((storage.used / storage.total) * 100))}%` }}
                  className="bg-blue-600 h-full rounded-full"
                />
              </div>

              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>{formatBytes(storage.used, 1)} {t.used}</span>
                <span>{formatBytes(storage.free, 1)} {t.free}</span>
              </div>

              <hr className="my-3 border-neutral-200" />

              {/* Cloud Storage */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Sparkles size={14} className={isGoogle ? "text-amber-500" : "text-blue-500"} />
                  {isGoogle ? 'Google Drive Cloud Storage' : 'Microsoft OneDrive Storage'}
                </span>
                <span className="text-[11px] text-neutral-500">{cloudPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mb-1">
                <div 
                  style={{ width: `${cloudPercent}%` }} 
                  className={isGoogle ? "bg-amber-500 h-full rounded-full" : "bg-blue-500 h-full rounded-full"} 
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                {isGoogle
                  ? '2.1 GB of 15 GB cloud storage'
                  : '1.2 GB of 5 GB OneDrive cloud storage'}
              </p>
            </div>

            {/* Actions: Switch Account & Sign Out */}
            <div className="space-y-2 text-xs">
              <button
                id="btn-switch-account"
                onClick={() => setSelectedProvider('google')}
                className="w-full text-left px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors font-semibold text-neutral-700 flex items-center justify-between cursor-pointer border border-neutral-200/80"
              >
                <span>{t.switchAccount}</span>
                <ChevronRight size={15} className="text-neutral-400" />
              </button>

              <button
                id="btn-storage-details"
                onClick={() => {
                  onClose();
                  onOpenStorageBreakdown();
                }}
                className="w-full text-left px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors font-semibold text-neutral-700 flex items-center justify-between cursor-pointer border border-neutral-200/80"
              >
                <span>{t.storageBreakdown}</span>
                <ExternalLink size={14} className="text-neutral-400" />
              </button>

              {onOpenFeedback && (
                <button
                  id="btn-account-feedback"
                  onClick={() => {
                    onClose();
                    onOpenFeedback();
                  }}
                  className="w-full text-left px-3.5 py-2.5 bg-blue-50/70 hover:bg-blue-100/80 rounded-xl transition-colors font-semibold text-blue-800 flex items-center justify-between cursor-pointer border border-blue-200/70"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={15} className="text-blue-600" />
                    <span>{language === 'hi' ? 'डेवलपर को फ़ीडबैक भेजें' : 'Send Developer Feedback'}</span>
                  </span>
                  <ChevronRight size={15} className="text-blue-500" />
                </button>
              )}

              <button
                id="btn-sign-out"
                onClick={handleSignOutClick}
                className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-red-600 rounded-xl transition-colors font-semibold flex items-center gap-2 cursor-pointer"
              >
                <LogOut size={16} />
                <span>{t.signOut}</span>
              </button>
            </div>
          </div>
        ) : selectedProvider ? (
          /* 2. STATE: Interactive Sign In Form for Google / Microsoft */
          <div className="mt-4">
            <button
              onClick={() => setSelectedProvider(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 mb-3 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>{language === 'hi' ? 'वापस जाएं' : 'Back'}</span>
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 border border-neutral-200">
                {selectedProvider === 'google' ? (
                  <GoogleLogoIcon size={26} />
                ) : (
                  <MicrosoftLogoIcon size={26} />
                )}
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                {selectedProvider === 'google'
                  ? (language === 'hi' ? 'Google खाते से साइन इन करें' : 'Sign in with Google')
                  : (language === 'hi' ? 'Microsoft खाते से साइन इन करें' : 'Sign in with Microsoft')}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {language === 'hi'
                  ? 'अपना खाता ईमेल दर्ज करें या त्वरित जारी रखें'
                  : 'Enter your account details to sign in'}
              </p>
            </div>

            {/* Email and Name Inputs */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  {language === 'hi' ? 'ईमेल पता' : 'Email address'}
                </label>
                <input
                  type="email"
                  placeholder={selectedProvider === 'google' ? 'yourname@gmail.com' : 'yourname@outlook.com'}
                  value={inputEmail}
                  onChange={(e) => {
                    setInputEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  {language === 'hi' ? 'नाम (वैकल्पिक)' : 'Display Name (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'hi' ? 'उदा. यूजर' : 'e.g. User'}
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
              )}
            </div>

            {/* Quick Presets */}
            <div className="mb-4 pt-1">
              <p className="text-[11px] text-neutral-400 font-medium mb-1.5">
                {language === 'hi' ? 'त्वरित डेमो खाता चुनें:' : 'Or choose a quick demo account:'}
              </p>
              <div className="space-y-1.5">
                {selectedProvider === 'google' ? (
                  <button
                    type="button"
                    onClick={() => handleQuickPresetSignIn('google', 'akashkumarmddcmmb@gmail.com', 'Akash Kumar')}
                    className="w-full text-left p-2 rounded-lg bg-neutral-100 hover:bg-blue-50 text-neutral-700 hover:text-blue-700 text-xs font-medium flex items-center justify-between cursor-pointer border border-neutral-200/60"
                  >
                    <span>Akash Kumar (akashkumarmddcmmb@gmail.com)</span>
                    <span className="text-[10px] text-blue-600 font-bold">Tap to use</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickPresetSignIn('microsoft', 'msuser@outlook.com', 'Microsoft User')}
                    className="w-full text-left p-2 rounded-lg bg-neutral-100 hover:bg-blue-50 text-neutral-700 hover:text-blue-700 text-xs font-medium flex items-center justify-between cursor-pointer border border-neutral-200/60"
                  >
                    <span>msuser@outlook.com</span>
                    <span className="text-[10px] text-blue-600 font-bold">Tap to use</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                id="btn-confirm-sign-in"
                onClick={handleCompleteSignIn}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {language === 'hi' ? 'साइन इन करें' : 'Sign in'}
              </button>
            </div>
          </div>
        ) : (
          /* 3. STATE: No User Signed In - Choose Google or Microsoft */
          <div className="mt-4">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3 border border-neutral-200 shadow-xs">
                <User size={28} />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                {t.signInTitle}
              </h3>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed px-2">
                {t.signInDesc}
              </p>
            </div>

            {/* Provider Buttons */}
            <div className="space-y-3">
              {/* Google Sign In Button */}
              <button
                id="btn-sign-in-google"
                onClick={() => handleStartSignIn('google')}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-neutral-50 active:scale-[0.99] border-2 border-neutral-200 hover:border-blue-400 transition-all shadow-xs flex items-center gap-3.5 cursor-pointer group text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-neutral-200 flex items-center justify-center shrink-0">
                  <GoogleLogoIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                    {t.signInWithGoogle}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    Google Drive, Photos & Cloud Backup
                  </p>
                </div>
                <ChevronRight size={16} className="text-neutral-400 group-hover:text-blue-600 shrink-0" />
              </button>

              {/* Microsoft Sign In Button */}
              <button
                id="btn-sign-in-microsoft"
                onClick={() => handleStartSignIn('microsoft')}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-neutral-50 active:scale-[0.99] border-2 border-neutral-200 hover:border-blue-400 transition-all shadow-xs flex items-center gap-3.5 cursor-pointer group text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-neutral-200 flex items-center justify-center shrink-0">
                  <MicrosoftLogoIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                    {t.signInWithMicrosoft}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    OneDrive Storage & Office Cloud
                  </p>
                </div>
                <ChevronRight size={16} className="text-neutral-400 group-hover:text-blue-600 shrink-0" />
              </button>
            </div>

            {/* Offline storage note */}
            <div className="mt-5 p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-[11px] text-neutral-500 text-center">
              <span>
                {language === 'hi'
                  ? 'साइन इन किए बिना भी आप अपनी स्थानीय और SD कार्ड फ़ाइलों को पूरी तरह प्रबंधित कर सकते हैं।'
                  : 'You can still use all local storage and SD card features without signing in.'}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-center gap-4 text-[11px] text-neutral-500">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenLegal) onOpenLegal('privacy');
            }}
            className="hover:text-blue-600 transition-colors cursor-pointer hover:underline"
          >
            {language === 'hi' ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenLegal) onOpenLegal('terms');
            }}
            className="hover:text-blue-600 transition-colors cursor-pointer hover:underline"
          >
            {language === 'hi' ? 'उपयोग की शर्तें (Terms of Service)' : 'Terms of Service'}
          </button>
        </div>
      </div>
    </div>
  );
};
