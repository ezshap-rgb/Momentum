import React, { useState } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import { Habit } from '../../types';
import {
  Activity,
  Check,
  Plus,
  Trash2,
  Clock,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';

export const HabitsPanel: React.FC = () => {
  const {
    boardData,
    toggleHabitDate,
    setHabitDuration,
    addHabit,
    deleteHabit,
    panelStates,
    cyclePanelLevel,
  } = useMomentum();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'boolean' | 'duration_min'>('boolean');
  const [newNextDue, setNewNextDue] = useState('Daily Morning');

  const level = panelStates.habits; // 'collapsed' | 'compact' | 'expanded'
  const habits = boardData.habits;
  const todayStr = new Date().toISOString().split('T')[0];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addHabit(newName.trim(), newType, 20, newNextDue.trim() || 'Daily');
    setNewName('');
    setIsAdding(false);
  };

  const completedTodayCount = habits.filter((h) => {
    const val = h.log[todayStr];
    return h.type === 'boolean' ? !!val : typeof val === 'number' && val > 0;
  }).length;

  return (
    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col transition-all overflow-hidden">
      {/* Panel Header */}
      <div
        onClick={() => cyclePanelLevel('habits')}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 transition shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800/60">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
            Habits & Rhythms
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
            {completedTodayCount}/{habits.length}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
            (Upcoming timings)
          </span>
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950 transition"
            title="Add Habit"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyclePanelLevel('habits')}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title={`View: ${level}. Click to cycle`}
          >
            {level === 'collapsed' ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : level === 'compact' ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* COLLAPSED LEVEL */}
      {level === 'collapsed' && (
        <div className="px-3.5 py-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="truncate">
            {habits.length > 0
              ? `${completedTodayCount} of ${habits.length} logged today.`
              : 'No habits tracked.'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Form */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-pink-400/40 space-y-2 animate-fadeIn text-xs shrink-0"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Habit name (e.g. Calisthenics, Bedtime 11:30 PM)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newNextDue}
                  onChange={(e) => setNewNextDue(e.target.value)}
                  placeholder="Upcoming timing (e.g. 5:30 PM)..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="hType"
                      checked={newType === 'boolean'}
                      onChange={() => setNewType('boolean')}
                      className="accent-pink-500"
                    />
                    <span>Yes/No</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="hType"
                      checked={newType === 'duration_min'}
                      onChange={() => setNewType('duration_min')}
                      className="accent-pink-500"
                    />
                    <span>Minutes</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-3 py-0.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium"
                >
                  Add Habit
                </button>
              </div>
            </form>
          )}

          {/* Scrolling List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {habits.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No habits configured.
              </p>
            )}

            {habits.map((habit) => {
              const todayVal = habit.log[todayStr];
              const isDone =
                habit.type === 'boolean'
                  ? !!todayVal
                  : typeof todayVal === 'number' && todayVal > 0;

              return (
                <div
                  key={habit.id}
                  className="p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-200 dark:hover:border-slate-700 transition space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {habit.name}
                        </span>
                        {habit.next_due && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{habit.next_due}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {habit.type === 'boolean' ? (
                        <button
                          onClick={() => toggleHabitDate(habit.id, todayStr)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isDone ? 'Done' : 'Check'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
                            {typeof todayVal === 'number' ? `${todayVal}m` : '0m'}
                          </span>
                          <button
                            onClick={() =>
                              setHabitDuration(
                                habit.id,
                                todayStr,
                                (typeof todayVal === 'number' ? todayVal : 0) + 15
                              )
                            }
                            className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold"
                          >
                            +15m
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Delete habit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {level === 'expanded' && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400">
                      <span>7-day awareness:</span>
                      <div className="flex items-center gap-1">
                        {last7Days.map((dStr) => {
                          const val = habit.log[dStr];
                          const active =
                            habit.type === 'boolean'
                              ? !!val
                              : typeof val === 'number' && val > 0;
                          const isToday = dStr === todayStr;

                          return (
                            <div
                              key={dStr}
                              title={`${dStr}: ${active ? 'Logged' : 'Rest'}`}
                              className={`w-2.5 h-2.5 rounded-full transition ${
                                active
                                  ? 'bg-pink-500'
                                  : 'bg-slate-200 dark:bg-slate-800'
                              } ${isToday ? 'ring-1 ring-pink-400' : ''}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
