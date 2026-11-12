import React, { useState, useRef } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import { QuickJobDuration } from '../../types';
import {
  Zap,
  Circle,
  Check,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Maximize2,
  Minimize2,
  Pencil,
} from 'lucide-react';

export const QuickJobsPanel: React.FC = () => {
  const { boardData, addQuickJob, toggleQuickJob, deleteQuickJob, editQuickJob, panelStates, cyclePanelLevel } =
    useMomentum();

  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState<QuickJobDuration>('5m');
  const [filterDuration, setFilterDuration] = useState<'all' | '1m' | '5m' | '15m'>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState<QuickJobDuration>('5m');
  const inputRef = useRef<HTMLInputElement>(null);

  const level = panelStates.quick_jobs; // 'collapsed' | 'compact' | 'expanded'

  const activeJobs = boardData.quick_jobs.filter((j) => !j.done);
  const completedJobs = boardData.quick_jobs.filter((j) => j.done);

  const filteredActive = activeJobs.filter((j) => {
    if (filterDuration === 'all') return true;
    return j.duration === filterDuration;
  });

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      inputRef.current?.focus();
      return;
    }
    addQuickJob(newTitle.trim(), newDuration);
    setNewTitle('');
  };

  const startEditing = (job: { id: string; title: string; duration?: QuickJobDuration }) => {
    setEditingJobId(job.id);
    setEditTitle(job.title);
    setEditDuration(job.duration || '5m');
    setExpandedJobId(job.id);
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    editQuickJob(id, {
      title: editTitle.trim(),
      duration: editDuration,
    });
    setEditingJobId(null);
  };

  const cancelEdit = () => {
    setEditingJobId(null);
  };

  const getDurationBadge = (d?: QuickJobDuration) => {
    const val = d || '5m';
    const colorClasses =
      val === '1m'
        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        : val === '5m'
        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';

    return (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${colorClasses} shrink-0`}
        title={`${val} task`}
      >
        {val}
      </span>
    );
  };

  return (
    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col transition-all overflow-hidden">
      {/* Panel Header */}
      <div
        onClick={() => cyclePanelLevel('quick_jobs')}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 transition shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
            Tasks
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            {activeJobs.length}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
            (1m • 5m • 15m)
          </span>
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (level === 'collapsed') cyclePanelLevel('quick_jobs');
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
            title="Add Task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyclePanelLevel('quick_jobs')}
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

      {/* COLLAPSED LEVEL (0) */}
      {level === 'collapsed' && (
        <div className="px-3.5 py-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="truncate">
            {activeJobs.length > 0 ? `${activeJobs[0].title}` : 'All caught up!'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Bar */}
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Type task here (e.g. Call Sam)..."
              autoComplete="off"
              enterKeyHint="done"
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            />
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
              {(['1m', '5m', '15m'] as QuickJobDuration[]).map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setNewDuration(dur)}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    newDuration === dur
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shrink-0 cursor-pointer flex items-center justify-center shadow-xs"
              title="Add Task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Filter in Expanded */}
          {level === 'expanded' && (
            <div className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-slate-800 pb-1 shrink-0">
              <span className="text-slate-400 font-medium">Filter:</span>
              <div className="flex items-center gap-1">
                {(['all', '1m', '5m', '15m'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterDuration(f)}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium transition ${
                      filterDuration === f
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scrolling List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {filteredActive.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No tasks pending.
              </p>
            )}

            {filteredActive.map((job) => {
              const isEditing = editingJobId === job.id;
              const isExpanded = expandedJobId === job.id;

              return (
                <div
                  key={job.id}
                  onClick={() => {
                    if (!isEditing) {
                      setExpandedJobId(isExpanded ? null : job.id);
                    }
                  }}
                  className={`group p-2 rounded-xl border transition cursor-pointer select-text ${
                    isExpanded || isEditing
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-800/60'
                  }`}
                  title={isEditing ? '' : isExpanded ? 'Click to collapse' : 'Click to view full entry / edit'}
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(job.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-2 animate-fadeIn"
                    >
                      <textarea
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
                          {(['1m', '5m', '15m'] as QuickJobDuration[]).map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => setEditDuration(dur)}
                              className={`px-2 py-0.5 rounded font-bold transition ${
                                editDuration === dur
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              {dur}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="submit"
                            disabled={!editTitle.trim()}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* Display Mode: Click to view whole entry (no cutoff) and edit */
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleQuickJob(job.id);
                          }}
                          className="mt-0.5 text-slate-400 hover:text-emerald-500 transition shrink-0"
                          title="Mark done"
                        >
                          <Circle className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className={`text-xs font-medium text-slate-800 dark:text-slate-100 ${
                            isExpanded ? 'break-words whitespace-normal' : 'truncate'
                          }`}
                        >
                          {job.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {getDurationBadge(job.duration)}
                        <button
                          type="button"
                          onClick={() => startEditing(job)}
                          className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                          title="Edit task"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuickJob(job.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completed summary in Expanded Mode */}
          {level === 'expanded' && completedJobs.length > 0 && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
              <span>{completedJobs.length} completed tasks</span>
              <button
                onClick={() => completedJobs.forEach((j) => deleteQuickJob(j.id))}
                className="hover:text-rose-400 transition"
              >
                Clear completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
