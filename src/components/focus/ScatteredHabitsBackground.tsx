import React, { useState } from 'react';
import { HabitItem, formatHabitCompact } from '../../services/focusHabits';
import { Sparkles } from 'lucide-react';

interface Props {
  habits: HabitItem[];
  onDismiss: (habit: HabitItem) => void;
  isAllClear?: boolean;
}

// Organic scattered anchor coordinates around the perimeter and flanks
// The central button area (roughly 35%-65% X and Y) is completely avoided,
// scattering habits naturally across top, flanks (sides), and bottom.
interface ScatterSlot {
  style: React.CSSProperties;
  rotateClass: string;
}

const SCATTER_SLOTS: ScatterSlot[] = [
  // 1. Top left
  { style: { top: '11%', left: '5%' }, rotateClass: '-rotate-1' },
  // 2. Top right
  { style: { top: '12%', right: '6%' }, rotateClass: 'rotate-1' },
  // 3. Left flank (upper side)
  { style: { top: '31%', left: '3%' }, rotateClass: 'rotate-1' },
  // 4. Right flank (upper side)
  { style: { top: '29%', right: '4%' }, rotateClass: '-rotate-1' },
  // 5. Left flank (lower side)
  { style: { top: '55%', left: '3%' }, rotateClass: '-rotate-2' },
  // 6. Right flank (lower side)
  { style: { top: '57%', right: '4%' }, rotateClass: 'rotate-2' },
  // 7. Top center-left offset
  { style: { top: '7%', left: '34%' }, rotateClass: 'rotate-1' },
  // 8. Bottom center-right offset
  { style: { bottom: '8%', right: '32%' }, rotateClass: '-rotate-1' },
  // 9. Bottom left
  { style: { bottom: '15%', left: '6%' }, rotateClass: 'rotate-2' },
  // 10. Bottom right
  { style: { bottom: '14%', right: '5%' }, rotateClass: '-rotate-2' },
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
            style={slot.style}
            className={`absolute pointer-events-auto transition-all duration-300 transform ${slot.rotateClass} ${
              isDismissing
                ? 'scale-50 opacity-0 -translate-y-3 pointer-events-none'
                : 'scale-100 opacity-90 hover:opacity-100 hover:scale-105'
            }`}
          >
            <button
              onClick={() => handleHabitClick(habit)}
              className="text-left px-2.5 py-1 rounded-xl bg-amber-950/20 hover:bg-amber-900/40 border border-amber-500/25 hover:border-amber-400/60 backdrop-blur-xs transition-all duration-200 cursor-pointer shadow-xs hover:shadow-amber-500/10 active:scale-95 group select-none max-w-[125px] sm:max-w-none"
              title="Click to mark done and clear from screen"
            >
              <div className="text-[11px] font-normal text-amber-300/85 group-hover:text-amber-200 tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
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
