import React, { useState, useEffect, useRef } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { SettingsModal } from './SettingsModal';
import { CandidateInspectorModal } from './CandidateInspectorModal';
import { DayMovementBenchModal } from './DayMovementBenchModal';
import { DayCommitmentPromptModal } from './DayCommitmentPromptModal';
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
import { isCountingDay } from '../services/focusAlgorithm';
import {
  queueEvent,
  readTabFromSheet,
  triggerBackgroundSync,
  getStoredCredentials,
  saveCredentials,
} from '../services/focusDataLayer';
import {
  FocusAction,
  IgnitionExercise,
  pickNextExercise,
} from '../services/focusServing';
import {
  rankCandidates,
  computeTargetFriction,
  CandidateScore,
  SessionContext,
} from '../services/focusAlgorithm';
import { SyncIndicator } from './SyncIndicator';
import {
  Zap,
  LayoutGrid,
  Settings,
  Flame,
  CheckCircle2,
  RefreshCw,
  Minus,
  Plus,
  Clock,
  MessageSquare,
  HelpCircle,
  X,
  Play,
  RotateCcw,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  onOpenTaskView: () => void;
}

type DoStage = 'do_button' | 'ignition' | 'offer' | 'action_running';

export function DoMainScreen({ onOpenTaskView }: Props) {
  const { settings, toggleTheme } = useMomentum();

  // Navigation / Modal States
  const [stage, setStage] = useState<DoStage>('do_button');
  const [showConfig, setShowConfig] = useState(false);
  const [showMomentumSettings, setShowMomentumSettings] = useState(false);
  const [showParkingLot, setShowParkingLot] = useState(false);
  const [parkingLotText, setParkingLotText] = useState('');
  const [showWhyThisOne, setShowWhyThisOne] = useState(false);

  // Doorway Config
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [savedCreds, setSavedCreds] = useState(false);

  // Pool of actions & serving state
  const [actionsPool, setActionsPool] = useState<FocusAction[]>([]);
  const [completedActions, setCompletedActions] = useState<FocusAction[]>([]);
  const [totalActiveMinutes, setTotalActiveMinutes] = useState(0);
  const [tapShift, setTapShift] = useState(0);
  const [fewerRepsTapped, setFewerRepsTapped] = useState(false);
  const [reservedSlotUsed, setReservedSlotUsed] = useState(false);
  const [stretchProbeUsed, setStretchProbeUsed] = useState(false);
  const [skippedTaskIds, setSkippedTaskIds] = useState<Set<string>>(new Set());
  const [lastCompletedType, setLastCompletedType] = useState<string | undefined>();
  const [consecutiveNotNows, setConsecutiveNotNows] = useState(0);

  // Inspector & Explanation
  const [rankedCandidates, setRankedCandidates] = useState<CandidateScore[]>([]);
  const [currentScoreData, setCurrentScoreData] = useState<CandidateScore | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  // Current ignition exercise
  const [currentExercise, setCurrentExercise] = useState<IgnitionExercise>(() => pickNextExercise());

  // Watch Movement & Rewards (Phase 6)
  const [showBenchModal, setShowBenchModal] = useState(false);
  const [showCommitPrompt, setShowCommitPrompt] = useState(false);
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

  // Action Flow Mode (assigned: 1 card, paired: 2 cards)
  const [servingMode, setServingMode] = useState<'assigned' | 'paired'>(() => {
    return (localStorage.getItem('focus_serving_mode') as 'assigned' | 'paired') || 'assigned';
  });
  const [pairedCandidates, setPairedCandidates] = useState<[CandidateScore, CandidateScore] | null>(null);

  // Current served action
  const [currentAction, setCurrentAction] = useState<FocusAction | null>(null);
  const [isMicroFirstStepOnly, setIsMicroFirstStepOnly] = useState(false);

  // Action execution timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load credentials & fetch actions on mount
  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    refreshActionsPool();
  }, []);

  const refreshActionsPool = async () => {
    try {
      const rows = await readTabFromSheet('Actions');
      if (Array.isArray(rows) && rows.length > 0) {
        setActionsPool(rows as FocusAction[]);
      }
    } catch (err) {
      console.warn('Could not refresh actions pool:', err);
    }
  };

  // Timer tick
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Handlers
  const handleSaveCreds = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveCredentials(url, key);
    setSavedCreds(true);
    setTimeout(() => setSavedCreds(false), 2000);
    refreshActionsPool();
  };

  // 1. DO Tap -> Check Day Commitment on Counting Day, then Ignition Screen
  const handleDoPress = async () => {
    // If today is a counting day (Sun-Thu) and commitment not set today, prompt once
    const todayStr = new Date().toISOString().split('T')[0];
    const hasCommittedToday = localStorage.getItem('focus_committed_date') === todayStr;

    if (isCountingDay() && !hasCommittedToday) {
      setShowCommitPrompt(true);
      return;
    }

    proceedToIgnition();
  };

  const proceedToIgnition = async () => {
    const nextEx = pickNextExercise(currentExercise.name);
    setCurrentExercise(nextEx);
    setStage('ignition');
    await queueEvent('ignition_offered', {
      exercise: nextEx.name,
      targetReps: nextEx.reps,
    });
  };

  const handleCommitChoice = async (level: DayCommitmentLevel) => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('focus_committed_date', todayStr);
    localStorage.setItem('focus_day_commitment_level', level);

    setDayModule((prev) => ({
      ...prev,
      committed_level: level,
      committed_work_points: COMMITMENT_POINTS[level],
    }));

    await queueEvent('day_committed', {
      level,
      points: COMMITMENT_POINTS[level],
      date: todayStr,
    });

    setShowCommitPrompt(false);
    proceedToIgnition();
  };

  // 2. Ignition Controls
  const handleFewerReps = async () => {
    const reduced = Math.max(3, Math.round(currentExercise.reps * 0.6));
    setCurrentExercise((prev) => ({ ...prev, reps: reduced }));
    setFewerRepsTapped(true);
    await queueEvent('ignition_smaller', {
      exercise: currentExercise.name,
      newReps: reduced,
    });
  };

  const handleSwapExercise = async () => {
    const swapped = pickNextExercise(currentExercise.name);
    setCurrentExercise(swapped);
    await queueEvent('ignition_swapped', {
      from: currentExercise.name,
      to: swapped.name,
    });
  };

  // 3. ZERO-TAP BRIDGE: Finish Ignition -> Immediately show Offer
  const handleIgnitionDone = async () => {
    await queueEvent('ignition_done', {
      exercise: currentExercise.name,
      reps: currentExercise.reps,
    });

    serveNextOffer(consecutiveNotNows);
  };

  const serveNextOffer = (notNowCount: number) => {
    const ctx: SessionContext = {
      completedActions,
      totalActiveMinutes,
      tapShift,
      consecutiveSmallerTaps: 0,
      fewerRepsTapped,
      reservedSlotUsedToday: reservedSlotUsed,
      stretchProbeUsedToday: stretchProbeUsed,
      skippedTaskIds,
      lastCompletedType,
      now: new Date(),
    };

    const { selected, ranked, paired } = rankCandidates(actionsPool, ctx);
    setRankedCandidates(ranked);
    setPairedCandidates(paired);

    if (servingMode === 'paired' && paired) {
      setCurrentAction(paired[0].action);
      setCurrentScoreData(paired[0]);
    } else if (selected) {
      setCurrentAction(selected.action);
      setCurrentScoreData(selected);
      if (selected.isReservedSlot) setReservedSlotUsed(true);
    } else {
      // Fallback action if pool is empty
      const fallback: FocusAction = {
        task_id: 'default_action',
        title: 'Choose one quick thing right in front of you',
        friction: 2,
        time_bucket: 'under 5',
        first_action: 'Stand up and take the first physical step',
        status: 'waiting',
      };
      setCurrentAction(fallback);
      setCurrentScoreData(null);
    }

    // Two not-nows in a row -> offer becomes only the tiny first physical action!
    setIsMicroFirstStepOnly(notNowCount >= 2);
    setStage('offer');

    queueEvent('offer_served', {
      task_id: selected?.action.task_id || 'default_action',
      mode: servingMode,
      target_friction: selected?.targetFriction || 2,
      micro_only: notNowCount >= 2,
      is_tripwire: selected?.isTripwire || false,
      is_reserved: selected?.isReservedSlot || false,
    });
  };

  // 4. Offer Screen Controls
  const handleSmallerPart = async () => {
    setTapShift((prev) => prev - 1);
    await queueEvent('smaller_part', {
      task_id: currentAction?.task_id,
    });
    serveNextOffer(consecutiveNotNows);
  };

  const handleBiggerPart = async () => {
    setTapShift((prev) => prev + 1);
    await queueEvent('bigger_part', {
      task_id: currentAction?.task_id,
    });
    serveNextOffer(consecutiveNotNows);
  };

  const handleNotNow = async () => {
    const newNotNows = consecutiveNotNows + 1;
    const skipped = new Set(skippedTaskIds);
    if (currentAction) skipped.add(currentAction.task_id);

    setConsecutiveNotNows(newNotNows);
    setSkippedTaskIds(skipped);

    await queueEvent('not_now', {
      task_id: currentAction?.task_id,
      consecutive: newNotNows,
    });

    serveNextOffer(newNotNows);
  };

  const handleStartAction = async () => {
    setStage('action_running');
    setTimerSeconds(0);
    setIsTimerRunning(true);
    await queueEvent('action_started', {
      task_id: currentAction?.task_id,
    });
  };

  // 5. Action Execution Controls
  const handleCompleteAction = async () => {
    setIsTimerRunning(false);
    const minutes = Math.max(1, Math.round(timerSeconds / 60));

    await queueEvent('action_completed', {
      task_id: currentAction?.task_id,
      actual_minutes: minutes,
    });

    if (currentAction) {
      const friction = Number(currentAction.friction) || 2;
      const workVal = calculateWorkValue(friction, currentAction.importance);
      const partSize = getPartSizeForFriction(friction);
      const finishGrade = calculateFinishGrade(currentAction.due_date, currentAction.created_at);

      const newPart: WatchPart = {
        part_id: 'part_' + Date.now(),
        name: `${finishGrade} ${partSize}`,
        part_size: partSize,
        finish_grade: finishGrade,
        action_id: currentAction.task_id,
        action_title: currentAction.title,
        work_value: workVal,
        earned_at: new Date().toISOString(),
      };

      // Vibrate if supported
      if ('vibrate' in navigator) {
        try { navigator.vibrate(60); } catch (_) {}
      }

      await queueEvent('part_earned', {
        part: newPart,
        work_value: workVal,
      });

      setDayModule((prev) => {
        const newWork = prev.total_work_done + workVal;
        const willClose = newWork >= prev.committed_work_points && !prev.is_closed;
        if (willClose) {
          queueEvent('module_closed', {
            module_name: prev.module_name,
            day: prev.day_name,
            committed_level: prev.committed_level,
          });
        }
        return {
          ...prev,
          total_work_done: newWork,
          parts: [...prev.parts, newPart],
          is_closed: prev.is_closed || willClose,
        };
      });

      setActionsPool((prev) =>
        prev.map((a) =>
          a.task_id === currentAction.task_id ? { ...a, status: 'done', completed_at: new Date().toISOString() } : a
        )
      );
      setCompletedActions((prev) => [...prev, currentAction]);
      setLastCompletedType(currentAction.type);
    }

    setTotalActiveMinutes((prev) => prev + minutes);
    setConsecutiveNotNows(0);

    // ADHD Action Flow: keep going in the string immediately!
    serveNextOffer(0);
  };

  const handleShrinkRequest = async () => {
    setIsMicroFirstStepOnly(true);
    await queueEvent('shrink_requested', {
      task_id: currentAction?.task_id,
    });
  };

  const handleSaveParkingLot = async () => {
    if (!parkingLotText.trim()) return;
    await queueEvent('parking_lot', {
      text: parkingLotText.trim(),
      active_task_id: currentAction?.task_id,
    });
    setParkingLotText('');
    setShowParkingLot(false);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-none">FOCUS</h1>
            <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">Action Layer</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Watchmaker Bench Button (Shows movement parts & rewards) */}
          <button
            onClick={() => setShowBenchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 transition shadow-xs"
            title="Open Watchmaker Bench (Day Movement Progress)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Bench</span>
          </button>

          <SyncIndicator />

          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Task View</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-xs transition ${
              showConfig
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Configure Apps Script Doorway"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STAGE 1: GIANT DO BUTTON */}
      {stage === 'do_button' && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center my-auto">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 rounded-full blur-2xl animate-glow-pulse pointer-events-none"></div>

            <button
              onClick={handleDoPress}
              className="relative w-60 h-60 sm:w-68 sm:h-68 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-800 hover:from-purple-400 hover:to-indigo-700 active:scale-95 text-white font-black text-6xl sm:text-7xl tracking-wider shadow-2xl flex flex-col items-center justify-center gap-1 border-4 border-purple-300/40 animate-do-breathe cursor-pointer transition"
            >
              <span>DO</span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-purple-200/90">
                Ignition
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: PHYSICAL IGNITION SCREEN */}
      {stage === 'ignition' && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full px-4 animate-fadeIn">
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Flame className="w-4 h-4 text-amber-400 fill-current" />
              <span>Physical Ignition</span>
            </div>

            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
              {currentExercise.name}
            </div>

            <div className="text-6xl sm:text-7xl font-black text-purple-400 my-4 tracking-tighter">
              {currentExercise.reps}{' '}
              <span className="text-base font-bold text-slate-400 tracking-normal">
                {currentExercise.unit}
              </span>
            </div>

            {/* Zero-Tap Bridge: Big Done Button */}
            <button
              onClick={handleIgnitionDone}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xl shadow-xl shadow-purple-900/40 transition mb-4 cursor-pointer"
            >
              Done →
            </button>

            {/* Micro Controls: Fewer reps & Swap */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleFewerReps}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Fewer reps
              </button>
              <button
                onClick={handleSwapExercise}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                <span>Swap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: OFFER SCREEN (Assigned or Paired Mode) */}
      {stage === 'offer' && currentAction && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-4 animate-fadeIn">
          {servingMode === 'paired' && pairedCandidates ? (
            /* PAIRED MODE: Two Action Cards to choose from */
            <div className="w-full space-y-3">
              <div className="text-center text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                Choose Your Next Action
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pairedCandidates.map((cand, idx) => {
                  const act = cand.action;
                  return (
                    <div
                      key={act.task_id}
                      onClick={() => {
                        setCurrentAction(act);
                        setCurrentScoreData(cand);
                        handleStartAction();
                      }}
                      className="bg-slate-900/95 border border-purple-500/30 hover:border-purple-400 p-5 rounded-2xl shadow-xl flex flex-col justify-between cursor-pointer active:scale-98 transition group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[10px] font-bold">
                            Friction {act.friction}/5
                          </span>
                          <span className="text-[10px] text-slate-400">{act.time_bucket || '10-20m'}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-purple-200 transition mb-3">
                          {act.title}
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-purple-400 font-bold">Tap to Start</span>
                        <Play className="w-4 h-4 text-purple-400 fill-current" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Not now / Skip pair button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleNotNow}
                  className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition"
                >
                  Neither right now (Not now)
                </button>
              </div>
            </div>
          ) : (
            /* ASSIGNED MODE: Single Focused Card */
            <div className="w-full bg-slate-900/95 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
              {/* Top offer badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[11px] font-bold">
                    Friction {currentAction.friction}/5
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium">
                    {currentAction.time_bucket || '10-20m'}
                  </span>
                </div>

                <button
                  onClick={() => setShowWhyThisOne(!showWhyThisOne)}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why this?</span>
                </button>
              </div>

              {/* Why This One explanation drawer */}
              {showWhyThisOne && (
                <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed animate-fadeIn">
                  <div className="font-bold text-purple-300 mb-1">Serving algorithm breakdown:</div>
                  {currentScoreData?.reasons && currentScoreData.reasons.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                      {currentScoreData.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-400">Chosen to match your target friction of {currentScoreData?.targetFriction || 2}.</p>
                  )}
                </div>
              )}

              {/* Title / Action Description */}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-6">
                {currentAction.title}
              </h2>

              {/* START BUTTON */}
              <button
                onClick={handleStartAction}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-lg shadow-xl shadow-purple-900/40 transition flex items-center justify-center gap-2 mb-4 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start</span>
              </button>

              {/* Micro Controls: Smaller part, Bigger part, Not now */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={handleSmallerPart}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                  title="Shift target friction down"
                >
                  <Minus className="w-3.5 h-3.5" /> Smaller
                </button>
                <button
                  onClick={handleBiggerPart}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                  title="Shift target friction up"
                >
                  <Plus className="w-3.5 h-3.5" /> Bigger
                </button>
                <button
                  onClick={handleNotNow}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Session Momentum & Guilt-Free Stop Option */}
          {completedActions.length > 0 && (
            <div className="w-full mt-3 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                <Flame className="w-4 h-4 text-amber-400 fill-current" />
                <span>
                  {completedActions.length} done this flow
                  {completedActions.length >= 2 && ' (Goal Met! 🎉)'}
                </span>
              </div>

              <button
                onClick={async () => {
                  await queueEvent('flow_stopped_cleanly', {
                    completed_in_session: completedActions.length,
                    reason: 'voluntary_stop',
                  });
                  setStage('do_button');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                  completedActions.length >= 2
                    ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  completedActions.length >= 2
                    ? 'You completed 2+ tasks. Stop with full credit!'
                    : 'Stop this flow session'
                }
              >
                {completedActions.length >= 2 ? 'Done for now ✓' : 'Stop flow'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: ACTION EXECUTION SCREEN */}
      {stage === 'action_running' && currentAction && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 animate-fadeIn">
          <div className="w-full bg-slate-900/95 border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            {/* Timer readout */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full font-mono text-xs text-purple-300">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{formatTimer(timerSeconds)}</span>
              </div>

              {/* Parking lot button */}
              <button
                onClick={() => setShowParkingLot(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-medium border border-slate-700 transition"
                title="Unload distracting thought into parking lot"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Parking lot</span>
              </button>
            </div>

            {/* Current action title */}
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-8">
              {currentAction.title}
            </h2>

            {/* DONE BUTTON */}
            <button
              onClick={handleCompleteAction}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-lg shadow-xl shadow-emerald-900/40 transition flex items-center justify-center gap-2 mb-3 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 fill-current" />
              <span>Done!</span>
            </button>

            {/* Stuck? Shrink it */}
            <button
              onClick={handleShrinkRequest}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              Stuck? Shrink to 2 minutes
            </button>
          </div>
        </div>
      )}

      {/* DOORWAY CONFIG MODAL */}
      {showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 animate-fadeIn">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" /> Doorway Settings
              </h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveCreds} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your secret key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-b border-slate-800 pb-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-bold rounded-lg text-white transition"
                >
                  {savedCreds ? 'Saved!' : 'Save Credentials'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCreds();
                    setShowConfig(false);
                  }}
                  className="text-xs text-purple-300 hover:text-purple-200 font-medium"
                >
                  Save & Back to DO
                </button>
              </div>

              {/* Action Flow Mode Switch (Assigned vs Paired) */}
              <div className="pt-2 pb-3 border-b border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Action Serving Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setServingMode('assigned');
                      localStorage.setItem('focus_serving_mode', 'assigned');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                      servingMode === 'assigned'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1 Card (Assigned)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setServingMode('paired');
                      localStorage.setItem('focus_serving_mode', 'paired');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                      servingMode === 'paired'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2 Cards (Paired Choice)
                  </button>
                </div>
              </div>

              {/* Full Momentum Settings Link */}
              <div className="pt-2 flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[11px] text-slate-400">Momentum App Settings</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setShowMomentumSettings(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <Settings className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Full Settings</span>
                </button>
              </div>

              {/* Developer Candidate Inspector */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Serving Inspector</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setShowInspector(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 active:scale-95 text-purple-200 border border-purple-800 rounded-lg text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Inspect Candidates ({rankedCandidates.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARKING LOT POPUP MODAL */}
      {showParkingLot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Parking Lot</span>
              </h3>
              <button
                onClick={() => setShowParkingLot(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Unload distracting thoughts here so your head stays clear. Saved safely to your event log.
            </p>
            <textarea
              rows={3}
              value={parkingLotText}
              onChange={(e) => setParkingLotText(e.target.value)}
              placeholder="e.g. Remember to buy milk, check flight prices..."
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowParkingLot(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveParkingLot}
                disabled={!parkingLotText.trim()}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
              >
                Save Thought
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Action Layer branding & theme toggle */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 px-1 shrink-0">
        <span>Focus Action Layer</span>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition active:scale-95"
          title={`Task View Theme: Currently ${settings.theme === 'dark' ? 'Dark' : 'Light'}. Tap to switch.`}
        >
          {settings.theme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-slate-400 font-medium">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-400 font-medium">Light</span>
            </>
          )}
        </button>
      </div>

      {/* Momentum Full Settings Modal */}
      {showMomentumSettings && (
        <SettingsModal onClose={() => setShowMomentumSettings(false)} />
      )}

      {/* Developer Candidate Inspector Modal */}
      {showInspector && (
        <CandidateInspectorModal
          candidates={rankedCandidates}
          onClose={() => setShowInspector(false)}
        />
      )}

      {/* Watchmaker Bench Modal */}
      {showBenchModal && (
        <DayMovementBenchModal
          module={dayModule}
          onCommitChange={async (lvl) => {
            setDayModule((prev) => ({
              ...prev,
              committed_level: lvl,
              committed_work_points: COMMITMENT_POINTS[lvl],
            }));
            await queueEvent('day_committed', {
              level: lvl,
              points: COMMITMENT_POINTS[lvl],
              reason: 'user_recalibration',
            });
          }}
          onFreshStart={async () => {
            setDayModule((prev) => ({
              ...prev,
              total_work_done: 0,
              parts: [],
              is_closed: false,
            }));
            await queueEvent('fresh_start', {
              date: dayModule.date,
            });
            setShowBenchModal(false);
          }}
          onClose={() => setShowBenchModal(false)}
        />
      )}

      {/* Daily Commitment First-Do Prompt Modal */}
      {showCommitPrompt && (
        <DayCommitmentPromptModal
          suggestedLevel={dayModule.committed_level}
          onCommit={handleCommitChoice}
        />
      )}
    </div>
  );
}
