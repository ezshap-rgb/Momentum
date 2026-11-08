import React, { useState } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import { Project, ProjectStatus } from '../../types';
import { WhereWasIModal } from '../WhereWasIModal';
import {
  Compass,
  ArrowRight,
  Plus,
  Trash2,
  ChevronDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const ProjectsPanel: React.FC = () => {
  const {
    boardData,
    addProject,
    deleteProject,
    panelStates,
    cyclePanelLevel,
  } = useMomentum();

  const [inspectingProject, setInspectingProject] = useState<Project | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newNextStep, setNewNextStep] = useState('');

  const level = panelStates.projects; // 'collapsed' | 'compact' | 'expanded'
  const projects = boardData.projects;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addProject(
      newName.trim(),
      newPosition.trim() || 'Started project.',
      newNextStep.trim() || 'First action step.'
    );
    setNewName('');
    setNewPosition('');
    setNewNextStep('');
    setIsAdding(false);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'moving':
        return 'bg-emerald-500';
      case 'attention_needed':
        return 'bg-amber-500';
      case 'waiting':
        return 'bg-blue-500';
      case 'parked':
        return 'bg-slate-400';
      case 'completed':
        return 'bg-purple-500';
    }
  };

  return (
    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col transition-all overflow-hidden">
      {/* Panel Header */}
      <div
        onClick={() => cyclePanelLevel('projects')}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 transition shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
            Projects Radar
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            {projects.length}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
            (Never lost/forgotten)
          </span>
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
            title="Track New Project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyclePanelLevel('projects')}
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
            {projects.length > 0
              ? projects.map((p) => p.name).join(' • ')
              : 'No projects on radar.'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Project Form */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-blue-400/40 space-y-2 animate-fadeIn text-xs shrink-0"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name (e.g. Sphere It, Filing Cabinet)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <textarea
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="Where are you holding? (1-sentence context)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 h-12 resize-none"
              />
              <input
                type="text"
                value={newNextStep}
                onChange={(e) => setNewNextStep(e.target.value)}
                placeholder="Immediate next physical step..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
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
                  disabled={!newName.trim()}
                  className="px-3 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                >
                  Save Project
                </button>
              </div>
            </form>
          )}

          {/* Scrolling List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {projects.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No active projects tracked.
              </p>
            )}

            {projects.map((project) => {
              const isDetailsExpanded =
                level === 'expanded' || expandedProjectId === project.id;
              const isFocus = boardData.current_focus_project_id === project.id;

              return (
                <div
                  key={project.id}
                  className="p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-200 dark:hover:border-slate-700 transition space-y-1"
                >
                  {/* Name Row */}
                  <div
                    onClick={() =>
                      setExpandedProjectId(
                        expandedProjectId === project.id ? null : project.id
                      )
                    }
                    className="flex items-center justify-between gap-2 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${getStatusColor(
                          project.status
                        )} shrink-0`}
                        title={`Status: ${project.status}`}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {project.name}
                      </span>
                      {isFocus && (
                        <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium shrink-0">
                          Focus
                        </span>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setInspectingProject(project)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white transition"
                        title="Open Where Was I? inspector"
                      >
                        Where Was I?
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isDetailsExpanded && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-850 space-y-1 text-xs animate-fadeIn">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-400 block text-[9px] uppercase">
                          Where Holding:
                        </strong>
                        {project.current_position}
                      </div>

                      <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-semibold text-blue-900 dark:text-blue-200 truncate">
                            {project.next_step}
                          </span>
                        </div>
                        <button
                          onClick={() => setInspectingProject(project)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                        >
                          Update &rarr;
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

      {/* Where Was I Modal */}
      {inspectingProject && (
        <WhereWasIModal
          project={inspectingProject}
          onClose={() => setInspectingProject(null)}
        />
      )}
    </div>
  );
};
