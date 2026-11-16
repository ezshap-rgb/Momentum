/**
 * Focus App Phase 8: Paired Mode & 4-Week Experiment Manager
 * 
 * Computes metrics purely from event logs:
 * 1. Median time from DO to first action started
 * 2. Actions completed per counting day
 * 3. Not-now and neither taps per day
 * 4. Offers served with no action started within 5 minutes
 * 5. Day levels reached (light, standard, full)
 * 6. Average friction completed
 * 
 * Tracks 4-week experiment alternating by counting week:
 * Week 1: Assigned -> Week 2: Paired -> Week 3: Assigned -> Week 4: Paired
 * Inside a week, mode is locked. Manual overrides are logged as mode_override.
 */

import { FocusEvent, queueEvent } from './focusDataLayer';

export type ServeMode = 'assigned' | 'paired';

export interface ModeMetrics {
  mode: ServeMode;
  countingDaysCount: number;
  totalOffers: number;
  totalCompletedActions: number;
  actionsPerCountingDay: number;
  medianDoToActionSeconds: number | null;
  notNowNeitherCount: number;
  notNowNeitherPerDay: number;
  abandonedOffersCount: number; // No action started within 5 mins
  abandonedOfferRate: number; // percentage
  dayLevelsReached: {
    light: number;
    standard: number;
    full: number;
    total: number;
  };
  levelReachedPercentage: number;
  averageFrictionCompleted: number;
  hasSufficientData: boolean; // >= 10 counting days
}

export interface ExperimentComparison {
  assigned: ModeMetrics;
  paired: ModeMetrics;
  totalEventsProcessed: number;
  activeWeek: number;
  scheduledMode: ServeMode;
  isLocked: boolean;
  startDate: string;
}

const STORAGE_KEYS = {
  EXPERIMENT_START_DATE: 'focus_experiment_start_date',
  MANUAL_OVERRIDE_MODE: 'focus_experiment_override_mode',
  MANUAL_OVERRIDE_WEEK: 'focus_experiment_override_week',
};

const COUNTING_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

/**
 * Returns the Sunday start of the current week as YYYY-MM-DD
 */
export function getStartOfCountingWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday
  date.setDate(date.getDate() - day);
  return date.toISOString().split('T')[0];
}

/**
 * Gets or initializes the 4-week experiment start date
 */
export function getExperimentStartDate(): string {
  let stored = localStorage.getItem(STORAGE_KEYS.EXPERIMENT_START_DATE);
  if (!stored) {
    stored = getStartOfCountingWeek();
    localStorage.setItem(STORAGE_KEYS.EXPERIMENT_START_DATE, stored);
  }
  return stored;
}

/**
 * Resets the experiment start date
 */
export function setExperimentStartDate(dateStr: string) {
  localStorage.setItem(STORAGE_KEYS.EXPERIMENT_START_DATE, dateStr);
  localStorage.removeItem(STORAGE_KEYS.MANUAL_OVERRIDE_MODE);
  localStorage.removeItem(STORAGE_KEYS.MANUAL_OVERRIDE_WEEK);
}

/**
 * Calculates current experiment week (1, 2, 3, 4, or completed > 4)
 * Week 1: Assigned
 * Week 2: Paired
 * Week 3: Assigned
 * Week 4: Paired
 */
export function getExperimentScheduleStatus(currentDate: Date = new Date()): {
  weekNumber: number;
  scheduledMode: ServeMode;
  effectiveMode: ServeMode;
  isLocked: boolean;
  hasOverride: boolean;
  startDate: string;
} {
  const startDateStr = getExperimentStartDate();
  const start = new Date(startDateStr);
  const now = new Date(currentDate);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

  // Alternating schedule: odd weeks = assigned, even weeks = paired
  const scheduledMode: ServeMode = weekNumber % 2 === 1 ? 'assigned' : 'paired';

  const overrideMode = localStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDE_MODE) as ServeMode | null;
  const overrideWeek = localStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDE_WEEK);

  const hasOverride = !!(overrideMode && overrideWeek === String(weekNumber));
  const effectiveMode: ServeMode = hasOverride ? overrideMode! : scheduledMode;

  return {
    weekNumber: Math.min(4, weekNumber),
    scheduledMode,
    effectiveMode,
    isLocked: !hasOverride && weekNumber <= 4,
    hasOverride,
    startDate: startDateStr,
  };
}

/**
 * Manually override experiment mode for the current week and logs mode_override event
 */
export async function overrideExperimentMode(
  newMode: ServeMode,
  currentMode: ServeMode,
  reason: string = 'User manual override'
): Promise<void> {
  const status = getExperimentScheduleStatus();
  localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDE_MODE, newMode);
  localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDE_WEEK, String(status.weekNumber));

  await queueEvent('mode_override', {
    from_mode: currentMode,
    to_mode: newMode,
    week_number: status.weekNumber,
    scheduled_mode: status.scheduledMode,
    reason,
  });
}

/**
 * Helper to compute median of a number array
 */
function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return Math.round(sorted[mid]);
}

/**
 * Computes Experiment Metrics from Events alone
 */
export function computeExperimentMetrics(
  events: FocusEvent[],
  now: Date = new Date()
): ExperimentComparison {
  const schedule = getExperimentScheduleStatus(now);

  // Group events by mode
  // An event belongs to 'paired' if payload.mode === 'paired' or event happened during paired period
  const assignedEvents: FocusEvent[] = [];
  const pairedEvents: FocusEvent[] = [];

  for (const ev of events) {
    const mode = ev.payload?.mode;
    if (mode === 'paired') {
      pairedEvents.push(ev);
    } else if (mode === 'assigned') {
      assignedEvents.push(ev);
    } else {
      // Attribute by timestamp against experiment schedule if mode not explicitly in payload
      const evDate = new Date(ev.timestamp);
      const evStatus = getExperimentScheduleStatus(evDate);
      if (evStatus.effectiveMode === 'paired') {
        pairedEvents.push(ev);
      } else {
        assignedEvents.push(ev);
      }
    }
  }

  const computeForSlice = (sliceEvents: FocusEvent[], mode: ServeMode): ModeMetrics => {
    const countingDaysSet = new Set<string>();
    const doPressTimestamps: number[] = [];
    const doToActionLatencies: number[] = [];

    let totalOffers = 0;
    let completedActionsCount = 0;
    let notNowNeitherCount = 0;
    let frictionSum = 0;
    let abandonedOffersCount = 0;

    const dayLevels = {
      light: 0,
      standard: 0,
      full: 0,
      total: 0,
    };

    // Sort chronologically for sequence analysis
    const sorted = [...sliceEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i];
      const evTime = new Date(ev.timestamp);
      const dayName = evTime.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = evTime.toISOString().split('T')[0];

      if (COUNTING_DAYS.includes(dayName)) {
        countingDaysSet.add(dateStr);
      }

      if (ev.type === 'do_press') {
        doPressTimestamps.push(evTime.getTime());
      } else if (ev.type === 'action_started') {
        // Find most recent do_press within 30 minutes
        const actTime = evTime.getTime();
        const matchingDo = [...doPressTimestamps].reverse().find((t) => actTime >= t && actTime - t <= 30 * 60 * 1000);
        if (matchingDo) {
          const latencySec = (actTime - matchingDo) / 1000;
          doToActionLatencies.push(latencySec);
        }
      } else if (ev.type === 'action_completed') {
        completedActionsCount++;
        const fric = Number(ev.payload?.friction) || 2;
        frictionSum += fric;
      } else if (ev.type === 'not_now' || ev.type === 'offer_skipped') {
        notNowNeitherCount++;
      } else if (ev.type === 'offer_served') {
        totalOffers++;
        const offerTime = evTime.getTime();
        // Check if an action_started occurred within 5 minutes (300,000 ms)
        let startedWithin5Mins = false;
        for (let j = i + 1; j < sorted.length; j++) {
          const nextEv = sorted[j];
          const nextTime = new Date(nextEv.timestamp).getTime();
          if (nextTime - offerTime > 5 * 60 * 1000) break; // exceeded 5m
          if (nextEv.type === 'action_started') {
            startedWithin5Mins = true;
            break;
          }
        }
        if (!startedWithin5Mins) {
          abandonedOffersCount++;
        }
      } else if (ev.type === 'module_closed' || ev.type === 'day_committed') {
        if (ev.type === 'module_closed') {
          const level = ev.payload?.committed_level;
          if (level === 'light') dayLevels.light++;
          else if (level === 'standard') dayLevels.standard++;
          else if (level === 'full') dayLevels.full++;
          dayLevels.total++;
        }
      }
    }

    const countingDaysCount = countingDaysSet.size;
    const actionsPerCountingDay = countingDaysCount > 0 ? Number((completedActionsCount / countingDaysCount).toFixed(1)) : 0;
    const notNowNeitherPerDay = countingDaysCount > 0 ? Number((notNowNeitherCount / countingDaysCount).toFixed(1)) : 0;
    const averageFrictionCompleted = completedActionsCount > 0 ? Number((frictionSum / completedActionsCount).toFixed(2)) : 0;
    const medianDoToActionSeconds = computeMedian(doToActionLatencies);
    const abandonedOfferRate = totalOffers > 0 ? Number(((abandonedOffersCount / totalOffers) * 100).toFixed(1)) : 0;
    const levelReachedPercentage = countingDaysCount > 0 ? Number(((dayLevels.total / countingDaysCount) * 100).toFixed(0)) : 0;

    return {
      mode,
      countingDaysCount,
      totalOffers,
      totalCompletedActions: completedActionsCount,
      actionsPerCountingDay,
      medianDoToActionSeconds,
      notNowNeitherCount,
      notNowNeitherPerDay,
      abandonedOffersCount,
      abandonedOfferRate,
      dayLevelsReached: dayLevels,
      levelReachedPercentage,
      averageFrictionCompleted,
      hasSufficientData: countingDaysCount >= 10,
    };
  };

  return {
    assigned: computeForSlice(assignedEvents, 'assigned'),
    paired: computeForSlice(pairedEvents, 'paired'),
    totalEventsProcessed: events.length,
    activeWeek: schedule.weekNumber,
    scheduledMode: schedule.scheduledMode,
    isLocked: schedule.isLocked,
    startDate: schedule.startDate,
  };
}

/**
 * Built-in self test using synthetic event dataset to verify exact hand-calculated results
 */
export function runExperimentSelfTest(): {
  passed: boolean;
  calculated: ExperimentComparison;
  expected: {
    assignedCompleted: number;
    assignedAvgFriction: number;
    assignedMedianLatencySec: number;
    pairedCompleted: number;
    pairedAbandonedCount: number;
  };
} {
  const baseDate = new Date('2026-11-15T09:00:00.000Z'); // Sunday (Counting Day)
  const syntheticEvents: FocusEvent[] = [
    // Assigned: DO press at 09:00:00
    {
      event_id: 'test_1',
      timestamp: new Date(baseDate.getTime()).toISOString(),
      device: 'desktop',
      type: 'do_press',
      payload: { mode: 'assigned' },
      schema_version: '1.0',
    },
    // Assigned: Offer served at 09:00:10
    {
      event_id: 'test_2',
      timestamp: new Date(baseDate.getTime() + 10 * 1000).toISOString(),
      device: 'desktop',
      type: 'offer_served',
      payload: { mode: 'assigned' },
      schema_version: '1.0',
    },
    // Assigned: Action started at 09:00:20 (20s latency)
    {
      event_id: 'test_3',
      timestamp: new Date(baseDate.getTime() + 20 * 1000).toISOString(),
      device: 'desktop',
      type: 'action_started',
      payload: { mode: 'assigned' },
      schema_version: '1.0',
    },
    // Assigned: Action completed at 09:15:00 with friction 3
    {
      event_id: 'test_4',
      timestamp: new Date(baseDate.getTime() + 15 * 60 * 1000).toISOString(),
      device: 'desktop',
      type: 'action_completed',
      payload: { mode: 'assigned', friction: 3 },
      schema_version: '1.0',
    },
    // Paired: DO press at 10:00:00
    {
      event_id: 'test_5',
      timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(),
      device: 'desktop',
      type: 'do_press',
      payload: { mode: 'paired' },
      schema_version: '1.0',
    },
    // Paired: Offer served at 10:00:05
    {
      event_id: 'test_6',
      timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000 + 5 * 1000).toISOString(),
      device: 'desktop',
      type: 'offer_served',
      payload: { mode: 'paired' },
      schema_version: '1.0',
    },
    // Paired: Not now tapped (no action started in 5 mins -> counts as abandoned offer too)
    {
      event_id: 'test_7',
      timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000 + 15 * 1000).toISOString(),
      device: 'desktop',
      type: 'not_now',
      payload: { mode: 'paired', reason: 'neither' },
      schema_version: '1.0',
    },
  ];

  const calculated = computeExperimentMetrics(syntheticEvents, baseDate);

  const expected = {
    assignedCompleted: 1,
    assignedAvgFriction: 3,
    assignedMedianLatencySec: 20,
    pairedCompleted: 0,
    pairedAbandonedCount: 1,
  };

  const passed =
    calculated.assigned.totalCompletedActions === expected.assignedCompleted &&
    calculated.assigned.averageFrictionCompleted === expected.assignedAvgFriction &&
    calculated.assigned.medianDoToActionSeconds === expected.assignedMedianLatencySec &&
    calculated.paired.totalCompletedActions === expected.pairedCompleted &&
    calculated.paired.abandonedOffersCount === expected.pairedAbandonedCount;

  return { passed, calculated, expected };
}
