import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  X, 
  ArrowLeft,
  Star, 
  Trash2, 
  Download, 
  Info, 
  FileText, 
  Film, 
  Music, 
  Package, 
  File, 
  Share2, 
  ExternalLink,
  FolderArchive,
  ArrowDownToLine,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes, formatDate } from '../utils/storage';
import { translations } from '../utils/translations';
import { openRealFile, shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';
import { isArchiveFile, getArchiveBadge } from '../utils/archiveUtils';
import { resolveMediaSrc } from '../utils/mediaUtils';

interface FileViewerModalProps {
  file: FileItem | null;
  language: Language;
  onClose: () => void;
  onToggleStar: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onDownload?: (file: FileItem) => void;
  onExtractArchive?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  language,
  onClose,
  onToggleStar,
  onMoveToTrash,
  onDownload,
  onExtractArchive,
  onShare,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const t = translations[language];

  // Auto-hide controls for full immersive image viewing
  const triggerShowControls = () => {
    setShowControls(prev => !prev);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
  };

  useEffect(() => {
    setZoom(1);
    setShowInfo(false);
    setShowControls(true);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(prev => Math.min(prev + 0.3, 3));
      if (e.key === '-') setZoom(prev => Math.max(prev - 0.3, 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [file]);

  if (!file) return null;

  const isImage = file.type === 'image';
  const isArchive = isArchiveFile(file.name, file.mimeType);
  const archiveBadge = isArchive ? getArchiveBadge(file.name) : null;

  const handleShareFile = () => {
    triggerHapticFeedback();
    if (onShare) {
      onShare(file);
    } else {
      shareNativeFile(
        file.name,
        `Sharing ${file.name} (${formatBytes(file.size)})`,
        file.url,
        undefined,
        file
      );
    }
  };

  const handleDownload = () => {
    triggerHapticFeedback();
    if (onDownload) {
      onDownload(file);
      return;
    }
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (file.content) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const toggleBrowserFullscreen = () => {
    triggerHapticFeedback();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsBrowserFullscreen(false);
    }
  };

  const resolvedUrl = file.url && file.url.startsWith('/') 
    ? Capacitor.convertFileSrc(file.url) 
    : (file.url || file.thumbnail);

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={isImage ? triggerShowControls : undefined}
    >
      {/* PHOTO VIEW: Clean Floating Round Back Button (No bulky upper header) */}
      {isImage ? (
        <div 
          className={`absolute top-4 left-4 z-40 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="p-3 rounded-full bg-black/50 hover:bg-black/80 active:scale-95 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
            title={language === 'hi' ? 'पीछे जाएं' : 'Back'}
          >
            <ArrowLeft size={22} />
          </button>
        </div>
      ) : (
        /* NON-IMAGE VIEW: Standard clean header for documents, text, archives */
        <div 
          className="w-full z-30 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 pt-safe flex items-center justify-between gap-3 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate text-white leading-tight" title={file.name}>
                {file.name}
              </h2>
              <p className="text-[11px] text-neutral-400 truncate">
                {formatBytes(file.size)} • {file.folder}
              </p>
            </div>
          </div>

          {/* Action icons for non-images */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareFile}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 size={19} />
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                onToggleStar(file.id);
              }}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title={file.isStarred ? 'Unstar' : 'Star'}
            >
              <Star size={19} className={file.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                setShowInfo(!showInfo);
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                showInfo ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title="File details"
            >
              <Info size={19} />
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                onMoveToTrash(file.id);
                onClose();
              }}
              className="p-2 text-neutral-300 hover:text-rose-400 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title="Move to Trash"
            >
              <Trash2 size={19} />
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN CONTENT CANVAS */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-0 overflow-hidden">
        {/* Photo View: Clean Image Display with double-tap zoom */}
        {isImage && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <img
              src={resolvedUrl}
              alt={file.name}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out select-none"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
              }}
              draggable={false}
              onDoubleClick={() => {
                triggerHapticFeedback();
                setZoom(prev => (prev > 1 ? 1 : 2));
              }}
            />
          </div>
        )}

        {/* Video Player in Full Screen */}
        {file.type === 'video' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <video
              src={resolveMediaSrc(file.url)}
              controls
              autoPlay
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
              }}
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl bg-black"
            />
          </div>
        )}

        {/* Text Document / Code Viewer */}
        {file.type === 'document' && file.content && (
          <div className="w-full h-full max-w-4xl mx-auto p-4 sm:p-6 overflow-y-auto">
            <div className="bg-neutral-900 rounded-2xl p-4 sm:p-6 font-mono text-xs sm:text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed border border-neutral-800 shadow-2xl">
              {file.content}
            </div>
          </div>
        )}

        {/* Binary Document / PDF */}
        {file.type === 'document' && !file.content && (
          <div className="text-center p-8 bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-neutral-800 max-w-sm w-full space-y-4 shadow-2xl mx-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <FileText size={44} />
            </div>
            <div>
              <h3 className="text-base font-bold truncate text-white">{file.name}</h3>
              <p className="text-xs text-neutral-400 mt-1">{formatBytes(file.size)} • {file.mimeType}</p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              {file.url && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink size={16} />
                  <span>{language === 'hi' ? 'दस्तावेज़ ऐप में खोलें' : 'Open in Document App'}</span>
                </button>
              )}
              <button
                onClick={handleDownload}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'डाउनलोड करें' : 'Download File'}
              </button>
            </div>
          </div>
        )}

        {/* Archive Files */}
        {isArchive && (
          <div className="text-center p-8 bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-neutral-800 max-w-md w-full space-y-5 shadow-2xl mx-4">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <FolderArchive size={44} />
            </div>
            <div>
              {archiveBadge && (
                <span className={`inline-block mb-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${archiveBadge.bg} ${archiveBadge.color} ${archiveBadge.border}`}>
                  {archiveBadge.label} ARCHIVE
                </span>
              )}
              <h3 className="text-base font-bold truncate text-white">{file.name}</h3>
              <p className="text-xs text-neutral-400 mt-1">{formatBytes(file.size)} • {file.folder}</p>
            </div>

            {onExtractArchive && (
              <button
                onClick={() => {
                  onClose();
                  onExtractArchive(file);
                }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-neutral-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
              >
                <ArrowDownToLine size={20} className="text-neutral-950" />
                <span>{language === 'hi' ? 'फ़ाइलें अनज़िप / एक्सट्रैक्ट करें' : 'Extract Archive Files'}</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              {file.url && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink size={15} /> Open in App
                </button>
              )}
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {/* APK / Others */}
        {!isArchive && (file.type === 'apk' || file.type === 'other') && (
          <div className="text-center p-8 bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-neutral-800 max-w-sm w-full space-y-4 shadow-2xl mx-4">
            <div className="w-18 h-18 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              {file.type === 'apk' ? <Package size={40} /> : <File size={40} />}
            </div>
            <h3 className="text-base font-bold truncate text-white">{file.name}</h3>
            <p className="text-xs text-neutral-400">{formatBytes(file.size)} • {file.mimeType}</p>
            
            {file.type === 'apk' && file.url && (
              <button
                onClick={() => openRealFile(file.url!)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
              >
                <Package size={17} /> Install App / ऐप इनस्टॉल करें
              </button>
            )}

            {file.type !== 'apk' && file.url && (
              <button
                onClick={() => openRealFile(file.url!)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink size={15} /> Open in Default App / ऐप में खोलें
              </button>
            )}

            <button
              onClick={handleDownload}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Download File
            </button>
          </div>
        )}

        {/* Slide-out File Details Drawer */}
        {showInfo && (
          <div 
            className="absolute inset-y-0 right-0 w-80 bg-neutral-900/95 backdrop-blur-lg border-l border-neutral-800 p-6 overflow-y-auto space-y-4 shadow-2xl z-40 animate-in slide-in-from-right duration-200 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="font-bold text-neutral-100 text-sm">{language === 'hi' ? 'फ़ाइल विवरण' : 'File Details'}</span>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'नाम' : 'File Name'}</span>
                <span className="font-bold text-neutral-100 break-words mt-0.5 block">{file.name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'आकार' : 'Size'}</span>
                <span className="font-semibold text-neutral-200">{formatBytes(file.size)} ({file.size.toLocaleString()} bytes)</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'फ़ोल्डर पथ' : 'Storage Path'}</span>
                <span className="font-mono text-[11px] text-blue-400 break-all">{file.folder}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'प्रकार' : 'Type'}</span>
                <span className="uppercase text-neutral-200 font-semibold">{file.type} ({file.mimeType})</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px] font-medium uppercase tracking-wider">{language === 'hi' ? 'बनाया गया' : 'Date Created'}</span>
                <span className="text-neutral-300">{formatDate(file.createdAt)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PHOTO VIEW BOTTOM BAR: Clean Google Photos-Style Bottom Action Bar (Share, Star, Info, Delete) */}
      {isImage && (
        <div 
          className={`w-full z-30 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 py-4 pb-safe flex items-center justify-around max-w-lg mx-auto ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Share */}
          <button
            onClick={handleShareFile}
            className="flex flex-col items-center gap-1 text-neutral-200 hover:text-white transition-colors cursor-pointer group"
            title="Share"
          >
            <div className="p-2.5 rounded-full group-hover:bg-white/10 active:scale-95 transition-all">
              <Share2 size={21} />
            </div>
            <span className="text-[11px] font-medium">{language === 'hi' ? 'शेयर' : 'Share'}</span>
          </button>

          {/* Star / Favorite */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              onToggleStar(file.id);
            }}
            className="flex flex-col items-center gap-1 text-neutral-200 hover:text-white transition-colors cursor-pointer group"
            title={file.isStarred ? 'Unstar' : 'Star'}
          >
            <div className="p-2.5 rounded-full group-hover:bg-white/10 active:scale-95 transition-all">
              <Star size={21} className={file.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
            </div>
            <span className="text-[11px] font-medium">
              {file.isStarred ? (language === 'hi' ? 'पसंदीदा' : 'Starred') : (language === 'hi' ? 'स्टार' : 'Star')}
            </span>
          </button>

          {/* Details / Info */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              setShowInfo(!showInfo);
            }}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer group ${
              showInfo ? 'text-blue-400' : 'text-neutral-200 hover:text-white'
            }`}
            title="Info"
          >
            <div className={`p-2.5 rounded-full active:scale-95 transition-all ${showInfo ? 'bg-blue-600/30' : 'group-hover:bg-white/10'}`}>
              <Info size={21} />
            </div>
            <span className="text-[11px] font-medium">{language === 'hi' ? 'जानकारी' : 'Info'}</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              onMoveToTrash(file.id);
              onClose();
            }}
            className="flex flex-col items-center gap-1 text-neutral-200 hover:text-rose-400 transition-colors cursor-pointer group"
            title="Delete"
          >
            <div className="p-2.5 rounded-full group-hover:bg-rose-500/20 active:scale-95 transition-all">
              <Trash2 size={21} />
            </div>
            <span className="text-[11px] font-medium">{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
