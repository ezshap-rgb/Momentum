/**
 * Focus Data Layer
 * Handles local IndexedDB outbox queue, background batch synchronization,
 * duplicate safety, and offline caching of Settings, Actions, Habits, and Movement.
 * 
 * Principle: Do mode never waits for the network. Record locally first in <5ms,
 * sync in batches in background.
 */

export interface FocusEvent {
  event_id: string;
  timestamp: string;
  device: string;
  type: string;
  payload: any;
  schema_version: string;
}

export type SyncState = 'synced' | 'waiting' | 'failed';

const DB_NAME = 'focus_db';
const DB_VERSION = 1;
const STORE_OUTBOX = 'outbox';
const STORE_CACHE = 'cache';

const STORAGE_KEYS = {
  WEB_APP_URL: 'focus_apps_script_url',
  SECRET_KEY: 'focus_secret_key',
};

// 1. IndexedDB Helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'event_id' });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'tab' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Credentials
export function getStoredCredentials() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.WEB_APP_URL) || '',
    key: localStorage.getItem(STORAGE_KEYS.SECRET_KEY) || '',
  };
}

export function saveCredentials(url: string, key: string) {
  localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.SECRET_KEY, key.trim());
}

// 2. Outbox Management
export async function queueEvent(type: string, payload: any = {}): Promise<FocusEvent> {
  const db = await openDB();
  const event: FocusEvent = {
    event_id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    timestamp: new Date().toISOString(),
    device: navigator.userAgent.includes('Mobi') ? 'phone' : 'desktop',
    type,
    payload,
    schema_version: '1.0',
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    tx.objectStore(STORE_OUTBOX).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  notifySyncStateChange();
  // Trigger immediate background sync attempt (no wait)
  triggerBackgroundSync();
  return event;
}

export async function getOutboxCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const req = tx.objectStore(STORE_OUTBOX).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function getOutboxEvents(): Promise<FocusEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readonly');
    const req = tx.objectStore(STORE_OUTBOX).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeEventsFromOutbox(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    for (const id of eventIds) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 3. Background Sync & Batching
export const SYNC_CHUNK_SIZE = 50;
export const FETCH_TIMEOUT_MS = 8000;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

let isSyncInProgress = false;
let syncRetryDelay = INITIAL_RETRY_DELAY_MS;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

let currentSyncState: { state: SyncState; waitingCount: number; error?: string } = {
  state: 'synced',
  waitingCount: 0,
};

const listeners = new Set<(status: { state: SyncState; waitingCount: number; error?: string }) => void>();

export function subscribeSyncState(fn: (status: { state: SyncState; waitingCount: number; error?: string }) => void) {
  listeners.add(fn);
  fn(currentSyncState);
  return () => {
    listeners.delete(fn);
  };
}

async function notifySyncStateChange(error?: string) {
  const count = await getOutboxCount();
  const state: SyncState = error ? 'failed' : count > 0 ? 'waiting' : 'synced';
  currentSyncState = { state, waitingCount: count, error };
  for (const listener of listeners) {
    listener(currentSyncState);
  }
}

function resetRetryBackoff() {
  syncRetryDelay = INITIAL_RETRY_DELAY_MS;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetryBackoff() {
  if (retryTimer) return;
  const jitter = Math.floor(Math.random() * 500);
  const delay = Math.min(syncRetryDelay, MAX_RETRY_DELAY_MS) + jitter;
  syncRetryDelay = Math.min(syncRetryDelay * 2, MAX_RETRY_DELAY_MS);

  retryTimer = setTimeout(() => {
    retryTimer = null;
    triggerBackgroundSync();
  }, delay);
}

export async function triggerBackgroundSync(): Promise<boolean> {
  if (isSyncInProgress) return false;
  const { url, key } = getStoredCredentials();
  if (!url || !key) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifySyncStateChange();
    return false;
  }

  isSyncInProgress = true;
  try {
    while (true) {
      const allEvents = await getOutboxEvents();
      if (allEvents.length === 0) {
        notifySyncStateChange();
        resetRetryBackoff();
        isSyncInProgress = false;
        return true;
      }

      // Chunk into batches of at most 50 events
      const chunk = allEvents.slice(0, SYNC_CHUNK_SIZE);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            key,
            action: 'batch_events',
            events: chunk,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const result = await response.json();
        if (result.ok) {
          const processedIds = chunk.map((e) => e.event_id);
          await removeEventsFromOutbox(processedIds);
          notifySyncStateChange();

          // If there are no more events left, finish successfully
          if (allEvents.length <= SYNC_CHUNK_SIZE) {
            resetRetryBackoff();
            isSyncInProgress = false;
            return true;
          }
          // Otherwise loop continues to send the next chunk
        } else {
          notifySyncStateChange(result.error || 'Sync rejected by backend');
          scheduleRetryBackoff();
          isSyncInProgress = false;
          return false;
        }
      } catch (chunkErr: any) {
        clearTimeout(timeoutId);
        throw chunkErr;
      }
    }
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'Sync timed out' : (err.message || 'Network sync error');
    notifySyncStateChange(errorMsg);
    scheduleRetryBackoff();
    isSyncInProgress = false;
    return false;
  }
}

// Auto-sync flush on online, window focus, tab becoming visible, and initial app open
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    resetRetryBackoff();
    triggerBackgroundSync();
  });
  window.addEventListener('focus', () => {
    triggerBackgroundSync();
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerBackgroundSync();
      }
    });
  }
  // Flush on app open
  setTimeout(() => {
    triggerBackgroundSync();
  }, 100);
}

// 4. Tab Reading & Caching (Settings, Actions, Habits, Movement)
export async function readTabFromSheet(tab: string): Promise<any[]> {
  const { url, key } = getStoredCredentials();
  if (!url || !key) {
    return getCachedTab(tab);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        key,
        action: 'read_tab',
        tab,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    if (data.ok && Array.isArray(data.rows)) {
      await cacheTab(tab, data.rows);
      return data.rows;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Could not fetch tab ${tab} online via POST, falling back to cache`, err);
  }

  return getCachedTab(tab);
}

export async function cacheTab(tab: string, rows: any[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      tx.objectStore(STORE_CACHE).put({ tab, rows, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to cache tab', e);
  }
}

export async function getCachedTab(tab: string): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const req = tx.objectStore(STORE_CACHE).get(tab);
      req.onsuccess = () => resolve(req.result?.rows || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
