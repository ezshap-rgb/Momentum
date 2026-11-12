import React, { useState } from 'react';
import { MomentumProvider, useMomentum } from './context/MomentumContext';
import { Header } from './components/Header';
import { QuickJobsPanel } from './components/panels/QuickJobsPanel';
import { HabitsPanel } from './components/panels/HabitsPanel';
import { BiggerJobsPanel } from './components/panels/BiggerJobsPanel';
import { ProjectsPanel } from './components/panels/ProjectsPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { SettingsModal } from './components/SettingsModal';
import { VoiceIngestionModal } from './components/VoiceIngestionModal';
import { Zap, Activity, Layers, Compass, Mic } from 'lucide-react';

function CockpitDashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [mobileTab, setMobileTab] = useState<'quick' | 'habits' | 'bigger' | 'projects'>('quick');
  const { panelStates, boardData, layoutMode } = useMomentum();

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
      />

      {/* Main Cockpit: Zero window scrolling, strictly locked to viewport */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-2.5 flex flex-col gap-2 overflow-hidden">
        {/* OPTIONAL CALENDAR DRAWER (Toggled by Calendar button, defaults to hidden) */}
        {showCalendar && (
          <div className="shrink-0 max-h-[38vh] overflow-y-auto animate-fadeIn">
            <CalendarPanel />
          </div>
        )}

        {/* COCKPIT 2x2 EQUAL GRID */}
        {layoutMode === 'cockpit' ? (
          <div className="hidden md:grid md:grid-cols-2 md:grid-rows-2 gap-2.5 flex-1 min-h-0 overflow-hidden">
            {/* Top Left: Quick Jobs */}
            <div className="h-full min-h-0 overflow-hidden">
              <QuickJobsPanel />
            </div>

            {/* Top Right: Habits & Daily Rhythms */}
            <div className="h-full min-h-0 overflow-hidden">
              <HabitsPanel />
            </div>

            {/* Bottom Left: Bigger Jobs & Responsibilities */}
            <div className="h-full min-h-0 overflow-hidden">
              <BiggerJobsPanel />
            </div>

            {/* Bottom Right: Ongoing Creative Projects */}
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
              <HabitsPanel />
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
          {mobileTab === 'habits' && <HabitsPanel />}
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

        <button
          onClick={() => setMobileTab('habits')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'habits'
              ? 'text-pink-600 dark:text-pink-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Activity className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-pink-600 text-white">
              {completedHabitsToday}
            </span>
          </div>
          <span className="text-[10px]">Habits</span>
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
    </div>
  );
}

export default function App() {
  return (
    <MomentumProvider>
      <CockpitDashboard />
    </MomentumProvider>
  );
}
