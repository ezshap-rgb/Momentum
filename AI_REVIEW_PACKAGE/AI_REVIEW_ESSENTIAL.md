# Independent AI Architecture & Code Review Package

> **INSTRUCTIONS FOR REVIEWER AI (Claude / ChatGPT):**
> Act as a Principal Software Architect, Staff Engineer, and Product Design Consultant.
> Read this entire self-contained package carefully—especially **Section 3 (Confirmed vs. Inferred Decisions & Constraints)** so you do not recommend approaches that were already intentionally rejected.
>
> Organize your critique into these four actionable sections so I can bring your feedback directly back into my coding agent (Antigravity):
> 1. **Critical Architectural & Structural Risks** (bottlenecks, state bugs, scaling limits, security gaps)
> 2. **High-Leverage Quick Wins & Bug Fixes** (specific file/function improvements with clear reasoning)
> 3. **Product & UX Alignment Gaps** (where the current implementation falls short of the stated user workflows)
> 4. **Ready-to-Run Antigravity Implementation Prompts** (2–4 self-contained prompts I can paste directly into Antigravity to execute your highest-priority recommendations safely)

---

## Part 1 — Project Overview & Product Vision

# Project Overview & Product Vision

## 1. Application Name & Identity
* **App Name:** Momentum (Focus App Action Layer) **[Documented]**
* **Identity:** An ADHD-optimized, offline-first execution cockpit and mechanical reward layer built on top of Google Tasks and Google Sheets via Google Apps Script. **[Documented]**

## 2. Core Problem Solved
Traditional productivity apps and todo lists fail adults with ADHD due to:
1. **Decision Paralysis & Task Lists:** Gazing at long lists triggers executive dysfunction and avoidance. **[Documented]**
2. **Friction Underestimation:** Underestimating the friction of starting tasks leads to procrastination. **[Documented]**
3. **Loss of Motion:** Getting kicked out of flow after completing a task requires rekindling momentum from zero. **[Documented]**
4. **Shame and Guilt:** Red overdue badges, broken streaks, and rigid calendars cause guilt and abandonment. **[Documented]**

## 3. Product Philosophy & Design Principles
* **Single Next Action, No Lists in Do Mode:** In execution (Do) mode, the user never sees a list of tasks. Exactly one action (in Assigned mode) or a choice between two actions (in Paired mode) is offered. **[Implemented]**
* **Physical Ignition to Break Inertia:** Starting a session begins with a micro physical exercise (e.g., push-ups, squats, jumping jacks) that stimulates dopamine and adrenaline, breaking paralysis before any cognitive work is faced. **[Implemented]**
* **Zero-Tap Bridge & Continuous String Flow:** Finishing ignition transitions directly into the task without friction. Completing an action immediately strings into the next action. After completing $\ge 2$ actions, a guilt-free *Done for now ✓* button appears. **[Implemented]**
* **Horological Watchmaker Rewards:** Work points assemble a tactile mechanical watch movement on the Bench. Four completed weeks craft an heirloom collectible timepiece in the vault. **[Implemented]**
* **Zero Guilt, No Red Badges, Zero Shame:** Overdue tasks are simply functional parts. Missing weekends carries zero penalty. Off days earn polish upgrades. Fresh start buttons exist everywhere. **[Implemented]**
* **Offline-First Non-Blocking Sync:** Do mode records events locally in IndexedDB in $<5$ms and syncs in background batches via an Apps Script doorway. It never waits on the network. **[Implemented]**

## 4. Current Stage & Features
* **Current Stage:** Phase 11 complete and deployed to `main` branch. **[Implemented]**
* **Completed Features:**
  * Foundations & PWA Home Screen Shortcut (Phase 1) **[Implemented]**
  * Offline IndexedDB Data Layer, Outbox Queue & Apps Script Batch Sync (Phase 2) **[Implemented]**
  * Ingestion from 4 Google Task Lists with `[FOCUS v1]` notes & Event Folding (Phase 3) **[Implemented]**
  * Do Mode Bare Loop, Ignition & 2-Task Minimum Continuous Flow (Phase 4) **[Implemented]**
  * Serving Algorithm v1 with Baseline Ramp, Fatigue Easing, Tripwires & Reserved Slot (Phase 5) **[Implemented]**
  * Mechanical Watch Movement, Finish Grades & Watchmaker Bench (Phase 6) **[Implemented]**
  * 7-Habit Morning/Evening Circuits, Ignition Quota Crediting & Gear Train (Phase 7) **[Implemented]**
  * Paired Mode ($T+1$ vs $T-1$) & 4-Week Locked Experiment Analytics (Phase 8) **[Implemented]**
  * Plan Mode (Phone Bottom Tabs, Desktop Sidebar, Action Correction Drawer) (Phase 9) **[Implemented]**
  * Offline Hardening, Google Calendar Nudges, Screen Wake Lock & Drive Backups (Phase 10) **[Implemented]**
  * Weekly Movements, Weekend Polish & Collectible Watch Vault (Phase 11) **[Implemented]**
* **Planned Later Features (Phase 12):**
  * Gemini API just-in-time task breakdown for stuck items **[Documented]**
  * Calendar-aware time fitting **[Documented]**
  * Real web push serverless sender **[Documented]**
  * Native home-screen widget **[Documented]**

---

## Part 2 — Architecture & Technical Implementation

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

---

## Part 3 — Architectural Decisions & Constraints

# Architectural Decisions & Constraints

## 1. Confirmed Architectural Decisions

### 1.1. Single DO Action Flow over Task Lists
* **Decision:** In DO mode, never show task lists, calendars, or backlog overviews. Serve exactly one task (or two in paired mode). **[Confirmed]**
* **Why:** Eliminates decision fatigue and executive paralysis for ADHD minds.
* **Alternatives Rejected:** Filtered lists, Kanban boards, or priority queues in DO mode.

### 1.2. Append-Only Immutable Event Log (Rule 3)
* **Decision:** The `Events` sheet tab and local IndexedDB outbox are strictly append-only. Rows are never edited or deleted. **[Confirmed]**
* **Why:** Provides an indisputable audit trail, prevents sync race conditions, and allows computing experimental metrics directly from events.
* **Alternatives Rejected:** In-place updates or mutable task state logs.

### 1.3. Local-First Offline Execution (<5ms)
* **Decision:** Recording events locally in IndexedDB happens instantaneously without awaiting HTTP responses. Syncing runs in the background in deduplicated batches. **[Confirmed]**
* **Why:** Any network lag during the DO loop breaks ADHD momentum and leads to app abandonment.
* **Alternatives Rejected:** Blocking remote API calls per user action.

### 1.4. Google Apps Script Doorway with Text/Plain POST
* **Decision:** All browser-to-Apps-Script POST requests use `Content-Type: text/plain;charset=utf-8`. **[Confirmed]**
* **Why:** Google Apps Script does not respond to HTTP `OPTIONS` preflight requests, causing CORS failures for `application/json`.
* **Alternatives Rejected:** Setting up a separate Node.js / Express proxy server.

### 1.5. Google Calendar as the Nudge Delivery Engine
* **Decision:** Use Google Calendar event popups created by Apps Script instead of Web Push API. **[Confirmed]**
* **Why:** Web Push requires VAPID keys, a persistent 24/7 server, and encryption libraries that Apps Script cannot maintain. The native Android Google Calendar app delivers reminders with 100% reliability even when the browser is closed.
* **Alternatives Rejected:** Web Push service workers requiring dedicated VPS infrastructure.

### 1.6. Continuous Action String Flow with Guilt-Free Stop
* **Decision:** Completing a task immediately transitions to the next served task without returning to physical ignition. After completing $\ge 2$ tasks, an explicit *Done for now ✓* button appears. **[Confirmed]**
* **Why:** Keeps the user in motion while in flow; prevents feeling punished for stopping when sufficient work has been achieved.

### 1.7. 4-Week Locked Serving Experiment Schedule
* **Decision:** Alternating Assigned (Week 1 & 3) and Paired (Week 2 & 4) by entire counting weeks, locking the mode inside each week. Manual overrides require confirmation and log `mode_override`. **[Confirmed]**
* **Why:** Prevents daily mood bias from distorting A/B performance metrics.

---

## 2. Inferred Decisions

### 2.1. Web Audio API for Gentle Haptic Chimes
* **Decision:** Generate three-tone harmonic chime (C5-E5-G5) directly in browser using `AudioContext` oscillators. **[Inferred]**
* **Why:** Zero external audio asset dependencies, guaranteed offline availability, instant playback latency.

### 2.2. Flat SVG Vector Art for Watch Parts & Movement
* **Decision:** Pure inline SVGs for screws, jewels, wheels, bridges, barrels, and watch cases rather than raster PNGs. **[Inferred]**
* **Why:** Fast rendering, responsive scaling on all screen sizes, crisp presentation, zero network downloads.

---

## 3. Non-Negotiable Constraints (Rules 1-5)

1. **Rule 1 (Approval Before Code):** Before writing code for any phase, restate the plan in plain language and await user approval.
2. **Rule 2 (Minimal Footprint):** Touch only specified files. Smallest change that satisfies the requirement.
3. **Rule 3 (Immutable History):** The `Events` table is append-only. Never edit or delete event rows.
4. **Rule 4 (No Shame / Zero Lists):** DO mode must function 100% offline. No task lists, no overdue counters, no red guilt badges.
5. **Rule 5 (Note Preservation):** Never overwrite or modify Google Task notes. Append or read only.

---

## 4. Open Questions

1. **Phase 12 Timing:** When to roll out Gemini-based just-in-time task breakdown for stuck items? **[Open Question]**
2. **14-Day Calibration Adoption:** Should the app automatically adjust baseline levels after 14 days, or keep it strictly manual confirmation? **[Open Question]**
3. **Calendar Free-Time Ingestion:** How tightly should calendar free blocks constrain serving time buckets? **[Open Question]**

---

## Part 4 — Development Status, Roadmap & Known Issues

# Roadmap, Development Status & Issues

## 1. Completed Milestones

| Phase | Milestone | Key Deliverables | Status |
| --- | --- | --- | --- |
| **Phase 1** | Foundations & Doorway | Web App POST/GET handlers, PWA manifest, secret key auth | **Completed & Verified** |
| **Phase 2** | Local Data Layer | IndexedDB outbox, batch sync, live sync indicator, DO button | **Completed & Verified** |
| **Phase 3** | Google Tasks Ingestion | 4-list ingestion, `[FOCUS v1]` parser, event folding | **Completed & Verified** |
| **Phase 4** | DO Mode Bare Loop | Ignition exercises, zero-tap bridge, timer, parking lot, continuous flow | **Completed & Verified** |
| **Phase 5** | Serving Algorithm v1 | Ramp, fatigue easing, tripwires, reserved slots, candidate inspector | **Completed & Verified** |
| **Phase 6** | Watchmaker Rewards | Flat SVG watch parts, finish grades, daily commitment, Bench modal | **Completed & Verified** |
| **Phase 7** | Habits & Gear Train | Daily circuits, ignition quota credit, 7-gear train, power reserve | **Completed & Verified** |
| **Phase 8** | Paired Mode & Experiments | $T+1$ vs $T-1$ cards, 4-week locked schedule, event-computed analytics | **Completed & Verified** |
| **Phase 9** | Plan Mode | Phone bottom tabs, desktop sidebar, pool groups, action corrections | **Completed & Verified** |
| **Phase 10** | Offline & Nudges | Screen wake lock, audio chimes, Google Calendar nudges, Drive backups | **Completed & Verified** |
| **Phase 11** | Watch Collection Vault | 5-module weekly movements, weekend polish, collectible watch vault | **Completed & Verified** |

---

## 2. Work in Progress & Next Steps (Phase 12 Options)

* **Phase 12a (Just-in-Time AI Task Breakdown):**
  * Integrate Gemini API in Apps Script when user clicks *Stuck?* or flags an action as `needs_shrinking`.
  * Generates 2–3 micro-actions saved as subtasks without overwriting parent task notes.
* **Phase 12b (Calendar-Aware Time Fit):**
  * Reads upcoming calendar blocks to filter actions that fit available time gaps.
* **Phase 12c (Real Web Push):**
  * Optional lightweight push service for interactive mobile push actions.
* **Phase 12d (Automated Commitment Experiment):**
  * A/B test user-chosen daily commitment level vs. algorithmic recommendation.

---

## 3. Known Issues & Technical Debt

1. **Large JavaScript Bundle Warning (`dist/assets/index.js` > 900 kB):**
   * *Status:* Warning during Vite build.
   * *Impact:* Negligible for desktop and modern phones on WiFi/4G, but code-splitting (`React.lazy`) for `PlanModeScreen` and modal dialogs would reduce initial bundle size to $<300$ kB.
2. **Apps Script Web App Quota & Cold Starts:**
   * *Status:* Occasional 1–3s latency during Google Apps Script cold starts.
   * *Mitigation:* Local IndexedDB outbox ensures the user is never blocked; sync succeeds in background.
3. **Browser Permission Gates for Wake Lock & Haptics:**
   * *Status:* iOS Safari restricts `navigator.vibrate` and Screen Wake Lock unless activated inside a user touch event.
   * *Mitigation:* Handled via graceful feature detection with fallback to standard visual timers.

---

## Part 5 — User Experience & Product Design

# User Experience & Product Design

## 1. Primary Screens & Views

### 1.1. Giant DO Screen (Default Launch View)
* **Visuals:** Deep slate background with a glowing, gently breathing purple/indigo circular DO button.
* **Header Elements:** App brand icon, Bench button, Experiments button, Vault button, Live Sync indicator, Task View link, Settings cog.
* **Interaction:** Exactly 1 primary tap target. Tapping DO triggers the Physical Ignition screen.

### 1.2. Physical Ignition Screen
* **Visuals:** Exercise card with large rep counter (e.g. `10 Push-ups`), amber flame badge.
* **Controls:**
  * Huge `Done →` primary bridge button.
  * Micro controls: `Fewer reps` (scales reps by 40% and logs silent -1 energy shift) and `Swap` (cycles to squats, crunches, jumping jacks).
* **Habit Crediting:** Ignition reps automatically credit your matching daily circuit quota!

### 1.3. Action Offer Screen (Assigned vs. Paired Mode)
* **Assigned Mode (1-Card):**
  * Displays friction badge, time bucket, title, and big `Start` button.
  * Micro controls: `Smaller part`, `Bigger part`, `Not now`.
  * `Why this?` drawer explaining exact algorithm ranking reasons.
* **Paired Mode (2-Cards):**
  * Upper card: Target $+1$ friction with *More Reward* badge and watch part vector preview.
  * Lower card: Target $-1$ friction with *Easier Entry* badge and watch part vector preview.
  * Prioritizes actions from different projects to ensure variety.
  * `Neither right now (Not now)` control supporting standard tap and hold-to-confirm long-press.

### 1.4. Action Execution Screen
* **Visuals:** Live stopwatch timer, action title, and green `Complete ✓` button.
* **ADHD Rescue Controls:**
  * `Stuck? Shrink`: Drops into micro first step to break resistance.
  * `Parking Lot`: Thought-dumping modal to safely store sudden distractions without derailing the current task.
  * `Done for now ✓`: Appears after 2+ completed tasks to allow guilt-free stopping.

### 1.5. Watchmaker's Bench Modal
* **Visuals:** 10 part slots revealing as daily work points accumulate, plus 5 stretch jewel slots for extra accomplishments.
* **Components:** Animated 7-gear train showing rolling momentum and a 0–100 power reserve gauge.
* **Safety Valve:** `Fresh Start Today` button resets daily counter with zero penalty.

### 1.6. Plan Mode Screen (Phone & Desktop)
* **Phone:** Bottom navigation tabs (Today, Pool, Week, Review) with a persistent floating DO button.
* **Desktop:** Sidebar navigation + two-panel review layout + live desktop status panel refreshing every 60s reminding *"Do mode runs on your phone."*
* **Pool & Action Correction:** Tapping any action opens an inline editor to adjust friction, importance, due date, context, and first micro-step.

### 1.7. Watchmaker's Collection Vault
* **Visuals:** SVG vector graphic of the assembled mechanical timepiece (case, dial, hands, crystal).
* **Vault:** Gallery of completed collector's chronometers celebrating long-term consistency.

---

## 2. Interaction & Visual Design Principles
1. **Zero Lists in DO Mode:** Never force an executive decision between items on a list.
2. **Warm, Dignified Mechanical Metaphor:** Watchmaking parts, brass gears, and polished jewels instead of childish gamification or gaming badges.
3. **No Red Overdue Banners:** Overdue items become functional watch parts; missed days never trigger shame or guilt.
4. **Instant Response (<5ms):** Taps yield immediate visual feedback, audio chime, and optional haptics.

---

## Part 6 — Source Manifest (Included vs. Omitted Files)

# Source Code Manifest

Total sanitized source files included: **60**

| Relative Path | Size (Bytes) | Est. Tokens | In Essential Bundle? |
| :--- | ---: | ---: | :---: |
| `.gitattributes` | 66 | ~16 | No |
| `.gitignore` | 50 | ~12 | No |
| `apps-script/Code.gs` | 27,315 | ~6,827 | No |
| `docs/DATA_MODEL.md` | 3,055 | ~763 | No |
| `docs/GEMINI_CAPTURE.md` | 3,167 | ~791 | No |
| `docs/RULES.md` | 1,515 | ~378 | No |
| `index.html` | 2,612 | ~652 | No |
| `package.json` | 597 | ~149 | Yes |
| `postcss.config.js` | 81 | ~20 | No |
| `public/manifest.json` | 1,161 | ~290 | No |
| `public/sw.js` | 1,835 | ~458 | No |
| `README.md` | 3,009 | ~751 | No |
| `src/App.tsx` | 12,545 | ~3,135 | No |
| `src/components/CalendarPanel.tsx` | 25,954 | ~6,484 | No |
| `src/components/CandidateInspectorModal.tsx` | 4,150 | ~1,037 | No |
| `src/components/DayCommitmentPromptModal.tsx` | 3,389 | ~846 | No |
| `src/components/DayMovementBenchModal.tsx` | 6,801 | ~1,699 | No |
| `src/components/DoMainScreen.tsx` | 58,525 | ~14,628 | No |
| `src/components/ExperimentsModal.tsx` | 20,031 | ~5,005 | No |
| `src/components/FridaySummaryModal.tsx` | 5,589 | ~1,396 | No |
| `src/components/GearTrainWidget.tsx` | 2,119 | ~529 | No |
| `src/components/Header.tsx` | 13,668 | ~3,413 | No |
| `src/components/panels/BiggerJobsPanel.tsx` | 31,890 | ~7,967 | No |
| `src/components/panels/HabitsPanel.tsx` | 31,908 | ~7,976 | No |
| `src/components/panels/ProjectsPanel.tsx` | 24,673 | ~6,166 | No |
| `src/components/panels/QuickJobsPanel.tsx` | 16,454 | ~4,112 | No |
| `src/components/Phase1TestScreen.tsx` | 6,091 | ~1,522 | No |
| `src/components/PlanModeScreen.tsx` | 54,419 | ~13,602 | No |
| `src/components/SettingsModal.tsx` | 28,644 | ~7,157 | No |
| `src/components/SetupGuideModal.tsx` | 12,306 | ~3,069 | No |
| `src/components/SyncIndicator.tsx` | 3,363 | ~840 | No |
| `src/components/VoiceIngestionModal.tsx` | 10,935 | ~2,733 | No |
| `src/components/WatchCollectionModal.tsx` | 11,554 | ~2,886 | No |
| `src/components/WatchPartVector.tsx` | 4,723 | ~1,180 | No |
| `src/components/WatchVectorIllustration.tsx` | 5,871 | ~1,467 | No |
| `src/components/WhereWasIModal.tsx` | 9,476 | ~2,368 | No |
| `src/context/MomentumContext.tsx` | 51,287 | ~12,819 | No |
| `src/index.css` | 1,385 | ~346 | No |
| `src/main.tsx` | 237 | ~59 | No |
| `src/services/focusAlgorithm.ts` | 13,043 | ~3,260 | Yes |
| `src/services/focusCollection.ts` | 10,283 | ~2,570 | No |
| `src/services/focusDataLayer.ts` | 7,395 | ~1,848 | Yes |
| `src/services/focusDoorway.ts` | 2,475 | ~618 | No |
| `src/services/focusExperiments.ts` | 13,748 | ~3,437 | No |
| `src/services/focusHabits.ts` | 4,944 | ~1,236 | No |
| `src/services/focusMovement.ts` | 4,372 | ~1,093 | Yes |
| `src/services/focusServing.ts` | 3,798 | ~949 | Yes |
| `src/services/focusWakeLock.ts` | 3,185 | ~796 | No |
| `src/services/geminiService.ts` | 6,023 | ~1,505 | No |
| `src/services/googleTasksService.ts` | 44,613 | ~11,152 | No |
| `src/services/soundService.ts` | 2,483 | ~620 | No |
| `src/services/speechService.ts` | 2,642 | ~660 | No |
| `src/services/storageService.ts` | 10,616 | ~2,654 | No |
| `src/types/index.ts` | 4,373 | ~1,093 | No |
| `Start-Momentum-Widget.bat` | 141 | ~35 | No |
| `Start-Momentum-Widget.ps1` | 2,145 | ~536 | No |
| `Start-Momentum.bat` | 840 | ~210 | No |
| `tailwind.config.js` | 340 | ~85 | No |
| `tsconfig.json` | 512 | ~128 | No |
| `vite.config.ts` | 228 | ~57 | No |

---

## Part 7 — Architecturally Significant Source Code

### `package.json`
```json
{
  "name": "momentum",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^11.3.1",
    "lucide-react": "^0.475.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.2",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.7.2",
    "vite": "^6.1.0"
  }
}


```

### `src/services/focusAlgorithm.ts`
```typescript
import { FocusAction } from './focusServing';

export interface ServingSettings {
  countingDays: string[]; // e.g. ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']
  firstOfferTargetFriction: number; // 2
  targetCeiling: number; // 4
  fatigueActionCount: number; // 5
  fatigueActiveMinutes: number; // 90
  smallerTapsBeforeShrink: number; // 2
  importanceBonusHigh: number; // 5
  importanceBonusMed: number; // 2
  importanceBonusLow: number; // 0
  ageBonusPerDay: number; // 0.5
  ageBonusMax: number; // 4
  heartbeatBonus: number; // 3
  varietyPenalty: number; // -3
}

export const DEFAULT_SERVING_SETTINGS: ServingSettings = {
  countingDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  firstOfferTargetFriction: 2,
  targetCeiling: 4,
  fatigueActionCount: 5,
  fatigueActiveMinutes: 90,
  smallerTapsBeforeShrink: 2,
  importanceBonusHigh: 5,
  importanceBonusMed: 2,
  importanceBonusLow: 0,
  ageBonusPerDay: 0.5,
  ageBonusMax: 4,
  heartbeatBonus: 3,
  varietyPenalty: -3,
};

export interface SessionContext {
  completedActions: FocusAction[];
  totalActiveMinutes: number;
  tapShift: number; // accumulated shift from smaller/bigger
  consecutiveSmallerTaps: number;
  fewerRepsTapped: boolean;
  reservedSlotUsedToday: boolean;
  stretchProbeUsedToday: boolean;
  skippedTaskIds: Set<string>;
  lastCompletedType?: string;
  now?: Date;
}

export interface CandidateScore {
  action: FocusAction;
  totalScore: number;
  targetFriction: number;
  effectiveFriction: number;
  urgencyScore: number;
  importanceScore: number;
  ageScore: number;
  heartbeatScore: number;
  varietyScore: number;
  isTripwire: boolean;
  isReservedSlot: boolean;
  reasons: string[];
}

/**
 * Checks whether today is a counting day (Sun-Thu)
 */
export function isCountingDay(date: Date = new Date(), countingDays: string[] = DEFAULT_SERVING_SETTINGS.countingDays): boolean {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  return countingDays.includes(dayName);
}

/**
 * Calculates counting days between two dates, excluding Friday & Saturday (or non-counting days)
 */
export function getCountingDaysDifference(from: Date, to: Date, countingDays: string[] = DEFAULT_SERVING_SETTINGS.countingDays): number {
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const target = new Date(to);
  target.setHours(0, 0, 0, 0);

  if (cur.getTime() >= target.getTime()) return 0;

  let days = 0;
  while (cur.getTime() < target.getTime()) {
    cur.setDate(cur.getDate() + 1);
    const dayName = cur.toLocaleDateString('en-US', { weekday: 'short' });
    if (countingDays.includes(dayName)) {
      days++;
    }
  }
  return days;
}

/**
 * Step 1: Compute Target Friction
 */
export function computeTargetFriction(
  ctx: SessionContext,
  settings: ServingSettings = DEFAULT_SERVING_SETTINGS
): { target: number; reasons: string[]; isStretch: boolean } {
  let target = settings.firstOfferTargetFriction;
  const reasons: string[] = [];

  // 1. Baseline ramp (+1 per completion up to ceiling)
  const completions = ctx.completedActions.length;
  if (completions > 0) {
    const rampAdd = Math.min(settings.targetCeiling - target, completions);
    target += rampAdd;
    reasons.push(`Baseline ramp (+${rampAdd} from ${completions} completions)`);
  }

  // 2. Fatigue easing (-1 after 5 actions or 90 active minutes)
  if (completions >= settings.fatigueActionCount || ctx.totalActiveMinutes >= settings.fatigueActiveMinutes) {
    target = Math.max(1, target - 1);
    reasons.push('Fatigue easing applied (-1)');
  }

  // 3. User tap shift (smaller/bigger), fading by 1 for every 3 completions
  const fade = Math.floor(completions / 3);
  let effectiveTapShift = ctx.tapShift;
  if (effectiveTapShift > 0) effectiveTapShift = Math.max(0, effectiveTapShift - fade);
  if (effectiveTapShift < 0) effectiveTapShift = Math.min(0, effectiveTapShift + fade);

  if (effectiveTapShift !== 0) {
    target = Math.max(1, Math.min(settings.targetCeiling, target + effectiveTapShift));
    reasons.push(`User tap shift (${effectiveTapShift > 0 ? '+' : ''}${effectiveTapShift})`);
  }

  // 4. Silent energy signals (at most +/-1 total)
  let energySignal = 0;
  if (ctx.fewerRepsTapped) {
    energySignal -= 1;
    reasons.push('Fewer reps at ignition (-1 energy adjustment)');
  }
  energySignal = Math.max(-1, Math.min(1, energySignal));
  target = Math.max(1, Math.min(settings.targetCeiling, target + energySignal));

  // 5. Stretch probe (once per counting day, after 3 smooth completions, allow ceiling + 1)
  let isStretch = false;
  if (
    isCountingDay(ctx.now, settings.countingDays) &&
    completions >= 3 &&
    !ctx.stretchProbeUsedToday &&
    target >= settings.targetCeiling
  ) {
    target = settings.targetCeiling + 1; // 5
    isStretch = true;
    reasons.push('Stretch probe active (ambitious challenge)');
  }

  return { target: Math.max(1, Math.min(5, target)), reasons, isStretch };
}

/**
 * Step 2: Rank Actions and Apply Overrides (Tripwire & Reserved Slot)
 */
export function rankCandidates(
  actions: FocusAction[],
  ctx: SessionContext,
  settings: ServingSettings = DEFAULT_SERVING_SETTINGS
): { selected: CandidateScore | null; ranked: CandidateScore[]; paired: [CandidateScore, CandidateScore] | null } {
  const now = ctx.now || new Date();
  const isCountDay = isCountingDay(now, settings.countingDays);
  const { target: targetFriction } = computeTargetFriction(ctx, settings);

  // Filter available
  const available = actions.filter((a) => {
    if (a.status !== 'waiting' && a.status !== 'served') return false;
    if (a.category === 'habit') return false;
    if (ctx.skippedTaskIds.has(a.task_id)) return false;
    if (a.snoozed_until && new Date(a.snoozed_until) > now) return false;
    return true;
  });

  if (available.length === 0) {
    return { selected: null, ranked: [], paired: null };
  }

  // OVERRIDE 1: TRIPWIRE
  for (const a of available) {
    if (a.deadline_kind === 'external' && a.due_date) {
      const dueDate = new Date(a.due_date);
      const countingDaysAway = getCountingDaysDifference(now, dueDate, settings.countingDays);
      if (countingDaysAway <= 1) {
        const tripwireScore: CandidateScore = {
          action: a,
          totalScore: 9999,
          targetFriction,
          effectiveFriction: Number(a.friction) || 2,
          urgencyScore: 10,
          importanceScore: 5,
          ageScore: 0,
          heartbeatScore: 0,
          varietyScore: 0,
          isTripwire: true,
          isReservedSlot: false,
          reasons: ['Tripwire: External deadline due soon'],
        };
        return { selected: tripwireScore, ranked: [tripwireScore], paired: null };
      }
    }
  }

  // OVERRIDE 2: RESERVED SLOT
  if (isCountDay && ctx.completedActions.length >= 2 && !ctx.reservedSlotUsedToday) {
    const highImp = available
      .filter((a) => (a.importance || 'med') === 'high')
      .sort((a, b) => (Number(a.friction) || 2) - (Number(b.friction) || 2));

    if (highImp.length > 0) {
      const picked = highImp[0];
      const reservedScore: CandidateScore = {
        action: picked,
        totalScore: 8888,
        targetFriction,
        effectiveFriction: Number(picked.friction) || 2,
        urgencyScore: 5,
        importanceScore: 10,
        ageScore: 0,
        heartbeatScore: 0,
        varietyScore: 0,
        isTripwire: false,
        isReservedSlot: true,
        reasons: ['Reserved slot: High importance priority'],
      };
      return { selected: reservedScore, ranked: [reservedScore], paired: null };
    }
  }

  // SCORING CANDIDATES
  const candidates: CandidateScore[] = available.map((a) => {
    const rawFriction = Number(a.friction) || 2;
    const learned = Number(a.learned_adjustment) || 0;
    const effectiveFriction = Math.max(1, Math.min(5, Math.round(rawFriction + learned)));

    const reasons: string[] = [];

    // Urgency Score (0 - 10)
    let urgencyScore = 0;
    if (a.due_date) {
      const dueDate = new Date(a.due_date);
      const daysAway = getCountingDaysDifference(now, dueDate, settings.countingDays);
      if (daysAway <= 7) {
        const baseUrgency = Math.max(0, 10 - daysAway * 1.3);
        urgencyScore = a.deadline_kind === 'self' ? baseUrgency * 0.5 : baseUrgency;
        if (urgencyScore > 3) {
          reasons.push(daysAway <= 1 ? 'Due very soon' : `Due in ${daysAway} work days`);
        }
      }
    }

    // Importance Score
    let importanceScore = settings.importanceBonusLow;
    if (a.importance === 'high') {
      importanceScore = settings.importanceBonusHigh;
      reasons.push('High importance');
    } else if (a.importance === 'med') {
      importanceScore = settings.importanceBonusMed;
    }

    // Age Score
    let ageScore = 0;
    if (a.created_at) {
      const created = new Date(a.created_at);
      const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      ageScore = Math.min(settings.ageBonusMax, ageDays * settings.ageBonusPerDay);
      if (ageScore >= 2) reasons.push('Waiting for a while');
    }

    // Project Heartbeat
    let heartbeatScore = 0;
    if (a.category === 'project') {
      heartbeatScore = settings.heartbeatBonus;
      reasons.push('Project needs momentum');
    }

    // Variety Score
    let varietyScore = 0;
    if (ctx.lastCompletedType && a.type && ctx.lastCompletedType === a.type) {
      varietyScore = settings.varietyPenalty;
    }

    // Friction Distance Penalty
    const frictionDist = Math.abs(effectiveFriction - targetFriction);
    const frictionPenalty = frictionDist * 4;

    const totalScore = urgencyScore + importanceScore + ageScore + heartbeatScore + varietyScore - frictionPenalty;

    if (frictionDist === 0) {
      reasons.unshift(`Matches target friction (${targetFriction})`);
    }

    return {
      action: a,
      totalScore,
      targetFriction,
      effectiveFriction,
      urgencyScore,
      importanceScore,
      ageScore,
      heartbeatScore,
      varietyScore,
      isTripwire: false,
      isReservedSlot: false,
      reasons: reasons.slice(0, 2),
    };
  });

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  // Paired Mode: upper card at target+1, lower card at target-1, differing projects when possible
  const paired = selectPairedCandidates(candidates, targetFriction);

  return {
    selected: candidates[0] || null,
    ranked: candidates,
    paired,
  };
}

/**
 * Phase 8: Pair selection function using existing ranking
 * Upper card: best-ranked at target + 1 (more reward)
 * Lower card: best-ranked at target - 1 (less reward), from a different project when possible
 */
export function selectPairedCandidates(
  rankedCandidates: CandidateScore[],
  targetFriction: number
): [CandidateScore, CandidateScore] | null {
  if (rankedCandidates.length < 2) return null;

  const targetUpper = Math.min(5, targetFriction + 1);
  const targetLower = Math.max(1, targetFriction - 1);

  // 1. Find candidates matching targetUpper (friction = T + 1)
  let upper = rankedCandidates.find((c) => c.effectiveFriction === targetUpper);
  if (!upper) {
    // Fallback: candidate with friction > targetFriction, or highest friction candidate
    upper = rankedCandidates.find((c) => c.effectiveFriction > targetFriction) || rankedCandidates[0];
  }

  // 2. Find candidates matching targetLower (friction = T - 1)
  // Prefer candidate from a different project than upper
  const upperProjectId = upper.action.project_id || upper.action.project_title || '';
  const remaining = rankedCandidates.filter((c) => c.action.task_id !== upper!.action.task_id);

  let lower = remaining.find((c) => {
    const proj = c.action.project_id || c.action.project_title || '';
    const diffProject = proj && upperProjectId ? proj !== upperProjectId : true;
    return c.effectiveFriction === targetLower && diffProject;
  });

  if (!lower) {
    // Try matching targetLower regardless of project
    lower = remaining.find((c) => c.effectiveFriction === targetLower);
  }

  if (!lower) {
    // Try candidate with friction < targetFriction from different project
    lower = remaining.find((c) => {
      const proj = c.action.project_id || c.action.project_title || '';
      const diffProject = proj && upperProjectId ? proj !== upperProjectId : true;
      return c.effectiveFriction < targetFriction && diffProject;
    });
  }

  if (!lower) {
    // Try candidate with friction < targetFriction
    lower = remaining.find((c) => c.effectiveFriction < targetFriction);
  }

  if (!lower) {
    // Fallback: any other candidate, preferring different project
    lower = remaining.find((c) => {
      const proj = c.action.project_id || c.action.project_title || '';
      return proj && upperProjectId ? proj !== upperProjectId : false;
    }) || remaining[0];
  }

  if (!lower || lower.action.task_id === upper.action.task_id) {
    return null;
  }

  // Return [upper (target+1 / more reward), lower (target-1 / less reward)]
  return [upper, lower];
}

```

### `src/services/focusDataLayer.ts`
```typescript
/**
 * Focus Data Layer
 * Handles local IndexedDB outbox queue, background batch synchronization,
 * duplicate safety, and offline caching of Settings, Actions, Habits, and Movement.
 * 
 * Principle: Do mode never waits for the network. Record locally first in <5ms,
 * sync in batches in background.
 */

export interface FocusEvent {
  event_id: string;
  timestamp: string;
  device: string;
  type: string;
  payload: any;
  schema_version: string;
}

export type SyncState = 'synced' | 'waiting' | 'failed';

const DB_NAME = 'focus_db';
const DB_VERSION = 1;
const STORE_OUTBOX = 'outbox';
const STORE_CACHE = 'cache';

const STORAGE_KEYS = {
  WEB_APP_URL: 'focus_apps_script_url',
  SECRET_KEY: 'focus_secret_key',
};

// 1. IndexedDB Helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'event_id' });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'tab' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Credentials
export function getStoredCredentials() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.WEB_APP_URL) || '',
    key: localStorage.getItem(STORAGE_KEYS.SECRET_KEY) || '',
  };
}

export function saveCredentials(url: string, key: string) {
  localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.SECRET_KEY, key.trim());
}

// 2. Outbox Management
export async function queueEvent(type: string, payload: any = {}): Promise<FocusEvent> {
  const db = await openDB();
  const event: FocusEvent = {
    event_id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    timestamp: new Date().toISOString(),
    device: navigator.userAgent.includes('Mobi') ? 'phone' : 'desktop',
    type,
    payload,
    schema_version: '1.0',
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    tx.objectStore(STORE_OUTBOX).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  notifySyncStateChange();
  // Trigger immediate background sync attempt (no wait)
  triggerBackgroundSync();
  return event;
}

export async function getOutboxCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const req = tx.objectStore(STORE_OUTBOX).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function getOutboxEvents(): Promise<FocusEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readonly');
    const req = tx.objectStore(STORE_OUTBOX).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeEventsFromOutbox(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    for (const id of eventIds) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 3. Background Sync & Batching
let isSyncInProgress = false;
let currentSyncState: { state: SyncState; waitingCount: number; error?: string } = {
  state: 'synced',
  waitingCount: 0,
};

const listeners = new Set<(status: { state: SyncState; waitingCount: number; error?: string }) => void>();

export function subscribeSyncState(fn: (status: { state: SyncState; waitingCount: number; error?: string }) => void) {
  listeners.add(fn);
  fn(currentSyncState);
  return () => {
    listeners.delete(fn);
  };
}

async function notifySyncStateChange(error?: string) {
  const count = await getOutboxCount();
  const state: SyncState = error ? 'failed' : count > 0 ? 'waiting' : 'synced';
  currentSyncState = { state, waitingCount: count, error };
  for (const listener of listeners) {
    listener(currentSyncState);
  }
}

export async function triggerBackgroundSync(): Promise<boolean> {
  if (isSyncInProgress) return false;
  const { url, key } = getStoredCredentials();
  if (!url || !key) return false;
  if (!navigator.onLine) {
    notifySyncStateChange();
    return false;
  }

  const events = await getOutboxEvents();
  if (events.length === 0) {
    notifySyncStateChange();
    return true;
  }

  isSyncInProgress = true;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        key,
        action: 'batch_events',
        events,
      }),
    });

    const result = await response.json();
    if (result.ok) {
      const processedIds = events.map((e) => e.event_id);
      await removeEventsFromOutbox(processedIds);
      notifySyncStateChange();
      isSyncInProgress = false;
      return true;
    } else {
      notifySyncStateChange(result.error || 'Sync rejected by backend');
      isSyncInProgress = false;
      return false;
    }
  } catch (err: any) {
    notifySyncStateChange(err.message || 'Network sync error');
    isSyncInProgress = false;
    return false;
  }
}

// Auto-sync on coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    triggerBackgroundSync();
  });
}

// 4. Tab Reading & Caching (Settings, Actions, Habits, Movement)
export async function readTabFromSheet(tab: string): Promise<any[]> {
  const { url, key } = getStoredCredentials();
  if (!url || !key) {
    return getCachedTab(tab);
  }

  try {
    const reqUrl = `${url}?key=${encodeURIComponent(key)}&tab=${encodeURIComponent(tab)}`;
    const response = await fetch(reqUrl);
    const data = await response.json();
    if (data.ok && Array.isArray(data.rows)) {
      await cacheTab(tab, data.rows);
      return data.rows;
    }
  } catch (err) {
    console.warn(`Could not fetch tab ${tab} online, falling back to cache`, err);
  }

  return getCachedTab(tab);
}

export async function cacheTab(tab: string, rows: any[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      tx.objectStore(STORE_CACHE).put({ tab, rows, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to cache tab', e);
  }
}

export async function getCachedTab(tab: string): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const req = tx.objectStore(STORE_CACHE).get(tab);
      req.onsuccess = () => resolve(req.result?.rows || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

```

### `src/services/focusMovement.ts`
```typescript
/**
 * Focus App Rewards & Mechanical Watch Movement Model
 * 
 * Part sizes: 1=screw, 2=jewel, 3=wheel, 4=bridge, 5=barrel
 * Finish grades: functional, brushed, decorated, hand-finished
 */

export type PartSize = 'screw' | 'jewel' | 'wheel' | 'bridge' | 'barrel';
export type FinishGrade = 'functional' | 'brushed' | 'decorated' | 'hand-finished';
export type DayCommitmentLevel = 'light' | 'standard' | 'full';

export interface WatchPart {
  part_id: string;
  name: string;
  part_size: PartSize;
  finish_grade: FinishGrade;
  action_id: string;
  action_title: string;
  work_value: number;
  earned_at: string;
}

export interface DayModule {
  day_name: string; // 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'
  module_name: string; // e.g. 'Barrel & Mainspring', 'Going Train', etc.
  date: string; // YYYY-MM-DD
  committed_level: DayCommitmentLevel;
  committed_work_points: number;
  total_work_done: number;
  parts: WatchPart[];
  is_closed: boolean;
  can_lower_commitment: boolean; // can lower once without penalty
}

export const DAY_MODULE_NAMES: Record<string, string> = {
  Sun: 'Barrel & Mainspring',
  Mon: 'Going Train',
  Tue: 'Escapement & Pallet',
  Wed: 'Balance & Hairspring',
  Thu: 'Keyless Works',
  Fri: 'Bench (Off Day)',
  Sat: 'Bench (Off Day)',
};

export const COMMITMENT_POINTS: Record<DayCommitmentLevel, number> = {
  light: 8,
  standard: 16,
  full: 26,
};

export const FRICTION_WORK_VALUES: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 8,
};

/**
 * Computes work points for a completed action
 */
export function calculateWorkValue(friction: number, importance?: string): number {
  const base = FRICTION_WORK_VALUES[friction] || 2;
  const bonus = importance === 'high' ? 1 : 0;
  return base + bonus;
}

/**
 * Computes the part size corresponding to friction
 */
export function getPartSizeForFriction(friction: number): PartSize {
  switch (friction) {
    case 1:
      return 'screw';
    case 2:
      return 'jewel';
    case 3:
      return 'wheel';
    case 4:
      return 'bridge';
    case 5:
    default:
      return 'barrel';
  }
}

/**
 * Computes the finish grade based on earliness
 * - Overdue: functional
 * - Due today or tomorrow (or no deadline): brushed
 * - 2-6 counting days early (or finished within 48h of capture): decorated
 * - 7+ counting days early: hand-finished
 */
export function calculateFinishGrade(
  dueDateStr?: string,
  createdAtStr?: string,
  now: Date = new Date()
): FinishGrade {
  if (!dueDateStr) {
    if (createdAtStr) {
      const created = new Date(createdAtStr).getTime();
      const diffHours = (now.getTime() - created) / (1000 * 60 * 60);
      if (diffHours <= 48) return 'decorated';
    }
    return 'brushed';
  }

  const due = new Date(dueDateStr);
  due.setHours(23, 59, 59, 999);
  const nowMs = now.getTime();

  if (nowMs > due.getTime()) {
    return 'functional'; // Overdue rescue
  }

  const diffDays = Math.ceil((due.getTime() - nowMs) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return 'brushed';
  } else if (diffDays <= 6) {
    return 'decorated';
  } else {
    return 'hand-finished';
  }
}

/**
 * Visual styles for finish grades
 */
export function getFinishGradeStyles(grade: FinishGrade) {
  switch (grade) {
    case 'hand-finished':
      return {
        label: 'Hand-Finished',
        border: 'border-amber-300 shadow-md shadow-amber-400/30',
        bg: 'bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500',
        text: 'text-amber-900',
        shimmer: 'ring-1 ring-amber-300',
      };
    case 'decorated':
      return {
        label: 'Decorated',
        border: 'border-purple-400 shadow-sm shadow-purple-500/30',
        bg: 'bg-gradient-to-tr from-purple-500 via-indigo-300 to-purple-600',
        text: 'text-white',
        shimmer: 'ring-1 ring-purple-400',
      };
    case 'brushed':
      return {
        label: 'Brushed Metal',
        border: 'border-slate-400',
        bg: 'bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-400',
        text: 'text-slate-800',
        shimmer: '',
      };
    case 'functional':
    default:
      return {
        label: 'Functional',
        border: 'border-slate-600',
        bg: 'bg-gradient-to-tr from-slate-600 via-slate-700 to-slate-800',
        text: 'text-slate-300',
        shimmer: '',
      };
  }
}

```

### `src/services/focusServing.ts`
```typescript
/**
 * Focus App Action Type Definition (matching Actions tab in Sheet)
 */
export interface FocusAction {
  task_id: string;
  title: string;
  original_words?: string;
  created_at?: string;
  source?: string;
  category?: 'quick' | 'scheduled' | 'project' | 'habit';
  type?: 'physical' | 'mental' | 'social' | 'admin';
  parent_id?: string;
  project_id?: string;
  project_title?: string;
  order?: string;
  active_step?: string;
  context?: string;
  friction: number; // 1 to 5
  friction_confidence?: string;
  friction_reason?: string;
  learned_adjustment?: number;
  time_bucket?: string; // under 5, 5-20, 20-60, over 60
  first_action?: string;
  needs_shrinking?: boolean;
  due_date?: string;
  deadline_kind?: 'external' | 'self' | 'none';
  importance?: 'low' | 'med' | 'high';
  why_it_matters?: string;
  status: 'waiting' | 'served' | 'in_progress' | 'done' | 'snoozed' | 'dropped' | 'needs_setup';
  snoozed_until?: string;
  times_served?: number;
  times_skipped?: number;
  times_shrunk?: number;
  completed_at?: string;
  actual_minutes?: number;
  work_value?: number;
  finish_grade?: string;
  part_earned?: string;
  last_folded_event_id?: string;
}

export interface ServingState {
  targetFriction: number;
  completedCount: number;
  consecutiveNotNows: number;
  skippedTaskIds: Set<string>;
  lastExercise?: string;
}

export interface IgnitionExercise {
  name: string;
  reps: number;
  unit: string;
  tip?: string;
}

export const IGNITION_EXERCISES: IgnitionExercise[] = [
  { name: 'Push-ups', reps: 10, unit: 'reps' },
  { name: 'Crunches', reps: 15, unit: 'reps' },
  { name: 'Squats', reps: 15, unit: 'reps' },
  { name: 'Jumping Jacks', reps: 20, unit: 'reps' },
];

/**
 * Weighted pick of exercise, never repeating the same one twice in a row
 */
export function pickNextExercise(lastExercise?: string): IgnitionExercise {
  const candidates = IGNITION_EXERCISES.filter((e) => e.name !== lastExercise);
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...choice };
}

/**
 * Serving rule v0:
 * 1. Filter: status === 'waiting', not snoozed, not in skippedTaskIds, category !== 'habit'
 * 2. Distance from target friction
 * 3. Tie-breaker: Soonest due date -> importance (high > med > low) -> oldest created_at
 */
export function pickBestAction(
  actions: FocusAction[],
  targetFriction: number,
  skippedTaskIds: Set<string>
): FocusAction | null {
  const validActions = actions.filter((a) => {
    if (a.status !== 'waiting' && a.status !== 'served') return false;
    if (a.category === 'habit') return false;
    if (skippedTaskIds.has(a.task_id)) return false;
    if (a.snoozed_until && new Date(a.snoozed_until) > new Date()) return false;
    return true;
  });

  if (validActions.length === 0) return null;

  const sorted = [...validActions].sort((a, b) => {
    const fA = Number(a.friction) || 2;
    const fB = Number(b.friction) || 2;
    const distA = Math.abs(fA - targetFriction);
    const distB = Math.abs(fB - targetFriction);

    if (distA !== distB) return distA - distB;

    // Due date priority
    if (a.due_date && b.due_date) {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    } else if (a.due_date && !b.due_date) {
      return -1;
    } else if (!a.due_date && b.due_date) {
      return 1;
    }

    // Importance priority
    const impWeights = { high: 3, med: 2, low: 1 };
    const wA = impWeights[a.importance || 'med'] || 2;
    const wB = impWeights[b.importance || 'med'] || 2;
    if (wA !== wB) return wB - wA;

    // Oldest age
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  return sorted[0];
}

```
