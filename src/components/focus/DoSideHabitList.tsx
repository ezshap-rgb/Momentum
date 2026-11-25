import React, { useState } from 'react';
import { HabitItem, formatHabitCompact } from '../../services/focusHabits';
import { Circle, Check, Sparkles } from 'lucide-react';

interface Props {
  habits: HabitItem[];
  onDismiss: (habit: HabitItem) => void;
}

/**
 * Subtle right-hand Habits checklist on the DO screen.
 * Checking a habit logs it for today and clears it from the DO screen while keeping the template intact.
 */
export function DoSideHabitList({ habits, onDismiss }: Props) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const uncleared = habits.filter((h) => !h.isComplete);

  const handleCheck = (habit: HabitItem) => {
    if (dismissingId === habit.habit_id) return;
    setDismissingId(habit.habit_id);
    setTimeout(() => {
      onDismiss(habit);
      setDismissingId(null);
    }, 240);
  };

  return (
    <aside className="bg-slate-900/45 border border-slate-800/70 rounded-2xl p-2.5 sm:p-3 flex flex-col min-h-0 overflow-hidden backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-slate-800/70 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Habits
        </span>
        <span className="text-[10px] font-semibold text-amber-400/80 shrink-0">
          {uncleared.length > 0 ? `${uncleared.length} left` : 'All clear'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {uncleared.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 gap-1.5 text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-400/70" />
            <span className="text-[11px]">All daily habits cleared ✨</span>
          </div>
        ) : (
          uncleared.map((habit) => {
            const isDismissing = dismissingId === habit.habit_id;
            const { line1, line2 } = formatHabitCompact(habit);

            return (
              <button
                key={habit.habit_id}
                type="button"
                onClick={() => handleCheck(habit)}
                title="Mark done for today"
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer group ${
                  isDismissing
                    ? 'scale-95 opacity-0 border-emerald-500/40 bg-emerald-950/30 pointer-events-none'
                    : 'border-slate-800/60 bg-slate-950/35 hover:bg-slate-900/60 hover:border-amber-500/35'
                }`}
              >
                <span className="shrink-0 text-slate-500 group-hover:text-emerald-400 transition">
                  {isDismissing ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-200 group-hover:text-white leading-tight truncate">
                    {line1}
                  </div>
                  {line2 && (
                    <div className="text-[9px] text-amber-400/75 lowercase leading-none mt-0.5">
                      {line2}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
