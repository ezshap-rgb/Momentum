import React, { useState, useRef } from 'react';
import { QuickJob } from '../../types';
import { Circle, GripVertical } from 'lucide-react';

interface Props {
  tasks: QuickJob[];
  onCompleteTask?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}

/**
 * Label-free full-width ordered Tasks list underneath the DO button.
 * Supports tapping to view full text, checking off as done, and mouse/finger drag-and-drop reordering.
 */
export function DoSideTaskList({ tasks, onCompleteTask, onReorder }: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const pointerDragRef = useRef<{ pointerId: number; draggedId: string; overId: string } | null>(null);
  const justDraggedRef = useRef(false);

  const moveByIndex = (fromIdx: number, toIdx: number) => {
    if (!onReorder || toIdx < 0 || toIdx >= tasks.length || fromIdx === toIdx) return;
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

  const handleGripPointerDown = (e: React.PointerEvent<HTMLSpanElement>, taskId: string) => {
    if (!onReorder) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointerDragRef.current = { pointerId: e.pointerId, draggedId: taskId, overId: taskId };
    setDraggedId(taskId);
    setDragOverId(taskId);
    if ('vibrate' in navigator) {
      try { navigator.vibrate(15); } catch {}
    }
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const scrollEl = listScrollRef.current;
    if (scrollEl) {
      const rect = scrollEl.getBoundingClientRect();
      const edgeThreshold = 36;
      if (e.clientY < rect.top + edgeThreshold) {
        scrollEl.scrollTop -= 10;
      } else if (e.clientY > rect.bottom - edgeThreshold) {
        scrollEl.scrollTop += 10;
      }
    }

    const hitEl = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-task-id]');
    const targetId = hitEl?.dataset.taskId;
    if (targetId && targetId !== drag.overId) {
      drag.overId = targetId;
      setDragOverId(targetId);
    }
  };

  const handleGripPointerEnd = (e: React.PointerEvent<HTMLSpanElement>, commitReorder: boolean) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (commitReorder && drag.overId && drag.overId !== drag.draggedId) {
      const fromIdx = tasks.findIndex((t) => t.id === drag.draggedId);
      const toIdx = tasks.findIndex((t) => t.id === drag.overId);
      if (fromIdx !== -1 && toIdx !== -1) {
        moveByIndex(fromIdx, toIdx);
      }
    }

    pointerDragRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 150);
  };

  return (
    <section
      aria-label="Ordered tasks"
      className="flex-1 min-h-0 bg-slate-900/45 border border-slate-800/70 rounded-2xl p-2 sm:p-2.5 flex flex-col overflow-hidden backdrop-blur-xs"
    >
      <div ref={listScrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-4">
            No tasks queued.
          </p>
        ) : (
          tasks.map((task, idx) => {
            const isExpanded = expandedTaskId === task.id;
            const isDragged = draggedId === task.id;
            const isDropTarget = dragOverId === task.id && draggedId !== task.id;

            return (
              <div
                key={task.id}
                data-task-id={task.id}
                draggable={Boolean(onReorder)}
                onDragStart={(e) => {
                  if (!onReorder) return;
                  setDraggedId(task.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', task.id);
                }}
                onDragOver={(e) => {
                  if (!onReorder) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== task.id) setDragOverId(task.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === task.id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  if (!onReorder) return;
                  e.preventDefault();
                  handleDrop(task.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!justDraggedRef.current) {
                    setExpandedTaskId(isExpanded ? null : task.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedTaskId(isExpanded ? null : task.id);
                  }
                }}
                title={isExpanded ? 'Click to collapse' : 'Click to view full task'}
                className={`group flex items-start gap-1.5 px-2 py-1.5 rounded-xl border transition cursor-pointer select-none ${
                  isDropTarget
                    ? 'border-purple-400 bg-purple-950/40'
                    : isExpanded
                    ? 'border-purple-500/45 bg-purple-950/25'
                    : 'border-slate-800/60 bg-slate-950/35 hover:bg-slate-900/60 hover:border-slate-700/70'
                } ${isDragged ? 'opacity-45' : ''}`}
              >
                {onReorder && (
                  <span
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => handleGripPointerDown(e, task.id)}
                    onPointerMove={handleGripPointerMove}
                    onPointerUp={(e) => handleGripPointerEnd(e, true)}
                    onPointerCancel={(e) => handleGripPointerEnd(e, false)}
                    className="mt-0.5 inline-flex items-center justify-center p-1 -m-0.5 text-slate-500 hover:text-purple-400 touch-none cursor-grab active:cursor-grabbing shrink-0 select-none"
                    title="Drag to reorder"
                    aria-label={`Drag ${task.title} to reorder`}
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>
                )}

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
