import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { AppSettings, MomentumBoardData, CalendarEvent } from '../types';

const LOCAL_STORAGE_DATA_KEY = 'momentum_board_data_v3';
const LOCAL_STORAGE_SETTINGS_KEY = 'momentum_settings_v3';

function getIsoDateString(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Clean Slate: Real Push-ups habits retained, starter projects & responsibilities seeded
export const DEFAULT_INITIAL_DATA: MomentumBoardData = {
  quick_jobs: [
    {
      id: 'qj-1',
      title: 'Review weekly priority list',
      duration: '5m',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: 'qj-2',
      title: 'Test voice note via Gemini mobile app',
      duration: '1m',
      done: false,
      createdAt: Date.now(),
    },
  ],
  responsibilities: [
    {
      id: 'resp-1',
      title: 'Workshop Organization',
      steps: [
        'Clear and wipe the main workbench surface',
        'Sort hardware bins and fastener drawers',
        'Label tool storage racks',
      ],
      current_step_index: 0,
      due: 'This Weekend',
      status: 'active',
      createdAt: Date.now(),
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Sphere It',
      status: 'moving',
      current_position: 'Initial design and CAD prototyping phase',
      next_step: 'Verify dimensions and test fit first prototype model',
      last_updated: Date.now(),
      review_interval_days: 7,
      history: [
        {
          timestamp: Date.now(),
          note: 'Project initialized on Momentum Cockpit',
          next_step: 'Verify dimensions and test fit first prototype model',
        },
      ],
    },
    {
      id: 'proj-2',
      name: 'Smart Filing Cabinet',
      status: 'moving',
      current_position: 'System concept definition and hardware mapping',
      next_step: 'Draft sensor layout and micro-controller wiring diagram',
      last_updated: Date.now(),
      review_interval_days: 7,
      history: [
        {
          timestamp: Date.now(),
          note: 'Project initialized on Momentum Cockpit',
          next_step: 'Draft sensor layout and micro-controller wiring diagram',
        },
      ],
    },
  ],
  habits: [
    {
      id: 'hab-1',
      name: 'Push-ups 50 (mrng)',
      type: 'boolean',
      target: 50,
      next_due: 'Daily Morning',
      log: {},
    },
    {
      id: 'hab-2',
      name: 'Push-ups 50 (nt)',
      type: 'boolean',
      target: 50,
      next_due: 'Daily Night',
      log: {},
    },
    {
      id: 'hab-3',
      name: 'Squats 30',
      type: 'boolean',
      target: 30,
      next_due: 'Daily',
      log: {},
    },
    {
      id: 'hab-4',
      name: 'Plank 60s',
      type: 'boolean',
      target: 60,
      next_due: 'Daily',
      log: {},
    },
    {
      id: 'hab-5',
      name: 'Hip Mobility 1',
      type: 'boolean',
      target: 1,
      next_due: 'Daily',
      log: {},
    },
    {
      id: 'hab-6',
      name: 'Pull-ups 10',
      type: 'boolean',
      target: 10,
      next_due: 'Daily',
      log: {},
    },
    {
      id: 'hab-7',
      name: 'Crunches 30',
      type: 'boolean',
      target: 30,
      next_due: 'Daily',
      log: {},
    },
    {
      id: 'hab-8',
      name: 'Reverse Plank 45s',
      type: 'boolean',
      target: 45,
      next_due: 'Daily',
      log: {},
    },
  ],
  calendar_events: [],
  current_focus_project_id: 'proj-1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  googleCalendarEmbedUrl: '',
  googleTasksClientId: '',
  googleTasksEmail: '',
  googleTasksAccountEmail: '',
  googleTasksSyncedLists: [],
  googleTasksWebhookUrl: '',
  googleTasksConnected: false,
  googleTasksAutoSync: false,
  googleTasksLastSync: undefined,
  firebaseConfig: null,
  useCloudSync: false,
  userBoardId: 'main-cockpit'
};

let cachedFirestore: Firestore | null = null;
let unsubscribeFirestore: (() => void) | null = null;

export function normalizeGoogleCalendarUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return '';

  // 1. If user pasted the whole <iframe> tag: <iframe src="https://..." ...></iframe>
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    trimmed = iframeMatch[1];
  }

  // 2. Unescape HTML entities like &amp;
  trimmed = trimmed.replace(/&amp;/g, '&');

  // 3. If user entered an email address like user@gmail.com
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(trimmed)}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`;
  }

  // 4. Ensure clean embed layout (no bloated header) if not present
  if (trimmed.includes('calendar.google.com/calendar/embed') && !trimmed.includes('showTitle=')) {
    const sep = trimmed.includes('?') ? '&' : '?';
    trimmed = `${trimmed}${sep}showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`;
  }

  return trimmed;
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.geminiModel || parsed.geminiModel.includes('2.5') || parsed.geminiModel.includes('1.5')) {
        parsed.geminiModel = 'gemini-3.8-flash';
      }
      if (!localStorage.getItem('momentum_explicit_theme_v1')) {
        parsed.theme = 'light';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

const DELETED_GTASKS_KEY = 'momentum_deleted_gtasks_v1';
const PENDING_GTASKS_OPS_KEY = 'momentum_pending_gtasks_ops_v1';

export interface PendingGoogleTaskOp {
  taskId: string;
  listId: string;
  action: 'complete' | 'delete';
  timestamp: number;
}

export function getPendingGoogleTaskOps(): PendingGoogleTaskOp[] {
  try {
    const raw = localStorage.getItem(PENDING_GTASKS_OPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (op) =>
            op &&
            typeof op.taskId === 'string' &&
            op.taskId.trim().length > 0 &&
            !op.taskId.includes(' ') &&
            (op.action === 'complete' || op.action === 'delete')
        );
      }
    }
  } catch {}
  return [];
}

export function enqueuePendingGoogleTaskOp(op: PendingGoogleTaskOp): void {
  if (!op || !op.taskId || op.taskId.trim().length === 0 || op.taskId.includes(' ')) return;
  try {
    const ops = getPendingGoogleTaskOps();
    const idx = ops.findIndex((existing) => existing.taskId === op.taskId);
    const normalizedOp: PendingGoogleTaskOp = {
      taskId: op.taskId.trim(),
      listId: op.listId || '@default',
      action: op.action,
      timestamp: op.timestamp || Date.now(),
    };
    if (idx >= 0) {
      const existing = ops[idx];
      ops[idx] = {
        ...normalizedOp,
        action: existing.action === 'delete' ? 'delete' : normalizedOp.action,
      };
    } else {
      ops.push(normalizedOp);
    }
    localStorage.setItem(PENDING_GTASKS_OPS_KEY, JSON.stringify(ops));
  } catch (e) {
    console.error('Failed to enqueue pending Google Task op:', e);
  }
}

export function removePendingGoogleTaskOp(taskId: string): void {
  if (!taskId || taskId.includes(' ')) return;
  try {
    const ops = getPendingGoogleTaskOps();
    const filtered = ops.filter((op) => op.taskId !== taskId);
    if (filtered.length !== ops.length) {
      localStorage.setItem(PENDING_GTASKS_OPS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to remove pending Google Task op:', e);
  }
}

export function getDeletedGoogleTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_GTASKS_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      // Clean up any historical title entries (Google Task IDs never contain spaces)
      const validIds = parsed.filter((id) => typeof id === 'string' && id.trim().length > 0 && !id.includes(' '));
      return new Set(validIds);
    }
  } catch {}
  return new Set();
}

export function recordDeletedGoogleTaskId(taskId: string): void {
  if (!taskId || taskId.includes(' ')) return; // Never record raw titles as deleted IDs
  try {
    const existing = getDeletedGoogleTaskIds();
    existing.add(taskId);
    localStorage.setItem(DELETED_GTASKS_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {
    console.error('Failed to record deleted Google Task ID:', e);
  }
}

export function unrecordDeletedGoogleTaskId(taskId: string): void {
  if (!taskId || taskId.includes(' ')) return;
  try {
    const existing = getDeletedGoogleTaskIds();
    if (existing.has(taskId)) {
      existing.delete(taskId);
      localStorage.setItem(DELETED_GTASKS_KEY, JSON.stringify(Array.from(existing)));
    }
  } catch (e) {
    console.error('Failed to unrecord deleted Google Task ID:', e);
  }
}

export function loadLocalBoardData(): MomentumBoardData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawHabits = Array.isArray(parsed.habits) ? [...parsed.habits] : [...DEFAULT_INITIAL_DATA.habits];
      for (const defHabit of DEFAULT_INITIAL_DATA.habits) {
        const defLower = defHabit.name.toLowerCase().replace(/\s*\(\d+\s*reps\)/gi, '').trim();
        const existingIdx = rawHabits.findIndex((h: any) => {
          const l = (h.name || '').toLowerCase();
          return h.id === defHabit.id || l.includes(defLower) || defLower.includes(l);
        });
        if (existingIdx === -1) {
          rawHabits.push(defHabit);
        } else {
          if (rawHabits[existingIdx].name !== defHabit.name && defHabit.name.startsWith('Push-ups')) {
            rawHabits[existingIdx].name = defHabit.name;
            rawHabits[existingIdx].target = defHabit.target;
          }
        }
      }

      // Deduplicate habits by normalized name so accumulated duplicates are cleaned up
      const seenHabits = new Map<string, any>();
      for (const h of rawHabits) {
        const norm = (h.name || '').toLowerCase().replace(/^habit:\s*/i, '').replace(/\s+/g, ' ').trim();
        if (!seenHabits.has(norm)) {
          seenHabits.set(norm, h);
        } else {
          const existing = seenHabits.get(norm);
          if (h.log) {
            existing.log = { ...existing.log, ...h.log };
          }
        }
      }
      const deduplicatedHabits = Array.from(seenHabits.values());

      return {
        ...DEFAULT_INITIAL_DATA,
        ...parsed,
        quick_jobs: Array.isArray(parsed.quick_jobs)
          ? parsed.quick_jobs
          : DEFAULT_INITIAL_DATA.quick_jobs,
        responsibilities: Array.isArray(parsed.responsibilities)
          ? parsed.responsibilities
          : DEFAULT_INITIAL_DATA.responsibilities,
        projects: Array.isArray(parsed.projects)
          ? parsed.projects
          : DEFAULT_INITIAL_DATA.projects,
        habits: deduplicatedHabits,
        calendar_events: Array.isArray(parsed.calendar_events)
          ? parsed.calendar_events
          : DEFAULT_INITIAL_DATA.calendar_events,
      };
    }
  } catch (e) {
    console.error('Failed to load local board data:', e);
  }
  return DEFAULT_INITIAL_DATA;
}

export function saveLocalBoardData(data: MomentumBoardData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save local board data:', e);
  }
}

export function initFirebaseStore(settings: AppSettings): Firestore | null {
  if (!settings.useCloudSync || !settings.firebaseConfig || !settings.firebaseConfig.apiKey) {
    return null;
  }

  try {
    let app: FirebaseApp;
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(settings.firebaseConfig);
    }

    if (!cachedFirestore) {
      try {
        cachedFirestore = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (cacheErr) {
        cachedFirestore = getFirestore(app);
      }
    }

    return cachedFirestore;
  } catch (err) {
    console.warn('Firebase init warning:', err);
    return null;
  }
}

export function subscribeToBoardData(
  settings: AppSettings,
  onDataUpdate: (data: MomentumBoardData) => void
): () => void {
  if (!settings.useCloudSync || !settings.firebaseConfig?.apiKey) {
    const local = loadLocalBoardData();
    onDataUpdate(local);
    return () => {};
  }

  const db = initFirebaseStore(settings);
  if (!db) {
    const local = loadLocalBoardData();
    onDataUpdate(local);
    return () => {};
  }

  if (unsubscribeFirestore) {
    unsubscribeFirestore();
  }

  const boardDocRef = doc(db, 'momentum_boards', settings.userBoardId || 'main-cockpit');

  unsubscribeFirestore = onSnapshot(
    boardDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as MomentumBoardData;
        saveLocalBoardData(cloudData);
        onDataUpdate(cloudData);
      } else {
        const local = loadLocalBoardData();
        setDoc(boardDocRef, local).catch(console.error);
        onDataUpdate(local);
      }
    },
    (error) => {
      console.warn('Firestore subscription offline/fallback error:', error);
      const local = loadLocalBoardData();
      onDataUpdate(local);
    }
  );

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  };
}

export async function persistBoardData(
  data: MomentumBoardData,
  settings: AppSettings
): Promise<void> {
  saveLocalBoardData(data);

  if (settings.useCloudSync && settings.firebaseConfig?.apiKey) {
    try {
      const db = initFirebaseStore(settings);
      if (db) {
        const boardDocRef = doc(db, 'momentum_boards', settings.userBoardId || 'main-cockpit');
        await setDoc(boardDocRef, data);
      }
    } catch (err) {
      console.warn('Firestore save sync queued or failed:', err);
    }
  }
}
