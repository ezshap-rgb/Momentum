import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPendingGoogleTaskOps,
  enqueuePendingGoogleTaskOp,
  removePendingGoogleTaskOp,
  recordDeletedGoogleTaskId,
  DEFAULT_INITIAL_DATA,
} from '../storageService';
import {
  saveStoredAccessToken,
  getStoredAccessToken,
  markGoogleTaskCompleted,
  deleteGoogleTask,
  flushGoogleTaskCompletionsAndDeletions,
  pushLocalTasksToGoogle,
  syncTasksIntoBoard,
  makeTitleFallbackOpId,
} from '../googleTasksService';
import { getDeletedGoogleTaskIds } from '../storageService';
import {
  syncHabitsWithBoardData,
  creditHabitFromIgnition,
  formatLocalDateString,
  getTodayDateString,
} from '../focusHabits';
import { MomentumBoardData } from '../../types';

function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function makeEmptyBoard(overrides: Partial<MomentumBoardData> = {}): MomentumBoardData {
  return {
    ...DEFAULT_INITIAL_DATA,
    quick_jobs: [],
    responsibilities: [],
    projects: [],
    habits: [],
    calendar_events: [],
    ...overrides,
  };
}

describe('Google Tasks Write-Back Queue & Flush Sync', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockLocalStorage());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Pending Google Task ops queue', () => {
    it('persists, validates, deduplicates (preserving delete), and removes ops', () => {
      // Invalid IDs (empty or containing spaces) are ignored
      enqueuePendingGoogleTaskOp({ taskId: '', listId: 'L1', action: 'complete', timestamp: 100 });
      enqueuePendingGoogleTaskOp({ taskId: 'bad task id', listId: 'L1', action: 'complete', timestamp: 100 });
      expect(getPendingGoogleTaskOps()).toEqual([]);

      // Enqueue valid complete op
      enqueuePendingGoogleTaskOp({ taskId: 'task_1', listId: 'list_a', action: 'complete', timestamp: 200 });
      enqueuePendingGoogleTaskOp({ taskId: 'task_2', listId: 'list_b', action: 'delete', timestamp: 300 });
      expect(getPendingGoogleTaskOps()).toHaveLength(2);

      // Upgrading complete -> delete keeps 'delete' and updates listId
      enqueuePendingGoogleTaskOp({ taskId: 'task_1', listId: 'list_c', action: 'delete', timestamp: 400 });
      // Subsequent complete does NOT downgrade 'delete' back to 'complete'
      enqueuePendingGoogleTaskOp({ taskId: 'task_1', listId: 'list_c', action: 'complete', timestamp: 500 });

      const ops = getPendingGoogleTaskOps();
      expect(ops).toHaveLength(2);
      expect(ops.find((o) => o.taskId === 'task_1')).toEqual({
        taskId: 'task_1',
        listId: 'list_c',
        action: 'delete',
        timestamp: 500,
      });

      removePendingGoogleTaskOp('task_1');
      expect(getPendingGoogleTaskOps().map((o) => o.taskId)).toEqual(['task_2']);
    });
  });

  describe('markGoogleTaskCompleted & deleteGoogleTask', () => {
    it('returns true on 200 OK PATCH completion', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const ok = await markGoogleTaskCompleted('tok_123', 'list_1', 'task_1');
      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/list_1/tasks/task_1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        })
      );
    });

    it('clears stored access token and returns false on 401', async () => {
      saveStoredAccessToken('tok_expired', 3600);
      expect(getStoredAccessToken()).toBe('tok_expired');

      const fetchMock = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
      vi.stubGlobal('fetch', fetchMock);

      const ok = await markGoogleTaskCompleted('tok_expired', 'list_1', 'task_1');
      expect(ok).toBe(false);
      expect(getStoredAccessToken()).toBeNull();
    });

    it('falls back across active lists on 404 and succeeds when found in another list', async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/lists/wrong_list/tasks/task_x') && init?.method === 'PATCH') {
          return new Response('Not Found', { status: 404 });
        }
        if (url === 'https://tasks.googleapis.com/tasks/v1/users/@me/lists') {
          return new Response(
            JSON.stringify({
              items: [
                { id: 'wrong_list', title: 'Old List' },
                { id: 'real_list', title: 'Tasks' },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes('/lists/wrong_list/tasks?')) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        if (url.includes('/lists/real_list/tasks?')) {
          return new Response(
            JSON.stringify({ items: [{ id: 'task_x', title: 'Call Sam', status: 'needsAction', updated: '2026-11-19T10:00:00Z' }] }),
            { status: 200 }
          );
        }
        if (url.endsWith('/lists/real_list/tasks/task_x') && init?.method === 'PATCH') {
          return new Response('{}', { status: 200 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const ok = await markGoogleTaskCompleted('tok_ok', 'wrong_list', 'task_x');
      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/real_list/tasks/task_x',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('treats 404 as done when task is absent from all active Google Task lists', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.endsWith('/lists/list_1/tasks/task_gone')) {
          return new Response('Not Found', { status: 404 });
        }
        if (url === 'https://tasks.googleapis.com/tasks/v1/users/@me/lists') {
          return new Response(JSON.stringify({ items: [{ id: 'list_1', title: 'Tasks' }] }), { status: 200 });
        }
        if (url.includes('/lists/list_1/tasks?')) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const ok = await markGoogleTaskCompleted('tok_ok', 'list_1', 'task_gone');
      expect(ok).toBe(true);
    });

    it('returns false on 500 error or network failure', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockRejectedValueOnce(new Error('Network down'));
      vi.stubGlobal('fetch', fetchMock);

      expect(await markGoogleTaskCompleted('tok_ok', 'list_1', 'task_1')).toBe(false);
      expect(await markGoogleTaskCompleted('tok_ok', 'list_1', 'task_1')).toBe(false);
    });

    it('deleteGoogleTask returns true on 204 and clears token + returns false on 401', async () => {
      saveStoredAccessToken('tok_del', 3600);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
      vi.stubGlobal('fetch', fetchMock);

      expect(await deleteGoogleTask('tok_del', 'list_1', 'task_a')).toBe(true);
      expect(getStoredAccessToken()).toBe('tok_del');

      expect(await deleteGoogleTask('tok_del', 'list_1', 'task_b')).toBe(false);
      expect(getStoredAccessToken()).toBeNull();
    });
  });

  describe('flushGoogleTaskCompletionsAndDeletions', () => {
    it('flushes queued ops using live listId, retains failed ops, completes retroactive deleted/done items, and drops absent completes', async () => {
      // Queued ops
      enqueuePendingGoogleTaskOp({ taskId: 'gt_queued_complete', listId: '@default', action: 'complete', timestamp: 1 });
      enqueuePendingGoogleTaskOp({ taskId: 'gt_queued_delete', listId: 'list_jobs', action: 'delete', timestamp: 2 });
      enqueuePendingGoogleTaskOp({ taskId: 'gt_queued_fail', listId: 'list_tasks', action: 'complete', timestamp: 3 });
      enqueuePendingGoogleTaskOp({ taskId: 'gt_already_absent', listId: 'list_tasks', action: 'complete', timestamp: 4 });

      // Retroactive deleted ID recorded before queue existed
      recordDeletedGoogleTaskId('gt_retro_deleted_id');

      // Local board items already marked completed
      const boardData = makeEmptyBoard({
        quick_jobs: [
          { id: 'qj-1', title: 'Done Quick Task', done: true, createdAt: 1, googleTaskId: 'gt_board_qj_done' },
        ],
        responsibilities: [
          { id: 'resp-1', title: 'Done Job', steps: ['Step 1'], current_step_index: 1, status: 'done', createdAt: 1, googleTaskId: 'gt_board_resp_done' },
        ],
        projects: [
          { id: 'proj-1', name: 'Done Project', status: 'completed', current_position: 'Done', next_step: 'None', last_updated: 1, review_interval_days: 7, history: [], googleTaskId: 'gt_board_proj_done' },
        ],
      });

      const activeTaskLists = [
        {
          listId: 'live_tasks_list',
          listTitle: 'Tasks',
          tasks: [
            { id: 'gt_queued_complete', title: 'Queued Complete', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            { id: 'gt_queued_fail', title: 'Queued Fail', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            { id: 'gt_retro_deleted_id', title: 'Retro ID', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            { id: 'gt_board_qj_done', title: 'Board QJ', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'live_jobs_list',
          listTitle: 'Jobs',
          tasks: [
            { id: 'gt_queued_delete', title: 'Queued Delete', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            { id: 'gt_board_resp_done', title: 'Board Resp', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'live_projects_list',
          listTitle: 'Projects',
          tasks: [
            { id: 'gt_board_proj_done', title: 'Board Proj', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
      ];

      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/tasks/gt_queued_fail') && init?.method === 'PATCH') {
          return new Response('Server Error', { status: 500 });
        }
        if (init?.method === 'PATCH') {
          return new Response('{}', { status: 200 });
        }
        if (init?.method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await flushGoogleTaskCompletionsAndDeletions('tok_live', boardData, activeTaskLists);

      // Completed: gt_queued_complete, gt_retro_deleted_id, gt_board_qj_done, gt_board_resp_done, gt_board_proj_done (5)
      // Deleted: gt_queued_delete (1)
      expect(res.completedCount).toBe(5);
      expect(res.deletedCount).toBe(1);
      expect(res.errors).toHaveLength(1);
      expect(res.flushedTaskIds).toEqual(
        new Set([
          'gt_queued_complete',
          'gt_queued_delete',
          'gt_retro_deleted_id',
          'gt_board_qj_done',
          'gt_board_resp_done',
          'gt_board_proj_done',
        ])
      );

      // Should use live_tasks_list from activeTaskLists even though queued op originally had '@default'
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/live_tasks_list/tasks/gt_queued_complete',
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/live_jobs_list/tasks/gt_queued_delete',
        expect.objectContaining({ method: 'DELETE' })
      );

      // Already-absent pending complete op must be cleared without calling PATCH on it
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('gt_already_absent'),
        expect.anything()
      );

      // Only the failed op should remain in pending storage
      expect(getPendingGoogleTaskOps().map((o) => o.taskId)).toEqual(['gt_queued_fail']);
    });

    it('matches and completes active Google Tasks by normalized title when done locally without current googleTaskId (while sparing active titles and habits)', async () => {
      const boardData = makeEmptyBoard({
        quick_jobs: [
          { id: 'qj-unlinked', title: 'Buy Oat Milk', done: true, createdAt: Date.now() },
          { id: 'qj-old-id', title: 'Email Dentist', done: true, createdAt: Date.now(), googleTaskId: 'stale_old_id' },
          // Title collision: one done, one STILL active -> must NOT complete the Google Task by title!
          { id: 'qj-dup-done', title: 'Call Mom', done: true, createdAt: Date.now() },
          { id: 'qj-dup-active', title: 'Call Mom', done: false, createdAt: Date.now() },
        ],
        responsibilities: [
          {
            id: 'resp-unlinked',
            title: 'Submit Tax Form',
            steps: ['Sign PDF'],
            current_step_index: 1,
            status: 'done',
            createdAt: Date.now(),
          },
        ],
        projects: [
          {
            id: 'proj-unlinked',
            name: 'Kitchen Shelf',
            status: 'completed',
            current_position: 'Done',
            next_step: 'Finished',
            last_updated: Date.now(),
            review_interval_days: 7,
            history: [],
          },
        ],
      });

      const activeTaskLists = [
        {
          listId: 'list_tasks',
          listTitle: 'Tasks',
          tasks: [
            { id: 'gt_oat_milk', title: 'Task: Buy Oat Milk [5m]', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            { id: 'gt_dentist', title: '[1m] Email Dentist', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            { id: 'gt_call_mom', title: 'Task: Call Mom', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'list_jobs',
          listTitle: 'Jobs',
          tasks: [
            { id: 'gt_tax', title: 'Job: Submit Tax Form -> Mail envelope', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'list_projects',
          listTitle: 'Projects',
          tasks: [
            { id: 'gt_kitchen', title: 'Project: Kitchen Shelf | Next: Mount brackets', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'list_habits',
          listTitle: 'Habits',
          tasks: [
            { id: 'gt_habit_collision', title: 'Buy Oat Milk', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
      ];

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          return new Response('{}', { status: 200 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await flushGoogleTaskCompletionsAndDeletions('tok_title', boardData, activeTaskLists);

      expect(res.completedCount).toBe(4);
      expect(res.flushedTaskIds).toEqual(new Set(['gt_oat_milk', 'gt_dentist', 'gt_tax', 'gt_kitchen']));
      expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('gt_call_mom'), expect.anything());
      expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('gt_habit_collision'), expect.anything());
      expect(getDeletedGoogleTaskIds().has('gt_oat_milk')).toBe(true);
      expect(getDeletedGoogleTaskIds().has('gt_tax')).toBe(true);
    });
  });

  describe('400 Bad Request cross-list fallback & syncTasksIntoBoard pruning/Jobs detection', () => {
    it('falls back across active lists on 400 Bad Request and completes task in its actual list', async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/lists/@default/tasks/task_400') && init?.method === 'PATCH') {
          return new Response('Invalid task ID for default list', { status: 400 });
        }
        if (url === 'https://tasks.googleapis.com/tasks/v1/users/@me/lists') {
          return new Response(
            JSON.stringify({
              items: [
                { id: 'list_default', title: 'My Tasks' },
                { id: 'list_dedicated_tasks', title: 'Tasks' },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes('/lists/list_default/tasks?')) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        if (url.includes('/lists/list_dedicated_tasks/tasks?')) {
          return new Response(
            JSON.stringify({
              items: [{ id: 'task_400', title: 'Task: Relocated item', status: 'needsAction', updated: '2026-11-19T10:00:00Z' }],
            }),
            { status: 200 }
          );
        }
        if (url.endsWith('/lists/list_dedicated_tasks/tasks/task_400') && init?.method === 'PATCH') {
          return new Response('{}', { status: 200 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const ok = await markGoogleTaskCompleted('tok_400', '@default', 'task_400');
      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/list_dedicated_tasks/tasks/task_400',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('returns false on 400 Bad Request if the task still exists in the original targetList', async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/lists/list_same/tasks/task_bad') && init?.method === 'PATCH') {
          return new Response('Bad Request', { status: 400 });
        }
        if (url === 'https://tasks.googleapis.com/tasks/v1/users/@me/lists') {
          return new Response(JSON.stringify({ items: [{ id: 'list_same', title: 'Tasks' }] }), { status: 200 });
        }
        if (url.includes('/lists/list_same/tasks?')) {
          return new Response(
            JSON.stringify({ items: [{ id: 'task_bad', title: 'Still active', status: 'needsAction', updated: '2026-11-19T10:00:00Z' }] }),
            { status: 200 }
          );
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      expect(await markGoogleTaskCompleted('tok_same', 'list_same', 'task_bad')).toBe(false);
    });

    it('prunes recent done/deleted tasks inside the 30-min grace period, skips relocating done tasks, and routes "Jobs" list items to responsibilities', () => {
      const now = Date.now();
      recordDeletedGoogleTaskId('gt_deleted_recent');

      const boardData = makeEmptyBoard({
        quick_jobs: [
          { id: 'qj-recent-done', title: 'Done Within Grace', done: true, createdAt: now, googleTaskId: 'gt_recent_done' },
          { id: 'qj-deleted-recent', title: 'Deleted Within Grace', done: false, createdAt: now, googleTaskId: 'gt_deleted_recent' },
          { id: 'qj-active-keep', title: 'Keep Active Task', done: false, createdAt: now, googleTaskId: 'gt_active_keep' },
        ],
        responsibilities: [
          { id: 'resp-recent-done', title: 'Done Job Recent', steps: ['S1'], current_step_index: 1, status: 'done', createdAt: now, googleTaskId: 'gt_resp_done' },
        ],
        projects: [
          { id: 'proj-done-reloc', name: 'Done Proj', status: 'completed', current_position: 'Done', next_step: 'None', last_updated: now, review_interval_days: 7, history: [] },
        ],
      });

      const taskLists = [
        {
          listId: 'default_list',
          listTitle: 'My Tasks',
          tasks: [
            // Done locally, sitting in wrong list — must NOT be relocated or re-added
            { id: 'gt_recent_done', title: 'Task: Done Within Grace', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
            // Completed project sitting in wrong list — must NOT be relocated
            { id: 'gt_proj_done_wrong_list', title: 'Project: Done Proj | Next: None', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'tasks_list',
          listTitle: 'Tasks',
          tasks: [
            { id: 'gt_active_keep', title: 'Task: Keep Active Task', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
        {
          listId: 'jobs_list',
          listTitle: 'Jobs',
          tasks: [
            { id: 'gt_job_untagged', title: 'Renew Passport -> Find photo', status: 'needsAction' as const, updated: '2026-11-19T10:00:00Z' },
          ],
        },
      ];

      const dedicatedLists = {
        tasksListId: 'tasks_list',
        quickJobsListId: 'tasks_list',
        jobsListId: 'jobs_list',
        responsibilitiesListId: 'jobs_list',
        projectsListId: 'projects_list',
        habitsListId: 'habits_list',
      };

      const res = syncTasksIntoBoard(boardData, taskLists, false, undefined, dedicatedLists);

      // Done and deleted recent items are pruned despite createdAt === now
      expect(res.updatedBoard.quick_jobs.map((j) => j.id)).toEqual(['qj-active-keep']);
      // Untagged item from "Jobs" list was routed to responsibilities, NOT quick_jobs, and NOT relocated
      expect(res.updatedBoard.responsibilities.map((r) => r.title)).toEqual(['Renew Passport']);
      expect(res.tasksToRelocate).toBeUndefined();
      expect(res.removedTasks).toBe(3);
    });

    it('falls back to normalized title delete when DELETE gets 404 due to relocated ID and records the live ID', async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/lists/old_list/tasks/old_relocated_id') && init?.method === 'DELETE') {
          return new Response('Not Found', { status: 404 });
        }
        if (url === 'https://tasks.googleapis.com/tasks/v1/users/@me/lists') {
          return new Response(
            JSON.stringify({
              items: [
                { id: 'old_list', title: 'My Tasks' },
                { id: 'tasks_list', title: 'Tasks' },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes('/lists/old_list/tasks?')) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        if (url.includes('/lists/tasks_list/tasks?')) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'new_live_id',
                  title: 'Task: Buy Filters',
                  status: 'needsAction',
                  updated: '2026-11-22T10:00:00Z',
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.endsWith('/lists/tasks_list/tasks/new_live_id') && init?.method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const ok = await deleteGoogleTask('tok_del', 'old_list', 'old_relocated_id', 'Buy Filters', 'quick');
      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/tasks_list/tasks/new_live_id',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(getDeletedGoogleTaskIds().has('new_live_id')).toBe(true);
    });

    it('resolves synthetic title:quick:... deletes when local item had no googleTaskId', async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url === 'https://tasks.googleapis.com/tasks/v1/users/@me/lists') {
          return new Response(JSON.stringify({ items: [{ id: 'tasks_list', title: 'Tasks' }] }), { status: 200 });
        }
        if (url.includes('/lists/tasks_list/tasks?')) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'live_unlinked_task',
                  title: 'Task: Scrub Sink [5m]',
                  status: 'needsAction',
                  updated: '2026-11-22T10:00:00Z',
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.endsWith('/lists/tasks_list/tasks/live_unlinked_task') && init?.method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const synthId = makeTitleFallbackOpId('quick', 'Scrub Sink');
      expect(synthId).toBe('title:quick:scrub%20sink');

      const ok = await deleteGoogleTask('tok_synth', '@default', synthId, 'Scrub Sink', 'quick');
      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://tasks.googleapis.com/tasks/v1/lists/tasks_list/tasks/live_unlinked_task',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(getDeletedGoogleTaskIds().has('live_unlinked_task')).toBe(true);
    });

    it('flushes queued deletes/completes with stale relocated IDs or synthetic title keys while sparing active titles', async () => {
      enqueuePendingGoogleTaskOp({
        taskId: 'stale_relocated_delete_id',
        listId: 'My Tasks',
        action: 'delete',
        timestamp: 10,
        title: 'Reset Router',
        itemType: 'quick',
      });
      enqueuePendingGoogleTaskOp({
        taskId: makeTitleFallbackOpId('quick', 'Water Ferns'),
        listId: '@default',
        action: 'delete',
        timestamp: 11,
        title: 'Water Ferns',
        itemType: 'quick',
      });
      enqueuePendingGoogleTaskOp({
        taskId: makeTitleFallbackOpId('quick', 'Keep Duplicate'),
        listId: '@default',
        action: 'delete',
        timestamp: 12,
        title: 'Keep Duplicate',
        itemType: 'quick',
      });

      const boardData = makeEmptyBoard({
        quick_jobs: [
          { id: 'qj-active-dup', title: 'Keep Duplicate', done: false, createdAt: Date.now() },
        ],
      });

      const activeTaskLists = [
        {
          listId: 'tasks_list',
          listTitle: 'Tasks',
          tasks: [
            { id: 'gt_reloc_router', title: 'Task: Reset Router', status: 'needsAction' as const, updated: '2026-11-22T10:00:00Z' },
            { id: 'gt_ferns', title: 'Task: Water Ferns', status: 'needsAction' as const, updated: '2026-11-22T10:00:00Z' },
            { id: 'gt_dup', title: 'Task: Keep Duplicate', status: 'needsAction' as const, updated: '2026-11-22T10:00:00Z' },
          ],
        },
      ];

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        return new Response('Unexpected', { status: 500 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await flushGoogleTaskCompletionsAndDeletions('tok_flush_reloc', boardData, activeTaskLists);
      expect(res.deletedCount).toBe(2);
      expect(res.flushedTaskIds).toEqual(new Set(['gt_reloc_router', 'gt_ferns']));
      expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('gt_dup'), expect.anything());
      expect(getPendingGoogleTaskOps()).toEqual([]);
    });

    it('immediately prunes Google-imported gt-* tasks deleted on another device even within minutes, while shielding brand-new local tasks', () => {
      const now = Date.now();
      const boardData = makeEmptyBoard({
        quick_jobs: [
          {
            id: 'gt-qj-deleted-remotely',
            title: 'Phone Deleted Task',
            done: false,
            createdAt: now - 2000,
            googleTaskId: 'gt_missing_remote',
          },
          {
            id: 'qj-local-brand-new',
            title: 'Just Created Local Task',
            done: false,
            createdAt: now - 2000,
            googleTaskId: 'gt_just_created_not_indexed',
          },
          {
            id: 'qj-local-pushed',
            title: 'Pushed This Cycle',
            done: false,
            createdAt: now - 60000,
            googleTaskId: 'gt_pushed_cycle',
          },
        ],
      });

      const res = syncTasksIntoBoard(
        boardData,
        [{ listId: 'tasks_list', listTitle: 'Tasks', tasks: [] }],
        false,
        new Set(['gt_pushed_cycle'])
      );

      expect(res.updatedBoard.quick_jobs.map((j) => j.id)).toEqual([
        'qj-local-brand-new',
        'qj-local-pushed',
      ]);
      expect(res.removedTasks).toBe(1);
    });
  });

  describe('Static Google Tasks Habits & Daily DO Refresh', () => {
    it('pushLocalTasksToGoogle never creates new tasks in Google Tasks for habits while pushing quick tasks', async () => {
      const boardData = makeEmptyBoard({
        quick_jobs: [
          { id: 'qj-new', title: 'Buy Oat Milk', done: false, createdAt: Date.now() },
        ],
        habits: [
          {
            id: 'hab-am',
            name: 'Push-ups 50 (mrng)',
            type: 'boolean',
            target: 50,
            next_due: 'Daily Morning',
            log: {},
          },
          {
            id: 'hab-custom',
            name: 'Stretch 10',
            type: 'boolean',
            target: 10,
            next_due: 'Daily Night',
            log: {},
          },
        ],
      });

      const createdCalls: Array<{ url: string; title: string }> = [];
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        createdCalls.push({ url, title: body.title });
        return new Response(JSON.stringify({ id: 'gt_created_qj' }), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await pushLocalTasksToGoogle('tok_push', boardData, {
        tasksListId: 'tasks_list',
        quickJobsListId: 'tasks_list',
        jobsListId: 'jobs_list',
        responsibilitiesListId: 'jobs_list',
        projectsListId: 'projects_list',
        habitsListId: 'habits_list',
      });

      expect(res.pushedCount).toBe(1);
      expect(createdCalls).toEqual([
        {
          url: 'https://tasks.googleapis.com/tasks/v1/lists/tasks_list/tasks',
          title: 'Task: Buy Oat Milk',
        },
      ]);
    });

    it('flushGoogleTaskCompletionsAndDeletions never marks Habits list tasks completed', async () => {
      recordDeletedGoogleTaskId('gt_hab_pushups_am');
      enqueuePendingGoogleTaskOp({
        taskId: 'gt_hab_pushups_am',
        listId: 'habits_list',
        action: 'complete',
        timestamp: 100,
        itemType: 'habit',
      });

      const boardData = makeEmptyBoard();
      const activeTaskLists = [
        {
          listId: 'habits_list',
          listTitle: 'Habits',
          tasks: [
            {
              id: 'gt_hab_pushups_am',
              title: 'Habit: Push-ups 50 (mrng)',
              status: 'needsAction' as const,
              updated: '2026-11-23T00:00:00Z',
            },
          ],
        },
      ];

      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const res = await flushGoogleTaskCompletionsAndDeletions('tok_hab_guard', boardData, activeTaskLists);

      expect(res.completedCount).toBe(0);
      expect(res.deletedCount).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(getPendingGoogleTaskOps()).toEqual([]);
    });

    it('syncHabitsWithBoardData refreshes yesterday logs cleanly today and creditHabitFromIgnition keeps Morning & Evening Push-ups distinct', () => {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = formatLocalDateString(yesterdayDate);
      const todayStr = getTodayDateString();

      const boardHabits = [
        {
          id: 'hab-am',
          name: 'Push-ups 50 (mrng)',
          target: 50,
          next_due: 'Daily Morning',
          log: { [yesterdayStr]: true },
        },
        {
          id: 'hab-pm',
          name: 'Push-ups 50 (nt)',
          target: 50,
          next_due: 'Daily Night',
          log: { [yesterdayStr]: true },
        },
      ];

      const refreshed = syncHabitsWithBoardData(boardHabits);
      expect(refreshed).toHaveLength(2);
      expect(refreshed.find((h) => h.habit_id === 'hab-am')?.isComplete).toBe(false);
      expect(refreshed.find((h) => h.habit_id === 'hab-pm')?.isComplete).toBe(false);
      expect(boardHabits[0].log[yesterdayStr]).toBe(true);
      expect(boardHabits[0].log[todayStr]).toBeUndefined();

      const { updated, isAllClear } = creditHabitFromIgnition('Push-ups 50 (mrng)', 50, 'hab-am');
      expect(isAllClear).toBe(false);
      expect(updated.find((h) => h.habit_id === 'hab-am')?.isComplete).toBe(true);
      expect(updated.find((h) => h.habit_id === 'hab-pm')?.isComplete).toBe(false);
    });
  });
});
