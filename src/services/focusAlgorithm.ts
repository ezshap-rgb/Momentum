import { FocusAction } from './focusServing';

export interface ServingSettings {
  countingDays: string[]; // e.g. ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']
  firstOfferTargetFriction: number; // 2
  targetCeiling: number; // 4
  fatigueActionCount: number; // 5
  fatigueActiveMinutes: number; // 90
  smallerTapsBeforeShrink: number; // 2
  importanceBonusHigh: number; // 5
  importanceBonusMed: number; // 2
  importanceBonusLow: number; // 0
  ageBonusPerDay: number; // 0.5
  ageBonusMax: number; // 4
  heartbeatBonus: number; // 3
  varietyPenalty: number; // -3
}

export const DEFAULT_SERVING_SETTINGS: ServingSettings = {
  countingDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  firstOfferTargetFriction: 2,
  targetCeiling: 4,
  fatigueActionCount: 5,
  fatigueActiveMinutes: 90,
  smallerTapsBeforeShrink: 2,
  importanceBonusHigh: 5,
  importanceBonusMed: 2,
  importanceBonusLow: 0,
  ageBonusPerDay: 0.5,
  ageBonusMax: 4,
  heartbeatBonus: 3,
  varietyPenalty: -3,
};

export interface SessionContext {
  completedActions: FocusAction[];
  totalActiveMinutes: number;
  tapShift: number; // accumulated shift from smaller/bigger
  consecutiveSmallerTaps: number;
  fewerRepsTapped: boolean;
  reservedSlotUsedToday: boolean;
  stretchProbeUsedToday: boolean;
  skippedTaskIds: Set<string>;
  lastCompletedType?: string;
  now?: Date;
}

export interface CandidateScore {
  action: FocusAction;
  totalScore: number;
  targetFriction: number;
  effectiveFriction: number;
  urgencyScore: number;
  importanceScore: number;
  ageScore: number;
  heartbeatScore: number;
  varietyScore: number;
  isTripwire: boolean;
  isReservedSlot: boolean;
  reasons: string[];
}

/**
 * Checks whether today is a counting day (Sun-Thu)
 */
export function isCountingDay(date: Date = new Date(), countingDays: string[] = DEFAULT_SERVING_SETTINGS.countingDays): boolean {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  return countingDays.includes(dayName);
}

/**
 * Calculates counting days between two dates, excluding Friday & Saturday (or non-counting days)
 */
export function getCountingDaysDifference(from: Date, to: Date, countingDays: string[] = DEFAULT_SERVING_SETTINGS.countingDays): number {
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const target = new Date(to);
  target.setHours(0, 0, 0, 0);

  if (cur.getTime() >= target.getTime()) return 0;

  let days = 0;
  while (cur.getTime() < target.getTime()) {
    cur.setDate(cur.getDate() + 1);
    const dayName = cur.toLocaleDateString('en-US', { weekday: 'short' });
    if (countingDays.includes(dayName)) {
      days++;
    }
  }
  return days;
}

/**
 * Step 1: Compute Target Friction
 */
export function computeTargetFriction(
  ctx: SessionContext,
  settings: ServingSettings = DEFAULT_SERVING_SETTINGS
): { target: number; reasons: string[]; isStretch: boolean } {
  let target = settings.firstOfferTargetFriction;
  const reasons: string[] = [];

  // 1. Baseline ramp (+1 per completion up to ceiling)
  const completions = ctx.completedActions.length;
  if (completions > 0) {
    const rampAdd = Math.min(settings.targetCeiling - target, completions);
    target += rampAdd;
    reasons.push(`Baseline ramp (+${rampAdd} from ${completions} completions)`);
  }

  // 2. Fatigue easing (-1 after 5 actions or 90 active minutes)
  if (completions >= settings.fatigueActionCount || ctx.totalActiveMinutes >= settings.fatigueActiveMinutes) {
    target = Math.max(1, target - 1);
    reasons.push('Fatigue easing applied (-1)');
  }

  // 3. User tap shift (smaller/bigger), fading by 1 for every 3 completions
  const fade = Math.floor(completions / 3);
  let effectiveTapShift = ctx.tapShift;
  if (effectiveTapShift > 0) effectiveTapShift = Math.max(0, effectiveTapShift - fade);
  if (effectiveTapShift < 0) effectiveTapShift = Math.min(0, effectiveTapShift + fade);

  if (effectiveTapShift !== 0) {
    target = Math.max(1, Math.min(settings.targetCeiling, target + effectiveTapShift));
    reasons.push(`User tap shift (${effectiveTapShift > 0 ? '+' : ''}${effectiveTapShift})`);
  }

  // 4. Silent energy signals (at most +/-1 total)
  let energySignal = 0;
  if (ctx.fewerRepsTapped) {
    energySignal -= 1;
    reasons.push('Fewer reps at ignition (-1 energy adjustment)');
  }
  energySignal = Math.max(-1, Math.min(1, energySignal));
  target = Math.max(1, Math.min(settings.targetCeiling, target + energySignal));

  // 5. Stretch probe (once per counting day, after 3 smooth completions, allow ceiling + 1)
  let isStretch = false;
  if (
    isCountingDay(ctx.now, settings.countingDays) &&
    completions >= 3 &&
    !ctx.stretchProbeUsedToday &&
    target >= settings.targetCeiling
  ) {
    target = settings.targetCeiling + 1; // 5
    isStretch = true;
    reasons.push('Stretch probe active (ambitious challenge)');
  }

  return { target: Math.max(1, Math.min(5, target)), reasons, isStretch };
}

/**
 * Step 2: Rank Actions and Apply Overrides (Tripwire & Reserved Slot)
 */
export function rankCandidates(
  actions: FocusAction[],
  ctx: SessionContext,
  settings: ServingSettings = DEFAULT_SERVING_SETTINGS
): { selected: CandidateScore | null; ranked: CandidateScore[] } {
  const now = ctx.now || new Date();
  const isCountDay = isCountingDay(now, settings.countingDays);
  const { target: targetFriction } = computeTargetFriction(ctx, settings);

  // Filter available
  const available = actions.filter((a) => {
    if (a.status !== 'waiting' && a.status !== 'served') return false;
    if (a.category === 'habit') return false;
    if (ctx.skippedTaskIds.has(a.task_id)) return false;
    if (a.snoozed_until && new Date(a.snoozed_until) > now) return false;
    return true;
  });

  if (available.length === 0) {
    return { selected: null, ranked: [] };
  }

  // OVERRIDE 1: TRIPWIRE
  // An external deadline due within 1 counting day jumps to the front
  for (const a of available) {
    if (a.deadline_kind === 'external' && a.due_date) {
      const dueDate = new Date(a.due_date);
      const countingDaysAway = getCountingDaysDifference(now, dueDate, settings.countingDays);
      if (countingDaysAway <= 1) {
        const tripwireScore: CandidateScore = {
          action: a,
          totalScore: 9999,
          targetFriction,
          effectiveFriction: Number(a.friction) || 2,
          urgencyScore: 10,
          importanceScore: 5,
          ageScore: 0,
          heartbeatScore: 0,
          varietyScore: 0,
          isTripwire: true,
          isReservedSlot: false,
          reasons: ['Tripwire: External deadline due soon'],
        };
        return { selected: tripwireScore, ranked: [tripwireScore] };
      }
    }
  }

  // OVERRIDE 2: RESERVED SLOT
  // Once per counting day, after the 2nd completed action, serve the highest-importance action
  if (isCountDay && ctx.completedActions.length >= 2 && !ctx.reservedSlotUsedToday) {
    const highImp = available
      .filter((a) => (a.importance || 'med') === 'high')
      .sort((a, b) => (Number(a.friction) || 2) - (Number(b.friction) || 2));

    if (highImp.length > 0) {
      const picked = highImp[0];
      const reservedScore: CandidateScore = {
        action: picked,
        totalScore: 8888,
        targetFriction,
        effectiveFriction: Number(picked.friction) || 2,
        urgencyScore: 5,
        importanceScore: 10,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: true,
        reasons: ['Reserved slot: High importance priority'],
      };
      return { selected: reservedScore, ranked: [reservedScore] };
    }
  }

  // SCORING CANDIDATES
  const candidates: CandidateScore[] = available.map((a) => {
    const rawFriction = Number(a.friction) || 2;
    const learned = Number(a.learned_adjustment) || 0;
    const effectiveFriction = Math.max(1, Math.min(5, Math.round(rawFriction + learned)));

    const reasons: string[] = [];

    // Urgency Score (0 - 10)
    let urgencyScore = 0;
    if (a.due_date) {
      const dueDate = new Date(a.due_date);
      const daysAway = getCountingDaysDifference(now, dueDate, settings.countingDays);
      if (daysAway <= 7) {
        // Steep curve near due date
        const baseUrgency = Math.max(0, 10 - daysAway * 1.3);
        urgencyScore = a.deadline_kind === 'self' ? baseUrgency * 0.5 : baseUrgency;
        if (urgencyScore > 3) {
          reasons.push(daysAway <= 1 ? 'Due very soon' : `Due in ${daysAway} work days`);
        }
      }
    }

    // Importance Score
    let importanceScore = settings.importanceBonusLow;
    if (a.importance === 'high') {
      importanceScore = settings.importanceBonusHigh;
      reasons.push('High importance');
    } else if (a.importance === 'med') {
      importanceScore = settings.importanceBonusMed;
    }

    // Age Score
    let ageScore = 0;
    if (a.created_at) {
      const created = new Date(a.created_at);
      const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      ageScore = Math.min(settings.ageBonusMax, ageDays * settings.ageBonusPerDay);
      if (ageScore >= 2) reasons.push('Waiting for a while');
    }

    // Project Heartbeat (+3 if project action has had no progress in 3 days)
    let heartbeatScore = 0;
    if (a.category === 'project') {
      heartbeatScore = settings.heartbeatBonus;
      reasons.push('Project needs momentum');
    }

    // Variety Score (-3 if same type as last completed)
    let varietyScore = 0;
    if (ctx.lastCompletedType && a.type && ctx.lastCompletedType === a.type) {
      varietyScore = settings.varietyPenalty;
    }

    // Friction Distance Penalty
    const frictionDist = Math.abs(effectiveFriction - targetFriction);
    const frictionPenalty = frictionDist * 4;

    const totalScore = urgencyScore + importanceScore + ageScore + heartbeatScore + varietyScore - frictionPenalty;

    if (frictionDist === 0) {
      reasons.unshift(`Matches target friction (${targetFriction})`);
    }

    return {
      action: a,
      totalScore,
      targetFriction,
      effectiveFriction,
      urgencyScore,
      importanceScore,
      ageScore,
      heartbeatScore,
      varietyScore,
      isTripwire: false,
      isReservedSlot: false,
      reasons: reasons.slice(0, 2),
    };
  });

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  return {
    selected: candidates[0] || null,
    ranked: candidates,
  };
}
