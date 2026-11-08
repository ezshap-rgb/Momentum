import React, { useState } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import {
  Layers,
  ArrowRight,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';

export const BiggerJobsPanel: React.FC = () => {
  const {
    boardData,
    advanceResponsibilityStep,
    regressResponsibilityStep,
    addStepToResponsibility,
    addResponsibility,
    deleteResponsibility,
    panelStates,
    cyclePanelLevel,
  } = useMomentum();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newTiming, setNewTiming] = useState('');
  const [expandedRespId, setExpandedRespId] = useState<string | null>(null);
  const [newStepInput, setNewStepInput] = useState('');

  const level = panelStates.responsibilities; // 'collapsed' | 'compact' | 'expanded'
  const activeResps = boardData.responsibilities.filter((r) => r.status === 'active');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addResponsibility(newTitle.trim(), newNextStep.trim() || 'First step', newTiming.trim() || null);
    setNewTitle('');
    setNewNextStep('');
    setNewTiming('');
    setIsAdding(false);
  };

  const handleAppendStep = (respId: string) => {
    if (!newStepInput.trim()) return;
    addStepToResponsibility(respId, newStepInput.trim());
    setNewStepInput('');
  };

  return (
    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col transition-all overflow-hidden">
      {/* Panel Header */}
      <div
        onClick={() => cyclePanelLevel('responsibilities')}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 transition shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
            Bigger Jobs
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            {activeResps.length}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
            (Next step + timing)
          </span>
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition"
            title="Add Responsibility"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyclePanelLevel('responsibilities')}
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
            {activeResps.length > 0
              ? `${activeResps[0].title}: Next ➔ ${activeResps[0].steps[activeResps[0].current_step_index]}`
              : 'No active bigger jobs.'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Responsibility Drawer */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-purple-400/40 space-y-2 animate-fadeIn text-xs shrink-0"
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Responsibility name (e.g. Prepare Mussar Seder)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="Immediate first step..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={newTiming}
                  onChange={(e) => setNewTiming(e.target.value)}
                  placeholder="Scheduled timing (e.g. Tuesday 2PM)..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-3 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Scrolling List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {activeResps.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No active bigger responsibilities.
              </p>
            )}

            {activeResps.map((resp) => {
              const currentStep = resp.steps[resp.current_step_index] || 'Complete';
              const totalSteps = resp.steps.length;
              const isDetailsExpanded =
                level === 'expanded' || expandedRespId === resp.id;

              return (
                <div
                  key={resp.id}
                  className="group p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-200 dark:hover:border-slate-700 transition space-y-1"
                >
                  {/* Name + Scheduled Timing Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {resp.title}
                      </span>
                      {resp.due && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{resp.due}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setExpandedRespId(
                            expandedRespId === resp.id ? null : resp.id
                          )
                        }
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-500 transition"
                        title="Click to view all steps"
                      >
                        Step {resp.current_step_index + 1}/{totalSteps}
                      </button>
                      <button
                        onClick={() => deleteResponsibility(resp.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Immediate Next Step */}
                  <div className="flex items-center justify-between gap-2 p-1 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-200 truncate">
                        {currentStep}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {resp.current_step_index > 0 && (
                        <button
                          onClick={() => regressResponsibilityStep(resp.id)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Previous step"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => advanceResponsibilityStep(resp.id)}
                        className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <span>Done</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* ALL STEPS AHEAD */}
                  {isDetailsExpanded && (
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-850 space-y-1 text-xs">
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-300 text-[11px]">
                        {resp.steps.map((st, sIdx) => (
                          <li
                            key={sIdx}
                            className={`${
                              sIdx === resp.current_step_index
                                ? 'font-bold text-purple-600 dark:text-purple-300'
                                : sIdx < resp.current_step_index
                                ? 'line-through opacity-50'
                                : 'opacity-80'
                            }`}
                          >
                            {st}
                          </li>
                        ))}
                      </ol>

                      <div className="flex items-center gap-1 pt-1">
                        <input
                          type="text"
                          value={newStepInput}
                          onChange={(e) => setNewStepInput(e.target.value)}
                          placeholder="Add next step..."
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200"
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleAppendStep(resp.id)
                          }
                        />
                        <button
                          onClick={() => handleAppendStep(resp.id)}
                          className="px-2 py-0.5 bg-purple-600 text-white rounded text-[11px]"
                        >
                          Add
                        </button>
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
