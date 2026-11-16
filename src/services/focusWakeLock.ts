/**
 * Focus App Screen Wake Lock & Haptic/Audio Feedback (Phase 10)
 * 
 * Prevents mobile screen from sleeping during active timers, push-ups,
 * and plank holds using the browser Screen Wake Lock API.
 * Synthesizes gentle audio completion chimes via Web Audio API.
 */

let wakeLockSentinel: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      return false;
    }
  }
  return false;
}

export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (_) {}
    wakeLockSentinel = null;
  }
}

// Re-acquire wake lock if tab becomes visible again while active
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLockSentinel === null) {
      const isLockedSession = sessionStorage.getItem('focus_wake_lock_active') === 'true';
      if (isLockedSession) {
        await requestScreenWakeLock();
      }
    }
  });
}

export function setWakeLockActive(active: boolean) {
  if (active) {
    sessionStorage.setItem('focus_wake_lock_active', 'true');
    requestScreenWakeLock();
  } else {
    sessionStorage.removeItem('focus_wake_lock_active');
    releaseScreenWakeLock();
  }
}

/**
 * Web Audio API synthesized completion chime (no external audio assets required)
 */
export function playGentleCompletionChime() {
  const soundEnabled = localStorage.getItem('focus_sound_enabled') !== 'false';
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell chime: 523.25 Hz (C5) and 659.25 Hz (E5) -> 783.99 Hz (G5)
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.85);
    });
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}

/**
 * Haptic vibration helper respecting user's setting
 */
export function triggerHaptic(pattern: number | number[] = 50) {
  const vibrationEnabled = localStorage.getItem('focus_vibration_enabled') !== 'false';
  if (!vibrationEnabled) return;

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}
