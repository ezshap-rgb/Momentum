export type QuickJobDuration = '1m' | '5m' | '15m';

export interface QuickJob {
  id: string;
  title: string;
  due?: string | null;
  duration?: QuickJobDuration;
  done: boolean;
  createdAt: number;
  googleTaskId?: string;
}

export type ResponsibilityStatus = 'active' | 'waiting' | 'paused' | 'done';

export interface Responsibility {
  id: string;
  title: string;
  steps: string[];
  current_step_index: number;
  due?: string | null;
  status: ResponsibilityStatus;
  createdAt: number;
  googleTaskId?: string;
}

export type ProjectStatus = 'moving' | 'attention_needed' | 'waiting' | 'parked' | 'completed';

export interface ProjectHistoryEntry {
  timestamp: number;
  note: string;
  next_step: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  current_position: string;
  next_step: string;
  last_updated: number; // ms timestamp
  review_interval_days: number; // default 7
  history: ProjectHistoryEntry[];
  googleTaskId?: string;
}

export type HabitType = 'boolean' | 'duration_min';

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  target: number; // 1 for boolean, minutes for duration
  next_due?: string | null; // e.g. "Tonight by 11:30 PM", "Daily 8:00 AM"
  log: Record<string, boolean | number>; // YYYY-MM-DD -> value
  googleTaskId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM
  category?: 'job' | 'responsibility' | 'project' | 'calendar';
}

export type PanelLevel = 'collapsed' | 'compact' | 'expanded';

export interface PanelStates {
  quick_jobs: PanelLevel;
  responsibilities: PanelLevel;
  projects: PanelLevel;
  habits: PanelLevel;
  calendar: 'hidden' | 'week' | 'month';
}

export interface MomentumBoardData {
  quick_jobs: QuickJob[];
  responsibilities: Responsibility[];
  projects: Project[];
  habits: Habit[];
  calendar_events?: CalendarEvent[];
  current_focus_project_id?: string | null;
}

export interface FirebaseConfigSettings {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  geminiApiKey: string;
  geminiModel: string;
  googleCalendarEmbedUrl?: string; // Optional Google Calendar embed URL
  googleTasksClientId?: string;    // Google OAuth 2.0 Client ID for Google Tasks
  googleTasksConnected?: boolean;
  googleTasksAutoSync?: boolean;
  googleTasksLastSync?: number;
  firebaseConfig?: FirebaseConfigSettings | null;
  useCloudSync: boolean;
  userBoardId: string;
}

export interface GeminiParsedData {
  quick_jobs?: Array<{ title: string; due?: string | null; duration?: QuickJobDuration }>;
  responsibilities?: Array<{ title: string; next_action: string; due?: string | null }>;
  project_updates?: Array<{ project_name: string; update_note: string; new_next_step?: string | null }>;
  habits?: Array<{ name: string; value: boolean | number }>;
}
export type LayoutMode = 'cockpit' | 'widget';
