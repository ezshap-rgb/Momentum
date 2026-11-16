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
let isSyncInProgress = false;
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

export async function triggerBackgroundSync(): Promise<boolean> {
  if (isSyncInProgress) return false;
  const { url, key } = getStoredCredentials();
  if (!url || !key) return false;
  if (!navigator.onLine) {
    notifySyncStateChange();
    return false;
  }

  const events = await getOutboxEvents();
  if (events.length === 0) {
    notifySyncStateChange();
    return true;
  }

  isSyncInProgress = true;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        key,
        action: 'batch_events',
        events,
      }),
    });

    const result = await response.json();
    if (result.ok) {
      const processedIds = events.map((e) => e.event_id);
      await removeEventsFromOutbox(processedIds);
      notifySyncStateChange();
      isSyncInProgress = false;
      return true;
    } else {
      notifySyncStateChange(result.error || 'Sync rejected by backend');
      isSyncInProgress = false;
      return false;
    }
  } catch (err: any) {
    notifySyncStateChange(err.message || 'Network sync error');
    isSyncInProgress = false;
    return false;
  }
}

// Auto-sync on coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    triggerBackgroundSync();
  });
}

// 4. Tab Reading & Caching (Settings, Actions, Habits, Movement)
export async function readTabFromSheet(tab: string): Promise<any[]> {
  const { url, key } = getStoredCredentials();
  if (!url || !key) {
    return getCachedTab(tab);
  }

  try {
    const reqUrl = `${url}?key=${encodeURIComponent(key)}&tab=${encodeURIComponent(tab)}`;
    const response = await fetch(reqUrl);
    const data = await response.json();
    if (data.ok && Array.isArray(data.rows)) {
      await cacheTab(tab, data.rows);
      return data.rows;
    }
  } catch (err) {
    console.warn(`Could not fetch tab ${tab} online, falling back to cache`, err);
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
