import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flame,
  LayoutGrid,
  Zap,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Folder,
  Layers,
  Settings,
  Edit3,
  X,
  Plus,
  Play,
  ArrowRight,
  TrendingUp,
  Activity,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  FlaskConical,
  Eye,
  Sliders,
} from 'lucide-react';
import { FocusAction, formatTimeBucket } from '../services/focusServing';
import {
  queueEvent,
  readTabFromSheet,
  getStoredCredentials,
  saveCredentials,
} from '../services/focusDataLayer';
import {
  DayModule,
  DayCommitmentLevel,
  WatchPart,
  DAY_MODULE_NAMES,
  COMMITMENT_POINTS,
  calculateWorkValue,
  getPartSizeForFriction,
  calculateFinishGrade,
} from '../services/focusMovement';
import { WatchPartVector } from './WatchPartVector';
import { GearTrainWidget } from './GearTrainWidget';
import { CandidateInspectorModal } from './CandidateInspectorModal';
import { ExperimentsModal } from './ExperimentsModal';
import {
  loadHabitsState,
  saveHabitsState,
  HabitItem,
  getPowerReserve,
} from '../services/focusHabits';
import {
  getExperimentScheduleStatus,
  overrideExperimentMode,
  ServeMode,
} from '../services/focusExperiments';
import { rankCandidates, SessionContext } from '../services/focusAlgorithm';

interface PlanModeProps {
  onOpenDoMode: () => void;
  onOpenTaskView: () => void;
}

type PlanTab = 'today' | 'pool' | 'week' | 'needs_look' | 'habits' | 'settings';

export const PlanModeScreen: React.FC<PlanModeProps> = ({
  onOpenDoMode,
  onOpenTaskView,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTab>('today');
  const [actionsPool, setActionsPool] = useState<FocusAction[]>([]);
  const [completedToday, setCompletedToday] = useState<FocusAction[]>([]);
  const [dayModule, setDayModule] = useState<DayModule>(() => {
    const today = new Date();
    const dayAbbr = today.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const savedLevel = (localStorage.getItem('focus_day_commitment_level') as DayCommitmentLevel) || 'standard';
    return {
      day_name: fullDayName,
      module_name: DAY_MODULE_NAMES[dayAbbr] || 'Watchmaker Bench',
      date: today.toISOString().split('T')[0],
      committed_level: savedLevel,
      committed_work_points: COMMITMENT_POINTS[savedLevel],
      total_work_done: 0,
      parts: [],
      is_closed: false,
      can_lower_commitment: true,
    };
  });

  const [habitsList, setHabitsList] = useState<HabitItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingAction, setEditingAction] = useState<FocusAction | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showExperiments, setShowExperiments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [parseLogs, setParseLogs] = useState<any[]>([]);

  // Desktop Live View Polling (refreshed about once a minute)
  const [desktopLiveTick, setDesktopLiveTick] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setDesktopLiveTick((prev) => prev + 1);
      setLastSyncTime(new Date());
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load actions
      const actions = await readTabFromSheet('Actions');
      if (Array.isArray(actions) && actions.length > 0) {
        setActionsPool(actions);
        const todayStr = new Date().toISOString().split('T')[0];
        const doneToday = actions.filter(
          (a) => a.status === 'done' && a.completed_at && a.completed_at.startsWith(todayStr)
        );
        setCompletedToday(doneToday);

        // Compute parts earned from doneToday
        const parts: WatchPart[] = doneToday.map((a, idx) => {
          const fric = Number(a.friction) || 2;
          const partSize = getPartSizeForFriction(fric);
          const finishGrade = calculateFinishGrade(a.due_date, a.created_at);
          const workVal = calculateWorkValue(fric, a.importance);
          return {
            part_id: 'part_' + idx,
            name: `${finishGrade} ${partSize}`,
            part_size: partSize,
            finish_grade: finishGrade,
            action_id: a.task_id,
            action_title: a.title,
            work_value: workVal,
            earned_at: a.completed_at || new Date().toISOString(),
          };
        });

        const totalWork = parts.reduce((sum, p) => sum + p.work_value, 0);
        setDayModule((prev) => ({
          ...prev,
          total_work_done: totalWork,
          parts,
          is_closed: totalWork >= prev.committed_work_points,
        }));
      }

      // 2. Load habits
      setHabitsList(loadHabitsState());

      // 3. Load ParseLog if available
      const logs = await readTabFromSheet('ParseLog');
      if (Array.isArray(logs)) {
        setParseLogs(logs);
      }
    } catch (err) {
      console.warn('Error loading Plan data', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Action Correction
  const handleSaveActionCorrection = async (updated: FocusAction) => {
    if (!editingAction) return;

    // Detect fields modified and log append-only correction events
    const fieldsToCompare: (keyof FocusAction)[] = [
      'friction',
      'importance',
      'due_date',
      'deadline_kind',
      'context',
      'first_action',
      'category',
    ];

    for (const field of fieldsToCompare) {
      if (editingAction[field] !== updated[field]) {
        await queueEvent('correction', {
          task_id: updated.task_id,
          field,
          old_value: editingAction[field] ?? '',
          new_value: updated[field] ?? '',
          action_title: updated.title,
        });
      }
    }

    // Update locally in actionsPool immediately so serving decision updates
    setActionsPool((prev) =>
      prev.map((a) => (a.task_id === updated.task_id ? { ...a, ...updated } : a))
    );

    setEditingAction(null);
  };

  // Group actions by project
  const projectGroups = React.useMemo(() => {
    const groups: Record<string, FocusAction[]> = {};
    const unassigned: FocusAction[] = [];

    const filtered = actionsPool.filter((a) => {
      if (a.status === 'done') return false;
      const matchesSearch =
        !searchQuery.trim() ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.context && a.context.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = categoryFilter === 'all' || a.category === categoryFilter;
      return matchesSearch && matchesCat;
    });

    for (const act of filtered) {
      const proj = act.project_title || (act.category === 'project' ? 'Active Projects' : null);
      if (proj) {
        if (!groups[proj]) groups[proj] = [];
        groups[proj].push(act);
      } else {
        unassigned.push(act);
      }
    }

    return { groups, unassigned };
  }, [actionsPool, searchQuery, categoryFilter]);

  // Needs-a-Look queue items
  const needsLookItems = React.useMemo(() => {
    return actionsPool.filter((a) => {
      const isLowConfidence = a.friction_confidence === 'low';
      const needsShrink = a.needs_shrinking === true;
      const needsSetup = a.category === 'habit' && a.status === 'needs_setup';
      return isLowConfidence || needsShrink || needsSetup;
    });
  }, [actionsPool]);

  // Deadlines in next 7 days
  const upcomingDeadlines = React.useMemo(() => {
    const now = new Date();
    return actionsPool
      .filter((a) => a.status !== 'done' && a.due_date)
      .filter((a) => {
        const due = new Date(a.due_date!);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= -1 && diffDays <= 7;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [actionsPool]);

  const schedule = getExperimentScheduleStatus();

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">PLAN MODE</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase">
                  Calm Review
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick links */}
          <button
            onClick={() => setShowExperiments(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-purple-300 transition"
            title="Open 4-Week Serving Experiment"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Experiment</span>
          </button>

          <button
            onClick={() => setShowInspector(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
            title="Open Serving Candidate Inspector"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Inspector</span>
          </button>

          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Task View</span>
          </button>

          {/* DO Button in Header (Always 1 tap away) */}
          <button
            onClick={onOpenDoMode}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md shadow-purple-900/30 active:scale-95 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>DO</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-56 flex-col justify-between border-r border-slate-800/80 bg-slate-950/50 p-4 shrink-0">
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('today')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'today'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4" />
                <span>Today</span>
              </div>
              <span className="text-[10px] opacity-75">{dayModule.total_work_done} pts</span>
            </button>

            <button
              onClick={() => setActiveTab('pool')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'pool'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4" />
                <span>Pool</span>
              </div>
              <span className="text-[10px] opacity-75">{actionsPool.filter((a) => a.status !== 'done').length}</span>
            </button>

            <button
              onClick={() => setActiveTab('needs_look')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'needs_look'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Needs a Look</span>
              </div>
              {needsLookItems.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {needsLookItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('week')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'week'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                <span>Week & Gears</span>
              </div>
              <span className="text-[10px] opacity-75">{getPowerReserve()} res</span>
            </button>

            <button
              onClick={() => setActiveTab('habits')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'habits'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4" />
                <span>Habits Editor</span>
              </div>
              <span className="text-[10px] opacity-75">{habitsList.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>
          </nav>

          {/* Desktop Live Status Reminder */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Live Status</span>
              <span className="text-[10px] text-slate-500">
                {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-[11px] text-purple-300 leading-snug">
              Do mode runs on your phone.
            </div>
            <div className="text-[10px] text-slate-400">
              Completions sync automatically within a minute.
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {/* TAB 1: TODAY */}
          {activeTab === 'today' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Daily Module Banner */}
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      {dayModule.day_name} Module
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700/60 text-[10px] text-purple-300 font-bold capitalize">
                      {dayModule.committed_level} Goal ({dayModule.committed_work_points} pts)
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{dayModule.module_name}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Progress: <strong className="text-white">{dayModule.total_work_done}</strong> of{' '}
                    <strong>{dayModule.committed_work_points}</strong> work points earned today
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-4 py-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="text-xs text-slate-400">Parts Earned</div>
                    <div className="text-xl font-black text-white">{dayModule.parts.length}</div>
                  </div>
                  <div className="text-center px-4 py-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="text-xs text-slate-400">Status</div>
                    <div
                      className={`text-xs font-bold uppercase mt-1 ${
                        dayModule.is_closed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {dayModule.is_closed ? 'Closed ✓' : 'In Progress'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement Parts Revealed Today */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Watchmaker Parts Earned Today</span>
                  <span className="text-[10px] text-purple-400 font-semibold">Visual Reward Snapshot</span>
                </h3>

                {dayModule.parts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No parts assembled yet today. Tap <strong>DO</strong> to kickstart your first action!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {dayModule.parts.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2"
                      >
                        <WatchPartVector partSize={p.part_size} finishGrade={p.finish_grade} isFilled={true} />
                        <div>
                          <div className="text-[11px] font-bold text-white capitalize">{p.name}</div>
                          <div className="text-[10px] text-purple-400 font-medium">+{p.work_value} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Done Today */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Completed Actions Today ({completedToday.length})
                </h3>

                {completedToday.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No completed actions logged today.</div>
                ) : (
                  <div className="space-y-2">
                    {completedToday.map((act) => (
                      <div
                        key={act.task_id}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-white">{act.title}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Friction {act.friction}/5</span>
                              <span>•</span>
                              <span>{act.actual_minutes || 5} mins</span>
                              {act.category && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{act.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-purple-300">
                          +{calculateWorkValue(Number(act.friction) || 2, act.importance)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Tripwire Deadlines */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upcoming Real Deadlines (Next 7 Work Days)</span>
                </h3>

                {upcomingDeadlines.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No immediate external tripwires.</div>
                ) : (
                  <div className="space-y-2">
                    {upcomingDeadlines.map((act) => (
                      <div
                        key={act.task_id}
                        onClick={() => setEditingAction(act)}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between cursor-pointer hover:border-purple-500/40 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{act.title}</span>
                            {act.deadline_kind === 'external' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[9px] font-bold uppercase">
                                External
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Due: {act.due_date} · Friction {act.friction}/5
                          </div>
                        </div>
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POOL */}
          {activeTab === 'pool' && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search actions by title or context..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['all', 'quick', 'project', 'scheduled', 'habit'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Projects & Action Groups */}
              <div className="space-y-6">
                {Object.entries(projectGroups.groups).map(([projectTitle, actions]) => (
                  <div key={projectTitle} className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-extrabold text-white">{projectTitle}</h3>
                        <span className="text-[10px] text-slate-500 font-medium">({actions.length} actions)</span>
                      </div>
                      <span className="text-[10px] text-purple-300 font-semibold">
                        Next: {actions[0]?.title ? actions[0].title.slice(0, 30) + '...' : 'None'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {actions.map((act) => (
                        <div
                          key={act.task_id}
                          onClick={() => setEditingAction(act)}
                          className="p-3 bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition group"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white group-hover:text-purple-200 transition">
                              {act.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300 font-bold">
                                F{act.friction}
                              </span>
                              <span>{formatTimeBucket(act.time_bucket)}</span>
                              {act.importance && (
                                <span className="capitalize">{act.importance} imp</span>
                              )}
                              {act.first_action && (
                                <span className="text-slate-500 truncate max-w-[200px]">
                                  Step: {act.first_action}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Individual / Non-Project Actions */}
                {projectGroups.unassigned.length > 0 && (
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Stand-Alone & Quick Actions ({projectGroups.unassigned.length})</span>
                    </h3>

                    <div className="space-y-2">
                      {projectGroups.unassigned.map((act) => (
                        <div
                          key={act.task_id}
                          onClick={() => setEditingAction(act)}
                          className="p-3 bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition group"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white group-hover:text-purple-200 transition">
                              {act.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300 font-bold">
                                F{act.friction}
                              </span>
                              <span className="capitalize">{act.category || 'quick'}</span>
                              <span>{formatTimeBucket(act.time_bucket)}</span>
                              {act.due_date && <span className="text-amber-400">Due {act.due_date}</span>}
                            </div>
                          </div>
                          <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NEEDS A LOOK */}
          {activeTab === 'needs_look' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
                <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm mb-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Needs a Look Queue</span>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Items requiring attention: low-confidence imports, tasks flagged as needing shrinking,
                  habits waiting for initial setup, or broken Google Task notes.
                </p>
              </div>

              {needsLookItems.length === 0 && parseLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Everything looks clean! No items currently flagged in the Needs a Look queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {needsLookItems.map((act) => (
                    <div
                      key={act.task_id}
                      onClick={() => setEditingAction(act)}
                      className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{act.title}</span>
                          {act.friction_confidence === 'low' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[9px] font-bold">
                              Low Confidence
                            </span>
                          )}
                          {act.needs_shrinking && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[9px] font-bold">
                              Needs Shrinking
                            </span>
                          )}
                          {act.status === 'needs_setup' && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[9px] font-bold">
                              Needs Setup
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Friction: {act.friction} · {act.friction_reason || 'Needs human check'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                        <span>Fix</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}

                  {/* ParseLog broken blocks */}
                  {parseLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-900 border border-rose-900/40 rounded-2xl flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-rose-300">ParseLog: {log.task_title || 'Broken Task Note'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{log.error_reason || 'Unreadable FOCUS block'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WEEK & GEAR TRAIN */}
          {activeTab === 'week' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Gear Train and Power Reserve Meter */}
              <GearTrainWidget habits={habitsList} />

              {/* 5 Modules Overview */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Weekly Movement Modules (Counting Days)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[
                    { day: 'Sun', name: 'Barrel & Mainspring', icon: 'barrel' },
                    { day: 'Mon', name: 'Going Train', icon: 'wheel' },
                    { day: 'Tue', name: 'Escapement & Pallet', icon: 'bridge' },
                    { day: 'Wed', name: 'Balance & Hairspring', icon: 'jewel' },
                    { day: 'Thu', name: 'Keyless Works', icon: 'screw' },
                  ].map((m) => {
                    const isToday = dayModule.day_name.startsWith(m.name.split(' ')[0]) || dayModule.day_name.slice(0, 3) === m.day;
                    return (
                      <div
                        key={m.day}
                        className={`p-4 rounded-2xl border text-center space-y-2 transition ${
                          isToday
                            ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/30'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                          <span>{m.day}</span>
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="text-[11px] text-slate-300 font-semibold leading-tight">{m.name}</div>
                        <div className="text-[10px] text-purple-400 font-medium">10 Part Slots + 5 Jewels</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HABITS EDITOR */}
          {activeTab === 'habits' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">7 Daily Habits & Circuits</h3>
                    <p className="text-xs text-slate-400">Track and tune quotas and circuit completions</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                    2 Circuits / Day
                  </span>
                </div>

                <div className="space-y-3">
                  {habitsList.map((h) => (
                    <div
                      key={h.habit_id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{h.name}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                            Half {h.half}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">({h.circuit} circuit)</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Daily Quota: <strong className="text-white">{h.quota} {h.unit}</strong> · Completed today: {h.currentReps} {h.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newReps = h.isComplete ? 0 : h.quota;
                            const updated = habitsList.map((it) =>
                              it.habit_id === h.habit_id
                                ? { ...it, currentReps: newReps, isComplete: !h.isComplete }
                                : it
                            );
                            saveHabitsState(updated);
                            setHabitsList(updated);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            h.isComplete
                              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {h.isComplete ? 'Complete ✓' : 'Mark Done'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-5">
                <h3 className="text-sm font-extrabold text-white">Focus App Tunable Settings</h3>

                {/* Serving Mode & Experiment Schedule */}
                <div className="space-y-2 pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Serving Mode</span>
                    <span className="text-[10px] text-purple-300 font-semibold">
                      Week {schedule.weekNumber} of 4 ({schedule.scheduledMode})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => overrideExperimentMode('assigned', schedule.effectiveMode)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        schedule.effectiveMode === 'assigned'
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Assigned (1-Card)
                    </button>
                    <button
                      onClick={() => overrideExperimentMode('paired', schedule.effectiveMode)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        schedule.effectiveMode === 'paired'
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Paired (2-Cards)
                    </button>
                  </div>
                </div>

                {/* Off Days Manager */}
                <div className="space-y-2 pb-4 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Off Days Schedule</span>
                  <p className="text-[11px] text-slate-400">
                    Recurring Off Days: <strong>Friday & Saturday</strong> (Work done still logs, but no commitment is required, no streaks penalize, and power reserve never drains).
                  </p>
                </div>

                {/* Quick Action Panels */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowExperiments(true)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span>Serving Experiment Modal</span>
                  </button>

                  <button
                    onClick={() => setShowInspector(true)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Candidate Inspector</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Phone Bottom Navigation Tabs + Persistent DO Button */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-3 flex items-center justify-around z-30 select-none">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'today' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span className="text-[10px]">Today</span>
        </button>

        <button
          onClick={() => setActiveTab('pool')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'pool' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span className="text-[10px]">Pool</span>
        </button>

        {/* Persistent Floating DO Button on Mobile (Instant return in 1 tap) */}
        <button
          onClick={onOpenDoMode}
          className="relative -top-3 w-13 h-13 rounded-full bg-gradient-to-br from-purple-500 to-indigo-700 active:scale-95 text-white font-black text-sm tracking-wider shadow-lg shadow-purple-900/60 border-2 border-purple-300/40 flex items-center justify-center transition"
          title="Return to DO Mode immediately"
        >
          <span>DO</span>
        </button>

        <button
          onClick={() => setActiveTab('week')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'week' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px]">Week</span>
        </button>

        <button
          onClick={() => setActiveTab('needs_look')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'needs_look' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <AlertTriangle className="w-4 h-4" />
            {needsLookItems.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-amber-500 text-white">
                {needsLookItems.length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Review</span>
        </button>
      </nav>

      {/* Action Correction Drawer / Modal */}
      {editingAction && (
        <ActionCorrectionModal
          action={editingAction}
          onSave={handleSaveActionCorrection}
          onClose={() => setEditingAction(null)}
        />
      )}

      {/* Candidate Inspector Modal */}
      {showInspector && (
        <CandidateInspectorModal
          candidates={rankCandidates(actionsPool, {
            completedActions: completedToday,
            totalActiveMinutes: 0,
            tapShift: 0,
            consecutiveSmallerTaps: 0,
            fewerRepsTapped: false,
            reservedSlotUsedToday: false,
            stretchProbeUsedToday: false,
            skippedTaskIds: new Set(),
            now: new Date(),
          }).ranked}
          onClose={() => setShowInspector(false)}
        />
      )}

      {/* Serving Experiments Modal */}
      {showExperiments && (
        <ExperimentsModal
          isOpen={showExperiments}
          onClose={() => setShowExperiments(false)}
        />
      )}
    </div>
  );
};

interface ActionCorrectionModalProps {
  action: FocusAction;
  onSave: (updated: FocusAction) => void;
  onClose: () => void;
}

const ActionCorrectionModal: React.FC<ActionCorrectionModalProps> = ({
  action,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<FocusAction>({ ...action });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-purple-400" />
            <h3 className="font-extrabold text-white text-sm">Correct Action Attributes</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Friction (1 to 5)</label>
              <select
                value={formData.friction}
                onChange={(e) => setFormData({ ...formData, friction: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>
                    Friction {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Importance</label>
              <select
                value={formData.importance || 'low'}
                onChange={(e) =>
                  setFormData({ ...formData, importance: e.target.value as 'low' | 'med' | 'high' })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High (+1 pt bonus)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
              </input>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Deadline Kind</label>
              <select
                value={formData.deadline_kind || 'none'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deadline_kind: e.target.value as 'external' | 'self' | 'none',
                  })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="none">None</option>
                <option value="self">Self-imposed</option>
                <option value="external">External Hard Deadline</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">First Physical Micro-Action</label>
            <input
              type="text"
              value={formData.first_action || ''}
              onChange={(e) => setFormData({ ...formData, first_action: e.target.value })}
              placeholder="e.g. Open Google Docs and type the header"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Context Tag</label>
            <input
              type="text"
              value={formData.context || ''}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              placeholder="e.g. @computer, @calls, @errands"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-[11px] text-purple-300">
            Saving logs an append-only <code className="text-white">correction</code> event and immediately updates the serving algorithm without altering history.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Save Correction
          </button>
        </div>
      </div>
    </div>
  );
};
