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

// Clean Slate: Real Push-ups habits retained, starter samples wiped clean
export const DEFAULT_INITIAL_DATA: MomentumBoardData = {
  quick_jobs: [],
  responsibilities: [],
  projects: [],
  habits: [
    {
      id: 'hab-1',
      name: 'Morning Push-ups (50 reps)',
      type: 'boolean',
      target: 1,
      next_due: 'Daily Morning',
      log: {}
    },
    {
      id: 'hab-2',
      name: 'Night Push-ups (50 reps)',
      type: 'boolean',
      target: 1,
      next_due: 'Daily Night',
      log: {}
    }
  ],
  calendar_events: [],
  current_focus_project_id: null
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  googleCalendarEmbedUrl: '',
  googleTasksClientId: '',
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

export function loadLocalBoardData(): MomentumBoardData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_INITIAL_DATA,
        ...parsed,
        quick_jobs: parsed.quick_jobs || DEFAULT_INITIAL_DATA.quick_jobs,
        responsibilities: parsed.responsibilities || DEFAULT_INITIAL_DATA.responsibilities,
        projects: parsed.projects || DEFAULT_INITIAL_DATA.projects,
        habits: parsed.habits || DEFAULT_INITIAL_DATA.habits,
        calendar_events: parsed.calendar_events || DEFAULT_INITIAL_DATA.calendar_events,
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
