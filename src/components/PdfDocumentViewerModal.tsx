import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  X, 
  Download, 
  Share2, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  Copy, 
  Check, 
  Search, 
  Maximize2,
  Minimize2,
  BookOpen,
  Printer,
  Eye,
  Layers,
  Moon,
  Sun
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { openRealFile, shareNativeFile, triggerHapticFeedback } from '../utils/nativeStorage';
import { resolveMediaSrc } from '../utils/mediaUtils';

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
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Reader paper theme
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [renderMode, setRenderMode] = useState<'reader' | 'embed'>('reader');

  if (!isOpen || !file) return null;

  const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const resolvedUrl = resolveMediaSrc(file.url);

  const handleCopyText = () => {
    if (file.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    triggerHapticFeedback();
    window.print();
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
      a.download = file.name.replace(/\.pdf$/i, '.txt');
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

  // Helper to render markdown-like content cleanly for PDF document pages
  const renderDocumentContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-3" />;
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl sm:text-2xl font-extrabold my-3 pb-1 border-b border-neutral-300 text-neutral-900">
            {trimmed.replace('# ', '')}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg sm:text-xl font-bold my-2 text-neutral-800">
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm sm:text-base font-bold my-2 text-neutral-800">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-xs sm:text-sm my-1 text-neutral-800 leading-relaxed">
            {trimmed.replace(/^[-*]\s+/, '')}
          </li>
        );
      }
      if (trimmed.startsWith('---')) {
        return <hr key={idx} className="my-4 border-neutral-300" />;
      }
      return (
        <p key={idx} className="text-xs sm:text-sm my-1.5 leading-relaxed text-neutral-800">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-full bg-neutral-950 text-white flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. TOP APP BAR */}
      <div className="w-full px-3 sm:px-4 py-2.5 pt-safe flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                {isPdf ? 'PDF' : 'DOC'}
              </span>
              <h2 className="text-xs sm:text-sm font-bold truncate text-white" title={file.name}>
                {file.name}
              </h2>
            </div>
            <p className="text-[10px] text-neutral-400 truncate">
              {formatBytes(file.size)} • {file.folder}
            </p>
          </div>
        </div>

        {/* Quick Actions Toolbar */}
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
              <ZoomOut size={15} />
            </button>
            <span className="px-1.5 font-mono text-[11px] font-bold text-neutral-200 min-w-8 text-center">{zoomLevel}%</span>
            <button
              onClick={() => {
                triggerHapticFeedback();
                setZoomLevel(Math.min(200, zoomLevel + 15));
              }}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Render Mode Switcher (Reader Sheet vs Embed/Iframe) */}
          {resolvedUrl && (
            <button
              onClick={() => {
                triggerHapticFeedback();
                setRenderMode(renderMode === 'reader' ? 'embed' : 'reader');
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                renderMode === 'embed' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
              title={renderMode === 'reader' ? 'Switch to PDF Embed' : 'Switch to Reader View'}
            >
              <Layers size={16} />
            </button>
          )}

          {/* Reading Mode Dark/Light Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={isDarkMode ? 'Light Reading Paper' : 'Dark Reading Paper'}
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrint}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer hidden sm:block"
            title="Print PDF"
          >
            <Printer size={18} />
          </button>

          {/* Open in Phone PDF Reader */}
          {file.url && (
            <button
              onClick={() => {
                triggerHapticFeedback();
                openRealFile(file.url!);
              }}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title={language === 'hi' ? 'फ़ोन PDF ऐप में खोलें' : 'Open in Phone App'}
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">
                {language === 'hi' ? 'ऐप में खोलें' : 'Open in App'}
              </span>
            </button>
          )}

          {/* Share */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              if (file.url) shareNativeFile(file.name, `PDF Document: ${file.name}`, file.url);
            }}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={18} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Download"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* 2. DOCUMENT VIEWPORT AREA */}
      <div className="flex-1 w-full bg-neutral-950 overflow-auto p-2 sm:p-6 flex flex-col items-center justify-start">
        {renderMode === 'embed' && resolvedUrl ? (
          <div className="w-full max-w-5xl h-full flex flex-col items-center justify-between rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl">
            <iframe
              src={`${resolvedUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoomLevel}`}
              title={file.name}
              className="w-full h-full border-none bg-white"
            />
          </div>
        ) : (
          /* A4 DOCUMENT PAGE READER VIEW */
          <div className="w-full max-w-3xl flex flex-col items-center my-2 animate-in fade-in duration-200">
            {/* PDF Sheet Page Frame */}
            <div 
              className={`w-full min-h-[80vh] p-6 sm:p-12 rounded-2xl shadow-2xl transition-all duration-200 border ${
                isDarkMode 
                  ? 'bg-neutral-900 text-neutral-100 border-neutral-800' 
                  : 'bg-white text-neutral-900 border-neutral-200'
              }`}
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {/* PDF Document Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-rose-600" />
                  <span className="font-bold uppercase tracking-wider text-rose-600">PDF Reader • Page 1 of 1</span>
                </div>
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Title & Metadata */}
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-neutral-900 dark:text-white">
                  {file.name}
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Document Size: {formatBytes(file.size)} • Path: {file.folder}
                </p>
              </div>

              {/* PDF Content Body */}
              <div className="prose dark:prose-invert max-w-none">
                {file.content ? (
                  renderDocumentContent(file.content)
                ) : (
                  <div className="py-12 text-center text-neutral-400 space-y-4">
                    <FileText size={48} className="mx-auto text-rose-500 opacity-80" />
                    <p className="text-sm font-semibold">PDF Document Preview Ready</p>
                    {file.url && (
                      <button
                        onClick={() => openRealFile(file.url!)}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all"
                      >
                        <ExternalLink size={15} /> Open in PDF App / फ़ोन में खोलें
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* PDF Footer Page Indicator */}
              <div className="mt-12 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Files by Akash Kumar</span>
                <span>Page 1 / 1</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
