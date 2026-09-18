import React from 'react';
import { Trash2, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { FileItem, Language } from '../types';
import { formatBytes, formatDate } from '../utils/storage';
import { translations } from '../utils/translations';

interface TrashModalProps {
  files: FileItem[];
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onRestore: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  files,
  isOpen,
  language,
  onClose,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
}) => {
  const t = translations[language];
  if (!isOpen) return null;

  const trashFiles = files.filter(f => f.isTrash);
  const totalTrashSize = trashFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                {t.trash}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {trashFiles.length} {t.items} • {formatBytes(totalTrashSize)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trashFiles.length > 0 && (
              <button
                id="btn-empty-trash"
                onClick={onEmptyTrash}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full text-xs font-semibold border border-rose-200 transition-colors"
              >
                Empty Trash
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          <span>Items in trash are permanently deleted after 30 days.</span>
        </div>

        {/* Trash Item List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {trashFiles.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 space-y-2">
              <Trash2 size={40} className="mx-auto text-neutral-300" />
              <p className="text-sm font-medium text-neutral-600">Trash is empty</p>
              <p className="text-xs text-neutral-400">
                Deleted files will appear here for 30 days before being permanently removed.
              </p>
            </div>
          ) : (
            trashFiles.map(file => (
              <div
                key={file.id}
                className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {formatBytes(file.size)} • Originally in {file.folder}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onRestore(file.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    title={t.restore}
                  >
                    <RotateCcw size={15} />
                    <span className="hidden sm:inline">{t.restore}</span>
                  </button>
                  <button
                    onClick={() => onDeletePermanently(file.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    title={t.deletePermanently}
                  >
                    <Trash2 size={15} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
