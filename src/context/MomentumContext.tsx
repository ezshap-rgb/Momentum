import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  MomentumBoardData,
  AppSettings,
  QuickJob,
  QuickJobDuration,
  Responsibility,
  Project,
  Habit,
  CalendarEvent,
  PanelStates,
  PanelLevel,
  GeminiParsedData,
  ResponsibilityStatus,
  ProjectStatus,
  LayoutMode,
} from '../types';
import { soundService } from '../services/soundService';
import {
  loadSettingsFromStorage,
  saveSettingsToStorage,
  subscribeToBoardData,
  persistBoardData,
  DEFAULT_INITIAL_DATA,
  DEFAULT_SETTINGS,
} from '../services/storageService';

interface MomentumContextType {
  boardData: MomentumBoardData;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleTheme: () => void;
  layoutMode: LayoutMode;
  toggleLayoutMode: () => void;
  // Panel Levels
  panelStates: PanelStates;
  setPanelLevel: (panel: keyof Omit<PanelStates, 'calendar'>, level: PanelLevel) => void;
  cyclePanelLevel: (panel: keyof Omit<PanelStates, 'calendar'>) => void;
  setCalendarView: (view: 'hidden' | 'week' | 'month') => void;
  // Quick jobs (1m, 5m, 15m)
  addQuickJob: (title: string, duration?: QuickJobDuration, due?: string | null) => void;
  toggleQuickJob: (id: string) => void;
  deleteQuickJob: (id: string) => void;
  // Responsibilities
  addResponsibility: (title: string, initialNextStep: string, due?: string | null) => void;
  advanceResponsibilityStep: (id: string) => void;
  regressResponsibilityStep: (id: string) => void;
  addStepToResponsibility: (id: string, stepText: string) => void;
  updateResponsibilityDue: (id: string, due: string | null) => void;
  setResponsibilityStatus: (id: string, status: ResponsibilityStatus) => void;
  deleteResponsibility: (id: string) => void;
  // Projects
  addProject: (name: string, current_position: string, next_step: string) => void;
  updateProjectProgress: (
    id: string,
    note: string,
    newNextStep?: string | null,
    newPosition?: string | null,
    newStatus?: ProjectStatus
  ) => void;
  setProjectStatus: (id: string, status: ProjectStatus) => void;
  setFocusProject: (id: string | null) => void;
  deleteProject: (id: string) => void;
  // Habits
  toggleHabitDate: (id: string, dateStr: string) => void;
  setHabitDuration: (id: string, dateStr: string, minutes: number) => void;
  addHabit: (name: string, type: 'boolean' | 'duration_min', target: number, nextDue?: string) => void;
  deleteHabit: (id: string) => void;
  // Calendar Events
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (id: string) => void;
  // Universal AI ingestion
  applyGeminiParsedData: (data: GeminiParsedData) => void;
}

const MomentumContext = createContext<MomentumContextType | undefined>(undefined);

export const MomentumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettingsFromStorage);
  const [boardData, setBoardData] = useState<MomentumBoardData>(DEFAULT_INITIAL_DATA);

  // Panel state levels: Default all 4 panels in 'compact' mode so everything fits without scrolling!
  const [panelStates, setPanelStates] = useState<PanelStates>({
    quick_jobs: 'compact',
    responsibilities: 'compact',
    projects: 'compact',
    habits: 'compact',
    calendar: 'hidden', // default to no calendar, opened with Calendar button
  });

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return (localStorage.getItem('momentum_layout_mode') as LayoutMode) || 'cockpit';
  });

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'cockpit' ? 'widget' : 'cockpit';
      localStorage.setItem('momentum_layout_mode', next);
      return next;
    });
  }, []);

  // Sync HTML dark class with settings.theme
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  // Sync / Subscription setup
  useEffect(() => {
    const unsubscribe = subscribeToBoardData(settings, (newData) => {
      setBoardData(newData);
    });
    return () => unsubscribe();
  }, [settings.useCloudSync, settings.firebaseConfig, settings.userBoardId]);

  const updateBoard = useCallback(
    (updater: (prev: MomentumBoardData) => MomentumBoardData) => {
      setBoardData((prev) => {
        const next = updater(prev);
        persistBoardData(next, settings);
        return next;
      });
    },
    [settings]
  );

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveSettingsToStorage(merged);
      return merged;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({
      theme: settings.theme === 'dark' ? 'light' : 'dark',
    });
  }, [settings.theme, updateSettings]);

  // Panel level management
  const setPanelLevel = useCallback(
    (panel: keyof Omit<PanelStates, 'calendar'>, level: PanelLevel) => {
      setPanelStates((prev) => ({
        ...prev,
        [panel]: level,
      }));
    },
    []
  );

  const cyclePanelLevel = useCallback((panel: keyof Omit<PanelStates, 'calendar'>) => {
    setPanelStates((prev) => {
      const current = prev[panel];
      const nextLevel: PanelLevel =
        current === 'collapsed'
          ? 'compact'
          : current === 'compact'
          ? 'expanded'
          : 'collapsed';
      return { ...prev, [panel]: nextLevel };
    });
  }, []);

  const setCalendarView = useCallback((view: 'hidden' | 'week' | 'month') => {
    setPanelStates((prev) => ({
      ...prev,
      calendar: view,
    }));
  }, []);

  // Quick Jobs
  const addQuickJob = useCallback(
    (title: string, duration?: QuickJobDuration, due?: string | null) => {
      if (!title.trim()) return;
      const newJob: QuickJob = {
        id: `qj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        duration: duration || '5m',
        due: due || null,
        done: false,
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({
        ...prev,
        quick_jobs: [newJob, ...prev.quick_jobs],
      }));
    },
    [updateBoard]
  );

  const toggleQuickJob = useCallback(
    (id: string) => {
      updateBoard((prev) => {
        const target = prev.quick_jobs.find((j) => j.id === id);
        if (target && !target.done) {
          soundService.playSuccessChime();
        }
        return {
          ...prev,
          quick_jobs: prev.quick_jobs.map((j) =>
            j.id === id ? { ...j, done: !j.done } : j
          ),
        };
      });
    },
    [updateBoard]
  );

  const deleteQuickJob = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        quick_jobs: prev.quick_jobs.filter((j) => j.id !== id),
      }));
    },
    [updateBoard]
  );

  // Responsibilities
  const addResponsibility = useCallback(
    (title: string, initialNextStep: string, due?: string | null) => {
      if (!title.trim()) return;
      const newResp: Responsibility = {
        id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        steps: initialNextStep.trim() ? [initialNextStep.trim()] : ['First actionable step'],
        current_step_index: 0,
        due: due || null,
        status: 'active',
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({
        ...prev,
        responsibilities: [newResp, ...prev.responsibilities],
      }));
    },
    [updateBoard]
  );

  const advanceResponsibilityStep = useCallback(
    (id: string) => {
      soundService.playSuccessChime();
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) => {
          if (r.id !== id) return r;
          const nextIndex = r.current_step_index + 1;
          const isDone = nextIndex >= r.steps.length;
          return {
            ...r,
            current_step_index: nextIndex,
            status: isDone ? 'done' : r.status,
          };
        }),
      }));
    },
    [updateBoard]
  );

  const regressResponsibilityStep = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) => {
          if (r.id !== id) return r;
          const prevIndex = Math.max(0, r.current_step_index - 1);
          return {
            ...r,
            current_step_index: prevIndex,
            status: 'active',
          };
        }),
      }));
    },
    [updateBoard]
  );

  const addStepToResponsibility = useCallback(
    (id: string, stepText: string) => {
      if (!stepText.trim()) return;
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            steps: [...r.steps, stepText.trim()],
            status: r.status === 'done' ? 'active' : r.status,
          };
        }),
      }));
    },
    [updateBoard]
  );

  const updateResponsibilityDue = useCallback(
    (id: string, due: string | null) => {
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) =>
          r.id === id ? { ...r, due } : r
        ),
      }));
    },
    [updateBoard]
  );

  const setResponsibilityStatus = useCallback(
    (id: string, status: ResponsibilityStatus) => {
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) =>
          r.id === id ? { ...r, status } : r
        ),
      }));
    },
    [updateBoard]
  );

  const deleteResponsibility = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.filter((r) => r.id !== id),
      }));
    },
    [updateBoard]
  );

  // Projects
  const addProject = useCallback(
    (name: string, current_position: string, next_step: string) => {
      if (!name.trim()) return;
      const newProj: Project = {
        id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        status: 'moving',
        current_position: current_position.trim() || 'Project started.',
        next_step: next_step.trim() || 'Define first milestone.',
        last_updated: Date.now(),
        review_interval_days: 7,
        history: [
          {
            timestamp: Date.now(),
            note: current_position.trim() || 'Project initiated.',
            next_step: next_step.trim() || 'Define first milestone.',
          },
        ],
      };
      updateBoard((prev) => ({
        ...prev,
        projects: [newProj, ...prev.projects],
      }));
    },
    [updateBoard]
  );

  const updateProjectProgress = useCallback(
    (
      id: string,
      note: string,
      newNextStep?: string | null,
      newPosition?: string | null,
      newStatus?: ProjectStatus
    ) => {
      updateBoard((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== id) return p;
          const nextStepVal =
            newNextStep !== undefined && newNextStep !== null && newNextStep.trim() !== ''
              ? newNextStep.trim()
              : p.next_step;
          const currentPosVal =
            newPosition !== undefined && newPosition !== null && newPosition.trim() !== ''
              ? newPosition.trim()
              : note.trim()
              ? note.trim()
              : p.current_position;

          const historyEntry = note.trim()
            ? [{ timestamp: Date.now(), note: note.trim(), next_step: nextStepVal }]
            : [];

          return {
            ...p,
            current_position: currentPosVal,
            next_step: nextStepVal,
            last_updated: Date.now(),
            status: newStatus || 'moving',
            history: [...p.history, ...historyEntry],
          };
        }),
      }));
    },
    [updateBoard]
  );

  const setProjectStatus = useCallback(
    (id: string, status: ProjectStatus) => {
      updateBoard((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id ? { ...p, status, last_updated: Date.now() } : p
        ),
      }));
    },
    [updateBoard]
  );

  const setFocusProject = useCallback(
    (id: string | null) => {
      updateBoard((prev) => ({
        ...prev,
        current_focus_project_id: id,
      }));
    },
    [updateBoard]
  );

  const deleteProject = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        current_focus_project_id:
          prev.current_focus_project_id === id ? null : prev.current_focus_project_id,
      }));
    },
    [updateBoard]
  );

  // Habits
  const toggleHabitDate = useCallback(
    (id: string, dateStr: string) => {
      updateBoard((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== id) return h;
          const currentVal = !!h.log[dateStr];
          return {
            ...h,
            log: {
              ...h.log,
              [dateStr]: !currentVal,
            },
          };
        }),
      }));
    },
    [updateBoard]
  );

  const setHabitDuration = useCallback(
    (id: string, dateStr: string, minutes: number) => {
      updateBoard((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== id) return h;
          return {
            ...h,
            log: {
              ...h.log,
              [dateStr]: Math.max(0, minutes),
            },
          };
        }),
      }));
    },
    [updateBoard]
  );

  const addHabit = useCallback(
    (name: string, type: 'boolean' | 'duration_min', target: number, nextDue?: string) => {
      if (!name.trim()) return;
      const newHabit: Habit = {
        id: `hab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        type,
        target,
        next_due: nextDue || 'Today',
        log: {},
      };
      updateBoard((prev) => ({
        ...prev,
        habits: [...prev.habits, newHabit],
      }));
    },
    [updateBoard]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== id),
      }));
    },
    [updateBoard]
  );

  // Calendar
  const addCalendarEvent = useCallback(
    (event: Omit<CalendarEvent, 'id'>) => {
      const newEvt: CalendarEvent = {
        ...event,
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      };
      updateBoard((prev) => ({
        ...prev,
        calendar_events: [...(prev.calendar_events || []), newEvt],
      }));
    },
    [updateBoard]
  );

  const deleteCalendarEvent = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        calendar_events: (prev.calendar_events || []).filter((e) => e.id !== id),
      }));
    },
    [updateBoard]
  );

  // Apply parsed Gemini extraction
  const applyGeminiParsedData = useCallback(
    (data: GeminiParsedData) => {
      const todayStr = new Date().toISOString().split('T')[0];

      updateBoard((prev) => {
        let updatedQuickJobs = [...prev.quick_jobs];
        let updatedResponsibilities = [...prev.responsibilities];
        let updatedProjects = [...prev.projects];
        let updatedHabits = [...prev.habits];

        if (data.quick_jobs && data.quick_jobs.length > 0) {
          const newJobs: QuickJob[] = data.quick_jobs.map((item, idx) => ({
            id: `qj-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            title: item.title,
            duration: item.duration || '5m',
            due: item.due || null,
            done: false,
            createdAt: Date.now(),
          }));
          updatedQuickJobs = [...newJobs, ...updatedQuickJobs];
        }

        if (data.responsibilities && data.responsibilities.length > 0) {
          data.responsibilities.forEach((item, idx) => {
            const existingIdx = updatedResponsibilities.findIndex(
              (r) => r.title.toLowerCase() === item.title.toLowerCase()
            );
            if (existingIdx >= 0) {
              const resp = updatedResponsibilities[existingIdx];
              updatedResponsibilities[existingIdx] = {
                ...resp,
                steps: [...resp.steps, item.next_action],
                due: item.due || resp.due,
                status: 'active',
              };
            } else {
              updatedResponsibilities.unshift({
                id: `resp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                title: item.title,
                steps: [item.next_action],
                current_step_index: 0,
                due: item.due || null,
                status: 'active',
                createdAt: Date.now(),
              });
            }
          });
        }

        if (data.project_updates && data.project_updates.length > 0) {
          data.project_updates.forEach((item, idx) => {
            const existingIdx = updatedProjects.findIndex(
              (p) =>
                p.name.toLowerCase().includes(item.project_name.toLowerCase()) ||
                item.project_name.toLowerCase().includes(p.name.toLowerCase())
            );

            if (existingIdx >= 0) {
              const p = updatedProjects[existingIdx];
              const nextStep = item.new_next_step || p.next_step;
              updatedProjects[existingIdx] = {
                ...p,
                current_position: item.update_note || p.current_position,
                next_step: nextStep,
                last_updated: Date.now(),
                status: 'moving',
                history: [
                  ...p.history,
                  {
                    timestamp: Date.now(),
                    note: item.update_note,
                    next_step: nextStep,
                  },
                ],
              };
            } else {
              updatedProjects.unshift({
                id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                name: item.project_name,
                status: 'moving',
                current_position: item.update_note || 'Initiated via brain dump.',
                next_step: item.new_next_step || 'Define first action.',
                last_updated: Date.now(),
                review_interval_days: 7,
                history: [
                  {
                    timestamp: Date.now(),
                    note: item.update_note || 'Initiated via voice ingestion.',
                    next_step: item.new_next_step || 'Define first action.',
                  },
                ],
              });
            }
          });
        }

        if (data.habits && data.habits.length > 0) {
          data.habits.forEach((item) => {
            const existingIdx = updatedHabits.findIndex(
              (h) =>
                h.name.toLowerCase().includes(item.name.toLowerCase()) ||
                item.name.toLowerCase().includes(h.name.toLowerCase())
            );
            if (existingIdx >= 0) {
              const h = updatedHabits[existingIdx];
              updatedHabits[existingIdx] = {
                ...h,
                log: {
                  ...h.log,
                  [todayStr]: item.value,
                },
              };
            }
          });
        }

        return {
          ...prev,
          quick_jobs: updatedQuickJobs,
          responsibilities: updatedResponsibilities,
          projects: updatedProjects,
          habits: updatedHabits,
        };
      });
    },
    [updateBoard]
  );

  return (
    <MomentumContext.Provider
      value={{
        boardData,
        settings,
        updateSettings,
        toggleTheme,
        layoutMode,
        toggleLayoutMode,
        panelStates,
        setPanelLevel,
        cyclePanelLevel,
        setCalendarView,
        addQuickJob,
        toggleQuickJob,
        deleteQuickJob,
        addResponsibility,
        advanceResponsibilityStep,
        regressResponsibilityStep,
        addStepToResponsibility,
        updateResponsibilityDue,
        setResponsibilityStatus,
        deleteResponsibility,
        addProject,
        updateProjectProgress,
        setProjectStatus,
        setFocusProject,
        deleteProject,
        toggleHabitDate,
        setHabitDuration,
        addHabit,
        deleteHabit,
        addCalendarEvent,
        deleteCalendarEvent,
        applyGeminiParsedData,
      }}
    >
      {children}
    </MomentumContext.Provider>
  );
};

export const useMomentum = () => {
  const context = useContext(MomentumContext);
  if (!context) {
    throw new Error('useMomentum must be used within a MomentumProvider');
  }
  return context;
};
