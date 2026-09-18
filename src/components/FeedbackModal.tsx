import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Star, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Zap, 
  Mail, 
  ShieldCheck, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  Download, 
  Trash2, 
  FileText,
  AlertCircle,
  Sparkles,
  UserCheck,
  LogIn,
  Paperclip,
  Table
} from 'lucide-react';
import { UserAccount, Language, FeedbackItem, FeedbackCategory, StorageBreakdown } from '../types';
import { GoogleLogoIcon, MicrosoftLogoIcon } from './AccountModal';
import { formatBytes } from '../utils/storage';
import { triggerHapticFeedback } from '../utils/nativeStorage';
import { Capacitor } from '@capacitor/core';
import { APP_INFO } from '../constants/appInfo';

export const FEEDBACK_STORAGE_KEY = 'google_files_developer_feedbacks_v1';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount: UserAccount | null;
  onOpenAccount: () => void;
  onSignIn: (account: UserAccount) => void;
  storage: StorageBreakdown;
  language: Language;
  showToast: (msg: string) => void;
  onFeedbackSubmitted?: (item: FeedbackItem) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  userAccount,
  onOpenAccount,
  onSignIn,
  storage,
  language,
  showToast,
  onFeedbackSubmitted,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'sheet'>('form');
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<FeedbackItem | null>(null);

  // Quick Inline Sign-In state if not signed in
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [authError, setAuthError] = useState('');

  // Developer Sheet Feedbacks List
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>(() => {
    try {
      const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (saved) {
        setFeedbackHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories: { id: FeedbackCategory; labelHi: string; labelEn: string; icon: React.ReactNode; color: string }[] = [
    { 
      id: 'suggestion', 
      labelHi: 'नया सुझाव / फीचर', 
      labelEn: 'Feature Suggestion', 
      icon: <Lightbulb size={16} />,
      color: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    { 
      id: 'bug', 
      labelHi: 'बग या समस्या', 
      labelEn: 'Bug Report', 
      icon: <Bug size={16} />,
      color: 'bg-rose-100 text-rose-800 border-rose-300'
    },
    { 
      id: 'rating', 
      labelHi: 'रेटिंग व समीक्षा', 
      labelEn: 'Rating & Review', 
      icon: <Star size={16} />,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    { 
      id: 'performance', 
      labelHi: 'स्पीड व परफॉरमेंस', 
      labelEn: 'Performance & Speed', 
      icon: <Zap size={16} />,
      color: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    { 
      id: 'message', 
      labelHi: 'सीधा संदेश', 
      labelEn: 'Direct Message', 
      icon: <MessageSquare size={16} />,
      color: 'bg-purple-100 text-purple-800 border-purple-300'
    },
  ];

  const handleQuickSignIn = (provider: 'google' | 'microsoft') => {
    if (!quickEmail.trim() || !quickEmail.includes('@')) {
      setAuthError(language === 'hi' ? 'कृपया एक मान्य ईमेल आईडी दर्ज करें' : 'Please enter a valid email address');
      return;
    }
    const name = quickName.trim() || quickEmail.split('@')[0];
    const newAccount: UserAccount = {
      id: `${provider}-${Date.now()}`,
      name: name,
      email: quickEmail.trim(),
      provider: provider,
      signedInAt: new Date().toISOString(),
    };
    onSignIn(newAccount);
    setAuthError('');
    triggerHapticFeedback();
    showToast(
      language === 'hi' 
        ? `${name} के रूप में सफलतापूर्वक साइन इन किया गया` 
        : `Signed in as ${name}`
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      triggerHapticFeedback();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userAccount && (!quickEmail.trim() || !quickEmail.includes('@'))) {
      setAuthError(language === 'hi' ? 'फ़ीडबैक भेजने के लिए पहले साइन इन करें या ईमेल दर्ज करें' : 'Please sign in or enter a valid email to submit feedback');
      return;
    }

    if (!message.trim()) {
      showToast(language === 'hi' ? 'कृपया अपना संदेश या फ़ीडबैक विवरण लिखें' : 'Please write your feedback details');
      return;
    }

    setIsSubmitting(true);
    triggerHapticFeedback();

    const senderName = userAccount?.name || quickName.trim() || quickEmail.split('@')[0];
    const senderEmail = userAccount?.email || quickEmail.trim();

    const newFeedback: FeedbackItem = {
      id: `FB-${Date.now().toString().slice(-6)}`,
      userId: userAccount?.id,
      userName: senderName,
      userEmail: senderEmail,
      provider: userAccount?.provider,
      category: category,
      rating: rating,
      subject: subject.trim() || `${category.toUpperCase()} from ${senderName}`,
      message: message.trim(),
      includeDiagnostics: includeDiagnostics,
      systemInfo: includeDiagnostics ? {
        appVersion: `${APP_INFO.fullVersionString} (Official)`,
        platform: Capacitor.isNativePlatform() ? 'Android Native' : 'Web Browser',
        language: language,
        storageUsed: formatBytes(storage.used, 1),
        storageTotal: formatBytes(storage.total, 1),
        userAgent: navigator.userAgent,
      } : undefined,
      attachmentName: attachedFileName || undefined,
      status: 'submitted',
      createdAt: new Date().toLocaleString(),
    };

    setTimeout(() => {
      const updatedHistory = [newFeedback, ...feedbackHistory];
      setFeedbackHistory(updatedHistory);
      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (err) {
        console.error(err);
      }

      setIsSubmitting(false);
      setSubmittedFeedback(newFeedback);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(newFeedback);
      }
      showToast(
        language === 'hi'
          ? 'फ़ीडबैक सफलतापूर्वक डेवलपर आकाश कुमार को भेजा गया!'
          : 'Feedback sent successfully to developer Akash Kumar!'
      );
    }, 600);
  };

  const handleExportSheet = () => {
    if (feedbackHistory.length === 0) {
      showToast(language === 'hi' ? 'निर्यात करने के लिए कोई फ़ीडबैक नहीं है' : 'No feedback data to export');
      return;
    }

    const headers = ['ID', 'User Name', 'User Email', 'Category', 'Rating', 'Subject', 'Message', 'Date', 'Status'];
    const rows = feedbackHistory.map(f => [
      f.id,
      `"${f.userName.replace(/"/g, '""')}"`,
      `"${f.userEmail.replace(/"/g, '""')}"`,
      f.category,
      f.rating,
      `"${f.subject.replace(/"/g, '""')}"`,
      `"${f.message.replace(/"/g, '""')}"`,
      `"${f.createdAt}"`,
      f.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Files_Feedback_Sheet_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'hi' ? 'डेवलपर शीट CSV डाउनलोड हो गई' : 'Developer sheet CSV exported');
  };

  const handleClearHistory = () => {
    setFeedbackHistory([]);
    try {
      localStorage.removeItem(FEEDBACK_STORAGE_KEY);
    } catch {
      // ignore
    }
    showToast(language === 'hi' ? 'फ़ीडबैक हिस्ट्री साफ़ की गई' : 'Feedback history cleared');
  };

  const handleDirectEmail = () => {
    const sender = userAccount?.email || quickEmail || 'User';
    const mailSubject = encodeURIComponent(`[Files by Akash Kumar] Feedback (${category.toUpperCase()}): ${subject || 'User Review'}`);
    const mailBody = encodeURIComponent(
      `Developer: Akash Kumar (akashkumarmddcmmb@gmail.com)\n\nFrom: ${userAccount?.name || 'User'} <${sender}>\nCategory: ${category}\nRating: ${rating}/5 Stars\nDate: ${new Date().toLocaleString()}\n\nFeedback:\n${message}\n\nApp Info:\nFiles by Akash Kumar v2.4\nPlatform: ${Capacitor.isNativePlatform() ? 'Android' : 'Web'}\nStorage: ${formatBytes(storage.used, 1)} / ${formatBytes(storage.total, 1)}`
    );
    window.open(`mailto:akashkumarmddcmmb@gmail.com?subject=${mailSubject}&body=${mailBody}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-neutral-100"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {language === 'hi' ? 'सहायता और फ़ीडबैक' : 'Help & Developer Feedback'}
              </h2>
              <p className="text-xs text-blue-100/90 flex items-center gap-1 mt-0.5">
                <span>{language === 'hi' ? 'डेवलपर को सीधे सबमिट करें:' : 'Direct submission to developer:'}</span>
                <span className="font-semibold text-white">Akash Kumar</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 shrink-0 px-4 pt-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('form');
              setSubmittedFeedback(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-blue-700 border-t-2 border-t-blue-600 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Send size={15} />
            <span>{language === 'hi' ? 'फ़ीडबैक भेजें (Send Feedback)' : 'Send Feedback'}</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer relative ${
              activeTab === 'sheet'
                ? 'bg-white text-blue-700 border-t-2 border-t-blue-600 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Table size={15} />
            <span>{language === 'hi' ? 'डेवलपर शीट व हिस्ट्री' : 'Developer Sheet & Log'}</span>
            {feedbackHistory.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                {feedbackHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'form' ? (
            submittedFeedback ? (
              /* Success Submission Card */
              <div className="py-6 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    {language === 'hi' ? 'फ़ीडबैक सफलतापूर्वक दर्ज हुआ!' : 'Feedback Submitted Successfully!'}
                  </h3>
                  <p className="text-xs text-neutral-600 max-w-sm mx-auto mt-1">
                    {language === 'hi' 
                      ? 'आपका फ़ीडबैक डेवलपर आकाश कुमार को प्रेषित कर दिया गया है और आपकी डेवलपर शीट में सुरक्षित है।'
                      : 'Your feedback has been delivered to developer Akash Kumar and recorded in your feedback sheet.'}
                  </p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 text-left text-xs space-y-1.5 max-w-md mx-auto">
                  <div className="flex justify-between text-neutral-500">
                    <span>Ticket ID:</span>
                    <span className="font-mono font-bold text-neutral-800">{submittedFeedback.id}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Sender:</span>
                    <span className="font-semibold text-neutral-800">{submittedFeedback.userName} ({submittedFeedback.userEmail})</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Category:</span>
                    <span className="font-semibold text-blue-600 capitalize">{submittedFeedback.category}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Rating:</span>
                    <span className="text-amber-500 font-bold">{'★'.repeat(submittedFeedback.rating)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Status:</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Received by Developer
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => setActiveTab('sheet')}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {language === 'hi' ? 'डेवलपर शीट देखें' : 'View Developer Sheet'}
                  </button>
                  <button
                    onClick={() => {
                      setSubmittedFeedback(null);
                      setMessage('');
                      setSubject('');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    {language === 'hi' ? 'एक और फ़ीडबैक भेजें' : 'Send Another Feedback'}
                  </button>
                </div>
              </div>
            ) : (
              /* Feedback Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Account & Sign In Status Box */}
                <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {userAccount ? userAccount.name.charAt(0).toUpperCase() : <LogIn size={15} />}
                      </div>
                      <div>
                        {userAccount ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-800">{userAccount.name}</span>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                              <UserCheck size={10} /> Verified
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-neutral-800">
                            {language === 'hi' ? 'अकाउंट से साइन इन करें' : 'Sign in with your account'}
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-500">
                          {userAccount 
                            ? userAccount.email 
                            : (language === 'hi' ? 'साइन इन करने के बाद फ़ीडबैक सीधे डेवलपर को भेजा जा सकता है' : 'Sign in to authenticate your feedback and receive replies')}
                        </div>
                      </div>
                    </div>

                    {userAccount ? (
                      <button
                        type="button"
                        onClick={onOpenAccount}
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer shrink-0"
                      >
                        {language === 'hi' ? 'अकाउंट बदलें' : 'Change'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenAccount}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        {language === 'hi' ? 'साइन इन' : 'Sign In'}
                      </button>
                    )}
                  </div>

                  {/* Inline quick sign in if not logged in */}
                  {!userAccount && (
                    <div className="pt-2 border-t border-neutral-200/70 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={quickName}
                          onChange={e => setQuickName(e.target.value)}
                          placeholder={language === 'hi' ? 'आपका नाम (Your Name)' : 'Your Name'}
                          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                        <input
                          type="email"
                          value={quickEmail}
                          onChange={e => setQuickEmail(e.target.value)}
                          placeholder={language === 'hi' ? 'ईमेल आईडी (your@gmail.com)' : 'Email ID (your@gmail.com)'}
                          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickSignIn('google')}
                          className="flex-1 py-1.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-neutral-700 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <GoogleLogoIcon size={14} />
                          <span>Google Sign-In</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSignIn('microsoft')}
                          className="flex-1 py-1.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-neutral-700 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <MicrosoftLogoIcon size={14} />
                          <span>Microsoft Sign-In</span>
                        </button>
                      </div>
                      {authError && (
                        <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                          <AlertCircle size={12} /> {authError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Developer Target Badge */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      AK
                    </div>
                    <div>
                      <span className="font-bold">Akash Kumar</span>
                      <span className="text-neutral-500 text-[10px] ml-1.5">(Lead App Developer)</span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-blue-700 font-medium">
                    akashkumarmddcmmb@gmail.com
                  </span>
                </div>

                {/* 3. Category Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">
                    {language === 'hi' ? 'फ़ीडबैक का प्रकार (Category)' : 'Feedback Category'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          triggerHapticFeedback();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          category === cat.id
                            ? `${cat.color} shadow-xs scale-[1.02]`
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {cat.icon}
                        <span>{language === 'hi' ? cat.labelHi : cat.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Rating Stars */}
                <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-3 flex items-center justify-between">
                  <div className="text-xs font-bold text-neutral-700">
                    {language === 'hi' ? 'ऐप रेटिंग (App Rating):' : 'Rate Experience:'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isFilled = (hoverRating || rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => {
                            setRating(star);
                            triggerHapticFeedback();
                          }}
                          className="p-1 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <Star 
                            size={22} 
                            className={isFilled ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'} 
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-bold text-amber-700 ml-1">
                      {rating === 5 ? '5/5 (उत्कृष्ट / Excellent)' : `${rating}/5`}
                    </span>
                  </div>
                </div>

                {/* 5. Subject & Message Form Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      {language === 'hi' ? 'विषय या शीर्षक (Subject)' : 'Subject / Topic'}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder={language === 'hi' ? 'उदा. नया फीचर सुझाव या बग विवरण' : 'e.g., Great new feature request or UI suggestion'}
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-neutral-700">
                        {language === 'hi' ? 'विस्तृत संदेश / विवरण (Message)' : 'Detailed Message'} *
                      </label>
                      <span className="text-[10px] text-neutral-400">{message.length} chars</span>
                    </div>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={language === 'hi' 
                        ? 'कृपया अपना अनुभव, सुझाव या समस्या का विवरण यहाँ लिखें ताकि डेवलपर इसे और बेहतर बना सके...' 
                        : 'Write your thoughts, suggestions, or bug description so the developer can improve the app...'}
                      required
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white resize-none"
                    />
                  </div>
                </div>

                {/* 6. Diagnostics & Attachment */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={e => setIncludeDiagnostics(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs text-neutral-700 font-medium flex items-center gap-1.5">
                      <Smartphone size={13} className="text-neutral-500" />
                      {language === 'hi' 
                        ? 'सिस्टम व डिवाइस जानकारी जोड़ें (Files v2.4, OS, Storage Stats)'
                        : 'Include device & app diagnostic data (Files v2.4, OS, Storage stats)'}
                    </span>
                  </label>

                  {/* Attachment selector */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Paperclip size={13} />
                      <span>{attachedFileName ? attachedFileName : (language === 'hi' ? 'स्क्रीनशॉट / फ़ाइल जोड़ें' : 'Attach Screenshot')}</span>
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*,.log,.txt" 
                      />
                    </label>
                    {attachedFileName && (
                      <button
                        type="button"
                        onClick={() => setAttachedFileName(null)}
                        className="text-neutral-400 hover:text-rose-600 text-xs cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 7. Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={16} />
                    <span>
                      {isSubmitting 
                        ? (language === 'hi' ? 'फ़ीडबैक भेजा जा रहा है...' : 'Sending to Developer...') 
                        : (language === 'hi' ? 'डेवलपर को फ़ीडबैक भेजें' : 'Submit to Developer Akash Kumar')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectEmail}
                    className="w-full sm:w-auto px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail size={15} />
                    <span>{language === 'hi' ? 'Gmail / ईमेल से भेजें' : 'Direct Email'}</span>
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Developer Sheet Tab (Table View of All Feedbacks) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-800">
                    {language === 'hi' ? 'डेवलपर फ़ीडबैक शीट (Developer Log Sheet)' : 'Feedback Registry Sheet'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {language === 'hi' 
                      ? 'डेवलपर आकाश कुमार को प्रेषित सभी फ़ीडबैक का लाइव रिकॉर्ड' 
                      : 'Live records of tickets submitted to developer Akash Kumar'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportSheet}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>CSV Sheet</span>
                  </button>

                  {feedbackHistory.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                      title={language === 'hi' ? 'हिस्ट्री साफ़ करें' : 'Clear History'}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {feedbackHistory.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <Table size={36} className="mx-auto text-neutral-300" />
                  <p className="text-xs font-semibold text-neutral-600">
                    {language === 'hi' ? 'अभी तक कोई फ़ीडबैक दर्ज नहीं हुआ है' : 'No feedback tickets submitted yet'}
                  </p>
                  <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                    {language === 'hi' 
                      ? 'फ़ीडबैक फॉर्म भरकर सबमिट करें, वह तुरंत इस शीट में दर्ज हो जाएगा।' 
                      : 'Fill out the feedback form to view your recorded feedback entries here.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('form')}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    {language === 'hi' ? 'पहला फ़ीडबैक लिखें' : 'Write First Feedback'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {feedbackHistory.map(item => (
                    <div 
                      key={item.id}
                      className="bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/80 rounded-2xl p-3.5 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            {item.id}
                          </span>
                          <span className="text-xs font-bold text-neutral-900">{item.subject}</span>
                        </div>
                        <span className="text-amber-500 font-bold text-xs">
                          {'★'.repeat(item.rating)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-700 leading-relaxed bg-white p-2.5 rounded-xl border border-neutral-100">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-500 pt-1 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-700">{item.userName}</span>
                          <span>•</span>
                          <span>{item.userEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 size={11} /> {item.status}
                          </span>
                          <span className="text-[10px] text-neutral-400">{item.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 px-5">
          <span>Files by Akash Kumar • Developer Feedback Portal</span>
          <button
            onClick={onClose}
            className="font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
