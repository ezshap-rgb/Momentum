import React from 'react';
import { CandidateScore } from '../services/focusAlgorithm';
import { X, BarChart2, ShieldAlert, Sparkles, Target } from 'lucide-react';

interface Props {
  candidates: CandidateScore[];
  onClose: () => void;
}

export function CandidateInspectorModal({ candidates, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Algorithm Candidate Inspector</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-purple-950/40 border-b border-purple-800/40 text-[11px] text-purple-200">
          Real-time candidate ranking based on target friction, deadline curves, importance, and heartbeat bonuses.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {candidates.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No available candidate actions in pool.</p>
          ) : (
            candidates.map((cand, idx) => (
              <div
                key={cand.action.task_id}
                className={`p-3 rounded-xl border text-xs transition ${
                  idx === 0
                    ? 'bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/40'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white line-clamp-1">{cand.action.title}</span>
                  </div>
                  <span className="font-mono font-extrabold text-purple-400 text-xs shrink-0">
                    Score: {cand.totalScore.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 my-2 text-[10px] text-slate-400 font-mono">
                  <div className="p-1 bg-slate-900 rounded">Frict: {cand.effectiveFriction}</div>
                  <div className="p-1 bg-slate-900 rounded">Urg: +{cand.urgencyScore.toFixed(1)}</div>
                  <div className="p-1 bg-slate-900 rounded">Imp: +{cand.importanceScore}</div>
                  <div className="p-1 bg-slate-900 rounded">Age: +{cand.ageScore.toFixed(1)}</div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {cand.reasons.map((r, ri) => (
                    <span key={ri} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-medium">
                      {r}
                    </span>
                  ))}
                  {cand.isTripwire && (
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[9px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Tripwire
                    </span>
                  )}
                  {cand.isReservedSlot && (
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[9px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Reserved Slot
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
