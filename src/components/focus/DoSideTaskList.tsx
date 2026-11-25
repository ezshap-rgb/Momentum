import React, { useState } from 'react';
import { QuickJob } from '../../types';
import { GripVertical, ChevronUp, ChevronDown, Circle } from 'lucide-react';

interface Props {
  tasks: QuickJob[];
  onReorder: (orderedIds: string[]) => void;
  onCompleteTask?: (id: string) => void;
}

/**
 * Subtle left-hand ordered Tasks list on the DO screen.
 * Displays active Tasks only (never Jobs or Projects) with zero-friction drag or arrow reordering.
 */
export function DoSideTaskList({ tasks, onReorder, onCompleteTask }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const moveByIndex = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= tasks.length || fromIdx === toIdx) return;
    const nextIds = tasks.map((t) => t.id);
    const [moved] = nextIds.splice(fromIdx, 1);
    nextIds.splice(toIdx, 0, moved);
    onReorder(nextIds);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = tasks.findIndex((t) => t.id === draggedId);
    const toIdx = tasks.findIndex((t) => t.id === targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      moveByIndex(fromIdx, toIdx);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <aside className="bg-slate-900/45 border border-slate-800/70 rounded-2xl p-2.5 sm:p-3 flex flex-col min-h-0 overflow-hidden backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-slate-800/70 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tasks
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-400">
            {tasks.length}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline truncate">
          Drag or ↑↓ to order
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-6">
            No tasks queued.
          </p>
        ) : (
          tasks.map((task, idx) => {
            const isNext = idx === 0;
            const isDragged = draggedId === task.id;
            const isDropTarget = dragOverId === task.id && draggedId !== task.id;

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  setDraggedId(task.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', task.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== task.id) setDragOverId(task.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === task.id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(task.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition select-none ${
                  isDropTarget
                    ? 'border-purple-500/60 bg-purple-950/30'
                    : isNext
                    ? 'border-purple-500/30 bg-slate-900/75'
                    : 'border-slate-800/60 bg-slate-950/35 hover:bg-slate-900/60 hover:border-slate-700/70'
                } ${isDragged ? 'opacity-45' : ''}`}
              >
                <span
                  className="text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 hidden sm:inline-flex"
                  title="Drag to reorder"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>

                {onCompleteTask && (
                  <button
                    type="button"
                    onClick={() => onCompleteTask(task.id)}
                    className="p-0.5 text-slate-500 hover:text-emerald-400 rounded-full transition shrink-0 cursor-pointer"
                    title="Mark task done"
                  >
                    <Circle className="w-3.5 h-3.5" />
                  </button>
                )}

                <span
                  className={`text-[10px] font-mono shrink-0 ${
                    isNext ? 'text-purple-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  {idx + 1}.
                </span>

                <span
                  className={`text-xs leading-snug flex-1 min-w-0 truncate ${
                    isNext ? 'text-slate-100 font-medium' : 'text-slate-300'
                  }`}
                  title={task.title}
                >
                  {task.title}
                </span>

                {isNext && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-purple-400/90 hidden sm:inline shrink-0">
                    Next
                  </span>
                )}

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveByIndex(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                    title="Move up"
                    aria-label={`Move ${task.title} up`}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveByIndex(idx, idx + 1)}
                    disabled={idx === tasks.length - 1}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                    title="Move down"
                    aria-label={`Move ${task.title} down`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
