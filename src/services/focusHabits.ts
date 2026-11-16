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
  { habit_id: 'pushups', name: 'Push-ups', half: 'A', circuit: 'both', quota: 15, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'squats', name: 'Squats', half: 'A', circuit: 'both', quota: 20, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'plank', name: 'Plank', half: 'A', circuit: 'both', quota: 45, unit: 'seconds', currentReps: 0, isComplete: false },
  { habit_id: 'hip_mobility', name: 'Hip Mobility Cycle', half: 'A', circuit: 'both', quota: 1, unit: 'cycle', currentReps: 0, isComplete: false },
  // Half B
  { habit_id: 'pullups', name: 'Pull-ups', half: 'B', circuit: 'both', quota: 8, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'crunches', name: 'Crunches', half: 'B', circuit: 'both', quota: 20, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'reverse_plank', name: 'Reverse Plank', half: 'B', circuit: 'both', quota: 30, unit: 'seconds', currentReps: 0, isComplete: false },
];

const STORAGE_KEYS = {
  HABITS: 'focus_habits_state',
  POWER_RESERVE: 'focus_power_reserve',
  LAST_RESERVE_DATE: 'focus_last_reserve_date',
};

export function loadHabitsState(): HabitItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return INITIAL_HABITS.map((h) => ({ ...h }));
}

export function saveHabitsState(habits: HabitItem[]): void {
  localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
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
 * credit matching habit quota immediately!
 */
export function creditHabitFromIgnition(exerciseName: string, reps: number): HabitItem[] {
  const habits = loadHabitsState();
  const lowerName = exerciseName.toLowerCase();

  const updated = habits.map((h) => {
    if (h.name.toLowerCase().includes(lowerName) || lowerName.includes(h.name.toLowerCase())) {
      const nextReps = h.currentReps + reps;
      return {
        ...h,
        currentReps: nextReps,
        isComplete: nextReps >= h.quota,
      };
    }
    return h;
  });

  saveHabitsState(updated);
  return updated;
}

/**
 * Weighted random ignition pick:
 * weight = remaining quota fraction + 0.2, so it stays random but leans toward what is owed.
 */
export function getWeightedIgnitionPick(lastExercise?: string): { name: string; reps: number; unit: string } {
  const habits = loadHabitsState();
  const candidates = [
    { name: 'Push-ups', reps: 10, unit: 'reps', habitId: 'pushups' },
    { name: 'Crunches', reps: 15, unit: 'reps', habitId: 'crunches' },
    { name: 'Squats', reps: 15, unit: 'reps', habitId: 'squats' },
    { name: 'Jumping Jacks', reps: 20, unit: 'reps', habitId: null }, // constant
  ].filter((c) => c.name !== lastExercise);

  // Compute weights
  const weighted = candidates.map((cand) => {
    let weight = 0.2;
    if (cand.habitId) {
      const h = habits.find((it) => it.habit_id === cand.habitId);
      if (h && !h.isComplete) {
        const remainingFraction = Math.max(0, (h.quota - h.currentReps) / h.quota);
        weight += remainingFraction * 0.8;
      }
    } else {
      weight = 0.35; // Jumping Jacks baseline
    }
    return { cand, weight };
  });

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of weighted) {
    if (randomVal < item.weight) {
      return item.cand;
    }
    randomVal -= item.weight;
  }

  return candidates[0];
}
