/**
 * Focus App Phase 11: Weeks, Months, Weekends & Watchmaker Collection
 * 
 * 1. 5 Daily Modules assemble into 1 Weekly Movement (closing Thursday night).
 * 2. Unfinished modules carry over within the week; off-days are cleanly skipped.
 * 3. Weekend extras: every 8 work points on off-days upgrades one part's finish (polish),
 *    and 16 work points unlocks a Complication slot.
 * 4. Project Complication: finishing a project's final step adds a complication to the week.
 * 5. 4 Completed Weeks = 1 Collectible Watch (unlocks case -> dial -> hands -> crystal/crown).
 */

import { DayModule, WatchPart, FinishGrade } from './focusMovement';
import { queueEvent } from './focusDataLayer';

export interface WeeklyMovement {
  week_id: string; // e.g. "week_2026_W46"
  start_date: string; // Sunday YYYY-MM-DD
  end_date: string; // Saturday YYYY-MM-DD
  modules: Record<string, DayModule>; // Sun, Mon, Tue, Wed, Thu
  weekend_work_points: number;
  polish_upgrades_count: number;
  complications: string[];
  is_closed: boolean;
  closed_at?: string;
}

export interface CollectibleWatch {
  watch_id: string;
  name: string;
  caliber: string;
  completed_weeks_count: number; // 0 to 4
  unlocked_components: {
    case: boolean;
    dial: boolean;
    hands: boolean;
    crystal_crown: boolean;
  };
  case_material: 'Steel' | 'Titanium' | 'Rose Gold' | 'Platinum';
  dial_style: 'Minimal Enamel' | 'Sunburst Blue' | 'Guilloché Silver' | 'Skeleton Openwork';
  complications: string[];
  parts_count: number;
  finish_summary: string;
  completed_at?: string;
}

const STORAGE_KEYS = {
  CURRENT_WEEKLY_MOVEMENT: 'focus_weekly_movement',
  WATCH_COLLECTION: 'focus_watch_collection',
  ACTIVE_WATCH: 'focus_active_crafting_watch',
  LAST_FRIDAY_SUMMARY_DATE: 'focus_last_friday_summary_date',
};

const FINISH_GRADE_ORDER: FinishGrade[] = ['functional', 'brushed', 'decorated', 'hand-finished'];

/**
 * Returns ISO week string like "2026-W46"
 */
export function getWeekId(d: Date = new Date()): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Gets or initializes the current weekly movement
 */
export function getCurrentWeeklyMovement(now: Date = new Date()): WeeklyMovement {
  const weekId = getWeekId(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_WEEKLY_MOVEMENT);
    if (raw) {
      const parsed: WeeklyMovement = JSON.parse(raw);
      if (parsed.week_id === weekId) {
        return parsed;
      }
    }
  } catch (_) {}

  // Calculate Sunday start of the week
  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() + 6);

  const newMovement: WeeklyMovement = {
    week_id: weekId,
    start_date: sunday.toISOString().split('T')[0],
    end_date: saturday.toISOString().split('T')[0],
    modules: {},
    weekend_work_points: 0,
    polish_upgrades_count: 0,
    complications: [],
    is_closed: false,
  };

  saveWeeklyMovement(newMovement);
  return newMovement;
}

export function saveWeeklyMovement(movement: WeeklyMovement): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_WEEKLY_MOVEMENT, JSON.stringify(movement));
}

/**
 * Applies weekend or off-day work to Polish the current movement
 * - Every 8 work points upgrades one part of that week's movement by 1 finish grade
 * - First 16 work points unlocks a Complication slot
 */
export async function recordOffDayPolish(workPoints: number): Promise<{
  upgradesAdded: number;
  complicationUnlocked: boolean;
}> {
  const movement = getCurrentWeeklyMovement();
  const prevWork = movement.weekend_work_points;
  const newWork = prevWork + workPoints;
  movement.weekend_work_points = newWork;

  const prevUpgrades = Math.floor(prevWork / 8);
  const newUpgrades = Math.floor(newWork / 8);
  const upgradesToAdd = Math.max(0, newUpgrades - prevUpgrades);

  let complicationUnlocked = false;
  if (prevWork < 16 && newWork >= 16 && !movement.complications.includes('Weekend Moonphase Complication')) {
    movement.complications.push('Weekend Moonphase Complication');
    complicationUnlocked = true;
    await queueEvent('complication_unlocked', {
      type: 'weekend_reward',
      name: 'Weekend Moonphase Complication',
      week_id: movement.week_id,
    });
  }

  if (upgradesToAdd > 0) {
    // Find parts in modules to upgrade to next finish grade
    let upgradesRemaining = upgradesToAdd;
    for (const mod of Object.values(movement.modules)) {
      for (const part of mod.parts) {
        if (upgradesRemaining <= 0) break;
        const currentIdx = FINISH_GRADE_ORDER.indexOf(part.finish_grade);
        if (currentIdx < FINISH_GRADE_ORDER.length - 1) {
          part.finish_grade = FINISH_GRADE_ORDER[currentIdx + 1];
          movement.polish_upgrades_count++;
          upgradesRemaining--;
        }
      }
    }
  }

  saveWeeklyMovement(movement);
  return { upgradesAdded: upgradesToAdd, complicationUnlocked };
}

/**
 * Adds a project complication when a long-term project's final task is completed
 */
export async function addProjectComplication(projectTitle: string): Promise<void> {
  const movement = getCurrentWeeklyMovement();
  const compName = `Project Milstone: ${projectTitle}`;
  if (!movement.complications.includes(compName)) {
    movement.complications.push(compName);
    saveWeeklyMovement(movement);

    await queueEvent('complication_unlocked', {
      type: 'project_milestone',
      project_title: projectTitle,
      week_id: movement.week_id,
    });
  }
}

/**
 * Gets or initializes the watch currently being crafted (4 weeks to assemble)
 */
export function getActiveCraftingWatch(): CollectibleWatch {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_WATCH);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  const collection = getWatchCollection();
  const nextNum = collection.length + 1;

  const initialWatch: CollectibleWatch = {
    watch_id: 'watch_' + Date.now(),
    name: `Caliber ${nextNum} Chronometer`,
    caliber: `AG-${(nextNum * 101).toString()}`,
    completed_weeks_count: 0,
    unlocked_components: {
      case: false,
      dial: false,
      hands: false,
      crystal_crown: false,
    },
    case_material: nextNum % 2 === 0 ? 'Titanium' : 'Steel',
    dial_style: nextNum % 2 === 0 ? 'Sunburst Blue' : 'Guilloché Silver',
    complications: [],
    parts_count: 0,
    finish_summary: 'Starting assembly',
  };

  saveActiveCraftingWatch(initialWatch);
  return initialWatch;
}

export function saveActiveCraftingWatch(watch: CollectibleWatch): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_WATCH, JSON.stringify(watch));
}

export function getWatchCollection(): CollectibleWatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_COLLECTION);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveWatchCollection(collection: CollectibleWatch[]): void {
  localStorage.setItem(STORAGE_KEYS.WATCH_COLLECTION, JSON.stringify(collection));
}

/**
 * Closes the weekly movement and advances the watch crafting progress!
 * 4 completed movements crafts the timepiece into the collection vault.
 */
export async function completeWeeklyMovement(): Promise<{
  watch: CollectibleWatch;
  isWatchFinished: boolean;
}> {
  const movement = getCurrentWeeklyMovement();
  movement.is_closed = true;
  movement.closed_at = new Date().toISOString();
  saveWeeklyMovement(movement);

  const watch = getActiveCraftingWatch();
  watch.completed_weeks_count = Math.min(4, watch.completed_weeks_count + 1);

  // Progressive unlock of components
  if (watch.completed_weeks_count >= 1) watch.unlocked_components.case = true;
  if (watch.completed_weeks_count >= 2) watch.unlocked_components.dial = true;
  if (watch.completed_weeks_count >= 3) watch.unlocked_components.hands = true;
  if (watch.completed_weeks_count >= 4) watch.unlocked_components.crystal_crown = true;

  // Aggregate complications and parts
  if (movement.complications.length > 0) {
    watch.complications = Array.from(new Set([...watch.complications, ...movement.complications]));
  }

  // Count parts in this week
  let weeklyParts = 0;
  for (const m of Object.values(movement.modules)) {
    weeklyParts += m.parts.length;
  }
  watch.parts_count += weeklyParts;

  let isWatchFinished = false;
  if (watch.completed_weeks_count >= 4) {
    watch.completed_at = new Date().toISOString();
    watch.finish_summary = `${watch.parts_count} Hand-Fitted Parts · ${watch.complications.length} Complications`;
    isWatchFinished = true;

    // Archive to collection
    const collection = getWatchCollection();
    saveWatchCollection([watch, ...collection]);

    // Create next watch template
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_WATCH);

    await queueEvent('watch_completed', {
      watch_id: watch.watch_id,
      name: watch.name,
      caliber: watch.caliber,
      parts_count: watch.parts_count,
      complications: watch.complications,
    });
  } else {
    watch.finish_summary = `Week ${watch.completed_weeks_count}/4 completed (${watch.parts_count} parts assembled)`;
    saveActiveCraftingWatch(watch);
  }

  await queueEvent('week_movement_closed', {
    week_id: movement.week_id,
    weeks_towards_watch: watch.completed_weeks_count,
    is_watch_finished: isWatchFinished,
  });

  return { watch, isWatchFinished };
}

/**
 * Checks if Friday morning summary should be presented
 */
export function isFridayMorning(): boolean {
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const todayStr = now.toISOString().split('T')[0];
  const lastShown = localStorage.getItem(STORAGE_KEYS.LAST_FRIDAY_SUMMARY_DATE);
  return isFriday && lastShown !== todayStr;
}

export function markFridaySummarySeen(): void {
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(STORAGE_KEYS.LAST_FRIDAY_SUMMARY_DATE, todayStr);
}
