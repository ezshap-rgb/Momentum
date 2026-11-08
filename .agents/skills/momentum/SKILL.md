---
name: momentum
description: >-
  ADHD-optimized productivity cockpit data entry and board manager.
  Use whenever the user wants to add quick jobs, update responsibilities, log project progress,
  check habits, or do a voice/text brain dump into their Momentum cockpit.
---

# Momentum Productivity Cockpit Skill

This skill allows the agent to directly inspect, update, and manage the user's Momentum ADHD Productivity Cockpit.

## Board Storage Architecture
The board's live state is defined in:
`c:\Users\ezsha\Github\Momentum\src\services\storageService.ts` (specifically `DEFAULT_INITIAL_DATA` and persistence helpers).

When this file is modified, Vite's Hot Module Replacement (HMR) automatically pushes updates in real-time to the user's active desktop window and widget without needing a reload.

## The 4 Core Activity Types

### 1. Quick Jobs (`quick_jobs`)
Bite-sized, 1-sitting tasks with clear speed markings:
- Duration: `'1m' | '5m' | '15m'`
- Schema: `{ id: string, title: string, duration: '1m' | '5m' | '15m', done: boolean, createdAt: number }`

### 2. Bigger Responsibilities (`responsibilities`)
Multi-step commitments where only the single immediate next action is shown on the dashboard:
- Schema:
  ```ts
  {
    id: string,
    title: string,
    steps: string[],
    current_step_index: number,
    due: string | null, // e.g. "Tomorrow, 2:00 PM"
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
    last_updated: number,
    review_interval_days: number,
    history: Array<{ timestamp: number, note: string, next_step: string }>
  }
  ```

### 4. Habits & Daily Rhythms (`habits`)
Guilt-free routines tracked with next upcoming responsibility timing:
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

## How to Apply User Requests
When the user gives natural language input (e.g. "Add a 5m job to call Sam", "Mark morning push-ups done", "Update Sphere It: printed ring, next step test fit"):
1. Parse the input into the corresponding bucket(s).
2. Read and atomically update `DEFAULT_INITIAL_DATA` in `src/services/storageService.ts`.
3. Confirm the update back to the user with a concise, encouraging checkmark confirmation.

