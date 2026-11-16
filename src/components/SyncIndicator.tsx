import React, { useState, useEffect } from 'react';
import {
  subscribeSyncState,
  triggerBackgroundSync,
  SyncState,
} from '../services/focusDataLayer';
import { Cloud, RefreshCw, AlertCircle } from 'lucide-react';

export function SyncIndicator() {
  const [sync, setSync] = useState<{ state: SyncState; waitingCount: number; error?: string }>({
    state: 'synced',
    waitingCount: 0,
  });
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newStatus) => {
      setSync(newStatus);
    });
    return unsubscribe;
  }, []);

  if (sync.state === 'synced') {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] font-medium"
        title="All actions safely logged to Google Sheet"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <Cloud className="w-3.5 h-3.5" />
        <span>Synced</span>
      </div>
    );
  }

  if (sync.state === 'waiting') {
    return (
      <button
        onClick={() => triggerBackgroundSync()}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[11px] font-medium active:scale-95 transition"
        title="Saved locally on phone. Tap to sync now"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
        <span>Waiting ({sync.waitingCount})</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowErrorDetail(!showErrorDetail);
          triggerBackgroundSync();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-700 text-rose-200 text-[11px] font-medium active:scale-95 transition shadow-sm"
        title={sync.error || 'Sync failed. Tap to retry or see details.'}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Sync Error ({sync.waitingCount})</span>
      </button>

      {showErrorDetail && sync.error && (
        <div className="absolute right-0 mt-2 w-72 p-3 bg-slate-900 border border-rose-700/80 rounded-xl shadow-2xl text-[11px] text-rose-200 z-50">
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>Sync Diagnostic:</span>
            <span
              onClick={() => setShowErrorDetail(false)}
              className="cursor-pointer text-slate-400 hover:text-white"
            >
              ✕
            </span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] break-all max-h-32 overflow-y-auto mb-2 text-rose-300">
            {sync.error}
          </div>
          <button
            onClick={() => triggerBackgroundSync()}
            className="w-full py-1 bg-rose-600 hover:bg-rose-500 rounded text-white font-bold text-[10px] transition"
          >
            Retry Now
          </button>
        </div>
      )}
    </div>
  );
}
