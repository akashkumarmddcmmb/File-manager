import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  X, 
  Eye, 
  EyeOff, 
  Trash2, 
  FolderInput,
  KeyRound 
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';
import { FileItemCard } from './FileItemCard';
import { verifyVaultPin, saveVaultPin, hasVaultPin } from '../utils/cryptoVault';

interface SafeFolderModalProps {
  files: FileItem[];
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onRemoveFromSafe: (id: string) => void;
  onOpenPreview: (file: FileItem) => void;
  onMoveToTrash: (id: string) => void;
}

export const SafeFolderModal: React.FC<SafeFolderModalProps> = ({
  files,
  isOpen,
  language,
  onClose,
  onRemoveFromSafe,
  onOpenPreview,
  onMoveToTrash,
}) => {
  const t = translations[language];
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  if (!isOpen) return null;

  const safeFiles = files.filter(f => f.isSafe && !f.isTrash);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyVaultPin(pin);
    if (isValid) {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg(t.wrongPin);
    }
  };

  const handleSetNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 4) {
      await saveVaultPin(newPin);
      setIsChangingPin(false);
      setNewPin('');
    }
  };

  const handleCloseModal = () => {
    setIsUnlocked(false);
    setPin('');
    setErrorMsg('');
    setIsChangingPin(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                {t.safeFolder}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {isUnlocked ? `${safeFiles.length} protected items` : t.safeFolderLocked}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Unlocked State: View Files */}
        {isUnlocked ? (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-100">
              <span className="text-neutral-500">
                Protected with 4-digit PIN
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsChangingPin(!isChangingPin)}
                  className="text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  <KeyRound size={13} />
                  <span>Change PIN</span>
                </button>
                <button
                  onClick={() => setIsUnlocked(false)}
                  className="text-neutral-600 font-medium hover:text-neutral-900 flex items-center gap-1 ml-2"
                >
                  <Lock size={13} />
                  <span>Lock</span>
                </button>
              </div>
            </div>

            {isChangingPin && (
              <form onSubmit={handleSetNewPin} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <label className="text-xs font-semibold text-neutral-700 block">Set New 4-digit PIN</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5678"
                    className="w-32 px-3 py-1.5 rounded-lg border border-neutral-300 text-sm tracking-widest text-center"
                  />
                  <button
                    type="submit"
                    disabled={newPin.length !== 4}
                    className="px-3 py-1.5 bg-blue-600 disabled:bg-neutral-300 text-white rounded-lg text-xs font-medium"
                  >
                    Save PIN
                  </button>
                </div>
              </form>
            )}

            {safeFiles.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 space-y-2">
                <ShieldCheck size={36} className="mx-auto text-neutral-300" />
                <p className="text-sm font-medium text-neutral-600">Safe Folder is empty</p>
                <p className="text-xs text-neutral-400">
                  Select any file from Browse or Categories and choose "Move to Safe Folder".
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {safeFiles.map(file => (
                  <div 
                    key={file.id} 
                    className="p-3 rounded-xl border border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50/50 hover:bg-white transition-all"
                  >
                    <div 
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => onOpenPreview(file)}
                    >
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {formatBytes(file.size)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onRemoveFromSafe(file.id)}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg border border-neutral-200"
                        title="Remove from Safe Folder"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => onMoveToTrash(file.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg"
                        title="Move to Trash"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Locked State: Enter PIN */
          <form onSubmit={handleUnlock} className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Lock size={30} />
            </div>

            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                {t.pinRequired}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Default PIN is <span className="font-semibold text-neutral-700">1234</span>
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <input
                id="input-safe-pin"
                type="password"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • •"
                className="w-40 mx-auto text-center tracking-[0.6em] text-2xl py-2 px-4 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono"
              />
              {errorMsg && (
                <p className="text-xs text-rose-500 font-medium mt-2">{errorMsg}</p>
              )}
            </div>

            <div className="flex gap-2 max-w-xs mx-auto pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pin.length !== 4}
                className="flex-1 py-2.5 bg-blue-600 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                {t.unlock}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
