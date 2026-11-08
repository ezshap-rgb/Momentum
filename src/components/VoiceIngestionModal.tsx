import React, { useState } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { GeminiParsedData } from '../types';
import { speechRecorder } from '../services/speechService';
import { parseBrainDumpWithGemini } from '../services/geminiService';
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface VoiceIngestionModalProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

export const VoiceIngestionModal: React.FC<VoiceIngestionModalProps> = ({
  onClose,
  onOpenSettings,
}) => {
  const { settings, boardData, applyGeminiParsedData } = useMomentum();
  const [isListening, setIsListening] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [stagedData, setStagedData] = useState<GeminiParsedData | null>(null);

  const handleToggleVoice = () => {
    if (isListening) {
      speechRecorder.stop();
      setIsListening(false);
    } else {
      setAiError(null);
      const started = speechRecorder.start({
        onInterimResult: (interim) => {
          setTranscriptText((prev) => prev.split(' [live]')[0] + ` ${interim}`);
        },
        onFinalResult: (final) => {
          setTranscriptText(final);
        },
        onError: (err) => {
          setAiError(`Voice Error: ${err}`);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
      if (started) {
        setIsListening(true);
      }
    }
  };

  const handleProcess = async () => {
    if (!transcriptText.trim()) return;
    if (isListening) {
      speechRecorder.stop();
      setIsListening(false);
    }

    if (!settings.geminiApiKey) {
      setAiError('Please enter your free Gemini API Key in Settings first.');
      return;
    }

    setIsProcessingAI(true);
    setAiError(null);

    try {
      const parsed = await parseBrainDumpWithGemini(
        transcriptText,
        settings.geminiApiKey,
        settings.geminiModel || 'gemini-3.8-flash',
        boardData.projects
      );
      setStagedData(parsed);
    } catch (err: any) {
      setAiError(err.message || 'Failed to parse thoughts.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleAccept = () => {
    if (!stagedData) return;
    applyGeminiParsedData(stagedData);
    setStagedData(null);
    setTranscriptText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Universal Voice & Brain Dump
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speak or paste anything; AI routes it into the 4 buckets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Mic Trigger & Text Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isListening ? 'Listening...' : 'Your thought / voice transcript:'}
              </span>
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Stop Mic' : 'Record Mic'}</span>
              </button>
            </div>

            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="e.g. Order 608 bearings, prepare Mussar Seder next prompt tomorrow at 2, did 25m calisthenics, for Sphere It measured collar in CAD..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 h-28 resize-none"
              autoFocus
            />
          </div>

          {/* AI Error Warning */}
          {aiError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{aiError}</span>
              </div>
              {!settings.geminiApiKey && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="font-bold underline ml-2"
                >
                  Settings
                </button>
              )}
            </div>
          )}

          {/* Staging Preview */}
          {stagedData && (
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-950 border border-emerald-400/50 space-y-2 text-xs animate-fadeIn">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Parsed Into Cockpit Buckets:</span>
              </span>

              {stagedData.quick_jobs && stagedData.quick_jobs.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Quick Jobs:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-200">
                    {stagedData.quick_jobs.map((j, i) => (
                      <li key={i}>
                        {j.title} ({j.duration || '5m'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stagedData.responsibilities && stagedData.responsibilities.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Responsibilities:</strong>
                  <ul className="space-y-0.5 text-slate-700 dark:text-slate-200">
                    {stagedData.responsibilities.map((r, i) => (
                      <li key={i}>
                        {r.title} &rarr; <em>{r.next_action}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stagedData.project_updates && stagedData.project_updates.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Projects:</strong>
                  <ul className="space-y-0.5 text-slate-700 dark:text-slate-200">
                    {stagedData.project_updates.map((p, i) => (
                      <li key={i}>
                        {p.project_name}: {p.update_note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stagedData.habits && stagedData.habits.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Habits:</strong>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-200">
                    {stagedData.habits.map((h, i) => (
                      <li key={i}>
                        {h.name}: {typeof h.value === 'boolean' ? (h.value ? 'Done' : 'Not done') : `${h.value}m`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!stagedData ? (
              <button
                type="button"
                onClick={handleProcess}
                disabled={!transcriptText.trim() || isProcessingAI}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                {isProcessingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Classifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parse Brain Dump</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAccept}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept & Merge into Cockpit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

