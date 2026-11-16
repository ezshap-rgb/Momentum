import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Watch,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  getActiveCraftingWatch,
  getWatchCollection,
  getCurrentWeeklyMovement,
  completeWeeklyMovement,
  CollectibleWatch,
  WeeklyMovement,
} from '../services/focusCollection';
import { WatchVectorIllustration } from './WatchVectorIllustration';

interface WatchCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WatchCollectionModal: React.FC<WatchCollectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeWatch, setActiveWatch] = useState<CollectibleWatch>(() => getActiveCraftingWatch());
  const [collection, setCollection] = useState<CollectibleWatch[]>(() => getWatchCollection());
  const [movement, setMovement] = useState<WeeklyMovement>(() => getCurrentWeeklyMovement());
  const [justCompletedNotice, setJustCompletedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdvanceWeek = async () => {
    const res = await completeWeeklyMovement();
    setActiveWatch(getActiveCraftingWatch());
    setCollection(getWatchCollection());
    setMovement(getCurrentWeeklyMovement());

    if (res.isWatchFinished) {
      setJustCompletedNotice(`🎉 Congratulations! ${res.watch.name} is complete and added to your Collection Vault!`);
    } else {
      setJustCompletedNotice(`✓ Week completed! ${res.watch.name} advanced to Week ${res.watch.completed_weeks_count}/4.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>The Watchmaker's Collection</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-bold uppercase">
                  Phase 11
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Movements become collectible timepieces through consistent action
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {justCompletedNotice && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 font-bold text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{justCompletedNotice}</span>
            </div>
          )}

          {/* ACTIVE WATCH ON THE BENCH */}
          <div className="p-5 bg-slate-950/90 border border-purple-500/30 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Currently Crafting on the Bench</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-200 text-[10px] font-extrabold">
                {activeWatch.completed_weeks_count} of 4 Weeks Done
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <WatchVectorIllustration watch={activeWatch} size="md" />

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <h3 className="text-lg font-black text-white">{activeWatch.name}</h3>
                  <div className="text-[11px] text-purple-400 font-semibold">{activeWatch.caliber} · {activeWatch.case_material} Case</div>
                  <p className="text-slate-400 mt-1">{activeWatch.finish_summary}</p>
                </div>

                {/* 4-Week Component Unlock Stepper */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.case
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.case ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 1: Case ({activeWatch.case_material})</span>
                  </div>

                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.dial
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.dial ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 2: Dial ({activeWatch.dial_style})</span>
                  </div>

                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.hands
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.hands ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 3: Dauphine Hands</span>
                  </div>

                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.crystal_crown
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.crystal_crown ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 4: Crystal & Crown</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Week closes Thursday night. Carry-over allowed anytime within the week.
                  </span>
                  <button
                    onClick={handleAdvanceWeek}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs transition shadow-sm"
                  >
                    Assemble Week Movement →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WEEKEND POLISH & COMPLICATIONS STATUS */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Weekend Polish & Complications</span>
              </span>
              <span className="text-[10px] text-purple-300 font-semibold">
                {movement.weekend_work_points} Weekend Work Points Earned
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Off-day actions on Friday and Saturday earn polish: every 8 work points upgrades one part of this week's movement by one finish grade, and 16 points unlocks a complication.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                Polish Upgrades: <strong className="text-white">{movement.polish_upgrades_count}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                Complications: <strong className="text-white">{movement.complications.length}</strong>
              </span>
            </div>
          </div>

          {/* VAULT OF COMPLETED TIMEPIECES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Timepiece Vault ({collection.length})
              </h3>
            </div>

            {collection.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-1">
                <div>No completed watches in the vault yet.</div>
                <div className="text-[11px] text-slate-600">
                  Complete 4 weekly movements to craft your first collector's chronometer!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {collection.map((w) => (
                  <div
                    key={w.watch_id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-md"
                  >
                    <WatchVectorIllustration watch={w} size="sm" />
                    <div className="space-y-1 min-w-0">
                      <div className="font-extrabold text-white text-sm truncate">{w.name}</div>
                      <div className="text-[10px] text-purple-400 font-bold">{w.caliber} · {w.case_material}</div>
                      <div className="text-[10px] text-slate-400 truncate">{w.finish_summary}</div>
                      {w.completed_at && (
                        <div className="text-[9px] text-slate-500">
                          Completed {w.completed_at.split('T')[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
