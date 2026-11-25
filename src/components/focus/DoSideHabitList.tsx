import React, { useState } from 'react';
import { HabitItem, formatHabitCompact } from '../../services/focusHabits';
import { Circle, Check, Sparkles } from 'lucide-react';

interface Props {
  habits: HabitItem[];
  onDismiss: (habit: HabitItem) => void;
}

/**
 * Single-line horizontally scrolling Habits strip on the DO screen.
 * Checking a habit logs it for today and clears it from the strip while keeping the template intact.
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
    }, 220);
  };

  return (
    <section
      aria-label="Daily habits"
      className="bg-slate-900/50 border border-slate-800/70 rounded-2xl px-2 py-1.5 flex items-center shrink-0 overflow-hidden backdrop-blur-xs"
    >
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto flex-nowrap py-0.5">
        {uncleared.length === 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap px-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
            <span>All daily habits cleared ✨</span>
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
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border whitespace-nowrap transition-all duration-200 cursor-pointer group ${
                  isDismissing
                    ? 'scale-95 opacity-0 border-emerald-500/40 bg-emerald-950/30 pointer-events-none'
                    : 'border-slate-800/70 bg-slate-950/45 hover:bg-slate-900/70 hover:border-amber-500/35'
                }`}
              >
                <span className="shrink-0 text-slate-500 group-hover:text-emerald-400 transition">
                  {isDismissing ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="text-xs text-slate-200 group-hover:text-white leading-none">
                  {line1}
                </span>
                {line2 && (
                  <span className="text-[9px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full lowercase leading-none">
                    {line2}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
