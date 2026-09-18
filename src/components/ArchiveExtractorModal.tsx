import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  FolderArchive, 
  CheckCircle2, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  File, 
  Package, 
  ChevronRight, 
  ArrowDownToLine, 
  X, 
  Sparkles, 
  Trash2,
  FolderPlus,
  Layers,
  HardDrive
} from 'lucide-react';
import { FileItem, FolderItem, Language, StorageDevice } from '../types';
import { formatBytes } from '../utils/storage';
import { 
  inspectArchive, 
  extractArchiveContents, 
  getArchiveBadge, 
  ArchiveInfo, 
  ArchiveEntry 
} from '../utils/archiveUtils';
import { triggerHapticFeedback } from '../utils/nativeStorage';

interface ArchiveExtractorModalProps {
  isOpen?: boolean;
  file: FileItem | null;
  folders?: FolderItem[];
  currentFolder?: string;
  language: Language;
  onClose: () => void;
  onExtracted: (extractedFiles: FileItem[], createdFolders?: FolderItem[], deleteOriginal?: boolean) => void;
}

export const ArchiveExtractorModal: React.FC<ArchiveExtractorModalProps> = ({
  isOpen,
  file,
  folders = [],
  currentFolder,
  language,
  onClose,
  onExtracted,
}) => {
  const shouldOpen = isOpen !== undefined ? isOpen : Boolean(file);
  const [archiveInfo, setArchiveInfo] = useState<ArchiveInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [extractMode, setExtractMode] = useState<'current' | 'subfolder' | 'custom'>('subfolder');
  const [customTargetFolder, setCustomTargetFolder] = useState<string>('');
  const [deleteAfterExtract, setDeleteAfterExtract] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [currentExtractingName, setCurrentExtractingName] = useState('');
  const [extractedResult, setExtractedResult] = useState<FileItem[] | null>(null);

  // Derived subfolder name from file name (without extension)
  const defaultSubfolderName = file ? file.name.replace(/\.[^/.]+$/, '').replace(/[\s.-]+/g, '_') : 'extracted';
  const effectiveBaseFolder = currentFolder || (file ? file.folder : '/Download');
  const subfolderPath = `${effectiveBaseFolder}/${defaultSubfolderName}`.replace(/\/+/g, '/');

  // Load archive entries on open
  useEffect(() => {
    if (shouldOpen && file) {
      setIsLoading(true);
      setExtractedResult(null);
      setIsExtracting(false);
      setExtractProgress(0);
      setDeleteAfterExtract(false);

      inspectArchive(file)
        .then((info) => {
          setArchiveInfo(info);
          setSelectedPaths(info.entries.filter(e => !e.isFolder).map(e => e.path));
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setArchiveInfo(null);
      setSelectedPaths([]);
    }
  }, [shouldOpen, file]);

  if (!shouldOpen || !file) return null;

  const badge = getArchiveBadge(file.name);

  const getTargetFolderPath = () => {
    if (extractMode === 'subfolder') return subfolderPath;
    if (extractMode === 'custom') return customTargetFolder || effectiveBaseFolder;
    return effectiveBaseFolder;
  };

  const handleToggleSelectAll = () => {
    if (!archiveInfo) return;
    const allFilePaths = archiveInfo.entries.filter(e => !e.isFolder).map(e => e.path);
    if (selectedPaths.length === allFilePaths.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(allFilePaths);
    }
  };

  const handleTogglePath = (path: string) => {
    setSelectedPaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleStartExtraction = async () => {
    if (!archiveInfo) return;
    setIsExtracting(true);
    setExtractProgress(10);
    setCurrentExtractingName(language === 'hi' ? 'अनपैक करने की तैयारी...' : 'Preparing archive extraction...');
    triggerHapticFeedback();

    const targetFolder = getTargetFolderPath();
    const storageDevice: StorageDevice = file.storageDevice || 'internal';

    // Simulate stepping progress
    const timer = setInterval(() => {
      setExtractProgress(prev => {
        if (prev >= 85) {
          clearInterval(timer);
          return 85;
        }
        return prev + 18;
      });
    }, 150);

    try {
      const extracted = await extractArchiveContents(
        file,
        targetFolder,
        storageDevice,
        selectedPaths.length > 0 && selectedPaths.length < archiveInfo.entries.filter(e => !e.isFolder).length
          ? selectedPaths
          : undefined
      );

      clearInterval(timer);
      setExtractProgress(100);
      setCurrentExtractingName(language === 'hi' ? 'एक्सट्रैक्शन पूर्ण!' : 'Extraction Complete!');
      setExtractedResult(extracted);

      // Create folder items if new subfolder mode was picked
      const createdFolders: FolderItem[] = [];
      if (extractMode === 'subfolder') {
        createdFolders.push({
          id: `folder-${Date.now()}`,
          name: defaultSubfolderName,
          path: subfolderPath,
          parentPath: effectiveBaseFolder,
          storageDevice,
          createdAt: new Date().toISOString(),
        });
      }

      setTimeout(() => {
        setIsExtracting(false);
        onExtracted(extracted, createdFolders, deleteAfterExtract);
      }, 900);
    } catch (err) {
      console.error(err);
      clearInterval(timer);
      setIsExtracting(false);
    }
  };

  const getEntryIcon = (entry: ArchiveEntry) => {
    if (entry.isFolder) return <Folder size={18} className="text-amber-500" />;
    switch (entry.type) {
      case 'image':
        return <ImageIcon size={18} className="text-blue-500" />;
      case 'video':
        return <Film size={18} className="text-rose-500" />;
      case 'audio':
        return <Music size={18} className="text-amber-500" />;
      case 'document':
        return <FileText size={18} className="text-emerald-500" />;
      case 'apk':
        return <Package size={18} className="text-purple-500" />;
      default:
        return <File size={18} className="text-neutral-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
              <FolderArchive size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${badge.bg} ${badge.color} ${badge.border}`}>
                  {badge.label}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                  {language === 'hi' ? 'फ़ाइलें अनज़िप / एक्सट्रैक्ट करें' : 'Extract Archive Files'}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 truncate mt-0.5" title={file.name}>
                {file.name} ({formatBytes(file.size)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExtracting}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/70 rounded-full transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Extraction in progress animation */}
          {isExtracting && (
            <div className="py-6 px-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
                <ArrowDownToLine size={28} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900">
                  {currentExtractingName}
                </p>
                <p className="text-xs text-neutral-500">
                  {language === 'hi' ? 'फ़ाइलें अनपैक की जा रही हैं...' : 'Unpacking archive files...'} ({extractProgress}%)
                </p>
              </div>
              <div className="w-full bg-blue-200/70 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Result */}
          {extractedResult && !isExtracting && (
            <div className="py-6 px-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  {language === 'hi' ? 'सफलतापूर्वक अनज़िप / एक्सट्रैक्ट हो गया!' : 'Successfully Extracted!'}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  {extractedResult.length} {language === 'hi' ? 'फ़ाइलें' : 'files'} {getTargetFolderPath()} {language === 'hi' ? 'में सेव की गईं' : 'saved'}
                </p>
              </div>
            </div>
          )}

          {!isExtracting && !extractedResult && (
            <>
              {/* Target Extraction Location Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus size={14} className="text-amber-600" />
                  <span>{language === 'hi' ? 'फ़ाइलें कहाँ एक्सट्रैक्ट करें:' : 'Extract Destination:'}</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtractMode('subfolder')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      extractMode === 'subfolder'
                        ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400 shadow-2xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderArchive size={16} className={extractMode === 'subfolder' ? 'text-amber-600' : 'text-neutral-400'} />
                      <span className="text-xs font-bold text-neutral-900">
                        {language === 'hi' ? 'नए फ़ोल्डर में निकालें' : 'Extract to subfolder'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-1 pl-6">
                      /{defaultSubfolderName}/
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtractMode('current')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      extractMode === 'current'
                        ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400 shadow-2xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={16} className={extractMode === 'current' ? 'text-amber-600' : 'text-neutral-400'} />
                      <span className="text-xs font-bold text-neutral-900">
                        {language === 'hi' ? 'वर्तमान फ़ोल्डर में' : 'Current folder'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-1 pl-6">
                      {effectiveBaseFolder}
                    </p>
                  </button>
                </div>

                {/* Custom Folder selector */}
                {folders.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExtractMode(extractMode === 'custom' ? 'subfolder' : 'custom')}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <HardDrive size={13} />
                      <span>{language === 'hi' ? 'कोई अन्य कस्टम फ़ोल्डर चुनें...' : 'Choose different folder...'}</span>
                    </button>

                    {extractMode === 'custom' && (
                      <div className="mt-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                        <select
                          value={customTargetFolder || effectiveBaseFolder}
                          onChange={(e) => setCustomTargetFolder(e.target.value)}
                          className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 outline-hidden"
                        >
                          {folders.map(f => (
                            <option key={f.id} value={f.path}>
                              {f.name} ({f.path}) [{f.storageDevice === 'sdcard' ? 'SD Card' : 'Internal'}]
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Archive Contents List Header */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-neutral-600" />
                    <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      {language === 'hi' ? 'आर्काइव में उपलब्ध फ़ाइलें' : 'Archive Contents'}
                    </span>
                    {archiveInfo && (
                      <span className="text-[11px] px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full font-medium">
                        {archiveInfo.totalFiles} {language === 'hi' ? 'फ़ाइलें' : 'files'}
                      </span>
                    )}
                  </div>

                  {archiveInfo && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      {selectedPaths.length === archiveInfo.entries.filter(e => !e.isFolder).length
                        ? (language === 'hi' ? 'सभी हटाएं' : 'Deselect All')
                        : (language === 'hi' ? 'सभी चुनें' : 'Select All')}
                    </button>
                  )}
                </div>

                {/* Loading state */}
                {isLoading && (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {language === 'hi' ? 'आर्काइव फ़ाइलें लोड हो रही हैं...' : 'Loading archive files...'}
                  </div>
                )}

                {/* Archive Entries list */}
                {!isLoading && archiveInfo && (
                  <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 max-h-56 overflow-y-auto bg-neutral-50/40">
                    {archiveInfo.entries.map((entry) => {
                      const isSelected = selectedPaths.includes(entry.path);
                      if (entry.isFolder) {
                        return (
                          <div key={entry.path} className="px-3 py-2 bg-neutral-100/60 flex items-center gap-2 text-neutral-600 text-xs font-medium">
                            <Folder size={15} className="text-amber-500 shrink-0" />
                            <span className="truncate">{entry.path}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={entry.path}
                          onClick={() => handleTogglePath(entry.path)}
                          className={`px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-amber-50/60 hover:bg-amber-50' : 'bg-white hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                            <div className="shrink-0">
                              {getEntryIcon(entry)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-neutral-800 truncate" title={entry.path}>
                                {entry.path}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {formatBytes(entry.size)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Delete original toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-neutral-50 hover:bg-neutral-100/70 rounded-xl border border-neutral-200/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteAfterExtract}
                    onChange={(e) => setDeleteAfterExtract(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800">
                      {language === 'hi' ? 'एक्सट्रैक्ट होने के बाद मूल ZIP / Archive फ़ाइल डिलीट करें' : 'Delete original archive file after extracting'}
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      {language === 'hi' ? 'फोन का स्टोरेज बचाने के लिए' : 'Free up phone storage'}
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isExtracting}
            className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-xl transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>

          {!extractedResult ? (
            <button
              type="button"
              onClick={handleStartExtraction}
              disabled={isExtracting || selectedPaths.length === 0 || isLoading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <ArrowDownToLine size={16} />
              <span>
                {language === 'hi' 
                  ? `एक्सट्रैक्ट करें (${selectedPaths.length})` 
                  : `Extract Files (${selectedPaths.length})`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {language === 'hi' ? 'फ़ाइलें देखें' : 'Done & View Files'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
