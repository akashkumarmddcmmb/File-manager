import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  X, 
  Download, 
  Share2, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  Copy, 
  Check, 
  Search, 
  Maximize2,
  Minimize2,
  BookOpen,
  Sparkles,
  Printer
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { openRealFile, shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';

interface PdfDocumentViewerModalProps {
  isOpen: boolean;
  file: FileItem | null;
  language: Language;
  onClose: () => void;
  onToggleStar?: (id: string) => void;
}

export const PdfDocumentViewerModal: React.FC<PdfDocumentViewerModalProps> = ({
  isOpen,
  file,
  language,
  onClose,
  onToggleStar,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  if (!isOpen || !file) return null;

  const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const resolvedUrl = file.url && file.url.startsWith('/') 
    ? Capacitor.convertFileSrc(file.url) 
    : file.url;

  const handleCopyText = () => {
    if (file.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    triggerHapticFeedback();
    if (file.url) {
      const a = document.createElement('a');
      a.href = resolvedUrl || file.url;
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

  const toggleBrowserFullscreen = () => {
    triggerHapticFeedback();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-full bg-neutral-950 text-white flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. TOP APP BAR */}
      <div className="w-full px-4 py-3 pt-safe flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="p-2.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={22} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                {isPdf ? 'PDF' : 'DOC'}
              </span>
              <h2 className="text-sm sm:text-base font-bold truncate text-white" title={file.name}>
                {file.name}
              </h2>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              {formatBytes(file.size)} • {file.folder}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center bg-neutral-800 rounded-xl p-0.5 mr-1 text-xs border border-neutral-700/60">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setZoomLevel(Math.max(50, zoomLevel - 15));
              }}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="px-2 font-mono text-xs font-bold text-neutral-200 min-w-10 text-center">{zoomLevel}%</span>
            <button
              onClick={() => {
                triggerHapticFeedback();
                setZoomLevel(Math.min(200, zoomLevel + 15));
              }}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleBrowserFullscreen}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={isBrowserFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isBrowserFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          {/* Open in external PDF reader */}
          {file.url && (
            <button
              onClick={() => {
                triggerHapticFeedback();
                openRealFile(file.url!);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title={language === 'hi' ? 'फ़ोन PDF ऐप में खोलें' : 'Open in Phone PDF Reader'}
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">
                {language === 'hi' ? 'PDF ऐप में खोलें' : 'Open in App'}
              </span>
            </button>
          )}

          {/* Share */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              if (file.url) shareNativeFile(file.name, `Document: ${file.name}`, file.url);
            }}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={20} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Download"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* 2. DOCUMENT CONTENT FULL SCREEN VIEWPORT */}
      <div className="flex-1 w-full bg-neutral-950 overflow-auto relative p-2 sm:p-4 flex flex-col items-center">
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-between rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl">
            {resolvedUrl ? (
              <iframe
                src={`${resolvedUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoomLevel}`}
                title={file.name}
                className="w-full h-full border-none bg-white rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                  <FileText size={44} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{file.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1">{formatBytes(file.size)}</p>
                </div>
                {file.url && (
                  <button
                    onClick={() => openRealFile(file.url!)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
                  >
                    <ExternalLink size={16} /> Open with Adobe Acrobat / Google Drive
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-4xl h-full flex flex-col bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-800/80 border-b border-neutral-700 text-xs text-neutral-300">
              <span className="font-semibold">{file.name} (Plain Text / Document)</span>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <div 
              className="flex-1 p-6 overflow-y-auto font-mono text-xs sm:text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap selection:bg-blue-600"
              style={{ fontSize: `${(zoomLevel / 100) * 14}px` }}
            >
              {file.content || 'No text content available to preview.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
