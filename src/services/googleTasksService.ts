import { MomentumBoardData, QuickJob, Responsibility, Project, Habit, QuickJobDuration, DedicatedTaskLists } from '../types';
import { getDeletedGoogleTaskIds } from './storageService';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: any) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status: 'needsAction' | 'completed';
  updated: string;
  deleted?: boolean;
  hidden?: boolean;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

const TOKEN_KEY = 'momentum_gtasks_token';
const TOKEN_EXPIRY_KEY = 'momentum_gtasks_token_expiry';
const USER_EMAIL_KEY = 'momentum_gtasks_email';

export function getStoredUserEmail(): string {
  try {
    return localStorage.getItem(USER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredUserEmail(email: string): void {
  try {
    if (email && email.includes('@')) {
      localStorage.setItem(USER_EMAIL_KEY, email.trim());
    }
  } catch {}
}

export function getStoredAccessToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiryStr) return null;
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry - 60000) {
      // Token expired or about to expire in 1 minute
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveStoredAccessToken(token: string, expiresInSeconds: number | string = 3600): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const seconds = typeof expiresInSeconds === 'string' ? parseInt(expiresInSeconds, 10) : expiresInSeconds;
    const expiry = Date.now() + (Number.isNaN(seconds) ? 3600 : seconds) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  } catch (e) {
    console.error('Failed to save Google Tasks token:', e);
  }
}

export function clearStoredAccessToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
}

export async function requestGoogleTasksAuth(
  clientId: string,
  promptConsent = false,
  emailHintOverride?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK is not loaded yet. Please ensure your browser has internet access.'));
      return;
    }

    if (!clientId.trim()) {
      reject(new Error('Google Client ID is missing. Please enter your OAuth Client ID in Settings.'));
      return;
    }

    const emailHint = (emailHintOverride || getStoredUserEmail()).trim();

    const timeoutId = setTimeout(() => {
      reject(new Error('Google sign-in timed out. Please check if the popup was blocked by your browser or opened behind your window.'));
    }, 25000);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/tasks',
        hint: emailHint || undefined,
        callback: async (response: GoogleTokenResponse) => {
          clearTimeout(timeoutId);
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (response.access_token) {
            saveStoredAccessToken(response.access_token, response.expires_in || 3600);
            if (emailHint) {
              saveStoredUserEmail(emailHint);
            }
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned by Google.'));
          }
        },
        error_callback: (err: any) => {
          clearTimeout(timeoutId);
          reject(new Error(err?.message || 'Google OAuth failed.'));
        },
      });

      tokenClient.requestAccessToken({
        prompt: promptConsent ? 'consent' : '',
        hint: emailHint || undefined,
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      reject(new Error(e?.message || 'Failed to initialize Google OAuth Token Client.'));
    }
  });
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (res.ok) {
      const data = await res.json();
      return data.email || null;
    }
  } catch {}
  return null;
}

export async function fetchAllGoogleTasks(accessToken: string): Promise<{ listId: string; listTitle: string; tasks: GoogleTaskItem[] }[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    // 1. Fetch all user's task lists
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!listsRes.ok) {
      if (listsRes.status === 401) {
        clearStoredAccessToken();
        throw new Error('Google Tasks session expired. Please click "Sync Tasks" to reconnect.');
      }
      const errText = await listsRes.text();
      if (errText.includes('Tasks API has not been used') || errText.includes('disabled') || listsRes.status === 403) {
        throw new Error(
          'Google Tasks API is not enabled in your Google Cloud project yet. Please enable it in 1 click at: https://console.cloud.google.com/apis/library/tasks.googleapis.com'
        );
      }
      throw new Error(`Google Tasks API error (${listsRes.status}): ${errText}`);
    }

    const listsData = await listsRes.json();
    const taskLists: GoogleTaskList[] = listsData.items || [];

    // 2. Fetch tasks for each list
    const results: { listId: string; listTitle: string; tasks: GoogleTaskItem[] }[] = [];

    for (const list of taskLists) {
      const tasksRes = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=false&showHidden=false&maxResults=100`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        }
      );

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const rawItems: any[] = data.items || [];
        // Strictly exclude completed, deleted, and hidden tasks
        const items: GoogleTaskItem[] = rawItems.filter(
          (t) => !t.deleted && t.status !== 'completed' && !t.hidden
        );
        results.push({
          listId: list.id,
          listTitle: list.title || 'My Tasks',
          tasks: items,
        });
      }
    }

    clearTimeout(timeoutId);
    return results;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Google Tasks request timed out. Please check your internet connection.');
    }
    throw err;
  }
}

/**
 * Ensures the 4 dedicated Google Task lists exist:
 * "Quick Jobs", "Responsibilities", "Projects", "Habits".
 * If any do not exist, creates them so the user has separate lists in their Google Tasks app/widget.
 */
export async function ensureGoogleTaskLists(accessToken: string): Promise<DedicatedTaskLists> {
  const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listsRes.ok) {
    throw new Error(`Failed to load Google Task lists (${listsRes.status})`);
  }

  const data = await listsRes.json();
  const existingLists: GoogleTaskList[] = data.items || [];
  const defaultList = existingLists[0] || { id: '@default', title: 'My Tasks' };

  // Match existing lists case-insensitively
  let quickJobs = existingLists.find((l) => /quick/i.test(l.title));
  let responsibilities = existingLists.find((l) => /resp|bigger/i.test(l.title));
  let projects = existingLists.find((l) => /project/i.test(l.title));
  let habits = existingLists.find((l) => /habit/i.test(l.title));

  const createList = async (title: string): Promise<GoogleTaskList> => {
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return defaultList;
  };

  if (!quickJobs) {
    if (/quick/i.test(defaultList.title)) {
      quickJobs = defaultList;
    } else {
      quickJobs = await createList('Quick Jobs');
    }
  }

  if (!responsibilities) {
    responsibilities = await createList('Responsibilities');
  }

  if (!projects) {
    projects = await createList('Projects');
  }

  if (!habits) {
    habits = await createList('Habits');
  }

  return {
    quickJobsListId: quickJobs.id || defaultList.id,
    responsibilitiesListId: responsibilities.id || defaultList.id,
    projectsListId: projects.id || defaultList.id,
    habitsListId: habits.id || defaultList.id,
  };
}

export interface TaskToRelocate {
  sourceListId: string;
  targetListId: string;
  task: GoogleTaskItem;
  momentumType: 'quick' | 'resp' | 'proj' | 'habit';
  title: string;
  notes?: string;
}

export interface SyncTasksResult {
  addedQuickJobs: number;
  addedResponsibilities: number;
  addedProjects: number;
  addedHabits: number;
  removedTasks: number;
  totalSynced: number;
  updatedBoard: MomentumBoardData;
  tasksToRelocate?: TaskToRelocate[];
}

/**
 * Parses multi-step task breakdowns from task notes.
 * Matches:
 * "Step 1: ...", "Step 2: ...", "1. ...", "2) ...", "- ...", "* ..."
 */
export function parseStepsFromNotes(notes?: string | null): string[] {
  if (!notes || !notes.trim()) return [];
  const lines = notes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];

  for (const line of lines) {
    if (/^(?:where holding|context|status):\s*/i.test(line)) {
      continue;
    }
    const cleaned = line
      .replace(/^(?:step\s*\d+[:.-]?|\d+[.)-]|[-*•])\s*/i, '')
      .trim();
    if (cleaned && cleaned.length > 1) {
      steps.push(cleaned);
    }
  }
  return steps;
}

/**
 * Intelligent parser & two-way synchronizer that:
 * 1. Prunes tasks that were deleted or completed in Google Tasks.
 * 2. Ingests new tasks and updates existing tasks across Momentum's 4 ADHD buckets.
 */
export function syncTasksIntoBoard(
  boardData: MomentumBoardData,
  taskLists: { listId: string; listTitle?: string; tasks: GoogleTaskItem[] }[],
  cleanOrphanedDemoTasks = false,
  newlyCreatedTaskIds?: Set<string>,
  dedicatedLists?: DedicatedTaskLists
): SyncTasksResult {
  let addedQuickJobs = 0;
  let addedResponsibilities = 0;
  let addedProjects = 0;
  let addedHabits = 0;
  let removedTasks = 0;
  const tasksToRelocate: TaskToRelocate[] = [];

  // 1. Build map of all active Google Tasks
  const activeGoogleTasks = new Map<string, { listId: string; listTitle?: string; task: GoogleTaskItem }>();
  for (const { listId, listTitle, tasks } of taskLists) {
    for (const task of tasks) {
      if (task.id && !task.deleted && task.status !== 'completed' && !task.hidden) {
        activeGoogleTasks.set(task.id, { listId, listTitle, task });
      }
    }
  }

  // Ensure newly pushed tasks in this sync cycle are immediately recognized as active
  if (newlyCreatedTaskIds) {
    for (const id of newlyCreatedTaskIds) {
      if (!activeGoogleTasks.has(id)) {
        activeGoogleTasks.set(id, {
          listId: '@default',
          task: { id, title: '', status: 'needsAction', updated: new Date().toISOString() },
        });
      }
    }
  }

  // Load deleted IDs so completed / deleted tasks are NEVER resurrected
  const deletedTaskIds = getDeletedGoogleTaskIds();

  // 30-minute grace period: tasks created or updated within 30 minutes are protected from remote pruning
  const GRACE_PERIOD_MS = 30 * 60 * 1000;
  const isProtectedFromPruning = (timestamp?: number, googleTaskId?: string) => {
    if (googleTaskId && newlyCreatedTaskIds && newlyCreatedTaskIds.has(googleTaskId)) {
      return true;
    }
    if (timestamp && Date.now() - timestamp < GRACE_PERIOD_MS) {
      return true;
    }
    return false;
  };

  // 2. TWO-WAY PRUNING:
  // If a task was linked to Google Tasks (or cleanOrphanedDemoTasks is on) and no longer exists in Google Tasks, remove it!
  const quickJobs = boardData.quick_jobs.filter((j) => {
    // If protected by grace period or just pushed, ALWAYS preserve
    if (isProtectedFromPruning(j.createdAt, j.googleTaskId)) {
      return true;
    }

    // If marked deleted/completed by user in Momentum, prune it
    if (j.googleTaskId && deletedTaskIds.has(j.googleTaskId)) {
      removedTasks++;
      return false;
    }

    // If linked to Google Tasks and missing from active Google Tasks (and outside grace period), prune it
    if (j.googleTaskId && !activeGoogleTasks.has(j.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (j.id.startsWith('gt-qj-')) {
      const gId = j.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    if (cleanOrphanedDemoTasks && (j.id === 'qj-1' || j.id === 'qj-2')) {
      removedTasks++;
      return false;
    }

    return true;
  });

  const responsibilities = boardData.responsibilities.filter((r) => {
    if (isProtectedFromPruning(r.createdAt, r.googleTaskId)) {
      return true;
    }

    if (r.googleTaskId && deletedTaskIds.has(r.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (r.googleTaskId && !activeGoogleTasks.has(r.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (r.id.startsWith('gt-resp-')) {
      const gId = r.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    if (cleanOrphanedDemoTasks && r.id === 'resp-1') {
      removedTasks++;
      return false;
    }

    return true;
  });

  const projects = boardData.projects.filter((p) => {
    if (isProtectedFromPruning(p.last_updated, p.googleTaskId)) {
      return true;
    }

    if (p.googleTaskId && deletedTaskIds.has(p.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (p.googleTaskId && !activeGoogleTasks.has(p.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (p.id.startsWith('gt-proj-')) {
      const gId = p.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    if (cleanOrphanedDemoTasks && (p.id === 'proj-1' || p.id === 'proj-2')) {
      removedTasks++;
      return false;
    }

    return true;
  });

  const habits = boardData.habits.filter((h) => {
    if (isProtectedFromPruning(undefined, h.googleTaskId)) {
      return true;
    }

    if (h.googleTaskId && deletedTaskIds.has(h.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (h.googleTaskId && !activeGoogleTasks.has(h.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (h.id.startsWith('gt-hab-')) {
      const gId = h.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    return true;
  });

  // Helper set of existing task titles and googleTaskIds to avoid duplicates
  const existingJobKeys = new Set(quickJobs.map((j) => j.googleTaskId || j.title.toLowerCase().trim()));
  const existingRespKeys = new Set(responsibilities.map((r) => r.googleTaskId || r.title.toLowerCase().trim()));
  const existingProjKeys = new Set(projects.map((p) => p.googleTaskId || p.name.toLowerCase().trim()));
  const existingHabitKeys = new Set(habits.map((h) => h.googleTaskId || h.name.toLowerCase().trim()));

  for (const { listId, listTitle, tasks } of taskLists) {
    const listName = listTitle || '';
    const isProjectList = /project/i.test(listName);
    const isRespList = /resp|bigger/i.test(listName);
    const isHabitList = /habit/i.test(listName);

    for (const task of tasks) {
      const rawTitle = (task.title || '').trim();
      if (!rawTitle) continue;

      const taskId = task.id;

      // Skip anything explicitly deleted by ID
      if (taskId && deletedTaskIds.has(taskId)) continue;

      const noteSteps = parseStepsFromNotes(task.notes);

      const projMatch = rawTitle.match(/^project:\s*(.+)$/i);
      const respMatch = rawTitle.match(/^(?:job|bigger\s*job|resp|responsibility|bigger):\s*(.+)$/i);
      const habitMatch = rawTitle.match(/^habit:\s*(.+)$/i);
      const taskMatch = rawTitle.match(/^task:\s*(.+)$/i);
      const quickMatch = rawTitle.match(/^\[(1m|5m|15m)\]\s*(.+)$/i);

      // 1. QUICK TASKS (Explicitly Tagged "Task: ...", or [1m], [5m], [15m])
      if (taskMatch || quickMatch) {
        let cleanTitle = taskMatch ? taskMatch[1].trim() : (quickMatch ? quickMatch[2].trim() : rawTitle);
        let duration: QuickJobDuration = '5m';

        // Check if duration was specified like [1m], [5m], [15m] inside the job text
        const innerDurMatch = cleanTitle.match(/^\[(1m|5m|15m)\]\s*(.+)$/i);
        if (innerDurMatch) {
          duration = innerDurMatch[1].toLowerCase() as QuickJobDuration;
          cleanTitle = innerDurMatch[2].trim();
        } else if (quickMatch) {
          duration = quickMatch[1].toLowerCase() as QuickJobDuration;
        }

        // Relocate if sitting in main list or another list
        if (dedicatedLists?.quickJobsListId && listId !== dedicatedLists.quickJobsListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: dedicatedLists.quickJobsListId,
            task,
            momentumType: 'quick',
            title: `Task: [${duration}] ${cleanTitle}`,
            notes: task.notes,
          });
        }

        const existing = quickJobs.find(
          (j) => (taskId && j.googleTaskId === taskId) || j.title.toLowerCase().trim() === cleanTitle.toLowerCase()
        );

        if (!existing) {
          quickJobs.unshift({
            id: `gt-qj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            duration,
            done: false,
            createdAt: Date.now(),
            googleTaskId: taskId,
            googleTaskListId: listId,
            due: task.due ? task.due.split('T')[0] : null,
          });
          addedQuickJobs++;
        } else {
          existing.googleTaskId = taskId;
          existing.googleTaskListId = listId;
          if (task.due) existing.due = task.due.split('T')[0];
        }
        continue;
      }

      // 2. BIGGER RESPONSIBILITIES (Tagged "Resp: ...", "Responsibility: ...", "Bigger: ..." OR located in a Responsibilities list)
      if (respMatch || (isRespList && !projMatch && !habitMatch)) {
        const fullContent = respMatch ? respMatch[1].trim() : rawTitle;
        let respTitle = fullContent;
        let nextStep = '';

        if (fullContent.includes('->')) {
          const parts = fullContent.split('->');
          respTitle = parts[0].trim();
          nextStep = parts.slice(1).join('->').trim();
        }

        // Relocate if sitting in main list or another list
        if (dedicatedLists?.responsibilitiesListId && listId !== dedicatedLists.responsibilitiesListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: dedicatedLists.responsibilitiesListId,
            task,
            momentumType: 'resp',
            title: `Job: ${respTitle}${nextStep ? ` -> ${nextStep}` : ''}`,
            notes: task.notes,
          });
        }

        // Incorporate multi-step breakdown from task notes
        let allSteps: string[] = [];
        if (nextStep && noteSteps.length > 0) {
          if (noteSteps[0].toLowerCase() === nextStep.toLowerCase()) {
            allSteps = noteSteps;
          } else {
            allSteps = [nextStep, ...noteSteps];
          }
        } else if (nextStep) {
          allSteps = [nextStep];
        } else if (noteSteps.length > 0) {
          allSteps = noteSteps;
        } else {
          allSteps = ['Step 1: First physical action'];
        }

        const key = taskId || respTitle.toLowerCase();
        if (!existingRespKeys.has(key)) {
          responsibilities.unshift({
            id: `gt-resp-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: respTitle,
            steps: allSteps,
            current_step_index: 0,
            status: 'active',
            createdAt: Date.now(),
            googleTaskId: taskId,
            googleTaskListId: listId,
            due: task.due ? task.due.split('T')[0] : null,
          });
          existingRespKeys.add(key);
          addedResponsibilities++;
        } else {
          const existing = responsibilities.find((r) => r.googleTaskId === taskId || r.title.toLowerCase().trim() === respTitle.toLowerCase());
          if (existing) {
            existing.googleTaskId = taskId;
            existing.googleTaskListId = listId;
            if (task.due) existing.due = task.due.split('T')[0];
          }
        }
        continue;
      }

      // 3. HABITS (Tagged "Habit: ..." OR located in a Habits list)
      if (habitMatch || (isHabitList && !projMatch && !respMatch)) {
        const habitName = habitMatch ? habitMatch[1].trim() : rawTitle;

        // Relocate if sitting in main list or another list
        if (dedicatedLists?.habitsListId && listId !== dedicatedLists.habitsListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: dedicatedLists.habitsListId,
            task,
            momentumType: 'habit',
            title: `Habit: ${habitName}`,
            notes: task.notes,
          });
        }

        const key = taskId || habitName.toLowerCase();
        if (!existingHabitKeys.has(key)) {
          habits.push({
            id: `gt-hab-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: habitName,
            type: 'boolean',
            target: 1,
            next_due: 'Daily',
            log: {},
            googleTaskId: taskId,
            googleTaskListId: listId,
          });
          existingHabitKeys.add(key);
          addedHabits++;
        } else {
          const existing = habits.find((h) => h.googleTaskId === taskId || h.name.toLowerCase().trim() === habitName.toLowerCase());
          if (existing) {
            existing.googleTaskId = taskId;
            existing.googleTaskListId = listId;
          }
        }
        continue;
      }

      // 4. PROJECTS (Tagged "Project: ..." OR located in a Projects list)
      if (projMatch || (isProjectList && !respMatch && !habitMatch)) {
        const fullContent = projMatch ? projMatch[1].trim() : rawTitle;
        let projName = fullContent;
        let nextStep = '';

        if (fullContent.includes('|')) {
          const parts = fullContent.split('|');
          projName = parts[0].trim();
          const nextPart = parts.slice(1).join('|').trim();
          if (nextPart.toLowerCase().startsWith('next:')) {
            nextStep = nextPart.substring(5).trim();
          } else {
            nextStep = nextPart;
          }
        }

        // Relocate if sitting in main list or another list
        if (dedicatedLists?.projectsListId && listId !== dedicatedLists.projectsListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: dedicatedLists.projectsListId,
            task,
            momentumType: 'proj',
            title: `Project: ${projName}${nextStep ? ` | Next: ${nextStep}` : ''}`,
            notes: task.notes,
          });
        }

        // Parse multi-step items from notes
        let upcomingSteps: string[] = [];
        if (!nextStep && noteSteps.length > 0) {
          nextStep = noteSteps[0];
          upcomingSteps = noteSteps.slice(1);
        } else if (nextStep && noteSteps.length > 0) {
          if (noteSteps[0].toLowerCase() === nextStep.toLowerCase()) {
            upcomingSteps = noteSteps.slice(1);
          } else {
            upcomingSteps = noteSteps;
          }
        } else if (!nextStep) {
          nextStep = 'Define initial prototype';
        }

        // Check if notes had a "Where holding:" context line
        let currentPosition = 'Imported from Google Tasks';
        if (task.notes) {
          const posLine = task.notes.split(/\r?\n/).find((l) => /^(?:where holding|context|status):\s*/i.test(l.trim()));
          if (posLine) {
            currentPosition = posLine.replace(/^(?:where holding|context|status):\s*/i, '').trim();
          }
        }

        const key = taskId || projName.toLowerCase();
        if (!existingProjKeys.has(key)) {
          projects.push({
            id: `gt-proj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: projName,
            status: 'moving',
            current_position: currentPosition,
            next_step: nextStep,
            upcoming_steps: upcomingSteps.length > 0 ? upcomingSteps : undefined,
            last_updated: Date.now(),
            review_interval_days: 7,
            history: [
              {
                timestamp: Date.now(),
                note: `Imported from Google Tasks: ${currentPosition}`,
                next_step: nextStep,
              },
            ],
            googleTaskId: taskId,
            googleTaskListId: listId,
          });
          existingProjKeys.add(key);
          addedProjects++;
        } else {
          const existing = projects.find((p) => p.googleTaskId === taskId || p.name.toLowerCase().trim() === projName.toLowerCase());
          if (existing) {
            existing.googleTaskId = taskId;
            existing.googleTaskListId = listId;
          }
        }
        continue;
      }

      // 5. UNTAGGED REGULAR TASK: Route to Quick Jobs (5m default) so ADHD user never loses a task
      const cleanGenericTitle = rawTitle;

      if (dedicatedLists?.quickJobsListId && listId !== dedicatedLists.quickJobsListId) {
        tasksToRelocate.push({
          sourceListId: listId,
          targetListId: dedicatedLists.quickJobsListId,
          task,
          momentumType: 'quick',
          title: `[5m] ${cleanGenericTitle}`,
          notes: task.notes,
        });
      }

      const existing = quickJobs.find(
        (j) => (taskId && j.googleTaskId === taskId) || j.title.toLowerCase().trim() === cleanGenericTitle.toLowerCase()
      );

      if (!existing) {
        quickJobs.unshift({
          id: `gt-qj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: cleanGenericTitle,
          duration: '5m',
          done: false,
          createdAt: Date.now(),
          googleTaskId: taskId,
          googleTaskListId: listId,
          due: task.due ? task.due.split('T')[0] : null,
        });
        addedQuickJobs++;
      } else {
        existing.googleTaskId = taskId;
        existing.googleTaskListId = listId;
        if (task.due) existing.due = task.due.split('T')[0];
      }
    }
  }

  const totalSynced = addedQuickJobs + addedResponsibilities + addedProjects + addedHabits;

  return {
    addedQuickJobs,
    addedResponsibilities,
    addedProjects,
    addedHabits,
    removedTasks,
    totalSynced,
    updatedBoard: {
      ...boardData,
      quick_jobs: quickJobs,
      responsibilities,
      projects,
      habits,
    },
    tasksToRelocate: tasksToRelocate.length > 0 ? tasksToRelocate : undefined,
  };
}

/**
 * Mark a task completed on Google Tasks when checked off in Momentum
 */
export async function markGoogleTaskCompleted(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  try {
    const targetList = listId || '@default';
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      }
    );
    if (!res.ok && res.status === 404) {
      try {
        const allLists = await fetchAllGoogleTasks(accessToken);
        for (const l of allLists) {
          if (l.listId !== targetList) {
            await fetch(
              `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(l.listId)}/tasks/${encodeURIComponent(taskId)}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'completed' }),
              }
            );
          }
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to mark task completed on Google Tasks:', e);
  }
}

/**
 * Permanently delete a task on Google Tasks when removed from Momentum
 */
export async function deleteGoogleTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  try {
    const targetList = listId || '@default';
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok && res.status === 404) {
      try {
        const allLists = await fetchAllGoogleTasks(accessToken);
        for (const l of allLists) {
          if (l.listId !== targetList) {
            await fetch(
              `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(l.listId)}/tasks/${encodeURIComponent(taskId)}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
          }
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to delete task from Google Tasks:', e);
  }
}

/**
 * Create a new task in Google Tasks
 */
export async function createGoogleTask(
  accessToken: string,
  listId: string,
  title: string,
  notes?: string
): Promise<string> {
  const targetList = !listId || listId === '@default' ? '@default' : listId;
  const payload: any = {
    title: title.trim(),
    status: 'needsAction',
  };
  if (notes && notes.trim()) {
    payload.notes = notes.trim();
  }

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList)}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    // If target list returned 404, fallback to first real list in users/@me/lists
    if (res.status === 404) {
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        const fallbackListId = (listsData.items || [])[0]?.id;
        if (fallbackListId && fallbackListId !== targetList) {
          const retryRes = await fetch(
            `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(fallbackListId)}/tasks`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
          if (retryRes.ok) {
            const data = await retryRes.json();
            return data.id;
          }
        }
      }
    }
    throw new Error(`Google Tasks API create error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data?.id) {
    throw new Error('Google Tasks API returned no task ID.');
  }
  return data.id;
}

/**
 * Two-way upload: Pushes newly created local tasks to Google Tasks so all devices receive them.
 */
export async function pushLocalTasksToGoogle(
  accessToken: string,
  boardData: MomentumBoardData,
  targetLists?: DedicatedTaskLists | string
): Promise<{
  updatedBoard: MomentumBoardData;
  pushedCount: number;
  pushedTaskIds: string[];
  errors: string[];
}> {
  let pushedCount = 0;
  const pushedTaskIds: string[] = [];
  const errors: string[] = [];
  const updatedQuickJobs = [...boardData.quick_jobs];
  const updatedResponsibilities = [...boardData.responsibilities];
  const updatedProjects = [...boardData.projects];
  const updatedHabits = [...boardData.habits];

  const listConfig: DedicatedTaskLists =
    typeof targetLists === 'object' && targetLists !== null
      ? targetLists
      : {
          quickJobsListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
          responsibilitiesListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
          projectsListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
          habitsListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
        };

  // 1. Quick Jobs -> quickJobsListId
  for (let i = 0; i < updatedQuickJobs.length; i++) {
    const job = updatedQuickJobs[i];
    if (!job.googleTaskId && !job.done) {
      if (job.id === 'qj-1' || job.id === 'qj-2') continue;
      try {
        const title = `Task: [${job.duration || '5m'}] ${job.title}`;
        const taskId = await createGoogleTask(accessToken, listConfig.quickJobsListId, title);
        if (taskId) {
          updatedQuickJobs[i] = {
            ...job,
            googleTaskId: taskId,
            googleTaskListId: listConfig.quickJobsListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Quick Job "${job.title}": ${err?.message || err}`);
      }
    }
  }

  // 2. Responsibilities -> responsibilitiesListId
  for (let i = 0; i < updatedResponsibilities.length; i++) {
    const resp = updatedResponsibilities[i];
    if (!resp.googleTaskId && resp.status === 'active') {
      if (resp.id === 'resp-1') continue;
      try {
        const currentStep = resp.steps[resp.current_step_index] || resp.steps[0] || 'First step';
        const title = `Job: ${resp.title} -> ${currentStep}`;
        const remainingSteps = resp.steps.slice(resp.current_step_index + 1);
        const notes = remainingSteps.length > 0
          ? remainingSteps.map((s, idx) => `Step ${idx + 2}: ${s}`).join('\n')
          : undefined;

        const taskId = await createGoogleTask(accessToken, listConfig.responsibilitiesListId, title, notes);
        if (taskId) {
          updatedResponsibilities[i] = {
            ...resp,
            googleTaskId: taskId,
            googleTaskListId: listConfig.responsibilitiesListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Responsibility "${resp.title}": ${err?.message || err}`);
      }
    }
  }

  // 3. Projects -> projectsListId
  for (let i = 0; i < updatedProjects.length; i++) {
    const proj = updatedProjects[i];
    if (!proj.googleTaskId && proj.status !== 'completed' && proj.status !== 'parked') {
      if (proj.id === 'proj-1' || proj.id === 'proj-2') continue;
      try {
        const title = `Project: ${proj.name} | Next: ${proj.next_step}`;
        const notesLines = [
          `Where holding: ${proj.current_position || 'Active prototype'}`,
        ];
        if (proj.upcoming_steps && proj.upcoming_steps.length > 0) {
          proj.upcoming_steps.forEach((s, idx) => {
            notesLines.push(`Step ${idx + 2}: ${s}`);
          });
        }
        const notes = notesLines.join('\n');

        const taskId = await createGoogleTask(accessToken, listConfig.projectsListId, title, notes);
        if (taskId) {
          updatedProjects[i] = {
            ...proj,
            googleTaskId: taskId,
            googleTaskListId: listConfig.projectsListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Project "${proj.name}": ${err?.message || err}`);
      }
    }
  }

  // 4. Habits -> habitsListId
  for (let i = 0; i < updatedHabits.length; i++) {
    const habit = updatedHabits[i];
    if (!habit.googleTaskId) {
      if (habit.id === 'hab-1' || habit.id === 'hab-2') continue;
      try {
        const title = `Habit: ${habit.name}`;
        const taskId = await createGoogleTask(accessToken, listConfig.habitsListId, title);
        if (taskId) {
          updatedHabits[i] = {
            ...habit,
            googleTaskId: taskId,
            googleTaskListId: listConfig.habitsListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Habit "${habit.name}": ${err?.message || err}`);
      }
    }
  }

  return {
    updatedBoard: {
      ...boardData,
      quick_jobs: updatedQuickJobs,
      responsibilities: updatedResponsibilities,
      projects: updatedProjects,
      habits: updatedHabits,
    },
    pushedCount,
    pushedTaskIds,
    errors,
  };
}

/**
 * Fetch tasks from Google Apps Script Webhook Relay (Zero-login permanent sync)
 */
export async function fetchGoogleTasksFromWebhook(
  webhookUrl: string
): Promise<{ listId: string; tasks: GoogleTaskItem[] }[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(webhookUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Webhook returned status ${res.status}`);
    }
    const data = await res.json();
    const items: GoogleTaskItem[] = data.tasks || (Array.isArray(data) ? data : []);
    return [{ listId: '@default', tasks: items }];
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Mark a task completed via Google Apps Script Webhook Relay
 */
export async function markGoogleTaskCompletedViaWebhook(
  webhookUrl: string,
  taskId: string
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'complete', taskId }),
    });
  } catch (e) {
    console.warn('Webhook complete failed:', e);
  }
}

/**
 * Delete a task via Google Apps Script Webhook Relay
 */
export async function deleteGoogleTaskViaWebhook(
  webhookUrl: string,
  taskId: string
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', taskId }),
    });
  } catch (e) {
    console.warn('Webhook delete failed:', e);
  }
}

/**
 * Create a task via Google Apps Script Webhook Relay
 */
export async function createGoogleTaskViaWebhook(
  webhookUrl: string,
  title: string,
  notes?: string
): Promise<string | null> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'create', title, notes: notes || '' }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.task?.id || data?.id || null;
    }
  } catch (e) {
    console.warn('Webhook create failed:', e);
  }
  return null;
}

