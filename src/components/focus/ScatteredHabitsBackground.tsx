import React, { useState } from 'react';
import { HabitItem, formatHabitCompact } from '../../services/focusHabits';
import { Sparkles } from 'lucide-react';

interface Props {
  habits: HabitItem[];
  onDismiss: (habit: HabitItem) => void;
  isAllClear?: boolean;
}

// Organic scattered anchor coordinates placed strictly in the upper and lower perimeter bands
// Central 30%-70% vertical zone is kept completely clear so the DO button is NEVER covered on any screen size
const SCATTER_SLOTS = [
  { top: '12%', left: '5%' },
  { top: '12%', right: '5%' },
  { top: '22%', left: '6%' },
  { top: '22%', right: '6%' },
  { bottom: '22%', left: '6%' },
  { bottom: '22%', right: '6%' },
  { bottom: '13%', left: '5%' },
  { bottom: '13%', right: '5%' },
];

export function ScatteredHabitsBackground({ habits, onDismiss, isAllClear }: Props) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const unclearedHabits = habits.filter((h) => !h.isComplete);

  const handleHabitClick = (habit: HabitItem) => {
    setDismissingId(habit.habit_id);
    setTimeout(() => {
      onDismiss(habit);
      setDismissingId(null);
    }, 280);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
      {/* All Clear celebratory indicator */}
      {isAllClear && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 pointer-events-auto px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-fadeIn shadow-lg shadow-amber-950/40">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Screen Cleared · All Daily Habits Done (+5 pts)</span>
        </div>
      )}

      {/* Scattered uncleared habits */}
      {unclearedHabits.map((habit, idx) => {
        const slot = SCATTER_SLOTS[idx % SCATTER_SLOTS.length];
        const isDismissing = dismissingId === habit.habit_id;
        const { line1, line2 } = formatHabitCompact(habit);

        return (
          <div
            key={habit.habit_id}
            style={slot as React.CSSProperties}
            className={`absolute pointer-events-auto transition-all duration-300 transform ${
              isDismissing
                ? 'scale-50 opacity-0 -translate-y-3 pointer-events-none'
                : 'scale-100 opacity-90 hover:opacity-100 hover:scale-105'
            }`}
          >
            <button
              onClick={() => handleHabitClick(habit)}
              className="text-left px-2.5 py-1 rounded-xl bg-amber-950/20 hover:bg-amber-900/40 border border-amber-500/25 hover:border-amber-400/60 backdrop-blur-xs transition-all duration-200 cursor-pointer shadow-xs hover:shadow-amber-500/10 active:scale-95 group select-none"
              title="Click to mark done and clear from screen"
            >
              <div className="text-[11px] font-normal text-amber-300/85 group-hover:text-amber-200 tracking-tight leading-tight whitespace-nowrap">
                {line1}
              </div>
              {line2 && (
                <div className="text-[9px] font-light text-amber-400/60 group-hover:text-amber-300/80 tracking-wider lowercase leading-none mt-0.5 whitespace-nowrap">
                  {line2}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
