import React from 'react';
import { X, HardDrive, Shield, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { StorageBreakdown } from '../types';
import { formatBytes } from '../utils/storage';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: StorageBreakdown;
  userEmail?: string;
  userName?: string;
  onOpenStorageBreakdown: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  storage,
  userEmail = 'akashkumarmddcmmb@gmail.com',
  userName = 'Akash Kumar',
  onOpenStorageBreakdown,
}) => {
  if (!isOpen) return null;

  const cloudUsed = 2.1 * 1024 * 1024 * 1024; // 2.1 GB of 15 GB
  const cloudTotal = 15 * 1024 * 1024 * 1024;
  const cloudPercent = Math.round((cloudUsed / cloudTotal) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Account Dialog Card (Google M3 Style) */}
      <div 
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-neutral-200 z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with close button */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 flex items-center justify-center">
              {/* Google 4-color 'G' circle badge */}
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-red-500 border-r-yellow-500 border-b-green-500"></div>
            </div>
            <span className="text-xs font-semibold text-neutral-600 tracking-wide uppercase">Google Account</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* User profile section */}
        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-md ring-4 ring-blue-50">
              {userName.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white"></div>
          </div>
          <h3 className="text-base font-semibold text-neutral-900 mt-2.5">
            {userName}
          </h3>
          <p className="text-xs text-neutral-500 font-normal">
            {userEmail}
          </p>

          <button 
            onClick={onOpenStorageBreakdown}
            className="mt-3 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:text-blue-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-full border border-neutral-200 transition-colors cursor-pointer"
          >
            Manage Storage & Account
          </button>
        </div>

        {/* Storage status in Google Account */}
        <div className="bg-[#f8fafd] border border-neutral-200/90 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
              <HardDrive size={15} className="text-blue-600" />
              Device Internal Storage
            </span>
            <span className="text-xs font-bold text-neutral-800">
              {Math.round((storage.used / storage.total) * 100)}% used
            </span>
          </div>

          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-1.5">
            <div 
              style={{ width: `${(storage.used / storage.total) * 100}%` }}
              className="bg-blue-600 h-full rounded-full"
            />
          </div>

          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>{formatBytes(storage.used, 1)} used</span>
            <span>{formatBytes(storage.free, 1)} free of {formatBytes(storage.total, 0)}</span>
          </div>

          <hr className="my-3 border-neutral-200" />

          {/* Cloud Storage */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Google Drive Cloud Storage
            </span>
            <span className="text-[11px] text-neutral-500">{cloudPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mb-1">
            <div style={{ width: `${cloudPercent}%` }} className="bg-amber-500 h-full rounded-full" />
          </div>
          <p className="text-[11px] text-neutral-500">
            2.1 GB of 15 GB used across Drive, Gmail, Photos
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-1 text-xs">
          <button
            onClick={() => {
              onClose();
              onOpenStorageBreakdown();
            }}
            className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors font-medium flex items-center justify-between cursor-pointer"
          >
            <span>View storage details</span>
            <ExternalLink size={14} className="text-neutral-400" />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </div>
  );
};
