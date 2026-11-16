import React, { useState, useEffect } from 'react';
import {
  subscribeSyncState,
  triggerBackgroundSync,
  SyncState,
} from '../services/focusDataLayer';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';

export function SyncIndicator() {
  const [sync, setSync] = useState<{ state: SyncState; waitingCount: number; error?: string }>({
    state: 'synced',
    waitingCount: 0,
  });

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
    <button
      onClick={() => triggerBackgroundSync()}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-[11px] font-medium active:scale-95 transition"
      title={sync.error || 'Sync failed. Tap to retry.'}
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
      <span>Sync Error ({sync.waitingCount})</span>
    </button>
  );
}
