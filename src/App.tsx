import React, { useState } from 'react';
import { MomentumProvider, useMomentum } from './context/MomentumContext';
import { Header } from './components/Header';
import { QuickJobsPanel } from './components/panels/QuickJobsPanel';
import { BiggerJobsPanel } from './components/panels/BiggerJobsPanel';
import { ProjectsPanel } from './components/panels/ProjectsPanel';
import { HabitsModal } from './components/HabitsModal';
import { CalendarPanel } from './components/CalendarPanel';
import { SettingsModal } from './components/SettingsModal';
import { VoiceIngestionModal } from './components/VoiceIngestionModal';
import { Phase1TestScreen } from './components/Phase1TestScreen';
import { DoMainScreen } from './components/DoMainScreen';
import { PlanModeScreen } from './components/PlanModeScreen';
import { Zap, Activity, Layers, Compass, Mic, Undo2, X } from 'lucide-react';

function CockpitDashboard({ onOpenDoMode, onOpenPlanMode }: { onOpenDoMode?: () => void; onOpenPlanMode?: () => void }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isHabitsOpen, setIsHabitsOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [mobileTab, setMobileTab] = useState<'quick' | 'bigger' | 'projects'>('quick');
  const { panelStates, boardData, layoutMode, undo, lastUndoMessage, dismissUndoMessage } = useMomentum();

  const showCalendar = panelStates.calendar !== 'hidden';

  React.useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('momentumUpdateAvailable', handleUpdate);
    return () => window.removeEventListener('momentumUpdateAvailable', handleUpdate);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space or Alt + M triggers Voice Ingest modal
      if ((e.ctrlKey && e.code === 'Space') || (e.altKey && (e.key === 'm' || e.key === 'M'))) {
        e.preventDefault();
        setIsVoiceOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsVoiceOpen(false);
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeQuickCount = boardData.quick_jobs.filter((j) => !j.done).length;
  const activeRespCount = boardData.responsibilities.filter((r) => r.status === 'active').length;
  const activeProjCount = boardData.projects.length;
  const completedHabitsToday = boardData.habits.filter((h) => {
    const today = new Date().toISOString().split('T')[0];
    const val = h.log[today];
    return h.type === 'boolean' ? !!val : typeof val === 'number' && val > 0;
  }).length;

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-purple-600 selection:text-white transition-colors">
      {/* Update notification banner if a new version is installed in background */}
      {updateAvailable && (
        <div className="bg-purple-600 text-white px-3 py-1.5 text-xs flex items-center justify-between z-50 shrink-0 shadow-md">
          <span className="font-medium">⚡ Momentum updated! Tap to reload latest version.</span>
          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then((reg) => {
                  if (reg?.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    window.location.reload();
                  }
                });
              } else {
                window.location.reload();
              }
            }}
            className="ml-2 px-2.5 py-0.5 bg-white text-purple-700 font-bold rounded shadow-xs hover:bg-purple-50 active:scale-95 transition"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Header (Top Bar with Theme, Voice Ingest, Calendar Toggle, Desktop App) */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVoiceIngest={() => setIsVoiceOpen(true)}
        onOpenDoMode={onOpenDoMode}
        onOpenPlanMode={onOpenPlanMode}
        onOpenHabits={() => setIsHabitsOpen(true)}
      />

      {/* Main Cockpit: Zero window scrolling, strictly locked to viewport */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-2.5 flex flex-col gap-2 overflow-hidden">
        {/* OPTIONAL CALENDAR DRAWER (Toggled by Calendar button, defaults to hidden) */}
        {showCalendar && (
          <div className="shrink-0 max-h-[38vh] overflow-y-auto animate-fadeIn">
            <CalendarPanel />
          </div>
        )}

        {/* COCKPIT 3-COLUMN EQUAL GRID (Tasks, Jobs, Projects) */}
        {layoutMode === 'cockpit' ? (
          <div className="hidden md:grid md:grid-cols-3 gap-2.5 flex-1 min-h-0 overflow-hidden">
            {/* Left: Tasks (Quick Jobs) */}
            <div className="h-full min-h-0 overflow-hidden">
              <QuickJobsPanel />
            </div>

            {/* Middle: Jobs & Responsibilities */}
            <div className="h-full min-h-0 overflow-hidden">
              <BiggerJobsPanel />
            </div>

            {/* Right: Ongoing Creative Projects */}
            <div className="h-full min-h-0 overflow-hidden">
              <ProjectsPanel />
            </div>
          </div>
        ) : (
          /* WIDGET SIDEBAR MODE: 1-Column vertical stack */
          <div className="hidden md:flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="min-h-[170px] shrink-0">
              <QuickJobsPanel />
            </div>
            <div className="min-h-[170px] shrink-0">
              <BiggerJobsPanel />
            </div>
            <div className="min-h-[170px] shrink-0">
              <ProjectsPanel />
            </div>
          </div>
        )}

        {/* MOBILE VIEW (Tabbed Switcher with thumb bar) */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto pb-16">
          {mobileTab === 'quick' && <QuickJobsPanel />}
          {mobileTab === 'bigger' && <BiggerJobsPanel />}
          {mobileTab === 'projects' && <ProjectsPanel />}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg shrink-0">
        <button
          onClick={() => setMobileTab('quick')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'quick'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Zap className="w-4 h-4" />
            {activeQuickCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-emerald-600 text-white">
                {activeQuickCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Tasks</span>
        </button>

        {/* Center Voice Mic */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          className="-mt-5 p-3 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-500 active:scale-95 transition"
          title="Voice Ingest"
        >
          <Mic className="w-5 h-5" />
        </button>

        <button
          onClick={() => setMobileTab('bigger')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'bigger'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Layers className="w-4 h-4" />
            {activeRespCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-purple-600 text-white">
                {activeRespCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Jobs</span>
        </button>

        <button
          onClick={() => setMobileTab('projects')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'projects'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Compass className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-blue-600 text-white">
              {activeProjCount}
            </span>
          </div>
          <span className="text-[10px]">Projects</span>
        </button>
      </nav>

      {/* Floating Undo Toast Notification */}
      {lastUndoMessage && (
        <div className="fixed bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-slate-700/60 dark:border-slate-300 animate-slideUp text-xs font-semibold max-w-[92vw]">
          <span className="truncate max-w-[200px] sm:max-w-md">{lastUndoMessage}</span>
          <button
            type="button"
            onClick={undo}
            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={dismissUndoMessage}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 transition shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
      {isVoiceOpen && (
        <VoiceIngestionModal
          onClose={() => setIsVoiceOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {isHabitsOpen && (
        <HabitsModal
          isOpen={isHabitsOpen}
          onClose={() => setIsHabitsOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  // Default is 'do' mode! Plan mode and Task view are available via toggle.
  const initialMode = (urlParams.get('mode') as 'do' | 'plan' | 'tasks') ||
    (localStorage.getItem('focus_current_view') as 'do' | 'plan' | 'tasks') ||
    'do';
  const [currentView, setCurrentView] = useState<'do' | 'plan' | 'tasks'>(initialMode);

  const setView = (view: 'do' | 'plan' | 'tasks') => {
    setCurrentView(view);
    localStorage.setItem('focus_current_view', view);
  };

  return (
    <MomentumProvider>
      {currentView === 'do' && (
        <DoMainScreen
          onOpenTaskView={() => setView('tasks')}
          onOpenPlanMode={() => setView('plan')}
        />
      )}
      {currentView === 'plan' && (
        <PlanModeScreen
          onOpenDoMode={() => setView('do')}
          onOpenTaskView={() => setView('tasks')}
        />
      )}
      {currentView === 'tasks' && (
        <CockpitDashboard
          onOpenDoMode={() => setView('do')}
          onOpenPlanMode={() => setView('plan')}
        />
      )}
    </MomentumProvider>
  );
}
