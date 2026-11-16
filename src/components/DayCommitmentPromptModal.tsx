import React from 'react';
import { DayCommitmentLevel } from '../services/focusMovement';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  suggestedLevel?: DayCommitmentLevel;
  onCommit: (level: DayCommitmentLevel) => void;
  onClose?: () => void;
}

export function DayCommitmentPromptModal({
  suggestedLevel = 'standard',
  onCommit,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-sm bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-center relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto mb-4 text-purple-400">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>

        <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 block mb-1">
          Daily Movement Setup
        </span>
        <h2 className="text-xl font-black text-white mb-2">Commit to Today</h2>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Set your baseline for today’s watch module. You can always raise it later or earn bonus stretch jewels.
        </p>

        <div className="space-y-2.5 mb-6">
          <button
            onClick={() => onCommit('light')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs font-bold text-slate-200 transition active:scale-98"
          >
            <div>
              <div className="text-white text-sm">Light Day</div>
              <div className="text-[10px] text-slate-400 font-normal">A gentle floor for recovery or busy days</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={() => onCommit('standard')}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500 text-left flex items-center justify-between text-xs font-bold text-white transition active:scale-98 shadow-lg shadow-purple-950/50"
          >
            <div>
              <div className="text-purple-200 text-sm flex items-center gap-1.5">
                <span>Standard Day</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-extrabold">Suggested</span>
              </div>
              <div className="text-[10px] text-purple-300/80 font-normal">Solid steady progress into the movement</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={() => onCommit('full')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs font-bold text-slate-200 transition active:scale-98"
          >
            <div>
              <div className="text-white text-sm">Full Day</div>
              <div className="text-[10px] text-slate-400 font-normal">Dedicated focus block for high output</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
