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
  schedule?: string | null;
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
  { habit_id: 'pushups_mrng', name: 'Push-ups 50 (mrng)', schedule: 'Daily Morning', half: 'A', circuit: 'morning', quota: 50, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'pushups_nt', name: 'Push-ups 50 (nt)', schedule: 'Daily Night', half: 'A', circuit: 'evening', quota: 50, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'squats', name: 'Squats 30', schedule: 'Daily', half: 'A', circuit: 'both', quota: 30, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'plank', name: 'Plank 60s', schedule: 'Daily', half: 'A', circuit: 'both', quota: 60, unit: 'seconds', currentReps: 0, isComplete: false },
  { habit_id: 'hip_mobility', name: 'Hip Mobility 1', schedule: 'Daily', half: 'A', circuit: 'both', quota: 1, unit: 'cycle', currentReps: 0, isComplete: false },
  // Half B
  { habit_id: 'pullups', name: 'Pull-ups 10', schedule: 'Daily', half: 'B', circuit: 'both', quota: 10, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'crunches', name: 'Crunches 30', schedule: 'Daily', half: 'B', circuit: 'both', quota: 30, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'reverse_plank', name: 'Reverse Plank 45s', schedule: 'Daily', half: 'B', circuit: 'both', quota: 45, unit: 'seconds', currentReps: 0, isComplete: false },
];

const STORAGE_KEYS = {
  HABITS: 'focus_habits_state_v3',
  LAST_HABITS_DATE: 'focus_last_habits_date',
  POWER_RESERVE: 'focus_power_reserve',
  LAST_RESERVE_DATE: 'focus_last_reserve_date',
};

export function formatLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDateString(): string {
  return formatLocalDateString(new Date());
}

export function loadHabitsState(): HabitItem[] {
  const today = getTodayDateString();
  const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_HABITS_DATE);

  // Clean legacy cached keys with old quotas
  try {
    localStorage.removeItem('focus_habits_state');
    localStorage.removeItem('focus_habits_state_v2');
  } catch (_) {}

  let habits: HabitItem[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
    if (raw) habits = JSON.parse(raw);
  } catch (_) {}

  // Check if cache contains outdated quotas (e.g. 15 pushups, 20 squats)
  const hasStaleQuotas = habits.some(
    (h) =>
      (h.name.toLowerCase().includes('push') && h.quota < 50) ||
      (h.name.toLowerCase().includes('squat') && h.quota < 30) ||
      (h.name.toLowerCase().includes('plank') && !h.name.toLowerCase().includes('reverse') && h.quota < 60)
  );

  if (!habits || habits.length === 0 || hasStaleQuotas) {
    const completedSet = new Set(habits.filter((h) => h.isComplete).map((h) => h.habit_id));
    habits = INITIAL_HABITS.map((h) => ({
      ...h,
      isComplete: completedSet.has(h.habit_id),
      currentReps: completedSet.has(h.habit_id) ? h.quota : 0,
    }));
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
 * Parses a habit from Google Tasks or Board into a HabitItem with extracted quota & unit
 */
export function parseHabitToHabitItem(
  habit: { id: string; name: string; target?: number; next_due?: string | null; log?: Record<string, any> },
  isCompleteToday: boolean
): HabitItem {
  const lower = habit.name.toLowerCase();
  const schedLower = (habit.next_due || '').toLowerCase();

  const isMorning =
    lower.includes('mrng') ||
    lower.includes('morning') ||
    schedLower.includes('morning') ||
    schedLower.includes('mrng') ||
    schedLower.includes('am');

  const isNight =
    lower.includes('nt') ||
    lower.includes('night') ||
    lower.includes('evening') ||
    schedLower.includes('night') ||
    schedLower.includes('nt') ||
    schedLower.includes('evening') ||
    schedLower.includes('pm');

  const circuit: 'morning' | 'evening' | 'both' = isMorning ? 'morning' : isNight ? 'evening' : 'both';

  const numMatch = habit.name.match(/\b(\d+)\b/);
  let quota = numMatch ? parseInt(numMatch[1], 10) : habit.target && habit.target > 1 ? habit.target : 30;

  if (quota <= 1) {
    if (lower.includes('push')) quota = 50;
    else if (lower.includes('squat')) quota = 30;
    else if (lower.includes('crun')) quota = 30;
    else if (lower.includes('pull')) quota = 10;
    else if (lower.includes('plank')) quota = lower.includes('reverse') ? 45 : 60;
    else if (lower.includes('mobility')) quota = 1;
    else quota = 20;
  }

  let unit: 'reps' | 'seconds' | 'cycle' = 'reps';
  if (/second|sec|\bs\b/i.test(habit.name)) {
    unit = 'seconds';
  } else if (/cycle/i.test(habit.name)) {
    unit = 'cycle';
  }

  return {
    habit_id: habit.id,
    name: habit.name,
    half: 'A',
    circuit,
    schedule: habit.next_due || null,
    quota,
    unit,
    currentReps: isCompleteToday ? quota : 0,
    isComplete: isCompleteToday,
  };
}

/**
 * Synchronizes habits with live Google Tasks / Board habits
 */
export function syncHabitsWithBoardData(
  boardHabits?: Array<{ id: string; name: string; target?: number; next_due?: string | null; log?: Record<string, any> }>
): HabitItem[] {
  const today = getTodayDateString();

  if (boardHabits && boardHabits.length > 0) {
    const updated = boardHabits.map((bh) => {
      const todayVal = bh.log ? bh.log[today] : undefined;
      const isDoneToday = Boolean(
        typeof todayVal === 'number' ? todayVal > 0 : todayVal
      );
      return parseHabitToHabitItem(bh, isDoneToday);
    });
    saveHabitsState(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_HABITS_DATE, today);
    } catch (_) {}
    return updated;
  }

  return loadHabitsState();
}

/**
 * Formats an exercise name for display on the Physical Ignition screen:
 * Extracts clean title and optional subtitle (e.g. "Morning", "Night")
 * Pulls timing from schedule (cadence) if not in the title!
 */
export function formatExerciseDisplay(
  name: string,
  schedule?: string | null,
  circuit?: string
): { title: string; subtitle?: string } {
  let title = name
    .replace(/\b\d+(\s*(s|sec|seconds|reps|m|min))?\b/gi, '')
    .replace(/\s*\((mrng|nt|morning|night|evening)\)\s*/gi, '')
    .replace(/\s*(mrng|nt|morning|night|evening)\s*$/gi, '')
    .replace(/^(morning|night|evening)\s+/gi, '')
    .trim();

  // Capitalize properly
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const lower = name.toLowerCase();
  const schedLower = (schedule || '').toLowerCase();

  let subtitle: string | undefined = undefined;
  if (
    lower.includes('mrng') ||
    lower.includes('morning') ||
    schedLower.includes('morning') ||
    schedLower.includes('mrng') ||
    circuit === 'morning'
  ) {
    subtitle = 'Morning';
  } else if (
    lower.includes('nt') ||
    lower.includes('night') ||
    lower.includes('evening') ||
    schedLower.includes('night') ||
    schedLower.includes('nt') ||
    schedLower.includes('evening') ||
    circuit === 'evening'
  ) {
    subtitle = 'Night';
  }

  return { title, subtitle };
}

/**
 * Concise compact 2-line formatter for background scattered habits:
 * Line 1: action + amount (e.g. "push up 50")
 * Line 2: window / timing (e.g. "morning", "night")
 * Pulls morning/night from schedule (next_due) if not in title!
 */
export function formatHabitCompact(habit: HabitItem): { line1: string; line2?: string } {
  let name = habit.name.trim();
  const lower = name.toLowerCase();
  const schedLower = (habit.schedule || '').toLowerCase();

  const isMorning =
    lower.includes('mrng') ||
    lower.includes('morning') ||
    schedLower.includes('morning') ||
    schedLower.includes('mrng') ||
    habit.circuit === 'morning';

  const isNight =
    lower.includes('nt') ||
    lower.includes('night') ||
    lower.includes('evening') ||
    schedLower.includes('night') ||
    schedLower.includes('nt') ||
    schedLower.includes('evening') ||
    habit.circuit === 'evening';

  let cleanName = name
    .replace(/(push-ups|pushups)/gi, 'push up')
    .replace(/(pull-ups|pullups)/gi, 'pull up')
    .replace(/\s*\((mrng|nt|morning|night|evening)\)\s*/gi, '')
    .replace(/\s*(mrng|nt|morning|night|evening)\s*$/gi, '')
    .replace(/^(morning|night|evening)\s+/gi, '')
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
 * credit the single matching habit quota immediately and clear it from the screen.
 */
export function creditHabitFromIgnition(
  exerciseName: string,
  reps: number,
  habitId?: string
): { updated: HabitItem[]; isAllClear: boolean } {
  const habits = loadHabitsState();
  const lowerName = exerciseName.toLowerCase().trim();

  let matchIdx = habitId ? habits.findIndex((h) => h.habit_id === habitId) : -1;
  if (matchIdx === -1) {
    matchIdx = habits.findIndex((h) => h.name.toLowerCase().trim() === lowerName);
  }
  if (matchIdx === -1) {
    const baseName = lowerName
      .replace(/\s*\((?:mrng|nt|morning|night|evening)\)\s*/gi, '')
      .trim();
    matchIdx = habits.findIndex(
      (h) =>
        !h.isComplete &&
        (h.name.toLowerCase().includes(lowerName) ||
          lowerName.includes(h.name.toLowerCase()) ||
          (baseName.length > 0 && h.name.toLowerCase().includes(baseName)))
    );
    if (matchIdx === -1) {
      matchIdx = habits.findIndex(
        (h) => h.name.toLowerCase().includes(lowerName) || lowerName.includes(h.name.toLowerCase())
      );
    }
  }

  const updated = habits.map((h, idx) => {
    if (idx === matchIdx) {
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
export function getWeightedIgnitionPick(lastExercise?: string): {
  name: string;
  reps: number;
  unit: string;
  habitId?: string;
  schedule?: string | null;
  circuit?: 'morning' | 'evening' | 'both';
} {
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
      schedule: chosen.schedule,
      circuit: chosen.circuit,
    };
  }

  // When all habits are already cleared today, cycle through the daily habits:
  const options = habits.filter((h) => h.name !== lastExercise);
  const chosen = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : habits[0] || INITIAL_HABITS[0];
  return {
    name: chosen.name,
    reps: chosen.quota,
    unit: chosen.unit,
    habitId: chosen.habit_id,
    schedule: chosen.schedule,
    circuit: chosen.circuit,
  };
}
