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
  ExternalLink
} from 'lucide-react';
import { FileItem, ViewMode } from '../types';
import { formatBytes, formatDate } from '../utils/storage';
import { triggerHapticFeedback, shareNativeFile, openRealFile } from '../utils/nativeStorage';

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
  isSelectionMode: boolean;
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
  isSelectionMode,
}) => {
  const [showMenu, setShowMenu] = useState(false);

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
            {file.thumbnail ? (
              <img 
                src={file.thumbnail} 
                alt={file.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover" 
              />
            ) : (
              getFileIcon()
            )}
          </div>

          {/* Name & Details */}
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-900 truncate" title={file.name}>
                {file.name}
              </span>
              {file.isStarred && (
                <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {formatBytes(file.size)} • {formatDate(file.createdAt)} • {file.folder}
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

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 text-xs text-neutral-700 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => { setShowMenu(false); onOpenPreview(file); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 font-medium text-neutral-800"
                >
                  {file.type === 'audio' ? <Music size={14} className="text-amber-500" /> : file.type === 'video' ? <Film size={14} className="text-rose-500" /> : file.type === 'document' ? <FileText size={14} className="text-emerald-500" /> : <Info size={14} />}
                  {file.type === 'audio' ? 'Play Song' : file.type === 'video' ? 'Play Video' : file.type === 'document' ? 'Read Document' : 'Open Preview'}
                </button>
                {file.url && (
                  <button
                    onClick={() => { 
                      setShowMenu(false); 
                      openRealFile(file.url!);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-emerald-700 font-medium"
                  >
                    <ExternalLink size={14} /> Open in Phone App
                  </button>
                )}
                <button
                  onClick={() => { 
                    setShowMenu(false); 
                    shareNativeFile(file.name, `Sharing ${file.name} (${formatBytes(file.size)})`, file.url);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-blue-600 font-medium"
                >
                  <Share2 size={14} /> Share file (Mobile)
                </button>
                <button
                  onClick={() => { setShowMenu(false); onToggleStar(file.id); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <Star size={14} className={file.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
                  {file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
                </button>
                {onMoveToSafe && !file.isSafe && (
                  <button
                    onClick={() => { setShowMenu(false); onMoveToSafe(file.id); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                  >
                    <Shield size={14} /> Move to Safe Folder
                  </button>
                )}
                {onCopyTo && (
                  <button
                    onClick={() => { setShowMenu(false); onCopyTo(file); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-neutral-800"
                  >
                    <Copy size={14} className="text-blue-600" /> Copy to...
                  </button>
                )}
                {onMoveTo && (
                  <button
                    onClick={() => { setShowMenu(false); onMoveTo(file); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-neutral-800"
                  >
                    <FolderInput size={14} className="text-purple-600" /> Move to...
                  </button>
                )}
                {onRename && (
                  <button
                    onClick={() => { setShowMenu(false); onRename(file); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Rename
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); onShowInfo(file); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <Info size={14} /> File details
                </button>
                <button
                  onClick={() => { setShowMenu(false); onMoveToTrash(file.id); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-neutral-100"
                >
                  <Trash2 size={14} /> Move to Trash
                </button>
              </div>
            </>
          )}
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
      <div className="relative w-full aspect-4/3 bg-neutral-100 flex items-center justify-center overflow-hidden">
        {file.thumbnail ? (
          <img 
            src={file.thumbnail} 
            alt={file.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300" 
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-neutral-200/60 flex items-center justify-center">
            {getFileIcon()}
          </div>
        )}

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
      </div>

      {/* Card Info Footer */}
      <div className="p-3 flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-neutral-900 truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-[11px] text-neutral-400 pt-0.5">
            {formatBytes(file.size)}
          </p>
        </div>

        {/* Context Menu Button */}
        <div className="relative shrink-0 -mr-1 -mt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 text-xs text-neutral-700 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => { setShowMenu(false); onOpenPreview(file); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 font-medium text-neutral-800"
                >
                  {file.type === 'audio' ? <Music size={14} className="text-amber-500" /> : file.type === 'video' ? <Film size={14} className="text-rose-500" /> : file.type === 'document' ? <FileText size={14} className="text-emerald-500" /> : <Info size={14} />}
                  {file.type === 'audio' ? 'Play Song' : file.type === 'video' ? 'Play Video' : file.type === 'document' ? 'Read Document' : 'Open'}
                </button>
                {file.url && (
                  <button
                    onClick={() => { 
                      setShowMenu(false); 
                      openRealFile(file.url!);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-emerald-700 font-medium"
                  >
                    <ExternalLink size={14} /> Open in Phone App
                  </button>
                )}
                <button
                  onClick={() => { 
                    setShowMenu(false); 
                    shareNativeFile(file.name, `Sharing ${file.name} (${formatBytes(file.size)})`, file.url);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-blue-600 font-medium"
                >
                  <Share2 size={14} /> Share file (Mobile)
                </button>
                <button
                  onClick={() => { setShowMenu(false); onToggleStar(file.id); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <Star size={14} className={file.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
                  {file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
                </button>
                {onMoveToSafe && !file.isSafe && (
                  <button
                    onClick={() => { setShowMenu(false); onMoveToSafe(file.id); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                  >
                    <Shield size={14} /> Move to Safe Folder
                  </button>
                )}
                {onCopyTo && (
                  <button
                    onClick={() => { setShowMenu(false); onCopyTo(file); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-neutral-800"
                  >
                    <Copy size={14} className="text-blue-600" /> Copy to...
                  </button>
                )}
                {onMoveTo && (
                  <button
                    onClick={() => { setShowMenu(false); onMoveTo(file); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2 text-neutral-800"
                  >
                    <FolderInput size={14} className="text-purple-600" /> Move to...
                  </button>
                )}
                {onRename && (
                  <button
                    onClick={() => { setShowMenu(false); onRename(file); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Rename
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); onShowInfo(file); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <Info size={14} /> File details
                </button>
                <button
                  onClick={() => { setShowMenu(false); onMoveToTrash(file.id); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-neutral-100"
                >
                  <Trash2 size={14} /> Move to Trash
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
