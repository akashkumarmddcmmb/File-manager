import React, { useState } from 'react';
import { 
  Film, 
  Music, 
  FileText, 
  Package, 
  Image as ImageIcon, 
  Play, 
  FileSpreadsheet,
  FileCode,
  File
} from 'lucide-react';
import { FileItem } from '../types';
import { getFileThumbnailUrl, resolveMediaSrc } from '../utils/mediaUtils';

interface FileMediaThumbnailProps {
  file: FileItem;
  className?: string;
  showBadge?: boolean;
  showPlayOverlay?: boolean;
  aspectRatio?: string;
}

export const FileMediaThumbnail: React.FC<FileMediaThumbnailProps> = ({
  file,
  className = 'w-full h-full',
  showBadge = true,
  showPlayOverlay = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const resolvedUrl = getFileThumbnailUrl(file);

  // 1. IMAGE TYPE
  if (file.type === 'image') {
    if (resolvedUrl && !imgError) {
      return (
        <div className={`relative w-full h-full overflow-hidden bg-neutral-100 flex items-center justify-center ${className}`}>
          <img
            src={resolvedUrl}
            alt={file.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {showBadge && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
              {file.name.toLowerCase().endsWith('.png') ? 'PNG' : 'IMAGE'}
            </span>
          )}
        </div>
      );
    }

    // Image fallback card with photo styling
    return (
      <div className={`relative w-full h-full bg-gradient-to-br from-teal-500/15 via-blue-500/10 to-teal-500/5 flex flex-col items-center justify-center ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-2xs border border-teal-100">
          <ImageIcon size={26} />
        </div>
        {showBadge && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
            IMAGE
          </span>
        )}
      </div>
    );
  }

  // 2. VIDEO TYPE
  if (file.type === 'video') {
    const isImageThumbnail = file.thumbnail && (
      file.thumbnail.includes('.jpg') || 
      file.thumbnail.includes('.png') || 
      file.thumbnail.includes('.jpeg') || 
      file.thumbnail.includes('unsplash') ||
      file.thumbnail.startsWith('data:image')
    );

    return (
      <div className={`relative w-full h-full bg-neutral-950 overflow-hidden flex items-center justify-center ${className}`}>
        {isImageThumbnail && !imgError ? (
          <img
            src={resolveMediaSrc(file.thumbnail)}
            alt={file.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : resolvedUrl && !videoError ? (
          <video
            src={resolvedUrl}
            preload="metadata"
            muted
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-950/80 via-neutral-900 to-black flex items-center justify-center">
            <Film size={28} className="text-rose-400/80" />
          </div>
        )}

        {/* Video Play Overlay */}
        {showPlayOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:bg-rose-600 transition-all duration-200">
              <Play size={16} className="fill-white ml-0.5" />
            </div>
          </div>
        )}

        {showBadge && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider flex items-center gap-1">
            <Film size={10} className="text-rose-400" />
            <span>VIDEO</span>
          </span>
        )}
      </div>
    );
  }

  // 3. AUDIO TYPE
  if (file.type === 'audio') {
    if (resolvedUrl && file.thumbnail && !imgError) {
      return (
        <div className={`relative w-full h-full overflow-hidden bg-neutral-900 flex items-center justify-center ${className}`}>
          <img
            src={resolvedUrl}
            alt={file.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {showPlayOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-md">
                <Play size={14} className="fill-white ml-0.5" />
              </div>
            </div>
          )}
          {showBadge && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider flex items-center gap-1">
              <Music size={10} className="text-amber-400" />
              <span>AUDIO</span>
            </span>
          )}
        </div>
      );
    }

    // Realistic Album Art Cover with Vinyl Disc visual
    return (
      <div className={`relative w-full h-full bg-gradient-to-br from-amber-600 via-amber-800 to-neutral-950 flex items-center justify-center overflow-hidden ${className}`}>
        {/* Vinyl disc shape */}
        <div className="relative w-16 h-16 rounded-full bg-neutral-900 border-2 border-amber-400/30 shadow-inner flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
          <div className="w-12 h-12 rounded-full border border-neutral-700 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-xs">
              <Music size={14} />
            </div>
          </div>
        </div>

        {showPlayOverlay && (
          <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-xs flex items-center justify-center text-white shadow-md border border-white/20">
            <Play size={12} className="fill-white ml-0.5" />
          </div>
        )}

        {showBadge && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider flex items-center gap-1">
            <Music size={10} className="text-amber-400" />
            <span>AUDIO</span>
          </span>
        )}
      </div>
    );
  }

  // 4. DOCUMENT TYPE
  if (file.type === 'document') {
    if (resolvedUrl && file.thumbnail && !imgError) {
      return (
        <div className={`relative w-full h-full overflow-hidden bg-neutral-100 flex items-center justify-center ${className}`}>
          <img
            src={resolvedUrl}
            alt={file.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {showBadge && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
              DOC
            </span>
          )}
        </div>
      );
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimeType?.includes('pdf');
    const isSheet = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.csv');

    return (
      <div className={`relative w-full h-full bg-[#f6f8fa] flex flex-col items-center justify-center p-2.5 overflow-hidden ${className}`}>
        {/* Document page preview card */}
        <div className="w-16 h-20 bg-white rounded-lg shadow-xs border border-neutral-200/90 p-2 flex flex-col justify-between group-hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
            <span className={`text-[9px] font-bold ${isPdf ? 'text-rose-600' : isSheet ? 'text-emerald-600' : 'text-blue-600'}`}>
              {isPdf ? 'PDF' : isSheet ? 'XLS' : 'DOC'}
            </span>
            {isPdf ? (
              <FileText size={12} className="text-rose-500" />
            ) : isSheet ? (
              <FileSpreadsheet size={12} className="text-emerald-500" />
            ) : (
              <FileText size={12} className="text-blue-500" />
            )}
          </div>
          <div className="space-y-1 my-1">
            <div className={`h-1 rounded w-full ${isPdf ? 'bg-rose-100' : isSheet ? 'bg-emerald-100' : 'bg-blue-100'}`} />
            <div className="h-1 bg-neutral-100 rounded w-4/5" />
            <div className="h-1 bg-neutral-100 rounded w-3/5" />
          </div>
          <div className="h-0.5 bg-neutral-200 rounded w-2/5" />
        </div>

        {showBadge && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
            {isPdf ? 'PDF' : isSheet ? 'SHEET' : 'DOC'}
          </span>
        )}
      </div>
    );
  }

  // 5. APK / APP TYPE
  if (file.type === 'apk') {
    if (resolvedUrl && file.thumbnail && !imgError) {
      return (
        <div className={`relative w-full h-full overflow-hidden bg-neutral-100 flex items-center justify-center ${className}`}>
          <img
            src={resolvedUrl}
            alt={file.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
          {showBadge && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
              APK
            </span>
          )}
        </div>
      );
    }

    return (
      <div className={`relative w-full h-full bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white shadow-md">
          <Package size={24} />
        </div>
        {showBadge && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
            APK
          </span>
        )}
      </div>
    );
  }

  // DEFAULT / OTHER
  return (
    <div className={`relative w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400 ${className}`}>
      <File size={26} />
      {showBadge && (
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white uppercase tracking-wider">
          FILE
        </span>
      )}
    </div>
  );
};
