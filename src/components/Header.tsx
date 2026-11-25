import React, { useState, useEffect } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { getStoredAccessToken } from '../services/googleTasksService';
import {
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Mic,
  Settings,
  Download,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Columns,
  RefreshCw,
  CheckCircle2,
  Undo2,
  Zap,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenVoiceIngest: () => void;
  onOpenDoMode?: () => void;
  onOpenPlanMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenVoiceIngest,
  onOpenDoMode,
  onOpenPlanMode,
}) => {
  const {
    settings,
    toggleTheme,
    panelStates,
    setCalendarView,
    setPanelLevel,
    layoutMode,
    toggleLayoutMode,
    isSyncingTasks,
    pendingGoogleTaskOpsCount,
    syncGoogleTasks,
    undo,
    canUndo,
    lastUndoMessage,
  } = useMomentum();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'To install Momentum as an independent persistent window:\n\n' +
        'In Chrome / Edge, click the Install icon in the address bar, or go to Menu (⋮) -> Apps -> "Install Momentum".'
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const areAllCompact =
    panelStates.quick_jobs === 'compact' &&
    panelStates.responsibilities === 'compact' &&
    panelStates.projects === 'compact' &&
    panelStates.habits === 'compact';

  const toggleAllLevels = () => {
    const target = areAllCompact ? 'expanded' : 'compact';
    setPanelLevel('quick_jobs', target);
    setPanelLevel('responsibilities', target);
    setPanelLevel('projects', target);
    setPanelLevel('habits', target);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2 transition-colors shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Artwork */}
        <div className="flex items-center gap-1.5 shrink-0">
          <img
            src="./icons/icon-192.png"
            alt="Momentum"
            className="w-6 h-6 rounded-lg shadow-xs border border-purple-500/30 object-cover"
          />
          <div className="flex flex-col">
            <h1 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              Momentum
            </h1>
            <span className="text-[7px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400 leading-tight">
              {layoutMode === 'widget' ? 'Widget' : 'Cockpit'}
            </span>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* PRIMARY DO BUTTON: Visible always, first in line on mobile */}
          <button
            onClick={() => {
              if (onOpenDoMode) {
                onOpenDoMode();
              } else {
                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'do');
                window.location.href = url.toString();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition shrink-0 active:scale-95"
            title="Return to DO Mode (Action Layer)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>DO</span>
          </button>

          {/* Prominent Google Tasks Sync Button (Visible everywhere) */}
          <button
            onClick={async () => {
              if (!settings.googleTasksConnected && !settings.googleTasksClientId && !settings.googleTasksWebhookUrl) {
                onOpenSettings();
                return;
              }
              const res = await syncGoogleTasks();
              if (res.success) {
                const parts: string[] = [];
                if (res.completedCount && res.completedCount > 0) parts.push(`✓ Synced ${res.completedCount} completed/deleted task${res.completedCount === 1 ? '' : 's'} to Google Tasks`);
                if (res.pushedCount && res.pushedCount > 0) parts.push(`✓ Uploaded ${res.pushedCount} new task${res.pushedCount === 1 ? '' : 's'} to Google Tasks`);
                if (res.count > 0) parts.push(`✓ Synced ${res.count} from Google`);
                if (res.relocatedCount && res.relocatedCount > 0) parts.push(`✓ Relocated ${res.relocatedCount} to dedicated Google lists`);
                if (res.removedCount && res.removedCount > 0) parts.push(`✓ Removed ${res.removedCount} deleted/completed`);
                const accountDetail = res.accountEmail ? `\nConnected Account: ${res.accountEmail}` : '';
                const listDetail = res.listsSummary ? `\nGoogle Task Lists: ${res.listsSummary}` : '';
                const errorDetail = res.errors && res.errors.length > 0 ? `\n⚠️ Errors:\n${res.errors.join('\n')}` : '';

                if (
                  res.count === 0 &&
                  (!res.completedCount || res.completedCount === 0) &&
                  (!res.removedCount || res.removedCount === 0) &&
                  (!res.pushedCount || res.pushedCount === 0) &&
                  (!res.relocatedCount || res.relocatedCount === 0)
                ) {
                  if (res.errors && res.errors.length > 0) {
                    alert(`Sync completed with errors:\n${accountDetail}${errorDetail}`);
                  } else {
                    alert(
                      `Connected to Google Tasks: 0 changes.\n${accountDetail}${listDetail}\n\nYour cockpit is 100% in sync with Google Tasks.`
                    );
                  }
                } else {
                  alert(`${parts.join(' | ')}${accountDetail}${listDetail}${errorDetail}`);
                }
              } else if (res.error) {
                alert(`Sync note: ${res.error}`);
              }
            }}
            disabled={isSyncingTasks}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              pendingGoogleTaskOpsCount > 0 && !isSyncingTasks
                ? 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : settings.googleTasksConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
            }`}
            title={
              pendingGoogleTaskOpsCount > 0 && !settings.googleTasksWebhookUrl && !getStoredAccessToken()
                ? `Google Tasks session expired on this device — click to reconnect and sync ${pendingGoogleTaskOpsCount} pending change(s)`
                : pendingGoogleTaskOpsCount > 0
                ? `${pendingGoogleTaskOpsCount} completed/deleted task(s) waiting to sync to Google Tasks — click to sync now`
                : settings.googleTasksConnected
                ? 'Sync Google Tasks from your phone'
                : 'Connect Google Tasks'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTasks ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-bold">
              {isSyncingTasks
                ? 'Syncing...'
                : pendingGoogleTaskOpsCount > 0
                ? `Sync Tasks (${pendingGoogleTaskOpsCount})`
                : settings.googleTasksConnected
                ? 'Sync Tasks'
                : 'Connect Tasks'}
            </span>
          </button>

          {/* Global Undo Button */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              canUndo
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-xs cursor-pointer active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
            title={canUndo ? `Undo: ${lastUndoMessage || 'last action'} (Ctrl+Z)` : 'Nothing to undo (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          {/* Quick Voice Ingest Pill */}
          <button
            onClick={onOpenVoiceIngest}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition"
            title="Voice Brain Dump"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voice Ingest</span>
          </button>

          {/* Toggle Calendar Drawer */}
          <button
            onClick={() =>
              setCalendarView(panelStates.calendar === 'hidden' ? 'week' : 'hidden')
            }
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium border transition ${
              panelStates.calendar !== 'hidden'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle Schedule & Calendar view"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Calendar</span>
          </button>

          {/* Cockpit 2x2 vs Widget Sidebar Toggle */}
          <button
            onClick={toggleLayoutMode}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title={`Switch to ${layoutMode === 'cockpit' ? 'Desktop Widget Mode' : '2x2 Cockpit Mode'}`}
          >
            {layoutMode === 'cockpit' ? (
              <>
                <Columns className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden lg:inline text-[11px]">Widget Mode</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden lg:inline text-[11px]">Cockpit Grid</span>
              </>
            )}
          </button>

          {/* Fit Screen / Compact All Toggle */}
          <button
            onClick={toggleAllLevels}
            className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title={areAllCompact ? 'Expand all panels' : 'Compact all to fit screen'}
          >
            {areAllCompact ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* LIGHT / DARK MODE TOGGLE (Desktop / Tablet only; placed discreetly on DO screen on mobile) */}
          <button
            onClick={toggleTheme}
            className="hidden sm:flex p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Desktop Install Window */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="hidden xl:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Install as independent persistent desktop window"
            >
              <Download className="w-3.5 h-3.5 text-purple-500" />
              <span>Desktop App</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
