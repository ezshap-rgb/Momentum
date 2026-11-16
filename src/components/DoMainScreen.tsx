import React, { useState, useEffect, useRef } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { SettingsModal } from './SettingsModal';
import {
  queueEvent,
  readTabFromSheet,
  triggerBackgroundSync,
  getStoredCredentials,
  saveCredentials,
} from '../services/focusDataLayer';
import {
  FocusAction,
  ServingState,
  IgnitionExercise,
  pickNextExercise,
  pickBestAction,
} from '../services/focusServing';
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
  const [servingState, setServingState] = useState<ServingState>({
    targetFriction: 2,
    completedCount: 0,
    consecutiveNotNows: 0,
    skippedTaskIds: new Set(),
  });

  // Current ignition exercise
  const [currentExercise, setCurrentExercise] = useState<IgnitionExercise>(() => pickNextExercise());

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

  // 1. DO Tap -> Ignition Screen
  const handleDoPress = async () => {
    const nextEx = pickNextExercise(servingState.lastExercise);
    setCurrentExercise(nextEx);
    setStage('ignition');
    await queueEvent('ignition_offered', {
      exercise: nextEx.name,
      targetReps: nextEx.reps,
    });
  };

  // 2. Ignition Controls
  const handleFewerReps = async () => {
    const reduced = Math.max(3, Math.round(currentExercise.reps * 0.6));
    setCurrentExercise((prev) => ({ ...prev, reps: reduced }));
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

    setServingState((prev) => ({ ...prev, lastExercise: currentExercise.name }));

    // Pick best action matching target friction
    serveNextOffer(servingState.targetFriction, servingState.consecutiveNotNows);
  };

  const serveNextOffer = (targetFriction: number, notNowCount: number) => {
    const pick = pickBestAction(actionsPool, targetFriction, servingState.skippedTaskIds);

    if (!pick) {
      // Fallback action if pool is empty
      setCurrentAction({
        task_id: 'default_action',
        title: 'Choose one quick thing right in front of you',
        friction: targetFriction,
        time_bucket: 'under 5',
        first_action: 'Stand up and take the first step',
        status: 'waiting',
      });
    } else {
      setCurrentAction(pick);
    }

    // Two not-nows in a row -> offer becomes only the tiny first physical action!
    setIsMicroFirstStepOnly(notNowCount >= 2);
    setStage('offer');

    queueEvent('offer_served', {
      task_id: pick?.task_id || 'default_action',
      mode: 'assigned',
      target_friction: targetFriction,
      micro_only: notNowCount >= 2,
    });
  };

  // 4. Offer Screen Controls
  const handleSmallerPart = async () => {
    const newTarget = Math.max(1, servingState.targetFriction - 1);
    setServingState((prev) => ({ ...prev, targetFriction: newTarget }));
    await queueEvent('smaller_part', {
      old_target: servingState.targetFriction,
      new_target: newTarget,
    });
    serveNextOffer(newTarget, servingState.consecutiveNotNows);
  };

  const handleBiggerPart = async () => {
    const newTarget = Math.min(4, servingState.targetFriction + 1);
    setServingState((prev) => ({ ...prev, targetFriction: newTarget }));
    await queueEvent('bigger_part', {
      old_target: servingState.targetFriction,
      new_target: newTarget,
    });
    serveNextOffer(newTarget, servingState.consecutiveNotNows);
  };

  const handleNotNow = async () => {
    const newNotNows = servingState.consecutiveNotNows + 1;
    const skipped = new Set(servingState.skippedTaskIds);
    if (currentAction) skipped.add(currentAction.task_id);

    setServingState((prev) => ({
      ...prev,
      consecutiveNotNows: newNotNows,
      skippedTaskIds: skipped,
    }));

    await queueEvent('not_now', {
      task_id: currentAction?.task_id,
      consecutive: newNotNows,
    });

    serveNextOffer(servingState.targetFriction, newNotNows);
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

    // Remove from local pool & update stats
    if (currentAction) {
      setActionsPool((prev) =>
        prev.map((a) =>
          a.task_id === currentAction.task_id ? { ...a, status: 'done', completed_at: new Date().toISOString() } : a
        )
      );
    }

    // Target friction increases by 1 upon completion (up to ceiling 4)
    const nextTarget = Math.min(4, servingState.targetFriction + 1);
    const newCompletedCount = servingState.completedCount + 1;

    setServingState((prev) => ({
      ...prev,
      targetFriction: nextTarget,
      completedCount: newCompletedCount,
      consecutiveNotNows: 0,
    }));

    // ADHD Action Flow: keep going in the string immediately!
    serveNextOffer(nextTarget, 0);
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

      {/* STAGE 3: SINGLE OFFER SCREEN (Assigned mode) */}
      {stage === 'offer' && currentAction && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 animate-fadeIn">
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
                <strong>Serving rule:</strong> Target friction is {servingState.targetFriction}. This action matches your current momentum curve, due dates, and energy.
              </div>
            )}

            {/* Title / Action Description */}
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-4">
              {currentAction.title}
            </h2>

            {/* Micro first move reminder */}
            <div className="p-3.5 bg-purple-950/40 border border-purple-800/40 rounded-xl mb-6">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-300 mb-0.5">
                First physical move (under 60s):
              </span>
              <p className="text-sm font-semibold text-purple-100">
                {currentAction.first_action || 'Open the first relevant file or app'}
              </p>
            </div>

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

            {/* Session Momentum & Guilt-Free Stop Option */}
            {servingState.completedCount > 0 && (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                  <Flame className="w-4 h-4 text-amber-400 fill-current" />
                  <span>
                    {servingState.completedCount} done this flow
                    {servingState.completedCount >= 2 && ' (Goal Met! 🎉)'}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    await queueEvent('flow_stopped_cleanly', {
                      completed_in_session: servingState.completedCount,
                      reason: 'voluntary_stop',
                    });
                    setStage('do_button');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                    servingState.completedCount >= 2
                      ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title={
                    servingState.completedCount >= 2
                      ? 'You completed 2+ tasks. Stop with full credit!'
                      : 'Stop this flow session'
                  }
                >
                  {servingState.completedCount >= 2 ? 'Done for now ✓' : 'Stop flow'}
                </button>
              </div>
            )}
          </div>
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
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-4">
              {currentAction.title}
            </h2>

            {/* Reminder of first step */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 mb-6">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Focus reminder:</span>
              <p className="font-semibold text-purple-200">
                {currentAction.first_action || 'Keep moving forward'}
              </p>
            </div>

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

              {/* Full Momentum Settings Link */}
              <div className="pt-2 flex items-center justify-between">
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
    </div>
  );
}
