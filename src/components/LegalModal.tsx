import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  HardDrive, 
  Share2, 
  EyeOff, 
  CheckCircle2, 
  Mail, 
  User, 
  Calendar,
  X,
  Sparkles,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Language } from '../types';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'privacy' | 'terms';
  language: Language;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  language,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);
  const [localLang, setLocalLang] = useState<Language>(language);

  // Sync initial tab when opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setLocalLang(language);
    }
  }, [isOpen, initialTab, language]);

  if (!isOpen) return null;

  const isHi = localLang === 'hi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-neutral-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              {activeTab === 'privacy' ? <ShieldCheck size={22} /> : <FileText size={22} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {activeTab === 'privacy'
                  ? (isHi ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy')
                  : (isHi ? 'नियम और शर्तें (Terms of Service)' : 'Terms & Conditions')}
              </h2>
              <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                <span>Files by Akash Kumar</span>
                <span>•</span>
                <Calendar size={12} />
                <span>{isHi ? 'अंतिम अपडेट: सितम्बर 2026' : 'Last updated: September 2026'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle inside modal */}
            <button
              onClick={() => setLocalLang(prev => prev === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700 transition-colors cursor-pointer"
              title="Toggle Language"
            >
              {isHi ? 'English' : 'हिन्दी'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-100 px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck size={16} />
            <span>{isHi ? 'गोपनीयता नीति (Privacy)' : 'Privacy Policy'}</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileText size={16} />
            <span>{isHi ? 'नियम और शर्तें (Terms)' : 'Terms of Service'}</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-neutral-700 text-xs sm:text-sm leading-relaxed space-y-6 select-text">
          {activeTab === 'privacy' ? (
            <>
              {/* Privacy Highlight Badge */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-emerald-950 flex items-start gap-3.5">
                <ShieldCheck size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-900">
                    {isHi ? '100% ऑफ़लाइन और डेटा सुरक्षा की गारंटी' : '100% Offline & Absolute Data Privacy'}
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    {isHi 
                      ? 'Files by Akash Kumar आपके डिवाइस की किसी भी निजी फ़ाइल, फ़ोटो, वीडियो, या दस्तावेज़ को किसी तीसरे पक्ष या बाहरी सर्वर पर अपलोड नहीं करता है। आपकी सभी फ़ाइलें आपके फ़ोन में सुरक्षित रहती हैं।'
                      : 'Files by Akash Kumar operates completely on-device. We never upload, transmit, or sell your photos, videos, documents, or personal files to any external servers or third parties.'}
                  </p>
                </div>
              </div>

              {/* Section 1: Information We Access */}
              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <HardDrive size={18} className="text-blue-600" />
                  <span>{isHi ? '1. डिवाइस परमिशन्स और उनका उपयोग (Device Permissions)' : '1. Device Permissions & Usage'}</span>
                </h3>
                <p className="text-neutral-600">
                  {isHi
                    ? 'एप्लिकेशन को सुचारू रूप से चलाने के लिए केवल आवश्यक स्थानीय सिस्टम अनुमतियों का उपयोग किया जाता है:'
                    : 'To perform native file operations seamlessly, the application requests the following local device permissions:'}
                </p>
                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-blue-600" />
                      <span>{isHi ? 'सभी फ़ाइलें एक्सेस (MANAGE_EXTERNAL_STORAGE):' : 'All Files Access (Storage):'}</span>
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      {isHi
                        ? 'फ़ाइलों को ब्राउज़ करने, जंक फ़ाइलें साफ़ करने, कॉपी/मूव करने, फ़ोल्डर बनाने और ZIP/RAR एक्सट्रैक्ट करने के लिए आवश्यक है।'
                        : 'Required to browse, organize, clean junk files, copy/move, create folders, and extract/compress archives across internal storage and SD cards.'}
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-blue-600" />
                      <span>{isHi ? 'ऑडियो और वीडियो प्लेबैक (Media Access):' : 'Media Playback & Preview:'}</span>
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      {isHi
                        ? 'इन-बिल्ट MP3 ऑडियो प्लेयर और HD वीडियो प्लेयर में बिना किसी बाहरी ऐप के मीडिया चलाने के लिए।'
                        : 'Allows smooth in-app playback of music, videos, voice recordings, and document previews without external apps.'}
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-blue-600" />
                      <span>{isHi ? 'क्विक शेयर (Peer-to-Peer Nearby Share):' : 'Quick Share (Local P2P Transfer):'}</span>
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      {isHi
                        ? 'आस-पास के डिवाइसों के बीच बिना इंटरनेट के सीधी वाई-फ़ाई या ब्लूटूथ फ़ाइल शेयरिंग के लिए उपयोग किया जाता है।'
                        : 'Enables high-speed peer-to-peer file transfers directly between devices with zero mobile data usage.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2: Safe Folder & Security */}
              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Lock size={18} className="text-emerald-600" />
                  <span>{isHi ? '2. सुरक्षित फ़ोल्डर (Safe Folder & Vault Security)' : '2. Safe Folder Vault & Security'}</span>
                </h3>
                <p className="text-neutral-600">
                  {isHi
                    ? 'सुरक्षित फ़ोल्डर (Safe Folder) में रखी गई फ़ाइलें आपके 4-अंकीय पिन (PIN) द्वारा सुरक्षित होती हैं। पिन को स्थानीय रूप से एनक्रिप्ट करके डिवाइस पर रखा जाता है। कोई भी अन्य ऐप इसे नहीं देख सकता।'
                    : 'Files moved into the Safe Folder are protected by your 4-digit PIN. PINs are stored securely within your device sandboxed storage and are never transmitted over the network.'}
                </p>
              </section>

              {/* Section 3: No Third-Party Ads or Tracking */}
              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <EyeOff size={18} className="text-purple-600" />
                  <span>{isHi ? '3. कोई ट्रैकिंग या विज्ञापन नहीं (Zero Tracking & No Ads)' : '3. Zero Tracking & No Advertisements'}</span>
                </h3>
                <p className="text-neutral-600">
                  {isHi
                    ? 'हम किसी भी प्रकार का उपयोगकर्ता ट्रैकिंग डेटा, एनालिटिक्स या व्यक्तिगत पहचान योग्य जानकारी (PII) एकत्रित नहीं करते हैं। यह एप्लिकेशन पूरी तरह से विज्ञापन-मुक्त (Ad-Free) और यूजर-फ्रेंडली है।'
                    : 'We do not collect usage diagnostics, tracking cookies, or personally identifiable information (PII). The application is clean, private, and free from intrusive advertisements.'}
                </p>
              </section>

              {/* Section 4: Developer Contact */}
              <section className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  <span>{isHi ? 'डेवलपर और संपर्क जानकारी (Developer Contact)' : 'Developer & Contact Information'}</span>
                </h4>
                <p className="text-xs text-neutral-600">
                  {isHi
                    ? 'यदि आपके पास इस गोपनीयता नीति के संबंध में कोई प्रश्न या सुझाव हैं, तो आप सीधे संपर्क कर सकते हैं:'
                    : 'If you have any questions or feedback regarding this Privacy Policy, feel free to reach out:'}
                </p>
                <div className="text-xs font-semibold text-neutral-800 space-y-1 pt-1">
                  <p className="flex items-center gap-2">
                    <span className="text-neutral-500">{isHi ? 'डेवलपर:' : 'Developer:'}</span>
                    <span>Akash Kumar</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-blue-600" />
                    <a href="mailto:akashkumarmddcmmb@gmail.com" className="text-blue-600 hover:underline">
                      akashkumarmddcmmb@gmail.com
                    </a>
                  </p>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Terms Highlight */}
              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 text-blue-950 flex items-start gap-3.5">
                <FileText size={24} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-blue-900">
                    {isHi ? 'उपयोग की शर्तें और दिशा-निर्देश' : 'Terms of Service & Usage Guidelines'}
                  </h4>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    {isHi
                      ? 'Files by Akash Kumar का उपयोग करके, आप इन सरल और पारदर्शी नियमों और शर्तों से सहमत होते हैं।'
                      : 'By downloading, installing, or using Files by Akash Kumar, you acknowledge and agree to the following fair terms of service.'}
                  </p>
                </div>
              </div>

              {/* Term 1: License & Permitted Use */}
              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-600" />
                  <span>{isHi ? '1. लाइसेंस और अनुमत उपयोग (Permitted Use)' : '1. License & Permitted Use'}</span>
                </h3>
                <p className="text-neutral-600">
                  {isHi
                    ? 'Files by Akash Kumar एक निःशुल्क, आधुनिक और सुरक्षित फ़ाइल प्रबंधक है। आपको अपने व्यक्तिगत, शैक्षणिक या व्यावसायिक उपयोग के लिए इस एप्लिकेशन का उपयोग करने की पूरी अनुमति है।'
                    : 'Files by Akash Kumar is provided as a free, modern file management tool. You are granted a personal, non-exclusive license to manage, clean, organize, share, and view your files.'}
                </p>
              </section>

              {/* Term 2: User Responsibility */}
              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>{isHi ? '2. उपयोगकर्ता की जिम्मेदारी (User Responsibility)' : '2. User Responsibilities & Data Backups'}</span>
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
                  <li>
                    <strong>{isHi ? 'फ़ाइल बैकअप:' : 'File Backups:'}</strong>{' '}
                    {isHi
                      ? 'फ़ाइलों को हटाने (Delete) या ट्रैश साफ़ करने से पहले हमेशा पुष्टि करें कि महत्वपूर्ण डेटा का बैकअप मौजूद है।'
                      : 'You are responsible for regularly backing up important files before performing permanent deletion or cache cleaning.'}
                  </li>
                  <li>
                    <strong>{isHi ? 'सुरक्षित फ़ोल्डर पिन:' : 'Safe Folder PIN:'}</strong>{' '}
                    {isHi
                      ? 'सुरक्षित फ़ोल्डर का 4-अंकीय पिन याद रखें। सुरक्षा कारणों से पिन खो जाने पर फ़ाइलें रीसेट की जा सकती हैं।'
                      : 'Please remember your 4-digit Safe Folder PIN. Because vault data is encrypted locally, forgetting the PIN may require a reset.'}
                  </li>
                  <li>
                    <strong>{isHi ? 'कॉपीराइट सामग्री:' : 'Copyright Compliance:'}</strong>{' '}
                    {isHi
                      ? 'क्विक शेयर या फ़ाइल ट्रांसफर करते समय लागू बौद्धिक संपदा और कॉपीराइट कानूनों का पालन करें।'
                      : 'Ensure you have the necessary rights and permissions when sharing files peer-to-peer.'}
                  </li>
                </ul>
              </section>

              {/* Term 3: Disclaimer & Limitation of Liability */}
              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-600" />
                  <span>{isHi ? '3. दायित्व की सीमा (Limitation of Liability)' : '3. Disclaimer & Limitation of Liability'}</span>
                </h3>
                <p className="text-neutral-600">
                  {isHi
                    ? 'यह सॉफ़्टवेयर "जैसा है" (AS-IS) आधार पर प्रदान किया जाता है। डेवलपर आकस्मिक डेटा हानि, हार्डवेयर खराबी, या अनुचित फ़ाइल विलोपन के लिए उत्तरदायी नहीं होगा।'
                    : 'The software is provided "AS-IS" without warranties of any kind. While built with extreme precision and stability, the developer shall not be liable for any incidental data loss or hardware malfunctions.'}
                </p>
              </section>

              {/* Term 4: Updates & Modifications */}
              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600" />
                  <span>{isHi ? '4. अपडेट और संशोधन (Updates & Changes)' : '4. Updates & Modifications'}</span>
                </h3>
                <p className="text-neutral-600">
                  {isHi
                    ? 'हम समय-समय पर नई सुविधाओं, प्रदर्शन सुधार और Android संगतता के लिए एप्लिकेशन और इन शर्तों को अपडेट कर सकते हैं।'
                    : 'We may periodically update this application and its terms to introduce new features, improve security, and maintain Android compatibility.'}
                </p>
              </section>

              {/* Contact card */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs text-neutral-600 space-y-1">
                <p className="font-semibold text-neutral-800">
                  {isHi ? 'स्वामित्व एवं अधिकार:' : 'Ownership & Copyright:'}
                </p>
                <p>© 2026 Akash Kumar. All rights reserved.</p>
                <p className="pt-1">
                  Email: <a href="mailto:akashkumarmddcmmb@gmail.com" className="text-blue-600 hover:underline">akashkumarmddcmmb@gmail.com</a>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">
            Files by Akash Kumar • v2.4
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {isHi ? 'समझ गया / बंद करें' : 'I Understand / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
