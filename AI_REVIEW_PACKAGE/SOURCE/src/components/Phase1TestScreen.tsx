import React, { useState, useEffect } from 'react';
import { getStoredCredentials, saveCredentials, sendTestEvent } from '../services/focusDoorway';
import { CheckCircle2, AlertCircle, RefreshCw, Key, Link2, ShieldCheck, ArrowLeft } from 'lucide-react';

interface Props {
  onBackToCockpit?: () => void;
}

export function Phase1TestScreen({ onBackToCockpit }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCredentials(url, key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTest = async () => {
    setIsSending(true);
    setStatus(null);
    try {
      const res = await sendTestEvent();
      if (res.ok) {
        setStatus({
          ok: true,
          message: `Success! Row added to 'Events' tab (Event ID: ${res.message || 'ok'}). Check your Google Sheet!`,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        {onBackToCockpit && (
          <button
            onClick={onBackToCockpit}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Classic Cockpit
          </button>
        )}

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Phase 1: Foundations</h1>
            <p className="text-xs text-slate-400">Sheet Doorway Round-Trip Test</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-950/40 border border-purple-800/40 rounded-lg text-xs text-purple-200">
          <strong>Offline / Privacy guarantee:</strong> Your Secret Key is kept in your phone's browser storage only and is never committed to Git.
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-purple-400" /> Google Apps Script Web App URL
            </label>
            <input
              type="url"
              required
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" /> Secret Key
            </label>
            <input
              type="password"
              required
              placeholder="Enter your secret key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs font-medium rounded-lg text-slate-200 transition"
            >
              {saved ? 'Saved!' : 'Save Credentials'}
            </button>
            {saved && <span className="text-xs text-emerald-400">✓ Saved to device</span>}
          </div>
        </form>

        <hr className="my-5 border-slate-700/60" />

        <div>
          <button
            onClick={handleSendTest}
            disabled={isSending || !url || !key}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] font-bold text-sm rounded-xl text-white shadow-lg shadow-purple-600/40 flex items-center justify-center gap-2 transition"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Appending row to Events...
              </>
            ) : (
              'Send Test Event'
            )}
          </button>
        </div>

        {status && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              status.ok
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            {status.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed break-all">{status.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
