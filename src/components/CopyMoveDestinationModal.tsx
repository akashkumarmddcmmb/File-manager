import React, { useState } from 'react';
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
  Sliders 
} from 'lucide-react';
import { FileItem, FolderItem, StorageDevice, Language } from '../types';
import { translations } from '../utils/translations';
import { formatBytes } from '../utils/storage';

interface CopyMoveDestinationModalProps {
  isOpen: boolean;
  operation: 'copy' | 'move';
  filesToTransfer: FileItem[];
  folders: FolderItem[];
  language: Language;
  onClose: () => void;
  onConfirm: (
    operation: 'copy' | 'move',
    targetDevice: StorageDevice,
    targetFolder: string,
    speedMbps: number
  ) => void;
  onCreateFolder: (folderName: string, parentPath: string, device: StorageDevice) => void;
}

export const CopyMoveDestinationModal: React.FC<CopyMoveDestinationModalProps> = ({
  isOpen,
  operation,
  filesToTransfer,
  folders,
  language,
  onClose,
  onConfirm,
  onCreateFolder,
}) => {
  const t = translations[language];
  const [selectedDevice, setSelectedDevice] = useState<StorageDevice>('sdcard');
  const [currentFolder, setCurrentFolder] = useState<string>('/');
  const [speedSetting, setSpeedSetting] = useState<number>(45);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  if (!isOpen || filesToTransfer.length === 0) return null;

  const totalBytes = filesToTransfer.reduce((a, b) => a + b.size, 0);

  // Subfolders of currentFolder on selectedDevice
  const deviceFolders = folders.filter(f => (f.storageDevice || 'internal') === selectedDevice);
  const currentSubFolders = deviceFolders.filter(f => f.parentPath === currentFolder);

  // Breadcrumbs
  const breadcrumbs = currentFolder.split('/').filter(Boolean);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), currentFolder, selectedDevice);
      setNewFolderName('');
      setIsCreatingNewFolder(false);
    }
  };

  const handleStart = () => {
    onConfirm(operation, selectedDevice, currentFolder, speedSetting);
    onClose();
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
              {filesToTransfer.length} {t.items} ({formatBytes(totalBytes)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Device Switcher Tabs (Internal Storage vs SD Card) */}
        <div className="p-4 border-b border-neutral-100 bg-white">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Select Destination Storage Device
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setSelectedDevice('internal');
                setCurrentFolder('/');
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
                <p className="text-[10px] text-neutral-500">64 GB Device</p>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedDevice('sdcard');
                setCurrentFolder('/');
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
                <p className="text-[10px] text-purple-600 font-medium">128 GB SanDisk</p>
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
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                speedSetting === 35 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              35 MB/s
            </button>
            <button
              onClick={() => setSpeedSetting(75)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                speedSetting === 75 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              75 MB/s
            </button>
            <button
              onClick={() => setSpeedSetting(120)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                speedSetting === 120 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              120 MB/s
            </button>
          </div>
        </div>

        {/* Folder Navigation & Breadcrumb */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-neutral-600 overflow-x-auto py-1">
              <button
                onClick={() => setCurrentFolder('/')}
                className={`font-medium px-1.5 py-0.5 rounded ${
                  currentFolder === '/' ? 'text-blue-600 bg-blue-50 font-semibold' : 'hover:text-blue-600'
                }`}
              >
                Root
              </button>
              {breadcrumbs.map((seg, idx) => {
                const p = '/' + breadcrumbs.slice(0, idx + 1).join('/');
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={p}>
                    <ChevronRight size={13} className="text-neutral-400 shrink-0" />
                    <button
                      onClick={() => setCurrentFolder(p)}
                      className={`font-medium px-1.5 py-0.5 rounded shrink-0 ${
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
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-xs font-semibold shrink-0"
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
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 text-xs bg-white"
              />
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium"
              >
                Create
              </button>
            </form>
          )}

          {/* Subfolders list */}
          <div className="space-y-1.5">
            {currentSubFolders.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No subfolders in {currentFolder}. You can copy/move files directly here or create a new folder.
              </div>
            ) : (
              currentSubFolders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.path)}
                  className="p-3 bg-neutral-50 hover:bg-blue-50/50 rounded-xl border border-neutral-200/70 hover:border-blue-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder size={18} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-neutral-800 truncate">
                      {folder.name}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-600 truncate">
            Target: <strong className="text-neutral-900">{selectedDevice === 'internal' ? 'Internal' : 'SD Card'}{currentFolder}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-transfer-dest"
              onClick={handleStart}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={14} />
              <span>{operation === 'copy' ? t.copyHere : t.moveHere}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
