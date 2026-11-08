import { MomentumBoardData, QuickJob, Responsibility, Project, Habit, QuickJobDuration } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
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
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status: 'needsAction' | 'completed';
  updated: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

const TOKEN_KEY = 'momentum_gtasks_token';
const TOKEN_EXPIRY_KEY = 'momentum_gtasks_token_expiry';

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

export function saveStoredAccessToken(token: string, expiresInSeconds = 3600): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const expiry = Date.now() + expiresInSeconds * 1000;
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

export async function requestGoogleTasksAuth(clientId: string, promptConsent = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK is not loaded yet. Please ensure your browser has internet access.'));
      return;
    }

    if (!clientId.trim()) {
      reject(new Error('Google Client ID is missing. Please enter your OAuth Client ID in Settings.'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Google sign-in timed out. Please check if the popup was blocked by your browser or opened behind your window.'));
    }, 25000);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/tasks',
        callback: (response: GoogleTokenResponse) => {
          clearTimeout(timeoutId);
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (response.access_token) {
            saveStoredAccessToken(response.access_token, response.expires_in || 3600);
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

      tokenClient.requestAccessToken({ prompt: promptConsent ? 'consent' : '' });
    } catch (e: any) {
      clearTimeout(timeoutId);
      reject(new Error(e?.message || 'Failed to initialize Google OAuth Token Client.'));
    }
  });
}

export async function fetchAllGoogleTasks(accessToken: string): Promise<{ listId: string; tasks: GoogleTaskItem[] }[]> {
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
    const results: { listId: string; tasks: GoogleTaskItem[] }[] = [];

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
        const items: GoogleTaskItem[] = data.items || [];
        results.push({ listId: list.id, tasks: items });
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

export interface SyncTasksResult {
  addedQuickJobs: number;
  addedResponsibilities: number;
  addedProjects: number;
  addedHabits: number;
  totalSynced: number;
  updatedBoard: MomentumBoardData;
}

/**
 * Intelligent parser that converts Google Tasks into Momentum's 4 ADHD buckets.
 */
export function syncTasksIntoBoard(
  boardData: MomentumBoardData,
  taskLists: { listId: string; tasks: GoogleTaskItem[] }[]
): SyncTasksResult {
  let addedQuickJobs = 0;
  let addedResponsibilities = 0;
  let addedProjects = 0;
  let addedHabits = 0;

  const quickJobs = [...boardData.quick_jobs];
  const responsibilities = [...boardData.responsibilities];
  const projects = [...boardData.projects];
  const habits = [...boardData.habits];

  // Helper set of existing task titles and googleTaskIds to avoid duplicates
  const existingJobKeys = new Set(quickJobs.map((j) => j.googleTaskId || j.title.toLowerCase().trim()));
  const existingRespKeys = new Set(responsibilities.map((r) => r.googleTaskId || r.title.toLowerCase().trim()));
  const existingProjKeys = new Set(projects.map((p) => p.googleTaskId || p.name.toLowerCase().trim()));
  const existingHabitKeys = new Set(habits.map((h) => h.googleTaskId || h.name.toLowerCase().trim()));

  for (const { tasks } of taskLists) {
    for (const task of tasks) {
      const rawTitle = (task.title || '').trim();
      if (!rawTitle) continue;

      const taskId = task.id;

      // 1. QUICK JOBS (Tagged [1m], [5m], [15m])
      const quickMatch = rawTitle.match(/^\[(1m|5m|15m)\]\s*(.+)$/i);
      if (quickMatch) {
        const duration = quickMatch[1].toLowerCase() as QuickJobDuration;
        const cleanTitle = quickMatch[2].trim();
        const key = taskId || cleanTitle.toLowerCase();

        if (!existingJobKeys.has(key)) {
          quickJobs.unshift({
            id: `gt-qj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            duration,
            done: false,
            createdAt: Date.now(),
            googleTaskId: taskId,
            due: task.due ? task.due.split('T')[0] : null,
          });
          existingJobKeys.add(key);
          addedQuickJobs++;
        }
        continue;
      }

      // 2. BIGGER RESPONSIBILITIES (Tagged "Resp: ..." or "Responsibility: ...")
      const respMatch = rawTitle.match(/^(?:resp|responsibility):\s*(.+)$/i);
      if (respMatch) {
        const fullContent = respMatch[1].trim();
        let respTitle = fullContent;
        let nextStep = 'Step 1: First physical action';

        if (fullContent.includes('->')) {
          const parts = fullContent.split('->');
          respTitle = parts[0].trim();
          nextStep = parts.slice(1).join('->').trim();
        }

        const key = taskId || respTitle.toLowerCase();
        if (!existingRespKeys.has(key)) {
          responsibilities.unshift({
            id: `gt-resp-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: respTitle,
            steps: [nextStep],
            current_step_index: 0,
            status: 'active',
            createdAt: Date.now(),
            googleTaskId: taskId,
            due: task.due ? task.due.split('T')[0] : null,
          });
          existingRespKeys.add(key);
          addedResponsibilities++;
        }
        continue;
      }

      // 3. HABITS (Tagged "Habit: ...")
      const habitMatch = rawTitle.match(/^habit:\s*(.+)$/i);
      if (habitMatch) {
        const habitName = habitMatch[1].trim();
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
          });
          existingHabitKeys.add(key);
          addedHabits++;
        }
        continue;
      }

      // 4. PROJECTS (Tagged "Project: ...")
      const projMatch = rawTitle.match(/^project:\s*(.+)$/i);
      if (projMatch) {
        const fullContent = projMatch[1].trim();
        let projName = fullContent;
        let nextStep = 'Define initial prototype';

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

        const key = taskId || projName.toLowerCase();
        if (!existingProjKeys.has(key)) {
          projects.push({
            id: `gt-proj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: projName,
            status: 'moving',
            current_position: 'Imported from Google Tasks',
            next_step: nextStep,
            last_updated: Date.now(),
            review_interval_days: 7,
            history: [
              {
                timestamp: Date.now(),
                note: 'Imported from Google Tasks via Gemini mobile entry',
                next_step: nextStep,
              },
            ],
            googleTaskId: taskId,
          });
          existingProjKeys.add(key);
          addedProjects++;
        }
        continue;
      }

      // 5. UNTAGGED REGULAR TASK: Route to Quick Jobs (5m default) so ADHD user never loses a task
      const cleanGenericTitle = rawTitle;
      const genericKey = taskId || cleanGenericTitle.toLowerCase();
      if (!existingJobKeys.has(genericKey)) {
        quickJobs.unshift({
          id: `gt-qj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: cleanGenericTitle,
          duration: '5m',
          done: false,
          createdAt: Date.now(),
          googleTaskId: taskId,
          due: task.due ? task.due.split('T')[0] : null,
        });
        existingJobKeys.add(genericKey);
        addedQuickJobs++;
      }
    }
  }

  const totalSynced = addedQuickJobs + addedResponsibilities + addedProjects + addedHabits;

  return {
    addedQuickJobs,
    addedResponsibilities,
    addedProjects,
    addedHabits,
    totalSynced,
    updatedBoard: {
      ...boardData,
      quick_jobs: quickJobs,
      responsibilities,
      projects,
      habits,
    },
  };
}

/**
 * Optional: Mark a task completed on Google Tasks when checked off in Momentum
 */
export async function markGoogleTaskCompleted(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  try {
    await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      }
    );
  } catch (e) {
    console.warn('Failed to mark task completed on Google Tasks:', e);
  }
}

