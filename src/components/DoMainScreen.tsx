import React, { useState, useEffect } from 'react';
import { getStoredCredentials, saveCredentials, sendTestEvent } from '../services/focusDoorway';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Link2,
  Settings,
  LayoutGrid,
  Zap,
} from 'lucide-react';

interface Props {
  onOpenTaskView: () => void;
}

export function DoMainScreen({ onOpenTaskView }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    // If credentials aren't set yet, open config panel by default
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

    setIsSending(true);
    setStatus(null);
    try {
      // In Phase 1: Clicking DO sends a test event to verify round-trip
      const res = await sendTestEvent(undefined, url, key);
      if (res.ok) {
        setStatus({
          ok: true,
          message: `Success! Event appended to Google Sheet 'Events' tab! (Event ID: ${res.event_id || res.message || 'ok'})`,
        });
      } else {
        setStatus({
          ok: false,
          message: res.error || 'Failed to append event.',
        });
      }
    } catch (err: any) {
      setStatus({
        ok: false,
        message: err.toString(),
      });
    } finally {
      setIsSending(false);
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
          {/* Shift to Task View (Classic 4 Panels) */}
          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span>Task View</span>
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

      {/* Main Center Area: GIANT DO BUTTON */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto">
        {!showConfig ? (
          <div className="flex flex-col items-center text-center">
            {/* Pulsing ring around big DO button */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur-xl opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse"></div>

              <button
                onClick={handleDoPress}
                disabled={isSending}
                className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 active:scale-95 disabled:opacity-50 text-white font-black text-5xl sm:text-6xl tracking-wider shadow-2xl shadow-purple-900/60 flex flex-col items-center justify-center gap-2 border-4 border-purple-400/40 transition"
              >
                {isSending ? (
                  <RefreshCw className="w-16 h-16 animate-spin" />
                ) : (
                  <>
                    <span>DO</span>
                    <span className="text-xs uppercase font-bold tracking-widest text-purple-200/80 -mt-1">
                      Ignition
                    </span>
                  </>
                )}
              </button>
            </div>

            <p className="mt-8 text-xs text-slate-400 max-w-xs leading-relaxed">
              {isSending
                ? 'Connecting to Sheet Doorway...'
                : 'Tap to ignite. No willpower required.'}
            </p>

            {/* Status Feedback Toast */}
            {status && (
              <div
                className={`mt-4 px-4 py-3 rounded-xl border text-xs max-w-sm flex items-start gap-2 text-left shadow-lg ${
                  status.ok
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-600 text-rose-200'
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

      {/* Bottom hint */}
      <div className="text-center text-[11px] text-slate-500 pb-1">
        Focus Action Layer · Phase 1: Foundations
      </div>
    </div>
  );
}
