import React, { useState } from 'react';
import { 
  Archive, 
  FolderArchive, 
  CheckCircle2, 
  Folder, 
  X, 
  FileText, 
  HardDrive,
  Sliders,
  Sparkles
} from 'lucide-react';
import { FileItem, FolderItem, Language, StorageDevice } from '../types';
import { formatBytes } from '../utils/storage';
import { createZipArchive } from '../utils/archiveUtils';
import { triggerHapticFeedback } from '../utils/nativeStorage';

interface ZipCompressModalProps {
  isOpen?: boolean;
  filesToCompress?: FileItem[];
  files?: FileItem[];
  folders?: FolderItem[];
  currentFolder?: string;
  language: Language;
  onClose: () => void;
  onCompressed?: (createdZipFile: FileItem) => void;
  onZipCreated?: (createdZipFile: FileItem) => void;
}

export const ZipCompressModal: React.FC<ZipCompressModalProps> = ({
  isOpen,
  filesToCompress: rawFilesToCompress,
  files: rawFiles,
  folders = [],
  currentFolder,
  language,
  onClose,
  onCompressed,
  onZipCreated,
}) => {
  const activeFiles = rawFilesToCompress || rawFiles || [];
  const shouldOpen = isOpen !== undefined ? isOpen : activeFiles.length > 0;

  const defaultArchiveName = activeFiles.length === 1 
    ? `${activeFiles[0].name.replace(/\.[^/.]+$/, '')}_archive.zip`
    : `Archive_${new Date().toISOString().slice(0, 10)}.zip`;

  const [archiveName, setArchiveName] = useState(defaultArchiveName);
  const [targetFolder, setTargetFolder] = useState<string>(
    currentFolder || (activeFiles[0]?.folder || '/Download')
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sync state when active files change
  React.useEffect(() => {
    if (activeFiles.length > 0) {
      const name = activeFiles.length === 1 
        ? `${activeFiles[0].name.replace(/\.[^/.]+$/, '')}_archive.zip`
        : `Archive_${new Date().toISOString().slice(0, 10)}.zip`;
      setArchiveName(name);
      setTargetFolder(currentFolder || (activeFiles[0]?.folder || '/Download'));
      setProgress(0);
      setIsCompressing(false);
    }
  }, [activeFiles, currentFolder]);

  if (!shouldOpen || activeFiles.length === 0) return null;

  const totalBytes = activeFiles.reduce((acc, f) => acc + f.size, 0);

  const handleStartCompress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveName.trim()) return;

    setIsCompressing(true);
    setProgress(5);
    triggerHapticFeedback();

    try {
      const storageDevice: StorageDevice = activeFiles[0]?.storageDevice || 'internal';
      const zipFile = await createZipArchive(
        activeFiles,
        archiveName.trim(),
        targetFolder,
        storageDevice,
        (p) => setProgress(p)
      );

      setProgress(100);
      setTimeout(() => {
        setIsCompressing(false);
        if (onZipCreated) {
          onZipCreated(zipFile);
        } else if (onCompressed) {
          onCompressed(zipFile);
        }
      }, 500);
    } catch (err) {
      console.error('Compression failed:', err);
      setIsCompressing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <FolderArchive size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                {language === 'hi' ? 'ZIP फ़ाइल बनाएं (Compress)' : 'Create ZIP Archive'}
              </h3>
              <p className="text-xs text-neutral-500 truncate mt-0.5">
                {activeFiles.length} {language === 'hi' ? 'फ़ाइलें चुनी गईं' : 'files selected'} ({formatBytes(totalBytes)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCompressing}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/70 rounded-full transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStartCompress} className="p-4 sm:p-5 space-y-4">
          
          {isCompressing ? (
            <div className="py-6 px-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
                <FolderArchive size={24} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900">
                  {language === 'hi' ? 'ZIP फ़ाइल कंप्रेस हो रही है...' : 'Compressing into ZIP...'}
                </p>
                <p className="text-xs text-neutral-500">
                  {progress}% {language === 'hi' ? 'पूर्ण' : 'completed'}
                </p>
              </div>
              <div className="w-full bg-blue-200/70 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Archive Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  {language === 'hi' ? 'ZIP फ़ाइल का नाम:' : 'ZIP File Name:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={archiveName}
                    onChange={(e) => setArchiveName(e.target.value)}
                    required
                    placeholder="MyArchive.zip"
                    className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-3 pr-12 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden font-medium text-neutral-900"
                  />
                  <span className="absolute right-3 top-3 text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    .ZIP
                  </span>
                </div>
              </div>

              {/* Target Folder */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                  <Folder size={13} className="text-neutral-500" />
                  <span>{language === 'hi' ? 'सेव करने का स्थान:' : 'Save Destination:'}</span>
                </label>
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 focus:bg-white focus:border-blue-500 outline-hidden font-medium text-neutral-800"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.path}>
                      {f.name} ({f.path}) [{f.storageDevice === 'sdcard' ? 'SD Card' : 'Internal'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Files Preview List */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  {language === 'hi' ? 'शामिल की जाने वाली फ़ाइलें:' : 'Files to include:'}
                </label>
                <div className="border border-neutral-200 rounded-xl p-2 max-h-32 overflow-y-auto divide-y divide-neutral-100 bg-neutral-50/50">
                  {activeFiles.map(f => (
                    <div key={f.id} className="py-1.5 px-1 flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px] font-medium text-neutral-800">{f.name}</span>
                      <span className="text-[10px] text-neutral-400 shrink-0">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isCompressing}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isCompressing || !archiveName.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <FolderArchive size={16} />
              <span>{language === 'hi' ? 'ZIP बनाएं' : 'Create ZIP'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
