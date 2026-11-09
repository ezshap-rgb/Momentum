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
      name: 'Morning Push-ups (50 reps)',
      type: 'boolean',
      target: 1,
      next_due: 'Daily Morning',
      log: {},
    },
    {
      id: 'hab-2',
      name: 'Night Push-ups (50 reps)',
      type: 'boolean',
      target: 1,
      next_due: 'Daily Night',
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

export function loadLocalBoardData(): MomentumBoardData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
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
        habits: Array.isArray(parsed.habits)
          ? parsed.habits
          : DEFAULT_INITIAL_DATA.habits,
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
