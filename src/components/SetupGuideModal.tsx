import React, { useState } from 'react';
import {
  X,
  BatteryCharging,
  Calendar,
  Smartphone,
  Volume2,
  Vibrate,
  ShieldCheck,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  playGentleCompletionChime,
  triggerHaptic,
  requestScreenWakeLock,
} from '../services/focusWakeLock';
import { getStoredCredentials } from '../services/focusDataLayer';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('focus_sound_enabled') !== 'false'
  );
  const [vibrationEnabled, setVibrationEnabled] = useState(
    () => localStorage.getItem('focus_vibration_enabled') !== 'false'
  );
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarResult, setCalendarResult] = useState<string | null>(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('focus_sound_enabled', String(next));
    if (next) playGentleCompletionChime();
  };

  const handleToggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    localStorage.setItem('focus_vibration_enabled', String(next));
    if (next) triggerHaptic([50, 40, 60]);
  };

  const handleTriggerCalendarNudges = async () => {
    const { url, key } = getStoredCredentials();
    if (!url || !key) {
      alert('Please configure your Apps Script URL and Secret Key in settings first.');
      return;
    }

    setSyncingCalendar(true);
    setCalendarResult(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key, action: 'sync_calendar_nudges' }),
      });
      const data = await res.json();
      if (data.ok) {
        setCalendarResult(`✓ Successfully created ${data.created_count || 0} nudges in your 'Focus' calendar!`);
      } else {
        setCalendarResult(`⚠️ ${data.error || 'Failed to sync calendar'}`);
      }
    } catch (err: any) {
      setCalendarResult(`⚠️ Error: ${err.message}`);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleTriggerBackup = async () => {
    const { url, key } = getStoredCredentials();
    if (!url || !key) {
      alert('Please configure your Apps Script URL and Secret Key in settings first.');
      return;
    }

    setRunningBackup(true);
    setBackupResult(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key, action: 'run_backup' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBackupResult(`✓ Backup created in Drive folder 'Focus Backups' (${data.backup_name})`);
      } else {
        setBackupResult(`⚠️ ${data.error || 'Failed to create backup'}`);
      }
    } catch (err: any) {
      setBackupResult(`⚠️ Error: ${err.message}`);
    } finally {
      setRunningBackup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Offline, Nudges & Backup Setup</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-bold uppercase">
                  Phase 10
                </span>
              </h2>
              <p className="text-xs text-slate-400">Setup checklist for reliable notifications & offline resilience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* 1. Android Battery Optimization Exemption */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>1. Exempt Apps from Battery Optimization</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Android aggressively suspends web apps and notifications. Setting both Chrome and Google Calendar to{' '}
              <strong className="text-emerald-300">Unrestricted</strong> ensures on-time reminder popups and keeps timers running:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
              <li>Open Android <strong>Settings</strong> → <strong>Apps</strong>.</li>
              <li>Select <strong>Chrome</strong> (or your Focus PWA) → <strong>App battery usage</strong> → choose <strong>Unrestricted</strong>.</li>
              <li>Repeat for <strong>Google Calendar</strong> → set to <strong>Unrestricted</strong>.</li>
            </ol>
          </div>

          {/* 2. Google Calendar App Nudges */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>2. Google Calendar Nudges</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">
                Max 3 / Day
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Apps Script manages a calendar named <strong className="text-white">Focus</strong>. It schedules gentle reminders for morning & evening circuit windows, external deadline tripwires, and optional DO prompts (skipping weekends & quiet hours).
            </p>

            <button
              onClick={handleTriggerCalendarNudges}
              disabled={syncingCalendar}
              className="w-full py-2.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/80 text-purple-200 font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
              <span>Generate / Refresh Calendar Nudges for Next 7 Days</span>
            </button>

            {calendarResult && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                {calendarResult}
              </div>
            )}
          </div>

          {/* 3. Feedback & Haptics */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>3. Audio Chimes & Screen Wake Lock</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">Audio Chime</span>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">Vibration</span>
                </div>
                <button
                  onClick={handleToggleVibration}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    vibrationEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      vibrationEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Screen Wake Lock automatically activates during ignition and active action timers so your display stays on.
            </p>
          </div>

          {/* 4. Automated Weekly Drive Backup */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>4. Weekly Google Drive Backups</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                Retains Last 8
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every Sunday at 02:00 AM, Apps Script copies the active spreadsheet to a Drive folder named{' '}
              <strong className="text-white">Focus Backups</strong> and automatically cleans up older snapshots.
            </p>

            <button
              onClick={handleTriggerBackup}
              disabled={runningBackup}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
              <span>Test Google Drive Backup Now</span>
            </button>

            {backupResult && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                {backupResult}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
