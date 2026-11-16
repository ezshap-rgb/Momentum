/**
 * Phase 1 Doorway API Client
 * Uses plain-text JSON POST without custom headers to avoid CORS preflight blocks with Google Apps Script.
 */

const STORAGE_KEYS = {
  WEB_APP_URL: 'focus_apps_script_url',
  SECRET_KEY: 'focus_secret_key',
};

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

export interface FocusEvent {
  event_id: string;
  timestamp: string;
  device: string;
  type: string;
  payload: any;
  schema_version: string;
}

export async function sendTestEvent(customEventId?: string, overrideUrl?: string, overrideKey?: string): Promise<{ ok: boolean; message?: string; event_id?: string; error?: string }> {
  const creds = getStoredCredentials();
  const url = (overrideUrl !== undefined ? overrideUrl : creds.url).trim();
  const key = (overrideKey !== undefined ? overrideKey : creds.key).trim();

  if (!url) {
    return { ok: false, error: 'Web App URL is not configured. Please paste your Apps Script URL below.' };
  }
  if (!key) {
    return { ok: false, error: 'Secret Key is not configured. Please paste your secret key below.' };
  }

  // Ensure they are saved in storage as well
  saveCredentials(url, key);

  const event: FocusEvent = {
    event_id: customEventId || 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    device: navigator.userAgent.includes('Mobi') ? 'phone' : 'desktop',
    type: 'sync_ok',
    payload: { note: 'Phase 1 test event connection check', userAgent: navigator.userAgent },
    schema_version: '1.0',
  };

  try {
    // Send as text/plain to prevent browser CORS preflight issues with Google Apps Script
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        key: key,
        action: 'append_event',
        event: event,
      }),
    });

    const result = await response.json();
    return result;
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || 'Network error connecting to Apps Script. Ensure the web app is deployed with access: Anyone.',
    };
  }
}
