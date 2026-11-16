# Architecture & Technical Implementation

## 1. Technical Stack & Foundation
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS 3.
* **Storage & Offline:** IndexedDB (`focus_db`), LocalStorage, Web Storage API.
* **Backend Doorway:** Google Apps Script Web App (`apps-script/Code.gs`) deployed as execution endpoint.
* **Cloud Storage:** Google Sheets (Tabs: `Events`, `Actions`, `Habits`, `Movement`, `Settings`, `ParseLog`), Google Drive (`Focus Backups`).
* **External Services:** Google Tasks API v1, Google Calendar API.
* **Device APIs:** Screen Wake Lock API, Web Audio API (synthesized chime), Navigator Vibration API, Service Worker Cache API.

## 2. System Architecture & ASCII Data Flow

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (PWA / BROWSER)                           |
|                                                                                   |
|  [DO Mode] <---------> [Plan Mode] <---------> [Cockpit Task View]               |
|       |                     |                          |                          |
|       v                     v                          v                          |
|  [Serving Engine]    [Action Pool]             [Momentum Context]                 |
|  (focusAlgorithm.ts) (focusServing.ts)         (MomentumContext.tsx)              |
|       |                     |                          |                          |
|       +---------------------+--------------------------+                          |
|                             |                                                     |
|                             v                                                     |
|                 [Focus Data Layer (Local First)]                                  |
|                 - IndexedDB: `outbox` (Queue) & `cache` (Sheets)                  |
|                 - LocalStorage: Settings, Credentials, Session State              |
+-----------------------------+-----------------------------------------------------+
                              | Background Non-Blocking HTTP Batch Sync
                              | (text/plain;charset=utf-8 to bypass CORS preflight)
                              v
+-----------------------------------------------------------------------------------+
|                         BACKEND (GOOGLE APPS SCRIPT DOORWAY)                      |
|                                                                                   |
|  doPost(e)                                    doGet(e)                            |
|    |                                             |                                |
|    +--> LockService (Write Lock)                 +--> Read Sheet Tab              |
|    +--> Deduplicate `event_id`                   +--> Return JSON Cache           |
|    +--> Append-only batch write to `Events` tab                                   |
|    +--> Fold completions to `Actions` tab & Google Tasks API                      |
|                                                                                   |
|  Scheduled Automated Triggers:                                                    |
|    - 5-Min Trigger: Scheduled Ingestion from Google Tasks & Event Folding         |
|    - Daily 06:00 AM Trigger: Schedule Google Calendar Nudges                      |
|    - Weekly Sunday 02:00 AM Trigger: Backup Spreadsheet to Drive (keep 8)         |
+-----------------------------+-----------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------------------------+
|                     GOOGLE WORKSPACE STORAGE & CLOUD SERVICES                     |
|                                                                                   |
|  - Google Spreadsheet: Events (Immutable), Actions, Habits, Movement, Settings   |
|  - Google Tasks API: 4 Ingested Lists (Quick, Projects, Scheduled, Habits)       |
|  - Google Calendar API: Dedicated 'Focus' Calendar (Max 3 nudges/day)            |
|  - Google Drive: 'Focus Backups' Folder (Retains 8 weekly snapshots)              |
+-----------------------------------------------------------------------------------+
```

## 3. Directory Structure

```
Momentum/
├── apps-script/
│   └── Code.gs                  # Google Apps Script doorway, ingestion, folding & nudges
├── public/
│   ├── manifest.json            # PWA manifest with DO shortcut
│   └── sw.js                    # Service worker offline caching
├── src/
│   ├── App.tsx                  # Root switcher (DO mode, Plan mode, Task view)
│   ├── components/
│   │   ├── DoMainScreen.tsx     # DO loop, ignition, offer cards, timer, parking lot
│   │   ├── PlanModeScreen.tsx   # Responsive desktop sidebar / mobile tabs review
│   │   ├── DayMovementBenchModal.tsx # Watchmaker's bench parts & module progress
│   │   ├── WatchCollectionModal.tsx  # Collector's vault of finished timepieces
│   │   ├── FridaySummaryModal.tsx    # Friday morning calm week summary
│   │   ├── ExperimentsModal.tsx      # 4-week A/B serving experiment analytics
│   │   ├── SetupGuideModal.tsx       # Battery optimization & calendar nudge checklist
│   │   ├── CandidateInspectorModal.tsx # Developer serving breakdown & candidate scores
│   │   ├── WatchPartVector.tsx       # SVG vector watch parts (screws, jewels, barrels)
│   │   ├── WatchVectorIllustration.tsx # Assembled watch case, dial, hands graphic
│   │   ├── GearTrainWidget.tsx       # Animated 7-gear train & power reserve meter
│   │   ├── SyncIndicator.tsx         # Outbox sync status & diagnostic drawer
│   │   └── Header.tsx                # Classic cockpit header & navigation
│   ├── services/
│   │   ├── focusDataLayer.ts    # IndexedDB outbox, caching, background batch sync
│   │   ├── focusAlgorithm.ts    # Serving engine, scoring, ramp, tripwires, paired pick
│   │   ├── focusServing.ts      # Action types, ignition exercises
│   │   ├── focusMovement.ts     # Watch parts, finish grades, daily module rules
│   │   ├── focusHabits.ts       # Habits state, ignition quota crediting, gear speeds
│   │   ├── focusExperiments.ts  # 4-week locked schedule & event-computed metrics
│   │   ├── focusCollection.ts   # Weekly movements, weekend polish, watch vault
│   │   └── focusWakeLock.ts     # Screen Wake Lock API & Web Audio chime
│   ├── context/
│   │   └── MomentumContext.tsx  # Task view state & undo history
│   └── index.css                # Tailwind CSS, animations, breathing DO button
├── package.json
└── vite.config.ts
```

## 4. Key Data Models

### Focus Action (`FocusAction`)
* `task_id`: Unique identifier (string).
* `title`: User task description.
* `friction`: Estimated friction level ($1$ to $5$).
* `time_bucket`: `under 5`, `5-20`, `20-60`, `over 60`.
* `importance`: `low`, `med`, `high` (+1 work point bonus).
* `due_date`: ISO date string (YYYY-MM-DD).
* `deadline_kind`: `external` (hard tripwire) | `self` | `none`.
* `category`: `quick` | `project` | `scheduled` | `habit`.
* `status`: `waiting` | `served` | `in_progress` | `done` | `snoozed` | `dropped` | `needs_setup`.

### Focus Event (`FocusEvent`)
* `event_id`: Unique collision-resistant string (`ev_<timestamp>_<random>`).
* `timestamp`: ISO-8601 string.
* `device`: `phone` | `desktop`.
* `type`: Event type (`do_press`, `action_started`, `action_completed`, `not_now`, `tap_shift`, `correction`, `mode_override`, `part_earned`, etc.).
* `payload`: Structured JSON payload.
* `schema_version`: `"1.0"`.
