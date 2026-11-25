import { QuickJob } from '../types';

/**
 * Reorders active (not-done) quick jobs to match `orderedActiveIds`, while
 * preserving any remaining active or completed items in their relative order.
 */
export function reorderQuickJobList(
  allJobs: QuickJob[],
  orderedActiveIds: string[]
): QuickJob[] {
  const byId = new Map<string, QuickJob>();
  for (const job of allJobs) {
    byId.set(job.id, job);
  }

  const seen = new Set<string>();
  const reorderedActive: QuickJob[] = [];

  for (const id of orderedActiveIds) {
    if (seen.has(id)) continue;
    const job = byId.get(id);
    if (job && !job.done) {
      reorderedActive.push(job);
      seen.add(id);
    }
  }

  const remainingActive: QuickJob[] = [];
  const completed: QuickJob[] = [];

  for (const job of allJobs) {
    if (seen.has(job.id)) continue;
    if (job.done) {
      completed.push(job);
    } else {
      remainingActive.push(job);
    }
  }

  return [...reorderedActive, ...remainingActive, ...completed];
}

/**
 * Returns active quick jobs in strict list order, excluding skipped or
 * already-completed session IDs.
 */
export function getNextOrderedQuickJobs(
  allJobs: QuickJob[],
  skippedIds: Set<string>,
  completedIds: Set<string>
): QuickJob[] {
  return allJobs.filter(
    (j) => !j.done && !skippedIds.has(j.id) && !completedIds.has(j.id)
  );
}
