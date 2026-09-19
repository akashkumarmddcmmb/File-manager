import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  X, 
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
  Maximize2,
  Minimize2,
  ExternalLink,
  FolderArchive,
  ArrowDownToLine,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Eye
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
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  language,
  onClose,
  onToggleStar,
  onMoveToTrash,
  onDownload,
  onExtractArchive,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const t = translations[language];

  // Auto-hide controls for full immersive image viewing
  const triggerShowControls = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (file?.type === 'image' && !showInfo) {
        setShowControls(false);
      }
    }, 4500);
  };

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setShowInfo(false);
    triggerShowControls();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === 'r' || e.key === 'R') handleRotate();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [file]);

  if (!file) return null;

  const isArchive = isArchiveFile(file.name, file.mimeType);
  const archiveBadge = isArchive ? getArchiveBadge(file.name) : null;

  const handleZoomIn = () => {
    triggerHapticFeedback();
    setZoom(prev => Math.min(prev + 0.25, 3.5));
    triggerShowControls();
  };

  const handleZoomOut = () => {
    triggerHapticFeedback();
    setZoom(prev => Math.max(prev - 0.25, 0.5));
    triggerShowControls();
  };

  const handleRotate = () => {
    triggerHapticFeedback();
    setRotation(prev => (prev + 90) % 360);
    triggerShowControls();
  };

  const handleReset = () => {
    triggerHapticFeedback();
    setZoom(1);
    setRotation(0);
    triggerShowControls();
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

  const handleDownload = () => {
    triggerHapticFeedback();
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.target = '_blank';
      a.click();
    } else if (file.content) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const resolvedUrl = file.url && file.url.startsWith('/') 
    ? Capacitor.convertFileSrc(file.url) 
    : (file.url || file.thumbnail);

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={triggerShowControls}
    >
      {/* 1. TOP APP BAR (Full Width Immersive Header) */}
      <div 
        className={`w-full z-30 transition-all duration-300 bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 py-3 pt-safe flex items-center justify-between gap-3 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="p-2.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={22} />
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

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              triggerHapticFeedback();
              file.url && shareNativeFile(file.name, `Sharing ${file.name} (${formatBytes(file.size)})`, file.url);
            }}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback();
              onToggleStar(file.id);
            }}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={file.isStarred ? 'Unstar' : 'Star'}
          >
            <Star size={20} className={file.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
          </button>
          <button
            onClick={toggleBrowserFullscreen}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={isBrowserFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isBrowserFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback();
              setShowInfo(!showInfo);
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showInfo ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            title="File details"
          >
            <Info size={20} />
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback();
              onMoveToTrash(file.id);
              onClose();
            }}
            className="p-2 text-neutral-300 hover:text-rose-400 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Move to Trash"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* 2. FULL SCREEN CONTENT CANVAS */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Image Full-Screen Viewer */}
        {file.type === 'image' && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <img
              src={resolvedUrl}
              alt={file.name}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out select-none shadow-2xl"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              draggable={false}
              onDoubleClick={zoom > 1 ? handleReset : handleZoomIn}
            />
          </div>
        )}

        {/* Video Player in Full Screen */}
        {file.type === 'video' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
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

        {/* Audio Player */}
        {file.type === 'audio' && (
          <div className="w-full max-w-md p-6 bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-neutral-800 space-y-5 text-center shadow-2xl">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Music size={48} />
            </div>
            <div>
              <h3 className="text-lg font-bold truncate text-white">{file.name}</h3>
              <p className="text-xs text-neutral-400 mt-1">{formatBytes(file.size)} • {file.folder}</p>
            </div>
            <audio 
              src={resolveMediaSrc(file.url)} 
              controls 
              autoPlay 
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
              }}
              className="w-full" 
            />
            {file.url && (
              <button
                onClick={() => openRealFile(file.url!)}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-neutral-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Music size={16} className="fill-neutral-950" /> Play in Phone Music Player / फ़ोन प्लेयर में बजाएं
              </button>
            )}
          </div>
        )}

        {/* Document Viewer */}
        {file.type === 'document' && (
          <div className="w-full max-w-3xl bg-neutral-900/90 backdrop-blur-md p-6 rounded-3xl border border-neutral-800 text-neutral-200 text-xs sm:text-sm font-mono whitespace-pre-wrap max-h-[80vh] overflow-y-auto leading-relaxed shadow-2xl">
            {file.content || (
              <div className="text-center py-12 text-neutral-400 font-sans space-y-4">
                <FileText size={56} className="mx-auto text-emerald-400 opacity-90" />
                <p className="text-base font-bold text-neutral-200">Document / PDF</p>
                <p className="text-xs text-neutral-400">
                  {file.name} ({formatBytes(file.size)})
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  {file.url && (
                    <button
                      onClick={() => openRealFile(file.url!)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                    >
                      <ExternalLink size={15} /> Open in Document App / दस्तावेज़ खोलें
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl text-xs font-semibold transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Archive Files */}
        {isArchive && (
          <div className="text-center p-8 bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-neutral-800 max-w-md w-full space-y-5 shadow-2xl">
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
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={15} /> Open in App
                </button>
              )}
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {/* APK / Others */}
        {!isArchive && (file.type === 'apk' || file.type === 'other') && (
          <div className="text-center p-8 bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-neutral-800 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-18 h-18 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              {file.type === 'apk' ? <Package size={40} /> : <File size={40} />}
            </div>
            <h3 className="text-base font-bold truncate text-white">{file.name}</h3>
            <p className="text-xs text-neutral-400">{formatBytes(file.size)} • {file.mimeType}</p>
            
            {file.type === 'apk' && file.url && (
              <button
                onClick={() => openRealFile(file.url!)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <Package size={17} /> Install App / ऐप इनस्टॉल करें
              </button>
            )}

            {file.type !== 'apk' && file.url && (
              <button
                onClick={() => openRealFile(file.url!)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink size={15} /> Open in Default App / ऐप में खोलें
              </button>
            )}

            <button
              onClick={handleDownload}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
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
                className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800 transition-colors"
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

      {/* 3. BOTTOM FLOATING TOOLBAR (Full Screen Controls for Images/Media) */}
      <div 
        className={`w-full z-30 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 py-4 pb-safe flex items-center justify-between gap-2 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Zoom & Rotate Controls */}
        {file.type === 'image' ? (
          <div className="flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800 shadow-xl mx-auto">
            <button
              onClick={handleZoomOut}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-mono font-bold text-neutral-300 px-2 min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 bg-neutral-700 mx-1" />
            <button
              onClick={handleRotate}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw size={18} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Reset View"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full gap-3">
            <button
              onClick={handleDownload}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <Download size={16} /> Download
            </button>
            {file.url && file.url.startsWith('/') && (
              <button
                onClick={() => openRealFile(file.url!)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <ExternalLink size={16} /> Open in System App
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
