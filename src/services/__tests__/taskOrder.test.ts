import { describe, it, expect } from 'vitest';
import { reorderQuickJobList, getNextOrderedQuickJobs } from '../taskOrder';
import { QuickJob } from '../../types';

function makeJob(id: string, title: string, done = false): QuickJob {
  return {
    id,
    title,
    done,
    duration: '5m',
    createdAt: 1000,
  };
}

describe('Ordered DO Task List Helpers', () => {
  it('reorderQuickJobList reorders active jobs while preserving completed and unlisted jobs', () => {
    const jobs: QuickJob[] = [
      makeJob('t1', 'First'),
      makeJob('done-1', 'Already Done', true),
      makeJob('t2', 'Second'),
      makeJob('t3', 'Third'),
      makeJob('t4', 'Unlisted Active'),
      makeJob('done-2', 'Another Done', true),
    ];

    const reordered = reorderQuickJobList(jobs, ['t3', 't1', 't2']);

    expect(reordered.map((j) => j.id)).toEqual([
      't3',
      't1',
      't2',
      't4',
      'done-1',
      'done-2',
    ]);
  });

  it('getNextOrderedQuickJobs returns active jobs in strict order and skips skipped/completed IDs', () => {
    const orderedJobs = reorderQuickJobList(
      [
        makeJob('a', 'Task A'),
        makeJob('b', 'Task B'),
        makeJob('c', 'Task C', true),
        makeJob('d', 'Task D'),
      ],
      ['d', 'b', 'a']
    );

    const queueAll = getNextOrderedQuickJobs(orderedJobs, new Set(), new Set());
    expect(queueAll.map((j) => j.id)).toEqual(['d', 'b', 'a']);

    const queueFiltered = getNextOrderedQuickJobs(
      orderedJobs,
      new Set(['d']),
      new Set(['b'])
    );
    expect(queueFiltered.map((j) => j.id)).toEqual(['a']);
  });
});
