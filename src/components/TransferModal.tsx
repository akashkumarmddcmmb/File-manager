import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  X, 
  HardDrive, 
  CreditCard, 
  Sliders, 
  Pause, 
  Play, 
  ChevronRight,
  ArrowRight,
  Gauge
} from 'lucide-react';
import { TransferTask, Language } from '../types';
import { formatBytes } from '../utils/storage';
import { translations } from '../utils/translations';

interface TransferModalProps {
  task: TransferTask | null;
  language: Language;
  onPause?: () => void;
  onResume?: () => void;
  onCancel: () => void;
  onComplete?: () => void;
  onClose?: () => void;
  onSpeedChange?: (newSpeedMbps: number) => void;
  onUpdateSpeedSetting?: (newSpeedMbps: number) => void;
  onOpenFolder?: (device: 'internal' | 'sdcard', folder: string) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  task,
  language,
  onPause,
  onResume,
  onCancel,
  onComplete,
  onClose,
  onSpeedChange,
  onUpdateSpeedSetting,
  onOpenFolder,
}) => {
  const t = translations[language];
  const [showSpeedConfig, setShowSpeedConfig] = useState(false);
  const [customSpeed, setCustomSpeed] = useState('50');

  if (!task) return null;

  const handleUpdateSpeed = (speed: number) => {
    if (onSpeedChange) onSpeedChange(speed);
    if (onUpdateSpeedSetting) onUpdateSpeedSetting(speed);
  };

  const handleClose = () => {
    if (onClose) onClose();
    if (onComplete) onComplete();
  };

  const currentFile = task.files[task.currentFileIndex] || task.files[0];
  const progressPercent = task.totalBytes > 0 
    ? Math.min(100, Math.round((task.transferredBytes / task.totalBytes) * 100))
    : 0;

  const speedPresets = [
    { label: t.speedNormal, speed: 25 },
    { label: t.speedFast, speed: 60 },
    { label: t.speedUltra, speed: 120 },
  ];

  const handleCustomSpeedApply = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customSpeed);
    if (!isNaN(val) && val > 0) {
      handleUpdateSpeed(Math.min(1000, Math.max(1, val)));
      setShowSpeedConfig(false);
    }
  };

  const isCompleted = task.status === 'completed';
  const isPaused = task.status === 'paused';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200/90 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#f8fafd]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              isCompleted ? 'bg-emerald-600' : 'bg-[#1a73e8]'
            }`}>
              {isCompleted ? <CheckCircle2 size={22} /> : <Zap size={22} className="animate-pulse" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-900 truncate">
                {isCompleted 
                  ? t.transferComplete 
                  : task.operation === 'copy' 
                    ? `${t.copyingFiles} (${task.files.length})` 
                    : `${t.movingFiles} (${task.files.length})`}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 truncate mt-0.5">
                <span>{task.sourceDevice === 'internal' ? t.internalStorage : t.sdCard}</span>
                <ArrowRight size={12} className="text-neutral-400 shrink-0" />
                <span className="font-semibold text-neutral-700">
                  {task.targetDevice === 'internal' ? t.internalStorage : t.sdCard} ({task.targetFolder})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={isCompleted ? handleClose : onCancel}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full transition-colors cursor-pointer"
            title={isCompleted ? 'Close' : t.cancelTransfer}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Active Live Speed Display Bar (Requested by user: MBPS speed indicator) */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white relative overflow-hidden shadow-inner">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
                  <Gauge size={14} className="text-blue-400" />
                  {t.transferSpeed}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                    {isCompleted ? '0.0' : isPaused ? '0.0' : task.speedMbps.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-blue-400 font-mono">
                    MB/s
                  </span>
                  {isPaused && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 ml-2">
                      PAUSED
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons in speed header */}
              <div className="flex items-center gap-2">
                {!isCompleted && onPause && onResume && (
                  <button
                    onClick={isPaused ? onResume : onPause}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? <Play size={16} className="text-emerald-400 fill-emerald-400" /> : <Pause size={16} className="text-amber-400 fill-amber-400" />}
                  </button>
                )}

                {/* Speed Config Toggle Button */}
                <button
                  onClick={() => setShowSpeedConfig(!showSpeedConfig)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
                  title="Change speed / MBPS setting"
                >
                  <Sliders size={14} className="text-blue-400" />
                  <span>{task.speedSetting} MB/s</span>
                </button>
              </div>
            </div>

            {/* Live Visual Speed Frequency Bars */}
            <div className="mt-3 flex items-end gap-1 h-4">
              {[35, 60, 25, 80, 90, 65, 45, 75, 95, 55, 40, 85, 70, 80, 85, 65, 55, 75, 90, 45].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#1a73e8] rounded-t transition-all duration-300"
                  style={{
                    height: isCompleted || isPaused ? '12%' : `${Math.min(100, (task.speedMbps / (task.speedSetting || 50)) * h)}%`,
                    opacity: isCompleted || isPaused ? 0.25 : 0.6 + (i % 3) * 0.2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Speed Configuration Drawer (if toggled) */}
          {showSpeedConfig && (
            <div className="p-4 bg-[#f8fafd] rounded-2xl border border-neutral-200 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800">
                  {t.speedMode}
                </span>
                <span className="text-[11px] text-neutral-500">
                  Kitna MBPS speed lena hai select karein
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {speedPresets.map(preset => (
                  <button
                    key={preset.speed}
                    onClick={() => {
                      handleUpdateSpeed(preset.speed);
                      setShowSpeedConfig(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                      task.speedSetting === preset.speed
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-400'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <div className="font-bold text-neutral-900">{preset.speed} MB/s</div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">{preset.label}</div>
                  </button>
                ))}
              </div>

              {/* Custom MBPS Input */}
              <form onSubmit={handleCustomSpeedApply} className="flex gap-2 pt-1 border-t border-neutral-200">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={customSpeed}
                  onChange={(e) => setCustomSpeed(e.target.value)}
                  placeholder="Custom MBPS (e.g. 50)"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-300 text-xs bg-white text-neutral-800 focus:outline-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Set MBPS
                </button>
              </form>
            </div>
          )}

          {/* File Progress & Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-800 truncate max-w-[240px] sm:max-w-xs" title={currentFile?.name}>
                {currentFile?.name}
              </span>
              <span className="font-bold text-neutral-900 shrink-0">
                {progressPercent}%
              </span>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200/60">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-[#1a73e8]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
              <span>
                {formatBytes(task.transferredBytes)} of {formatBytes(task.totalBytes)} ({task.currentFileIndex + 1}/{task.files.length} files)
              </span>
              <span>
                {isCompleted 
                  ? 'Completed' 
                  : isPaused
                    ? 'Paused'
                    : task.timeRemainingSec > 0 
                      ? `~${task.timeRemainingSec}s ${t.timeRemaining}` 
                      : 'Finishing...'}
              </span>
            </div>
          </div>

          {/* Storage Device visual indicators */}
          <div className="flex items-center justify-between p-3.5 bg-[#f8fafd] rounded-2xl border border-neutral-200/80 text-xs">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-blue-600" />
              <span className="text-neutral-700">From: <strong>{task.sourceDevice === 'internal' ? 'Internal Storage' : 'SD Card'}</strong></span>
            </div>
            <ArrowRight size={14} className="text-neutral-400" />
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-purple-600" />
              <span className="text-neutral-700">To: <strong>{task.targetDevice === 'sdcard' ? 'SD Card' : 'Internal Storage'}</strong></span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-[#f8fafd] flex items-center justify-end gap-2.5">
          {isCompleted ? (
            <>
              {onOpenFolder && (
                <button
                  onClick={() => {
                    handleClose();
                    onOpenFolder(task.targetDevice, task.targetFolder);
                  }}
                  className="px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                >
                  Open Destination Folder
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          ) : (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
              {t.cancelTransfer}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
