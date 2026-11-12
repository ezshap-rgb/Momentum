---
name: momentum
description: >-
  ADHD-optimized productivity cockpit data entry and board manager.
  Use whenever the user wants to add tasks, update jobs, log project progress,
  check habits, or do a voice/text brain dump into their Momentum cockpit.
---

# Momentum Productivity Cockpit Skill

This skill allows the agent to directly inspect, update, and manage the user's Momentum ADHD Productivity Cockpit.

## Board Storage Architecture
The board's live state is defined in:
`c:\Users\ezsha\Github\Momentum\src\services\storageService.ts` (specifically `DEFAULT_INITIAL_DATA` and persistence helpers).

When this file is modified, Vite's Hot Module Replacement (HMR) automatically pushes updates in real-time to the user's active desktop window and widget without needing a reload.

## The 4 Core Activity Types

### 1. Tasks (`quick_jobs`)
Bite-sized, 1-sitting tasks with clear speed markings placed at the **END** of the entry:
- Duration: `'1m' | '5m' | '15m'` (default `5m`)
- Google Tasks title format: `Task: Call dentist [5m]` (Timing label placed at the end so it does not clutter mobile widgets and notification previews).
- Schema: `{ id: string, title: string, duration: '1m' | '5m' | '15m', done: boolean, createdAt: number }`

### 2. Jobs (`responsibilities`)
Multi-step commitments where only the single immediate next action is shown on the dashboard:
- Google Tasks title format: `Job: Title -> Step 1 action`
- Schema:
  ```ts
  {
    id: string,
    title: string,
    steps: string[],
    current_step_index: number,
    due: string | null, // e.g. "Tuesday 2:00 PM"
    status: 'active' | 'waiting' | 'paused' | 'done',
    createdAt: number
  }
  ```

### 3. Ongoing Creative Projects (`projects`)
Long-term creative or engineering initiatives that need context continuity ("Where Was I?"):
- Schema:
  ```ts
  {
    id: string,
    name: string,
    status: 'moving' | 'attention_needed' | 'waiting' | 'parked' | 'completed',
    current_position: string, // 1-sentence "Where holding"
    next_step: string,        // Immediate physical action
    upcoming_steps?: string[], // Subsequent planned steps (e.g. ['Step 2...', 'Step 3...'])
    last_updated: number,
    review_interval_days: number,
    history: Array<{ timestamp: number, note: string, next_step: string }>
  }
  ```

### 4. Habits & Daily Rhythms (`habits`)
Guilt-free routines tracked with next upcoming cadence/timing:
- Schema:
  ```ts
  {
    id: string,
    name: string,
    type: 'boolean' | 'duration_min',
    target: number,
    next_due: string | null, // e.g. "Daily Morning", "Daily Night", "Today, 5:30 PM"
    log: Record<string, boolean | number> // YYYY-MM-DD -> value
  }
  ```

## Google Tasks & Gemini Voice/Chat Ingestion Keywords
The cockpit auto-syncs with 4 dedicated Google Task lists: **Tasks**, **Jobs**, **Projects**, and **Habits**.

When creating tasks in Google Tasks via voice, Gemini, or chat:
- **Task** (Quick Task):
  - Format: `Task: Task name [5m]` (or `[1m]`, `[5m]`, `[15m]`, or untagged default). Note: `[5m]` is placed at the end so it doesn't crowd out the task name in widgets.
- **Job** (Bigger Responsibility):
  - Format: `Job: Title -> Step 1 action` (or `Bigger Job: ...`)
  - Notes (optional additional steps):
    ```
    Step 2: Subsequent action
    Step 3: Following action
    ```
- **Project**:
  - Format: `Project: Project Name | Next: Immediate first physical action`
  - Notes:
    ```
    Where holding: Context or initial status
    Step 2: Second planned action
    Step 3: Third planned action
    ```
- **Habit**:
  - Format: `Habit: Habit Name`

## How to Apply User Requests
When the user gives natural language input (e.g. "Add a 5m task to call Sam", "Mark morning push-ups done", "Update Sphere It: printed ring, next step test fit"):
1. Parse the input into the corresponding bucket(s).
2. Read and atomically update `DEFAULT_INITIAL_DATA` in `src/services/storageService.ts`.
3. Confirm the update back to the user with a concise, encouraging checkmark confirmation.

