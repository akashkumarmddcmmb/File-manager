import React, { useState } from 'react';
import { 
  Share2, 
  Send, 
  Download, 
  Wifi, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  X,
  FileCheck
} from 'lucide-react';
import { FileItem, Language } from '../types';
import { translations } from '../utils/translations';
import { formatBytes } from '../utils/storage';

interface ShareTabProps {
  files: FileItem[];
  language: Language;
}

export const ShareTab: React.FC<ShareTabProps> = ({ files, language }) => {
  const t = translations[language];
  const [mode, setMode] = useState<'idle' | 'send' | 'receive' | 'transferring' | 'completed'>('idle');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const activeFiles = files.filter(f => !f.isTrash && !f.isSafe);

  const peers = [
    { id: 'peer-1', name: "Aarav's Pixel 9 Pro", type: 'phone' },
    { id: 'peer-2', name: "Priya's Galaxy S24", type: 'phone' },
    { id: 'peer-3', name: "Work MacBook Pro", type: 'laptop' },
  ];

  const handleStartSend = () => {
    setMode('send');
    setSelectedFileIds([]);
  };

  const handleStartReceive = () => {
    setMode('receive');
  };

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSendToPeer = (peerName: string) => {
    if (selectedFileIds.length === 0) return;
    setSelectedPeer(peerName);
    setMode('transferring');
    setProgress(10);

    const interval = setInterval(() => {
      setProgress(old => {
        if (old >= 100) {
          clearInterval(interval);
          setMode('completed');
          return 100;
        }
        return old + 20;
      });
    }, 400);
  };

  const handleReset = () => {
    setMode('idle');
    setSelectedFileIds([]);
    setSelectedPeer(null);
    setProgress(0);
  };

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Nearby Share Hero */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs text-center relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-blue-100/70 pointer-events-none -z-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-blue-200/60 pointer-events-none -z-0"></div>

        <div className="relative z-10 max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs border border-blue-100">
            <Share2 size={32} />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
              {t.shareNear}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {t.shareNearDesc}
            </p>
          </div>

          {/* Quick Action Buttons */}
          {mode === 'idle' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-share-send"
                onClick={handleStartSend}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send size={16} />
                <span>{t.send}</span>
              </button>
              <button
                id="btn-share-receive"
                onClick={handleStartReceive}
                className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 rounded-2xl text-xs sm:text-sm font-semibold border border-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download size={16} />
                <span>{t.receive}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sending Workflow: Select Files */}
      {mode === 'send' && (
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Select files to send
              </h3>
              <p className="text-xs text-neutral-400">
                {selectedFileIds.length} files selected
              </p>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
            >
              <X size={18} />
            </button>
          </div>

          {/* File Picker Grid */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {activeFiles.slice(0, 10).map(file => {
              const isSelected = selectedFileIds.includes(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => toggleSelectFile(file.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nearby Devices to connect */}
          {selectedFileIds.length > 0 && (
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {t.lookingForNearby}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {peers.map(peer => (
                  <button
                    key={peer.id}
                    onClick={() => handleSendToPeer(peer.name)}
                    className="p-3 bg-neutral-50 hover:bg-blue-50 hover:border-blue-300 border border-neutral-200/80 rounded-xl flex items-center gap-2.5 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      {peer.type === 'phone' ? <Smartphone size={16} /> : <Laptop size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-800 truncate">
                        {peer.name}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Tap to send
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receiving Mode */}
      {mode === 'receive' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs text-center space-y-4 animate-in fade-in">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-60"></div>
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center relative z-10 border border-blue-200">
              <Wifi size={28} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              {t.readyToReceive}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Ask sender to select this device in their Files app
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-xs font-medium text-neutral-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Transferring Progress */}
      {mode === 'transferring' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs space-y-4 text-center animate-in fade-in">
          <h3 className="text-sm font-semibold text-neutral-900">
            Sending to {selectedPeer}...
          </h3>
          <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500">{progress}% completed</p>
        </div>
      )}

      {/* Transfer Completed */}
      {mode === 'completed' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs space-y-3 text-center animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Files sent successfully to {selectedPeer}!
          </h3>
          <button
            onClick={handleReset}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold"
          >
            Done
          </button>
        </div>
      )}

      {/* Security & Offline Info Note */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600 flex items-start gap-3">
        <Wifi size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-800">Direct WiFi & Bluetooth sharing: </span>
          Files are shared peer-to-peer with zero data charges, encrypted locally like Google Files and Quick Share.
        </div>
      </div>
    </div>
  );
};
