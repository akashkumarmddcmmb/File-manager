import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  HardDrive, 
  CreditCard, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  Zap, 
  Check,
  Loader2
} from 'lucide-react';
import { FileItem, FolderItem, StorageDevice, Language } from '../types';
import { translations } from '../utils/translations';
import { formatBytes } from '../utils/storage';
import { 
  RealDeviceStorage, 
  isNativePlatform, 
  createNativeFolder, 
  triggerHapticFeedback,
  StorageVolumeInfo 
} from '../utils/nativeStorage';

interface CopyMoveDestinationModalProps {
  isOpen: boolean;
  operation: 'copy' | 'move';
  files?: FileItem[];
  filesToTransfer?: FileItem[];
  folders: FolderItem[];
  language: Language;
  initialDevice?: StorageDevice;
  initialFolder?: string;
  realVolumes?: {
    internal: StorageVolumeInfo | null;
    sdcard: StorageVolumeInfo | null;
  } | null;
  onClose: () => void;
  onConfirm: (
    targetDevice: StorageDevice,
    targetFolder: string,
    speedMbps: number
  ) => void;
  onCreateFolder?: (folderName: string, parentPath: string, device: StorageDevice) => void;
}

export const CopyMoveDestinationModal: React.FC<CopyMoveDestinationModalProps> = ({
  isOpen,
  operation,
  files,
  filesToTransfer,
  folders,
  language,
  initialDevice,
  initialFolder,
  realVolumes,
  onClose,
  onConfirm,
  onCreateFolder,
}) => {
  const t = translations[language];
  const activeFiles = files || filesToTransfer || [];

  const getDeviceRoot = (dev: StorageDevice) => {
    if (dev === 'sdcard') {
      return realVolumes?.sdcard?.path || '/sdcard';
    }
    return realVolumes?.internal?.path || '/storage/emulated/0';
  };

  const defaultDevice: StorageDevice = initialDevice || (realVolumes?.internal ? 'internal' : 'internal');
  const [selectedDevice, setSelectedDevice] = useState<StorageDevice>(defaultDevice);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [speedSetting, setSpeedSetting] = useState<number>(75);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [liveSubFolders, setLiveSubFolders] = useState<Array<{ id: string; name: string; path: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      const dev = initialDevice || 'internal';
      setSelectedDevice(dev);
      const root = getDeviceRoot(dev);
      const startFolder = initialFolder && initialFolder.startsWith(root) ? initialFolder : root;
      setCurrentFolder(startFolder);
      setIsCreatingNewFolder(false);
      setNewFolderName('');
    }
  }, [isOpen, initialDevice, initialFolder, realVolumes]);

  // Load subfolders dynamically when currentFolder or selectedDevice changes
  useEffect(() => {
    if (!isOpen || !currentFolder) return;

    let isMounted = true;

    async function loadDirectoryFolders() {
      setIsLoading(true);
      try {
        const isNative = await isNativePlatform();
        if (isNative) {
          const res = await RealDeviceStorage.listDirectory({ path: currentFolder });
          if (isMounted && res && res.folders) {
            setLiveSubFolders(res.folders.map(f => ({
              id: f.id,
              name: f.name,
              path: f.path,
            })));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load native subfolders, falling back to static folders', err);
      }

      // Fallback to static folders state
      if (isMounted) {
        const devFolders = folders.filter(f => (f.storageDevice || 'internal') === selectedDevice);
        const sub = devFolders.filter(f => {
          if (currentFolder === '/' || currentFolder === getDeviceRoot(selectedDevice)) {
            return f.parentPath === '/' || f.parentPath === getDeviceRoot(selectedDevice) || !f.parentPath;
          }
          return f.parentPath === currentFolder;
        });

        setLiveSubFolders(sub.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
        })));
        setIsLoading(false);
      }
    }

    loadDirectoryFolders();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentFolder, selectedDevice, folders]);

  if (!isOpen || activeFiles.length === 0) return null;

  const totalBytes = activeFiles.reduce((a, b) => a + b.size, 0);
  const rootPath = getDeviceRoot(selectedDevice);

  // Calculate breadcrumbs relative to rootPath
  const relPath = currentFolder.startsWith(rootPath)
    ? currentFolder.slice(rootPath.length)
    : currentFolder;
  const breadcrumbSegments = relPath.split('/').filter(Boolean);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const fullNewPath = currentFolder.endsWith('/')
      ? `${currentFolder}${trimmed}`
      : `${currentFolder}/${trimmed}`;

    try {
      await createNativeFolder(fullNewPath);
    } catch {
      // ignore
    }

    if (onCreateFolder) {
      onCreateFolder(trimmed, currentFolder, selectedDevice);
    }

    // Add locally to immediate view
    setLiveSubFolders(prev => [
      ...prev,
      { id: `fold-${Date.now()}`, name: trimmed, path: fullNewPath },
    ]);

    setNewFolderName('');
    setIsCreatingNewFolder(false);
  };

  const handleStart = async () => {
    await triggerHapticFeedback();
    onConfirm(selectedDevice, currentFolder, speedSetting);
    onClose();
  };

  const handleNavigateUp = () => {
    if (currentFolder === rootPath || currentFolder === '/') return;
    const parent = currentFolder.substring(0, currentFolder.lastIndexOf('/')) || rootPath;
    if (parent.length < rootPath.length) {
      setCurrentFolder(rootPath);
    } else {
      setCurrentFolder(parent);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50/60">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-900">
              {operation === 'copy' ? t.copyTo : t.moveTo}
            </h2>
            <p className="text-xs text-neutral-500 truncate">
              {activeFiles.length} {t.items} ({formatBytes(totalBytes)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Device Switcher Tabs (Internal Storage vs SD Card) */}
        <div className="p-4 border-b border-neutral-100 bg-white">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            {language === 'hi' ? 'गंतव्य स्टोरेज डिवाइस चुनें' : 'Select Destination Storage Device'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setSelectedDevice('internal');
                setCurrentFolder(getDeviceRoot('internal'));
              }}
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                selectedDevice === 'internal'
                  ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <HardDrive size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {t.internalStorage}
                </p>
                <p className="text-[10px] text-neutral-500">
                  {realVolumes?.internal ? `${Math.round(realVolumes.internal.totalBytes / (1024**3))} GB` : 'Device Storage'}
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedDevice('sdcard');
                setCurrentFolder(getDeviceRoot('sdcard'));
              }}
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                selectedDevice === 'sdcard'
                  ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {t.sdCard}
                </p>
                <p className="text-[10px] text-purple-600 font-medium">
                  {realVolumes?.sdcard ? `${Math.round(realVolumes.sdcard.totalBytes / (1024**3))} GB` : 'Removable SD'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Speed Setting selector */}
        <div className="px-5 py-2.5 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-neutral-700">
            <Zap size={15} className="text-amber-500" />
            <span className="font-semibold">{t.transferSpeed}:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSpeedSetting(35)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                speedSetting === 35 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              35 MB/s
            </button>
            <button
              onClick={() => setSpeedSetting(75)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                speedSetting === 75 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              75 MB/s
            </button>
            <button
              onClick={() => setSpeedSetting(120)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                speedSetting === 120 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              120 MB/s
            </button>
          </div>
        </div>

        {/* Folder Navigation & Breadcrumbs */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-neutral-600 overflow-x-auto py-1 flex-1">
              {currentFolder !== rootPath && (
                <button
                  onClick={handleNavigateUp}
                  className="p-1 hover:bg-neutral-100 text-neutral-600 rounded-md shrink-0 cursor-pointer"
                  title="Go to parent folder"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <button
                onClick={() => setCurrentFolder(rootPath)}
                className={`font-medium px-1.5 py-0.5 rounded cursor-pointer shrink-0 ${
                  currentFolder === rootPath ? 'text-blue-600 bg-blue-50 font-semibold' : 'hover:text-blue-600'
                }`}
              >
                {selectedDevice === 'sdcard' ? 'SD Card' : 'Internal'}
              </button>
              {breadcrumbSegments.map((seg, idx) => {
                const subRel = '/' + breadcrumbSegments.slice(0, idx + 1).join('/');
                const p = rootPath === '/' ? subRel : `${rootPath}${subRel}`;
                const isLast = idx === breadcrumbSegments.length - 1;
                return (
                  <React.Fragment key={p}>
                    <ChevronRight size={13} className="text-neutral-400 shrink-0" />
                    <button
                      onClick={() => setCurrentFolder(p)}
                      className={`font-medium px-1.5 py-0.5 rounded shrink-0 cursor-pointer ${
                        isLast ? 'text-blue-600 bg-blue-50 font-semibold' : 'hover:text-blue-600'
                      }`}
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <button
              onClick={() => setIsCreatingNewFolder(!isCreatingNewFolder)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer"
              title={t.newFolder}
            >
              <FolderPlus size={15} />
              <span>{t.newFolder}</span>
            </button>
          </div>

          {/* New folder inline form */}
          {isCreatingNewFolder && (
            <form onSubmit={handleCreateFolder} className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200 flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder={language === 'hi' ? 'फ़ोल्डर का नाम' : 'Folder name'}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 text-xs bg-white"
              />
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                {language === 'hi' ? 'बनाएं' : 'Create'}
              </button>
            </form>
          )}

          {/* Subfolders list */}
          <div className="space-y-1.5 min-h-[140px]">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-neutral-400 gap-2">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <span>{language === 'hi' ? 'फ़ोल्डर लोड हो रहे हैं...' : 'Loading folders...'}</span>
              </div>
            ) : liveSubFolders.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 bg-neutral-50/60 rounded-2xl border border-dashed border-neutral-200 p-4">
                <p className="font-medium text-neutral-600 mb-1">
                  {language === 'hi' ? 'यहाँ कोई सब-फ़ोल्डर नहीं है' : 'No subfolders here'}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {language === 'hi' 
                    ? 'आप सीधे इसी फ़ोल्डर में कॉपी/मूव कर सकते हैं, या नया फ़ोल्डर बना सकते हैं।' 
                    : 'You can copy/move files directly here or create a new folder.'}
                </p>
              </div>
            ) : (
              liveSubFolders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.path)}
                  className="p-3 bg-neutral-50 hover:bg-blue-50/50 rounded-xl border border-neutral-200/70 hover:border-blue-300 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder size={18} className="text-blue-600 shrink-0 group-hover:scale-105 transition-transform" />
                    <span className="text-xs font-semibold text-neutral-800 truncate">
                      {folder.name}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400 group-hover:text-blue-600 transition-colors" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-neutral-500 font-medium">
              {language === 'hi' ? 'गंतव्य:' : 'Destination:'}
            </div>
            <div className="text-xs font-bold text-neutral-900 truncate" title={currentFolder}>
              {selectedDevice === 'sdcard' ? 'SD Card' : 'Internal'}
              {relPath ? ` > ${breadcrumbSegments.join(' > ')}` : ' (Root)'}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3.5 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              id="btn-confirm-transfer-dest"
              onClick={handleStart}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={16} />
              <span>{operation === 'copy' ? t.copyHere : t.moveHere}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
