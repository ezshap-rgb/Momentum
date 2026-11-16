import React, { useState } from 'react';
import { HabitItem } from '../services/focusHabits';
import { X, Edit3, Check, Flame } from 'lucide-react';

interface HabitEditModalProps {
  habit: HabitItem;
  onSave: (updated: HabitItem) => void;
  onClose: () => void;
}

export const HabitEditModal: React.FC<HabitEditModalProps> = ({
  habit,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<HabitItem>({ ...habit });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm">Edit Habit Definition</h3>
              <p className="text-[11px] text-slate-400">Tune quota, units, and circuit grouping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Habit Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Daily Quota</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quota}
                onChange={(e) =>
                  setFormData({ ...formData, quota: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value as 'reps' | 'seconds' | 'cycle' })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="reps">Reps (repetitions)</option>
                <option value="seconds">Seconds (time hold)</option>
                <option value="cycle">Cycle (sets/sequence)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Circuit Schedule</label>
              <select
                value={formData.circuit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    circuit: e.target.value as 'morning' | 'evening' | 'both',
                  })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="both">Both (Morning & Evening)</option>
                <option value="morning">Morning Circuit</option>
                <option value="evening">Evening Circuit</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Routine Half</label>
              <select
                value={formData.half}
                onChange={(e) =>
                  setFormData({ ...formData, half: e.target.value as 'A' | 'B' })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="A">Half A (Core / Upper)</option>
                <option value="B">Half B (Pull / Lower)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Completed Today ({formData.unit})</label>
            <input
              type="number"
              min="0"
              value={formData.currentReps}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                setFormData({
                  ...formData,
                  currentReps: val,
                  isComplete: val >= formData.quota,
                });
              }}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Save Habit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
