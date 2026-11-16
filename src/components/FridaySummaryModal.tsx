import React from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  X,
  BatteryCharging,
  ArrowRight,
} from 'lucide-react';
import {
  getCurrentWeeklyMovement,
  markFridaySummarySeen,
  getActiveCraftingWatch,
} from '../services/focusCollection';
import { getPowerReserve } from '../services/focusHabits';

interface FridaySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCollection: () => void;
}

export const FridaySummaryModal: React.FC<FridaySummaryModalProps> = ({
  isOpen,
  onClose,
  onOpenCollection,
}) => {
  if (!isOpen) return null;

  const movement = getCurrentWeeklyMovement();
  const watch = getActiveCraftingWatch();
  const reserve = getPowerReserve();

  // Aggregate stats
  let totalParts = 0;
  let totalWork = 0;
  for (const m of Object.values(movement.modules)) {
    totalParts += m.parts.length;
    totalWork += m.total_work_done;
  }

  const handleDismiss = () => {
    markFridaySummarySeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Friday Week Reflection</h2>
              <p className="text-xs text-slate-400">Calm review of the week — zero pressure, zero guilt</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-950 border border-purple-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-sm">Week Movement Caliber</span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">
                {movement.week_id}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Parts Fitted</div>
                <div className="text-xl font-black text-white">{totalParts}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Work Points</div>
                <div className="text-xl font-black text-white">{totalWork}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Power Reserve</div>
                <div className="text-xl font-black text-purple-400">{reserve}%</div>
              </div>
            </div>
          </div>

          {/* Timepiece crafting progress */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Watch In Progress: {watch.name}</span>
              <span className="text-purple-400 font-semibold">{watch.completed_weeks_count} of 4 Weeks</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every four completed weekly movements finishes an heirloom timepiece in your collection vault.
            </p>
          </div>

          {/* Weekend Polish reminder */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Award className="w-4 h-4" />
              <span>Weekend Polish (Friday & Saturday)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Weekend work is completely voluntary. Any actions completed earn polish upgrades for your parts, and 16 points unlocks a complication. You never lose streaks or reserve points on off days.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            onClick={() => {
              handleDismiss();
              onOpenCollection();
            }}
            className="text-xs text-purple-400 hover:text-purple-300 font-bold transition flex items-center gap-1"
          >
            <span>Open Collection Vault</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Enjoy the Weekend
          </button>
        </div>
      </div>
    </div>
  );
};
