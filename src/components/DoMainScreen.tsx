import React, { useState, useEffect, useRef } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { SettingsModal } from './SettingsModal';
import { CandidateInspectorModal } from './CandidateInspectorModal';
import { DayMovementBenchModal } from './DayMovementBenchModal';
import { DayCommitmentPromptModal } from './DayCommitmentPromptModal';
import { ExperimentsModal } from './ExperimentsModal';
import { SetupGuideModal } from './SetupGuideModal';
import { WatchCollectionModal } from './WatchCollectionModal';
import { FridaySummaryModal } from './FridaySummaryModal';
import { WatchPartVector } from './WatchPartVector';
import {
  setWakeLockActive,
  playGentleCompletionChime,
  triggerHaptic,
} from '../services/focusWakeLock';
import {
  recordOffDayPolish,
  isFridayMorning,
} from '../services/focusCollection';
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
import {
  creditHabitFromIgnition,
  getWeightedIgnitionPick,
  addPowerReserve,
  loadHabitsState,
  dismissHabit,
  HabitItem,
  formatExerciseDisplay,
  syncHabitsWithBoardData,
  getTodayDateString,
} from '../services/focusHabits';
import { ScatteredHabitsBackground } from './focus/ScatteredHabitsBackground';
import { HabitsModal } from './HabitsModal';
import {
  getExperimentScheduleStatus,
  overrideExperimentMode,
  ServeMode,
} from '../services/focusExperiments';
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
  FlaskConical,
  Lock,
  Unlock,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Watch,
  Activity,
} from 'lucide-react';

interface Props {
  onOpenTaskView: () => void;
  onOpenPlanMode?: () => void;
}

type DoStage = 'do_button' | 'ignition' | 'offer' | 'action_running';

export function DoMainScreen({ onOpenTaskView, onOpenPlanMode }: Props) {
  const { settings, toggleTheme, boardData, toggleHabitDate } = useMomentum();

  // Navigation / Modal States
  const [stage, setStage] = useState<DoStage>('do_button');
  const [showConfig, setShowConfig] = useState(false);
  const [showMomentumSettings, setShowMomentumSettings] = useState(false);
  const [showParkingLot, setShowParkingLot] = useState(false);
  const [parkingLotText, setParkingLotText] = useState('');
  const [showWhyThisOne, setShowWhyThisOne] = useState(false);
  const [showHabitsModal, setShowHabitsModal] = useState(false);

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

  // Daily Habits State (Scattered background & Ignition link)
  const [todayDate, setTodayDate] = useState<string>(() => getTodayDateString());
  const [habits, setHabits] = useState<HabitItem[]>(() => loadHabitsState());
  const [allClearCelebration, setAllClearCelebration] = useState(false);

  // Current ignition exercise sourced directly from uncleared habits with full quota
  const [currentExercise, setCurrentExercise] = useState<IgnitionExercise>(() => {
    const pick = getWeightedIgnitionPick();
    return {
      name: pick.name,
      reps: pick.reps,
      unit: (pick.unit as any) || 'reps',
      habitId: pick.habitId,
      schedule: pick.schedule,
      circuit: pick.circuit,
    };
  });

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

  // Action Flow Mode (assigned: 1 card, paired: 2 cards) - synced with 4-week experiment
  const [servingMode, setServingMode] = useState<ServeMode>(() => {
    return getExperimentScheduleStatus().effectiveMode;
  });
  const [pairedCandidates, setPairedCandidates] = useState<[CandidateScore, CandidateScore] | null>(null);
  const [showExperimentsModal, setShowExperimentsModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showFridaySummary, setShowFridaySummary] = useState(() => isFridayMorning());
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [targetOverrideMode, setTargetOverrideMode] = useState<ServeMode>('paired');
  const neitherTimeoutRef = useRef<number | null>(null);

  // Refresh todayDate when local midnight passes or tab regains focus
  useEffect(() => {
    const checkDateRollover = () => {
      const current = getTodayDateString();
      setTodayDate((prev) => (prev === current ? prev : current));
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover();
      }
    };

    const interval = window.setInterval(checkDateRollover, 60000);
    window.addEventListener('focus', checkDateRollover);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkDateRollover);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Synchronize daily habits with Board / Google Tasks habits (and refresh daily)
  useEffect(() => {
    const synced = syncHabitsWithBoardData(boardData.habits);
    setHabits(synced);
  }, [boardData.habits, todayDate]);

  // Screen wake lock during ignition and action execution
  useEffect(() => {
    if (stage === 'ignition' || stage === 'action_running') {
      setWakeLockActive(true);
    } else {
      setWakeLockActive(false);
    }
    return () => {
      setWakeLockActive(false);
    };
  }, [stage]);

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

  // Phase 8: Serving Mode toggle with 4-week experiment lock
  const handleRequestModeChange = (mode: ServeMode) => {
    const status = getExperimentScheduleStatus();
    if (mode === status.effectiveMode) return;

    if (status.isLocked) {
      setTargetOverrideMode(mode);
      setShowOverrideConfirm(true);
    } else {
      applyModeOverride(mode);
    }
  };

  const applyModeOverride = async (mode: ServeMode) => {
    const status = getExperimentScheduleStatus();
    await overrideExperimentMode(mode, status.effectiveMode, 'User manual override in Settings');
    setServingMode(mode);
    setShowOverrideConfirm(false);
  };

  // 1. DO Tap -> Check Day Commitment on Counting Day, then Ignition Screen
  const handleDoPress = async () => {
    // Refresh experiment schedule mode
    const expStatus = getExperimentScheduleStatus();
    setServingMode(expStatus.effectiveMode);

    await queueEvent('do_press', {
      timestamp: new Date().toISOString(),
      mode: expStatus.effectiveMode,
    });

    proceedToIgnition();
  };

  const handleDismissHabit = async (habit: HabitItem) => {
    const { updated, isAllClear } = dismissHabit(habit.habit_id);
    setHabits(updated);
    triggerHaptic([40]);

    // Also mark done for today locally in dashboard habit tracker (Google Tasks stays untouched)
    const todayStr = getTodayDateString();
    const match =
      boardData.habits.find((h) => h.id === habit.habit_id) ||
      boardData.habits.find((h) => h.name.toLowerCase().trim() === habit.name.toLowerCase().trim());
    if (match && !match.log[todayStr]) {
      toggleHabitDate(match.id, todayStr);
    }

    const habitWorkVal = 2;
    await queueEvent('habit_completed', {
      habit_id: habit.habit_id,
      name: habit.name,
      quota: habit.quota,
      work_value: habitWorkVal,
    });

    setDayModule((prev) => {
      const newWork = prev.total_work_done + habitWorkVal;
      return {
        ...prev,
        total_work_done: newWork,
        is_closed: prev.is_closed || newWork >= prev.committed_work_points,
      };
    });

    if (isAllClear) {
      const bonusPts = 5;
      await queueEvent('all_habits_cleared', { bonus_points: bonusPts });
      setDayModule((prev) => ({
        ...prev,
        total_work_done: prev.total_work_done + bonusPts,
      }));
      setAllClearCelebration(true);
      setTimeout(() => setAllClearCelebration(false), 5000);
    }
  };

  const proceedToIgnition = async () => {
    // Sourced directly from uncleared daily habits with full quota
    const pick = getWeightedIgnitionPick(currentExercise.name);
    const nextEx: IgnitionExercise = {
      name: pick.name,
      reps: pick.reps,
      unit: (pick.unit as any) || 'reps',
      habitId: pick.habitId,
      schedule: pick.schedule,
      circuit: pick.circuit,
    };
    setCurrentExercise(nextEx);
    setStage('ignition');
    addPowerReserve(2); // +2 winding ticks per DO press

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

    // If completing the daily calibration task
    if (currentAction?.task_id.startsWith('action_daily_calibration_')) {
      const completedTask = currentAction;
      await queueEvent('action_completed', {
        task_id: completedTask.task_id,
        friction: 1,
        actual_minutes: 1,
        finish_grade: 'standard',
        part_earned: 'screw',
        work_value: 1,
      });

      setCompletedActions((prev) => [...prev, completedTask]);
      setShowCommitPrompt(false);
      serveNextOffer(0);
      return;
    }

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
    // Phase 7: Credit matching habit quota directly & clear from screen!
    const { updated, isAllClear } = creditHabitFromIgnition(
      currentExercise.name,
      currentExercise.reps,
      currentExercise.habitId
    );
    setHabits(updated);

    // Also mark done for today locally in dashboard habit tracker (Google Tasks stays untouched)
    const todayStr = getTodayDateString();
    const match =
      boardData.habits.find((h) => currentExercise.habitId && h.id === currentExercise.habitId) ||
      boardData.habits.find((h) => h.name.toLowerCase().trim() === currentExercise.name.toLowerCase().trim());
    if (match && !match.log[todayStr]) {
      toggleHabitDate(match.id, todayStr);
    }

    const habitWorkVal = 2;
    await queueEvent('ignition_done', {
      exercise: currentExercise.name,
      reps: currentExercise.reps,
      credited_habit: true,
      work_value: habitWorkVal,
    });

    setDayModule((prev) => {
      const newWork = prev.total_work_done + habitWorkVal;
      return {
        ...prev,
        total_work_done: newWork,
        is_closed: prev.is_closed || newWork >= prev.committed_work_points,
      };
    });

    if (isAllClear) {
      const bonusPts = 5;
      await queueEvent('all_habits_cleared', { bonus_points: bonusPts });
      setDayModule((prev) => ({
        ...prev,
        total_work_done: prev.total_work_done + bonusPts,
      }));
      setAllClearCelebration(true);
      setTimeout(() => setAllClearCelebration(false), 5000);
    }

    serveNextOffer(consecutiveNotNows);
  };

  const serveNextOffer = (
    notNowCount: number,
    overrides?: {
      pool?: FocusAction[];
      completed?: FocusAction[];
      skipped?: Set<string>;
      activeMinutes?: number;
      tapShiftVal?: number;
      lastType?: string;
    }
  ) => {
    const activePool = overrides?.pool || actionsPool;
    const activeCompleted = overrides?.completed || completedActions;
    const activeSkipped = overrides?.skipped || skippedTaskIds;
    const activeMinutes = overrides?.activeMinutes ?? totalActiveMinutes;
    const activeTapShift = overrides?.tapShiftVal ?? tapShift;
    const activeLastType = overrides?.lastType ?? lastCompletedType;

    // If today is a counting day and commitment is not set yet, serve Daily Calibration as first action
    const todayStr = new Date().toISOString().split('T')[0];
    const hasCommittedToday = localStorage.getItem('focus_committed_date') === todayStr;
    const calibTaskId = 'action_daily_calibration_' + todayStr;

    if (isCountingDay() && !hasCommittedToday && !activeSkipped.has(calibTaskId)) {
      const dailyCalibAction: FocusAction = {
        task_id: calibTaskId,
        title: "Daily Calibration: Set Today's Commitment",
        friction: 1,
        time_bucket: '< 5m',
        category: 'quick',
        importance: 'high',
        first_action: "Pick Light (8 pts), Standard (16 pts), or Full (26 pts) to calibrate today's capacity",
        status: 'waiting',
        why_it_matters: 'Calibrates daily capacity and sets your momentum target with zero cognitive friction.',
      };
      const calibScore: CandidateScore = {
        action: dailyCalibAction,
        totalScore: 99999,
        targetFriction: 1,
        effectiveFriction: 1,
        urgencyScore: 10,
        importanceScore: 10,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: false,
        reasons: ['Daily Kick-off: Set commitment level for today'],
      };
      setCurrentAction(dailyCalibAction);
      setCurrentScoreData(calibScore);
      setRankedCandidates([calibScore]);
      setPairedCandidates(null);
      setIsMicroFirstStepOnly(false);
      setStage('offer');
      queueEvent('offer_served', {
        task_id: dailyCalibAction.task_id,
        mode: 'assigned',
        target_friction: 1,
        micro_only: false,
        is_tripwire: false,
        is_reserved: false,
      });
      return;
    }

    const ctx: SessionContext = {
      completedActions: activeCompleted,
      totalActiveMinutes: activeMinutes,
      tapShift: activeTapShift,
      consecutiveSmallerTaps: 0,
      fewerRepsTapped,
      reservedSlotUsedToday: reservedSlotUsed,
      stretchProbeUsedToday: stretchProbeUsed,
      skippedTaskIds: activeSkipped,
      lastCompletedType: activeLastType,
      now: new Date(),
    };

    const { selected, ranked, paired } = rankCandidates(activePool, ctx);
    setRankedCandidates(ranked);

    // If paired mode is active:
    let resolvedPair = paired;
    if (servingMode === 'paired') {
      if (!resolvedPair && ranked.length >= 2) {
        // Paired mode active but candidates had same friction or target friction was high:
        // Synthesize an easier lower option using the second candidate's first physical step!
        const upperCand = ranked[0];
        const lowerCandRaw = ranked[1];
        const lowerAction: FocusAction = {
          ...lowerCandRaw.action,
          title: lowerCandRaw.action.first_action || `${lowerCandRaw.action.title} (First 2-min step)`,
          friction: Math.max(1, (Number(upperCand.action.friction) || 2) - 1),
        };
        const synthesizedLower: CandidateScore = {
          ...lowerCandRaw,
          effectiveFriction: Math.max(1, upperCand.effectiveFriction - 1),
          action: lowerAction,
          reasons: [...lowerCandRaw.reasons, 'Paired mode: Shrunk to easier step'],
        };
        resolvedPair = [upperCand, synthesizedLower];
      }

      setPairedCandidates(resolvedPair);
      if (resolvedPair) {
        setCurrentAction(resolvedPair[0].action);
        setCurrentScoreData(resolvedPair[0]);
      } else if (selected) {
        setCurrentAction(selected.action);
        setCurrentScoreData(selected);
        if (selected.isReservedSlot) setReservedSlotUsed(true);
      }
    } else {
      setPairedCandidates(null);
      if (selected) {
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
    if (currentAction?.task_id.startsWith('action_daily_calibration_')) {
      setShowCommitPrompt(true);
      return;
    }
    const nextTapShift = tapShift - 1;
    setTapShift(nextTapShift);
    await queueEvent('smaller_part', {
      task_id: currentAction?.task_id,
    });
    serveNextOffer(consecutiveNotNows, { tapShiftVal: nextTapShift });
  };

  const handleBiggerPart = async () => {
    if (currentAction?.task_id.startsWith('action_daily_calibration_')) {
      setShowCommitPrompt(true);
      return;
    }
    const nextTapShift = tapShift + 1;
    setTapShift(nextTapShift);
    await queueEvent('bigger_part', {
      task_id: currentAction?.task_id,
    });
    serveNextOffer(consecutiveNotNows, { tapShiftVal: nextTapShift });
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

    serveNextOffer(newNotNows, { skipped });
  };

  const handleStartAction = async (actionToStart?: FocusAction) => {
    const act = actionToStart || currentAction;
    if (act?.task_id.startsWith('action_daily_calibration_')) {
      setShowCommitPrompt(true);
      return;
    }
    if (actionToStart) setCurrentAction(actionToStart);
    setStage('action_running');
    setTimerSeconds(0);
    setIsTimerRunning(true);
    await queueEvent('action_started', {
      task_id: act?.task_id,
      mode: servingMode,
      friction: act?.friction,
    });
  };

  // Paired Mode Card Choices
  const handleSelectUpperPaired = async (cand: CandidateScore) => {
    setCurrentAction(cand.action);
    setCurrentScoreData(cand);
    setTapShift((prev) => prev + 1); // bigger part signal (+1 ramp)
    await queueEvent('tap_shift', {
      direction: 'bigger',
      source: 'paired_upper_choice',
      task_id: cand.action.task_id,
    });
    handleStartAction(cand.action);
  };

  const handleSelectLowerPaired = async (cand: CandidateScore) => {
    setCurrentAction(cand.action);
    setCurrentScoreData(cand);
    setTapShift((prev) => prev - 1); // smaller part signal (-1 easing)
    await queueEvent('tap_shift', {
      direction: 'smaller',
      source: 'paired_lower_choice',
      task_id: cand.action.task_id,
    });
    handleStartAction(cand.action);
  };

  const handleNeither = async () => {
    const newNotNows = consecutiveNotNows + 1;
    const nextTapShift = tapShift - 1;
    const skipped = new Set(skippedTaskIds);
    if (currentAction) skipped.add(currentAction.task_id);
    if (pairedCandidates) {
      skipped.add(pairedCandidates[0].action.task_id);
      skipped.add(pairedCandidates[1].action.task_id);
    }

    setConsecutiveNotNows(newNotNows);
    setTapShift(nextTapShift);
    setSkippedTaskIds(skipped);

    await queueEvent('not_now', {
      task_id: currentAction?.task_id,
      reason: 'neither',
      mode: 'paired',
      consecutive: newNotNows,
    });

    serveNextOffer(newNotNows, { skipped, tapShiftVal: nextTapShift });
  };

  const handleNeitherPressStart = () => {
    neitherTimeoutRef.current = window.setTimeout(() => {
      handleNeither();
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (_) {}
      }
    }, 600);
  };

  const handleNeitherPressEnd = () => {
    if (neitherTimeoutRef.current) {
      clearTimeout(neitherTimeoutRef.current);
      neitherTimeoutRef.current = null;
    }
  };

  // 5. Action Execution Controls
  const handleCompleteAction = async () => {
    setIsTimerRunning(false);
    const minutes = Math.max(1, Math.round(timerSeconds / 60));

    await queueEvent('action_completed', {
      task_id: currentAction?.task_id,
      actual_minutes: minutes,
      friction: currentAction?.friction,
      mode: servingMode,
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

      // Phase 10: Audio completion chime & haptic feedback (audio chime disabled per user preference)
      triggerHaptic([60, 40, 60]);

      // Phase 11: If completing on Friday or Saturday (off days), record polish upgrades!
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        recordOffDayPolish(workVal);
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

      const updatedPool = actionsPool.map((a) =>
        a.task_id === currentAction.task_id ? { ...a, status: 'done' as const, completed_at: new Date().toISOString() } : a
      );
      const updatedCompleted = [...completedActions, currentAction];

      setActionsPool(updatedPool);
      setCompletedActions(updatedCompleted);
      setLastCompletedType(currentAction.type);

      const updatedMinutes = totalActiveMinutes + minutes;
      setTotalActiveMinutes(updatedMinutes);
      setConsecutiveNotNows(0);

      // ADHD Action Flow: keep going in the string immediately with updated state!
      serveNextOffer(0, {
        pool: updatedPool,
        completed: updatedCompleted,
        activeMinutes: updatedMinutes,
        lastType: currentAction.type,
      });
      return;
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

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SyncIndicator />

          {/* Habits Manager Button (Replaces Plan on top) */}
          <button
            onClick={() => setShowHabitsModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-pink-500/40 rounded-xl text-xs font-semibold text-pink-400 transition shadow-sm shrink-0"
            title="Open Daily Habits Manager (Edit Quotas & Rhythms)"
          >
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Habits</span>
          </button>

          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm shrink-0"
            title="Open Task View (Matrix)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Task View</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-xs transition shrink-0 ${
              showConfig
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Configure Apps Script Doorway & Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SCATTERED HABITS BACKGROUND (Disappear over the day with 1 tap, accessible anytime) */}
      {!showConfig && (
        <ScatteredHabitsBackground
          habits={habits}
          onDismiss={handleDismissHabit}
          isAllClear={allClearCelebration}
        />
      )}

      {/* STAGE 1: GIANT DO BUTTON */}
      {stage === 'do_button' && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center my-auto">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 rounded-full blur-2xl animate-glow-pulse pointer-events-none"></div>

            <button
              onClick={handleDoPress}
              className="relative w-56 h-56 sm:w-68 sm:h-68 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-800 hover:from-purple-400 hover:to-indigo-700 active:scale-95 text-white font-black text-6xl sm:text-7xl tracking-wider shadow-2xl flex flex-col items-center justify-center gap-1 border-4 border-purple-300/40 animate-do-breathe cursor-pointer transition"
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

            {(() => {
              const display = formatExerciseDisplay(
                currentExercise.name,
                currentExercise.schedule,
                currentExercise.circuit
              );
              return (
                <div className="mb-2">
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {display.title}
                  </div>
                  {display.subtitle && (
                    <div className="text-xs uppercase font-extrabold text-amber-400/90 tracking-widest mt-1">
                      {display.subtitle}
                    </div>
                  )}
                </div>
              );
            })()}

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
            /* PAIRED MODE: Upper Card (T+1, More Reward) & Lower Card (T-1, Easier Entry) */
            <div className="w-full space-y-3">
              <div className="text-center text-xs font-bold text-purple-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Choose Your Next Action</span>
              </div>

              <div className="flex flex-col gap-3">
                {/* UPPER CARD: Target + 1 (More Reward) */}
                {(() => {
                  const upper = pairedCandidates[0];
                  const act = upper.action;

                  return (
                    <div
                      key={act.task_id}
                      onClick={() => handleSelectUpperPaired(upper)}
                      className="bg-slate-900/95 border-2 border-purple-500/40 hover:border-purple-400 p-6 sm:p-7 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer active:scale-[0.98] transition group relative overflow-hidden min-h-[145px] sm:min-h-[160px]"
                    >
                      <div className="mb-2.5">
                        <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                          More reward
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white leading-snug group-hover:text-purple-200 transition max-w-md">
                        {act.title}
                      </h3>

                      {act.project_title && (
                        <div className="text-xs text-purple-400 font-semibold mt-2">
                          📁 {act.project_title}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* LOWER CARD: Target - 1 (Easier Entry) */}
                {(() => {
                  const lower = pairedCandidates[1];
                  const act = lower.action;

                  return (
                    <div
                      key={act.task_id}
                      onClick={() => handleSelectLowerPaired(lower)}
                      className="bg-slate-900/95 border-2 border-slate-700/60 hover:border-purple-400 p-6 sm:p-7 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer active:scale-[0.98] transition group relative overflow-hidden min-h-[145px] sm:min-h-[160px]"
                    >
                      <div className="mb-2.5">
                        <span className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                          Easier
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white leading-snug group-hover:text-purple-200 transition max-w-md">
                        {act.title}
                      </h3>

                      {act.project_title && (
                        <div className="text-xs text-purple-400 font-semibold mt-2">
                          📁 {act.project_title}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Long-press / Hidden Neither Button */}
              <div className="flex justify-center pt-2">
                <button
                  onMouseDown={handleNeitherPressStart}
                  onMouseUp={handleNeitherPressEnd}
                  onTouchStart={handleNeitherPressStart}
                  onTouchEnd={handleNeitherPressEnd}
                  onClick={handleNeither}
                  className="py-2.5 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800 transition"
                  title="Long press or tap if neither fits right now (counts as not now)"
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
                onClick={() => handleStartAction()}
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

              {/* Action Flow Mode Switch (Assigned vs Paired) with Experiment Schedule */}
              <div className="pt-2 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Action Serving Mode:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfig(false);
                      setShowExperimentsModal(true);
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                  >
                    <FlaskConical className="w-3 h-3" />
                    <span>View Experiment</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestModeChange('assigned')}
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
                    onClick={() => handleRequestModeChange('paired')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                      servingMode === 'paired'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2 Cards (Paired Choice)
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>
                    Week {getExperimentScheduleStatus().weekNumber} of 4: {getExperimentScheduleStatus().scheduledMode} scheduled
                  </span>
                  {getExperimentScheduleStatus().isLocked ? (
                    <span className="text-amber-400 flex items-center gap-0.5 font-medium">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  ) : (
                    <span className="text-purple-400 flex items-center gap-0.5 font-medium">
                      <Unlock className="w-2.5 h-2.5" /> Override
                    </span>
                  )}
                </div>
              </div>

              {/* Phase 10: Setup Guide (Battery, Calendar Nudges & Drive Backups) */}
              <div className="pt-2 flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[11px] text-slate-400">Offline, Nudges & Backups</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setShowSetupGuide(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Setup Guide</span>
                </button>
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

      {/* Bottom Bar: Action Layer branding, Experiment, Vault & theme toggle */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 px-1 shrink-0 gap-2">
        <span className="hidden xs:inline text-[10px]">Focus Action Layer</span>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Plan Mode Button (Moved to bottom, directly left of Bench) */}
          {onOpenPlanMode && (
            <button
              onClick={onOpenPlanMode}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-400 hover:text-purple-300 transition active:scale-95"
              title="Open Plan Mode (Calm Review, Pool & Settings)"
            >
              <Layers className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-medium">Plan</span>
            </button>
          )}

          {/* Watchmaker Bench Progress */}
          <button
            onClick={() => setShowBenchModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-300 transition active:scale-95"
            title="Open Watchmaker Bench (Day Movement Progress)"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium">Bench</span>
          </button>

          {/* Watchmaker Collection Vault Button (Phase 11) */}
          <button
            onClick={() => setShowCollectionModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-400 hover:text-purple-300 transition active:scale-95"
            title="Open Watchmaker's Collection (Crafted Timepieces)"
          >
            <Watch className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-medium">Vault</span>
          </button>

          {/* 4-Week Serving Experiment Modal Button (Phase 8) */}
          <button
            onClick={() => setShowExperimentsModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-400 hover:text-purple-300 transition active:scale-95"
            title={`Serving Experiment: Week ${getExperimentScheduleStatus().weekNumber} of 4 (${servingMode})`}
          >
            <FlaskConical className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-medium">Experiment</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition active:scale-95"
            title={`Task View Theme: Currently ${settings.theme === 'dark' ? 'Dark' : 'Light'}. Tap to switch.`}
          >
            {settings.theme === 'dark' ? (
              <>
                <Moon className="w-3 h-3 text-purple-400" />
                <span className="text-[10px]">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span className="text-[10px]">Light</span>
              </>
            )}
          </button>
        </div>
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
          onOpenCollection={() => setShowCollectionModal(true)}
          onClose={() => setShowBenchModal(false)}
        />
      )}

      {/* Daily Commitment First-Do Prompt Modal */}
      {showCommitPrompt && (
        <DayCommitmentPromptModal
          suggestedLevel={dayModule.committed_level}
          onCommit={handleCommitChoice}
          onClose={() => setShowCommitPrompt(false)}
        />
      )}

      {/* Serving Mode Experiment Analytics Modal (Phase 8) */}
      {showExperimentsModal && (
        <ExperimentsModal
          isOpen={showExperimentsModal}
          onClose={() => setShowExperimentsModal(false)}
          onServingModeChanged={(newMode) => setServingMode(newMode)}
        />
      )}

      {/* Setup Guide Modal (Phase 10) */}
      {showSetupGuide && (
        <SetupGuideModal
          isOpen={showSetupGuide}
          onClose={() => setShowSetupGuide(false)}
        />
      )}

      {/* Watch Collection Vault Modal (Phase 11) */}
      {showCollectionModal && (
        <WatchCollectionModal
          isOpen={showCollectionModal}
          onClose={() => setShowCollectionModal(false)}
        />
      )}

      {/* Friday Morning Week Reflection Modal (Phase 11) */}
      {showFridaySummary && (
        <FridaySummaryModal
          isOpen={showFridaySummary}
          onClose={() => setShowFridaySummary(false)}
          onOpenCollection={() => {
            setShowFridaySummary(false);
            setShowCollectionModal(true);
          }}
        />
      )}

      {/* Daily Habits Manager Modal */}
      {showHabitsModal && (
        <HabitsModal
          isOpen={showHabitsModal}
          onClose={() => setShowHabitsModal(false)}
        />
      )}

      {/* Confirmation Modal for Locked Week Override in Settings */}
      {showOverrideConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-white text-base">Override Week Lock?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The 4-week experiment locks the serving mode by week to maintain fair, unbiased metrics.
              Overriding will log a <code className="text-amber-300">mode_override</code> event.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowOverrideConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Keep Lock
              </button>
              <button
                onClick={() => applyModeOverride(targetOverrideMode)}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
              >
                Override Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
