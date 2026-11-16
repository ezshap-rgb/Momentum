import React, { useState } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import { Responsibility, JobRecurrence } from '../../types';
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
  Pencil,
  Check,
  X,
  RefreshCw,
  Calendar,
} from 'lucide-react';

export const BiggerJobsPanel: React.FC = () => {
  const {
    boardData,
    advanceResponsibilityStep,
    regressResponsibilityStep,
    resetResponsibilitySteps,
    addStepToResponsibility,
    addResponsibility,
    editResponsibility,
    deleteResponsibility,
    panelStates,
    cyclePanelLevel,
  } = useMomentum();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<JobRecurrence>('none');
  const [newRecurrenceDay, setNewRecurrenceDay] = useState('Tuesday');
  const [expandedRespId, setExpandedRespId] = useState<string | null>(null);
  const [newStepInput, setNewStepInput] = useState('');

  // Inline edit state
  const [editingRespId, setEditingRespId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCurrentStep, setEditCurrentStep] = useState('');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<JobRecurrence>('none');
  const [editRecurrenceDay, setEditRecurrenceDay] = useState('Tuesday');
  const [editDue, setEditDue] = useState('');

  const level = panelStates.responsibilities; // 'collapsed' | 'compact' | 'expanded'
  const activeResps = boardData.responsibilities.filter((r) => r.status === 'active');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let computedDue: string | null = null;
    const timeStr = newScheduledTime ? ` ${newScheduledTime}` : '';
    if (newRecurrence === 'weekly') {
      computedDue = `🔁 ${newRecurrenceDay}${timeStr} (Resets weekly)`;
    } else if (newScheduledDate) {
      computedDue = `${newScheduledDate}${timeStr}`;
    }

    addResponsibility(
      newTitle.trim(),
      newNextStep.trim() || 'First actionable step',
      computedDue,
      newScheduledDate || null,
      newScheduledTime || null,
      newRecurrence,
      newRecurrence === 'weekly' ? newRecurrenceDay : null
    );

    setNewTitle('');
    setNewNextStep('');
    setNewScheduledDate('');
    setNewScheduledTime('');
    setNewRecurrence('none');
    setIsAdding(false);
  };

  const applyPreset = (preset: 'today2pm' | 'tomorrow10am' | 'weeklyTue2pm' | 'weeklyFri10am') => {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().split('T')[0];

    if (preset === 'today2pm') {
      setNewScheduledDate(todayIso);
      setNewScheduledTime('14:00');
      setNewRecurrence('none');
    } else if (preset === 'tomorrow10am') {
      setNewScheduledDate(tomorrowIso);
      setNewScheduledTime('10:00');
      setNewRecurrence('none');
    } else if (preset === 'weeklyTue2pm') {
      setNewRecurrence('weekly');
      setNewRecurrenceDay('Tuesday');
      setNewScheduledTime('14:00');
    } else if (preset === 'weeklyFri10am') {
      setNewRecurrence('weekly');
      setNewRecurrenceDay('Friday');
      setNewScheduledTime('10:00');
    }
  };

  const handleAppendStep = (respId: string) => {
    if (!newStepInput.trim()) return;
    addStepToResponsibility(respId, newStepInput.trim());
    setNewStepInput('');
  };

  const startEditing = (resp: Responsibility) => {
    setEditingRespId(resp.id);
    setEditTitle(resp.title);
    setEditCurrentStep(resp.steps[resp.current_step_index] || '');
    setEditScheduledDate(resp.scheduledDate || '');
    setEditScheduledTime(resp.scheduledTime || '');
    setEditRecurrence(resp.recurrence || 'none');
    setEditRecurrenceDay(resp.recurrenceDay || 'Tuesday');
    setEditDue(resp.due || '');
  };

  const cancelEdit = () => {
    setEditingRespId(null);
    setEditTitle('');
    setEditCurrentStep('');
    setEditScheduledDate('');
    setEditScheduledTime('');
    setEditRecurrence('none');
    setEditDue('');
  };

  const saveEdit = (respId: string) => {
    if (!editTitle.trim()) return;

    let computedDue: string | null = editDue.trim() || null;
    const timeStr = editScheduledTime ? ` ${editScheduledTime}` : '';
    if (editRecurrence === 'weekly') {
      computedDue = `🔁 ${editRecurrenceDay}${timeStr} (Resets weekly)`;
    } else if (editScheduledDate) {
      computedDue = `${editScheduledDate}${timeStr}`;
    }

    editResponsibility(respId, {
      title: editTitle.trim(),
      currentStep: editCurrentStep.trim() || undefined,
      scheduledDate: editScheduledDate || null,
      scheduledTime: editScheduledTime || null,
      recurrence: editRecurrence,
      recurrenceDay: editRecurrence === 'weekly' ? editRecurrenceDay : null,
      due: computedDue,
    });
    setEditingRespId(null);
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
            Jobs
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            {activeResps.length}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
            (Scheduled & Weekly Recurring)
          </span>
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition"
            title="Add Scheduled / Weekly Job"
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
              : 'No active jobs.'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Job Drawer with Specific Time & Weekly Recurrence */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-purple-400/50 space-y-2 animate-fadeIn text-xs shrink-0 shadow-sm"
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Job name (e.g. Prepare Mussar Seder, Weekly Financial Review)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium"
                autoFocus
              />

              <input
                type="text"
                value={newNextStep}
                onChange={(e) => setNewNextStep(e.target.value)}
                placeholder="Immediate first physical step..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />

              {/* Specific Time & Recurrence Config */}
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Set Specific Time / Recurrence</span>
                  </span>

                  {/* 1-Click ADHD Presets */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyPreset('today2pm')}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 text-slate-600 dark:text-slate-300"
                    >
                      Today 2PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('weeklyTue2pm')}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold"
                    >
                      🔁 Weekly Tue 2PM
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">Cadence / Recurrence</label>
                    <select
                      value={newRecurrence}
                      onChange={(e) => setNewRecurrence(e.target.value as JobRecurrence)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                    >
                      <option value="none">One-time (specific date)</option>
                      <option value="weekly">🔁 Weekly Recurring (Resets every week)</option>
                    </select>
                  </div>

                  {newRecurrence === 'weekly' ? (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Reset Day of Week</label>
                      <select
                        value={newRecurrenceDay}
                        onChange={(e) => setNewRecurrenceDay(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                      >
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Specific Date</label>
                      <input
                        type="date"
                        value={newScheduledDate}
                        onChange={(e) => setNewScheduledDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Scheduled Time</label>
                  <input
                    type="time"
                    value={newScheduledTime}
                    onChange={(e) => setNewScheduledTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200"
                  />
                </div>
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
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Create Job
                </button>
              </div>
            </form>
          )}

          {/* Scrolling List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {activeResps.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No active jobs.
              </p>
            )}

            {activeResps.map((resp) => {
              const currentStep = resp.steps[resp.current_step_index] || 'Complete';
              const totalSteps = resp.steps.length;
              const isDetailsExpanded =
                level === 'expanded' || expandedRespId === resp.id;
              const isEditing = editingRespId === resp.id;
              const isWeekly = resp.recurrence === 'weekly';
              const isLastStep = resp.current_step_index === totalSteps - 1;

              return (
                <div
                  key={resp.id}
                  onClick={() => {
                    if (!isEditing) {
                      setExpandedRespId(expandedRespId === resp.id ? null : resp.id);
                    }
                  }}
                  className={`group p-2 rounded-xl border transition cursor-pointer select-text space-y-1.5 ${
                    isDetailsExpanded || isEditing
                      ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                  title={isEditing ? '' : isDetailsExpanded ? 'Click to collapse' : 'Click to view full entry / edit'}
                >
                  {isEditing ? (
                    /* Inline Edit Mode with Date/Time & Recurrence */
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(resp.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-2 animate-fadeIn text-xs"
                    >
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Job Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-purple-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Current Next Step</label>
                        <input
                          type="text"
                          value={editCurrentStep}
                          onChange={(e) => setEditCurrentStep(e.target.value)}
                          placeholder="Immediate next step..."
                          className="w-full bg-white dark:bg-slate-900 border border-purple-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div>
                          <label className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block mb-0.5">Cadence / Recurrence</label>
                          <select
                            value={editRecurrence}
                            onChange={(e) => setEditRecurrence(e.target.value as JobRecurrence)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px]"
                          >
                            <option value="none">One-time Job</option>
                            <option value="weekly">🔁 Weekly Recurring (Resets every week)</option>
                          </select>
                        </div>

                        {editRecurrence === 'weekly' ? (
                          <div>
                            <label className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block mb-0.5">Reset Day</label>
                            <select
                              value={editRecurrenceDay}
                              onChange={(e) => setEditRecurrenceDay(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px]"
                            >
                              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block mb-0.5">Scheduled Date</label>
                            <input
                              type="date"
                              value={editScheduledDate}
                              onChange={(e) => setEditScheduledDate(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px]"
                            />
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block mb-0.5">Scheduled Time</label>
                          <input
                            type="time"
                            value={editScheduledTime}
                            onChange={(e) => setEditScheduledTime(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            deleteResponsibility(resp.id);
                            cancelEdit();
                          }}
                          className="px-2 py-1 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1 font-medium"
                          title="Delete this job"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Job</span>
                        </button>
                        <div className="flex items-center gap-1.5">
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
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* Display Mode */
                    <>
                      {/* Name + Scheduled Timing & Recurrence Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1 flex-wrap">
                          <span
                            className={`text-xs font-bold text-slate-800 dark:text-slate-100 ${
                              isDetailsExpanded ? 'break-words whitespace-normal' : 'truncate'
                            }`}
                          >
                            {resp.title}
                          </span>

                          {/* Recurrence Badge */}
                          {isWeekly && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0 flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Weekly ({resp.recurrenceDay || 'Tue'})</span>
                            </span>
                          )}

                          {/* Scheduled Time / Due Badge */}
                          {(resp.scheduledTime || resp.due) && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{resp.due || `${resp.scheduledDate || ''} ${resp.scheduledTime || ''}`}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
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
                            type="button"
                            onClick={() => startEditing(resp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                            title="Edit Job & Schedule"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Immediate Next Step */}
                      <div className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                          <span
                            className={`text-xs font-medium text-purple-900 dark:text-purple-200 ${
                              isDetailsExpanded ? 'break-words whitespace-normal' : 'truncate'
                            }`}
                          >
                            {currentStep}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {resp.current_step_index > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => regressResponsibilityStep(resp.id)}
                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Previous step"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => resetResponsibilitySteps(resp.id)}
                                className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-600 dark:hover:text-purple-300 transition"
                                title="Reset steps to Step 1"
                              >
                                Reset
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => advanceResponsibilityStep(resp.id)}
                            className={`px-2 py-0.5 rounded text-white text-[10px] font-bold transition flex items-center gap-1 ${
                              isWeekly && isLastStep
                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xs'
                                : 'bg-purple-600 hover:bg-purple-500'
                            }`}
                            title={isWeekly && isLastStep ? 'Complete and reset for next week' : 'Done with this step'}
                          >
                            <span>{isWeekly && isLastStep ? 'Done ➔ Next Week' : 'Done'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* ALL STEPS AHEAD */}
                      {isDetailsExpanded && (
                        <div
                          className="pt-1.5 border-t border-slate-100 dark:border-slate-850 space-y-1 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-300 text-[11px]">
                            {resp.steps.map((st, sIdx) => (
                              <li
                                key={sIdx}
                                className={`break-words ${
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
                              type="button"
                              onClick={() => handleAppendStep(resp.id)}
                              className="px-2 py-0.5 bg-purple-600 text-white rounded text-[11px]"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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
