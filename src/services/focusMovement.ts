/**
 * Focus App Rewards & Mechanical Watch Movement Model
 * 
 * Part sizes: 1=screw, 2=jewel, 3=wheel, 4=bridge, 5=barrel
 * Finish grades: functional, brushed, decorated, hand-finished
 */

import { getCountingDaysDifference, DEFAULT_SERVING_SETTINGS } from './focusAlgorithm';

export type PartSize = 'screw' | 'jewel' | 'wheel' | 'bridge' | 'barrel';
export type FinishGrade = 'functional' | 'brushed' | 'decorated' | 'hand-finished';
export type DayCommitmentLevel = 'light' | 'standard' | 'full';

export interface WatchPart {
  part_id: string;
  name: string;
  part_size: PartSize;
  finish_grade: FinishGrade;
  action_id: string;
  action_title: string;
  work_value: number;
  earned_at: string;
}

export interface DayModule {
  day_name: string; // 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'
  module_name: string; // e.g. 'Barrel & Mainspring', 'Going Train', etc.
  date: string; // YYYY-MM-DD
  committed_level: DayCommitmentLevel;
  committed_work_points: number;
  total_work_done: number;
  parts: WatchPart[];
  is_closed: boolean;
  can_lower_commitment: boolean; // can lower once without penalty
}

export const DAY_MODULE_NAMES: Record<string, string> = {
  Sun: 'Barrel & Mainspring',
  Mon: 'Going Train',
  Tue: 'Escapement & Pallet',
  Wed: 'Balance & Hairspring',
  Thu: 'Keyless Works',
  Fri: 'Bench (Off Day)',
  Sat: 'Bench (Off Day)',
};

export const COMMITMENT_POINTS: Record<DayCommitmentLevel, number> = {
  light: 8,
  standard: 16,
  full: 26,
};

export const FRICTION_WORK_VALUES: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 8,
};

/**
 * Computes work points for a completed action
 */
export function calculateWorkValue(friction: number, importance?: string): number {
  const base = FRICTION_WORK_VALUES[friction] || 2;
  const bonus = importance === 'high' ? 1 : 0;
  return base + bonus;
}

/**
 * Computes the part size corresponding to friction
 */
export function getPartSizeForFriction(friction: number): PartSize {
  switch (friction) {
    case 1:
      return 'screw';
    case 2:
      return 'jewel';
    case 3:
      return 'wheel';
    case 4:
      return 'bridge';
    case 5:
    default:
      return 'barrel';
  }
}

/**
 * Computes the finish grade based on earliness using counting days and completion timestamp
 * - Overdue: functional
 * - Due today or tomorrow (or no deadline): brushed
 * - 2-6 counting days early (or finished within 48h of capture): decorated
 * - 7+ counting days early: hand-finished
 */
export function calculateFinishGrade(
  dueDateStr?: string,
  completionOrCreatedStr?: string,
  now: Date = new Date(),
  countingDays: string[] = DEFAULT_SERVING_SETTINGS.countingDays
): FinishGrade {
  if (!dueDateStr) {
    if (completionOrCreatedStr) {
      const createdOrComp = new Date(completionOrCreatedStr).getTime();
      const diffHours = (now.getTime() - createdOrComp) / (1000 * 60 * 60);
      if (diffHours >= 0 && diffHours <= 48) return 'decorated';
    }
    return 'brushed';
  }

  // Use the completion event's timestamp if provided, else fallback to now
  const completionDate = completionOrCreatedStr && !isNaN(Date.parse(completionOrCreatedStr))
    ? new Date(completionOrCreatedStr)
    : now;

  const due = new Date(dueDateStr);
  due.setHours(23, 59, 59, 999);

  if (completionDate.getTime() > due.getTime()) {
    return 'functional'; // Overdue rescue
  }

  // Count counting days early
  const countingDaysEarly = getCountingDaysDifference(completionDate, due, countingDays);

  if (countingDaysEarly <= 1) {
    return 'brushed'; // due today or tomorrow
  } else if (countingDaysEarly <= 6) {
    return 'decorated'; // 2-6 counting days early
  } else {
    return 'hand-finished'; // 7+ counting days early
  }
}

/**
 * Visual styles for finish grades
 */
export function getFinishGradeStyles(grade: FinishGrade) {
  switch (grade) {
    case 'hand-finished':
      return {
        label: 'Hand-Finished',
        border: 'border-amber-300 shadow-md shadow-amber-400/30',
        bg: 'bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500',
        text: 'text-amber-900',
        shimmer: 'ring-1 ring-amber-300',
      };
    case 'decorated':
      return {
        label: 'Decorated',
        border: 'border-purple-400 shadow-sm shadow-purple-500/30',
        bg: 'bg-gradient-to-tr from-purple-500 via-indigo-300 to-purple-600',
        text: 'text-white',
        shimmer: 'ring-1 ring-purple-400',
      };
    case 'brushed':
      return {
        label: 'Brushed Metal',
        border: 'border-slate-400',
        bg: 'bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-400',
        text: 'text-slate-800',
        shimmer: '',
      };
    case 'functional':
    default:
      return {
        label: 'Functional',
        border: 'border-slate-600',
        bg: 'bg-gradient-to-tr from-slate-600 via-slate-700 to-slate-800',
        text: 'text-slate-300',
        shimmer: '',
      };
  }
}
