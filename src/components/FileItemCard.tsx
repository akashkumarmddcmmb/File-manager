import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Film, 
  Music, 
  FileText, 
  Package, 
  File, 
  MoreVertical, 
  Star, 
  Trash2, 
  Shield, 
  Info, 
  Download,
  Edit2,
  Copy,
  FolderInput,
  Share2,
  Play,
  ExternalLink,
  Scissors,
  FolderArchive
} from 'lucide-react';
import { FileItem, ViewMode, Language } from '../types';
import { formatBytes, formatDate } from '../utils/storage';
import { triggerHapticFeedback, shareNativeFile, openRealFile } from '../utils/nativeStorage';
import { isArchiveFile, getArchiveBadge } from '../utils/archiveUtils';
import { FileMediaThumbnail } from './FileMediaThumbnail';

interface FileItemCardProps {
  file: FileItem;
  viewMode: ViewMode;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenPreview: (file: FileItem) => void;
  onToggleStar: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onMoveToSafe?: (id: string) => void;
  onRename?: (file: FileItem) => void;
  onShowInfo: (file: FileItem) => void;
  onCopyTo?: (file: FileItem) => void;
  onMoveTo?: (file: FileItem) => void;
  onQuickCopy?: (file: FileItem) => void;
  onQuickCut?: (file: FileItem) => void;
  onCompressZip?: (files: FileItem[]) => void;
  onExtractArchive?: (file: FileItem) => void;
  language?: Language;
  isSelectionMode: boolean;
  selectedFiles?: FileItem[];
  onShare?: (file: FileItem) => void;
  onBatchShare?: () => void;
  onBatchCopy?: (files: FileItem[]) => void;
  onBatchMove?: (files: FileItem[]) => void;
  onBatchTrash?: (ids: string[]) => void;
  onBatchStar?: (ids: string[]) => void;
  onCopyToClipboard?: (files: FileItem[]) => void;
  onCutToClipboard?: (files: FileItem[]) => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  file,
  viewMode,
  isSelected,
  onToggleSelect,
  onOpenPreview,
  onToggleStar,
  onMoveToTrash,
  onMoveToSafe,
  onRename,
  onShowInfo,
  onCopyTo,
  onMoveTo,
  onQuickCopy,
  onQuickCut,
  onCompressZip,
  onExtractArchive,
  language = 'en',
  isSelectionMode,
  selectedFiles,
  onShare,
  onBatchShare,
  onBatchCopy,
  onBatchMove,
  onBatchTrash,
  onBatchStar,
  onCopyToClipboard,
  onCutToClipboard,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isArchive = isArchiveFile(file.name, file.mimeType);
  const archiveBadge = isArchive ? getArchiveBadge(file.name) : null;

  const targetFiles = (isSelected && selectedFiles && selectedFiles.length > 0) ? selectedFiles : [file];
  const isMulti = targetFiles.length > 1;

  const renderDropdownMenu = () => (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      <div 
        className="absolute right-0 mt-1 w-52 sm:w-56 bg-white dark:bg-[#1e231f] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Selection count indicator if targeting multiple */}
        {isMulti && (
          <div className="px-3.5 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border-b border-blue-100 dark:border-blue-900/40 mb-1 flex items-center justify-between">
            <span>{language === 'hi' ? `${targetFiles.length} फ़ाइलें चुनी गईं` : `${targetFiles.length} files selected`}</span>
          </div>
        )}

        {/* 1. Extract Archive (if single archive file) */}
        {!isMulti && isArchive && onExtractArchive && (
          <button
            onClick={() => { setShowMenu(false); onExtractArchive(file); }}
            className="w-full text-left px-3.5 py-2 hover:bg-amber-100/70 dark:hover:bg-amber-950/50 flex items-center gap-2.5 font-bold text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/30 transition-colors cursor-pointer"
          >
            <FolderArchive size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{language === 'hi' ? 'अनज़िप / एक्सट्रैक्ट करें' : 'Extract Archive'}</span>
          </button>
        )}

        {/* 2. Open / Preview (if single file) */}
        {!isMulti && (
          <button
            onClick={() => { setShowMenu(false); onOpenPreview(file); }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 font-medium text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            {file.type === 'audio' ? <Music size={15} className="text-amber-500 shrink-0" /> : file.type === 'video' ? <Film size={15} className="text-rose-500 shrink-0" /> : file.type === 'document' ? <FileText size={15} className="text-emerald-500 shrink-0" /> : isArchive ? <FolderArchive size={15} className="text-amber-600 shrink-0" /> : <Info size={15} className="shrink-0 text-neutral-500" />}
            <span>
              {language === 'hi'
                ? (file.type === 'audio' ? 'गाना चलाएं' : file.type === 'video' ? 'वीडियो देखें' : file.type === 'document' ? 'दस्तावेज़ पढ़ें' : isArchive ? 'आर्काइव देखें' : 'फ़ाइल खोलें')
                : (file.type === 'audio' ? 'Play Song' : file.type === 'video' ? 'Play Video' : file.type === 'document' ? 'Read Document' : isArchive ? 'Inspect Archive' : 'Open Preview')}
            </span>
          </button>
        )}

        {/* 3. Open in Phone App (if single file with url) */}
        {!isMulti && file.url && (
          <button
            onClick={() => { 
              setShowMenu(false); 
              openRealFile(file.url!);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-medium transition-colors cursor-pointer"
          >
            <ExternalLink size={15} className="shrink-0" />
            <span>{language === 'hi' ? 'फ़ोन ऐप में खोलें' : 'Open in Phone App'}</span>
          </button>
        )}

        {/* 4. SHARE (शेयर करें) */}
        <button
          onClick={() => { 
            setShowMenu(false); 
            if (isMulti && onBatchShare) {
              onBatchShare();
            } else if (isMulti) {
              const urls = targetFiles.map(f => f.url).filter(Boolean) as string[];
              const names = targetFiles.map(f => f.name).join(', ');
              shareNativeFile(`${targetFiles.length} files`, `Sharing: ${names}`, urls[0], urls, targetFiles);
            } else if (onShare) {
              onShare(file);
            } else {
              shareNativeFile(file.name, `Sharing ${file.name} (${formatBytes(file.size)})`, file.url, undefined, file);
            }
          }}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer"
        >
          <Share2 size={15} className="shrink-0" />
          <span>
            {isMulti 
              ? (language === 'hi' ? `शेयर करें (${targetFiles.length})` : `Share (${targetFiles.length})`) 
              : (language === 'hi' ? 'शेयर करें' : 'Share')}
          </span>
        </button>

        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

        {/* 5. COPY (कॉपी करें) */}
        {(onCopyToClipboard || onQuickCopy) && (
          <button
            onClick={() => { 
              setShowMenu(false); 
              if (onCopyToClipboard) {
                onCopyToClipboard(targetFiles);
              } else if (onQuickCopy) {
                onQuickCopy(file);
              }
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            <Copy size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {isMulti 
                ? (language === 'hi' ? `कॉपी करें (${targetFiles.length})` : `Copy (${targetFiles.length})`) 
                : (language === 'hi' ? 'कॉपी करें' : 'Copy')}
            </span>
          </button>
        )}

        {/* 6. CUT (कट (यहाँ से हटाएँ)) */}
        {(onCutToClipboard || onQuickCut) && (
          <button
            onClick={() => { 
              setShowMenu(false); 
              if (onCutToClipboard) {
                onCutToClipboard(targetFiles);
              } else if (onQuickCut) {
                onQuickCut(file);
              }
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            <Scissors size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              {isMulti 
                ? (language === 'hi' ? `कट (यहाँ से हटाएँ) (${targetFiles.length})` : `Cut (${targetFiles.length})`) 
                : (language === 'hi' ? 'कट (यहाँ से हटाएँ)' : 'Cut (Move)')}
            </span>
          </button>
        )}

        {/* 7. COPY TO... (कॉपी करें...) */}
        {(onBatchCopy || onCopyTo) && (
          <button
            onClick={() => { 
              setShowMenu(false); 
              if (isMulti && onBatchCopy) {
                onBatchCopy(targetFiles);
              } else if (onCopyTo) {
                onCopyTo(file);
              }
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            <FolderInput size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{language === 'hi' ? 'कॉपी करें...' : 'Copy to...'}</span>
          </button>
        )}

        {/* 8. MOVE TO... (यहाँ ले जाएँ...) */}
        {(onBatchMove || onMoveTo) && (
          <button
            onClick={() => { 
              setShowMenu(false); 
              if (isMulti && onBatchMove) {
                onBatchMove(targetFiles);
              } else if (onMoveTo) {
                onMoveTo(file);
              }
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            <FolderInput size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{language === 'hi' ? 'यहाँ ले जाएँ...' : 'Move to...'}</span>
          </button>
        )}

        {/* 9. ZIP ARCHIVE (ZIP बनाएं) */}
        {onCompressZip && (
          <button
            onClick={() => { 
              setShowMenu(false); 
              onCompressZip(targetFiles);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            <FolderArchive size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isMulti 
                ? (language === 'hi' ? `ZIP बनाएं (${targetFiles.length})` : `Create ZIP (${targetFiles.length})`) 
                : (language === 'hi' ? 'ZIP बनाएं' : 'Create ZIP')}
            </span>
          </button>
        )}

        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

        {/* 10. STAR (स्टार मार्क करें / हटाएं) */}
        <button
          onClick={() => { 
            setShowMenu(false); 
            if (isMulti && onBatchStar) {
              onBatchStar(targetFiles.map(f => f.id));
            } else {
              onToggleStar(file.id);
            }
          }}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
        >
          <Star size={15} className={`shrink-0 ${file.isStarred ? 'fill-amber-400 text-amber-400' : 'text-neutral-400'}`} />
          <span>
            {file.isStarred 
              ? (language === 'hi' ? 'स्टार हटाएं' : 'Remove from Starred') 
              : (language === 'hi' ? 'स्टार मार्क करें' : 'Add to Starred')}
          </span>
        </button>

        {/* 11. SAFE FOLDER (सेफ़ फ़ोल्डर में डालें) */}
        {onMoveToSafe && !file.isSafe && (
          <button
            onClick={() => { setShowMenu(false); onMoveToSafe(file.id); }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            <Shield size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{language === 'hi' ? 'सेफ़ फ़ोल्डर में डालें' : 'Move to Safe Folder'}</span>
          </button>
        )}

        {/* 12. RENAME (नाम बदलें) */}
        {!isMulti && onRename && (
          <button
            onClick={() => { setShowMenu(false); onRename(file); }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            <Edit2 size={15} className="text-neutral-500 shrink-0" />
            <span>{language === 'hi' ? 'नाम बदलें' : 'Rename'}</span>
          </button>
        )}

        {/* 13. FILE DETAILS (फ़ाइल विवरण) */}
        {!isMulti && (
          <button
            onClick={() => { setShowMenu(false); onShowInfo(file); }}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            <Info size={15} className="text-neutral-500 shrink-0" />
            <span>{language === 'hi' ? 'फ़ाइल विवरण' : 'File details'}</span>
          </button>
        )}

        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

        {/* 14. DELETE / TRASH (हटाएं / ट्रैश में डालें) */}
        <button
          onClick={() => { 
            setShowMenu(false); 
            if (isMulti && onBatchTrash) {
              onBatchTrash(targetFiles.map(f => f.id));
            } else {
              onMoveToTrash(file.id);
            }
          }}
          className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
        >
          <Trash2 size={15} className="shrink-0" />
          <span>
            {isMulti 
              ? (language === 'hi' ? `हटाएं (${targetFiles.length})` : `Delete (${targetFiles.length})`) 
              : (language === 'hi' ? 'हटाएं (ट्रैश में डालें)' : 'Move to Trash')}
          </span>
        </button>
      </div>
    </>
  );

  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return <ImageIcon size={20} className="text-blue-500" />;
      case 'video':
        return <Film size={20} className="text-rose-500" />;
      case 'audio':
        return <Music size={20} className="text-amber-500" />;
      case 'document':
        return <FileText size={20} className="text-emerald-500" />;
      case 'apk':
        return <Package size={20} className="text-purple-500" />;
      default:
        return <File size={20} className="text-neutral-500" />;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      onToggleSelect(file.id);
    } else if (isArchive && onExtractArchive) {
      onExtractArchive(file);
    } else {
      onOpenPreview(file);
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
          isSelected 
            ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400' 
            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:bg-neutral-50/50'
        }`}
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Checkbox */}
          <div 
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(file.id);
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Thumbnail / Icon */}
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-neutral-100 border border-neutral-200/50">
            {isArchive ? (
              <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-700">
                <FolderArchive size={20} />
              </div>
            ) : (
              <FileMediaThumbnail
                file={file}
                className="w-full h-full"
                showBadge={false}
                showPlayOverlay={false}
              />
            )}
          </div>

          {/* Name & Details */}
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              {archiveBadge && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${archiveBadge.bg} ${archiveBadge.color} ${archiveBadge.border}`}>
                  {archiveBadge.label}
                </span>
              )}
              <span className="text-xs font-medium text-neutral-900 truncate" title={file.name}>
                {file.name}
              </span>
              {file.isStarred && (
                <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 truncate mt-0.5">
              <span className="font-medium text-neutral-700">{formatBytes(file.size)}</span>
              <span>•</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${file.storageDevice === 'sdcard' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {file.storageDevice === 'sdcard' ? 'SD Card' : 'Internal'}
              </span>
              <span>•</span>
              <span className="text-neutral-400 truncate">{file.folder}</span>
            </div>
          </div>
        </div>

        {/* 3-dot context action */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && renderDropdownMenu()}
        </div>
      </div>
    );
  }

  // Grid Mode Card
  return (
    <div
      className={`group relative rounded-2xl border transition-all flex flex-col overflow-hidden cursor-pointer ${
        isSelected
          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400 shadow-xs'
          : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
      }`}
      onClick={handleCardClick}
    >
      {/* Top Media / Thumbnail container */}
      <div className="relative w-full aspect-4/3 max-h-28 sm:max-h-32 bg-neutral-100 flex items-center justify-center overflow-hidden">
        <FileMediaThumbnail
          file={file}
          className="w-full h-full"
          showBadge={false}
          showPlayOverlay={false}
        />

        {/* Selection Checkbox (Top Left) */}
        <div 
          className={`absolute top-2 left-2 transition-opacity ${
            isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(file.id);
          }}
        >
          <div className="p-1 rounded-md bg-white/90 backdrop-blur-xs shadow-xs">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer block"
            />
          </div>
        </div>

        {/* Star Badge (Top Right) */}
        {file.isStarred && (
          <div className="absolute top-2 right-2 p-1 rounded-md bg-white/90 backdrop-blur-xs shadow-xs">
            <Star size={13} className="fill-amber-400 text-amber-400" />
          </div>
        )}

        {/* Audio / Video Play Badge */}
        {(file.type === 'audio' || file.type === 'video') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-neutral-950 transition-all">
              <Play size={16} className="fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Document PDF Badge */}
        {file.type === 'document' && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs pointer-events-none">
            {file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC'}
          </div>
        )}

        {/* Archive Badge */}
        {isArchive && archiveBadge && (
          <div className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-xs pointer-events-none border ${archiveBadge.bg} ${archiveBadge.color} ${archiveBadge.border}`}>
            {archiveBadge.label}
          </div>
        )}
      </div>

      {/* Card Info Footer */}
      <div className="p-2 sm:p-2.5 flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-medium text-neutral-900 truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-neutral-500 pt-0.5">
            <span className="font-medium text-neutral-600">{formatBytes(file.size)}</span>
            <span>•</span>
            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${file.storageDevice === 'sdcard' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
              {file.storageDevice === 'sdcard' ? 'SD' : 'Int'}
            </span>
          </div>
        </div>

        {/* Context Menu Button */}
        <div className="relative shrink-0 -mr-1 -mt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && renderDropdownMenu()}
        </div>
      </div>
    </div>
  );
};
