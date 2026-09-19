import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  MessageSquare, 
  Copy, 
  Download, 
  QrCode, 
  Radio, 
  Check, 
  FileText, 
  Music, 
  Film, 
  Image as ImageIcon, 
  Send, 
  ExternalLink,
  Files,
  Mail,
  Smartphone
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { triggerHapticFeedback } from '../utils/nativeStorage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  files?: FileItem[];
  language: Language;
  onOpenQuickShare?: (files: FileItem[]) => void;
  showToast?: (message: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  file,
  files,
  language,
  onOpenQuickShare,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine target files (multi or single)
  const targetFiles: FileItem[] = (files && files.length > 0)
    ? files
    : (file ? [file] : []);

  if (targetFiles.length === 0) return null;

  const isMulti = targetFiles.length > 1;
  const primaryFile = targetFiles[0];
  const totalSize = targetFiles.reduce((acc, f) => acc + f.size, 0);

  const getFileIcon = (item: FileItem) => {
    switch (item.type) {
      case 'image':
        return <ImageIcon size={20} className="text-blue-500" />;
      case 'video':
        return <Film size={20} className="text-rose-500" />;
      case 'audio':
        return <Music size={20} className="text-amber-500" />;
      case 'document':
        return <FileText size={20} className="text-emerald-500" />;
      default:
        return <FileText size={20} className="text-purple-500" />;
    }
  };

  const showNotification = (msg: string) => {
    setFeedbackNotice(msg);
    if (showToast) showToast(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Generate shareable message string
  const generateShareText = () => {
    if (isMulti) {
      const fileList = targetFiles.slice(0, 5).map((f, i) => `${i + 1}. ${f.name} (${formatBytes(f.size)})`).join('\n');
      const moreText = targetFiles.length > 5 ? `\n...and ${targetFiles.length - 5} more files` : '';
      return `📁 *${targetFiles.length} files from Files by Akash Kumar* (${formatBytes(totalSize)})\n\n${fileList}${moreText}\n\nShared via Files by Akash Kumar\n${window.location.href}`;
    }
    return `📁 *${primaryFile.name}* (${formatBytes(primaryFile.size)})\nShared via Files by Akash Kumar\n${primaryFile.url || window.location.href}`;
  };

  const shareText = generateShareText();
  const rawShareUrl = !isMulti && primaryFile.url && primaryFile.url.startsWith('http') ? primaryFile.url : window.location.href;

  // 1. WhatsApp Share
  const handleWhatsAppShare = () => {
    triggerHapticFeedback();
    const encoded = encodeURIComponent(shareText);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    
    // Copy to clipboard first to ensure user never loses message if popup is blocked
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText);
      }
    } catch {}

    const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      // If popup blocked, window.location fallback or prompt
      showNotification(language === 'hi' ? 'व्हाट्सएप संदेश कॉपी हो गया! व्हाट्सएप खोलकर पेस्ट करें' : 'WhatsApp message copied! Open WhatsApp to paste');
    } else {
      showNotification(language === 'hi' ? 'व्हाट्सएप खुल रहा है...' : 'Opening WhatsApp...');
    }
  };

  // 2. Telegram Share
  const handleTelegramShare = () => {
    triggerHapticFeedback();
    const encodedText = encodeURIComponent(shareText);
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(rawShareUrl)}&text=${encodedText}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
    showNotification(language === 'hi' ? 'टेलीग्राम खुल रहा है...' : 'Opening Telegram...');
  };

  // 3. Email Share
  const handleEmailShare = () => {
    triggerHapticFeedback();
    const subject = encodeURIComponent(isMulti ? `Shared ${targetFiles.length} files via Files by Akash Kumar` : `File: ${primaryFile.name}`);
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // 4. Quick Share (Nearby P2P)
  const handleQuickShare = () => {
    triggerHapticFeedback();
    onClose();
    if (onOpenQuickShare) {
      onOpenQuickShare(targetFiles);
    }
  };

  // 5. System Native Share Sheet
  const handleNativeShare = async () => {
    triggerHapticFeedback();
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        // Attempt sharing blob file if single file with blob
        if (!isMulti && primaryFile.url && primaryFile.url.startsWith('blob:')) {
          try {
            const resp = await fetch(primaryFile.url);
            const blob = await resp.blob();
            const fileObj = new File([blob], primaryFile.name, { type: blob.type || 'application/octet-stream' });
            if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
              await navigator.share({
                title: primaryFile.name,
                text: `Sharing ${primaryFile.name}`,
                files: [fileObj],
              });
              showNotification(language === 'hi' ? 'शेयर सफल!' : 'Shared successfully!');
              return;
            }
          } catch (e) {
            console.warn('Native blob share failed:', e);
          }
        }

        await navigator.share({
          title: isMulti ? `${targetFiles.length} files` : primaryFile.name,
          text: shareText,
          url: rawShareUrl,
        });
        showNotification(language === 'hi' ? 'शेयर सफल!' : 'Shared successfully!');
        return;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return; // User closed sheet
      console.warn('Native share failed:', err);
    }

    // Fallback: Copy to clipboard
    await handleCopyText();
  };

  // 6. Copy Link / Details to Clipboard
  const handleCopyText = async () => {
    triggerHapticFeedback();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showNotification(language === 'hi' ? 'क्लिपबोर्ड पर कॉपी हो गया!' : 'Copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Clipboard copy error:', e);
      showNotification(language === 'hi' ? 'कॉपी करने में त्रुटि' : 'Failed to copy');
    }
  };

  // 7. Download File(s)
  const handleDownloadFiles = () => {
    triggerHapticFeedback();
    showNotification(
      language === 'hi' 
        ? `${targetFiles.length} फ़ाइल(ें) डाउनलोड हो रही हैं...` 
        : `Downloading ${targetFiles.length} file(s)...`
    );

    targetFiles.forEach((f, idx) => {
      setTimeout(() => {
        if (f.url) {
          const a = document.createElement('a');
          a.href = f.url;
          a.download = f.name;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (f.content) {
          const blob = new Blob([f.content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = f.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, idx * 300);
    });
  };

  // QR Code URL for sharing
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rawShareUrl)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-[#1f2420] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 animate-in slide-in-from-bottom duration-250 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Share2 size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {isMulti 
                  ? (language === 'hi' ? `${targetFiles.length} फ़ाइलें शेयर करें` : `Share ${targetFiles.length} Files`) 
                  : (language === 'hi' ? 'फ़ाइल शेयर करें' : 'Share File')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {language === 'hi' ? 'व्हाट्सएप, क्विक शेयर, क्यूआर या लिंक से भेजें' : 'Send via WhatsApp, Quick Share, QR or link'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title={language === 'hi' ? 'बंद करें' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* In-Modal Feedback Notice */}
        {feedbackNotice && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center animate-in fade-in flex items-center justify-center gap-1.5 shadow-inner">
            <Check size={14} />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Selected File(s) Details Card */}
        <div className="p-3.5 sm:p-4 bg-blue-50/60 dark:bg-blue-950/20 border-b border-neutral-100 dark:border-neutral-800">
          {isMulti ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Files size={18} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {targetFiles.length} {language === 'hi' ? 'फ़ाइलें चुनी गईं' : 'Files Selected'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {formatBytes(totalSize)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                {targetFiles.slice(0, 6).map((f) => (
                  <div 
                    key={f.id} 
                    className="w-10 h-10 rounded-xl bg-white dark:bg-[#283029] border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
                    title={`${f.name} (${formatBytes(f.size)})`}
                  >
                    {f.thumbnail ? (
                      <img src={f.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      getFileIcon(f)
                    )}
                  </div>
                ))}
                {targetFiles.length > 6 && (
                  <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                    +{targetFiles.length - 6}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#283029] border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                {primaryFile.thumbnail ? (
                  <img src={primaryFile.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  getFileIcon(primaryFile)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate" title={primaryFile.name}>
                  {primaryFile.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {formatBytes(primaryFile.size)} • {primaryFile.folder || 'Storage'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Share Action Grid (Scrollable) */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {/* 1. WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <MessageSquare size={18} />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-bold block truncate">WhatsApp</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block truncate">
                  {language === 'hi' ? 'सीधा भेजें' : 'Send message'}
                </span>
              </div>
            </button>

            {/* 2. Quick Share (Nearby Devices P2P) */}
            <button
              onClick={handleQuickShare}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-900 dark:text-blue-100 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Radio size={18} />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-bold block truncate">Quick Share</span>
                <span className="text-[10px] text-blue-700 dark:text-blue-300 block truncate">
                  {language === 'hi' ? 'पास के डिवाइस' : 'Nearby P2P'}
                </span>
              </div>
            </button>

            {/* 3. System Native Share Sheet */}
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-900 dark:text-purple-100 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Share2 size={18} />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-bold block truncate">System Share</span>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 block truncate">
                  {language === 'hi' ? 'फ़ोन ऐप्स पर' : 'Mobile apps'}
                </span>
              </div>
            </button>

            {/* 4. Copy Text / Link */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-100 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-bold block truncate">
                  {copied ? (language === 'hi' ? 'कॉपी हो गया!' : 'Copied!') : (language === 'hi' ? 'लिंक कॉपी करें' : 'Copy link')}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 block truncate">
                  {language === 'hi' ? 'क्लिपबोर्ड पर सहेजें' : 'To clipboard'}
                </span>
              </div>
            </button>
          </div>

          {/* Secondary Quick Share Channels (Telegram & Email) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleTelegramShare}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/40 text-sky-800 dark:text-sky-200 text-xs font-semibold hover:bg-sky-100 transition-colors cursor-pointer"
            >
              <Send size={15} />
              <span>Telegram</span>
            </button>

            <button
              onClick={handleEmailShare}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 text-rose-800 dark:text-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Mail size={15} />
              <span>Email / Gmail</span>
            </button>
          </div>

          {/* Secondary Actions Row: QR Code Toggle & Download */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setShowQr(!showQr);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <QrCode size={16} />
              <span>{showQr ? (language === 'hi' ? 'QR छिपाएं' : 'Hide QR') : (language === 'hi' ? 'QR कोड से शेयर करें' : 'Scan QR Code')}</span>
            </button>

            <button
              onClick={handleDownloadFiles}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download size={16} />
              <span>
                {isMulti 
                  ? (language === 'hi' ? 'सभी डाउनलोड करें' : 'Download All') 
                  : (language === 'hi' ? 'डाउनलोड करें' : 'Download')}
              </span>
            </button>
          </div>

          {/* QR Code Scan View (if toggled) */}
          {showQr && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center space-y-2 animate-in fade-in duration-200">
              <div className="p-2 bg-white rounded-2xl shadow-md border border-neutral-200">
                <img src={qrCodeUrl} alt="QR Code Share" className="w-40 h-40 object-contain" />
              </div>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {language === 'hi' ? 'किसी भी फोन के कैमरे से स्कैन करके फ़ाइल प्राप्त करें' : 'Scan with any phone camera to receive this file'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
