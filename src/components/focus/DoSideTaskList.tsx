import React, { useState } from 'react';
import { QuickJob } from '../../types';
import { Circle } from 'lucide-react';

interface Props {
  tasks: QuickJob[];
  onCompleteTask?: (id: string) => void;
}

/**
 * Full-width ordered Tasks list shown underneath the DO button.
 * Reordering is handled in the Lists view; clicking a task reveals its full text if truncated.
 */
export function DoSideTaskList({ tasks, onCompleteTask }: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  return (
    <section className="flex-1 min-h-0 bg-slate-900/45 border border-slate-800/70 rounded-2xl p-2.5 sm:p-3 flex flex-col overflow-hidden backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800/70 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tasks
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-400">
            {tasks.length}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 truncate">
          Tap to view full • Order in Lists
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-4">
            No tasks queued.
          </p>
        ) : (
          tasks.map((task, idx) => {
            const isNext = idx === 0;
            const isExpanded = expandedTaskId === task.id;

            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedTaskId(isExpanded ? null : task.id);
                  }
                }}
                title={isExpanded ? 'Click to collapse' : 'Click to view full task'}
                className={`group flex items-start gap-2 px-2.5 py-1.5 rounded-xl border transition cursor-pointer select-none ${
                  isExpanded
                    ? 'border-purple-500/45 bg-purple-950/25'
                    : isNext
                    ? 'border-purple-500/30 bg-slate-900/75 hover:border-purple-500/45'
                    : 'border-slate-800/60 bg-slate-950/35 hover:bg-slate-900/60 hover:border-slate-700/70'
                }`}
              >
                {onCompleteTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteTask(task.id);
                    }}
                    className="mt-0.5 p-0.5 text-slate-500 hover:text-emerald-400 rounded-full transition shrink-0 cursor-pointer"
                    title="Mark task done"
                    aria-label={`Mark ${task.title} done`}
                  >
                    <Circle className="w-3.5 h-3.5" />
                  </button>
                )}

                <span
                  className={`mt-0.5 text-[10px] font-mono shrink-0 ${
                    isNext ? 'text-purple-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  {idx + 1}.
                </span>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs leading-snug ${
                      isExpanded ? 'whitespace-normal break-words' : 'truncate'
                    } ${isNext || isExpanded ? 'text-slate-100 font-medium' : 'text-slate-300'}`}
                  >
                    {task.title}
                  </div>
                  {isExpanded && (task.duration || task.due) && (
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      {task.duration && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300">
                          {task.duration}
                        </span>
                      )}
                      {task.due && <span>Due: {task.due}</span>}
                    </div>
                  )}
                </div>

                {isNext && (
                  <span className="mt-0.5 text-[9px] uppercase tracking-wider font-bold text-purple-400/90 shrink-0">
                    Next
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
