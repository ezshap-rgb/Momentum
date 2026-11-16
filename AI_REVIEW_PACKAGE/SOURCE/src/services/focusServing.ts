/**
 * Focus App Action Type Definition (matching Actions tab in Sheet)
 */
export interface FocusAction {
  task_id: string;
  title: string;
  original_words?: string;
  created_at?: string;
  source?: string;
  category?: 'quick' | 'scheduled' | 'project' | 'habit';
  type?: 'physical' | 'mental' | 'social' | 'admin';
  parent_id?: string;
  project_id?: string;
  project_title?: string;
  order?: string;
  active_step?: string;
  context?: string;
  friction: number; // 1 to 5
  friction_confidence?: string;
  friction_reason?: string;
  learned_adjustment?: number;
  time_bucket?: string; // under 5, 5-20, 20-60, over 60
  first_action?: string;
  needs_shrinking?: boolean;
  due_date?: string;
  deadline_kind?: 'external' | 'self' | 'none';
  importance?: 'low' | 'med' | 'high';
  why_it_matters?: string;
  status: 'waiting' | 'served' | 'in_progress' | 'done' | 'snoozed' | 'dropped' | 'needs_setup';
  snoozed_until?: string;
  times_served?: number;
  times_skipped?: number;
  times_shrunk?: number;
  completed_at?: string;
  actual_minutes?: number;
  work_value?: number;
  finish_grade?: string;
  part_earned?: string;
  last_folded_event_id?: string;
}

export interface ServingState {
  targetFriction: number;
  completedCount: number;
  consecutiveNotNows: number;
  skippedTaskIds: Set<string>;
  lastExercise?: string;
}

export interface IgnitionExercise {
  name: string;
  reps: number;
  unit: string;
  tip?: string;
}

export const IGNITION_EXERCISES: IgnitionExercise[] = [
  { name: 'Push-ups', reps: 10, unit: 'reps' },
  { name: 'Crunches', reps: 15, unit: 'reps' },
  { name: 'Squats', reps: 15, unit: 'reps' },
  { name: 'Jumping Jacks', reps: 20, unit: 'reps' },
];

/**
 * Weighted pick of exercise, never repeating the same one twice in a row
 */
export function pickNextExercise(lastExercise?: string): IgnitionExercise {
  const candidates = IGNITION_EXERCISES.filter((e) => e.name !== lastExercise);
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...choice };
}

/**
 * Serving rule v0:
 * 1. Filter: status === 'waiting', not snoozed, not in skippedTaskIds, category !== 'habit'
 * 2. Distance from target friction
 * 3. Tie-breaker: Soonest due date -> importance (high > med > low) -> oldest created_at
 */
export function pickBestAction(
  actions: FocusAction[],
  targetFriction: number,
  skippedTaskIds: Set<string>
): FocusAction | null {
  const validActions = actions.filter((a) => {
    if (a.status !== 'waiting' && a.status !== 'served') return false;
    if (a.category === 'habit') return false;
    if (skippedTaskIds.has(a.task_id)) return false;
    if (a.snoozed_until && new Date(a.snoozed_until) > new Date()) return false;
    return true;
  });

  if (validActions.length === 0) return null;

  const sorted = [...validActions].sort((a, b) => {
    const fA = Number(a.friction) || 2;
    const fB = Number(b.friction) || 2;
    const distA = Math.abs(fA - targetFriction);
    const distB = Math.abs(fB - targetFriction);

    if (distA !== distB) return distA - distB;

    // Due date priority
    if (a.due_date && b.due_date) {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    } else if (a.due_date && !b.due_date) {
      return -1;
    } else if (!a.due_date && b.due_date) {
      return 1;
    }

    // Importance priority
    const impWeights = { high: 3, med: 2, low: 1 };
    const wA = impWeights[a.importance || 'med'] || 2;
    const wB = impWeights[b.importance || 'med'] || 2;
    if (wA !== wB) return wB - wA;

    // Oldest age
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  return sorted[0];
}
