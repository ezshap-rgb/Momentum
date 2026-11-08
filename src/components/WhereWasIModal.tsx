import React, { useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { useMomentum } from '../context/MomentumContext';
import { X, Clock, Compass, ArrowRight, PlusCircle, CheckCircle, AlertCircle, History } from 'lucide-react';

interface WhereWasIModalProps {
  project: Project;
  onClose: () => void;
}

export const WhereWasIModal: React.FC<WhereWasIModalProps> = ({ project, onClose }) => {
  const { updateProjectProgress, setFocusProject, boardData } = useMomentum();
  const [newNote, setNewNote] = useState('');
  const [newNextStep, setNewNextStep] = useState(project.next_step);
  const [newStatus, setNewStatus] = useState<ProjectStatus>(project.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCurrentFocus = boardData.current_focus_project_id === project.id;

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() && newNextStep === project.next_step && newStatus === project.status) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    updateProjectProgress(
      project.id,
      newNote.trim(),
      newNextStep.trim(),
      newNote.trim() || project.current_position,
      newStatus
    );
    setIsSubmitting(false);
    onClose();
  };

  const daysSinceUpdate = Math.floor((Date.now() - project.last_updated) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{project.name}</h3>
                {isCurrentFocus ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                    Current Focus
                  </span>
                ) : (
                  <button
                    onClick={() => setFocusProject(project.id)}
                    className="text-[10px] font-medium text-slate-400 hover:text-amber-500 transition"
                  >
                    ★ Focus
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Updated {daysSinceUpdate === 0 ? 'today' : `${daysSinceUpdate} days ago`}
                </span>
                <span>•</span>
                <span className="capitalize">{project.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Current Position (Where was I?) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <History className="w-3.5 h-3.5 text-purple-500" />
              <span>Where Holding (Current Context)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {project.current_position}
            </p>
          </div>

          {/* Current Next Step */}
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
              <span>Immediate Next Step</span>
            </div>
            <p className="text-xs font-semibold text-purple-950 dark:text-purple-100">
              {project.next_step}
            </p>
          </div>

          {/* Chronological History Log */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Continuity Trail ({project.history.length} updates)
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {[...project.history].reverse().map((entry, index) => {
                const dateStr = new Date(entry.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>{dateStr}</span>
                      {entry.next_step && (
                        <span className="text-purple-600 dark:text-purple-400 truncate max-w-[200px]">
                          Target: {entry.next_step}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px]">{entry.note}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Record an Update Form */}
          <form onSubmit={handleSaveUpdate} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Record Update & Revise Next Step</span>
            </div>

            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="What did you just work on or discover?..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 h-14 resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newNextStep}
                onChange={(e) => setNewNextStep(e.target.value)}
                placeholder="New next physical step..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              />

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="moving">Moving (Active progress)</option>
                <option value="attention_needed">Attention Needed</option>
                <option value="waiting">Waiting on parts/feedback</option>
                <option value="parked">Parked for later</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition"
              >
                Save Continuity
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
