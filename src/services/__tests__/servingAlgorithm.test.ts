import { describe, it, expect } from 'vitest';
import {
  computeTargetFriction,
  rankCandidates,
  selectPairedCandidates,
  DEFAULT_SERVING_SETTINGS,
  SessionContext,
  CandidateScore,
} from '../focusAlgorithm';
import { calculateFinishGrade } from '../focusMovement';
import { FocusAction } from '../focusServing';

describe('Serving Algorithm & Movement Rewards (Prompt 1 Fixes)', () => {
  // Base helper for mock session context
  const createMockContext = (overrides: Partial<SessionContext> = {}): SessionContext => ({
    completedActions: [],
    totalActiveMinutes: 0,
    tapShift: 0,
    tapShiftBaselineCompletions: 0,
    consecutiveSmallerTaps: 0,
    fewerRepsTapped: false,
    reservedSlotUsedToday: false,
    stretchProbeUsedToday: false,
    skippedTaskIds: new Set<string>(),
    now: new Date('2026-11-16T10:00:00.000Z'), // Monday (Counting day)
    ...overrides,
  });

  const createMockAction = (overrides: Partial<FocusAction> = {}): FocusAction => ({
    task_id: 'task_' + Math.random().toString(36).substring(2, 9),
    title: 'Work Task',
    friction: 2,
    status: 'waiting',
    category: 'quick',
    type: 'admin',
    ...overrides,
  });

  // Fix 1: Tap-shift fade counts completions since the tap, not total completions
  it('(1) tap-shift fade counts completions since the tap occurred', () => {
    // User already completed 4 actions, then tapped "+ Bigger" (tapShift: 1, baseline: 4)
    const mockCompleted = Array.from({ length: 4 }, () => createMockAction({ status: 'done' }));
    const ctxAtTap = createMockContext({
      completedActions: mockCompleted,
      tapShift: 1,
      tapShiftBaselineCompletions: 4,
    });

    const resAtTap = computeTargetFriction(ctxAtTap);
    // Baseline ramp: start 2 + 2 ramp = 4. TapShift +1 (no fade yet because 0 completions since tap) -> target = 4 (at ceiling)
    expect(resAtTap.reasons).toContain('User tap shift (+1)');

    // Now complete 3 more actions since the tap (total: 7, since tap: 3)
    const mockCompleted7 = Array.from({ length: 7 }, () => createMockAction({ status: 'done' }));
    const ctxAfter3More = createMockContext({
      completedActions: mockCompleted7,
      tapShift: 1,
      tapShiftBaselineCompletions: 4,
    });

    const resAfter3More = computeTargetFriction(ctxAfter3More);
    // The tap shift should now have faded by 1 (effectiveTapShift: 0)
    expect(resAfter3More.reasons.some((r) => r.includes('User tap shift'))).toBe(false);
  });

  // Fix 2: Tripwire friction target guard & urgency sorting
  it('(2) tripwire shrinks to first physical action when friction > target + 1, and chooses most urgent item', () => {
    const monday = new Date('2026-11-16T10:00:00.000Z');
    const ctx = createMockContext({ now: monday });

    const urgentLater = createMockAction({
      task_id: 'urgent_later',
      title: 'Less Urgent Tax Audit',
      friction: 2,
      deadline_kind: 'external',
      due_date: '2026-11-17T23:59:59.000Z', // Tomorrow (1 day away)
    });

    const urgentSoonerHighFriction = createMockAction({
      task_id: 'urgent_sooner',
      title: 'Massive Legal Filing',
      first_action: 'Open legal folder on desktop',
      friction: 5, // Friction 5 exceeds target (2) + 1
      deadline_kind: 'external',
      due_date: '2026-11-16T18:00:00.000Z', // Today (more urgent)
    });

    const { selected } = rankCandidates([urgentLater, urgentSoonerHighFriction], ctx);

    expect(selected).not.toBeNull();
    // Most urgent item selected
    expect(selected!.action.task_id).toBe('urgent_sooner');
    // Because friction (5) > target (2) + 1, it shrunk to first physical action
    expect(selected!.action.title).toBe('Open legal folder on desktop');
    expect(selected!.effectiveFriction).toBeLessThanOrEqual(2);
    expect(selected!.reasons).toContain('High friction: shrunk to first physical step');
  });

  // Fix 3: Only trigger tripwire on off days for same-day deadlines
  it('(3) only triggers tripwire on off days (Friday/Saturday) for same-day deadlines', () => {
    const friday = new Date('2026-11-20T10:00:00.000Z'); // Friday (off day)
    const ctx = createMockContext({ now: friday });

    // Task due Sunday (next counting day, not today)
    const taskDueSunday = createMockAction({
      task_id: 'task_sunday',
      title: 'Monday Morning Prep',
      deadline_kind: 'external',
      due_date: '2026-11-22T23:59:59.000Z', // Sunday
    });

    // On Friday, task due Sunday must NOT trigger tripwire
    const resSunday = rankCandidates([taskDueSunday], ctx);
    expect(resSunday.selected?.isTripwire).toBe(false);

    // Task due Friday (today) MUST trigger tripwire
    const taskDueToday = createMockAction({
      task_id: 'task_today',
      title: 'Urgent Friday Emergency',
      deadline_kind: 'external',
      due_date: '2026-11-20T18:00:00.000Z', // Same day Friday
    });

    const resToday = rankCandidates([taskDueToday], ctx);
    expect(resToday.selected?.isTripwire).toBe(true);
  });

  // Fix 4: Project heartbeat applies only when no action completed for 3 counting days
  it('(4) project heartbeat applies only when project has had no completed action for 3 counting days', () => {
    const thursday = new Date('2026-11-19T10:00:00.000Z'); // Thursday
    const ctxActive = createMockContext({
      now: thursday,
      completedActions: [
        createMockAction({
          project_id: 'proj_alpha',
          completed_at: '2026-11-18T10:00:00.000Z', // Wednesday (1 day ago)
        }),
      ],
    });

    const projectTask = createMockAction({
      task_id: 'proj_task_1',
      title: 'Project Feature',
      category: 'project',
      project_id: 'proj_alpha',
    });

    // Recent completion (yesterday) -> no heartbeat bonus
    const { ranked: activeRanked } = rankCandidates([projectTask], ctxActive);
    expect(activeRanked[0].heartbeatScore).toBe(0);

    // Stagnant project: last completed Sunday (4 calendar days, 3 counting days ago)
    const ctxStagnant = createMockContext({
      now: thursday,
      completedActions: [
        createMockAction({
          project_id: 'proj_alpha',
          completed_at: '2026-11-15T10:00:00.000Z', // Sunday
        }),
      ],
    });

    const { ranked: stagnantRanked } = rankCandidates([projectTask], ctxStagnant);
    expect(stagnantRanked[0].heartbeatScore).toBe(DEFAULT_SERVING_SETTINGS.heartbeatBonus);
    expect(stagnantRanked[0].reasons).toContain('Project needs momentum (no progress in 3 work days)');
  });

  // Fix 5: Finish grades using counting days and completion timestamp
  it('(5) finish grades: due today or tomorrow = brushed, 2-6 counting days early = decorated, 7+ = hand-finished', () => {
    const countingDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

    // 1. Due tomorrow (1 day early) -> brushed
    const gradeBrushed = calculateFinishGrade(
      '2026-11-17T18:00:00.000Z',
      '2026-11-16T10:00:00.000Z',
      undefined,
      countingDays
    );
    expect(gradeBrushed).toBe('brushed');

    // 2. Due 3 counting days early -> decorated
    const gradeDecorated = calculateFinishGrade(
      '2026-11-19T18:00:00.000Z', // Thursday
      '2026-11-16T10:00:00.000Z', // Monday (3 counting days)
      undefined,
      countingDays
    );
    expect(gradeDecorated).toBe('decorated');

    // 3. Due 8 counting days early -> hand-finished
    const gradeHandFinished = calculateFinishGrade(
      '2026-11-26T18:00:00.000Z', // Following Thursday (8 counting days)
      '2026-11-16T10:00:00.000Z', // Monday
      undefined,
      countingDays
    );
    expect(gradeHandFinished).toBe('hand-finished');

    // 4. Overdue rescue -> functional
    const gradeFunctional = calculateFinishGrade(
      '2026-11-15T18:00:00.000Z', // Yesterday
      '2026-11-16T10:00:00.000Z', // Today
      undefined,
      countingDays
    );
    expect(gradeFunctional).toBe('functional');
  });

  // Fix 6: In paired selection, upper card must have strictly higher friction than lower card
  it('(6) in paired selection, upper card has strictly higher friction than lower, otherwise returns null', () => {
    const targetFriction = 3;

    // Case A: Identical friction tasks (both friction 3)
    const identicalCandidates: CandidateScore[] = [
      {
        action: createMockAction({ task_id: 't1', friction: 3 }),
        totalScore: 10,
        targetFriction: 3,
        effectiveFriction: 3,
        urgencyScore: 0,
        importanceScore: 0,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: false,
        reasons: [],
      },
      {
        action: createMockAction({ task_id: 't2', friction: 3 }),
        totalScore: 8,
        targetFriction: 3,
        effectiveFriction: 3,
        urgencyScore: 0,
        importanceScore: 0,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: false,
        reasons: [],
      },
    ];

    // Must return null (cannot form a pair with upper.effectiveFriction > lower.effectiveFriction)
    const resultIdentical = selectPairedCandidates(identicalCandidates, targetFriction);
    expect(resultIdentical).toBeNull();

    // Case B: Differentiated friction tasks (friction 4 vs friction 2)
    const differentiatedCandidates: CandidateScore[] = [
      {
        action: createMockAction({ task_id: 't1', friction: 4 }),
        totalScore: 10,
        targetFriction: 3,
        effectiveFriction: 4,
        urgencyScore: 0,
        importanceScore: 0,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: false,
        reasons: [],
      },
      {
        action: createMockAction({ task_id: 't2', friction: 2 }),
        totalScore: 8,
        targetFriction: 3,
        effectiveFriction: 2,
        urgencyScore: 0,
        importanceScore: 0,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: false,
        reasons: [],
      },
    ];

    const resultDiff = selectPairedCandidates(differentiatedCandidates, targetFriction);
    expect(resultDiff).not.toBeNull();
    expect(resultDiff![0].effectiveFriction).toBeGreaterThan(resultDiff![1].effectiveFriction);
  });

  // Fix 7: All hardcoded thresholds moved into ServingSettings
  it('(7) respects custom ServingSettings without magic numbers', () => {
    const customSettings = {
      ...DEFAULT_SERVING_SETTINGS,
      firstOfferTargetFriction: 1,
      targetCeiling: 3,
      fatigueActionCount: 2,
    };

    const ctx = createMockContext({
      completedActions: [createMockAction(), createMockAction()], // 2 actions hits custom fatigue threshold
    });

    const res = computeTargetFriction(ctx, customSettings);
    expect(res.reasons).toContain('Fatigue easing applied (-1)');
    expect(res.target).toBeLessThanOrEqual(3);
  });
});
