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
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 text-white rounded-3xl w-full max-w-4xl h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <button
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  {isPdf ? 'PDF' : 'DOC'}
                </span>
                <h2 className="text-sm font-semibold truncate" title={file.name}>
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
            {/* Zoom Controls for text/pdf */}
            <div className="hidden sm:flex items-center bg-neutral-800 rounded-lg p-0.5 mr-1 text-xs">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="px-1.5 font-mono text-[11px]">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 15))}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            {/* Open in external PDF reader */}
            {file.url && (
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  openRealFile(file.url!);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title={language === 'hi' ? 'फ़ोन PDF ऐप में खोलें' : 'Open in Phone PDF Reader'}
              >
                <ExternalLink size={14} />
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
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 size={19} />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              title="Download"
            >
              <Download size={19} />
            </button>
          </div>
        </div>

        {/* Document Content Viewport */}
        <div className="flex-1 bg-neutral-950 overflow-auto relative p-2 sm:p-4 flex flex-col items-center">
          {isPdf ? (
            /* PDF Document Viewer */
            <div className="w-full h-full flex flex-col items-center justify-between rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
              {resolvedUrl ? (
                <iframe
                  src={`${resolvedUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoomLevel}`}
                  className="w-full h-full rounded-2xl bg-white border-0"
                  title={file.name}
                />
              ) : (
                <div className="m-auto text-center p-8 space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <BookOpen size={36} />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-200">
                    {file.name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {language === 'hi' 
                      ? 'इस PDF को अपने फ़ोन के डिफॉल्ट PDF रीडर या व्यूअर में खोलें।' 
                      : 'Open this PDF document with your device default reader.'}
                  </p>
                  {file.url && (
                    <button
                      onClick={() => openRealFile(file.url!)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <ExternalLink size={16} />
                      {language === 'hi' ? 'PDF रीडर में खोलें' : 'Open in Phone Reader'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Plain Text / Source Document Viewer */
            <div 
              className={`w-full max-w-3xl rounded-2xl border p-4 sm:p-6 font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-lg overflow-x-auto ${
                isDarkMode 
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-200' 
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
              style={{ fontSize: `${(zoomLevel / 100) * 13}px` }}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-700/50">
                <span className="text-[11px] font-sans text-neutral-400">
                  {file.name} • {formatBytes(file.size)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md text-[11px] font-sans"
                  >
                    {isDarkMode ? 'Light' : 'Dark'}
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-sans flex items-center gap-1"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy All'}
                  </button>
                </div>
              </div>

              {file.content || (
                <div className="text-center py-12 text-neutral-400 font-sans space-y-2">
                  <FileText size={40} className="mx-auto text-emerald-400 opacity-80" />
                  <p className="text-xs font-semibold">Document content</p>
                  {file.url && (
                    <button
                      onClick={() => openRealFile(file.url!)}
                      className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Open in Document Reader
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
