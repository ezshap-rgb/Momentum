import React from 'react';
import {
  DayModule,
  DayCommitmentLevel,
  COMMITMENT_POINTS,
} from '../services/focusMovement';
import { loadHabitsState } from '../services/focusHabits';
import { WatchPartVector } from './WatchPartVector';
import { GearTrainWidget } from './GearTrainWidget';
import { Sparkles, Trophy, CheckCircle2, RotateCcw } from 'lucide-react';

interface Props {
  module: DayModule;
  onCommitChange: (level: DayCommitmentLevel) => void;
  onFreshStart: () => void;
  onClose: () => void;
}

export function DayMovementBenchModal({
  module,
  onCommitChange,
  onFreshStart,
  onClose,
}: Props) {
  const habits = loadHabitsState();
  // Slots revealed = floor(10 * work_done / committed_level), capped at 10
  const slotsRevealed = Math.min(10, Math.floor((10 * module.total_work_done) / module.committed_work_points));

  // Extra work beyond committed level fills up to 5 stretch jewel slots
  const extraWork = Math.max(0, module.total_work_done - module.committed_work_points);
  const extraJewelsEarned = Math.min(5, Math.floor(extraWork / (module.committed_work_points * 0.2)));

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
              Watchmaker's Bench · {module.day_name}
            </span>
            <h2 className="text-xl font-black text-white">{module.module_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Commitment Level Selector (Light, Standard, Full) */}
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">Today's Commitment:</span>
            {module.is_closed && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Module Closed!
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['light', 'standard', 'full'] as DayCommitmentLevel[]).map((level) => {
              const isSelected = module.committed_level === level;
              return (
                <button
                  key={level}
                  onClick={() => onCommitChange(level)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition capitalize ${
                    isSelected
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10 Part Slots (Physical Visual Progress, No numbers!) */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Movement Assembly Progress</span>
          </div>

          <div className="grid grid-cols-5 gap-2.5 p-4 bg-slate-950 rounded-2xl border border-slate-800">
            {Array.from({ length: 10 }).map((_, i) => {
              const isFilled = i < slotsRevealed;
              const part = module.parts[i];
              return (
                <WatchPartVector
                  key={i}
                  partSize={part ? part.part_size : 'screw'}
                  finishGrade={part ? part.finish_grade : 'brushed'}
                  isFilled={isFilled}
                />
              );
            })}
          </div>
        </div>

        {/* Stretch Jewels (Reward for going beyond committed floor) */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-rose-400" />
              <span>Stretch Jewels (Extra Credit)</span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <WatchPartVector
                key={i}
                partSize="jewel"
                finishGrade="decorated"
                isFilled={i < extraJewelsEarned}
                isJewelSlot={true}
              />
            ))}
          </div>
        </div>

        {/* 7-Gear Train (Habits & Power Reserve) */}
        <div className="mb-6">
          <GearTrainWidget habits={habits} />
        </div>

        {/* Fresh Start Button (Zero guilt recovery) */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onFreshStart}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fresh Start Today</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white transition active:scale-95"
          >
            Back to Action
          </button>
        </div>
      </div>
    </div>
  );
}
