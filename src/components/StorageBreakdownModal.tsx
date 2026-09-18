import React from 'react';
import { HardDrive, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { StorageBreakdown, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';

interface StorageBreakdownModalProps {
  storage: StorageBreakdown;
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onGoToClean: () => void;
}

export const StorageBreakdownModal: React.FC<StorageBreakdownModalProps> = ({
  storage,
  isOpen,
  language,
  onClose,
  onGoToClean,
}) => {
  const t = translations[language];
  if (!isOpen) return null;

  const percentUsed = Math.min(100, Math.round((storage.used / storage.total) * 100));

  const items = [
    { label: 'System & OS', size: storage.system, color: 'bg-neutral-500' },
    { label: 'Apps & Data', size: storage.apps, color: 'bg-blue-500' },
    { label: 'Images & Photos', size: storage.images, color: 'bg-amber-500' },
    { label: 'Videos & Movies', size: storage.videos, color: 'bg-rose-500' },
    { label: 'Audio & Music', size: storage.audio, color: 'bg-purple-500' },
    { label: 'Documents & Other', size: storage.documents, color: 'bg-emerald-500' },
    { label: 'Junk Cache Files', size: storage.junk, color: 'bg-orange-500' },
    { label: 'Trash (Bin)', size: storage.trash, color: 'bg-neutral-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                {t.storageBreakdown}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {formatBytes(storage.used)} {t.used} of {formatBytes(storage.total)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Storage Overview Circular / Progress Bar */}
          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/70 text-center space-y-3">
            <div className="text-3xl font-extrabold text-neutral-900">
              {percentUsed}%
            </div>
            <p className="text-xs text-neutral-500">
              {formatBytes(storage.free)} free space available
            </p>
            <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>

          {/* Breakdown Items List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Category Distribution
            </h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-100 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-xs font-medium text-neutral-800">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-neutral-600">
                    {formatBytes(item.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clean Shortcut */}
          <button
            onClick={() => {
              onClose();
              onGoToClean();
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Open Storage Cleaner</span>
          </button>
        </div>
      </div>
    </div>
  );
};
