import React, { useState } from 'react';
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
  Folder,
  Play,
  ExternalLink
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes, formatDate } from '../utils/storage';
import { translations } from '../utils/translations';
import { openRealFile, shareNativeFile } from '../utils/nativeStorage';

interface FileViewerModalProps {
  file: FileItem | null;
  language: Language;
  onClose: () => void;
  onToggleStar: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onDownload?: (file: FileItem) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  language,
  onClose,
  onToggleStar,
  onMoveToTrash,
  onDownload,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const t = translations[language];

  if (!file) return null;

  const handleDownload = () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 text-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar in Modal */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate" title={file.name}>
                {file.name}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {formatBytes(file.size)} • {file.folder}
              </p>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => file.url && shareNativeFile(file.name, `Sharing ${file.name} (${formatBytes(file.size)})`, file.url)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
              title="Share"
            >
              <Share2 size={19} />
            </button>
            <button
              onClick={() => onToggleStar(file.id)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
              title={file.isStarred ? 'Unstar' : 'Star'}
            >
              <Star size={19} className={file.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
              title="Download file"
            >
              <Download size={19} />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-full transition-colors ${
                showInfo ? 'bg-neutral-800 text-blue-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="File details"
            >
              <Info size={19} />
            </button>
            <button
              onClick={() => {
                onMoveToTrash(file.id);
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-full transition-colors"
              title="Move to Trash"
            >
              <Trash2 size={19} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto relative bg-neutral-950 flex flex-col items-center justify-center p-4 min-h-[340px]">
          {/* 1. Image Viewer */}
          {file.type === 'image' && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <img
                src={file.url && file.url.startsWith('/') ? Capacitor.convertFileSrc(file.url) : (file.url || file.thumbnail)}
                alt={file.name}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
              />
              {file.url && file.url.startsWith('/') && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} /> Open in Gallery / गैलरी में खोलें
                </button>
              )}
            </div>
          )}

          {/* 2. Video Player */}
          {file.type === 'video' && (
            <div className="w-full flex flex-col items-center justify-center gap-3">
              <video
                src={file.url && file.url.startsWith('/') ? Capacitor.convertFileSrc(file.url) : file.url}
                controls
                autoPlay
                className="max-h-[55vh] max-w-full rounded-lg shadow-lg border border-neutral-800 bg-black"
              />
              {file.url && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-full text-xs flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Film size={15} /> Play in Video Player / वीडियो प्लेयर में चलाएं
                </button>
              )}
            </div>
          )}

          {/* 3. Audio Player */}
          {file.type === 'audio' && (
            <div className="w-full max-w-md p-6 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Music size={40} />
              </div>
              <div>
                <h3 className="text-base font-semibold truncate text-white">{file.name}</h3>
                <p className="text-xs text-neutral-400 mt-1">{formatBytes(file.size)} • {file.folder}</p>
              </div>
              <audio 
                src={file.url && file.url.startsWith('/') ? Capacitor.convertFileSrc(file.url) : file.url} 
                controls 
                autoPlay 
                className="w-full" 
              />
              {file.url && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-neutral-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <Play size={16} className="fill-neutral-950" /> Play in Phone Music Player / फ़ोन प्लेयर में बजाएं
                </button>
              )}
            </div>
          )}

          {/* 4. Document Viewer */}
          {file.type === 'document' && (
            <div className="w-full max-w-2xl bg-neutral-900 p-5 rounded-2xl border border-neutral-800 text-neutral-200 text-xs sm:text-sm font-mono whitespace-pre-wrap max-h-[55vh] overflow-y-auto leading-relaxed">
              {file.content || (
                <div className="text-center py-10 text-neutral-400 font-sans space-y-3">
                  <FileText size={48} className="mx-auto mb-2 text-emerald-400 opacity-80" />
                  <p className="font-semibold text-neutral-300">Document / PDF</p>
                  <p className="text-xs text-neutral-500">
                    {file.name} ({formatBytes(file.size)})
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {file.url && (
                      <button
                        onClick={() => openRealFile(file.url!)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <ExternalLink size={14} /> Open in Document App / दस्तावेज़ खोलें
                      </button>
                    )}
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-xs font-semibold"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. APK / Archive / Other */}
          {(file.type === 'apk' || file.type === 'archive' || file.type === 'other') && (
            <div className="text-center p-8 bg-neutral-900 rounded-2xl border border-neutral-800 max-w-sm w-full space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                {file.type === 'apk' ? <Package size={36} /> : <File size={36} />}
              </div>
              <h3 className="text-sm font-semibold truncate text-white">{file.name}</h3>
              <p className="text-xs text-neutral-400">{formatBytes(file.size)} • {file.mimeType}</p>
              
              {file.type === 'apk' && file.url && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Package size={16} /> Install App / ऐप इनस्टॉल करें
                </button>
              )}

              {file.type !== 'apk' && file.url && (
                <button
                  onClick={() => openRealFile(file.url!)}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} /> Open in Default App / ऐप में खोलें
                </button>
              )}

              <button
                onClick={handleDownload}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors"
              >
                Download File
              </button>
            </div>
          )}

          {/* Slide-out File Info Sheet */}
          {showInfo && (
            <div className="absolute inset-y-0 right-0 w-72 bg-neutral-900 border-l border-neutral-800 p-5 overflow-y-auto space-y-4 shadow-xl z-20 animate-in slide-in-from-right duration-200 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-neutral-200">File Details</span>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3 text-neutral-300">
                <div>
                  <span className="text-neutral-500 block text-[11px]">File name</span>
                  <span className="font-medium break-words">{file.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Size</span>
                  <span>{formatBytes(file.size)} ({file.size.toLocaleString()} bytes)</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Storage Path</span>
                  <span className="font-mono text-[11px] text-blue-400">{file.folder}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Type</span>
                  <span className="uppercase">{file.type} ({file.mimeType})</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Date Created</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Status</span>
                  <span>
                    {file.isStarred ? 'Starred • ' : ''}
                    {file.isSafe ? 'In Safe Folder • ' : ''}
                    {file.isDuplicate ? 'Duplicate detected • ' : ''}
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
