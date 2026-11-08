import React, { useState } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { AppSettings, FirebaseConfigSettings } from '../types';
import {
  X,
  Key,
  Database,
  Cloud,
  Check,
  Download,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, updateSettings, boardData } = useMomentum();

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(
    settings.geminiModel && !settings.geminiModel.includes('2.5')
      ? settings.geminiModel
      : 'gemini-3.8-flash'
  );
  const [googleCalUrl, setGoogleCalUrl] = useState(settings.googleCalendarEmbedUrl || '');
  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');
  const [useCloudSync, setUseCloudSync] = useState(settings.useCloudSync || false);
  const [boardId, setBoardId] = useState(settings.userBoardId || 'main-cockpit');

  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigSettings>({
    apiKey: settings.firebaseConfig?.apiKey || '',
    authDomain: settings.firebaseConfig?.authDomain || '',
    projectId: settings.firebaseConfig?.projectId || '',
    storageBucket: settings.firebaseConfig?.storageBucket || '',
    messagingSenderId: settings.firebaseConfig?.messagingSenderId || '',
    appId: settings.firebaseConfig?.appId || '',
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      theme,
      geminiApiKey: geminiKey.trim(),
      geminiModel,
      googleCalendarEmbedUrl: googleCalUrl.trim(),
      useCloudSync,
      userBoardId: boardId.trim() || 'main-cockpit',
      firebaseConfig: useCloudSync && firebaseConfig.apiKey ? firebaseConfig : null,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(boardData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `momentum-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Settings & Integrations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Appearance, Google Calendar, Gemini AI & Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* THEME SELECTOR */}
          <div className="space-y-2">
            <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block text-[11px]">
              Theme & Visual Calm
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                  theme === 'light'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-400/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode (Clean Paper)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                  theme === 'dark'
                    ? 'border-purple-600 bg-purple-950/40 text-purple-200 ring-2 ring-purple-400/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400" />
                <span>Dark Mode (Calm Slate)</span>
              </button>
            </div>
          </div>

          {/* GOOGLE CALENDAR EMBED */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Google Calendar Integration</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Paste your Google Calendar Public or Private Embed URL to see your schedule directly inside the Month/Week calendar drawer:
            </p>
            <input
              type="text"
              value={googleCalUrl}
              onChange={(e) => setGoogleCalUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
            />
            <p className="text-[10px] text-slate-400">
              In Google Calendar &rarr; Settings &rarr; Integrate Calendar &rarr; Copy "Embed code" src URL.
            </p>
          </div>

          {/* GEMINI API SETTINGS */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                  Google AI Studio (Gemini 3.8 Flash)
                </h4>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Stored strictly on your local device.
              </p>
            </div>
          </div>

          {/* CLOUD SYNC & FIREBASE */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                  Firebase Multi-Device Cloud Sync
                </h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCloudSync}
                  onChange={(e) => setUseCloudSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {useCloudSync && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-fadeIn text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                    placeholder="apiKey"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    placeholder="projectId"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* BACKUP & SAVE */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
