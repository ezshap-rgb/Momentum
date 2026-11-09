import React, { useState } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { AppSettings, FirebaseConfigSettings } from '../types';
import { normalizeGoogleCalendarUrl } from '../services/storageService';
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
  ListTodo,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Copy,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    settings,
    updateSettings,
    boardData,
    syncGoogleTasks,
    disconnectGoogleTasks,
    isSyncingTasks,
  } = useMomentum();

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(
    settings.geminiModel && !settings.geminiModel.includes('2.5')
      ? settings.geminiModel
      : 'gemini-3.8-flash'
  );
  const [googleCalUrl, setGoogleCalUrl] = useState(settings.googleCalendarEmbedUrl || '');
  const [gtasksClientId, setGtasksClientId] = useState(settings.googleTasksClientId || '');
  const [gtasksEmail, setGtasksEmail] = useState(settings.googleTasksEmail || '');
  const [gtasksWebhookUrl, setGtasksWebhookUrl] = useState(settings.googleTasksWebhookUrl || '');
  const [gtasksAutoSync, setGtasksAutoSync] = useState(settings.googleTasksAutoSync || false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showGtasksGuide, setShowGtasksGuide] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [copiedWebhookScript, setCopiedWebhookScript] = useState(false);

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

  const handleConnectGoogleTasks = async () => {
    setSyncFeedback(null);
    if (!gtasksWebhookUrl.trim() && !gtasksClientId.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Please enter your Webhook URL or Google OAuth Client ID below first.',
      });
      return;
    }
    updateSettings({
      googleTasksClientId: gtasksClientId.trim(),
      googleTasksEmail: gtasksEmail.trim(),
      googleTasksWebhookUrl: gtasksWebhookUrl.trim(),
      googleTasksAutoSync: gtasksAutoSync,
    });
    const res = await syncGoogleTasks(gtasksClientId.trim());
    if (res.success) {
      setSyncFeedback({
        type: 'success',
        message: `✓ Connected! Synced ${res.count} task${res.count === 1 ? '' : 's'} into your cockpit panels.`,
      });
    } else {
      setSyncFeedback({
        type: 'error',
        message: res.error || 'Failed to authenticate with Google.',
      });
    }
  };

  const handleDisconnectGoogleTasks = () => {
    disconnectGoogleTasks();
    updateSettings({
      googleTasksWebhookUrl: '',
    });
    setGtasksWebhookUrl('');
    setSyncFeedback({
      type: 'success',
      message: 'Disconnected from Google Tasks.',
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      theme,
      geminiApiKey: geminiKey.trim(),
      geminiModel,
      googleCalendarEmbedUrl: normalizeGoogleCalendarUrl(googleCalUrl),
      googleTasksClientId: gtasksClientId.trim(),
      googleTasksEmail: gtasksEmail.trim(),
      googleTasksWebhookUrl: gtasksWebhookUrl.trim(),
      googleTasksAutoSync: gtasksAutoSync,
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

          {/* GOOGLE TASKS SYNC */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                <ListTodo className="w-4 h-4 text-emerald-500" />
                <span>Google Tasks (Voice Ingest from Gemini)</span>
              </div>
              {settings.googleTasksConnected ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Connect your Google Tasks account so tasks and voice thoughts you enter into the Gemini mobile app automatically flow into your Momentum Cockpit.
            </p>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] animate-fadeIn ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{syncFeedback.message}</span>
              </div>
            )}

            {/* Client ID input */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Option A: Google OAuth 2.0 Client ID:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGtasksGuide(!showGtasksGuide)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showGtasksGuide ? 'Hide Guide' : 'OAuth Guide (free 2 min)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={gtasksClientId}
                  onChange={(e) => setGtasksClientId(e.target.value)}
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  Your Google Email (Remembers your account to bypass re-signing in):
                </label>
                <input
                  type="email"
                  value={gtasksEmail}
                  onChange={(e) => setGtasksEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Step-by-step accordion guide */}
              {showGtasksGuide && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-[10px] space-y-1.5 animate-fadeIn">
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    🚀 Quick steps to create your Google OAuth Client ID:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-normal">
                    <li>
                      Go to{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-semibold"
                      >
                        Google Cloud Console &rarr; Credentials
                      </a>.
                    </li>
                    <li>Click <strong>+ Create Credentials</strong> &rarr; <strong>OAuth client ID</strong> &rarr; Application type: <strong>Web application</strong>.</li>
                    <li>Under <strong>Authorized JavaScript origins</strong>, add your Momentum URLs (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">https://ezshap-rgb.github.io</code> and <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">http://localhost:5173</code>).</li>
                    <li>Click <strong>Create</strong> and copy your <strong>Client ID</strong> above.</li>
                    <li>
                      Ensure the Tasks API is active at{' '}
                      <a
                        href="https://console.cloud.google.com/apis/library/tasks.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-semibold"
                      >
                        Google Tasks API Library
                      </a>.
                    </li>
                  </ol>
                </div>
              )}

              {/* Option B: Permanent Zero-Login Webhook Relay */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>Option B: Permanent Zero-Login Webhook URL (Recommended):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowWebhookGuide(!showWebhookGuide)}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showWebhookGuide ? 'Hide Webhook Guide' : 'How it works (Zero Popups Forever)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={gtasksWebhookUrl}
                  onChange={(e) => setGtasksWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Runs directly inside your Google Account via Google Apps Script. <strong>Never asks to sign in again</strong>.
                </span>

                {showWebhookGuide && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[10px] space-y-2 mt-2 animate-fadeIn text-slate-700 dark:text-slate-300">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300">
                      ⚡ 1-Minute Zero-Login Setup (No Popups / No Expiring Tokens):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-normal">
                      <li>
                        Open{' '}
                        <a
                          href="https://script.google.com/home/start"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 dark:text-emerald-400 underline font-semibold"
                        >
                          script.google.com
                        </a>{' '}
                        and click <strong>New project</strong>.
                      </li>
                      <li>
                        Click the button below to copy the 15-line script, and paste it into the editor (replacing all text):
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const code = `function doGet(e) {
  try {
    var tasks = Tasks.Tasks.list('@default', { showCompleted: false, showHidden: false, maxResults: 100 }).items || [];
    return ContentService.createTextOutput(JSON.stringify({ success: true, tasks: tasks })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'complete') {
      Tasks.Tasks.patch({ status: 'completed' }, '@default', data.taskId);
    } else if (data.action === 'delete') {
      Tasks.Tasks.remove('@default', data.taskId);
    } else if (data.action === 'create') {
      var newTask = Tasks.Tasks.insert({ title: data.title, notes: data.notes || '' }, '@default');
      return ContentService.createTextOutput(JSON.stringify({ success: true, task: newTask })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                              navigator.clipboard.writeText(code);
                              setCopiedWebhookScript(true);
                              setTimeout(() => setCopiedWebhookScript(false), 2000);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-xs"
                          >
                            {copiedWebhookScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedWebhookScript ? '✓ Copied Script!' : 'Copy Webhook Script'}</span>
                          </button>
                        </div>
                      </li>
                      <li>On the left side, click <strong>+</strong> next to <strong>Services</strong> &rarr; select <strong>Google Tasks API</strong> &rarr; click <strong>Add</strong>.</li>
                      <li>Click <strong>Deploy</strong> (top-right) &rarr; <strong>New deployment</strong> &rarr; select type <strong>Web app</strong>.</li>
                      <li>Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong> &rarr; click <strong>Deploy</strong>.</li>
                      <li>Copy the <strong>Web app URL</strong> and paste it into the box above!</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Connection Actions */}
            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConnectGoogleTasks}
                  disabled={isSyncingTasks}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTasks ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingTasks
                      ? 'Authenticating & Syncing...'
                      : settings.googleTasksConnected
                      ? 'Sync Tasks Now'
                      : 'Sign in with Google & Sync'}
                  </span>
                </button>

                {settings.googleTasksConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleTasks}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              {settings.googleTasksConnected && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={gtasksAutoSync}
                    onChange={(e) => setGtasksAutoSync(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Auto-sync every 5 min</span>
                </label>
              )}
            </div>
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
