import { FocusAction } from './focusServing';

export interface ServingSettings {
  countingDays: string[]; // e.g. ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']
  firstOfferTargetFriction: number; // 2
  targetCeiling: number; // 4
  fatigueActionCount: number; // 5
  fatigueActiveMinutes: number; // 90
  smallerTapsBeforeShrink: number; // 2
  tapShiftFadeInterval: number; // 3 completions per 1 shift fade
  tripwireCountingDaysThreshold: number; // 1
  projectStagnantDaysThreshold: number; // 3
  finishGradeDecoratedThreshold: number; // 2
  finishGradeHandFinishedThreshold: number; // 7
  importanceBonusHigh: number; // 5
  importanceBonusMed: number; // 2
  importanceBonusLow: number; // 0
  ageBonusPerDay: number; // 0.5
  ageBonusMax: number; // 4
  heartbeatBonus: number; // 3
  varietyPenalty: number; // -3
  frictionDistancePenaltyMultiplier: number; // 4
}

export const DEFAULT_SERVING_SETTINGS: ServingSettings = {
  countingDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  firstOfferTargetFriction: 2,
  targetCeiling: 4,
  fatigueActionCount: 5,
  fatigueActiveMinutes: 90,
  smallerTapsBeforeShrink: 2,
  tapShiftFadeInterval: 3,
  tripwireCountingDaysThreshold: 1,
  projectStagnantDaysThreshold: 3,
  finishGradeDecoratedThreshold: 2,
  finishGradeHandFinishedThreshold: 7,
  importanceBonusHigh: 5,
  importanceBonusMed: 2,
  importanceBonusLow: 0,
  ageBonusPerDay: 0.5,
  ageBonusMax: 4,
  heartbeatBonus: 3,
  varietyPenalty: -3,
  frictionDistancePenaltyMultiplier: 4,
};

export interface SessionContext {
  completedActions: FocusAction[];
  totalActiveMinutes: number;
  tapShift: number; // accumulated shift from smaller/bigger
  tapShiftBaselineCompletions?: number; // completions count when tapShift was last modified
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

  // 3. User tap shift (smaller/bigger), fading by 1 for every tapShiftFadeInterval completions since the tap
  const completionsSinceTap = Math.max(0, completions - (ctx.tapShiftBaselineCompletions ?? 0));
  const fade = Math.floor(completionsSinceTap / (settings.tapShiftFadeInterval || 3));
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
 * Detects whether an action is a physical exercise habit (e.g. push-ups, squats, crunches, etc.)
 */
export function isPhysicalExerciseAction(a: FocusAction): boolean {
  if (!a) return false;
  if (a.category === 'habit') return true;
  if (a.type === 'physical') return true;

  const t = (a.title || '').toLowerCase();
  if (t.includes('habit:')) return true;

  const exerciseKeywords = [
    'push-up',
    'pushup',
    'push up',
    'squat',
    'crunch',
    'sit-up',
    'situp',
    'plank',
    'jumping jack',
    'pull-up',
    'pullup',
    'pull up',
    'burpee',
    'lunge',
    'workout',
    'exercise',
    'exercize',
    'stretch',
    'mobility',
    'yoga',
    'cardio',
  ];

  return exerciseKeywords.some((kw) => t.includes(kw));
}

/**
 * Step 2: Rank Actions and Apply Overrides (Tripwire & Reserved Slot)
 */
export function rankCandidates(
  actions: FocusAction[],
  ctx: SessionContext,
  settings: ServingSettings = DEFAULT_SERVING_SETTINGS
): { selected: CandidateScore | null; ranked: CandidateScore[]; paired: [CandidateScore, CandidateScore] | null } {
  const now = ctx.now || new Date();
  const isCountDay = isCountingDay(now, settings.countingDays);
  const { target: targetFriction } = computeTargetFriction(ctx, settings);

  // Filter available
  const available = actions.filter((a) => {
    if (a.status !== 'waiting' && a.status !== 'served') return false;
    // Daily habits are separate from the action flow (scattered background only)
    if (a.category === 'habit' || isPhysicalExerciseAction(a)) return false;
    if (ctx.skippedTaskIds.has(a.task_id)) return false;
    if (a.snoozed_until && new Date(a.snoozed_until) > now) return false;

    return true;
  });

  if (available.length === 0) {
    return { selected: null, ranked: [], paired: null };
  }

  // OVERRIDE 1: TRIPWIRE
  const tripwireCandidates: FocusAction[] = [];
  for (const a of available) {
    if (isPhysicalExerciseAction(a)) continue; // Never trigger tripwires on exercise habits
    if (a.deadline_kind === 'external' && a.due_date) {
      const dueDate = new Date(a.due_date);
      if (isCountDay) {
        const countingDaysAway = getCountingDaysDifference(now, dueDate, settings.countingDays);
        if (countingDaysAway <= settings.tripwireCountingDaysThreshold) {
          tripwireCandidates.push(a);
        }
      } else {
        // Fix 3: On off days (e.g. Fri/Sat), only trigger tripwire for same-day deadlines
        const isDueToday = dueDate.toDateString() === now.toDateString() || (dueDate.getTime() <= now.getTime());
        if (isDueToday) {
          tripwireCandidates.push(a);
        }
      }
    }
  }

  if (tripwireCandidates.length > 0) {
    // Fix 2: Choose the most urgent matching item (soonest due date)
    tripwireCandidates.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    const pickedTripwire = tripwireCandidates[0];
    const rawFric = Number(pickedTripwire.friction) || 2;

    // Fix 2: If item's friction is more than target+1, serve only its first physical action as a tiny task
    let servedAction = pickedTripwire;
    let effectiveFric = rawFric;
    const reasons = ['Tripwire: External deadline due soon'];

    if (rawFric > targetFriction + 1) {
      servedAction = {
        ...pickedTripwire,
        title: pickedTripwire.first_action || `First step: ${pickedTripwire.title}`,
        friction: Math.min(targetFriction, 2),
        time_bucket: '< 5m',
        needs_shrinking: false,
      };
      effectiveFric = servedAction.friction;
      reasons.push('High friction: shrunk to first physical step');
    }

    const tripwireScore: CandidateScore = {
      action: servedAction,
      totalScore: 9999,
      targetFriction,
      effectiveFriction: effectiveFric,
      urgencyScore: 10,
      importanceScore: 5,
      ageScore: 0,
      heartbeatScore: 0,
      varietyScore: 0,
      isTripwire: true,
      isReservedSlot: false,
      reasons,
    };
    return { selected: tripwireScore, ranked: [tripwireScore], paired: null };
  }

  // OVERRIDE 2: RESERVED SLOT
  if (isCountDay && ctx.completedActions.length >= 2 && !ctx.reservedSlotUsedToday) {
    const highImp = available
      .filter((a) => !isPhysicalExerciseAction(a) && (a.importance || 'med') === 'high')
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
      return { selected: reservedScore, ranked: [reservedScore], paired: null };
    }
  }

  // SCORING CANDIDATES
  const candidates: CandidateScore[] = available.map((a) => {
    const isExercise = isPhysicalExerciseAction(a);
    // User domain rule: all exercise actions are the easiest, least friction (1/5), lowest reward
    let rawFriction = isExercise ? 1 : Number(a.friction) || 2;
    const learned = Number(a.learned_adjustment) || 0;
    const effectiveFriction = isExercise ? 1 : Math.max(1, Math.min(5, Math.round(rawFriction + learned)));
    const candidateAction = isExercise ? { ...a, friction: 1 } : a;

    const reasons: string[] = [];

    // Urgency Score (0 - 10)
    let urgencyScore = 0;
    if (a.due_date && !isExercise) {
      const dueDate = new Date(a.due_date);
      const daysAway = getCountingDaysDifference(now, dueDate, settings.countingDays);
      if (daysAway <= 7) {
        const baseUrgency = Math.max(0, 10 - daysAway * 1.3);
        urgencyScore = a.deadline_kind === 'self' ? baseUrgency * 0.5 : baseUrgency;
        if (urgencyScore > 3) {
          reasons.push(daysAway <= 1 ? 'Due very soon' : `Due in ${daysAway} work days`);
        }
      }
    }

    // Importance Score
    let importanceScore = settings.importanceBonusLow;
    if (!isExercise && a.importance === 'high') {
      importanceScore = settings.importanceBonusHigh;
      reasons.push('High importance');
    } else if (!isExercise && a.importance === 'med') {
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

    // Project Heartbeat: only apply when project has had no completed action for stagnant threshold counting days
    let heartbeatScore = 0;
    if (a.category === 'project') {
      const projId = a.project_id || a.project_title || '';
      let lastCompletedTime: number | null = null;
      const allCompleted = [
        ...ctx.completedActions,
        ...actions.filter((x) => x.status === 'done' && x.completed_at),
      ];
      for (const comp of allCompleted) {
        const compProj = comp.project_id || comp.project_title || '';
        if (compProj && projId && compProj === projId && comp.completed_at) {
          const t = new Date(comp.completed_at).getTime();
          if (lastCompletedTime === null || t > lastCompletedTime) {
            lastCompletedTime = t;
          }
        }
      }

      let isStagnant = false;
      if (lastCompletedTime) {
        const daysSinceLastAction = getCountingDaysDifference(new Date(lastCompletedTime), now, settings.countingDays);
        if (daysSinceLastAction >= settings.projectStagnantDaysThreshold) {
          isStagnant = true;
        }
      } else if (a.created_at) {
        const daysOld = getCountingDaysDifference(new Date(a.created_at), now, settings.countingDays);
        if (daysOld >= settings.projectStagnantDaysThreshold) {
          isStagnant = true;
        }
      }

      if (isStagnant) {
        heartbeatScore = settings.heartbeatBonus;
        reasons.push('Project needs momentum (no progress in 3 work days)');
      }
    }

    // Variety Score
    let varietyScore = 0;
    if (ctx.lastCompletedType && a.type && ctx.lastCompletedType === a.type) {
      varietyScore = settings.varietyPenalty;
    }

    // Friction Distance Penalty
    const frictionDist = Math.abs(effectiveFriction - targetFriction);
    const frictionPenalty = frictionDist * (settings.frictionDistancePenaltyMultiplier || 4);

    const totalScore = urgencyScore + importanceScore + ageScore + heartbeatScore + varietyScore - frictionPenalty;

    if (frictionDist === 0) {
      reasons.unshift(`Matches target friction (${targetFriction})`);
    }

    return {
      action: candidateAction,
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

  // Paired Mode: upper card at target+1, lower card at target-1, differing projects when possible
  const paired = selectPairedCandidates(candidates, targetFriction);

  return {
    selected: candidates[0] || null,
    ranked: candidates,
    paired,
  };
}

/**
 * Phase 8: Pair selection function using existing ranking
 * Upper card: best-ranked at target + 1 (more reward)
 * Lower card: best-ranked at target - 1 (less reward), from a different project when possible
 * Enforces strictly higher friction for the upper card; returns null if strict contrast cannot be met.
 */
export function selectPairedCandidates(
  rankedCandidates: CandidateScore[],
  targetFriction: number
): [CandidateScore, CandidateScore] | null {
  if (rankedCandidates.length < 2) return null;

  const targetUpper = Math.min(5, targetFriction + 1);
  const targetLower = Math.max(1, targetFriction - 1);

  // Filter candidate options that can serve as upper (must have friction >= targetFriction)
  const upperOptions = rankedCandidates.filter((c) => c.effectiveFriction >= targetFriction);
  if (upperOptions.length === 0) return null;

  // Search through potential upper candidates in rank order
  for (const upper of upperOptions) {
    const upperProjectId = upper.action.project_id || upper.action.project_title || '';
    // Lower candidate MUST have strictly lower friction than upper
    const eligibleLowers = rankedCandidates.filter(
      (c) => c.action.task_id !== upper.action.task_id && upper.effectiveFriction > c.effectiveFriction
    );
    if (eligibleLowers.length === 0) continue;

    // Prefer exact targetLower from differing project
    let lower = eligibleLowers.find((c) => {
      const proj = c.action.project_id || c.action.project_title || '';
      const diffProj = proj && upperProjectId ? proj !== upperProjectId : true;
      return c.effectiveFriction === targetLower && diffProj;
    });

    if (!lower) {
      // Try matching targetLower regardless of project
      lower = eligibleLowers.find((c) => c.effectiveFriction === targetLower);
    }

    if (!lower) {
      // Try any eligible lower from differing project
      lower = eligibleLowers.find((c) => {
        const proj = c.action.project_id || c.action.project_title || '';
        return proj && upperProjectId ? proj !== upperProjectId : false;
      });
    }

    if (!lower) {
      lower = eligibleLowers[0];
    }

    if (lower && upper.effectiveFriction > lower.effectiveFriction) {
      return [upper, lower];
    }
  }

  // If no pair can be formed with upper.effectiveFriction > lower.effectiveFriction, return null (single card fallback)
  return null;
}
