import React, { useState, useEffect } from 'react';
import {
  getStoredCredentials,
  saveCredentials,
  queueEvent,
  triggerBackgroundSync,
} from '../services/focusDataLayer';
import { SyncIndicator } from './SyncIndicator';
import {
  CheckCircle2,
  AlertCircle,
  Key,
  Link2,
  Settings,
  LayoutGrid,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  onOpenTaskView: () => void;
}

export function DoMainScreen({ onOpenTaskView }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    if (!creds.url || !creds.key) {
      setShowConfig(true);
    }
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveCredentials(url, key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDoPress = async () => {
    if (!url.trim() || !key.trim()) {
      setShowConfig(true);
      setStatus({
        ok: false,
        message: 'Please paste your Google Apps Script URL and Secret Key first.',
      });
      return;
    }

    try {
      // Phase 2: Instant zero-latency local logging via IndexedDB outbox, syncing in background
      const ev = await queueEvent('ignition_offered', {
        source: 'do_button_tap',
        time: new Date().toLocaleTimeString(),
      });

      setStatus({
        ok: true,
        message: `Instant ignition recorded locally (${ev.event_id}). Syncing in background...`,
      });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({
        ok: false,
        message: err.toString(),
      });
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-none">FOCUS</h1>
            <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">Action Layer</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase 2: Always-visible live sync indicator */}
          <SyncIndicator />

          {/* Shift to Task View (Classic 4 Panels) */}
          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Task View</span>
          </button>

          {/* Config / Secret Key Toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-xs transition ${
              showConfig
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Configure Apps Script Doorway"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Center Area: GIANT INTENSELY BREATHING DO BUTTON */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto">
        {!showConfig ? (
          <div className="flex flex-col items-center text-center">
            {/* Living breathing outer glow container */}
            <div className="relative flex items-center justify-center">
              {/* Layer 1: Ambient deep pulsating glow */}
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 rounded-full blur-2xl animate-glow-pulse pointer-events-none"></div>

              {/* Layer 2: Main breathing magnetic button */}
              <button
                onClick={handleDoPress}
                className="relative w-60 h-60 sm:w-68 sm:h-68 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-800 hover:from-purple-400 hover:to-indigo-700 active:scale-95 text-white font-black text-6xl sm:text-7xl tracking-wider shadow-2xl flex flex-col items-center justify-center gap-1 border-4 border-purple-300/40 animate-do-breathe cursor-pointer transition"
              >
                <span>DO</span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-purple-200/90">
                  Ignition
                </span>
              </button>
            </div>

            {/* Status Feedback Toast */}
            {status && (
              <div
                className={`mt-6 px-4 py-2.5 rounded-xl border text-xs max-w-sm flex items-start gap-2 text-left shadow-lg animate-fadeIn ${
                  status.ok
                    ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-600 text-rose-200'
                }`}
              >
                {status.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-snug break-all">{status.message}</div>
              </div>
            )}
          </div>
        ) : (
          /* Doorway Config Card */
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" /> Doorway Settings
              </h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-purple-400" /> Secret Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your secret key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-bold rounded-lg text-white transition"
                >
                  {saved ? 'Saved!' : 'Save Credentials'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setShowConfig(false);
                  }}
                  className="text-xs text-purple-300 hover:text-purple-200 font-medium"
                >
                  Save & Back to DO
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 px-1">
        <span>Focus Action Layer</span>

        {/* Discreet Theme Toggle */}
        <button
          onClick={() => {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
              html.classList.remove('dark');
              localStorage.setItem('momentum_theme', 'light');
            } else {
              html.classList.add('dark');
              localStorage.setItem('momentum_theme', 'dark');
            }
          }}
          className="p-1 text-slate-400 hover:text-slate-200 transition"
          title="Toggle Light/Dark Theme"
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
