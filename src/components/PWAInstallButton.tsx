import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Download size={18} />
          <span>Install App on Phone</span>
        </div>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Download size={18} />
            <span>Install on iPhone</span>
          </div>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl relative animate-in zoom-in-95">
              <button onClick={() => setShowIOSGuide(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Install on iPhone / iPad</h3>
              <p className="mt-2 text-sm text-neutral-600 space-y-2">
                <span className="block">1. Tap the <strong>Share</strong> button in Safari toolbar at the bottom.</span>
                <span className="block">2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-full bg-blue-600 hover:bg-blue-700 transition-colors py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
