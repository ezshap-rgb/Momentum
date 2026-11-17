/**
 * Focus App Habits & Gear Train Model (Phase 7)
 * 
 * 7 daily exercises grouped into Morning & Evening circuits:
 * Half A: Push-ups, Squats, Plank (seconds), Hip Mobility Cycle
 * Half B: Pull-ups, Crunches, Reverse Plank (seconds)
 */

export interface HabitItem {
  habit_id: string;
  name: string;
  half: 'A' | 'B';
  circuit: 'morning' | 'evening' | 'both';
  quota: number;
  unit: 'reps' | 'seconds' | 'cycle';
  currentReps: number;
  isComplete: boolean;
}

export type CircuitLadder = 'full' | 'half' | 'minimum';

export interface CircuitProgress {
  circuitType: 'morning' | 'evening';
  ladder: CircuitLadder;
  items: HabitItem[];
  isClosed: boolean;
  workContribution: number; // 3 for full, 2 for half, 1 for min (cap 6/day)
}

export interface GearState {
  habit_id: string;
  name: string;
  speed: number; // 0 to 1 based on 3-day completion rate
}

export const INITIAL_HABITS: HabitItem[] = [
  // Half A
  { habit_id: 'pushups_mrng', name: 'Push-ups 50 (mrng)', half: 'A', circuit: 'morning', quota: 50, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'pushups_nt', name: 'Push-ups 50 (nt)', half: 'A', circuit: 'evening', quota: 50, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'squats', name: 'Squats 30', half: 'A', circuit: 'both', quota: 30, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'plank', name: 'Plank 60s', half: 'A', circuit: 'both', quota: 60, unit: 'seconds', currentReps: 0, isComplete: false },
  { habit_id: 'hip_mobility', name: 'Hip Mobility 1', half: 'A', circuit: 'both', quota: 1, unit: 'cycle', currentReps: 0, isComplete: false },
  // Half B
  { habit_id: 'pullups', name: 'Pull-ups 10', half: 'B', circuit: 'both', quota: 10, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'crunches', name: 'Crunches 30', half: 'B', circuit: 'both', quota: 30, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'reverse_plank', name: 'Reverse Plank 45s', half: 'B', circuit: 'both', quota: 45, unit: 'seconds', currentReps: 0, isComplete: false },
];

const STORAGE_KEYS = {
  HABITS: 'focus_habits_state',
  LAST_HABITS_DATE: 'focus_last_habits_date',
  POWER_RESERVE: 'focus_power_reserve',
  LAST_RESERVE_DATE: 'focus_last_reserve_date',
};

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadHabitsState(): HabitItem[] {
  const today = getTodayDateString();
  const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_HABITS_DATE);

  let habits: HabitItem[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
    if (raw) habits = JSON.parse(raw);
  } catch (_) {}

  if (!habits || habits.length === 0) {
    habits = INITIAL_HABITS.map((h) => ({ ...h }));
    saveHabitsState(habits);
    localStorage.setItem(STORAGE_KEYS.LAST_HABITS_DATE, today);
    return habits;
  }

  // Daily refresh: If it's a new day, reset all habit completions so they scatter fresh!
  if (lastDate !== today) {
    habits = habits.map((h) => ({
      ...h,
      currentReps: 0,
      isComplete: false,
    }));
    saveHabitsState(habits);
    localStorage.setItem(STORAGE_KEYS.LAST_HABITS_DATE, today);
  }

  return habits;
}

export function saveHabitsState(habits: HabitItem[]): void {
  localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

export function dismissHabit(habitId: string): { updated: HabitItem[]; isAllClear: boolean } {
  const habits = loadHabitsState();
  const updated = habits.map((h) =>
    h.habit_id === habitId ? { ...h, currentReps: h.quota, isComplete: true } : h
  );
  saveHabitsState(updated);
  const isAllClear = updated.every((h) => h.isComplete);
  return { updated, isAllClear };
}

/**
 * Concise compact 2-line formatter for background scattered habits:
 * Line 1: action + amount (e.g. "push up 50")
 * Line 2: window / timing (e.g. "mrng", "nt", "daily")
 */
export function formatHabitCompact(habit: HabitItem): { line1: string; line2?: string } {
  let name = habit.name.trim();
  const lower = name.toLowerCase();

  const isMorning = lower.includes('mrng') || lower.includes('morning') || habit.circuit === 'morning';
  const isNight = lower.includes('nt') || lower.includes('night') || lower.includes('evening') || habit.circuit === 'evening';

  let cleanName = name
    .replace(/(push-ups|pushups)/gi, 'push up')
    .replace(/(pull-ups|pullups)/gi, 'pull up')
    .replace(/\s*\((mrng|nt|morning|night|evening)\)\s*/gi, '')
    .replace(/\s*(mrng|nt|morning|night|evening)\s*$/gi, '')
    .trim();

  // If number isn't in name, append quota
  if (!/\d/.test(cleanName) && habit.quota) {
    const unitSuffix = habit.unit === 'seconds' ? 's' : '';
    cleanName = `${cleanName} ${habit.quota}${unitSuffix}`;
  }

  const line1 = cleanName.toLowerCase();
  // Only show line 2 if it's morning or night. Once-daily habits don't need a second line!
  const line2 = isMorning ? 'morning' : isNight ? 'night' : undefined;

  return { line1, line2 };
}

export function getPowerReserve(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.POWER_RESERVE);
    if (val !== null) return Math.min(100, Math.max(10, parseInt(val, 10)));
  } catch (_) {}
  return 60; // Starting baseline 60%
}

export function addPowerReserve(ticks: number = 2): number {
  const current = getPowerReserve();
  const next = Math.min(100, Math.max(10, current + ticks));
  localStorage.setItem(STORAGE_KEYS.POWER_RESERVE, next.toString());
  return next;
}

/**
 * Direct ignition credit: when user completes an exercise during ignition,
 * credit matching habit quota immediately and clear it from the screen!
 */
export function creditHabitFromIgnition(exerciseName: string, reps: number): { updated: HabitItem[]; isAllClear: boolean } {
  const habits = loadHabitsState();
  const lowerName = exerciseName.toLowerCase();

  const updated = habits.map((h) => {
    const habitLower = h.name.toLowerCase();
    if (
      habitLower === lowerName ||
      habitLower.includes(lowerName) ||
      lowerName.includes(habitLower) ||
      (lowerName.includes('push') && habitLower.includes('push')) ||
      (lowerName.includes('squat') && habitLower.includes('squat')) ||
      (lowerName.includes('crun') && habitLower.includes('crun')) ||
      (lowerName.includes('pull') && habitLower.includes('pull')) ||
      (lowerName.includes('plank') && habitLower.includes('plank'))
    ) {
      const nextReps = Math.max(h.currentReps + reps, h.quota);
      return {
        ...h,
        currentReps: nextReps,
        isComplete: true,
      };
    }
    return h;
  });

  saveHabitsState(updated);
  const isAllClear = updated.every((h) => h.isComplete);
  return { updated, isAllClear };
}

/**
 * Ignition triggers sourced directly from uncleared habits with FULL quotas!
 */
export function getWeightedIgnitionPick(lastExercise?: string): { name: string; reps: number; unit: string; habitId?: string } {
  const habits = loadHabitsState();
  // Filter for uncleared habits
  const uncleared = habits.filter((h) => !h.isComplete);

  if (uncleared.length > 0) {
    // Pick an uncleared habit (preferring one different from lastExercise if possible)
    const options = uncleared.filter((h) => h.name !== lastExercise);
    const chosen = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : uncleared[0];
    return {
      name: chosen.name,
      reps: chosen.quota,
      unit: chosen.unit,
      habitId: chosen.habit_id,
    };
  }

  // Fallback when all habits are already cleared today:
  return {
    name: 'Movement Flush (Squats)',
    reps: 15,
    unit: 'reps',
  };
}
