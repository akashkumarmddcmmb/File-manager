import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Copy, 
  Film, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ChevronRight,
  ImageIcon,
  HardDrive
} from 'lucide-react';
import { FileItem, StorageBreakdown, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';

interface CleanTabProps {
  storage: StorageBreakdown;
  files: FileItem[];
  junkBytes: number;
  onCleanJunk: () => void;
  onDeleteDuplicates: (fileIds: string[]) => void;
  onDeleteFile: (fileId: string) => void;
  onOpenStorageBreakdown: () => void;
  language: Language;
  hasDemoFiles?: boolean;
  onClearDemoFiles?: () => void;
}

export const CleanTab: React.FC<CleanTabProps> = ({
  storage,
  files,
  junkBytes,
  onCleanJunk,
  onDeleteDuplicates,
  onDeleteFile,
  onOpenStorageBreakdown,
  language,
  hasDemoFiles = false,
  onClearDemoFiles,
}) => {
  const t = translations[language];
  const [cleaningJunk, setCleaningJunk] = useState(false);
  const [cleanedSuccess, setCleanedSuccess] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [freedAmount, setFreedAmount] = useState<string>('684 MB');

  // Find duplicate files
  const duplicateFiles = files.filter(f => !f.isTrash && f.isDuplicate);
  const duplicatesByGroup: Record<string, FileItem[]> = {};
  duplicateFiles.forEach(f => {
    const key = f.duplicateGroup || 'default';
    if (!duplicatesByGroup[key]) duplicatesByGroup[key] = [];
    duplicatesByGroup[key].push(f);
  });

  // Large files (> 10 MB)
  const largeFiles = files.filter(f => !f.isTrash && f.size > 10 * 1024 * 1024);

  // Unused downloads
  const oldDownloads = files.filter(
    f => !f.isTrash && f.folder.toLowerCase().includes('download')
  );

  const handleCleanJunkClick = () => {
    setCleaningJunk(true);
    const amountStr = formatBytes(junkBytes);
    setFreedAmount(amountStr);
    setTimeout(() => {
      onCleanJunk();
      setCleaningJunk(false);
      setCleanedSuccess(true);
      setTimeout(() => setCleanedSuccess(false), 4500);
    }, 1300);
  };

  const handleToggleDuplicate = (id: string) => {
    setSelectedDuplicates(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedDuplicates = () => {
    if (selectedDuplicates.length === 0) return;
    onDeleteDuplicates(selectedDuplicates);
    setSelectedDuplicates([]);
  };

  const percentUsed = Math.min(100, Math.round((storage.used / storage.total) * 100));

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Cleaned Toast Banner (Google Files Celebration Banner) */}
      {cleanedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-3xl shadow-sm flex items-center gap-3.5 animate-in fade-in slide-in-from-top-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-900">
              {freedAmount} freed up!
            </h4>
            <p className="text-xs text-emerald-700">
              {t.cleanedSuccess}
            </p>
          </div>
        </div>
      )}

      {/* Main Storage Status Card (Files by Google Hero Card) */}
      <div 
        id="storage-overview-card"
        onClick={onOpenStorageBreakdown}
        className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-[#1a73e8]" />
            <span className="text-sm font-semibold text-neutral-800">
              {t.internalStorage}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#1a73e8] font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>{t.details}</span>
            <ChevronRight size={16} />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
            {formatBytes(storage.used, 1)}
          </span>
          <span className="text-sm text-neutral-500 font-medium">
            {t.used} of {formatBytes(storage.total, 0)}
          </span>
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#1a73e8] border border-blue-100">
            {percentUsed}% {t.used}
          </span>
        </div>

        {/* Multi-segment Storage Bar with Google Colors */}
        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 mb-3">
          <div 
            style={{ width: `${(storage.system / storage.total) * 100}%` }} 
            className="bg-[#5f6368] h-full rounded-l-full" 
            title={`System: ${formatBytes(storage.system)}`}
          />
          <div 
            style={{ width: `${(storage.apps / storage.total) * 100}%` }} 
            className="bg-[#1a73e8] h-full" 
            title={`Apps: ${formatBytes(storage.apps)}`}
          />
          <div 
            style={{ width: `${(storage.images / storage.total) * 100}%` }} 
            className="bg-[#00796b] h-full" 
            title={`Images: ${formatBytes(storage.images)}`}
          />
          <div 
            style={{ width: `${(storage.videos / storage.total) * 100}%` }} 
            className="bg-[#d93025] h-full" 
            title={`Videos: ${formatBytes(storage.videos)}`}
          />
          <div 
            style={{ width: `${(storage.documents / storage.total) * 100}%` }} 
            className="bg-[#e37400] h-full" 
            title={`Documents: ${formatBytes(storage.documents)}`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5f6368]"></span> System
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1a73e8]"></span> Apps
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00796b]"></span> Images
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d93025]"></span> Videos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e37400]"></span> Docs
          </span>
        </div>
      </div>

      {/* 1. Junk Files Card (Google Files Signature Card) */}
      {junkBytes > 0 ? (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8] shrink-0">
                <Sparkles size={28} className={cleaningJunk ? 'animate-spin text-blue-600' : ''} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  {t.cleanJunkFiles}
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm">
                  {t.cleanJunkDesc}
                </p>
                <div className="text-xl font-extrabold text-neutral-900 pt-1">
                  {formatBytes(junkBytes)}
                </div>
              </div>
            </div>

            <button
              id="btn-clean-junk-files"
              disabled={cleaningJunk}
              onClick={handleCleanJunkClick}
              className="px-6 py-3 bg-[#0b57d0] hover:bg-[#0842a0] active:scale-98 disabled:bg-blue-300 text-white font-semibold text-sm rounded-full shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-center"
            >
              {cleaningJunk ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Cleaning storage...</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>{t.cleanBtn} {formatBytes(junkBytes)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">Junk cache is clean</div>
              <div className="text-xs text-neutral-500">No temporary cache files consuming your device storage</div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Files Cleanup Card (Displayed when demo/sample files are present) */}
      {hasDemoFiles && onClearDemoFiles && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                <HardDrive size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">
                    {language === 'hi' ? 'सैंपल डेमो फ़ाइलें हटाएं' : 'Remove Sample Demo Files'}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-200 text-amber-900">
                    DEMO
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {language === 'hi' 
                    ? 'इंस्टॉल के बाद डेमो फ़ाइलों की आवश्यकता नहीं है। असली डिवाइस उपयोग के लिए इन्हें हटाएं।' 
                    : 'Clean up mock demo files so your app displays only your real personal device files.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClearDemoFiles}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm rounded-full shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Trash2 size={16} />
              <span>{t.clearDemoFiles}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Duplicate Files Cleaner Card */}
      {Object.keys(duplicatesByGroup).length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#fef7e0] flex items-center justify-center text-[#b06000] shrink-0">
                <Copy size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {t.duplicatesTitle}
                </h3>
                <p className="text-xs text-neutral-500">
                  {t.duplicatesDesc}
                </p>
              </div>
            </div>

            {selectedDuplicates.length > 0 && (
              <button
                id="btn-delete-duplicates"
                onClick={handleDeleteSelectedDuplicates}
                className="px-4 py-2 bg-[#d93025] hover:bg-[#b3261e] text-white rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 size={15} />
                <span>Delete ({selectedDuplicates.length})</span>
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(duplicatesByGroup).map(([groupKey, groupFiles]) => (
              <div key={groupKey} className="bg-[#f8fafd] rounded-2xl p-3.5 border border-neutral-200/70 space-y-2.5">
                <div className="text-[11px] font-semibold text-neutral-600 flex items-center justify-between">
                  <span>Duplicate set: {groupFiles[0]?.name.split('.')[0]}</span>
                  <span>{formatBytes(groupFiles[0]?.size || 0)} each</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupFiles.map(file => {
                    const isSelected = selectedDuplicates.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleDuplicate(file.id)}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer bg-white ${
                          isSelected ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-400' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-[#d93025] focus:ring-rose-500 cursor-pointer w-4 h-4"
                        />
                        {file.thumbnail ? (
                          <img 
                            src={file.thumbnail} 
                            alt={file.name} 
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-neutral-100 shrink-0" 
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-neutral-900 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {file.folder} • {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Large Files Section Card */}
      {largeFiles.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#fce8e6] flex items-center justify-center text-[#d93025] shrink-0">
                <Film size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {t.largeFilesTitle}
                </h3>
                <p className="text-xs text-neutral-500">
                  {t.largeFilesDesc}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
              {largeFiles.length} files
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {largeFiles.map(file => (
              <div key={file.id} className="py-3 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3.5 min-w-0">
                  {file.thumbnail ? (
                    <img 
                      src={file.thumbnail} 
                      alt={file.name} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-100 shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-[#d93025] shrink-0">
                      <Film size={22} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {formatBytes(file.size)} • {file.folder}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteFile(file.id)}
                  title="Move to Trash"
                  className="p-2 text-neutral-400 hover:text-[#d93025] hover:bg-rose-50 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Old Downloads Cleaner Card */}
      {oldDownloads.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#e6f4ea] flex items-center justify-center text-[#137333] shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {t.oldDownloadsTitle}
              </h3>
              <p className="text-xs text-neutral-500">
                {t.oldDownloadsDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {oldDownloads.slice(0, 4).map(file => (
              <div key={file.id} className="p-3 rounded-2xl bg-[#f8fafd] border border-neutral-200/70 flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteFile(file.id)}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
