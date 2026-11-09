import { MomentumBoardData, QuickJob, Responsibility, Project, Habit, QuickJobDuration } from '../types';
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
        scope: 'https://www.googleapis.com/auth/tasks email',
        hint: emailHint || undefined,
        callback: async (response: GoogleTokenResponse) => {
          clearTimeout(timeoutId);
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (response.access_token) {
            saveStoredAccessToken(response.access_token, response.expires_in || 3600);

            // Fetch user email in background so subsequent refreshes skip the account picker
            try {
              const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                if (uData.email) {
                  saveStoredUserEmail(uData.email);
                }
              }
            } catch {}

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

  // Load deleted IDs so completed / deleted tasks are NEVER resurrected
  const deletedTaskIds = getDeletedGoogleTaskIds();

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

      // Skip anything explicitly deleted or completed locally
      if (taskId && deletedTaskIds.has(taskId)) continue;
      if (deletedTaskIds.has(rawTitle.toLowerCase())) continue;

      const noteSteps = parseStepsFromNotes(task.notes);

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
        let nextStep = '';

        if (fullContent.includes('->')) {
          const parts = fullContent.split('->');
          respTitle = parts[0].trim();
          nextStep = parts.slice(1).join('->').trim();
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
 * Mark a task completed on Google Tasks when checked off in Momentum
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

/**
 * Permanently delete a task on Google Tasks when removed from Momentum
 */
export async function deleteGoogleTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  try {
    await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
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
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          notes: notes || '',
          status: 'needsAction',
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.id || null;
    }
  } catch (e) {
    console.warn('Failed to create task in Google Tasks:', e);
  }
  return null;
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

