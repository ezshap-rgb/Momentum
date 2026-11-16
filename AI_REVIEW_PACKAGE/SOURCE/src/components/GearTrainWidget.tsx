import React from 'react';
import { HabitItem, getPowerReserve } from '../services/focusHabits';
import { BatteryCharging, Disc3 } from 'lucide-react';

interface Props {
  habits: HabitItem[];
}

export const GearTrainWidget: React.FC<Props> = ({ habits }) => {
  const reserve = getPowerReserve();

  return (
    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <Disc3 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span>7-Gear Train (Habits Rolling Momentum)</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-700/60 text-purple-300 text-[10px] font-bold">
          <BatteryCharging className="w-3 h-3 text-purple-400" />
          <span>Power Reserve: {reserve}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {habits.map((h, i) => {
          const percent = Math.min(100, Math.round((h.currentReps / h.quota) * 100));
          return (
            <div
              key={h.habit_id}
              className={`p-2 rounded-xl border text-[10px] transition ${
                h.isComplete
                  ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-bold truncate text-white mb-0.5">{h.name}</div>
              <div className="font-mono text-purple-300">
                {h.currentReps}/{h.quota} {h.unit}
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
