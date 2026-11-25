import React, { useState } from 'react';
import { QuickJob } from '../../types';

interface Props {
  tasks: QuickJob[];
}

/**
 * Passive, label-free ordered Tasks list underneath the DO button.
 * Reordering and completion remain in Lists and the active DO workflow;
 * clicking any item simply expands/collapses its full text.
 */
export function DoSideTaskList({ tasks }: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  return (
    <section
      aria-label="Ordered tasks"
      className="flex-1 min-h-0 bg-slate-900/45 border border-slate-800/70 rounded-2xl p-2 sm:p-2.5 flex flex-col overflow-hidden backdrop-blur-xs"
    >
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-4">
            No tasks queued.
          </p>
        ) : (
          tasks.map((task, idx) => {
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
                className={`flex items-start gap-2 px-2.5 py-1.5 rounded-xl border transition cursor-pointer select-none ${
                  isExpanded
                    ? 'border-purple-500/45 bg-purple-950/25'
                    : 'border-slate-800/60 bg-slate-950/35 hover:bg-slate-900/60 hover:border-slate-700/70'
                }`}
              >
                <span className="mt-0.5 text-[10px] font-mono shrink-0 text-slate-500">
                  {idx + 1}.
                </span>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs leading-snug ${
                      isExpanded
                        ? 'whitespace-normal break-words text-slate-100 font-medium'
                        : 'truncate text-slate-300'
                    }`}
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
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
