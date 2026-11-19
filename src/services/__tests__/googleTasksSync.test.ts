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
} from '../googleTasksService';
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
  });
});
