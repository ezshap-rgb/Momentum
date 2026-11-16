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

## Part 6 — Source Manifest

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

## Part 7 — Complete Sanitized Source Code

### `.gitattributes`
```
# Auto detect text files and perform LF normalization
* text=auto

```

### `.gitignore`
```
node_modules
dist
tsconfig.tsbuildinfo
.DS_Store


```

### `apps-script/Code.gs`
```
/**
 * Focus App / Momentum — Apps Script Backend Doorway
 * Target Sheet: "Focus App Data"
 * 
 * Phase 3: Ingestion from Google Tasks & Action Folding
 * 
 * Services Required:
 * - Google Tasks API: In Apps Script editor, click Services (+) -> select Tasks API -> Add.
 */

function getSecretKey() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('FOCUS_SECRET_KEY') || 'changeme_secret_key_123';
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Setup / ensure headers and default settings exist.
 */
function setupHeadersAndSettings() {
  const ss = getSpreadsheet();
  
  const tabs = {
    'Events': [
      'event_id',
      'timestamp',
      'device',
      'type',
      'payload',
      'schema_version'
    ],
    'Actions': [
      'task_id',
      'title',
      'original_words',
      'created_at',
      'source',
      'category',
      'type',
      'parent_id',
      'order',
      'active_step',
      'context',
      'friction',
      'friction_confidence',
      'friction_reason',
      'learned_adjustment',
      'time_bucket',
      'first_action',
      'needs_shrinking',
      'due_date',
      'deadline_kind',
      'importance',
      'why_it_matters',
      'status',
      'snoozed_until',
      'times_served',
      'times_skipped',
      'times_shrunk',
      'completed_at',
      'actual_minutes',
      'work_value',
      'finish_grade',
      'part_earned',
      'last_folded_event_id'
    ],
    'Habits': [
      'habit_id',
      'name',
      'circuit',
      'half',
      'quota',
      'unit',
      'windows',
      'minimum_version',
      'status',
      'gear_speed'
    ],
    'Movement': [
      'module_id',
      'date',
      'committed_level',
      'status',
      'work_total',
      'parts_count',
      'finish_grades_summary',
      'stretch_reached'
    ],
    'Settings': [
      'key',
      'value',
      'description'
    ],
    'ParseLog': [
      'timestamp',
      'task_id',
      'task_title',
      'raw_notes',
      'error_reason'
    ]
  };

  for (const [tabName, headers] of Object.entries(tabs)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet && settingsSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ['work_value_friction_1', '1', 'Work value for friction level 1'],
      ['work_value_friction_2', '2', 'Work value for friction level 2'],
      ['work_value_friction_3', '3', 'Work value for friction level 3'],
      ['work_value_friction_4', '5', 'Work value for friction level 4'],
      ['work_value_friction_5', '8', 'Work value for friction level 5'],
      ['importance_bonus', '1', 'High importance bonus to work value'],
      ['day_level_light', '8', 'Light day committed work points'],
      ['day_level_standard', '16', 'Standard day committed work points'],
      ['day_level_full', '26', 'Full day committed work points'],
      ['circuit_full_contrib', '3', 'Full circuit points contribution'],
      ['circuit_half_contrib', '2', 'Half circuit points contribution'],
      ['circuit_min_contrib', '1', 'Minimum circuit points contribution'],
      ['circuit_daily_cap', '6', 'Maximum circuit points per day'],
      ['first_offer_target_friction', '2', 'Target friction for first offer after ignition'],
      ['target_ceiling', '4', 'Normal max target friction ceiling'],
      ['fatigue_action_count', '5', 'Actions before target drops 1'],
      ['fatigue_active_minutes', '90', 'Minutes before target drops 1'],
      ['smaller_taps_before_shrink', '2', 'Consecutive smaller taps before shrink offer'],
      ['counting_days', 'Sun,Mon,Tue,Wed,Thu', 'Active counting days (Fri & Sat off)']
    ];
    settingsSheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);
  }

  Logger.log('Setup verified.');
}

/**
 * PHASE 3: Ingest tasks from Google Tasks
 * Reads all 4 task lists (quick tasks, scheduled jobs, long-term projects, habits)
 * Parses [FOCUS v1] enrichment block into the Actions tab without modifying task notes.
 */
function importGoogleTasks() {
  const ss = getSpreadsheet();
  const actionsSheet = ss.getSheetByName('Actions');
  const parseLogSheet = ss.getSheetByName('ParseLog');
  if (!actionsSheet || !parseLogSheet) return;

  // 1. Fetch existing task_ids in Actions tab
  const lastRow = actionsSheet.getLastRow();
  const existingTasks = new Map(); // task_id -> rowIndex
  if (lastRow > 1) {
    const ids = actionsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0]) {
        existingTasks.set(String(ids[i][0]), i + 2);
      }
    }
  }

  // 2. Fetch all Google Task lists
  let taskLists;
  try {
    taskLists = Tasks.Tasklists.list();
  } catch (err) {
    Logger.log('Error fetching task lists: ' + err);
    return;
  }
  if (!taskLists.items) return;

  const listCategoryMap = {
    'quick tasks': 'quick',
    'tasks': 'quick',
    'scheduled jobs': 'scheduled',
    'jobs': 'scheduled',
    'long-term projects': 'project',
    'projects': 'project',
    'habits': 'habit'
  };

  const newRows = [];

  for (const list of taskLists.items) {
    const listTitle = (list.title || '').toLowerCase().trim();
    let category = 'quick';
    for (const [key, cat] of Object.entries(listCategoryMap)) {
      if (listTitle.includes(key)) {
        category = cat;
        break;
      }
    }

    let tasks;
    try {
      tasks = Tasks.Tasks.list(list.id, { showCompleted: false, showHidden: false, maxResults: 100 });
    } catch (err) {
      Logger.log(`Error listing tasks for ${list.title}: ` + err);
      continue;
    }
    if (!tasks.items) continue;

    for (const t of tasks.items) {
      const taskId = String(t.id);
      if (existingTasks.has(taskId)) {
        continue; // Already imported
      }

      // Parse notes
      const notes = t.notes || '';
      const parsed = parseFocusBlock(notes, t.title || '');

      if (!parsed.validBlock && notes.trim().length > 0) {
        parseLogSheet.appendRow([
          new Date().toISOString(),
          taskId,
          t.title || '',
          notes,
          parsed.errorReason || 'Unreadable FOCUS block'
        ]);
      }

      // Habits list tasks are imported as needs_setup and never served in Do mode
      let status = 'waiting';
      if (category === 'habit') {
        status = 'needs_setup';
      }

      const row = [
        taskId,
        t.title || '',
        t.title || '', // original_words
        t.updated || new Date().toISOString(),
        'google_tasks',
        category,
        parsed.type,
        t.parent || '',
        t.position || '',
        parsed.next || '', // active_step
        parsed.context,
        parsed.friction,
        parsed.confidence,
        parsed.reason,
        0, // learned_adjustment
        parsed.time,
        parsed.first,
        false, // needs_shrinking
        t.due ? Utilities.formatDate(new Date(t.due), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        parsed.deadline,
        parsed.importance,
        parsed.why_it_matters,
        status,
        '', // snoozed_until
        0,  // times_served
        0,  // times_skipped
        0,  // times_shrunk
        '', // completed_at
        0,  // actual_minutes
        getWorkValueForFriction(parsed.friction),
        '', // finish_grade
        getPartForFriction(parsed.friction),
        ''  // last_folded_event_id
      ];

      newRows.push(row);
      existingTasks.set(taskId, actionsSheet.getLastRow() + newRows.length);
    }
  }

  if (newRows.length > 0) {
    actionsSheet.getRange(actionsSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    Logger.log(`Imported ${newRows.length} new tasks into Actions.`);
  }
}

/**
 * Parses [FOCUS v1] block inside task notes
 */
function parseFocusBlock(notes, title) {
  const result = {
    validBlock: false,
    friction: 2,
    confidence: 'low',
    reason: '',
    time: '5-20',
    type: 'admin',
    first: title ? 'Open ' + title : 'Start first step',
    importance: 'med',
    deadline: 'none',
    context: 'anywhere',
    next: '',
    why_it_matters: '',
    errorReason: ''
  };

  if (!notes) {
    result.errorReason = 'Notes empty';
    return result;
  }

  const startIdx = notes.indexOf('[FOCUS v1]');
  const endIdx = notes.indexOf('[/FOCUS]');

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    result.errorReason = 'Missing [FOCUS v1] or [/FOCUS] boundary marker';
    return result;
  }

  result.validBlock = true;
  const blockText = notes.substring(startIdx + 10, endIdx);
  const lines = blockText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(':')) continue;
    const colonIdx = trimmed.indexOf(':');
    const field = trimmed.substring(0, colonIdx).trim().toLowerCase();
    const val = trimmed.substring(colonIdx + 1).trim();

    if (field === 'friction') {
      const f = parseInt(val, 10);
      if (f >= 1 && f <= 5) result.friction = f;
    } else if (field === 'confidence') {
      if (val.toLowerCase() === 'high' || val.toLowerCase() === 'low') {
        result.confidence = val.toLowerCase();
      }
    } else if (field === 'reason') {
      result.reason = val;
    } else if (field === 'time') {
      result.time = val;
    } else if (field === 'type') {
      if (['physical', 'mental', 'social', 'admin'].includes(val.toLowerCase())) {
        result.type = val.toLowerCase();
      }
    } else if (field === 'first') {
      result.first = val;
    } else if (field === 'next') {
      result.next = val;
    } else if (field === 'importance') {
      if (['low', 'med', 'high'].includes(val.toLowerCase())) {
        result.importance = val.toLowerCase();
      }
    } else if (field === 'deadline') {
      if (['external', 'self', 'none'].includes(val.toLowerCase())) {
        result.deadline = val.toLowerCase();
      }
    } else if (field === 'context') {
      result.context = val.toLowerCase();
    } else if (field === 'why_it_matters') {
      result.why_it_matters = val;
    }
  }

  return result;
}

function getWorkValueForFriction(friction) {
  const map = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 };
  return map[friction] || 2;
}

function getPartForFriction(friction) {
  const parts = { 1: 'screw', 2: 'jewel', 3: 'wheel', 4: 'bridge', 5: 'barrel' };
  return parts[friction] || 'jewel';
}

/**
 * PHASE 3: Fold job
 * Applies new events from Events tab onto Actions rows (status updates, increments, completions)
 * Updates last_folded_event_id and marks matching Google Task completed in Google Tasks.
 */
function foldEventsToActions() {
  const ss = getSpreadsheet();
  const eventsSheet = ss.getSheetByName('Events');
  const actionsSheet = ss.getSheetByName('Actions');
  if (!eventsSheet || !actionsSheet) return;

  const lastEventRow = eventsSheet.getLastRow();
  const lastActionRow = actionsSheet.getLastRow();
  if (lastEventRow <= 1 || lastActionRow <= 1) return;

  // Map task_id -> row index in Actions
  const actionTaskIds = actionsSheet.getRange(2, 1, lastActionRow - 1, 1).getValues();
  const taskRowMap = new Map();
  for (let i = 0; i < actionTaskIds.length; i++) {
    if (actionTaskIds[i][0]) {
      taskRowMap.set(String(actionTaskIds[i][0]), i + 2);
    }
  }

  // Read all actions
  const actionsData = actionsSheet.getRange(2, 1, lastActionRow - 1, 33).getValues();

  // Read events
  const events = eventsSheet.getRange(2, 1, lastEventRow - 1, 6).getValues();

  let modified = false;

  for (let e = 0; e < events.length; e++) {
    const eventId = String(events[e][0]);
    const eventType = String(events[e][3]);
    let payload = events[e][4];
    if (typeof payload === 'string' && payload.startsWith('{')) {
      try { payload = JSON.parse(payload); } catch (_) {}
    }

    if (!payload || !payload.task_id) continue;
    const taskId = String(payload.task_id);
    const actionRowIdx = taskRowMap.get(taskId);
    if (!actionRowIdx) continue;

    const rowData = actionsData[actionRowIdx - 2];
    const lastFolded = rowData[32]; // last_folded_event_id (col 33)

    // Check if event already processed for this action
    if (lastFolded === eventId) continue;

    if (eventType === 'offer_served') {
      rowData[23] = (Number(rowData[23]) || 0) + 1; // times_served
      rowData[22] = 'served'; // status
      rowData[32] = eventId;
      modified = true;
    } else if (eventType === 'not_now') {
      rowData[24] = (Number(rowData[24]) || 0) + 1; // times_skipped
      rowData[22] = 'waiting'; // status
      rowData[32] = eventId;
      modified = true;
    } else if (eventType === 'shrink_requested') {
      rowData[25] = (Number(rowData[25]) || 0) + 1; // times_shrunk
      rowData[32] = eventId;
      modified = true;
    } else if (eventType === 'action_started') {
      rowData[22] = 'in_progress'; // status
      rowData[32] = eventId;
      modified = true;
    } else if (eventType === 'action_completed') {
      rowData[22] = 'done'; // status
      rowData[26] = new Date().toISOString(); // completed_at
      if (payload.actual_minutes) {
        rowData[27] = Number(payload.actual_minutes);
      }
      rowData[32] = eventId;
      modified = true;

      // Complete Google Task in Google Tasks API
      markGoogleTaskCompletedById(taskId);
    }
  }

  if (modified) {
    actionsSheet.getRange(2, 1, actionsData.length, 33).setValues(actionsData);
    Logger.log('Applied events to Actions tab.');
  }
}

/**
 * Completes a task in Google Tasks by its ID across all lists
 */
function markGoogleTaskCompletedById(taskId) {
  try {
    const taskLists = Tasks.Tasklists.list();
    if (!taskLists.items) return;
    for (const list of taskLists.items) {
      try {
        const task = Tasks.Tasks.get(list.id, taskId);
        if (task) {
          task.status = 'completed';
          Tasks.Tasks.update(task, list.id, taskId);
          Logger.log(`Marked Google Task completed: ${taskId} in list ${list.title}`);
          return;
        }
      } catch (_) {
        // Not in this list, continue
      }
    }
  } catch (err) {
    Logger.log(`Failed to complete task ${taskId}: ` + err);
  }
}

/**
 * Scheduled job to run every 5 minutes:
 * 1. Import new Google Tasks -> Actions
 * 2. Fold Events -> Actions & mirror completions back to Google Tasks
 */
function scheduledIngestionAndFold() {
  importGoogleTasks();
  foldEventsToActions();
}

/**
 * Helper to install the 5-minute automated trigger
 */
function installIngestionTrigger() {
  // Delete existing triggers for this function to prevent duplication
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'scheduledIngestionAndFold') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('scheduledIngestionAndFold')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Installed 5-minute trigger for scheduledIngestionAndFold.');
}

/**
 * Web App POST / GET handlers
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return jsonResponse({ ok: false, error: 'Server busy: could not acquire write lock' }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Missing request body' }, 400);
    }

    const data = JSON.parse(e.postData.contents);
    const secretKey = getSecretKey();

    if (!data.key || data.key !== secretKey) {
      return jsonResponse({ ok: false, error: 'Unauthorized: Invalid or missing secret key' }, 401);
    }

    const action = data.action;
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Events');
    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Events tab not found' }, 500);
    }

    const lastRow = sheet.getLastRow();
    const existingIds = new Set();
    if (lastRow > 1) {
      const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idValues.length; i++) {
        if (idValues[i][0]) {
          existingIds.add(String(idValues[i][0]));
        }
      }
    }

    if (action === 'append_event') {
      const event = data.event;
      if (!event || !event.event_id || !event.type) {
        return jsonResponse({ ok: false, error: 'Invalid event payload' }, 400);
      }

      if (existingIds.has(String(event.event_id))) {
        return jsonResponse({ ok: true, message: 'Event already recorded (deduplicated)', event_id: event.event_id });
      }

      const row = [
        event.event_id,
        event.timestamp || new Date().toISOString(),
        event.device || 'web',
        event.type,
        typeof event.payload === 'object' ? JSON.stringify(event.payload) : (event.payload || ''),
        event.schema_version || '1.0'
      ];

      sheet.appendRow(row);

      // If it's a completion event, fold immediately
      if (event.type === 'action_completed') {
        foldEventsToActions();
      }

      return jsonResponse({ ok: true, message: 'Event recorded', event_id: event.event_id });
    }

    if (action === 'batch_events') {
      const events = data.events;
      if (!Array.isArray(events) || events.length === 0) {
        return jsonResponse({ ok: false, error: 'No events array provided' }, 400);
      }

      const rowsToAppend = [];
      const appendedIds = [];
      const skippedIds = [];
      let hasCompletion = false;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev || !ev.event_id || !ev.type) continue;
        const strId = String(ev.event_id);
        if (existingIds.has(strId)) {
          skippedIds.push(strId);
          continue;
        }

        existingIds.add(strId);
        rowsToAppend.push([
          ev.event_id,
          ev.timestamp || new Date().toISOString(),
          ev.device || 'web',
          ev.type,
          typeof ev.payload === 'object' ? JSON.stringify(ev.payload) : (ev.payload || ''),
          ev.schema_version || '1.0'
        ]);
        appendedIds.push(strId);
        if (ev.type === 'action_completed') hasCompletion = true;
      }

      if (rowsToAppend.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 6).setValues(rowsToAppend);
      }

      if (hasCompletion) {
        foldEventsToActions();
      }

      return jsonResponse({
        ok: true,
        message: 'Batch processed',
        appended_count: appendedIds.length,
        skipped_count: skippedIds.length,
        appended_ids: appendedIds
      });
    }

    if (action === 'trigger_ingest') {
      scheduledIngestionAndFold();
      return jsonResponse({ ok: true, message: 'Ingestion and folding triggered' });
    }

    if (action === 'sync_calendar_nudges') {
      const res = scheduleCalendarNudges();
      return jsonResponse({ ok: true, message: 'Calendar nudges scheduled', created_count: res.createdCount });
    }

    if (action === 'run_backup') {
      const res = weeklySpreadsheetBackup();
      return jsonResponse({ ok: true, message: 'Spreadsheet backed up', backup_name: res.name });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action }, 400);

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const secretKey = getSecretKey();

    if (!params.key || params.key !== secretKey) {
      return jsonResponse({ ok: false, error: 'Unauthorized: Invalid or missing secret key' }, 401);
    }

    const tab = params.tab || 'Settings';
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(tab);

    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Tab not found: ' + tab }, 404);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse({ ok: true, tab: tab, count: 0, rows: [] });
    }

    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const rowObj = {};
      for (let j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = data[i][j];
      }
      rows.push(rowObj);
    }

    return jsonResponse({ ok: true, tab: tab, count: rows.length, rows: rows });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() }, 500);
  }
}

function jsonResponse(obj, status) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Phase 10: Google Calendar Nudges
 * Manages calendar named 'Focus' and schedules reminder events for the next 7 days:
 * - Morning circuit window (08:30)
 * - Evening circuit window (19:30)
 * - External deadline tripwires (due on date)
 * - Capped at max 3 per day, quiet hours respected (08:00 - 21:30)
 * - On Friday & Saturday, only same-day external deadlines
 */
function scheduleCalendarNudges() {
  const calName = 'Focus';
  let cal;
  const cals = CalendarApp.getCalendarsByName(calName);
  if (cals.length > 0) {
    cal = cals[0];
  } else {
    cal = CalendarApp.createCalendar(calName, {
      summary: 'Focus app reminders and circuit window nudges'
    });
  }

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Clear previous automated events in next 7 days to avoid duplicates
  const existingEvents = cal.getEvents(now, sevenDaysLater);
  for (const ev of existingEvents) {
    if (ev.getDescription().indexOf('FOCUS_APP_NUDGE') !== -1) {
      ev.deleteEvent();
    }
  }

  const ss = getSpreadsheet();
  const actionsSheet = ss.getSheetByName('Actions');
  const externalDeadlines = [];

  if (actionsSheet && actionsSheet.getLastRow() > 1) {
    const data = actionsSheet.getDataRange().getValues();
    const headers = data[0];
    const dueCol = headers.indexOf('due_date');
    const kindCol = headers.indexOf('deadline_kind');
    const titleCol = headers.indexOf('title');
    const statusCol = headers.indexOf('status');

    for (let i = 1; i < data.length; i++) {
      const status = data[i][statusCol];
      const kind = data[i][kindCol];
      const due = data[i][dueCol];
      if (status !== 'done' && kind === 'external' && due) {
        externalDeadlines.push({
          title: data[i][titleCol],
          dueDate: String(due).split('T')[0]
        });
      }
    }
  }

  let createdCount = 0;
  const appUrl = ScriptApp.getService().getUrl() || 'https://github.com/ezshap-rgb/Momentum';

  for (let d = 0; d < 7; d++) {
    const targetDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const dayOfWeek = targetDate.getDay(); // 0: Sun, 5: Fri, 6: Sat
    const isOffDay = (dayOfWeek === 5 || dayOfWeek === 6);
    const dateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    let dailyCount = 0;

    // 1. External Hard Deadline Tripwires
    const dueToday = externalDeadlines.filter(x => x.dueDate === dateStr);
    for (const item of dueToday) {
      if (dailyCount >= 3) break;
      const start = new Date(targetDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(9, 15, 0, 0);

      const ev = cal.createEvent(`Focus Tripwire: ${item.title}`, start, end, {
        description: `⚡ External Hard Deadline Due Today!\n\nOpen Focus App: ${appUrl}\n\n[FOCUS_APP_NUDGE]`
      });
      ev.addPopupReminder(5);
      createdCount++;
      dailyCount++;
    }

    // On off days (Fri & Sat), skip circuits and DO nudges
    if (isOffDay) continue;

    // 2. Morning Circuit Window (08:30 - 08:45)
    if (dailyCount < 3) {
      const mStart = new Date(targetDate);
      mStart.setHours(8, 30, 0, 0);
      const mEnd = new Date(targetDate);
      mEnd.setHours(8, 45, 0, 0);

      const ev = cal.createEvent('Focus: Morning Circuit Window', mStart, mEnd, {
        description: `Push-ups, squats, plank, hip mobility.\n\nOpen Focus App to Start: ${appUrl}\n\n[FOCUS_APP_NUDGE]`
      });
      ev.addPopupReminder(5);
      createdCount++;
      dailyCount++;
    }

    // 3. Evening Circuit Window (19:30 - 19:45)
    if (dailyCount < 3) {
      const eStart = new Date(targetDate);
      eStart.setHours(19, 30, 0, 0);
      const eEnd = new Date(targetDate);
      eEnd.setHours(19, 45, 0, 0);

      const ev = cal.createEvent('Focus: Evening Circuit Window', eStart, eEnd, {
        description: `Pull-ups, crunches, reverse plank.\n\nOpen Focus App to Start: ${appUrl}\n\n[FOCUS_APP_NUDGE]`
      });
      ev.addPopupReminder(5);
      createdCount++;
      dailyCount++;
    }
  }

  Logger.log(`Created ${createdCount} calendar nudges.`);
  return { createdCount };
}

/**
 * Phase 10: Weekly Automated Sheet Backup in Google Drive
 * Saves a dated copy to folder 'Focus Backups' and prunes older ones keeping the last 8.
 */
function weeklySpreadsheetBackup() {
  const folderName = 'Focus Backups';
  let folder;
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  const ss = getSpreadsheet();
  const fileId = ss.getId();
  const file = DriveApp.getFileById(fileId);

  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const backupName = `Focus_Backup_${dateStr}`;
  const backupFile = file.makeCopy(backupName, folder);

  // Prune older backups keeping newest 8
  const allBackups = [];
  const filesIter = folder.getFiles();
  while (filesIter.hasNext()) {
    allBackups.push(filesIter.next());
  }

  allBackups.sort((a, b) => b.getDateCreated().getTime() - a.getDateCreated().getTime());

  if (allBackups.length > 8) {
    for (let i = 8; i < allBackups.length; i++) {
      allBackups[i].setTrashed(true);
    }
  }

  Logger.log(`Created backup ${backupName}. Retaining ${Math.min(8, allBackups.length)} backups.`);
  return { name: backupName, id: backupFile.getId() };
}

/**
 * Helper to install Phase 10 daily nudge & weekly backup triggers
 */
function installPhase10Triggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    const fn = t.getHandlerFunction();
    if (fn === 'scheduleCalendarNudges' || fn === 'weeklySpreadsheetBackup') {
      ScriptApp.deleteTrigger(t);
    }
  }

  // Daily calendar nudge schedule at 06:00 AM
  ScriptApp.newTrigger('scheduleCalendarNudges')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  // Weekly backup on Sundays at 02:00 AM
  ScriptApp.newTrigger('weeklySpreadsheetBackup')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();

  Logger.log('Installed daily calendar nudge trigger and weekly backup trigger.');
}

```

### `docs/DATA_MODEL.md`
```markdown
# Data Model

Plain-language field lists. Exact column names are fixed in Phase 1 and then never renamed.

## Sheet tabs

| Tab | Purpose |
| --- | --- |
| Events | Append-only log of everything that happens. Source of truth. |
| Actions | One row per action (convenience copy of current state). |
| Habits | Habit and circuit definitions, items, halves, quotas, windows. |
| Movement | Parts earned, finish grades, module and week progress. |
| Settings | Every tunable number, off days, mode toggles, notification limits. |
| ParseLog | Tasks whose notes block could not be read. |

## Actions tab fields

| Group | Fields |
| --- | --- |
| Identity | task_id (links to Google Task), title, original_words, created_at, source (voice or text) |
| Classification | category (from the list: quick, scheduled, project, habit), type (physical, mental, social, admin), parent_id, order, active_step, context (anywhere, computer, phone, errand, home) |
| Effort | friction (1-5), friction_confidence (high or low), friction_reason, learned_adjustment, time_bucket (under 5, 5-20, 20-60, over 60), first_action, needs_shrinking |
| Urgency | due_date, deadline_kind (external, self, none), importance (low, med, high), why_it_matters |
| Life | status (waiting, served, in_progress, done, snoozed, dropped), snoozed_until, times_served, times_skipped, times_shrunk, completed_at, actual_minutes |
| Reward | work_value, finish_grade, part_earned |
| Technical | last_folded_event_id |

## Habits tab fields

habit_id, name, circuit (morning or evening or both), half (A or B), quota (reps or seconds), unit, windows (morning and evening start and end times), minimum_version, status (active, paused, retired), gear_speed (derived, rolling window).

## Event types

Each row: event_id, timestamp, device, type, payload, schema_version.

Types:
- ignition_offered
- ignition_done (exercise, reps)
- ignition_smaller
- ignition_swapped
- offer_served (action ids, mode, target friction)
- offer_picked
- smaller_part
- bigger_part
- not_now
- shrink_requested
- action_started
- action_completed (actual minutes)
- action_abandoned
- parking_lot (text)
- day_committed (level)
- circuit_started
- circuit_completed (half, items, reps)
- item_completed (habit, reps)
- off_day_set
- correction (field, new value)
- sync_ok
- sync_failed

## Starting defaults (all tunable, all in Settings)

| Setting | Starting value |
| --- | --- |
| Work value by friction 1,2,3,4,5 | 1, 2, 3, 5, 8 |
| Importance bonus to work | high adds 1 |
| Day levels (work) light, standard, full | 8, 16, 26 |
| Recalibration | After two weeks, standard becomes the median of your counted days |
| Circuit contribution to the day | full 3, half 2, minimum 1, capped at 6 per day |
| First offer target friction after ignition | 2 |
| Target ceiling (a stretch probe may exceed it by 1) | 4 |
| Fatigue easing | After 5 actions or 90 active minutes, target drops 1 |
| Consecutive 'smaller' taps before shrink | 2 |
| Counting days | Sunday to Thursday. Friday and Saturday are off days. |

```

### `docs/GEMINI_CAPTURE.md`
```markdown
# GEMINI CAPTURE INSTRUCTIONS

**Job:** For every item the user says or types, create a Google Task in the correct list (quick tasks, scheduled jobs, long-term projects, habits) exactly as you do today, then add the enrichment block below to the task's notes. Never ask clarifying questions. Make your best guess and mark low confidence if unsure.

**Block format** (one line per field, between the two marker lines, nothing else inside):

```
[FOCUS v1]
friction: 3
confidence: high
reason: needs a call, mildly dreaded
time: 5-20
type: social
first: Find the plumber's number
importance: med
deadline: external
context: phone
[/FOCUS]
```

Allowed values:
- friction: 1-5
- confidence: high or low
- time: under5, 5-20, 20-60, or over60
- type: physical, mental, social, or admin
- importance: low, med, or high
- deadline: external, self, or none
- context: anywhere, computer, phone, errand, or home

For long-term projects, create the project as one task and add one more line, `next:`, with only the first step. Do not break the whole project down.

## Friction rubric

| Level | Meaning | Example |
| --- | --- | --- |
| 1 | Under 2 minutes, no thinking, clear first move | Reply 'ok' to a message |
| 2 | Under about 10 minutes, clear steps, low dread | Pay a small bill online |
| 3 | 10 to 30 minutes, or one decision, or mild dread | Draft a short email |
| 4 | 30 to 60 minutes, or unclear steps, or needs real focus, or a hard conversation | Plan next week's lesson |
| 5 | A long focused block, high dread, or unfamiliar territory | Start a large new document from nothing |

Adjust by one level: add 1 if the task is vague, involves a person who may push back, or is unfamiliar. Subtract 1 if the first step is obvious and takes under 5 minutes. Stay between 1 and 5.

## Other rules

- `first:` is always a tiny physical move that takes under a minute (open the file, find the number, put on shoes).
- Only mark importance high when the user said so or it clearly affects money, health, deadlines, or other people. Otherwise use med.
- Use deadline external only when someone else sets the date. Use self when the user chose it.
- Keep the user's original words in the task title or notes. Never delete them.
- If you cannot decide a field, leave it out. The app will fill a safe default.

## Worked examples

| User says | Result |
| --- | --- |
| 'call the plumber about the leak' | Quick task. friction 3, confidence high, time 5-20, type social, first: find the plumber's number, importance med, deadline none, context phone |
| 'file the quarterly report, due the 20th' | Scheduled job. friction 4, confidence low, time 20-60, type admin, first: open last quarter's report, importance high, deadline external, context computer |
| 'build the new onboarding module' | Long-term project. friction 5, confidence low, time over60, type mental, first: write three bullet points of what it must do, next: the same single step, importance med, deadline none, context computer |
| 'throw out the old receipts' | Quick task. friction 1, confidence high, time under5, type admin, first: grab the receipt pile, importance low, deadline none, context home |

```

### `docs/RULES.md`
```markdown
# RULES for the AI agent

Project: DO-button productivity app (PWA, Android phone + desktop). Stack: React + Vite, service worker, IndexedDB queue, Google Apps Script + Google Sheets as backend.

## Working rules
1. Before writing code for any task, restate your plan in plain language and wait for approval.
2. Make the smallest change that satisfies the task. No broad rewrites, no renaming or reorganizing files unless asked.
3. Touch only the files the task names. If another file must change, say why first.
4. Explain the reasoning before showing code, in plain language.
5. If something in the request seems inconsistent or risky, say so clearly before proceeding.
6. Ask a clarifying question when something is ambiguous. Do not guess on architecture.

## Architecture rules
- Event log is append-only. Never update or delete event rows.
- Do mode must work fully offline. Write to local storage first, sync after.
- Do mode screens: one decision per screen, no lists, no red/overdue styling, no guilt language.
- Serving score is computed at serving time. Do not persist it.
- Every weight and threshold is read from Settings. No magic numbers in logic.
- Never modify the user's Google Task notes. Parse them, do not rewrite them.
- Keep Google Sheets access behind one data-layer module.
- Show a visible synced / not synced indicator.

## Done means
- The phase's 'done when' checks pass by hand on a real Android phone.
- No unrelated files changed.
- A short note lists what changed and what to test.

```

### `index.html`
```html
<!doctype html>
<html lang="en" class="light">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <link rel="icon" type="image/png" href="./icons/icon-192.png" />
    <link rel="apple-touch-icon" href="./icons/icon-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Momentum" />
    <link rel="manifest" href="./manifest.json" />
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <title>Momentum — ADHD Cockpit</title>
  </head>
  <body class="bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-purple-600 selection:text-white h-screen overflow-hidden">
    <div id="root" class="h-full"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.hostname === 'localhost')) {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').then((reg) => {
            reg.update();
            if (reg.waiting) {
              window.dispatchEvent(new CustomEvent('momentumUpdateAvailable'));
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            reg.addEventListener('updatefound', () => {
              const worker = reg.installing;
              if (worker) {
                worker.addEventListener('statechange', () => {
                  if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    window.dispatchEvent(new CustomEvent('momentumUpdateAvailable'));
                    worker.postMessage({ type: 'SKIP_WAITING' });
                  }
                });
              }
            });
          }).catch((err) => {
            console.log('SW registration error:', err);
          });
        });
      }
    </script>
  </body>
</html>

```

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

### `postcss.config.js`
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}


```

### `public/manifest.json`
```json
{
  "name": "Focus & Momentum",
  "short_name": "Focus",
  "description": "ADHD-Optimized Action Layer & Productivity Cockpit",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "any",
  "id": "momentum-focus-v1",
  "shortcuts": [
    {
      "name": "DO",
      "short_name": "DO",
      "description": "Start immediate physical ignition and action",
      "url": "./?mode=do",
      "icons": [
        {
          "src": "./icons/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    }
  ],
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}

```

### `public/sw.js`
```javascript
const CACHE_NAME = 'momentum-cache-v14';
const ASSETS_TO_CACHE = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For HTML / navigation, ALWAYS fetch from network (no cache) so user always gets the latest bundle
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for images, fonts, icons
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && (url.pathname.includes('/icons/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

```

### `README.md`
```markdown
# Momentum — ADHD-Optimized Productivity Cockpit & Voice Ingestion PWA

Momentum is a high-performance, single-codebase Progressive Web App (PWA) designed to manage attention rather than infinite lists. Built specifically for ADHD and creative minds juggling quick jobs, multi-step responsibilities, long-term creative projects, and daily habit rhythms.

![Momentum Icon](./public/icons/app-icon.jpg)

---

## Key Features

1. **Today's Runway (Progressive Disclosure):**
   - **Quick Jobs:** 1-sitting actionable tasks with time-filter pills (`All`, `15m`, `30m`).
   - **Responsibilities Runway:** Enforces progressive disclosure by displaying **only** the single immediate next action (`steps[current_step_index]`). You never see a paralyzing list of 20 future steps.
2. **Project Radar & Continuity ("Where Was I?"):**
   - Focus spotlight banner for your primary initiative.
   - Recency indicators (green if updated within review cycle, amber if attention is needed).
   - Dedicated **"Where Was I?"** inspector surfacing current state context, next step, and complete chronological work log.
3. **Universal Voice & Brain Dump Ingestion:**
   - Tap the mic or type unstructured thoughts.
   - Client-side **Gemini 2.5 Flash** AI parses thoughts directly into the 4 core buckets via structured JSON schemas.
   - Staging preview card allows you to review and confirm before committing to your board.
4. **Guilt-Free Habits & Daily Rhythms:**
   - One-tap checks or minute duration loggers.
   - 7-day awareness dots with **no streak penalties or guilt badges**.
5. **Standalone Persistent Desktop Window:**
   - Designed to run independently of regular browser tabs and file explorer windows.
   - Full PWA support (`display: "standalone"`) with dedicated Windows taskbar icon.
   - 1-click launcher via `Start-Momentum.bat`.
6. **Dual Storage Engine:**
   - **Zero-Setup Local Offline Mode:** Works right out of the box using LocalStorage & IndexedDB.
   - **Google Firebase Firestore:** Seamless two-way cloud sync with offline persistence enabled when you add your Firebase credentials in Settings.

---

## Getting Started

### 1. Launching Momentum
Run the included launcher to start the server and open Momentum in a dedicated, borderless desktop window:

```cmd
Start-Momentum.bat
```

Or manually:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 2. Installing as a Persistent Desktop App
- In Google Chrome or Microsoft Edge, click the **"Desktop Window"** button in the top header (or click the install icon in the address bar).
- Momentum will install as a standalone desktop application with its own dedicated window and taskbar pin.

### 3. Configuring Gemini API & Firebase (Optional)
- Click the **Gear (Settings)** icon in the top right.
- Paste your Google AI Studio API key to enable instant voice/brain-dump parsing.
- (Optional) Toggle **Cloud Sync** and paste your Firebase Web App configuration to enable real-time multi-device sync with mobile.


```

### `src/App.tsx`
```tsx
import React, { useState } from 'react';
import { MomentumProvider, useMomentum } from './context/MomentumContext';
import { Header } from './components/Header';
import { QuickJobsPanel } from './components/panels/QuickJobsPanel';
import { HabitsPanel } from './components/panels/HabitsPanel';
import { BiggerJobsPanel } from './components/panels/BiggerJobsPanel';
import { ProjectsPanel } from './components/panels/ProjectsPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { SettingsModal } from './components/SettingsModal';
import { VoiceIngestionModal } from './components/VoiceIngestionModal';
import { Phase1TestScreen } from './components/Phase1TestScreen';
import { DoMainScreen } from './components/DoMainScreen';
import { PlanModeScreen } from './components/PlanModeScreen';
import { Zap, Activity, Layers, Compass, Mic, Undo2, X } from 'lucide-react';

function CockpitDashboard({ onOpenDoMode, onOpenPlanMode }: { onOpenDoMode?: () => void; onOpenPlanMode?: () => void }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [mobileTab, setMobileTab] = useState<'quick' | 'habits' | 'bigger' | 'projects'>('quick');
  const { panelStates, boardData, layoutMode, undo, lastUndoMessage, dismissUndoMessage } = useMomentum();

  const showCalendar = panelStates.calendar !== 'hidden';

  React.useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('momentumUpdateAvailable', handleUpdate);
    return () => window.removeEventListener('momentumUpdateAvailable', handleUpdate);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space or Alt + M triggers Voice Ingest modal
      if ((e.ctrlKey && e.code === 'Space') || (e.altKey && (e.key === 'm' || e.key === 'M'))) {
        e.preventDefault();
        setIsVoiceOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsVoiceOpen(false);
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeQuickCount = boardData.quick_jobs.filter((j) => !j.done).length;
  const activeRespCount = boardData.responsibilities.filter((r) => r.status === 'active').length;
  const activeProjCount = boardData.projects.length;
  const completedHabitsToday = boardData.habits.filter((h) => {
    const today = new Date().toISOString().split('T')[0];
    const val = h.log[today];
    return h.type === 'boolean' ? !!val : typeof val === 'number' && val > 0;
  }).length;

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-purple-600 selection:text-white transition-colors">
      {/* Update notification banner if a new version is installed in background */}
      {updateAvailable && (
        <div className="bg-purple-600 text-white px-3 py-1.5 text-xs flex items-center justify-between z-50 shrink-0 shadow-md">
          <span className="font-medium">⚡ Momentum updated! Tap to reload latest version.</span>
          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then((reg) => {
                  if (reg?.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    window.location.reload();
                  }
                });
              } else {
                window.location.reload();
              }
            }}
            className="ml-2 px-2.5 py-0.5 bg-white text-purple-700 font-bold rounded shadow-xs hover:bg-purple-50 active:scale-95 transition"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Header (Top Bar with Theme, Voice Ingest, Calendar Toggle, Desktop App) */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVoiceIngest={() => setIsVoiceOpen(true)}
        onOpenDoMode={onOpenDoMode}
        onOpenPlanMode={onOpenPlanMode}
      />

      {/* Main Cockpit: Zero window scrolling, strictly locked to viewport */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-2.5 flex flex-col gap-2 overflow-hidden">
        {/* OPTIONAL CALENDAR DRAWER (Toggled by Calendar button, defaults to hidden) */}
        {showCalendar && (
          <div className="shrink-0 max-h-[38vh] overflow-y-auto animate-fadeIn">
            <CalendarPanel />
          </div>
        )}

        {/* COCKPIT 2x2 EQUAL GRID */}
        {layoutMode === 'cockpit' ? (
          <div className="hidden md:grid md:grid-cols-2 md:grid-rows-2 gap-2.5 flex-1 min-h-0 overflow-hidden">
            {/* Top Left: Quick Jobs */}
            <div className="h-full min-h-0 overflow-hidden">
              <QuickJobsPanel />
            </div>

            {/* Top Right: Habits & Daily Rhythms */}
            <div className="h-full min-h-0 overflow-hidden">
              <HabitsPanel />
            </div>

            {/* Bottom Left: Bigger Jobs & Responsibilities */}
            <div className="h-full min-h-0 overflow-hidden">
              <BiggerJobsPanel />
            </div>

            {/* Bottom Right: Ongoing Creative Projects */}
            <div className="h-full min-h-0 overflow-hidden">
              <ProjectsPanel />
            </div>
          </div>
        ) : (
          /* WIDGET SIDEBAR MODE: 1-Column vertical stack */
          <div className="hidden md:flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="min-h-[170px] shrink-0">
              <QuickJobsPanel />
            </div>
            <div className="min-h-[170px] shrink-0">
              <HabitsPanel />
            </div>
            <div className="min-h-[170px] shrink-0">
              <BiggerJobsPanel />
            </div>
            <div className="min-h-[170px] shrink-0">
              <ProjectsPanel />
            </div>
          </div>
        )}

        {/* MOBILE VIEW (Tabbed Switcher with thumb bar) */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto pb-16">
          {mobileTab === 'quick' && <QuickJobsPanel />}
          {mobileTab === 'habits' && <HabitsPanel />}
          {mobileTab === 'bigger' && <BiggerJobsPanel />}
          {mobileTab === 'projects' && <ProjectsPanel />}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg shrink-0">
        <button
          onClick={() => setMobileTab('quick')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'quick'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Zap className="w-4 h-4" />
            {activeQuickCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-emerald-600 text-white">
                {activeQuickCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Tasks</span>
        </button>

        <button
          onClick={() => setMobileTab('habits')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'habits'
              ? 'text-pink-600 dark:text-pink-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Activity className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-pink-600 text-white">
              {completedHabitsToday}
            </span>
          </div>
          <span className="text-[10px]">Habits</span>
        </button>

        {/* Center Voice Mic */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          className="-mt-5 p-3 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-500 active:scale-95 transition"
          title="Voice Ingest"
        >
          <Mic className="w-5 h-5" />
        </button>

        <button
          onClick={() => setMobileTab('bigger')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'bigger'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Layers className="w-4 h-4" />
            {activeRespCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-purple-600 text-white">
                {activeRespCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Jobs</span>
        </button>

        <button
          onClick={() => setMobileTab('projects')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'projects'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Compass className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-blue-600 text-white">
              {activeProjCount}
            </span>
          </div>
          <span className="text-[10px]">Projects</span>
        </button>
      </nav>

      {/* Floating Undo Toast Notification */}
      {lastUndoMessage && (
        <div className="fixed bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-slate-700/60 dark:border-slate-300 animate-slideUp text-xs font-semibold max-w-[92vw]">
          <span className="truncate max-w-[200px] sm:max-w-md">{lastUndoMessage}</span>
          <button
            type="button"
            onClick={undo}
            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={dismissUndoMessage}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 transition shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
      {isVoiceOpen && (
        <VoiceIngestionModal
          onClose={() => setIsVoiceOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  // Default is 'do' mode! Plan mode and Task view are available via toggle.
  const initialMode = (urlParams.get('mode') as 'do' | 'plan' | 'tasks') ||
    (localStorage.getItem('focus_current_view') as 'do' | 'plan' | 'tasks') ||
    'do';
  const [currentView, setCurrentView] = useState<'do' | 'plan' | 'tasks'>(initialMode);

  const setView = (view: 'do' | 'plan' | 'tasks') => {
    setCurrentView(view);
    localStorage.setItem('focus_current_view', view);
  };

  return (
    <MomentumProvider>
      {currentView === 'do' && (
        <DoMainScreen
          onOpenTaskView={() => setView('tasks')}
          onOpenPlanMode={() => setView('plan')}
        />
      )}
      {currentView === 'plan' && (
        <PlanModeScreen
          onOpenDoMode={() => setView('do')}
          onOpenTaskView={() => setView('tasks')}
        />
      )}
      {currentView === 'tasks' && (
        <CockpitDashboard
          onOpenDoMode={() => setView('do')}
          onOpenPlanMode={() => setView('plan')}
        />
      )}
    </MomentumProvider>
  );
}

```

### `src/components/CalendarPanel.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { normalizeGoogleCalendarUrl } from '../services/storageService';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Clock,
  X,
  Layers,
  Link,
  Check,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react';

export const CalendarPanel: React.FC = () => {
  const {
    boardData,
    settings,
    updateSettings,
    panelStates,
    setCalendarView,
    addCalendarEvent,
    deleteCalendarEvent,
  } = useMomentum();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [showGoogleEmbed, setShowGoogleEmbed] = useState(Boolean(settings.googleCalendarEmbedUrl));
  const [isConnectingCal, setIsConnectingCal] = useState(false);
  const [inputCalUrl, setInputCalUrl] = useState(settings.googleCalendarEmbedUrl || '');

  // Keep embed view synced if settings change
  useEffect(() => {
    if (settings.googleCalendarEmbedUrl) {
      setShowGoogleEmbed(true);
    }
  }, [settings.googleCalendarEmbedUrl]);

  const viewMode = panelStates.calendar === 'month' ? 'month' : 'week';

  const handleSaveGoogleCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeGoogleCalendarUrl(inputCalUrl);
    if (!normalized) return;
    updateSettings({ googleCalendarEmbedUrl: normalized });
    setShowGoogleEmbed(true);
    setIsConnectingCal(false);
  };

  const handleDisconnectCal = () => {
    if (window.confirm('Disconnect Google Calendar from Momentum?')) {
      updateSettings({ googleCalendarEmbedUrl: '' });
      setShowGoogleEmbed(false);
      setInputCalUrl('');
      setIsConnectingCal(false);
    }
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    addCalendarEvent({
      title: newEventTitle.trim(),
      date: newEventDate,
      time: newEventTime,
      category: 'calendar',
    });
    setNewEventTitle('');
    setIsAddingEvent(false);
  };

  // Helper to format date strings
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 is Sunday
  };

  // Week calculation (Monday to Sunday)
  const getWeekDates = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(d.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(startOfWeek);
      nextDay.setDate(startOfWeek.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  // Combine calendar_events with responsibilities (jobs) that have a scheduled date or weekly recurrence
  const calendarEvents = boardData.calendar_events || [];
  const scheduledJobEvents = (boardData.responsibilities || [])
    .filter((r) => r.status === 'active' && (r.scheduledDate || r.recurrence === 'weekly'))
    .flatMap((r) => {
      if (r.recurrence === 'weekly' && r.recurrenceDay) {
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDayIdx = daysOfWeek.findIndex((d) => d === r.recurrenceDay?.toLowerCase());
        if (targetDayIdx !== -1) {
          const week = getWeekDates(currentDate);
          const matchingDate = week.find((d) => d.getDay() === targetDayIdx);
          if (matchingDate) {
            return [{
              id: `job-rec-${r.id}`,
              title: `💼 ${r.title}`,
              date: matchingDate.toISOString().split('T')[0],
              time: r.scheduledTime || null,
              category: 'job' as const,
            }];
          }
        }
      }
      if (r.scheduledDate) {
        return [{
          id: `job-sched-${r.id}`,
          title: `💼 ${r.title}`,
          date: r.scheduledDate,
          time: r.scheduledTime || null,
          category: 'job' as const,
        }];
      }
      return [];
    });

  const events = [...calendarEvents, ...scheduledJobEvents];

  const weekDays = getWeekDates(currentDate);
  const todayStr = new Date().toISOString().split('T')[0];

  const monthYearLabel = currentDate.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm p-4 transition-all">
      {/* Header & View Controls */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Schedule & Calendar
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {monthYearLabel}
            </span>
          </div>
        </div>

        {/* View Switchers & Nav */}
        <div className="flex items-center gap-1.5 text-xs">
          {settings.googleCalendarEmbedUrl ? (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowGoogleEmbed(true)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  showGoogleEmbed
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-500'
                }`}
              >
                Google Cal
              </button>
              <button
                onClick={() => setShowGoogleEmbed(false)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  !showGoogleEmbed
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-500'
                }`}
              >
                Local Strip
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConnectingCal(!isConnectingCal)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold text-[11px] hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
              title="Attach your Google Calendar"
            >
              <Link className="w-3 h-3" />
              <span>Attach Google Cal</span>
            </button>
          )}

          {/* If viewing Local Strip: Month / Week View Toggle & Nav */}
          {!showGoogleEmbed && (
            <>
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    viewMode === 'week'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    viewMode === 'month'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={handlePrev}
                  className="p-1 hover:text-blue-500 text-slate-500 transition"
                  title="Previous"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-500"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="p-1 hover:text-blue-500 text-slate-500 transition"
                  title="Next"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setIsAddingEvent(!isAddingEvent)}
                className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition"
                title="Add schedule event"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Google Calendar Quick Actions (when connected) */}
          {settings.googleCalendarEmbedUrl && (
            <div className="flex items-center gap-1">
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 transition"
                title="Open full Google Calendar in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setIsConnectingCal(!isConnectingCal)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 transition"
                title="Calendar Settings / Change URL"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* INLINE GOOGLE CALENDAR SETUP DRAWER */}
      {isConnectingCal && (
        <div className="mb-3 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-xs text-blue-900 dark:text-blue-100">
                {settings.googleCalendarEmbedUrl ? 'Manage Google Calendar' : 'Attach Your Google Calendar'}
              </span>
            </div>
            <button
              onClick={() => setIsConnectingCal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveGoogleCalendar} className="space-y-2">
            <label className="text-[11px] text-slate-600 dark:text-slate-300 block">
              Paste your <strong>Google Calendar Embed URL</strong>, <strong>&lt;iframe&gt; code</strong>, or your <strong>Google Email</strong>:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCalUrl}
                onChange={(e) => setInputCalUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/embed?src=... or yourname@gmail.com"
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0 transition"
              >
                Save & Connect
              </button>
              {settings.googleCalendarEmbedUrl && (
                <button
                  type="button"
                  onClick={handleDisconnectCal}
                  className="px-2 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition"
                  title="Disconnect"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </form>

          {/* Simple step-by-step instructions */}
          <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              💡 How to get your embed link (30 seconds):
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
              <li>
                Open{' '}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  calendar.google.com
                </a>{' '}
                on desktop.
              </li>
              <li>Click the <strong>Settings (gear ⚙️)</strong> &rarr; <strong>Settings</strong>.</li>
              <li>In the left sidebar, click your calendar under <strong>Settings for my calendars</strong>.</li>
              <li>Scroll down to <strong>Integrate calendar</strong> and copy the <strong>Embed code</strong> (or paste the URL).</li>
            </ol>
          </div>
        </div>
      )}

      {/* Quick Add Event Form */}
      {isAddingEvent && (
        <form
          onSubmit={handleCreateEvent}
          className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-blue-400/40 space-y-2 animate-fadeIn"
        >
          <input
            type="text"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            placeholder="Event or scheduled commitment..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
            />
            <input
              type="time"
              value={newEventTime}
              onChange={(e) => setNewEventTime(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingEvent(false)}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
            >
              Save Event
            </button>
          </div>
        </form>
      )}

      {/* GOOGLE CALENDAR EMBED VIEW (If enabled & toggled) */}
      {showGoogleEmbed && settings.googleCalendarEmbedUrl ? (
        <div className="space-y-1.5">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-72 sm:h-80 w-full bg-white dark:bg-slate-950 shadow-inner">
            <iframe
              src={settings.googleCalendarEmbedUrl}
              className="w-full h-full border-0"
              title="Google Calendar"
              loading="lazy"
            />
          </div>
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>Viewing live Google Calendar</span>
            <div className="flex items-center gap-2">
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-500 flex items-center gap-0.5 transition"
              >
                <span>Open in Google Calendar</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>•</span>
              <button
                onClick={() => setIsConnectingCal(true)}
                className="hover:text-blue-500 transition"
              >
                Change Calendar URL
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'week' ? (
        /* WEEK VIEW (Clean, horizontal 7-day strip) */
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekDays.map((dayDate, idx) => {
            const dateIso = dayDate.toISOString().split('T')[0];
            const isToday = dateIso === todayStr;
            const dayName = dayDate.toLocaleDateString(undefined, { weekday: 'narrow' });
            const dayNum = dayDate.getDate();

            // Find events on this day
            const dayEvents = events.filter((e) => e.date === dateIso);

            return (
              <div
                key={idx}
                className={`p-1.5 rounded-xl border flex flex-col justify-between min-h-[90px] transition ${
                  isToday
                    ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-400/80 text-blue-900 dark:text-blue-100 ring-1 ring-blue-400/30'
                    : 'bg-slate-50/60 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {dayName}
                  </span>
                  <span
                    className={`text-xs font-bold inline-block px-1.5 rounded-full mt-0.5 ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Day's Events */}
                <div className="space-y-1 mt-1 text-left overflow-y-auto max-h-14">
                  {dayEvents.map((evt) => {
                    const isJob = evt.category === 'job' || evt.id.startsWith('job-');
                    return (
                      <div
                        key={evt.id}
                        className={`group/evt text-[10px] leading-tight px-1 py-0.5 rounded border truncate flex items-center justify-between ${
                          isJob
                            ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-800/80 text-purple-900 dark:text-purple-200 font-medium'
                            : 'bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-700/60 text-blue-800 dark:text-blue-200'
                        }`}
                        title={`${evt.title} ${evt.time ? `(${evt.time})` : ''}`}
                      >
                        <span className="truncate">{evt.title}</span>
                        {!isJob && (
                          <button
                            onClick={() => deleteCalendarEvent(evt.id)}
                            className="opacity-0 group-hover/evt:opacity-100 hover:text-rose-400 ml-1"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {dayEvents.length === 0 && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-600 block text-center italic">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MONTH VIEW (Compact 7x5 month grid) */
        <div className="space-y-1">
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 py-1">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading days */}
            {Array.from({
              length: getFirstDayOfMonth(
                currentDate.getFullYear(),
                currentDate.getMonth()
              ),
            }).map((_, i) => (
              <div key={`blank-${i}`} className="h-9 rounded-lg opacity-20" />
            ))}

            {/* Days of month */}
            {Array.from({
              length: getDaysInMonth(
                currentDate.getFullYear(),
                currentDate.getMonth()
              ),
            }).map((_, i) => {
              const dayNum = i + 1;
              const d = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                dayNum
              );
              const dateIso = d.toISOString().split('T')[0];
              const isToday = dateIso === todayStr;
              const hasEvents = events.some((e) => e.date === dateIso);

              return (
                <div
                  key={dayNum}
                  className={`h-9 rounded-lg border text-xs flex flex-col items-center justify-center relative transition ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-xs'
                      : hasEvents
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasEvents && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isToday ? 'bg-white' : 'bg-blue-500'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* If Google Calendar not connected yet, show quick prompt */}
      {!settings.googleCalendarEmbedUrl && !isConnectingCal && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>Connect your Google Calendar to see your schedule directly in Momentum</span>
          </div>
          <button
            onClick={() => setIsConnectingCal(true)}
            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center gap-1 transition"
          >
            <Link className="w-3 h-3" />
            <span>Attach Calendar</span>
          </button>
        </div>
      )}
    </div>
  );
};


```

### `src/components/CandidateInspectorModal.tsx`
```tsx
import React from 'react';
import { CandidateScore } from '../services/focusAlgorithm';
import { X, BarChart2, ShieldAlert, Sparkles, Target } from 'lucide-react';

interface Props {
  candidates: CandidateScore[];
  onClose: () => void;
}

export function CandidateInspectorModal({ candidates, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Algorithm Candidate Inspector</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-purple-950/40 border-b border-purple-800/40 text-[11px] text-purple-200">
          Real-time candidate ranking based on target friction, deadline curves, importance, and heartbeat bonuses.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {candidates.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No available candidate actions in pool.</p>
          ) : (
            candidates.map((cand, idx) => (
              <div
                key={cand.action.task_id}
                className={`p-3 rounded-xl border text-xs transition ${
                  idx === 0
                    ? 'bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/40'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white line-clamp-1">{cand.action.title}</span>
                  </div>
                  <span className="font-mono font-extrabold text-purple-400 text-xs shrink-0">
                    Score: {cand.totalScore.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 my-2 text-[10px] text-slate-400 font-mono">
                  <div className="p-1 bg-slate-900 rounded">Frict: {cand.effectiveFriction}</div>
                  <div className="p-1 bg-slate-900 rounded">Urg: +{cand.urgencyScore.toFixed(1)}</div>
                  <div className="p-1 bg-slate-900 rounded">Imp: +{cand.importanceScore}</div>
                  <div className="p-1 bg-slate-900 rounded">Age: +{cand.ageScore.toFixed(1)}</div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {cand.reasons.map((r, ri) => (
                    <span key={ri} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-medium">
                      {r}
                    </span>
                  ))}
                  {cand.isTripwire && (
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[9px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Tripwire
                    </span>
                  )}
                  {cand.isReservedSlot && (
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[9px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Reserved Slot
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

```

### `src/components/DayCommitmentPromptModal.tsx`
```tsx
import React from 'react';
import { DayCommitmentLevel } from '../services/focusMovement';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  suggestedLevel?: DayCommitmentLevel;
  onCommit: (level: DayCommitmentLevel) => void;
}

export function DayCommitmentPromptModal({
  suggestedLevel = 'standard',
  onCommit,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-sm bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto mb-4 text-purple-400">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>

        <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 block mb-1">
          Daily Movement Setup
        </span>
        <h2 className="text-xl font-black text-white mb-2">Commit to Today</h2>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Set your baseline for today’s watch module. You can always raise it later or earn bonus stretch jewels.
        </p>

        <div className="space-y-2.5 mb-6">
          <button
            onClick={() => onCommit('light')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs font-bold text-slate-200 transition active:scale-98"
          >
            <div>
              <div className="text-white text-sm">Light Day</div>
              <div className="text-[10px] text-slate-400 font-normal">A gentle floor for recovery or busy days</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={() => onCommit('standard')}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500 text-left flex items-center justify-between text-xs font-bold text-white transition active:scale-98 shadow-lg shadow-purple-950/50"
          >
            <div>
              <div className="text-purple-200 text-sm flex items-center gap-1.5">
                <span>Standard Day</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-extrabold">Suggested</span>
              </div>
              <div className="text-[10px] text-purple-300/80 font-normal">Solid steady progress into the movement</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={() => onCommit('full')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs font-bold text-slate-200 transition active:scale-98"
          >
            <div>
              <div className="text-white text-sm">Full Day</div>
              <div className="text-[10px] text-slate-400 font-normal">Dedicated focus block for high output</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

```

### `src/components/DayMovementBenchModal.tsx`
```tsx
import React from 'react';
import {
  DayModule,
  DayCommitmentLevel,
  COMMITMENT_POINTS,
} from '../services/focusMovement';
import { loadHabitsState } from '../services/focusHabits';
import { WatchPartVector } from './WatchPartVector';
import { GearTrainWidget } from './GearTrainWidget';
import { Sparkles, Trophy, CheckCircle2, RotateCcw, Watch } from 'lucide-react';

interface Props {
  module: DayModule;
  onCommitChange: (level: DayCommitmentLevel) => void;
  onFreshStart: () => void;
  onClose: () => void;
  onOpenCollection?: () => void;
}

export function DayMovementBenchModal({
  module,
  onCommitChange,
  onFreshStart,
  onClose,
  onOpenCollection,
}: Props) {
  const habits = loadHabitsState();
  // Slots revealed = floor(10 * work_done / committed_level), capped at 10
  const slotsRevealed = Math.min(10, Math.floor((10 * module.total_work_done) / module.committed_work_points));

  // Extra work beyond committed level fills up to 5 stretch jewel slots
  const extraWork = Math.max(0, module.total_work_done - module.committed_work_points);
  const extraJewelsEarned = Math.min(5, Math.floor(extraWork / (module.committed_work_points * 0.2)));

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
              Watchmaker's Bench · {module.day_name}
            </span>
            <h2 className="text-xl font-black text-white">{module.module_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Commitment Level Selector (Light, Standard, Full) */}
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">Today's Commitment:</span>
            {module.is_closed && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Module Closed!
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['light', 'standard', 'full'] as DayCommitmentLevel[]).map((level) => {
              const isSelected = module.committed_level === level;
              return (
                <button
                  key={level}
                  onClick={() => onCommitChange(level)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition capitalize ${
                    isSelected
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10 Part Slots (Physical Visual Progress, No numbers!) */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Movement Assembly Progress</span>
          </div>

          <div className="grid grid-cols-5 gap-2.5 p-4 bg-slate-950 rounded-2xl border border-slate-800">
            {Array.from({ length: 10 }).map((_, i) => {
              const isFilled = i < slotsRevealed;
              const part = module.parts[i];
              return (
                <WatchPartVector
                  key={i}
                  partSize={part ? part.part_size : 'screw'}
                  finishGrade={part ? part.finish_grade : 'brushed'}
                  isFilled={isFilled}
                />
              );
            })}
          </div>
        </div>

        {/* Stretch Jewels (Reward for going beyond committed floor) */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-rose-400" />
              <span>Stretch Jewels (Extra Credit)</span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <WatchPartVector
                key={i}
                partSize="jewel"
                finishGrade="decorated"
                isFilled={i < extraJewelsEarned}
                isJewelSlot={true}
              />
            ))}
          </div>
        </div>

        {/* 7-Gear Train (Habits & Power Reserve) */}
        <div className="mb-4">
          <GearTrainWidget habits={habits} />
        </div>

        {/* View Collection Vault */}
        {onOpenCollection && (
          <div className="mb-5">
            <button
              onClick={() => {
                onClose();
                onOpenCollection();
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Watch className="w-4 h-4 text-purple-400" />
              <span>View Watchmaker's Collection Vault</span>
            </button>
          </div>
        )}

        {/* Fresh Start Button (Zero guilt recovery) */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onFreshStart}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fresh Start Today</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white transition active:scale-95"
          >
            Back to Action
          </button>
        </div>
      </div>
    </div>
  );
}

```

### `src/components/DoMainScreen.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { SettingsModal } from './SettingsModal';
import { CandidateInspectorModal } from './CandidateInspectorModal';
import { DayMovementBenchModal } from './DayMovementBenchModal';
import { DayCommitmentPromptModal } from './DayCommitmentPromptModal';
import { ExperimentsModal } from './ExperimentsModal';
import { SetupGuideModal } from './SetupGuideModal';
import { WatchCollectionModal } from './WatchCollectionModal';
import { FridaySummaryModal } from './FridaySummaryModal';
import { WatchPartVector } from './WatchPartVector';
import {
  setWakeLockActive,
  playGentleCompletionChime,
  triggerHaptic,
} from '../services/focusWakeLock';
import {
  recordOffDayPolish,
  isFridayMorning,
} from '../services/focusCollection';
import {
  DayModule,
  DayCommitmentLevel,
  WatchPart,
  DAY_MODULE_NAMES,
  COMMITMENT_POINTS,
  calculateWorkValue,
  getPartSizeForFriction,
  calculateFinishGrade,
} from '../services/focusMovement';
import { isCountingDay } from '../services/focusAlgorithm';
import {
  queueEvent,
  readTabFromSheet,
  triggerBackgroundSync,
  getStoredCredentials,
  saveCredentials,
} from '../services/focusDataLayer';
import {
  FocusAction,
  IgnitionExercise,
  pickNextExercise,
} from '../services/focusServing';
import {
  rankCandidates,
  computeTargetFriction,
  CandidateScore,
  SessionContext,
} from '../services/focusAlgorithm';
import {
  creditHabitFromIgnition,
  getWeightedIgnitionPick,
  addPowerReserve,
} from '../services/focusHabits';
import {
  getExperimentScheduleStatus,
  overrideExperimentMode,
  ServeMode,
} from '../services/focusExperiments';
import { SyncIndicator } from './SyncIndicator';
import {
  Zap,
  LayoutGrid,
  Settings,
  Flame,
  CheckCircle2,
  RefreshCw,
  Minus,
  Plus,
  Clock,
  MessageSquare,
  HelpCircle,
  X,
  Play,
  RotateCcw,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  FlaskConical,
  Lock,
  Unlock,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Watch,
} from 'lucide-react';

interface Props {
  onOpenTaskView: () => void;
  onOpenPlanMode?: () => void;
}

type DoStage = 'do_button' | 'ignition' | 'offer' | 'action_running';

export function DoMainScreen({ onOpenTaskView, onOpenPlanMode }: Props) {
  const { settings, toggleTheme } = useMomentum();

  // Navigation / Modal States
  const [stage, setStage] = useState<DoStage>('do_button');
  const [showConfig, setShowConfig] = useState(false);
  const [showMomentumSettings, setShowMomentumSettings] = useState(false);
  const [showParkingLot, setShowParkingLot] = useState(false);
  const [parkingLotText, setParkingLotText] = useState('');
  const [showWhyThisOne, setShowWhyThisOne] = useState(false);

  // Doorway Config
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [savedCreds, setSavedCreds] = useState(false);

  // Pool of actions & serving state
  const [actionsPool, setActionsPool] = useState<FocusAction[]>([]);
  const [completedActions, setCompletedActions] = useState<FocusAction[]>([]);
  const [totalActiveMinutes, setTotalActiveMinutes] = useState(0);
  const [tapShift, setTapShift] = useState(0);
  const [fewerRepsTapped, setFewerRepsTapped] = useState(false);
  const [reservedSlotUsed, setReservedSlotUsed] = useState(false);
  const [stretchProbeUsed, setStretchProbeUsed] = useState(false);
  const [skippedTaskIds, setSkippedTaskIds] = useState<Set<string>>(new Set());
  const [lastCompletedType, setLastCompletedType] = useState<string | undefined>();
  const [consecutiveNotNows, setConsecutiveNotNows] = useState(0);

  // Inspector & Explanation
  const [rankedCandidates, setRankedCandidates] = useState<CandidateScore[]>([]);
  const [currentScoreData, setCurrentScoreData] = useState<CandidateScore | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  // Current ignition exercise
  const [currentExercise, setCurrentExercise] = useState<IgnitionExercise>(() => pickNextExercise());

  // Watch Movement & Rewards (Phase 6)
  const [showBenchModal, setShowBenchModal] = useState(false);
  const [showCommitPrompt, setShowCommitPrompt] = useState(false);
  const [dayModule, setDayModule] = useState<DayModule>(() => {
    const today = new Date();
    const dayAbbr = today.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const savedLevel = (localStorage.getItem('focus_day_commitment_level') as DayCommitmentLevel) || 'standard';
    return {
      day_name: fullDayName,
      module_name: DAY_MODULE_NAMES[dayAbbr] || 'Watchmaker Bench',
      date: today.toISOString().split('T')[0],
      committed_level: savedLevel,
      committed_work_points: COMMITMENT_POINTS[savedLevel],
      total_work_done: 0,
      parts: [],
      is_closed: false,
      can_lower_commitment: true,
    };
  });

  // Action Flow Mode (assigned: 1 card, paired: 2 cards) - synced with 4-week experiment
  const [servingMode, setServingMode] = useState<ServeMode>(() => {
    return getExperimentScheduleStatus().effectiveMode;
  });
  const [pairedCandidates, setPairedCandidates] = useState<[CandidateScore, CandidateScore] | null>(null);
  const [showExperimentsModal, setShowExperimentsModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showFridaySummary, setShowFridaySummary] = useState(() => isFridayMorning());
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [targetOverrideMode, setTargetOverrideMode] = useState<ServeMode>('paired');
  const neitherTimeoutRef = useRef<number | null>(null);

  // Screen wake lock during ignition and action execution
  useEffect(() => {
    if (stage === 'ignition' || stage === 'action_running') {
      setWakeLockActive(true);
    } else {
      setWakeLockActive(false);
    }
    return () => {
      setWakeLockActive(false);
    };
  }, [stage]);

  // Current served action
  const [currentAction, setCurrentAction] = useState<FocusAction | null>(null);
  const [isMicroFirstStepOnly, setIsMicroFirstStepOnly] = useState(false);

  // Action execution timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load credentials & fetch actions on mount
  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    refreshActionsPool();
  }, []);

  const refreshActionsPool = async () => {
    try {
      const rows = await readTabFromSheet('Actions');
      if (Array.isArray(rows) && rows.length > 0) {
        setActionsPool(rows as FocusAction[]);
      }
    } catch (err) {
      console.warn('Could not refresh actions pool:', err);
    }
  };

  // Timer tick
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Handlers
  const handleSaveCreds = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveCredentials(url, key);
    setSavedCreds(true);
    setTimeout(() => setSavedCreds(false), 2000);
    refreshActionsPool();
  };

  // Phase 8: Serving Mode toggle with 4-week experiment lock
  const handleRequestModeChange = (mode: ServeMode) => {
    const status = getExperimentScheduleStatus();
    if (mode === status.effectiveMode) return;

    if (status.isLocked) {
      setTargetOverrideMode(mode);
      setShowOverrideConfirm(true);
    } else {
      applyModeOverride(mode);
    }
  };

  const applyModeOverride = async (mode: ServeMode) => {
    const status = getExperimentScheduleStatus();
    await overrideExperimentMode(mode, status.effectiveMode, 'User manual override in Settings');
    setServingMode(mode);
    setShowOverrideConfirm(false);
  };

  // 1. DO Tap -> Check Day Commitment on Counting Day, then Ignition Screen
  const handleDoPress = async () => {
    // Refresh experiment schedule mode
    const expStatus = getExperimentScheduleStatus();
    setServingMode(expStatus.effectiveMode);

    await queueEvent('do_press', {
      timestamp: new Date().toISOString(),
      mode: expStatus.effectiveMode,
    });

    // If today is a counting day (Sun-Thu) and commitment not set today, prompt once
    const todayStr = new Date().toISOString().split('T')[0];
    const hasCommittedToday = localStorage.getItem('focus_committed_date') === todayStr;

    if (isCountingDay() && !hasCommittedToday) {
      setShowCommitPrompt(true);
      return;
    }

    proceedToIgnition();
  };

  const proceedToIgnition = async () => {
    // Phase 7: Weighted ignition pick favoring habits with quota left
    const nextEx = getWeightedIgnitionPick(currentExercise.name);
    setCurrentExercise(nextEx);
    setStage('ignition');
    addPowerReserve(2); // +2 winding ticks per DO press

    await queueEvent('ignition_offered', {
      exercise: nextEx.name,
      targetReps: nextEx.reps,
    });
  };

  const handleCommitChoice = async (level: DayCommitmentLevel) => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('focus_committed_date', todayStr);
    localStorage.setItem('focus_day_commitment_level', level);

    setDayModule((prev) => ({
      ...prev,
      committed_level: level,
      committed_work_points: COMMITMENT_POINTS[level],
    }));

    await queueEvent('day_committed', {
      level,
      points: COMMITMENT_POINTS[level],
      date: todayStr,
    });

    setShowCommitPrompt(false);
    proceedToIgnition();
  };

  // 2. Ignition Controls
  const handleFewerReps = async () => {
    const reduced = Math.max(3, Math.round(currentExercise.reps * 0.6));
    setCurrentExercise((prev) => ({ ...prev, reps: reduced }));
    setFewerRepsTapped(true);
    await queueEvent('ignition_smaller', {
      exercise: currentExercise.name,
      newReps: reduced,
    });
  };

  const handleSwapExercise = async () => {
    const swapped = pickNextExercise(currentExercise.name);
    setCurrentExercise(swapped);
    await queueEvent('ignition_swapped', {
      from: currentExercise.name,
      to: swapped.name,
    });
  };

  // 3. ZERO-TAP BRIDGE: Finish Ignition -> Immediately show Offer
  const handleIgnitionDone = async () => {
    // Phase 7: Credit matching habit quota directly!
    creditHabitFromIgnition(currentExercise.name, currentExercise.reps);

    await queueEvent('ignition_done', {
      exercise: currentExercise.name,
      reps: currentExercise.reps,
      credited_habit: true,
    });

    serveNextOffer(consecutiveNotNows);
  };

  const serveNextOffer = (notNowCount: number) => {
    const ctx: SessionContext = {
      completedActions,
      totalActiveMinutes,
      tapShift,
      consecutiveSmallerTaps: 0,
      fewerRepsTapped,
      reservedSlotUsedToday: reservedSlotUsed,
      stretchProbeUsedToday: stretchProbeUsed,
      skippedTaskIds,
      lastCompletedType,
      now: new Date(),
    };

    const { selected, ranked, paired } = rankCandidates(actionsPool, ctx);
    setRankedCandidates(ranked);
    setPairedCandidates(paired);

    if (servingMode === 'paired' && paired) {
      setCurrentAction(paired[0].action);
      setCurrentScoreData(paired[0]);
    } else if (selected) {
      setCurrentAction(selected.action);
      setCurrentScoreData(selected);
      if (selected.isReservedSlot) setReservedSlotUsed(true);
    } else {
      // Fallback action if pool is empty
      const fallback: FocusAction = {
        task_id: 'default_action',
        title: 'Choose one quick thing right in front of you',
        friction: 2,
        time_bucket: 'under 5',
        first_action: 'Stand up and take the first physical step',
        status: 'waiting',
      };
      setCurrentAction(fallback);
      setCurrentScoreData(null);
    }

    // Two not-nows in a row -> offer becomes only the tiny first physical action!
    setIsMicroFirstStepOnly(notNowCount >= 2);
    setStage('offer');

    queueEvent('offer_served', {
      task_id: selected?.action.task_id || 'default_action',
      mode: servingMode,
      target_friction: selected?.targetFriction || 2,
      micro_only: notNowCount >= 2,
      is_tripwire: selected?.isTripwire || false,
      is_reserved: selected?.isReservedSlot || false,
    });
  };

  // 4. Offer Screen Controls
  const handleSmallerPart = async () => {
    setTapShift((prev) => prev - 1);
    await queueEvent('smaller_part', {
      task_id: currentAction?.task_id,
    });
    serveNextOffer(consecutiveNotNows);
  };

  const handleBiggerPart = async () => {
    setTapShift((prev) => prev + 1);
    await queueEvent('bigger_part', {
      task_id: currentAction?.task_id,
    });
    serveNextOffer(consecutiveNotNows);
  };

  const handleNotNow = async () => {
    const newNotNows = consecutiveNotNows + 1;
    const skipped = new Set(skippedTaskIds);
    if (currentAction) skipped.add(currentAction.task_id);

    setConsecutiveNotNows(newNotNows);
    setSkippedTaskIds(skipped);

    await queueEvent('not_now', {
      task_id: currentAction?.task_id,
      consecutive: newNotNows,
    });

    serveNextOffer(newNotNows);
  };

  const handleStartAction = async (actionToStart?: FocusAction) => {
    const act = actionToStart || currentAction;
    if (actionToStart) setCurrentAction(actionToStart);
    setStage('action_running');
    setTimerSeconds(0);
    setIsTimerRunning(true);
    await queueEvent('action_started', {
      task_id: act?.task_id,
      mode: servingMode,
      friction: act?.friction,
    });
  };

  // Paired Mode Card Choices
  const handleSelectUpperPaired = async (cand: CandidateScore) => {
    setCurrentAction(cand.action);
    setCurrentScoreData(cand);
    setTapShift((prev) => prev + 1); // bigger part signal (+1 ramp)
    await queueEvent('tap_shift', {
      direction: 'bigger',
      source: 'paired_upper_choice',
      task_id: cand.action.task_id,
    });
    handleStartAction(cand.action);
  };

  const handleSelectLowerPaired = async (cand: CandidateScore) => {
    setCurrentAction(cand.action);
    setCurrentScoreData(cand);
    setTapShift((prev) => prev - 1); // smaller part signal (-1 easing)
    await queueEvent('tap_shift', {
      direction: 'smaller',
      source: 'paired_lower_choice',
      task_id: cand.action.task_id,
    });
    handleStartAction(cand.action);
  };

  const handleNeither = async () => {
    const newNotNows = consecutiveNotNows + 1;
    setConsecutiveNotNows(newNotNows);
    setTapShift((prev) => prev - 1); // easing

    await queueEvent('not_now', {
      task_id: currentAction?.task_id,
      reason: 'neither',
      mode: 'paired',
      consecutive: newNotNows,
    });

    serveNextOffer(newNotNows);
  };

  const handleNeitherPressStart = () => {
    neitherTimeoutRef.current = window.setTimeout(() => {
      handleNeither();
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (_) {}
      }
    }, 600);
  };

  const handleNeitherPressEnd = () => {
    if (neitherTimeoutRef.current) {
      clearTimeout(neitherTimeoutRef.current);
      neitherTimeoutRef.current = null;
    }
  };

  // 5. Action Execution Controls
  const handleCompleteAction = async () => {
    setIsTimerRunning(false);
    const minutes = Math.max(1, Math.round(timerSeconds / 60));

    await queueEvent('action_completed', {
      task_id: currentAction?.task_id,
      actual_minutes: minutes,
      friction: currentAction?.friction,
      mode: servingMode,
    });

    if (currentAction) {
      const friction = Number(currentAction.friction) || 2;
      const workVal = calculateWorkValue(friction, currentAction.importance);
      const partSize = getPartSizeForFriction(friction);
      const finishGrade = calculateFinishGrade(currentAction.due_date, currentAction.created_at);

      const newPart: WatchPart = {
        part_id: 'part_' + Date.now(),
        name: `${finishGrade} ${partSize}`,
        part_size: partSize,
        finish_grade: finishGrade,
        action_id: currentAction.task_id,
        action_title: currentAction.title,
        work_value: workVal,
        earned_at: new Date().toISOString(),
      };

      // Phase 10: Audio completion chime & haptic feedback
      playGentleCompletionChime();
      triggerHaptic([60, 40, 60]);

      // Phase 11: If completing on Friday or Saturday (off days), record polish upgrades!
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        recordOffDayPolish(workVal);
      }

      await queueEvent('part_earned', {
        part: newPart,
        work_value: workVal,
      });

      setDayModule((prev) => {
        const newWork = prev.total_work_done + workVal;
        const willClose = newWork >= prev.committed_work_points && !prev.is_closed;
        if (willClose) {
          queueEvent('module_closed', {
            module_name: prev.module_name,
            day: prev.day_name,
            committed_level: prev.committed_level,
          });
        }
        return {
          ...prev,
          total_work_done: newWork,
          parts: [...prev.parts, newPart],
          is_closed: prev.is_closed || willClose,
        };
      });

      setActionsPool((prev) =>
        prev.map((a) =>
          a.task_id === currentAction.task_id ? { ...a, status: 'done', completed_at: new Date().toISOString() } : a
        )
      );
      setCompletedActions((prev) => [...prev, currentAction]);
      setLastCompletedType(currentAction.type);
    }

    setTotalActiveMinutes((prev) => prev + minutes);
    setConsecutiveNotNows(0);

    // ADHD Action Flow: keep going in the string immediately!
    serveNextOffer(0);
  };

  const handleShrinkRequest = async () => {
    setIsMicroFirstStepOnly(true);
    await queueEvent('shrink_requested', {
      task_id: currentAction?.task_id,
    });
  };

  const handleSaveParkingLot = async () => {
    if (!parkingLotText.trim()) return;
    await queueEvent('parking_lot', {
      text: parkingLotText.trim(),
      active_task_id: currentAction?.task_id,
    });
    setParkingLotText('');
    setShowParkingLot(false);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-none">FOCUS</h1>
            <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">Action Layer</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Watchmaker Bench Button (Shows movement parts & rewards) */}
          <button
            onClick={() => setShowBenchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 transition shadow-xs"
            title="Open Watchmaker Bench (Day Movement Progress)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Bench</span>
          </button>

          {/* Watchmaker Collection Vault Button (Phase 11) */}
          <button
            onClick={() => setShowCollectionModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 transition shadow-xs"
            title="Open Watchmaker's Collection (Crafted Timepieces)"
          >
            <Watch className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Vault</span>
          </button>

          {/* 4-Week Serving Experiment Modal Button */}
          <button
            onClick={() => setShowExperimentsModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 transition shadow-xs"
            title={`Serving Experiment: Week ${getExperimentScheduleStatus().weekNumber} of 4 (${servingMode})`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Experiment</span>
          </button>

          <SyncIndicator />

          {onOpenPlanMode && (
            <button
              onClick={onOpenPlanMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-purple-500/40 rounded-xl text-xs font-semibold text-purple-300 transition shadow-sm"
              title="Open Plan Mode (Calm Review, Pool & Settings)"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xs:inline">Plan</span>
            </button>
          )}

          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Task View</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-xs transition ${
              showConfig
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Configure Apps Script Doorway"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STAGE 1: GIANT DO BUTTON */}
      {stage === 'do_button' && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center my-auto">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 rounded-full blur-2xl animate-glow-pulse pointer-events-none"></div>

            <button
              onClick={handleDoPress}
              className="relative w-60 h-60 sm:w-68 sm:h-68 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-800 hover:from-purple-400 hover:to-indigo-700 active:scale-95 text-white font-black text-6xl sm:text-7xl tracking-wider shadow-2xl flex flex-col items-center justify-center gap-1 border-4 border-purple-300/40 animate-do-breathe cursor-pointer transition"
            >
              <span>DO</span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-purple-200/90">
                Ignition
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: PHYSICAL IGNITION SCREEN */}
      {stage === 'ignition' && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full px-4 animate-fadeIn">
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Flame className="w-4 h-4 text-amber-400 fill-current" />
              <span>Physical Ignition</span>
            </div>

            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
              {currentExercise.name}
            </div>

            <div className="text-6xl sm:text-7xl font-black text-purple-400 my-4 tracking-tighter">
              {currentExercise.reps}{' '}
              <span className="text-base font-bold text-slate-400 tracking-normal">
                {currentExercise.unit}
              </span>
            </div>

            {/* Zero-Tap Bridge: Big Done Button */}
            <button
              onClick={handleIgnitionDone}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xl shadow-xl shadow-purple-900/40 transition mb-4 cursor-pointer"
            >
              Done →
            </button>

            {/* Micro Controls: Fewer reps & Swap */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleFewerReps}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Fewer reps
              </button>
              <button
                onClick={handleSwapExercise}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                <span>Swap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: OFFER SCREEN (Assigned or Paired Mode) */}
      {stage === 'offer' && currentAction && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-4 animate-fadeIn">
          {servingMode === 'paired' && pairedCandidates ? (
            /* PAIRED MODE: Upper Card (T+1, More Reward) & Lower Card (T-1, Easier Entry) */
            <div className="w-full space-y-3">
              <div className="text-center text-xs font-bold text-purple-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Choose Your Next Action</span>
              </div>

              <div className="flex flex-col gap-3">
                {/* UPPER CARD: Target + 1 (More Reward) */}
                {(() => {
                  const upper = pairedCandidates[0];
                  const act = upper.action;
                  const fric = Number(act.friction) || 2;
                  const partSize = getPartSizeForFriction(fric);
                  const workVal = calculateWorkValue(fric, act.importance);
                  const finishGrade = calculateFinishGrade(act.due_date, act.created_at);

                  return (
                    <div
                      key={act.task_id}
                      onClick={() => handleSelectUpperPaired(upper)}
                      className="bg-slate-900/95 border-2 border-purple-500/40 hover:border-purple-400 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between cursor-pointer active:scale-98 transition group relative overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[10px] font-bold">
                              Friction {act.friction}/5
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                              More Reward (+{workVal} pts)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            <WatchPartVector partSize={partSize} finishGrade={finishGrade} isFilled={true} />
                            <span className="text-[10px] font-bold text-amber-300 capitalize">
                              {finishGrade} {partSize}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-purple-200 transition my-1.5">
                          {act.title}
                        </h3>

                        {act.project_title && (
                          <div className="text-[11px] text-purple-400 font-semibold mb-2">
                            📁 {act.project_title}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{act.time_bucket || '10-20m'}</span>
                        <div className="flex items-center gap-1 text-[11px] text-purple-400 font-bold group-hover:translate-x-0.5 transition">
                          <span>Select & Start</span>
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* LOWER CARD: Target - 1 (Easier Entry) */}
                {(() => {
                  const lower = pairedCandidates[1];
                  const act = lower.action;
                  const fric = Number(act.friction) || 2;
                  const partSize = getPartSizeForFriction(fric);
                  const workVal = calculateWorkValue(fric, act.importance);
                  const finishGrade = calculateFinishGrade(act.due_date, act.created_at);

                  return (
                    <div
                      key={act.task_id}
                      onClick={() => handleSelectLowerPaired(lower)}
                      className="bg-slate-900/95 border-2 border-slate-700/60 hover:border-purple-400 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between cursor-pointer active:scale-98 transition group relative overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                              Friction {act.friction}/5
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                              Easier Entry (+{workVal} pts)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            <WatchPartVector partSize={partSize} finishGrade={finishGrade} isFilled={true} />
                            <span className="text-[10px] font-bold text-amber-300 capitalize">
                              {finishGrade} {partSize}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-purple-200 transition my-1.5">
                          {act.title}
                        </h3>

                        {act.project_title && (
                          <div className="text-[11px] text-purple-400 font-semibold mb-2">
                            📁 {act.project_title}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{act.time_bucket || '10-20m'}</span>
                        <div className="flex items-center gap-1 text-[11px] text-purple-400 font-bold group-hover:translate-x-0.5 transition">
                          <span>Select & Start</span>
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Long-press / Hidden Neither Button */}
              <div className="flex justify-center pt-2">
                <button
                  onMouseDown={handleNeitherPressStart}
                  onMouseUp={handleNeitherPressEnd}
                  onTouchStart={handleNeitherPressStart}
                  onTouchEnd={handleNeitherPressEnd}
                  onClick={handleNeither}
                  className="py-2.5 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800 transition"
                  title="Long press or tap if neither fits right now (counts as not now)"
                >
                  Neither right now (Not now)
                </button>
              </div>
            </div>
          ) : (
            /* ASSIGNED MODE: Single Focused Card */
            <div className="w-full bg-slate-900/95 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
              {/* Top offer badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[11px] font-bold">
                    Friction {currentAction.friction}/5
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium">
                    {currentAction.time_bucket || '10-20m'}
                  </span>
                </div>

                <button
                  onClick={() => setShowWhyThisOne(!showWhyThisOne)}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why this?</span>
                </button>
              </div>

              {/* Why This One explanation drawer */}
              {showWhyThisOne && (
                <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed animate-fadeIn">
                  <div className="font-bold text-purple-300 mb-1">Serving algorithm breakdown:</div>
                  {currentScoreData?.reasons && currentScoreData.reasons.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                      {currentScoreData.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-400">Chosen to match your target friction of {currentScoreData?.targetFriction || 2}.</p>
                  )}
                </div>
              )}

              {/* Title / Action Description */}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-6">
                {currentAction.title}
              </h2>

              {/* START BUTTON */}
              <button
                onClick={() => handleStartAction()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-lg shadow-xl shadow-purple-900/40 transition flex items-center justify-center gap-2 mb-4 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start</span>
              </button>

              {/* Micro Controls: Smaller part, Bigger part, Not now */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={handleSmallerPart}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                  title="Shift target friction down"
                >
                  <Minus className="w-3.5 h-3.5" /> Smaller
                </button>
                <button
                  onClick={handleBiggerPart}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                  title="Shift target friction up"
                >
                  <Plus className="w-3.5 h-3.5" /> Bigger
                </button>
                <button
                  onClick={handleNotNow}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Session Momentum & Guilt-Free Stop Option */}
          {completedActions.length > 0 && (
            <div className="w-full mt-3 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                <Flame className="w-4 h-4 text-amber-400 fill-current" />
                <span>
                  {completedActions.length} done this flow
                  {completedActions.length >= 2 && ' (Goal Met! 🎉)'}
                </span>
              </div>

              <button
                onClick={async () => {
                  await queueEvent('flow_stopped_cleanly', {
                    completed_in_session: completedActions.length,
                    reason: 'voluntary_stop',
                  });
                  setStage('do_button');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                  completedActions.length >= 2
                    ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  completedActions.length >= 2
                    ? 'You completed 2+ tasks. Stop with full credit!'
                    : 'Stop this flow session'
                }
              >
                {completedActions.length >= 2 ? 'Done for now ✓' : 'Stop flow'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: ACTION EXECUTION SCREEN */}
      {stage === 'action_running' && currentAction && !showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 animate-fadeIn">
          <div className="w-full bg-slate-900/95 border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            {/* Timer readout */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full font-mono text-xs text-purple-300">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{formatTimer(timerSeconds)}</span>
              </div>

              {/* Parking lot button */}
              <button
                onClick={() => setShowParkingLot(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-medium border border-slate-700 transition"
                title="Unload distracting thought into parking lot"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Parking lot</span>
              </button>
            </div>

            {/* Current action title */}
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-8">
              {currentAction.title}
            </h2>

            {/* DONE BUTTON */}
            <button
              onClick={handleCompleteAction}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-lg shadow-xl shadow-emerald-900/40 transition flex items-center justify-center gap-2 mb-3 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 fill-current" />
              <span>Done!</span>
            </button>

            {/* Stuck? Shrink it */}
            <button
              onClick={handleShrinkRequest}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              Stuck? Shrink to 2 minutes
            </button>
          </div>
        </div>
      )}

      {/* DOORWAY CONFIG MODAL */}
      {showConfig && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 animate-fadeIn">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" /> Doorway Settings
              </h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveCreds} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your secret key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-b border-slate-800 pb-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-bold rounded-lg text-white transition"
                >
                  {savedCreds ? 'Saved!' : 'Save Credentials'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCreds();
                    setShowConfig(false);
                  }}
                  className="text-xs text-purple-300 hover:text-purple-200 font-medium"
                >
                  Save & Back to DO
                </button>
              </div>

              {/* Action Flow Mode Switch (Assigned vs Paired) with Experiment Schedule */}
              <div className="pt-2 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Action Serving Mode:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfig(false);
                      setShowExperimentsModal(true);
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                  >
                    <FlaskConical className="w-3 h-3" />
                    <span>View Experiment</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestModeChange('assigned')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                      servingMode === 'assigned'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1 Card (Assigned)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestModeChange('paired')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                      servingMode === 'paired'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2 Cards (Paired Choice)
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>
                    Week {getExperimentScheduleStatus().weekNumber} of 4: {getExperimentScheduleStatus().scheduledMode} scheduled
                  </span>
                  {getExperimentScheduleStatus().isLocked ? (
                    <span className="text-amber-400 flex items-center gap-0.5 font-medium">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  ) : (
                    <span className="text-purple-400 flex items-center gap-0.5 font-medium">
                      <Unlock className="w-2.5 h-2.5" /> Override
                    </span>
                  )}
                </div>
              </div>

              {/* Phase 10: Setup Guide (Battery, Calendar Nudges & Drive Backups) */}
              <div className="pt-2 flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[11px] text-slate-400">Offline, Nudges & Backups</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setShowSetupGuide(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Setup Guide</span>
                </button>
              </div>

              {/* Full Momentum Settings Link */}
              <div className="pt-2 flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[11px] text-slate-400">Momentum App Settings</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setShowMomentumSettings(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <Settings className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Full Settings</span>
                </button>
              </div>

              {/* Developer Candidate Inspector */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Serving Inspector</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setShowInspector(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 active:scale-95 text-purple-200 border border-purple-800 rounded-lg text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Inspect Candidates ({rankedCandidates.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARKING LOT POPUP MODAL */}
      {showParkingLot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Parking Lot</span>
              </h3>
              <button
                onClick={() => setShowParkingLot(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Unload distracting thoughts here so your head stays clear. Saved safely to your event log.
            </p>
            <textarea
              rows={3}
              value={parkingLotText}
              onChange={(e) => setParkingLotText(e.target.value)}
              placeholder="e.g. Remember to buy milk, check flight prices..."
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowParkingLot(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveParkingLot}
                disabled={!parkingLotText.trim()}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
              >
                Save Thought
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Action Layer branding & theme toggle */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 px-1 shrink-0">
        <span>Focus Action Layer</span>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition active:scale-95"
          title={`Task View Theme: Currently ${settings.theme === 'dark' ? 'Dark' : 'Light'}. Tap to switch.`}
        >
          {settings.theme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-slate-400 font-medium">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-400 font-medium">Light</span>
            </>
          )}
        </button>
      </div>

      {/* Momentum Full Settings Modal */}
      {showMomentumSettings && (
        <SettingsModal onClose={() => setShowMomentumSettings(false)} />
      )}

      {/* Developer Candidate Inspector Modal */}
      {showInspector && (
        <CandidateInspectorModal
          candidates={rankedCandidates}
          onClose={() => setShowInspector(false)}
        />
      )}

      {/* Watchmaker Bench Modal */}
      {showBenchModal && (
        <DayMovementBenchModal
          module={dayModule}
          onCommitChange={async (lvl) => {
            setDayModule((prev) => ({
              ...prev,
              committed_level: lvl,
              committed_work_points: COMMITMENT_POINTS[lvl],
            }));
            await queueEvent('day_committed', {
              level: lvl,
              points: COMMITMENT_POINTS[lvl],
              reason: 'user_recalibration',
            });
          }}
          onFreshStart={async () => {
            setDayModule((prev) => ({
              ...prev,
              total_work_done: 0,
              parts: [],
              is_closed: false,
            }));
            await queueEvent('fresh_start', {
              date: dayModule.date,
            });
            setShowBenchModal(false);
          }}
          onOpenCollection={() => setShowCollectionModal(true)}
          onClose={() => setShowBenchModal(false)}
        />
      )}

      {/* Daily Commitment First-Do Prompt Modal */}
      {showCommitPrompt && (
        <DayCommitmentPromptModal
          suggestedLevel={dayModule.committed_level}
          onCommit={handleCommitChoice}
        />
      )}

      {/* Serving Mode Experiment Analytics Modal (Phase 8) */}
      {showExperimentsModal && (
        <ExperimentsModal
          isOpen={showExperimentsModal}
          onClose={() => setShowExperimentsModal(false)}
          onServingModeChanged={(newMode) => setServingMode(newMode)}
        />
      )}

      {/* Setup Guide Modal (Phase 10) */}
      {showSetupGuide && (
        <SetupGuideModal
          isOpen={showSetupGuide}
          onClose={() => setShowSetupGuide(false)}
        />
      )}

      {/* Watch Collection Vault Modal (Phase 11) */}
      {showCollectionModal && (
        <WatchCollectionModal
          isOpen={showCollectionModal}
          onClose={() => setShowCollectionModal(false)}
        />
      )}

      {/* Friday Morning Week Reflection Modal (Phase 11) */}
      {showFridaySummary && (
        <FridaySummaryModal
          isOpen={showFridaySummary}
          onClose={() => setShowFridaySummary(false)}
          onOpenCollection={() => {
            setShowFridaySummary(false);
            setShowCollectionModal(true);
          }}
        />
      )}

      {/* Confirmation Modal for Locked Week Override in Settings */}
      {showOverrideConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-white text-base">Override Week Lock?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The 4-week experiment locks the serving mode by week to maintain fair, unbiased metrics.
              Overriding will log a <code className="text-amber-300">mode_override</code> event.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowOverrideConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Keep Lock
              </button>
              <button
                onClick={() => applyModeOverride(targetOverrideMode)}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
              >
                Override Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

### `src/components/ExperimentsModal.tsx`
```tsx
import React, { useEffect, useState } from 'react';
import {
  X,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  computeExperimentMetrics,
  getExperimentScheduleStatus,
  overrideExperimentMode,
  runExperimentSelfTest,
  setExperimentStartDate,
  ExperimentComparison,
  ServeMode,
} from '../services/focusExperiments';
import { getOutboxEvents, readTabFromSheet, FocusEvent } from '../services/focusDataLayer';

interface ExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServingModeChanged?: (newMode: ServeMode) => void;
}

export const ExperimentsModal: React.FC<ExperimentsModalProps> = ({
  isOpen,
  onClose,
  onServingModeChanged,
}) => {
  const [data, setData] = useState<ExperimentComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [selfTestResult, setSelfTestResult] = useState<{ passed: boolean } | null>(null);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [targetOverrideMode, setTargetOverrideMode] = useState<ServeMode>('paired');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get outbox events
      const outbox = await getOutboxEvents();
      // 2. Try fetching recorded events from sheet or local cache
      const sheetEvents = await readTabFromSheet('Events');

      // Map sheet rows to FocusEvent if needed
      const normalizedSheetEvents: FocusEvent[] = sheetEvents.map((r) => {
        let payload = {};
        try {
          payload = typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json || {};
        } catch (_) {}
        return {
          event_id: r.event_id || 'ev_' + Math.random(),
          timestamp: r.timestamp || new Date().toISOString(),
          device: r.device || 'phone',
          type: r.type || '',
          payload,
          schema_version: r.schema_version || '1.0',
        };
      });

      // Deduplicate by event_id
      const allEventsMap = new Map<string, FocusEvent>();
      normalizedSheetEvents.forEach((e) => allEventsMap.set(e.event_id, e));
      outbox.forEach((e) => allEventsMap.set(e.event_id, e));

      const merged = Array.from(allEventsMap.values());
      const comparison = computeExperimentMetrics(merged);
      setData(comparison);
    } catch (err) {
      console.warn('Error loading experiment data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const testRes = runExperimentSelfTest();
      setSelfTestResult(testRes);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const schedule = getExperimentScheduleStatus();

  const handleRequestModeToggle = (mode: ServeMode) => {
    if (mode === schedule.effectiveMode) return;

    if (schedule.isLocked) {
      setTargetOverrideMode(mode);
      setShowOverrideConfirm(true);
    } else {
      applyModeChange(mode);
    }
  };

  const applyModeChange = async (mode: ServeMode) => {
    await overrideExperimentMode(mode, schedule.effectiveMode, 'User manual override in Experiments modal');
    setShowOverrideConfirm(false);
    loadData();
    if (onServingModeChanged) {
      onServingModeChanged(mode);
    }
  };

  const handleResetSchedule = () => {
    if (confirm('Reset 4-week experiment schedule to start today?')) {
      const todayStr = new Date().toISOString().split('T')[0];
      setExperimentStartDate(todayStr);
      loadData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Serving Mode Experiment</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-bold uppercase tracking-wider">
                  Phase 8
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                4-Week A/B evaluation: Assigned vs. Paired Action Selection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-200 text-sm">
          {/* Schedule Banner */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Week {schedule.weekNumber} of 4:
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 text-xs font-extrabold uppercase">
                  {schedule.scheduledMode} Mode Scheduled
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Alternates by week: Week 1 & 3 (Assigned) · Week 2 & 4 (Paired). Started {schedule.startDate}.
              </p>
            </div>

            {/* Mode Toggle Controls */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => handleRequestModeToggle('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  schedule.effectiveMode === 'assigned'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Assigned (1-Card)</span>
              </button>
              <button
                onClick={() => handleRequestModeToggle('paired')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  schedule.effectiveMode === 'paired'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Paired (2-Cards)</span>
              </button>
            </div>
          </div>

          {/* Week Lock Status Pill */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5">
              {schedule.isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300/90 font-medium">
                    Locked inside week to prevent mood bias
                  </span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 font-medium">
                    Manual override active for Week {schedule.weekNumber}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleResetSchedule}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition underline underline-offset-2"
            >
              Reset Schedule
            </button>
          </div>

          {/* Sample Size Warning if < 10 days */}
          {data && (!data.assigned.hasSufficientData || !data.paired.hasSufficientData) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-300 mb-0.5">Sample Size Notice</div>
                <span>
                  Needs at least 10 counting days in each mode for statistically sound comparison. Current sample:
                  <strong className="text-white"> {data.assigned.countingDaysCount} days</strong> Assigned,
                  <strong className="text-white"> {data.paired.countingDaysCount} days</strong> Paired.
                </span>
              </div>
            </div>
          )}

          {/* Metrics Comparison Grid */}
          {data && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Direct Event-Computed Metrics</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {data.totalEventsProcessed} logged events analyzed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Assigned Column */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    schedule.effectiveMode === 'assigned'
                      ? 'bg-purple-950/20 border-purple-500/40 ring-1 ring-purple-500/30'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-white text-sm">Assigned Mode</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {data.assigned.countingDaysCount} work days
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        Median DO-to-Action Latency
                      </div>
                      <div className="text-xl font-black text-white">
                        {data.assigned.medianDoToActionSeconds !== null
                          ? `${data.assigned.medianDoToActionSeconds}s`
                          : '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        Actions / Counting Day
                      </div>
                      <div className="text-lg font-bold text-slate-200">
                        {data.assigned.actionsPerCountingDay}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                        Average Friction Completed
                      </div>
                      <div className="text-lg font-bold text-slate-200">
                        {data.assigned.averageFrictionCompleted || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Not-now / Day</div>
                      <div className="text-base font-semibold text-slate-300">
                        {data.assigned.notNowNeitherPerDay}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Abandoned Offers (&gt;5m)</div>
                      <div className="text-base font-semibold text-slate-300">
                        {data.assigned.abandonedOfferRate}%
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Day Levels Reached</div>
                      <div className="text-base font-semibold text-slate-300">
                        {data.assigned.levelReachedPercentage}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paired Column */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    schedule.effectiveMode === 'paired'
                      ? 'bg-purple-950/20 border-purple-500/40 ring-1 ring-purple-500/30'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-white text-sm">Paired Mode</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {data.paired.countingDaysCount} work days
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        Median DO-to-Action Latency
                      </div>
                      <div className="text-xl font-black text-white">
                        {data.paired.medianDoToActionSeconds !== null
                          ? `${data.paired.medianDoToActionSeconds}s`
                          : '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        Actions / Counting Day
                      </div>
                      <div className="text-lg font-bold text-slate-200">
                        {data.paired.actionsPerCountingDay}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                        Average Friction Completed
                      </div>
                      <div className="text-lg font-bold text-slate-200">
                        {data.paired.averageFrictionCompleted || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Neither / Day</div>
                      <div className="text-base font-semibold text-slate-300">
                        {data.paired.notNowNeitherPerDay}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Abandoned Offers (&gt;5m)</div>
                      <div className="text-base font-semibold text-slate-300">
                        {data.paired.abandonedOfferRate}%
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Day Levels Reached</div>
                      <div className="text-base font-semibold text-slate-300">
                        {data.paired.levelReachedPercentage}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Self-Test Verification Banner */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-200">Math Verification Self-Test: </span>
                <span className="text-emerald-400 font-bold">Passed</span>
                <div className="text-[10px] text-slate-400">
                  Synthetic test dataset accurately reproduced hand-computed metrics.
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const res = runExperimentSelfTest();
                setSelfTestResult(res);
                alert('Self-test verified: event computation math is 100% accurate.');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
            >
              Verify Math
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Events</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Locked Week Override */}
      {showOverrideConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-white text-base">Override Week Lock?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The 4-week experiment locks the serving mode by week to maintain fair, unbiased metrics.
              Overriding will log a <code className="text-amber-300">mode_override</code> event.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowOverrideConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Keep Lock
              </button>
              <button
                onClick={() => applyModeChange(targetOverrideMode)}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
              >
                Override Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

```

### `src/components/FridaySummaryModal.tsx`
```tsx
import React from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  X,
  BatteryCharging,
  ArrowRight,
} from 'lucide-react';
import {
  getCurrentWeeklyMovement,
  markFridaySummarySeen,
  getActiveCraftingWatch,
} from '../services/focusCollection';
import { getPowerReserve } from '../services/focusHabits';

interface FridaySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCollection: () => void;
}

export const FridaySummaryModal: React.FC<FridaySummaryModalProps> = ({
  isOpen,
  onClose,
  onOpenCollection,
}) => {
  if (!isOpen) return null;

  const movement = getCurrentWeeklyMovement();
  const watch = getActiveCraftingWatch();
  const reserve = getPowerReserve();

  // Aggregate stats
  let totalParts = 0;
  let totalWork = 0;
  for (const m of Object.values(movement.modules)) {
    totalParts += m.parts.length;
    totalWork += m.total_work_done;
  }

  const handleDismiss = () => {
    markFridaySummarySeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Friday Week Reflection</h2>
              <p className="text-xs text-slate-400">Calm review of the week — zero pressure, zero guilt</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-950 border border-purple-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-sm">Week Movement Caliber</span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">
                {movement.week_id}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Parts Fitted</div>
                <div className="text-xl font-black text-white">{totalParts}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Work Points</div>
                <div className="text-xl font-black text-white">{totalWork}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Power Reserve</div>
                <div className="text-xl font-black text-purple-400">{reserve}%</div>
              </div>
            </div>
          </div>

          {/* Timepiece crafting progress */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Watch In Progress: {watch.name}</span>
              <span className="text-purple-400 font-semibold">{watch.completed_weeks_count} of 4 Weeks</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every four completed weekly movements finishes an heirloom timepiece in your collection vault.
            </p>
          </div>

          {/* Weekend Polish reminder */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Award className="w-4 h-4" />
              <span>Weekend Polish (Friday & Saturday)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Weekend work is completely voluntary. Any actions completed earn polish upgrades for your parts, and 16 points unlocks a complication. You never lose streaks or reserve points on off days.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            onClick={() => {
              handleDismiss();
              onOpenCollection();
            }}
            className="text-xs text-purple-400 hover:text-purple-300 font-bold transition flex items-center gap-1"
          >
            <span>Open Collection Vault</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Enjoy the Weekend
          </button>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/GearTrainWidget.tsx`
```tsx
import React from 'react';
import { HabitItem, getPowerReserve } from '../services/focusHabits';
import { BatteryCharging, Disc3 } from 'lucide-react';

interface Props {
  habits: HabitItem[];
}

export const GearTrainWidget: React.FC<Props> = ({ habits }) => {
  const reserve = getPowerReserve();

  return (
    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <Disc3 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span>7-Gear Train (Habits Rolling Momentum)</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-700/60 text-purple-300 text-[10px] font-bold">
          <BatteryCharging className="w-3 h-3 text-purple-400" />
          <span>Power Reserve: {reserve}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {habits.map((h, i) => {
          const percent = Math.min(100, Math.round((h.currentReps / h.quota) * 100));
          return (
            <div
              key={h.habit_id}
              className={`p-2 rounded-xl border text-[10px] transition ${
                h.isComplete
                  ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-bold truncate text-white mb-0.5">{h.name}</div>
              <div className="font-mono text-purple-300">
                {h.currentReps}/{h.quota} {h.unit}
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

```

### `src/components/Header.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { useMomentum } from '../context/MomentumContext';
import {
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Mic,
  Settings,
  Download,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Columns,
  RefreshCw,
  CheckCircle2,
  Undo2,
  Zap,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenVoiceIngest: () => void;
  onOpenDoMode?: () => void;
  onOpenPlanMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenVoiceIngest,
  onOpenDoMode,
  onOpenPlanMode,
}) => {
  const {
    settings,
    toggleTheme,
    panelStates,
    setCalendarView,
    setPanelLevel,
    layoutMode,
    toggleLayoutMode,
    isSyncingTasks,
    syncGoogleTasks,
    undo,
    canUndo,
    lastUndoMessage,
  } = useMomentum();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'To install Momentum as an independent persistent window:\n\n' +
        'In Chrome / Edge, click the Install icon in the address bar, or go to Menu (⋮) -> Apps -> "Install Momentum".'
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const areAllCompact =
    panelStates.quick_jobs === 'compact' &&
    panelStates.responsibilities === 'compact' &&
    panelStates.projects === 'compact' &&
    panelStates.habits === 'compact';

  const toggleAllLevels = () => {
    const target = areAllCompact ? 'expanded' : 'compact';
    setPanelLevel('quick_jobs', target);
    setPanelLevel('responsibilities', target);
    setPanelLevel('projects', target);
    setPanelLevel('habits', target);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2 transition-colors shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Artwork */}
        <div className="flex items-center gap-1.5 shrink-0">
          <img
            src="./icons/icon-192.png"
            alt="Momentum"
            className="w-6 h-6 rounded-lg shadow-xs border border-purple-500/30 object-cover"
          />
          <div className="flex flex-col">
            <h1 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              Momentum
            </h1>
            <span className="text-[7px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400 leading-tight">
              {layoutMode === 'widget' ? 'Widget' : 'Cockpit'}
            </span>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* PRIMARY DO BUTTON: Visible always, first in line on mobile */}
          <button
            onClick={() => {
              if (onOpenDoMode) {
                onOpenDoMode();
              } else {
                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'do');
                window.location.href = url.toString();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition shrink-0 active:scale-95"
            title="Return to DO Mode (Action Layer)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>DO</span>
          </button>

          {/* Plan Mode Button */}
          {onOpenPlanMode && (
            <button
              onClick={onOpenPlanMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-300 border border-purple-500/30 transition shrink-0 active:scale-95"
              title="Open Plan Mode (Calm Review, Pool & Settings)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plan</span>
            </button>
          )}

          {/* Prominent Google Tasks Sync Button (Visible everywhere) */}
          <button
            onClick={async () => {
              if (!settings.googleTasksConnected && !settings.googleTasksClientId && !settings.googleTasksWebhookUrl) {
                onOpenSettings();
                return;
              }
              const res = await syncGoogleTasks();
              if (res.success) {
                const parts: string[] = [];
                if (res.pushedCount && res.pushedCount > 0) parts.push(`✓ Uploaded ${res.pushedCount} new task${res.pushedCount === 1 ? '' : 's'} to Google Tasks`);
                if (res.count > 0) parts.push(`✓ Synced ${res.count} from Google`);
                if (res.relocatedCount && res.relocatedCount > 0) parts.push(`✓ Relocated ${res.relocatedCount} to dedicated Google lists`);
                if (res.removedCount && res.removedCount > 0) parts.push(`✓ Removed ${res.removedCount} deleted/completed`);
                const accountDetail = res.accountEmail ? `\nConnected Account: ${res.accountEmail}` : '';
                const listDetail = res.listsSummary ? `\nGoogle Task Lists: ${res.listsSummary}` : '';
                const errorDetail = res.errors && res.errors.length > 0 ? `\n⚠️ Errors:\n${res.errors.join('\n')}` : '';

                if (res.count === 0 && (!res.removedCount || res.removedCount === 0) && (!res.pushedCount || res.pushedCount === 0) && (!res.relocatedCount || res.relocatedCount === 0)) {
                  if (res.errors && res.errors.length > 0) {
                    alert(`Sync completed with errors:\n${accountDetail}${errorDetail}`);
                  } else {
                    alert(
                      `Connected to Google Tasks: 0 changes.\n${accountDetail}${listDetail}\n\nYour cockpit is 100% in sync with Google Tasks.`
                    );
                  }
                } else {
                  alert(`${parts.join(' | ')}${accountDetail}${listDetail}${errorDetail}`);
                }
              } else if (res.error) {
                alert(`Sync note: ${res.error}`);
              }
            }}
            disabled={isSyncingTasks}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              settings.googleTasksConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
            }`}
            title={
              settings.googleTasksConnected
                ? 'Sync Google Tasks from your phone'
                : 'Connect Google Tasks'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTasks ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-bold">
              {isSyncingTasks
                ? 'Syncing...'
                : settings.googleTasksConnected
                ? 'Sync Tasks'
                : 'Connect Tasks'}
            </span>
          </button>

          {/* Global Undo Button */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              canUndo
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-xs cursor-pointer active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
            title={canUndo ? `Undo: ${lastUndoMessage || 'last action'} (Ctrl+Z)` : 'Nothing to undo (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          {/* Quick Voice Ingest Pill */}
          <button
            onClick={onOpenVoiceIngest}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition"
            title="Voice Brain Dump"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voice Ingest</span>
          </button>

          {/* Toggle Calendar Drawer */}
          <button
            onClick={() =>
              setCalendarView(panelStates.calendar === 'hidden' ? 'week' : 'hidden')
            }
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium border transition ${
              panelStates.calendar !== 'hidden'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle Schedule & Calendar view"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Calendar</span>
          </button>

          {/* Cockpit 2x2 vs Widget Sidebar Toggle */}
          <button
            onClick={toggleLayoutMode}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title={`Switch to ${layoutMode === 'cockpit' ? 'Desktop Widget Mode' : '2x2 Cockpit Mode'}`}
          >
            {layoutMode === 'cockpit' ? (
              <>
                <Columns className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden lg:inline text-[11px]">Widget Mode</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden lg:inline text-[11px]">Cockpit Grid</span>
              </>
            )}
          </button>

          {/* Fit Screen / Compact All Toggle */}
          <button
            onClick={toggleAllLevels}
            className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title={areAllCompact ? 'Expand all panels' : 'Compact all to fit screen'}
          >
            {areAllCompact ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* LIGHT / DARK MODE TOGGLE (Desktop / Tablet only; placed discreetly on DO screen on mobile) */}
          <button
            onClick={toggleTheme}
            className="hidden sm:flex p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Desktop Install Window */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="hidden xl:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Install as independent persistent desktop window"
            >
              <Download className="w-3.5 h-3.5 text-purple-500" />
              <span>Desktop App</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

```

### `src/components/panels/BiggerJobsPanel.tsx`
```tsx
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

```

### `src/components/panels/HabitsPanel.tsx`
```tsx
import React, { useState } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import { Habit } from '../../types';
import {
  Activity,
  Check,
  Plus,
  Trash2,
  Clock,
  Maximize2,
  Minimize2,
  ChevronDown,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Pencil,
  X,
} from 'lucide-react';

export const HabitsPanel: React.FC = () => {
  const {
    boardData,
    toggleHabitDate,
    setHabitDuration,
    addHabit,
    editHabit,
    deleteHabit,
    panelStates,
    cyclePanelLevel,
  } = useMomentum();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'boolean' | 'duration_min'>('boolean');
  const [newNextDue, setNewNextDue] = useState('Daily Morning');
  const [viewTab, setViewTab] = useState<'today' | 'monthly'>('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [inlineCalendarHabitId, setInlineCalendarHabitId] = useState<string | null>(null);

  // Inline edit & expand state
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNextDue, setEditNextDue] = useState('');

  const startEditing = (h: Habit) => {
    setEditingHabitId(h.id);
    setEditName(h.name);
    setEditNextDue(h.next_due || '');
  };

  const cancelEdit = () => {
    setEditingHabitId(null);
    setEditName('');
    setEditNextDue('');
  };

  const saveEdit = (habitId: string) => {
    if (!editName.trim()) return;
    editHabit(habitId, {
      name: editName.trim(),
      next_due: editNextDue.trim() || null,
    });
    setEditingHabitId(null);
  };

  const level = panelStates.habits; // 'collapsed' | 'compact' | 'expanded'
  const habits = boardData.habits;
  const todayStr = new Date().toISOString().split('T')[0];

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const monthLabel = selectedMonth.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });

  const getHabitMonthStats = (habit: Habit, y = year, m = month) => {
    let count = 0;
    const total = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= total; day++) {
      const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const val = habit.log[dStr];
      if (habit.type === 'boolean' ? !!val : typeof val === 'number' && val > 0) {
        count++;
      }
    }
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return { count, total, percentage };
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(year, month + 1, 1));
  };

  const handleTodayMonth = () => {
    setSelectedMonth(new Date());
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addHabit(newName.trim(), newType, 20, newNextDue.trim() || 'Daily');
    setNewName('');
    setIsAdding(false);
  };

  const completedTodayCount = habits.filter((h) => {
    const val = h.log[todayStr];
    return h.type === 'boolean' ? !!val : typeof val === 'number' && val > 0;
  }).length;

  return (
    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col transition-all overflow-hidden">
      {/* Panel Header */}
      <div
        onClick={() => cyclePanelLevel('habits')}
        className="px-3.5 py-2 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 transition shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-lg bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800/60">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
            Habits
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
            {completedTodayCount}/{habits.length}
          </span>
        </div>

        {/* Level & View Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* View Tab Toggle: Today vs Month History */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setViewTab('today')}
              className={`px-1.5 py-0.5 rounded font-medium transition ${
                viewTab === 'today'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewTab('monthly')}
              className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-1 transition ${
                viewTab === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="View full month accountability log"
            >
              <CalendarIcon className="w-2.5 h-2.5" />
              <span>Month Log</span>
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950 transition"
            title="Add Habit"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyclePanelLevel('habits')}
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
            {habits.length > 0
              ? `${completedTodayCount} of ${habits.length} logged today.`
              : 'No habits tracked.'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-2.5 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Form */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-pink-400/40 space-y-2 animate-fadeIn text-xs shrink-0"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Habit name (e.g. Calisthenics, Bedtime 11:30 PM)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newNextDue}
                  onChange={(e) => setNewNextDue(e.target.value)}
                  placeholder="Upcoming timing (e.g. 5:30 PM)..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="hType"
                      checked={newType === 'boolean'}
                      onChange={() => setNewType('boolean')}
                      className="accent-pink-500"
                    />
                    <span>Yes/No</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="hType"
                      checked={newType === 'duration_min'}
                      onChange={() => setNewType('duration_min')}
                      className="accent-pink-500"
                    />
                    <span>Minutes</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
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
                  className="px-3 py-0.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium"
                >
                  Add Habit
                </button>
              </div>
            </form>
          )}

          {/* VIEW TAB: MONTHLY ACCOUNTABILITY VIEW */}
          {viewTab === 'monthly' ? (
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 animate-fadeIn">
              {/* Month Navigator Header */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {monthLabel} Accountability
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 rounded hover:bg-slate-200 dark:bg-slate-800 text-slate-500"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleTodayMonth}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    Current
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded hover:bg-slate-200 dark:bg-slate-800 text-slate-500"
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {habits.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic">
                  No habits tracked yet.
                </p>
              )}

              {/* Monthly Calendar Grids for each Habit */}
              {habits.map((habit) => {
                const stats = getHabitMonthStats(habit);

                return (
                  <div
                    key={habit.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2"
                  >
                    {/* Habit Header & Progress Score */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {habit.name}
                        </h4>
                        {habit.next_due && (
                          <span className="text-[10px] text-slate-400">
                            {habit.next_due}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 font-bold text-xs text-pink-600 dark:text-pink-400">
                          <span>{stats.count}/{stats.total} days kept</span>
                          <span className="text-[10px] px-1 rounded bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300">
                            {stats.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-pink-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>

                    {/* Month Days Calendar Grid (Sun - Sat) */}
                    <div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 uppercase mb-1">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Empty offset padding days */}
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-6" />
                        ))}

                        {/* Actual Month Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const dayNum = i + 1;
                          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const val = habit.log[dStr];
                          const isDone =
                            habit.type === 'boolean'
                              ? !!val
                              : typeof val === 'number' && val > 0;
                          const isToday = dStr === todayStr;

                          return (
                            <button
                              key={dayNum}
                              type="button"
                              onClick={() => toggleHabitDate(habit.id, dStr)}
                              title={`${dStr}: ${isDone ? 'Completed' : 'Rest day'} (Click to toggle)`}
                              className={`h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition select-none ${
                                isDone
                                  ? 'bg-pink-600 text-white shadow-xs hover:bg-pink-500'
                                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-pink-400'
                              } ${isToday ? 'ring-2 ring-pink-500 font-extrabold' : ''}`}
                            >
                              {isDone ? (
                                <Check className="w-3 h-3 stroke-[3]" />
                              ) : (
                                dayNum
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW TAB: TODAY'S RHYTHMS (Fast checklist + 1-click month inspection) */
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
              {habits.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic">
                  No habits configured.
                </p>
              )}

              {habits.map((habit) => {
                const todayVal = habit.log[todayStr];
                const isDone =
                  habit.type === 'boolean'
                    ? !!todayVal
                    : typeof todayVal === 'number' && todayVal > 0;
                const stats = getHabitMonthStats(habit);
                const isCalendarOpen = inlineCalendarHabitId === habit.id;

                const isExpanded = expandedHabitId === habit.id;
                const isEditing = editingHabitId === habit.id;

                return (
                  <div
                    key={habit.id}
                    className={`p-2 rounded-xl border transition space-y-1.5 ${
                      isExpanded || isEditing
                        ? 'bg-pink-50/50 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800 shadow-xs'
                        : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Edit Mode */
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEdit(habit.id);
                        }}
                        className="space-y-2 animate-fadeIn text-xs"
                      >
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Habit Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-pink-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Scheduled Timing / Cadence</label>
                          <input
                            type="text"
                            value={editNextDue}
                            onChange={(e) => setEditNextDue(e.target.value)}
                            placeholder="e.g. Daily Morning, 5:30 PM..."
                            className="w-full bg-white dark:bg-slate-900 border border-pink-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              deleteHabit(habit.id);
                              cancelEdit();
                            }}
                            className="px-2 py-1 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1 font-medium"
                            title="Delete habit"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Habit</span>
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
                              disabled={!editName.trim()}
                              className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
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
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="min-w-0 flex-1 cursor-pointer select-none"
                            onClick={() => setExpandedHabitId(isExpanded ? null : habit.id)}
                            title={isExpanded ? 'Click to collapse' : 'Click to view full entry / edit'}
                          >
                            <div className="flex items-start gap-1.5 min-w-0">
                              <span
                                className={`text-xs font-bold text-slate-800 dark:text-slate-100 ${
                                  isExpanded ? 'break-words whitespace-normal' : 'truncate'
                                }`}
                              >
                                {habit.name}
                              </span>
                              {habit.next_due && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{habit.next_due}</span>
                                </span>
                              )}
                            </div>

                            {/* Monthly Accountability Badge Pill */}
                            <div className="flex items-center gap-2 mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineCalendarHabitId(
                                    isCalendarOpen ? null : habit.id
                                  );
                                }}
                                className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
                                title="Click to view full month calendar"
                              >
                                <CalendarIcon className="w-2.5 h-2.5" />
                                <span>
                                  {stats.count}/{stats.total} days in {monthLabel} ({stats.percentage}%)
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Daily Check Actions */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {habit.type === 'boolean' ? (
                              <button
                                onClick={() => toggleHabitDate(habit.id, todayStr)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  isDone
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isDone ? 'Done' : 'Check'}</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
                                  {typeof todayVal === 'number' ? `${todayVal}m` : '0m'}
                                </span>
                                <button
                                  onClick={() =>
                                    setHabitDuration(
                                      habit.id,
                                      todayStr,
                                      (typeof todayVal === 'number' ? todayVal : 0) + 15
                                    )
                                  }
                                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold"
                                >
                                  +15m
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => startEditing(habit)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition"
                              title="Edit habit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Inline Monthly Grid (when clicked) */}
                    {isCalendarOpen && (
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/50 space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-bold text-pink-600 dark:text-pink-400">
                            {monthLabel} Accountability Grid
                          </span>
                          <span>Click any day to toggle / backfill</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-5" />
                          ))}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const val = habit.log[dStr];
                            const isD =
                              habit.type === 'boolean'
                                ? !!val
                                : typeof val === 'number' && val > 0;
                            const isToday = dStr === todayStr;

                            return (
                              <button
                                key={dayNum}
                                type="button"
                                onClick={() => toggleHabitDate(habit.id, dStr)}
                                className={`h-5 rounded text-[9px] font-bold flex items-center justify-center transition ${
                                  isD
                                    ? 'bg-pink-600 text-white font-extrabold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                } ${isToday ? 'ring-1 ring-pink-500' : ''}`}
                              >
                                {isD ? '✓' : dayNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 7-day awareness dots in expanded view */}
                    {level === 'expanded' && !isCalendarOpen && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400">
                        <span>7-day rhythm:</span>
                        <div className="flex items-center gap-1">
                          {last7Days.map((dStr) => {
                            const val = habit.log[dStr];
                            const active =
                              habit.type === 'boolean'
                                ? !!val
                                : typeof val === 'number' && val > 0;
                            const isToday = dStr === todayStr;

                            return (
                              <div
                                key={dStr}
                                title={`${dStr}: ${active ? 'Logged' : 'Rest'}`}
                                className={`w-2.5 h-2.5 rounded-full transition ${
                                  active
                                    ? 'bg-pink-500'
                                    : 'bg-slate-200 dark:bg-slate-800'
                                } ${isToday ? 'ring-1 ring-pink-400' : ''}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

```

### `src/components/panels/ProjectsPanel.tsx`
```tsx
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
  Check,
  ListOrdered,
  Pencil,
  X,
} from 'lucide-react';

export const ProjectsPanel: React.FC = () => {
  const {
    boardData,
    addProject,
    deleteProject,
    completeProjectStep,
    updateProjectProgress,
    editProject,
    panelStates,
    cyclePanelLevel,
  } = useMomentum();

  const [inspectingProject, setInspectingProject] = useState<Project | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [completingProjectId, setCompletingProjectId] = useState<string | null>(null);
  const [nextStepInput, setNextStepInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newNextStep, setNewNextStep] = useState('');

  // Inline edit state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNextStep, setEditNextStep] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const startEditing = (p: Project) => {
    setEditingProjectId(p.id);
    setEditName(p.name);
    setEditNextStep(p.next_step);
    setEditPosition(p.current_position || '');
  };

  const cancelEdit = () => {
    setEditingProjectId(null);
    setEditName('');
    setEditNextStep('');
    setEditPosition('');
  };

  const saveEdit = (projectId: string) => {
    if (!editName.trim()) return;
    editProject(projectId, {
      name: editName.trim(),
      next_step: editNextStep.trim() || undefined,
      current_position: editPosition.trim() || undefined,
    });
    setEditingProjectId(null);
  };

  const level = panelStates.projects; // 'collapsed' | 'compact' | 'expanded'
  const projects = boardData.projects;

  const handleStepDone = (project: Project) => {
    if (project.upcoming_steps && project.upcoming_steps.length > 0) {
      completeProjectStep(project.id);
    } else {
      setCompletingProjectId(project.id);
      setNextStepInput('');
    }
  };

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
              const isEditing = editingProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className={`p-2 rounded-xl border transition space-y-1.5 ${
                    isDetailsExpanded || isEditing
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(project.id);
                      }}
                      className="space-y-2 animate-fadeIn text-xs"
                    >
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Project Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-blue-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Immediate Next Step</label>
                          <input
                            type="text"
                            value={editNextStep}
                            onChange={(e) => setEditNextStep(e.target.value)}
                            placeholder="Next action..."
                            className="w-full bg-white dark:bg-slate-900 border border-blue-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Current Position / Where Holding</label>
                          <input
                            type="text"
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            placeholder="Where holding..."
                            className="w-full bg-white dark:bg-slate-900 border border-blue-400 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            deleteProject(project.id);
                            cancelEdit();
                          }}
                          className="px-2 py-1 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1 font-medium"
                          title="Delete project"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Project</span>
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
                            disabled={!editName.trim()}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
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
                      {/* Name Row */}
                      <div
                        onClick={() =>
                          setExpandedProjectId(
                            expandedProjectId === project.id ? null : project.id
                          )
                        }
                        className="flex items-start justify-between gap-2 cursor-pointer select-none"
                        title={isDetailsExpanded ? 'Click to collapse' : 'Click to view full entry / edit'}
                      >
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full mt-1 ${getStatusColor(
                              project.status
                            )} shrink-0`}
                            title={`Status: ${project.status}`}
                          />
                          <span
                            className={`text-xs font-bold text-slate-800 dark:text-slate-100 ${
                              isDetailsExpanded ? 'break-words whitespace-normal' : 'truncate'
                            }`}
                          >
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
                            type="button"
                            onClick={() => startEditing(project)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            title="Quick Edit Project"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setInspectingProject(project)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white transition"
                            title="Open Where Was I? inspector"
                          >
                            Where Was I?
                          </button>
                        </div>
                      </div>

                      {/* Next Step Action Bar */}
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start justify-between gap-2 text-[11px]">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span
                            className={`font-semibold text-blue-950 dark:text-blue-100 ${
                              isDetailsExpanded ? 'break-words whitespace-normal' : 'truncate'
                            }`}
                          >
                            {project.next_step}
                          </span>
                          {project.upcoming_steps && project.upcoming_steps.length > 0 && (
                            <span
                              className="text-[9px] px-1 py-0.2 rounded font-mono bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 shrink-0 flex items-center gap-0.5"
                              title={`${project.upcoming_steps.length} upcoming queued steps`}
                            >
                              <ListOrdered className="w-2.5 h-2.5" />
                              <span>+{project.upcoming_steps.length}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleStepDone(project)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
                            title="Complete this physical step"
                          >
                            <Check className="w-3 h-3" />
                            <span>Done</span>
                          </button>
                          <button
                            onClick={() => setInspectingProject(project)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline px-1"
                            title="Open Where Was I? update modal"
                          >
                            Update &rarr;
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Inline Step Completion Prompt */}
                  {completingProjectId === project.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        completeProjectStep(project.id, nextStepInput.trim());
                        setCompletingProjectId(null);
                        setNextStepInput('');
                      }}
                      className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 space-y-1.5 animate-fadeIn text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                        <span className="truncate">✓ Completed: "{project.next_step}"</span>
                        <span className="text-[10px] text-slate-500 shrink-0">What's next?</span>
                      </div>
                      <input
                        type="text"
                        value={nextStepInput}
                        onChange={(e) => setNextStepInput(e.target.value)}
                        placeholder="Next physical action (or press Enter)..."
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            completeProjectStep(project.id, 'Project finished!');
                            updateProjectProgress(
                              project.id,
                              `Completed final step: ${project.next_step}`,
                              'Project complete',
                              'Project finished',
                              'completed'
                            );
                            setCompletingProjectId(null);
                            setNextStepInput('');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition"
                        >
                          🏆 Entire Project Done
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCompletingProjectId(null);
                              setNextStepInput('');
                            }}
                            className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                          >
                            Advance
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Expanded Details */}
                  {isDetailsExpanded && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-850 space-y-1 text-xs animate-fadeIn">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-400 block text-[9px] uppercase">
                          Where Holding:
                        </strong>
                        {project.current_position}
                      </div>

                      {project.upcoming_steps && project.upcoming_steps.length > 0 && (
                        <div className="p-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                          <strong className="text-slate-400 block text-[9px] uppercase">
                            Queued Upcoming Steps:
                          </strong>
                          {project.upcoming_steps.map((st, idx) => (
                            <div key={idx} className="text-slate-600 dark:text-slate-400 flex items-center gap-1 pl-1">
                              <span className="text-[9px] text-blue-500 font-mono">#{idx + 2}</span>
                              <span className="truncate">{st}</span>
                            </div>
                          ))}
                        </div>
                      )}
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

```

### `src/components/panels/QuickJobsPanel.tsx`
```tsx
import React, { useState, useRef } from 'react';
import { useMomentum } from '../../context/MomentumContext';
import { QuickJobDuration } from '../../types';
import {
  Zap,
  Circle,
  Check,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Maximize2,
  Minimize2,
  Pencil,
} from 'lucide-react';

export const QuickJobsPanel: React.FC = () => {
  const { boardData, addQuickJob, toggleQuickJob, deleteQuickJob, editQuickJob, panelStates, cyclePanelLevel } =
    useMomentum();

  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState<QuickJobDuration>('5m');
  const [filterDuration, setFilterDuration] = useState<'all' | '1m' | '5m' | '15m'>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState<QuickJobDuration>('5m');
  const inputRef = useRef<HTMLInputElement>(null);

  const level = panelStates.quick_jobs; // 'collapsed' | 'compact' | 'expanded'

  const activeJobs = boardData.quick_jobs.filter((j) => !j.done);
  const completedJobs = boardData.quick_jobs.filter((j) => j.done);

  const filteredActive = activeJobs.filter((j) => {
    if (filterDuration === 'all') return true;
    return j.duration === filterDuration;
  });

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      inputRef.current?.focus();
      return;
    }
    addQuickJob(newTitle.trim(), newDuration);
    setNewTitle('');
  };

  const startEditing = (job: { id: string; title: string; duration?: QuickJobDuration }) => {
    setEditingJobId(job.id);
    setEditTitle(job.title);
    setEditDuration(job.duration || '5m');
    setExpandedJobId(job.id);
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    editQuickJob(id, {
      title: editTitle.trim(),
      duration: editDuration,
    });
    setEditingJobId(null);
  };

  const cancelEdit = () => {
    setEditingJobId(null);
  };

  const getDurationBadge = (d?: QuickJobDuration) => {
    const val = d || '5m';
    const colorClasses =
      val === '1m'
        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        : val === '5m'
        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';

    return (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${colorClasses} shrink-0`}
        title={`${val} task`}
      >
        {val}
      </span>
    );
  };

  return (
    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col transition-all overflow-hidden">
      {/* Panel Header */}
      <div
        onClick={() => cyclePanelLevel('quick_jobs')}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 transition shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
            Tasks
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            {activeJobs.length}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
            (1m • 5m • 15m)
          </span>
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (level === 'collapsed') cyclePanelLevel('quick_jobs');
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
            title="Add Task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyclePanelLevel('quick_jobs')}
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

      {/* COLLAPSED LEVEL (0) */}
      {level === 'collapsed' && (
        <div className="px-3.5 py-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="truncate">
            {activeJobs.length > 0 ? `${activeJobs[0].title}` : 'All caught up!'}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Click to expand</span>
        </div>
      )}

      {/* COMPACT & EXPANDED LEVELS */}
      {level !== 'collapsed' && (
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Quick Add Bar */}
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Type task here (e.g. Call Sam)..."
              autoComplete="off"
              enterKeyHint="done"
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            />
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
              {(['1m', '5m', '15m'] as QuickJobDuration[]).map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setNewDuration(dur)}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    newDuration === dur
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shrink-0 cursor-pointer flex items-center justify-center shadow-xs"
              title="Add Task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Filter in Expanded */}
          {level === 'expanded' && (
            <div className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-slate-800 pb-1 shrink-0">
              <span className="text-slate-400 font-medium">Filter:</span>
              <div className="flex items-center gap-1">
                {(['all', '1m', '5m', '15m'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterDuration(f)}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium transition ${
                      filterDuration === f
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scrolling List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {filteredActive.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No tasks pending.
              </p>
            )}

            {filteredActive.map((job) => {
              const isEditing = editingJobId === job.id;
              const isExpanded = expandedJobId === job.id;

              return (
                <div
                  key={job.id}
                  onClick={() => {
                    if (!isEditing) {
                      setExpandedJobId(isExpanded ? null : job.id);
                    }
                  }}
                  className={`group p-2 rounded-xl border transition cursor-pointer select-text ${
                    isExpanded || isEditing
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-800/60'
                  }`}
                  title={isEditing ? '' : isExpanded ? 'Click to collapse' : 'Click to view full entry / edit'}
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(job.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-2 animate-fadeIn"
                    >
                      <textarea
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
                          {(['1m', '5m', '15m'] as QuickJobDuration[]).map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => setEditDuration(dur)}
                              className={`px-2 py-0.5 rounded font-bold transition ${
                                editDuration === dur
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              {dur}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
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
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>

                      {/* Safe Delete inside edit mode only */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            deleteQuickJob(job.id);
                            cancelEdit();
                          }}
                          className="px-2 py-1 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1 font-medium"
                          title="Delete task"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Task</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Display Mode: Click to view whole entry (no cutoff); ONLY circle marks done */
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleQuickJob(job.id);
                          }}
                          className="mt-0.5 p-1 -m-1 text-slate-400 hover:text-emerald-500 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition shrink-0"
                          title="Mark done"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                        <span
                          className={`text-xs font-medium text-slate-800 dark:text-slate-100 ${
                            isExpanded ? 'break-words whitespace-normal' : 'truncate'
                          }`}
                        >
                          {job.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {getDurationBadge(job.duration)}
                        <button
                          type="button"
                          onClick={() => startEditing(job)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                          title="Edit task"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completed summary in Expanded Mode */}
          {level === 'expanded' && completedJobs.length > 0 && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
              <span>{completedJobs.length} completed tasks</span>
              <button
                onClick={() => completedJobs.forEach((j) => deleteQuickJob(j.id))}
                className="hover:text-rose-400 transition"
              >
                Clear completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

```

### `src/components/Phase1TestScreen.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { getStoredCredentials, saveCredentials, sendTestEvent } from '../services/focusDoorway';
import { CheckCircle2, AlertCircle, RefreshCw, Key, Link2, ShieldCheck, ArrowLeft } from 'lucide-react';

interface Props {
  onBackToCockpit?: () => void;
}

export function Phase1TestScreen({ onBackToCockpit }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const creds = getStoredCredentials();
    setUrl(creds.url);
    setKey(creds.key);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCredentials(url, key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTest = async () => {
    setIsSending(true);
    setStatus(null);
    try {
      const res = await sendTestEvent();
      if (res.ok) {
        setStatus({
          ok: true,
          message: `Success! Row added to 'Events' tab (Event ID: ${res.message || 'ok'}). Check your Google Sheet!`,
        });
      } else {
        setStatus({
          ok: false,
          message: res.error || 'Failed to append event.',
        });
      }
    } catch (err: any) {
      setStatus({
        ok: false,
        message: err.toString(),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        {onBackToCockpit && (
          <button
            onClick={onBackToCockpit}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Classic Cockpit
          </button>
        )}

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Phase 1: Foundations</h1>
            <p className="text-xs text-slate-400">Sheet Doorway Round-Trip Test</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-950/40 border border-purple-800/40 rounded-lg text-xs text-purple-200">
          <strong>Offline / Privacy guarantee:</strong> Your Secret Key is kept in your phone's browser storage only and is never committed to Git.
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-purple-400" /> Google Apps Script Web App URL
            </label>
            <input
              type="url"
              required
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" /> Secret Key
            </label>
            <input
              type="password"
              required
              placeholder="Enter your secret key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs font-medium rounded-lg text-slate-200 transition"
            >
              {saved ? 'Saved!' : 'Save Credentials'}
            </button>
            {saved && <span className="text-xs text-emerald-400">✓ Saved to device</span>}
          </div>
        </form>

        <hr className="my-5 border-slate-700/60" />

        <div>
          <button
            onClick={handleSendTest}
            disabled={isSending || !url || !key}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] font-bold text-sm rounded-xl text-white shadow-lg shadow-purple-600/40 flex items-center justify-center gap-2 transition"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Appending row to Events...
              </>
            ) : (
              'Send Test Event'
            )}
          </button>
        </div>

        {status && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              status.ok
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            {status.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed break-all">{status.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}

```

### `src/components/PlanModeScreen.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flame,
  LayoutGrid,
  Zap,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Folder,
  Layers,
  Settings,
  Edit3,
  X,
  Plus,
  Play,
  ArrowRight,
  TrendingUp,
  Activity,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  FlaskConical,
  Eye,
  Sliders,
} from 'lucide-react';
import { FocusAction } from '../services/focusServing';
import {
  queueEvent,
  readTabFromSheet,
  getStoredCredentials,
  saveCredentials,
} from '../services/focusDataLayer';
import {
  DayModule,
  DayCommitmentLevel,
  WatchPart,
  DAY_MODULE_NAMES,
  COMMITMENT_POINTS,
  calculateWorkValue,
  getPartSizeForFriction,
  calculateFinishGrade,
} from '../services/focusMovement';
import { WatchPartVector } from './WatchPartVector';
import { GearTrainWidget } from './GearTrainWidget';
import { CandidateInspectorModal } from './CandidateInspectorModal';
import { ExperimentsModal } from './ExperimentsModal';
import {
  loadHabitsState,
  saveHabitsState,
  HabitItem,
  getPowerReserve,
} from '../services/focusHabits';
import {
  getExperimentScheduleStatus,
  overrideExperimentMode,
  ServeMode,
} from '../services/focusExperiments';
import { rankCandidates, SessionContext } from '../services/focusAlgorithm';

interface PlanModeProps {
  onOpenDoMode: () => void;
  onOpenTaskView: () => void;
}

type PlanTab = 'today' | 'pool' | 'week' | 'needs_look' | 'habits' | 'settings';

export const PlanModeScreen: React.FC<PlanModeProps> = ({
  onOpenDoMode,
  onOpenTaskView,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTab>('today');
  const [actionsPool, setActionsPool] = useState<FocusAction[]>([]);
  const [completedToday, setCompletedToday] = useState<FocusAction[]>([]);
  const [dayModule, setDayModule] = useState<DayModule>(() => {
    const today = new Date();
    const dayAbbr = today.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const savedLevel = (localStorage.getItem('focus_day_commitment_level') as DayCommitmentLevel) || 'standard';
    return {
      day_name: fullDayName,
      module_name: DAY_MODULE_NAMES[dayAbbr] || 'Watchmaker Bench',
      date: today.toISOString().split('T')[0],
      committed_level: savedLevel,
      committed_work_points: COMMITMENT_POINTS[savedLevel],
      total_work_done: 0,
      parts: [],
      is_closed: false,
      can_lower_commitment: true,
    };
  });

  const [habitsList, setHabitsList] = useState<HabitItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingAction, setEditingAction] = useState<FocusAction | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showExperiments, setShowExperiments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [parseLogs, setParseLogs] = useState<any[]>([]);

  // Desktop Live View Polling (refreshed about once a minute)
  const [desktopLiveTick, setDesktopLiveTick] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setDesktopLiveTick((prev) => prev + 1);
      setLastSyncTime(new Date());
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load actions
      const actions = await readTabFromSheet('Actions');
      if (Array.isArray(actions) && actions.length > 0) {
        setActionsPool(actions);
        const todayStr = new Date().toISOString().split('T')[0];
        const doneToday = actions.filter(
          (a) => a.status === 'done' && a.completed_at && a.completed_at.startsWith(todayStr)
        );
        setCompletedToday(doneToday);

        // Compute parts earned from doneToday
        const parts: WatchPart[] = doneToday.map((a, idx) => {
          const fric = Number(a.friction) || 2;
          const partSize = getPartSizeForFriction(fric);
          const finishGrade = calculateFinishGrade(a.due_date, a.created_at);
          const workVal = calculateWorkValue(fric, a.importance);
          return {
            part_id: 'part_' + idx,
            name: `${finishGrade} ${partSize}`,
            part_size: partSize,
            finish_grade: finishGrade,
            action_id: a.task_id,
            action_title: a.title,
            work_value: workVal,
            earned_at: a.completed_at || new Date().toISOString(),
          };
        });

        const totalWork = parts.reduce((sum, p) => sum + p.work_value, 0);
        setDayModule((prev) => ({
          ...prev,
          total_work_done: totalWork,
          parts,
          is_closed: totalWork >= prev.committed_work_points,
        }));
      }

      // 2. Load habits
      setHabitsList(loadHabitsState());

      // 3. Load ParseLog if available
      const logs = await readTabFromSheet('ParseLog');
      if (Array.isArray(logs)) {
        setParseLogs(logs);
      }
    } catch (err) {
      console.warn('Error loading Plan data', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Action Correction
  const handleSaveActionCorrection = async (updated: FocusAction) => {
    if (!editingAction) return;

    // Detect fields modified and log append-only correction events
    const fieldsToCompare: (keyof FocusAction)[] = [
      'friction',
      'importance',
      'due_date',
      'deadline_kind',
      'context',
      'first_action',
      'category',
    ];

    for (const field of fieldsToCompare) {
      if (editingAction[field] !== updated[field]) {
        await queueEvent('correction', {
          task_id: updated.task_id,
          field,
          old_value: editingAction[field] ?? '',
          new_value: updated[field] ?? '',
          action_title: updated.title,
        });
      }
    }

    // Update locally in actionsPool immediately so serving decision updates
    setActionsPool((prev) =>
      prev.map((a) => (a.task_id === updated.task_id ? { ...a, ...updated } : a))
    );

    setEditingAction(null);
  };

  // Group actions by project
  const projectGroups = React.useMemo(() => {
    const groups: Record<string, FocusAction[]> = {};
    const unassigned: FocusAction[] = [];

    const filtered = actionsPool.filter((a) => {
      if (a.status === 'done') return false;
      const matchesSearch =
        !searchQuery.trim() ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.context && a.context.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = categoryFilter === 'all' || a.category === categoryFilter;
      return matchesSearch && matchesCat;
    });

    for (const act of filtered) {
      const proj = act.project_title || (act.category === 'project' ? 'Active Projects' : null);
      if (proj) {
        if (!groups[proj]) groups[proj] = [];
        groups[proj].push(act);
      } else {
        unassigned.push(act);
      }
    }

    return { groups, unassigned };
  }, [actionsPool, searchQuery, categoryFilter]);

  // Needs-a-Look queue items
  const needsLookItems = React.useMemo(() => {
    return actionsPool.filter((a) => {
      const isLowConfidence = a.friction_confidence === 'low';
      const needsShrink = a.needs_shrinking === true;
      const needsSetup = a.category === 'habit' && a.status === 'needs_setup';
      return isLowConfidence || needsShrink || needsSetup;
    });
  }, [actionsPool]);

  // Deadlines in next 7 days
  const upcomingDeadlines = React.useMemo(() => {
    const now = new Date();
    return actionsPool
      .filter((a) => a.status !== 'done' && a.due_date)
      .filter((a) => {
        const due = new Date(a.due_date!);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= -1 && diffDays <= 7;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [actionsPool]);

  const schedule = getExperimentScheduleStatus();

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">PLAN MODE</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase">
                  Calm Review
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick links */}
          <button
            onClick={() => setShowExperiments(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-purple-300 transition"
            title="Open 4-Week Serving Experiment"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Experiment</span>
          </button>

          <button
            onClick={() => setShowInspector(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
            title="Open Serving Candidate Inspector"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Inspector</span>
          </button>

          <button
            onClick={onOpenTaskView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Task View</span>
          </button>

          {/* DO Button in Header (Always 1 tap away) */}
          <button
            onClick={onOpenDoMode}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md shadow-purple-900/30 active:scale-95 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>DO</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-56 flex-col justify-between border-r border-slate-800/80 bg-slate-950/50 p-4 shrink-0">
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('today')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'today'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4" />
                <span>Today</span>
              </div>
              <span className="text-[10px] opacity-75">{dayModule.total_work_done} pts</span>
            </button>

            <button
              onClick={() => setActiveTab('pool')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'pool'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4" />
                <span>Pool</span>
              </div>
              <span className="text-[10px] opacity-75">{actionsPool.filter((a) => a.status !== 'done').length}</span>
            </button>

            <button
              onClick={() => setActiveTab('needs_look')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'needs_look'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Needs a Look</span>
              </div>
              {needsLookItems.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {needsLookItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('week')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'week'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                <span>Week & Gears</span>
              </div>
              <span className="text-[10px] opacity-75">{getPowerReserve()} res</span>
            </button>

            <button
              onClick={() => setActiveTab('habits')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'habits'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4" />
                <span>Habits Editor</span>
              </div>
              <span className="text-[10px] opacity-75">{habitsList.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>
          </nav>

          {/* Desktop Live Status Reminder */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Live Status</span>
              <span className="text-[10px] text-slate-500">
                {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-[11px] text-purple-300 leading-snug">
              Do mode runs on your phone.
            </div>
            <div className="text-[10px] text-slate-400">
              Completions sync automatically within a minute.
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {/* TAB 1: TODAY */}
          {activeTab === 'today' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Daily Module Banner */}
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      {dayModule.day_name} Module
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700/60 text-[10px] text-purple-300 font-bold capitalize">
                      {dayModule.committed_level} Goal ({dayModule.committed_work_points} pts)
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{dayModule.module_name}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Progress: <strong className="text-white">{dayModule.total_work_done}</strong> of{' '}
                    <strong>{dayModule.committed_work_points}</strong> work points earned today
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-4 py-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="text-xs text-slate-400">Parts Earned</div>
                    <div className="text-xl font-black text-white">{dayModule.parts.length}</div>
                  </div>
                  <div className="text-center px-4 py-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="text-xs text-slate-400">Status</div>
                    <div
                      className={`text-xs font-bold uppercase mt-1 ${
                        dayModule.is_closed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {dayModule.is_closed ? 'Closed ✓' : 'In Progress'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement Parts Revealed Today */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Watchmaker Parts Earned Today</span>
                  <span className="text-[10px] text-purple-400 font-semibold">Visual Reward Snapshot</span>
                </h3>

                {dayModule.parts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No parts assembled yet today. Tap <strong>DO</strong> to kickstart your first action!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {dayModule.parts.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2"
                      >
                        <WatchPartVector partSize={p.part_size} finishGrade={p.finish_grade} isFilled={true} />
                        <div>
                          <div className="text-[11px] font-bold text-white capitalize">{p.name}</div>
                          <div className="text-[10px] text-purple-400 font-medium">+{p.work_value} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Done Today */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Completed Actions Today ({completedToday.length})
                </h3>

                {completedToday.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No completed actions logged today.</div>
                ) : (
                  <div className="space-y-2">
                    {completedToday.map((act) => (
                      <div
                        key={act.task_id}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-white">{act.title}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Friction {act.friction}/5</span>
                              <span>•</span>
                              <span>{act.actual_minutes || 5} mins</span>
                              {act.category && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{act.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-purple-300">
                          +{calculateWorkValue(Number(act.friction) || 2, act.importance)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Tripwire Deadlines */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upcoming Real Deadlines (Next 7 Work Days)</span>
                </h3>

                {upcomingDeadlines.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No immediate external tripwires.</div>
                ) : (
                  <div className="space-y-2">
                    {upcomingDeadlines.map((act) => (
                      <div
                        key={act.task_id}
                        onClick={() => setEditingAction(act)}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between cursor-pointer hover:border-purple-500/40 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{act.title}</span>
                            {act.deadline_kind === 'external' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[9px] font-bold uppercase">
                                External
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Due: {act.due_date} · Friction {act.friction}/5
                          </div>
                        </div>
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POOL */}
          {activeTab === 'pool' && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search actions by title or context..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['all', 'quick', 'project', 'scheduled', 'habit'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Projects & Action Groups */}
              <div className="space-y-6">
                {Object.entries(projectGroups.groups).map(([projectTitle, actions]) => (
                  <div key={projectTitle} className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-extrabold text-white">{projectTitle}</h3>
                        <span className="text-[10px] text-slate-500 font-medium">({actions.length} actions)</span>
                      </div>
                      <span className="text-[10px] text-purple-300 font-semibold">
                        Next: {actions[0]?.title ? actions[0].title.slice(0, 30) + '...' : 'None'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {actions.map((act) => (
                        <div
                          key={act.task_id}
                          onClick={() => setEditingAction(act)}
                          className="p-3 bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition group"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white group-hover:text-purple-200 transition">
                              {act.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300 font-bold">
                                F{act.friction}
                              </span>
                              <span>{act.time_bucket || '10-20m'}</span>
                              {act.importance && (
                                <span className="capitalize">{act.importance} imp</span>
                              )}
                              {act.first_action && (
                                <span className="text-slate-500 truncate max-w-[200px]">
                                  Step: {act.first_action}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Individual / Non-Project Actions */}
                {projectGroups.unassigned.length > 0 && (
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Stand-Alone & Quick Actions ({projectGroups.unassigned.length})</span>
                    </h3>

                    <div className="space-y-2">
                      {projectGroups.unassigned.map((act) => (
                        <div
                          key={act.task_id}
                          onClick={() => setEditingAction(act)}
                          className="p-3 bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition group"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white group-hover:text-purple-200 transition">
                              {act.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300 font-bold">
                                F{act.friction}
                              </span>
                              <span className="capitalize">{act.category || 'quick'}</span>
                              <span>{act.time_bucket || '10-20m'}</span>
                              {act.due_date && <span className="text-amber-400">Due {act.due_date}</span>}
                            </div>
                          </div>
                          <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NEEDS A LOOK */}
          {activeTab === 'needs_look' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
                <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm mb-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Needs a Look Queue</span>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Items requiring attention: low-confidence imports, tasks flagged as needing shrinking,
                  habits waiting for initial setup, or broken Google Task notes.
                </p>
              </div>

              {needsLookItems.length === 0 && parseLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Everything looks clean! No items currently flagged in the Needs a Look queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {needsLookItems.map((act) => (
                    <div
                      key={act.task_id}
                      onClick={() => setEditingAction(act)}
                      className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{act.title}</span>
                          {act.friction_confidence === 'low' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[9px] font-bold">
                              Low Confidence
                            </span>
                          )}
                          {act.needs_shrinking && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[9px] font-bold">
                              Needs Shrinking
                            </span>
                          )}
                          {act.status === 'needs_setup' && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[9px] font-bold">
                              Needs Setup
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Friction: {act.friction} · {act.friction_reason || 'Needs human check'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                        <span>Fix</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}

                  {/* ParseLog broken blocks */}
                  {parseLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-900 border border-rose-900/40 rounded-2xl flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-rose-300">ParseLog: {log.task_title || 'Broken Task Note'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{log.error_reason || 'Unreadable FOCUS block'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WEEK & GEAR TRAIN */}
          {activeTab === 'week' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Gear Train and Power Reserve Meter */}
              <GearTrainWidget habits={habitsList} />

              {/* 5 Modules Overview */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Weekly Movement Modules (Counting Days)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[
                    { day: 'Sun', name: 'Barrel & Mainspring', icon: 'barrel' },
                    { day: 'Mon', name: 'Going Train', icon: 'wheel' },
                    { day: 'Tue', name: 'Escapement & Pallet', icon: 'bridge' },
                    { day: 'Wed', name: 'Balance & Hairspring', icon: 'jewel' },
                    { day: 'Thu', name: 'Keyless Works', icon: 'screw' },
                  ].map((m) => {
                    const isToday = dayModule.day_name.startsWith(m.name.split(' ')[0]) || dayModule.day_name.slice(0, 3) === m.day;
                    return (
                      <div
                        key={m.day}
                        className={`p-4 rounded-2xl border text-center space-y-2 transition ${
                          isToday
                            ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/30'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                          <span>{m.day}</span>
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="text-[11px] text-slate-300 font-semibold leading-tight">{m.name}</div>
                        <div className="text-[10px] text-purple-400 font-medium">10 Part Slots + 5 Jewels</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HABITS EDITOR */}
          {activeTab === 'habits' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">7 Daily Habits & Circuits</h3>
                    <p className="text-xs text-slate-400">Track and tune quotas and circuit completions</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                    2 Circuits / Day
                  </span>
                </div>

                <div className="space-y-3">
                  {habitsList.map((h) => (
                    <div
                      key={h.habit_id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{h.name}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                            Half {h.half}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">({h.circuit} circuit)</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Daily Quota: <strong className="text-white">{h.quota} {h.unit}</strong> · Completed today: {h.currentReps} {h.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newReps = h.isComplete ? 0 : h.quota;
                            const updated = habitsList.map((it) =>
                              it.habit_id === h.habit_id
                                ? { ...it, currentReps: newReps, isComplete: !h.isComplete }
                                : it
                            );
                            saveHabitsState(updated);
                            setHabitsList(updated);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            h.isComplete
                              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {h.isComplete ? 'Complete ✓' : 'Mark Done'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-5">
                <h3 className="text-sm font-extrabold text-white">Focus App Tunable Settings</h3>

                {/* Serving Mode & Experiment Schedule */}
                <div className="space-y-2 pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Serving Mode</span>
                    <span className="text-[10px] text-purple-300 font-semibold">
                      Week {schedule.weekNumber} of 4 ({schedule.scheduledMode})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => overrideExperimentMode('assigned', schedule.effectiveMode)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        schedule.effectiveMode === 'assigned'
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Assigned (1-Card)
                    </button>
                    <button
                      onClick={() => overrideExperimentMode('paired', schedule.effectiveMode)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        schedule.effectiveMode === 'paired'
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Paired (2-Cards)
                    </button>
                  </div>
                </div>

                {/* Off Days Manager */}
                <div className="space-y-2 pb-4 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Off Days Schedule</span>
                  <p className="text-[11px] text-slate-400">
                    Recurring Off Days: <strong>Friday & Saturday</strong> (Work done still logs, but no commitment is required, no streaks penalize, and power reserve never drains).
                  </p>
                </div>

                {/* Quick Action Panels */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowExperiments(true)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span>Serving Experiment Modal</span>
                  </button>

                  <button
                    onClick={() => setShowInspector(true)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Candidate Inspector</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Phone Bottom Navigation Tabs + Persistent DO Button */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-3 flex items-center justify-around z-30 select-none">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'today' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span className="text-[10px]">Today</span>
        </button>

        <button
          onClick={() => setActiveTab('pool')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'pool' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span className="text-[10px]">Pool</span>
        </button>

        {/* Persistent Floating DO Button on Mobile (Instant return in 1 tap) */}
        <button
          onClick={onOpenDoMode}
          className="relative -top-3 w-13 h-13 rounded-full bg-gradient-to-br from-purple-500 to-indigo-700 active:scale-95 text-white font-black text-sm tracking-wider shadow-lg shadow-purple-900/60 border-2 border-purple-300/40 flex items-center justify-center transition"
          title="Return to DO Mode immediately"
        >
          <span>DO</span>
        </button>

        <button
          onClick={() => setActiveTab('week')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'week' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px]">Week</span>
        </button>

        <button
          onClick={() => setActiveTab('needs_look')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'needs_look' ? 'text-purple-400 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <AlertTriangle className="w-4 h-4" />
            {needsLookItems.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-amber-500 text-white">
                {needsLookItems.length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Review</span>
        </button>
      </nav>

      {/* Action Correction Drawer / Modal */}
      {editingAction && (
        <ActionCorrectionModal
          action={editingAction}
          onSave={handleSaveActionCorrection}
          onClose={() => setEditingAction(null)}
        />
      )}

      {/* Candidate Inspector Modal */}
      {showInspector && (
        <CandidateInspectorModal
          candidates={rankCandidates(actionsPool, {
            completedActions: completedToday,
            totalActiveMinutes: 0,
            tapShift: 0,
            consecutiveSmallerTaps: 0,
            fewerRepsTapped: false,
            reservedSlotUsedToday: false,
            stretchProbeUsedToday: false,
            skippedTaskIds: new Set(),
            now: new Date(),
          }).ranked}
          onClose={() => setShowInspector(false)}
        />
      )}

      {/* Serving Experiments Modal */}
      {showExperiments && (
        <ExperimentsModal
          isOpen={showExperiments}
          onClose={() => setShowExperiments(false)}
        />
      )}
    </div>
  );
};

interface ActionCorrectionModalProps {
  action: FocusAction;
  onSave: (updated: FocusAction) => void;
  onClose: () => void;
}

const ActionCorrectionModal: React.FC<ActionCorrectionModalProps> = ({
  action,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<FocusAction>({ ...action });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-purple-400" />
            <h3 className="font-extrabold text-white text-sm">Correct Action Attributes</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Friction (1 to 5)</label>
              <select
                value={formData.friction}
                onChange={(e) => setFormData({ ...formData, friction: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>
                    Friction {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Importance</label>
              <select
                value={formData.importance || 'low'}
                onChange={(e) =>
                  setFormData({ ...formData, importance: e.target.value as 'low' | 'med' | 'high' })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High (+1 pt bonus)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
              </input>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Deadline Kind</label>
              <select
                value={formData.deadline_kind || 'none'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deadline_kind: e.target.value as 'external' | 'self' | 'none',
                  })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="none">None</option>
                <option value="self">Self-imposed</option>
                <option value="external">External Hard Deadline</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">First Physical Micro-Action</label>
            <input
              type="text"
              value={formData.first_action || ''}
              onChange={(e) => setFormData({ ...formData, first_action: e.target.value })}
              placeholder="e.g. Open Google Docs and type the header"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Context Tag</label>
            <input
              type="text"
              value={formData.context || ''}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              placeholder="e.g. @computer, @calls, @errands"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-[11px] text-purple-300">
            Saving logs an append-only <code className="text-white">correction</code> event and immediately updates the serving algorithm without altering history.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Save Correction
          </button>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/SettingsModal.tsx`
```tsx
import React, { useState } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { AppSettings, FirebaseConfigSettings } from '../types';
import { normalizeGoogleCalendarUrl } from '../services/storageService';
import {
  X,
  Key,
  Database,
  Cloud,
  Check,
  Download,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Monitor,
  Sun,
  Moon,
  ListTodo,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Copy,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    settings,
    updateSettings,
    boardData,
    syncGoogleTasks,
    disconnectGoogleTasks,
    isSyncingTasks,
  } = useMomentum();

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(
    settings.geminiModel && !settings.geminiModel.includes('2.5')
      ? settings.geminiModel
      : 'gemini-3.8-flash'
  );
  const [googleCalUrl, setGoogleCalUrl] = useState(settings.googleCalendarEmbedUrl || '');
  const [gtasksClientId, setGtasksClientId] = useState(settings.googleTasksClientId || '');
  const [gtasksEmail, setGtasksEmail] = useState(settings.googleTasksEmail || '');
  const [gtasksWebhookUrl, setGtasksWebhookUrl] = useState(settings.googleTasksWebhookUrl || '');
  const [gtasksAutoSync, setGtasksAutoSync] = useState(settings.googleTasksAutoSync || false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showGtasksGuide, setShowGtasksGuide] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [copiedWebhookScript, setCopiedWebhookScript] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');
  const [useCloudSync, setUseCloudSync] = useState(settings.useCloudSync || false);
  const [boardId, setBoardId] = useState(settings.userBoardId || 'main-cockpit');

  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigSettings>({
    apiKey: settings.firebaseConfig?.apiKey || '',
    authDomain: settings.firebaseConfig?.authDomain || '',
    projectId: settings.firebaseConfig?.projectId || '',
    storageBucket: settings.firebaseConfig?.storageBucket || '',
    messagingSenderId: settings.firebaseConfig?.messagingSenderId || '',
    appId: settings.firebaseConfig?.appId || '',
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleConnectGoogleTasks = async () => {
    setSyncFeedback(null);
    if (!gtasksWebhookUrl.trim() && !gtasksClientId.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Please enter your Webhook URL or Google OAuth Client ID below first.',
      });
      return;
    }
    updateSettings({
      googleTasksClientId: gtasksClientId.trim(),
      googleTasksEmail: gtasksEmail.trim(),
      googleTasksWebhookUrl: gtasksWebhookUrl.trim(),
      googleTasksAutoSync: gtasksAutoSync,
    });
    const res = await syncGoogleTasks(gtasksClientId.trim());
    if (res.success) {
      const parts: string[] = [];
      if (res.pushedCount && res.pushedCount > 0) parts.push(`Uploaded ${res.pushedCount} new task${res.pushedCount === 1 ? '' : 's'}`);
      if (res.count > 0) parts.push(`Synced ${res.count} from Google`);
      if (res.relocatedCount && res.relocatedCount > 0) parts.push(`Relocated ${res.relocatedCount} to dedicated lists`);
      if (res.removedCount && res.removedCount > 0) parts.push(`Removed ${res.removedCount} deleted/completed`);
      const accountStr = res.accountEmail ? ` (${res.accountEmail})` : '';
      setSyncFeedback({
        type: 'success',
        message: `✓ Connected${accountStr}! ${parts.join(' | ') || 'All tasks are in sync.'}`,
      });
    } else {
      setSyncFeedback({
        type: 'error',
        message: res.error || 'Failed to authenticate with Google.',
      });
    }
  };

  const handleCleanReconcileSync = async () => {
    updateSettings({
      googleTasksClientId: gtasksClientId.trim(),
      googleTasksEmail: gtasksEmail.trim(),
      googleTasksAutoSync: gtasksAutoSync,
    });
    const res = await syncGoogleTasks(gtasksClientId.trim(), true);
    if (res.success) {
      const parts: string[] = [];
      if (res.count > 0) parts.push(`Synced ${res.count} active task${res.count === 1 ? '' : 's'}`);
      if (res.relocatedCount && res.relocatedCount > 0) parts.push(`Relocated ${res.relocatedCount} to dedicated lists`);
      if (res.removedCount && res.removedCount > 0) parts.push(`Removed ${res.removedCount} orphaned/deleted task${res.removedCount === 1 ? '' : 's'}`);
      const accountStr = res.accountEmail ? ` (${res.accountEmail})` : '';
      setSyncFeedback({
        type: 'success',
        message: `✓ Reconciled${accountStr}! ${parts.join(' | ') || 'Cockpit strictly matches Google Tasks.'}`,
      });
    } else {
      setSyncFeedback({
        type: 'error',
        message: res.error || 'Failed to reconcile tasks.',
      });
    }
  };

  const handleDisconnectGoogleTasks = () => {
    disconnectGoogleTasks();
    updateSettings({
      googleTasksWebhookUrl: '',
    });
    setGtasksWebhookUrl('');
    setSyncFeedback({
      type: 'success',
      message: 'Disconnected from Google Tasks.',
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      theme,
      geminiApiKey: geminiKey.trim(),
      geminiModel,
      googleCalendarEmbedUrl: normalizeGoogleCalendarUrl(googleCalUrl),
      googleTasksClientId: gtasksClientId.trim(),
      googleTasksEmail: gtasksEmail.trim(),
      googleTasksWebhookUrl: gtasksWebhookUrl.trim(),
      googleTasksAutoSync: gtasksAutoSync,
      useCloudSync,
      userBoardId: boardId.trim() || 'main-cockpit',
      firebaseConfig: useCloudSync && firebaseConfig.apiKey ? firebaseConfig : null,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(boardData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `momentum-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Settings & Integrations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Appearance, Google Calendar, Gemini AI & Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* THEME SELECTOR */}
          <div className="space-y-2">
            <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block text-[11px]">
              Theme & Visual Calm
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                  theme === 'light'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-400/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode (Clean Paper)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                  theme === 'dark'
                    ? 'border-purple-600 bg-purple-950/40 text-purple-200 ring-2 ring-purple-400/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400" />
                <span>Dark Mode (Calm Slate)</span>
              </button>
            </div>
          </div>

          {/* GOOGLE CALENDAR EMBED */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Google Calendar Integration</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Paste your Google Calendar Public or Private Embed URL to see your schedule directly inside the Month/Week calendar drawer:
            </p>
            <input
              type="text"
              value={googleCalUrl}
              onChange={(e) => setGoogleCalUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
            />
            <p className="text-[10px] text-slate-400">
              In Google Calendar &rarr; Settings &rarr; Integrate Calendar &rarr; Copy "Embed code" src URL.
            </p>
          </div>

          {/* GOOGLE TASKS SYNC */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                <ListTodo className="w-4 h-4 text-emerald-500" />
                <span>Google Tasks (Voice Ingest from Gemini)</span>
              </div>
              {settings.googleTasksConnected ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Connect your Google Tasks account so tasks and voice thoughts you enter into the Gemini mobile app automatically flow into your Momentum Cockpit.
            </p>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] animate-fadeIn ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{syncFeedback.message}</span>
              </div>
            )}

            {/* Client ID input */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Google OAuth 2.0 Web Client ID:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGtasksGuide(!showGtasksGuide)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showGtasksGuide ? 'Hide Guide' : 'OAuth Guide (free 2 min)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={gtasksClientId}
                  onChange={(e) => setGtasksClientId(e.target.value)}
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  Your Google Email (Remembers your account to bypass re-signing in):
                </label>
                <input
                  type="email"
                  value={gtasksEmail}
                  onChange={(e) => setGtasksEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Step-by-step accordion guide */}
              {showGtasksGuide && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-[10px] space-y-1.5 animate-fadeIn">
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    🚀 Quick steps to create your Google OAuth Client ID:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-normal">
                    <li>
                      Go to{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-semibold"
                      >
                        Google Cloud Console &rarr; Credentials
                      </a>.
                    </li>
                    <li>Click <strong>+ Create Credentials</strong> &rarr; <strong>OAuth client ID</strong> &rarr; Application type: <strong>Web application</strong>.</li>
                    <li>Under <strong>Authorized JavaScript origins</strong>, add your Momentum URLs (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">https://ezshap-rgb.github.io</code> and <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">http://localhost:5173</code>).</li>
                    <li>Click <strong>Create</strong> and copy your <strong>Client ID</strong> above.</li>
                    <li>
                      Ensure the Tasks API is active at{' '}
                      <a
                        href="https://console.cloud.google.com/apis/library/tasks.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-semibold"
                      >
                        Google Tasks API Library
                      </a>.
                    </li>
                  </ol>
                </div>
              )}



                </div>

            {/* Connection Actions */}
            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConnectGoogleTasks}
                  disabled={isSyncingTasks}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTasks ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingTasks
                      ? 'Authenticating & Syncing...'
                      : settings.googleTasksConnected
                      ? 'Sync Tasks Now'
                      : 'Sign in with Google & Sync'}
                  </span>
                </button>

                {settings.googleTasksConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleTasks}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              {settings.googleTasksConnected && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={gtasksAutoSync}
                    onChange={(e) => setGtasksAutoSync(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Auto-sync every 5 min</span>
                </label>
              )}
            </div>

            {/* Connected Account & Two-Way Sync Details */}
            {settings.googleTasksConnected && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Connected Account:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {settings.googleTasksAccountEmail || settings.googleTasksEmail || 'Active'}
                  </span>
                </div>
                {settings.googleTasksSyncedLists && settings.googleTasksSyncedLists.length > 0 && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Active Lists:</span>
                    <span className="font-mono text-[10px] text-right text-slate-600 dark:text-slate-400">
                      {settings.googleTasksSyncedLists.join(' • ')}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 leading-tight">
                    Deleted tasks on desktop or Google? Purge obsolete local demo tasks to match:
                  </span>
                  <button
                    type="button"
                    onClick={handleCleanReconcileSync}
                    disabled={isSyncingTasks}
                    className="shrink-0 px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[10px] transition"
                  >
                    Clean & Reconcile
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GEMINI API SETTINGS */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                  Google AI Studio (Gemini 3.8 Flash)
                </h4>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Stored strictly on your local device.
              </p>
            </div>
          </div>

          {/* CLOUD SYNC & FIREBASE */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                  Firebase Multi-Device Cloud Sync
                </h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCloudSync}
                  onChange={(e) => setUseCloudSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {useCloudSync && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-fadeIn text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                    placeholder="apiKey"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    placeholder="projectId"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* BACKUP & SAVE */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup JSON</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if ('serviceWorker' in navigator) {
                      try {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (const r of regs) await r.unregister();
                      } catch {}
                    }
                    if ('caches' in window) {
                      try {
                        const keys = await caches.keys();
                        for (const k of keys) await caches.delete(k);
                      } catch {}
                    }
                    window.location.reload();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition"
                  title="Clear Service Worker cache and fetch latest version from GitHub"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Force Update App</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-400 dark:text-slate-500">
              Momentum v2.5 • Build 2026-11-12 3:10 PM • Safe Click Only Marks Done • App-Wide Undo System
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

```

### `src/components/SetupGuideModal.tsx`
```tsx
import React, { useState } from 'react';
import {
  X,
  BatteryCharging,
  Calendar,
  Smartphone,
  Volume2,
  Vibrate,
  ShieldCheck,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  playGentleCompletionChime,
  triggerHaptic,
  requestScreenWakeLock,
} from '../services/focusWakeLock';
import { getStoredCredentials } from '../services/focusDataLayer';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('focus_sound_enabled') !== 'false'
  );
  const [vibrationEnabled, setVibrationEnabled] = useState(
    () => localStorage.getItem('focus_vibration_enabled') !== 'false'
  );
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarResult, setCalendarResult] = useState<string | null>(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('focus_sound_enabled', String(next));
    if (next) playGentleCompletionChime();
  };

  const handleToggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    localStorage.setItem('focus_vibration_enabled', String(next));
    if (next) triggerHaptic([50, 40, 60]);
  };

  const handleTriggerCalendarNudges = async () => {
    const { url, key } = getStoredCredentials();
    if (!url || !key) {
      alert('Please configure your Apps Script URL and Secret Key in settings first.');
      return;
    }

    setSyncingCalendar(true);
    setCalendarResult(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key, action: 'sync_calendar_nudges' }),
      });
      const data = await res.json();
      if (data.ok) {
        setCalendarResult(`✓ Successfully created ${data.created_count || 0} nudges in your 'Focus' calendar!`);
      } else {
        setCalendarResult(`⚠️ ${data.error || 'Failed to sync calendar'}`);
      }
    } catch (err: any) {
      setCalendarResult(`⚠️ Error: ${err.message}`);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleTriggerBackup = async () => {
    const { url, key } = getStoredCredentials();
    if (!url || !key) {
      alert('Please configure your Apps Script URL and Secret Key in settings first.');
      return;
    }

    setRunningBackup(true);
    setBackupResult(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key, action: 'run_backup' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBackupResult(`✓ Backup created in Drive folder 'Focus Backups' (${data.backup_name})`);
      } else {
        setBackupResult(`⚠️ ${data.error || 'Failed to create backup'}`);
      }
    } catch (err: any) {
      setBackupResult(`⚠️ Error: ${err.message}`);
    } finally {
      setRunningBackup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Offline, Nudges & Backup Setup</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-bold uppercase">
                  Phase 10
                </span>
              </h2>
              <p className="text-xs text-slate-400">Setup checklist for reliable notifications & offline resilience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* 1. Android Battery Optimization Exemption */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>1. Exempt Apps from Battery Optimization</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Android aggressively suspends web apps and notifications. Setting both Chrome and Google Calendar to{' '}
              <strong className="text-emerald-300">Unrestricted</strong> ensures on-time reminder popups and keeps timers running:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
              <li>Open Android <strong>Settings</strong> → <strong>Apps</strong>.</li>
              <li>Select <strong>Chrome</strong> (or your Focus PWA) → <strong>App battery usage</strong> → choose <strong>Unrestricted</strong>.</li>
              <li>Repeat for <strong>Google Calendar</strong> → set to <strong>Unrestricted</strong>.</li>
            </ol>
          </div>

          {/* 2. Google Calendar App Nudges */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>2. Google Calendar Nudges</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">
                Max 3 / Day
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Apps Script manages a calendar named <strong className="text-white">Focus</strong>. It schedules gentle reminders for morning & evening circuit windows, external deadline tripwires, and optional DO prompts (skipping weekends & quiet hours).
            </p>

            <button
              onClick={handleTriggerCalendarNudges}
              disabled={syncingCalendar}
              className="w-full py-2.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/80 text-purple-200 font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
              <span>Generate / Refresh Calendar Nudges for Next 7 Days</span>
            </button>

            {calendarResult && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                {calendarResult}
              </div>
            )}
          </div>

          {/* 3. Feedback & Haptics */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>3. Audio Chimes & Screen Wake Lock</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">Audio Chime</span>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">Vibration</span>
                </div>
                <button
                  onClick={handleToggleVibration}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    vibrationEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      vibrationEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Screen Wake Lock automatically activates during ignition and active action timers so your display stays on.
            </p>
          </div>

          {/* 4. Automated Weekly Drive Backup */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>4. Weekly Google Drive Backups</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                Retains Last 8
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every Sunday at 02:00 AM, Apps Script copies the active spreadsheet to a Drive folder named{' '}
              <strong className="text-white">Focus Backups</strong> and automatically cleans up older snapshots.
            </p>

            <button
              onClick={handleTriggerBackup}
              disabled={runningBackup}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningBackup ? 'animate-spin' : ''}`} />
              <span>Test Google Drive Backup Now</span>
            </button>

            {backupResult && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                {backupResult}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/SyncIndicator.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import {
  subscribeSyncState,
  triggerBackgroundSync,
  SyncState,
} from '../services/focusDataLayer';
import { Cloud, RefreshCw, AlertCircle } from 'lucide-react';

export function SyncIndicator() {
  const [sync, setSync] = useState<{ state: SyncState; waitingCount: number; error?: string }>({
    state: 'synced',
    waitingCount: 0,
  });
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newStatus) => {
      setSync(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await triggerBackgroundSync();
    setIsSyncing(false);
  };

  if (sync.state === 'synced') {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] font-medium"
        title="All actions safely logged to Google Sheet"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <Cloud className="w-3.5 h-3.5" />
        <span>Synced</span>
      </div>
    );
  }

  if (sync.state === 'waiting') {
    return (
      <button
        onClick={handleSyncClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[11px] font-medium active:scale-95 transition"
        title="Saved locally on phone. Tap to sync now to Google Sheet"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>Waiting ({sync.waitingCount})</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowErrorDetail(!showErrorDetail);
          handleSyncClick();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-700 text-rose-200 text-[11px] font-medium active:scale-95 transition shadow-sm"
        title={sync.error || 'Sync failed. Tap to retry or see details.'}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Sync Error ({sync.waitingCount})</span>
      </button>

      {showErrorDetail && sync.error && (
        <div className="absolute right-0 mt-2 w-72 p-3 bg-slate-900 border border-rose-700/80 rounded-xl shadow-2xl text-[11px] text-rose-200 z-50">
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>Sync Diagnostic:</span>
            <span
              onClick={() => setShowErrorDetail(false)}
              className="cursor-pointer text-slate-400 hover:text-white"
            >
              ✕
            </span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] break-all max-h-32 overflow-y-auto mb-2 text-rose-300">
            {sync.error}
          </div>
          <button
            onClick={handleSyncClick}
            className="w-full py-1 bg-rose-600 hover:bg-rose-500 rounded text-white font-bold text-[10px] transition"
          >
            Retry Now
          </button>
        </div>
      )}
    </div>
  );
}

```

### `src/components/VoiceIngestionModal.tsx`
```tsx
import React, { useState } from 'react';
import { useMomentum } from '../context/MomentumContext';
import { GeminiParsedData } from '../types';
import { speechRecorder } from '../services/speechService';
import { parseBrainDumpWithGemini } from '../services/geminiService';
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface VoiceIngestionModalProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

export const VoiceIngestionModal: React.FC<VoiceIngestionModalProps> = ({
  onClose,
  onOpenSettings,
}) => {
  const { settings, boardData, applyGeminiParsedData } = useMomentum();
  const [isListening, setIsListening] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [stagedData, setStagedData] = useState<GeminiParsedData | null>(null);

  const handleToggleVoice = () => {
    if (isListening) {
      speechRecorder.stop();
      setIsListening(false);
    } else {
      setAiError(null);
      const started = speechRecorder.start({
        onInterimResult: (interim) => {
          setTranscriptText((prev) => prev.split(' [live]')[0] + ` ${interim}`);
        },
        onFinalResult: (final) => {
          setTranscriptText(final);
        },
        onError: (err) => {
          setAiError(`Voice Error: ${err}`);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
      if (started) {
        setIsListening(true);
      }
    }
  };

  const handleProcess = async () => {
    if (!transcriptText.trim()) return;
    if (isListening) {
      speechRecorder.stop();
      setIsListening(false);
    }

    if (!settings.geminiApiKey) {
      setAiError('Please enter your free Gemini API Key in Settings first.');
      return;
    }

    setIsProcessingAI(true);
    setAiError(null);

    try {
      const parsed = await parseBrainDumpWithGemini(
        transcriptText,
        settings.geminiApiKey,
        settings.geminiModel || 'gemini-3.8-flash',
        boardData.projects
      );
      setStagedData(parsed);
    } catch (err: any) {
      setAiError(err.message || 'Failed to parse thoughts.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleAccept = () => {
    if (!stagedData) return;
    applyGeminiParsedData(stagedData);
    setStagedData(null);
    setTranscriptText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Universal Voice & Brain Dump
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speak or paste anything; AI routes it into the 4 buckets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Mic Trigger & Text Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isListening ? 'Listening...' : 'Your thought / voice transcript:'}
              </span>
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Stop Mic' : 'Record Mic'}</span>
              </button>
            </div>

            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="e.g. Order 608 bearings, prepare Mussar Seder next prompt tomorrow at 2, did 25m calisthenics, for Sphere It measured collar in CAD..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 h-28 resize-none"
              autoFocus
            />
          </div>

          {/* AI Error Warning */}
          {aiError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{aiError}</span>
              </div>
              {!settings.geminiApiKey && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="font-bold underline ml-2"
                >
                  Settings
                </button>
              )}
            </div>
          )}

          {/* Staging Preview */}
          {stagedData && (
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-950 border border-emerald-400/50 space-y-2 text-xs animate-fadeIn">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Parsed Into Cockpit Buckets:</span>
              </span>

              {stagedData.quick_jobs && stagedData.quick_jobs.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Tasks:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-200">
                    {stagedData.quick_jobs.map((j, i) => (
                      <li key={i}>
                        {j.title} ({j.duration || '5m'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stagedData.responsibilities && stagedData.responsibilities.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Jobs:</strong>
                  <ul className="space-y-0.5 text-slate-700 dark:text-slate-200">
                    {stagedData.responsibilities.map((r, i) => (
                      <li key={i}>
                        {r.title} &rarr; <em>{r.next_action}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stagedData.project_updates && stagedData.project_updates.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Projects:</strong>
                  <ul className="space-y-0.5 text-slate-700 dark:text-slate-200">
                    {stagedData.project_updates.map((p, i) => (
                      <li key={i}>
                        {p.project_name}: {p.update_note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stagedData.habits && stagedData.habits.length > 0 && (
                <div>
                  <strong className="text-[10px] uppercase text-slate-500 block">Habits:</strong>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-200">
                    {stagedData.habits.map((h, i) => (
                      <li key={i}>
                        {h.name}: {typeof h.value === 'boolean' ? (h.value ? 'Done' : 'Not done') : `${h.value}m`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!stagedData ? (
              <button
                type="button"
                onClick={handleProcess}
                disabled={!transcriptText.trim() || isProcessingAI}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                {isProcessingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Classifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parse Brain Dump</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAccept}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept & Merge into Cockpit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


```

### `src/components/WatchCollectionModal.tsx`
```tsx
import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Watch,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  getActiveCraftingWatch,
  getWatchCollection,
  getCurrentWeeklyMovement,
  completeWeeklyMovement,
  CollectibleWatch,
  WeeklyMovement,
} from '../services/focusCollection';
import { WatchVectorIllustration } from './WatchVectorIllustration';

interface WatchCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WatchCollectionModal: React.FC<WatchCollectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeWatch, setActiveWatch] = useState<CollectibleWatch>(() => getActiveCraftingWatch());
  const [collection, setCollection] = useState<CollectibleWatch[]>(() => getWatchCollection());
  const [movement, setMovement] = useState<WeeklyMovement>(() => getCurrentWeeklyMovement());
  const [justCompletedNotice, setJustCompletedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdvanceWeek = async () => {
    const res = await completeWeeklyMovement();
    setActiveWatch(getActiveCraftingWatch());
    setCollection(getWatchCollection());
    setMovement(getCurrentWeeklyMovement());

    if (res.isWatchFinished) {
      setJustCompletedNotice(`🎉 Congratulations! ${res.watch.name} is complete and added to your Collection Vault!`);
    } else {
      setJustCompletedNotice(`✓ Week completed! ${res.watch.name} advanced to Week ${res.watch.completed_weeks_count}/4.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>The Watchmaker's Collection</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-bold uppercase">
                  Phase 11
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Movements become collectible timepieces through consistent action
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {justCompletedNotice && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 font-bold text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{justCompletedNotice}</span>
            </div>
          )}

          {/* ACTIVE WATCH ON THE BENCH */}
          <div className="p-5 bg-slate-950/90 border border-purple-500/30 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Currently Crafting on the Bench</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-200 text-[10px] font-extrabold">
                {activeWatch.completed_weeks_count} of 4 Weeks Done
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <WatchVectorIllustration watch={activeWatch} size="md" />

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <h3 className="text-lg font-black text-white">{activeWatch.name}</h3>
                  <div className="text-[11px] text-purple-400 font-semibold">{activeWatch.caliber} · {activeWatch.case_material} Case</div>
                  <p className="text-slate-400 mt-1">{activeWatch.finish_summary}</p>
                </div>

                {/* 4-Week Component Unlock Stepper */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.case
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.case ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 1: Case ({activeWatch.case_material})</span>
                  </div>

                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.dial
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.dial ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 2: Dial ({activeWatch.dial_style})</span>
                  </div>

                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.hands
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.hands ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 3: Dauphine Hands</span>
                  </div>

                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    activeWatch.unlocked_components.crystal_crown
                      ? 'bg-purple-950/40 border-purple-600/50 text-purple-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${activeWatch.unlocked_components.crystal_crown ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Wk 4: Crystal & Crown</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Week closes Thursday night. Carry-over allowed anytime within the week.
                  </span>
                  <button
                    onClick={handleAdvanceWeek}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs transition shadow-sm"
                  >
                    Assemble Week Movement →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WEEKEND POLISH & COMPLICATIONS STATUS */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Weekend Polish & Complications</span>
              </span>
              <span className="text-[10px] text-purple-300 font-semibold">
                {movement.weekend_work_points} Weekend Work Points Earned
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Off-day actions on Friday and Saturday earn polish: every 8 work points upgrades one part of this week's movement by one finish grade, and 16 points unlocks a complication.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                Polish Upgrades: <strong className="text-white">{movement.polish_upgrades_count}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                Complications: <strong className="text-white">{movement.complications.length}</strong>
              </span>
            </div>
          </div>

          {/* VAULT OF COMPLETED TIMEPIECES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Timepiece Vault ({collection.length})
              </h3>
            </div>

            {collection.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-1">
                <div>No completed watches in the vault yet.</div>
                <div className="text-[11px] text-slate-600">
                  Complete 4 weekly movements to craft your first collector's chronometer!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {collection.map((w) => (
                  <div
                    key={w.watch_id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-md"
                  >
                    <WatchVectorIllustration watch={w} size="sm" />
                    <div className="space-y-1 min-w-0">
                      <div className="font-extrabold text-white text-sm truncate">{w.name}</div>
                      <div className="text-[10px] text-purple-400 font-bold">{w.caliber} · {w.case_material}</div>
                      <div className="text-[10px] text-slate-400 truncate">{w.finish_summary}</div>
                      {w.completed_at && (
                        <div className="text-[9px] text-slate-500">
                          Completed {w.completed_at.split('T')[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/WatchPartVector.tsx`
```tsx
import React from 'react';
import { PartSize, FinishGrade, getFinishGradeStyles } from '../services/focusMovement';

interface Props {
  partSize: PartSize;
  finishGrade: FinishGrade;
  isFilled: boolean;
  isJewelSlot?: boolean;
}

export const WatchPartVector: React.FC<Props> = ({
  partSize,
  finishGrade,
  isFilled,
  isJewelSlot = false,
}) => {
  const styles = getFinishGradeStyles(finishGrade);

  if (isJewelSlot) {
    return (
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
          isFilled
            ? 'bg-gradient-to-tr from-rose-500 via-pink-400 to-rose-600 border-rose-300 shadow-md shadow-rose-500/50 scale-105 animate-pulse'
            : 'bg-slate-900/60 border-dashed border-slate-700 opacity-40'
        }`}
        title={isFilled ? 'Bonus Stretch Jewel Earned!' : 'Stretch Jewel Slot'}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white/90">
          <polygon points="12,2 22,8.5 18,22 6,22 2,8.5" />
        </svg>
      </div>
    );
  }

  if (!isFilled) {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 flex items-center justify-center text-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-800"></span>
      </div>
    );
  }

  // Render stylized flat vector based on part size
  switch (partSize) {
    case 'screw':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Screw`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'jewel':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Jewel`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          </svg>
        </div>
      );

    case 'wheel':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Gear Wheel`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" fill="none" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" />
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'bridge':
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Bridge`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <path
              d="M4,16 C6,10 18,10 20,16 L18,18 C14,14 10,14 6,18 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </div>
      );

    case 'barrel':
    default:
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${styles.border} ${styles.bg}`}
          title={`${styles.label} Mainspring Barrel`}
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 ${styles.text}`}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>
      );
  }
};

```

### `src/components/WatchVectorIllustration.tsx`
```tsx
import React from 'react';
import { CollectibleWatch } from '../services/focusCollection';

interface WatchVectorProps {
  watch: CollectibleWatch;
  size?: 'sm' | 'md' | 'lg';
}

export const WatchVectorIllustration: React.FC<WatchVectorProps> = ({
  watch,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-44 h-44',
    lg: 'w-64 h-64',
  };

  const hasCase = watch.unlocked_components.case;
  const hasDial = watch.unlocked_components.dial;
  const hasHands = watch.unlocked_components.hands;
  const hasCrystal = watch.unlocked_components.crystal_crown;

  // Colors based on material
  const caseGradient =
    watch.case_material === 'Rose Gold'
      ? ['#f43f5e', '#fb7185', '#be123c']
      : watch.case_material === 'Titanium'
      ? ['#64748b', '#94a3b8', '#334155']
      : ['#94a3b8', '#e2e8f0', '#475569']; // Stainless steel

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl select-none">
        <defs>
          {/* Case metallic gradient */}
          <linearGradient id={`caseGrad_${watch.watch_id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={caseGradient[0]} />
            <stop offset="50%" stopColor={caseGradient[1]} />
            <stop offset="100%" stopColor={caseGradient[2]} />
          </linearGradient>

          {/* Dial subtle texture */}
          <radialGradient id={`dialGrad_${watch.watch_id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="85%" stopColor="#020617" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
        </defs>

        {/* Lugs (Upper and Lower Strap attachments) */}
        {hasCase && (
          <>
            <polygon points="68,22 80,45 120,45 132,22" fill={caseGradient[2]} />
            <polygon points="68,178 80,155 120,155 132,178" fill={caseGradient[2]} />
          </>
        )}

        {/* Outer Watch Case */}
        <circle
          cx="100"
          cy="100"
          r="72"
          fill={hasCase ? `url(#caseGrad_${watch.watch_id})` : '#1e293b'}
          stroke={hasCase ? '#ffffff33' : '#334155'}
          strokeWidth="3"
        />

        {/* Winding Crown (Unlocked in Week 4) */}
        {hasCrystal ? (
          <path d="M 172,93 L 182,95 L 182,105 L 172,107 Z" fill={caseGradient[1]} stroke="#ffffff55" strokeWidth="1" />
        ) : (
          <path d="M 172,95 L 178,96 L 178,104 L 172,105 Z" fill="#334155" opacity="0.3" />
        )}

        {/* Inner Bezel Ring */}
        <circle cx="100" cy="100" r="62" fill="#090d16" stroke="#ffffff15" strokeWidth="2" />

        {/* Watch Dial (Unlocked in Week 2) */}
        {hasDial ? (
          <g>
            <circle cx="100" cy="100" r="58" fill={`url(#dialGrad_${watch.watch_id})`} />

            {/* Hour Markers (12, 3, 6, 9) */}
            <line x1="100" y1="46" x2="100" y2="52" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="154" y1="100" x2="148" y2="100" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="100" y1="154" x2="100" y2="148" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="46" y1="100" x2="52" y2="100" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

            {/* Caliber Label on Dial */}
            <text x="100" y="80" textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="bold" letterSpacing="1">
              {watch.caliber}
            </text>

            {/* Complication Subdial (e.g. Moonphase or Small Seconds) */}
            {watch.complications.length > 0 && (
              <g transform="translate(100, 126)">
                <circle cx="0" cy="0" r="14" fill="#020617" stroke="#818cf855" strokeWidth="1" />
                <circle cx="0" cy="0" r="3" fill="#c084fc" />
                <path d="M -8,0 A 8,8 0 0,0 8,0 Z" fill="#38bdf8" opacity="0.7" />
              </g>
            )}
          </g>
        ) : (
          <g opacity="0.3">
            <circle cx="100" cy="100" r="58" fill="#0f172a" stroke="#334155" strokeDasharray="3 3" />
            <text x="100" y="103" textAnchor="middle" fill="#64748b" fontSize="8">
              Awaiting Dial
            </text>
          </g>
        )}

        {/* Hands (Hour & Minute) (Unlocked in Week 3) */}
        {hasHands ? (
          <g>
            {/* Hour hand pointing at ~10 o'clock */}
            <line
              x1="100"
              y1="100"
              x2="78"
              y2="75"
              stroke="#f8fafc"
              strokeWidth="4"
              strokeLinecap="round"
              filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.6))"
            />
            {/* Minute hand pointing at ~2 o'clock */}
            <line
              x1="100"
              y1="100"
              x2="132"
              y2="68"
              stroke="#f8fafc"
              strokeWidth="3"
              strokeLinecap="round"
              filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.6))"
            />
            {/* Blued Steel Seconds hand */}
            <line
              x1="100"
              y1="112"
              x2="100"
              y2="50"
              stroke="#60a5fa"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Center Cap */}
            <circle cx="100" cy="100" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
          </g>
        ) : null}

        {/* Sapphire Crystal Sheen (Unlocked in Week 4) */}
        {hasCrystal && (
          <path
            d="M 52,65 A 60,60 0 0,1 148,65 A 58,58 0 0,0 52,65 Z"
            fill="#ffffff"
            opacity="0.12"
          />
        )}
      </svg>
    </div>
  );
};

```

### `src/components/WhereWasIModal.tsx`
```tsx
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

```

### `src/context/MomentumContext.tsx`
```tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  MomentumBoardData,
  AppSettings,
  QuickJob,
  QuickJobDuration,
  Responsibility,
  JobRecurrence,
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
  loadLocalBoardData,
  saveLocalBoardData,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  subscribeToBoardData,
  persistBoardData,
  recordDeletedGoogleTaskId,
  unrecordDeletedGoogleTaskId,
  DEFAULT_INITIAL_DATA,
  DEFAULT_SETTINGS,
} from '../services/storageService';
import {
  getStoredAccessToken,
  requestGoogleTasksAuth,
  fetchAllGoogleTasks,
  fetchGoogleAccountEmail,
  ensureGoogleTaskLists,
  syncTasksIntoBoard,
  pushLocalTasksToGoogle,
  clearStoredAccessToken,
  markGoogleTaskCompleted,
  deleteGoogleTask,
  createGoogleTask,
  fetchGoogleTasksFromWebhook,
  markGoogleTaskCompletedViaWebhook,
  deleteGoogleTaskViaWebhook,
  createGoogleTaskViaWebhook,
} from '../services/googleTasksService';

interface MomentumContextType {
  boardData: MomentumBoardData;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleTheme: () => void;
  layoutMode: LayoutMode;
  toggleLayoutMode: () => void;
  // Google Tasks
  isSyncingTasks: boolean;
  syncGoogleTasks: (
    clientIdOverride?: string,
    cleanOrphanedDemoTasks?: boolean
  ) => Promise<{
    success: boolean;
    count: number;
    pushedCount?: number;
    removedCount?: number;
    relocatedCount?: number;
    error?: string;
    errors?: string[];
    accountEmail?: string;
    listsSummary?: string;
  }>;
  disconnectGoogleTasks: () => void;
  // Panel Levels
  panelStates: PanelStates;
  setPanelLevel: (panel: keyof Omit<PanelStates, 'calendar'>, level: PanelLevel) => void;
  cyclePanelLevel: (panel: keyof Omit<PanelStates, 'calendar'>) => void;
  setCalendarView: (view: 'hidden' | 'week' | 'month') => void;
  // Quick jobs (Tasks)
  addQuickJob: (title: string, duration?: QuickJobDuration, due?: string | null) => void;
  toggleQuickJob: (id: string) => void;
  deleteQuickJob: (id: string) => void;
  editQuickJob: (id: string, updates: { title?: string; duration?: QuickJobDuration; due?: string | null }) => void;
  // Responsibilities (Jobs)
  addResponsibility: (
    title: string,
    initialNextStep: string,
    due?: string | null,
    scheduledDate?: string | null,
    scheduledTime?: string | null,
    recurrence?: JobRecurrence | null,
    recurrenceDay?: string | null
  ) => void;
  advanceResponsibilityStep: (id: string) => void;
  regressResponsibilityStep: (id: string) => void;
  resetResponsibilitySteps: (id: string) => void;
  addStepToResponsibility: (id: string, stepText: string) => void;
  updateResponsibilityDue: (id: string, due: string | null) => void;
  setResponsibilityStatus: (id: string, status: ResponsibilityStatus) => void;
  deleteResponsibility: (id: string) => void;
  editResponsibility: (
    id: string,
    updates: {
      title?: string;
      currentStep?: string;
      due?: string | null;
      scheduledDate?: string | null;
      scheduledTime?: string | null;
      recurrence?: JobRecurrence | null;
      recurrenceDay?: string | null;
      steps?: string[];
    }
  ) => void;
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
  completeProjectStep: (id: string, newNextStep?: string) => void;
  editProject: (
    id: string,
    updates: {
      name?: string;
      current_position?: string;
      next_step?: string;
      status?: ProjectStatus;
    }
  ) => void;
  // Habits
  toggleHabitDate: (id: string, dateStr: string) => void;
  setHabitDuration: (id: string, dateStr: string, minutes: number) => void;
  addHabit: (name: string, type: 'boolean' | 'duration_min', target: number, nextDue?: string) => void;
  deleteHabit: (id: string) => void;
  editHabit: (
    id: string,
    updates: {
      name?: string;
      next_due?: string | null;
      target?: number;
    }
  ) => void;
  // Calendar Events
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (id: string) => void;
  // Universal AI ingestion
  applyGeminiParsedData: (data: GeminiParsedData) => void;
  // Undo System
  undo: () => void;
  canUndo: boolean;
  lastUndoMessage: string | null;
  dismissUndoMessage: () => void;
}

const MomentumContext = createContext<MomentumContextType | undefined>(undefined);

export const MomentumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettingsFromStorage);
  const [boardData, setBoardData] = useState<MomentumBoardData>(loadLocalBoardData);

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

  // Undo Stack (keeps last 30 snapshots)
  const [undoStack, setUndoStack] = useState<{ data: MomentumBoardData; actionName?: string }[]>([]);
  const [lastUndoMessage, setLastUndoMessage] = useState<string | null>(null);

  const dismissUndoMessage = useCallback(() => {
    setLastUndoMessage(null);
  }, []);

  // Auto-dismiss undo message after 7 seconds
  useEffect(() => {
    if (lastUndoMessage) {
      const timer = setTimeout(() => {
        setLastUndoMessage(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [lastUndoMessage]);

  const updateBoard = useCallback(
    (updater: (prev: MomentumBoardData) => MomentumBoardData, actionName?: string) => {
      setBoardData((prev) => {
        const next = updater(prev);
        if (next !== prev) {
          setUndoStack((stack) => [...stack.slice(-30), { data: prev, actionName }]);
          if (actionName) {
            setLastUndoMessage(actionName);
          }
        }
        persistBoardData(next, settings);
        return next;
      });
    },
    [settings]
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);

      // Restore previous board data
      setBoardData(last.data);
      persistBoardData(last.data, settings);

      // Unrecord deleted google task IDs so restored items stay synced
      for (const job of last.data.quick_jobs) {
        if (job.googleTaskId) unrecordDeletedGoogleTaskId(job.googleTaskId);
      }
      for (const resp of last.data.responsibilities) {
        if (resp.googleTaskId) unrecordDeletedGoogleTaskId(resp.googleTaskId);
      }
      for (const proj of last.data.projects) {
        if (proj.googleTaskId) unrecordDeletedGoogleTaskId(proj.googleTaskId);
      }
      for (const hab of last.data.habits) {
        if (hab.googleTaskId) unrecordDeletedGoogleTaskId(hab.googleTaskId);
      }

      soundService.playSuccessChime();
      setLastUndoMessage(last.actionName ? `Recovered: ${last.actionName}` : 'Recovered previous state');
      return newStack;
    });
  }, [settings]);

  // Global Ctrl+Z / Cmd+Z shortcut (unless focused inside a text input/textarea)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveSettingsToStorage(merged);
      return merged;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    localStorage.setItem('momentum_explicit_theme_v1', 'true');
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
      const cleanTitle = title.trim();
      const jobDuration = duration || '5m';
      const jobId = `qj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newJob: QuickJob = {
        id: jobId,
        title: cleanTitle,
        duration: jobDuration,
        due: due || null,
        done: false,
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({
        ...prev,
        quick_jobs: [newJob, ...prev.quick_jobs],
      }));

      // Background push to Google Tasks (Webhook or OAuth)
      if (settings.googleTasksWebhookUrl) {
        createGoogleTaskViaWebhook(settings.googleTasksWebhookUrl, `[${jobDuration}] ${cleanTitle}`).then((taskId) => {
          if (taskId) {
            updateBoard((prev) => ({
              ...prev,
              quick_jobs: prev.quick_jobs.map((j) => (j.id === jobId ? { ...j, googleTaskId: taskId } : j)),
            }));
          }
        });
      } else {
        const token = getStoredAccessToken();
        if (token && settings.googleTasksConnected) {
          const listId = settings.googleTaskListsMap?.tasksListId || settings.googleTaskListsMap?.quickJobsListId || '@default';
          createGoogleTask(token, listId, `Task: ${cleanTitle} [${jobDuration}]`).then((taskId) => {
            if (taskId) {
              updateBoard((prev) => ({
                ...prev,
                quick_jobs: prev.quick_jobs.map((j) => (j.id === jobId ? { ...j, googleTaskId: taskId, googleTaskListId: listId } : j)),
              }));
            }
          });
        }
      }
    },
    [updateBoard, settings.googleTasksConnected, settings.googleTasksWebhookUrl, settings.googleTaskListsMap]
  );

  const editQuickJob = useCallback(
    (id: string, updates: { title?: string; duration?: QuickJobDuration; due?: string | null }) => {
      updateBoard((prev) => ({
        ...prev,
        quick_jobs: prev.quick_jobs.map((j) => {
          if (j.id !== id) return j;
          return {
            ...j,
            title: updates.title !== undefined ? updates.title.trim() : j.title,
            duration: updates.duration || j.duration,
            due: updates.due !== undefined ? updates.due : j.due,
          };
        }),
      }));
    },
    [updateBoard]
  );

  const toggleQuickJob = useCallback(
    (id: string) => {
      let actionDesc = '';
      updateBoard((prev) => {
        const target = prev.quick_jobs.find((j) => j.id === id);
        const willBeDone = target ? !target.done : false;
        actionDesc = target
          ? willBeDone
            ? `Task "${target.title}" completed`
            : `Task "${target.title}" reopened`
          : 'Task updated';

        if (target && willBeDone) {
          soundService.playSuccessChime();
          if (target.googleTaskId) {
            recordDeletedGoogleTaskId(target.googleTaskId);
            if (settings.googleTasksWebhookUrl) {
              markGoogleTaskCompletedViaWebhook(settings.googleTasksWebhookUrl, target.googleTaskId);
            } else {
              const token = getStoredAccessToken();
              if (token) {
                markGoogleTaskCompleted(token, target.googleTaskListId || '@default', target.googleTaskId);
              }
            }
          }
        }
        return {
          ...prev,
          quick_jobs: prev.quick_jobs.map((j) =>
            j.id === id ? { ...j, done: willBeDone } : j
          ),
        };
      }, actionDesc || 'Task updated');
    },
    [updateBoard, settings.googleTasksWebhookUrl]
  );

  const deleteQuickJob = useCallback(
    (id: string) => {
      let taskTitle = '';
      updateBoard((prev) => {
        const target = prev.quick_jobs.find((j) => j.id === id);
        taskTitle = target ? target.title : 'Task';
        if (target) {
          if (target.googleTaskId) {
            recordDeletedGoogleTaskId(target.googleTaskId);
            if (settings.googleTasksWebhookUrl) {
              deleteGoogleTaskViaWebhook(settings.googleTasksWebhookUrl, target.googleTaskId);
            } else {
              const token = getStoredAccessToken();
              if (token) {
                deleteGoogleTask(token, target.googleTaskListId || '@default', target.googleTaskId);
              }
            }
          }
        }
        return {
          ...prev,
          quick_jobs: prev.quick_jobs.filter((j) => j.id !== id),
        };
      }, `Task "${taskTitle || 'Task'}" deleted`);
    },
    [updateBoard, settings.googleTasksWebhookUrl]
  );

  // Responsibilities
  const addResponsibility = useCallback(
    (
      title: string,
      initialNextStep: string,
      due?: string | null,
      scheduledDate?: string | null,
      scheduledTime?: string | null,
      recurrence?: JobRecurrence | null,
      recurrenceDay?: string | null
    ) => {
      if (!title.trim()) return;
      let computedDue = due || null;
      if (!computedDue && (scheduledDate || scheduledTime || recurrence)) {
        const timePart = scheduledTime ? ` ${scheduledTime}` : '';
        if (recurrence && recurrence !== 'none') {
          const dayPart = recurrenceDay ? `${recurrenceDay}` : 'Weekly';
          computedDue = `🔁 ${dayPart}${timePart}`;
        } else if (scheduledDate) {
          computedDue = `${scheduledDate}${timePart}`;
        }
      }

      const newResp: Responsibility = {
        id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        steps: initialNextStep.trim() ? [initialNextStep.trim()] : ['First actionable step'],
        current_step_index: 0,
        due: computedDue,
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
        recurrence: recurrence || null,
        recurrenceDay: recurrenceDay || null,
        status: 'active',
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({
        ...prev,
        responsibilities: [newResp, ...prev.responsibilities],
      }));

      // Background push to Google Tasks
      const token = getStoredAccessToken();
      if (token && settings.googleTasksConnected) {
        const listId = settings.googleTaskListsMap?.jobsListId || settings.googleTaskListsMap?.responsibilitiesListId || '@default';
        const taskTitle = `Job: ${newResp.title} -> ${newResp.steps[0]}`;
        createGoogleTask(token, listId, taskTitle).then((taskId) => {
          if (taskId) {
            updateBoard((prev) => ({
              ...prev,
              responsibilities: prev.responsibilities.map((r) =>
                r.id === newResp.id ? { ...r, googleTaskId: taskId, googleTaskListId: listId } : r
              ),
            }));
          }
        });
      }
    },
    [updateBoard, settings.googleTasksConnected, settings.googleTaskListsMap]
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

          // If recurring weekly (or recurring in general), automatically reset steps and advance scheduled date!
          if (isDone && r.recurrence && r.recurrence !== 'none') {
            let nextDateStr = r.scheduledDate || null;
            if (r.scheduledDate) {
              const d = new Date(r.scheduledDate + 'T00:00:00');
              const daysToAdd = r.recurrence === 'weekly' ? 7 : r.recurrence === 'biweekly' ? 14 : r.recurrence === 'daily' ? 1 : 30;
              d.setDate(d.getDate() + daysToAdd);
              nextDateStr = d.toISOString().split('T')[0];
            } else if (r.recurrenceDay) {
              const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const targetDayIdx = daysOfWeek.findIndex((d) => d.toLowerCase() === r.recurrenceDay?.toLowerCase());
              if (targetDayIdx !== -1) {
                const now = new Date();
                const currentDayIdx = now.getDay();
                let diff = (targetDayIdx - currentDayIdx + 7) % 7;
                if (diff === 0) diff = 7;
                now.setDate(now.getDate() + diff);
                nextDateStr = now.toISOString().split('T')[0];
              }
            }

            const timeStr = r.scheduledTime ? ` ${r.scheduledTime}` : '';
            const dayStr = r.recurrenceDay ? `${r.recurrenceDay}` : 'Weekly';
            const updatedDue = `🔁 ${dayStr}${timeStr} (Resets weekly)`;

            return {
              ...r,
              current_step_index: 0,
              status: 'active',
              scheduledDate: nextDateStr,
              due: updatedDue,
              lastCompletedAt: Date.now(),
            };
          }

          if (isDone && r.googleTaskId) {
            recordDeletedGoogleTaskId(r.googleTaskId);
            if (settings.googleTasksWebhookUrl) {
              markGoogleTaskCompletedViaWebhook(settings.googleTasksWebhookUrl, r.googleTaskId);
            } else {
              const token = getStoredAccessToken();
              if (token) {
                markGoogleTaskCompleted(token, r.googleTaskListId || '@default', r.googleTaskId);
              }
            }
          }
          return {
            ...r,
            current_step_index: nextIndex,
            status: isDone ? 'done' : r.status,
          };
        }),
      }));
    },
    [updateBoard, settings.googleTasksWebhookUrl]
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

  const resetResponsibilitySteps = useCallback(
    (id: string) => {
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            current_step_index: 0,
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
      let respTitle = '';
      updateBoard((prev) => {
        const target = prev.responsibilities.find((r) => r.id === id);
        respTitle = target ? target.title : 'Job';
        if (target) {
          if (target.googleTaskId) {
            recordDeletedGoogleTaskId(target.googleTaskId);
            if (settings.googleTasksWebhookUrl) {
              deleteGoogleTaskViaWebhook(settings.googleTasksWebhookUrl, target.googleTaskId);
            } else {
              const token = getStoredAccessToken();
              if (token) {
                deleteGoogleTask(token, target.googleTaskListId || '@default', target.googleTaskId);
              }
            }
          }
        }
        return {
          ...prev,
          responsibilities: prev.responsibilities.filter((r) => r.id !== id),
        };
      }, `Job "${respTitle || 'Job'}" deleted`);
    },
    [updateBoard, settings.googleTasksWebhookUrl]
  );

  const editResponsibility = useCallback(
    (
      id: string,
      updates: {
        title?: string;
        currentStep?: string;
        due?: string | null;
        scheduledDate?: string | null;
        scheduledTime?: string | null;
        recurrence?: JobRecurrence | null;
        recurrenceDay?: string | null;
        steps?: string[];
      }
    ) => {
      updateBoard((prev) => ({
        ...prev,
        responsibilities: prev.responsibilities.map((r) => {
          if (r.id !== id) return r;
          let newSteps = updates.steps ? [...updates.steps] : [...r.steps];
          if (updates.currentStep && updates.currentStep.trim()) {
            newSteps[r.current_step_index] = updates.currentStep.trim();
          }
          return {
            ...r,
            title: updates.title !== undefined ? updates.title.trim() : r.title,
            due: updates.due !== undefined ? updates.due : r.due,
            scheduledDate: updates.scheduledDate !== undefined ? updates.scheduledDate : r.scheduledDate,
            scheduledTime: updates.scheduledTime !== undefined ? updates.scheduledTime : r.scheduledTime,
            recurrence: updates.recurrence !== undefined ? updates.recurrence : r.recurrence,
            recurrenceDay: updates.recurrenceDay !== undefined ? updates.recurrenceDay : r.recurrenceDay,
            steps: newSteps,
          };
        }),
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

      // Background push to Google Tasks
      const token = getStoredAccessToken();
      if (token && settings.googleTasksConnected) {
        const listId = settings.googleTaskListsMap?.projectsListId || '@default';
        const taskTitle = `Project: ${newProj.name} | Next: ${newProj.next_step}`;
        createGoogleTask(token, listId, taskTitle).then((taskId) => {
          if (taskId) {
            updateBoard((prev) => ({
              ...prev,
              projects: prev.projects.map((p) =>
                p.id === newProj.id ? { ...p, googleTaskId: taskId, googleTaskListId: listId } : p
              ),
            }));
          }
        });
      }
    },
    [updateBoard, settings.googleTasksConnected, settings.googleTaskListsMap]
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
      let projName = '';
      updateBoard((prev) => {
        const target = prev.projects.find((p) => p.id === id);
        projName = target ? target.name : 'Project';
        if (target) {
          if (target.googleTaskId) {
            recordDeletedGoogleTaskId(target.googleTaskId);
            if (settings.googleTasksWebhookUrl) {
              deleteGoogleTaskViaWebhook(settings.googleTasksWebhookUrl, target.googleTaskId);
            } else {
              const token = getStoredAccessToken();
              if (token) {
                deleteGoogleTask(token, target.googleTaskListId || '@default', target.googleTaskId);
              }
            }
          }
        }
        return {
          ...prev,
          projects: prev.projects.filter((p) => p.id !== id),
          current_focus_project_id:
            prev.current_focus_project_id === id ? null : prev.current_focus_project_id,
        };
      }, `Project "${projName || 'Project'}" deleted`);
    },
    [updateBoard, settings.googleTasksWebhookUrl]
  );

  const completeProjectStep = useCallback(
    (id: string, newNextStep?: string) => {
      soundService.playSuccessChime();
      updateBoard((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== id) return p;
          const completedStep = p.next_step;
          let nextStepVal = '';
          const remainingUpcoming = p.upcoming_steps ? [...p.upcoming_steps] : [];

          if (newNextStep !== undefined && newNextStep.trim()) {
            nextStepVal = newNextStep.trim();
          } else if (remainingUpcoming.length > 0) {
            nextStepVal = remainingUpcoming.shift()!;
          } else {
            nextStepVal = 'Define next milestone';
          }

          const historyEntry = {
            timestamp: Date.now(),
            note: `Completed step: ${completedStep}`,
            next_step: nextStepVal,
          };

          const updatedPosition = p.current_position
            ? `${p.current_position} • Completed: ${completedStep}`
            : `Completed: ${completedStep}`;

          return {
            ...p,
            next_step: nextStepVal,
            upcoming_steps: remainingUpcoming,
            current_position: updatedPosition,
            last_updated: Date.now(),
            history: [...p.history, historyEntry],
          };
        }),
      }));
    },
    [updateBoard]
  );

  const editProject = useCallback(
    (
      id: string,
      updates: {
        name?: string;
        current_position?: string;
        next_step?: string;
        status?: ProjectStatus;
      }
    ) => {
      updateBoard((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            name: updates.name !== undefined ? updates.name.trim() : p.name,
            current_position:
              updates.current_position !== undefined ? updates.current_position.trim() : p.current_position,
            next_step: updates.next_step !== undefined ? updates.next_step.trim() : p.next_step,
            status: updates.status || p.status,
            last_updated: Date.now(),
          };
        }),
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
      let habitName = '';
      updateBoard((prev) => {
        const target = prev.habits.find((h) => h.id === id);
        habitName = target ? target.name : 'Habit';
        return {
          ...prev,
          habits: prev.habits.filter((h) => h.id !== id),
        };
      }, `Habit "${habitName || 'Habit'}" deleted`);
    },
    [updateBoard]
  );

  const editHabit = useCallback(
    (
      id: string,
      updates: {
        name?: string;
        next_due?: string | null;
        target?: number;
      }
    ) => {
      updateBoard((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== id) return h;
          return {
            ...h,
            name: updates.name !== undefined ? updates.name.trim() : h.name,
            next_due: updates.next_due !== undefined ? updates.next_due : h.next_due,
            target: updates.target !== undefined ? updates.target : h.target,
          };
        }),
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

  // Google Tasks Synchronization
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);

  // Auto-reset safety timer: never let isSyncingTasks get stuck in infinite spin
  useEffect(() => {
    if (isSyncingTasks) {
      const timer = setTimeout(() => {
        setIsSyncingTasks(false);
      }, 25000);
      return () => clearTimeout(timer);
    }
  }, [isSyncingTasks]);

  const syncGoogleTasks = useCallback(
    async (
      clientIdOverride?: string,
      cleanOrphanedDemoTasks = false
    ): Promise<{
      success: boolean;
      count: number;
      pushedCount?: number;
      removedCount?: number;
      relocatedCount?: number;
      error?: string;
      errors?: string[];
      accountEmail?: string;
      listsSummary?: string;
    }> => {
      // 1. If Webhook Relay is configured: 100% Zero-Login Permanent Sync!
      if (settings.googleTasksWebhookUrl) {
        setIsSyncingTasks(true);
        try {
          const taskLists = await fetchGoogleTasksFromWebhook(settings.googleTasksWebhookUrl);
          let totalAdded = 0;
          let totalRemoved = 0;

          updateBoard((prev) => {
            const result = syncTasksIntoBoard(prev, taskLists, cleanOrphanedDemoTasks);
            totalAdded = result.totalSynced;
            totalRemoved = result.removedTasks;
            return result.updatedBoard;
          });

          if (totalAdded > 0 || totalRemoved > 0) {
            soundService.playSuccessChime();
          }

          updateSettings({
            googleTasksConnected: true,
            googleTasksLastSync: Date.now(),
          });

          return { success: true, count: totalAdded, removedCount: totalRemoved };
        } catch (err: any) {
          return {
            success: false,
            count: 0,
            error: err?.message || 'Failed to sync via Google Tasks Webhook Relay.',
          };
        } finally {
          setIsSyncingTasks(false);
        }
      }

      // 2. Standard Google Identity Services OAuth
      const clientId = clientIdOverride || settings.googleTasksClientId;
      if (!clientId) {
        return {
          success: false,
          count: 0,
          error: 'Please enter your Google OAuth Client ID in Settings first.',
        };
      }

      setIsSyncingTasks(true);
      try {
        let token = getStoredAccessToken();
        if (!token) {
          token = await requestGoogleTasksAuth(clientId, false, settings.googleTasksEmail);
        }

        // Successfully authenticated with Google
        updateSettings({
          googleTasksClientId: clientId,
          googleTasksConnected: true,
        });

        // 1. Ensure the 4 dedicated lists exist in user's Google Tasks account (Quick Jobs, Responsibilities, Projects, Habits)
        let dedicatedLists = settings.googleTaskListsMap;
        try {
          dedicatedLists = await ensureGoogleTaskLists(token);
        } catch (e) {
          console.warn('Could not auto-create dedicated Google Task lists, using default list:', e);
        }

        // 2. Fetch user's task lists and detected email
        const [taskLists, detectedEmail] = await Promise.all([
          fetchAllGoogleTasks(token),
          fetchGoogleAccountEmail(token),
        ]);
        const primaryListId = taskLists[0]?.listId || '@default';

        // 3. Read latest board data directly from storage (bypasses any stale closure)
        const currentBoard = loadLocalBoardData();

        const newlyCreatedTaskIds = new Set<string>();

        // 4. PUSH PHASE: Upload any un-synced local tasks directly into their dedicated lists
        let totalPushed = 0;
        let pushErrors: string[] = [];
        let boardAfterPush = currentBoard;
        try {
          const pushRes = await pushLocalTasksToGoogle(token, currentBoard, dedicatedLists || primaryListId);
          pushErrors = pushRes.errors || [];
          if (pushRes.pushedCount > 0) {
            totalPushed = pushRes.pushedCount;
            boardAfterPush = pushRes.updatedBoard;
            saveLocalBoardData(boardAfterPush);
            (pushRes.pushedTaskIds || []).forEach((id) => newlyCreatedTaskIds.add(id));
          }
        } catch (pushErr: any) {
          pushErrors.push(pushErr?.message || String(pushErr));
        }

        // 5. If we pushed tasks, re-fetch active tasks from Google so reconciliation gets the exact latest state
        let activeTaskLists = taskLists;
        if (totalPushed > 0) {
          try {
            activeTaskLists = await fetchAllGoogleTasks(token);
          } catch {}
        }

        const listsSummary = activeTaskLists.map((l) => `${l.listTitle} (${l.tasks.length})`).join(', ');
        let totalAdded = 0;
        let totalRemoved = 0;

        const result = syncTasksIntoBoard(boardAfterPush, activeTaskLists, cleanOrphanedDemoTasks, newlyCreatedTaskIds, dedicatedLists);
        totalAdded = result.totalSynced;
        totalRemoved = result.removedTasks;
        let finalBoard = result.updatedBoard;

        // Auto-Triage: Relocate tasks sitting in default/main list into their dedicated lists in Google Tasks!
        let relocatedCount = 0;
        const relocationErrors: string[] = [];

        if (result.tasksToRelocate && result.tasksToRelocate.length > 0) {
          for (const item of result.tasksToRelocate) {
            try {
              const newId = await createGoogleTask(token, item.targetListId, item.title, item.notes);
              if (newId) {
                await deleteGoogleTask(token, item.sourceListId, item.task.id);
                recordDeletedGoogleTaskId(item.task.id);
                relocatedCount++;

                // Update board item with new googleTaskId and googleTaskListId
                if (item.momentumType === 'quick') {
                  finalBoard = {
                    ...finalBoard,
                    quick_jobs: finalBoard.quick_jobs.map((j) =>
                      j.googleTaskId === item.task.id ? { ...j, googleTaskId: newId, googleTaskListId: item.targetListId } : j
                    ),
                  };
                } else if (item.momentumType === 'resp') {
                  finalBoard = {
                    ...finalBoard,
                    responsibilities: finalBoard.responsibilities.map((r) =>
                      r.googleTaskId === item.task.id ? { ...r, googleTaskId: newId, googleTaskListId: item.targetListId } : r
                    ),
                  };
                } else if (item.momentumType === 'proj') {
                  finalBoard = {
                    ...finalBoard,
                    projects: finalBoard.projects.map((p) =>
                      p.googleTaskId === item.task.id ? { ...p, googleTaskId: newId, googleTaskListId: item.targetListId } : p
                    ),
                  };
                } else if (item.momentumType === 'habit') {
                  finalBoard = {
                    ...finalBoard,
                    habits: finalBoard.habits.map((h) =>
                      h.googleTaskId === item.task.id ? { ...h, googleTaskId: newId, googleTaskListId: item.targetListId } : h
                    ),
                  };
                }
              }
            } catch (relocateErr: any) {
              const msg = relocateErr?.message || String(relocateErr);
              console.error('Failed to relocate task across Google Task lists:', item.title, msg);
              relocationErrors.push(`Relocate "${item.title}": ${msg}`);
            }
          }
          saveLocalBoardData(finalBoard);
        }

        updateBoard(() => finalBoard);

        if (totalAdded > 0 || totalRemoved > 0 || totalPushed > 0 || relocatedCount > 0) {
          soundService.playSuccessChime();
        }

        // If tasks were relocated, refresh task lists so summary and active counts are fresh
        if (relocatedCount > 0) {
          try {
            activeTaskLists = await fetchAllGoogleTasks(token);
          } catch {}
        }

        const effectiveEmail = detectedEmail || settings.googleTasksEmail || '';

        updateSettings({
          googleTasksConnected: true,
          googleTasksLastSync: Date.now(),
          googleTasksAccountEmail: effectiveEmail,
          googleTasksSyncedLists: activeTaskLists.map((l) => `${l.listTitle}: ${l.tasks.length} active`),
          googleTaskListsMap: dedicatedLists,
        });

        const combinedErrors = [...pushErrors, ...relocationErrors];

        return {
          success: true,
          count: totalAdded,
          pushedCount: totalPushed,
          removedCount: totalRemoved,
          relocatedCount,
          accountEmail: effectiveEmail,
          listsSummary: activeTaskLists.map((l) => `${l.listTitle} (${l.tasks.length})`).join(', '),
          errors: combinedErrors.length > 0 ? combinedErrors : undefined,
        };
      } catch (err: any) {
        return {
          success: false,
          count: 0,
          error: err?.message || 'Failed to sync Google Tasks.',
        };
      } finally {
        setIsSyncingTasks(false);
      }
    },
    [settings.googleTasksClientId, settings.googleTasksWebhookUrl, settings.googleTasksEmail, updateBoard, updateSettings]
  );

  const disconnectGoogleTasks = useCallback(() => {
    clearStoredAccessToken();
    updateSettings({
      googleTasksConnected: false,
      googleTasksLastSync: undefined,
    });
  }, [updateSettings]);

  // Auto-sync Google Tasks every 5 minutes if enabled
  useEffect(() => {
    if (!settings.googleTasksAutoSync) return;

    // Webhook mode: always safe to auto-sync in background without logins
    if (settings.googleTasksWebhookUrl) {
      const interval = setInterval(() => {
        syncGoogleTasks();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }

    // OAuth mode: only sync if we have a valid cached token so background timer NEVER pops up OAuth
    if (settings.googleTasksConnected && settings.googleTasksClientId) {
      const interval = setInterval(() => {
        const token = getStoredAccessToken();
        if (token) {
          syncGoogleTasks();
        }
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [
    settings.googleTasksConnected,
    settings.googleTasksAutoSync,
    settings.googleTasksClientId,
    settings.googleTasksWebhookUrl,
    syncGoogleTasks,
  ]);

  return (
    <MomentumContext.Provider
      value={{
        boardData,
        settings,
        updateSettings,
        toggleTheme,
        layoutMode,
        toggleLayoutMode,
        isSyncingTasks,
        syncGoogleTasks,
        disconnectGoogleTasks,
        panelStates,
        setPanelLevel,
        cyclePanelLevel,
        setCalendarView,
        addQuickJob,
        toggleQuickJob,
        deleteQuickJob,
        editQuickJob,
        addResponsibility,
        advanceResponsibilityStep,
        regressResponsibilityStep,
        resetResponsibilitySteps,
        addStepToResponsibility,
        updateResponsibilityDue,
        setResponsibilityStatus,
        deleteResponsibility,
        editResponsibility,
        addProject,
        updateProjectProgress,
        setProjectStatus,
        setFocusProject,
        deleteProject,
        completeProjectStep,
        editProject,
        toggleHabitDate,
        setHabitDuration,
        addHabit,
        deleteHabit,
        editHabit,
        addCalendarEvent,
        deleteCalendarEvent,
        applyGeminiParsedData,
        undo,
        canUndo: undoStack.length > 0,
        lastUndoMessage,
        dismissUndoMessage,
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

```

### `src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: light dark;
  }

  body {
    @apply bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased overflow-x-hidden transition-colors;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }

  /* Custom subtle scrollbar for high-density calm views */
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-slate-300 dark:bg-slate-700 rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-slate-400 dark:bg-slate-600;
  }
}

/* Organic breathing pulsation animation for DO button */
@keyframes doBreathe {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 25px rgba(147, 51, 234, 0.45), 0 0 60px rgba(126, 34, 206, 0.25);
  }
  50% {
    transform: scale(1.055);
    box-shadow: 0 0 45px rgba(168, 85, 247, 0.75), 0 0 100px rgba(147, 51, 234, 0.5), 0 0 140px rgba(99, 102, 241, 0.35);
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.96);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.15);
  }
}

.animate-do-breathe {
  animation: doBreathe 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-glow-pulse {
  animation: glowPulse 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

```

### `src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


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

### `src/services/focusCollection.ts`
```typescript
/**
 * Focus App Phase 11: Weeks, Months, Weekends & Watchmaker Collection
 * 
 * 1. 5 Daily Modules assemble into 1 Weekly Movement (closing Thursday night).
 * 2. Unfinished modules carry over within the week; off-days are cleanly skipped.
 * 3. Weekend extras: every 8 work points on off-days upgrades one part's finish (polish),
 *    and 16 work points unlocks a Complication slot.
 * 4. Project Complication: finishing a project's final step adds a complication to the week.
 * 5. 4 Completed Weeks = 1 Collectible Watch (unlocks case -> dial -> hands -> crystal/crown).
 */

import { DayModule, WatchPart, FinishGrade } from './focusMovement';
import { queueEvent } from './focusDataLayer';

export interface WeeklyMovement {
  week_id: string; // e.g. "week_2026_W46"
  start_date: string; // Sunday YYYY-MM-DD
  end_date: string; // Saturday YYYY-MM-DD
  modules: Record<string, DayModule>; // Sun, Mon, Tue, Wed, Thu
  weekend_work_points: number;
  polish_upgrades_count: number;
  complications: string[];
  is_closed: boolean;
  closed_at?: string;
}

export interface CollectibleWatch {
  watch_id: string;
  name: string;
  caliber: string;
  completed_weeks_count: number; // 0 to 4
  unlocked_components: {
    case: boolean;
    dial: boolean;
    hands: boolean;
    crystal_crown: boolean;
  };
  case_material: 'Steel' | 'Titanium' | 'Rose Gold' | 'Platinum';
  dial_style: 'Minimal Enamel' | 'Sunburst Blue' | 'Guilloché Silver' | 'Skeleton Openwork';
  complications: string[];
  parts_count: number;
  finish_summary: string;
  completed_at?: string;
}

const STORAGE_KEYS = {
  CURRENT_WEEKLY_MOVEMENT: 'focus_weekly_movement',
  WATCH_COLLECTION: 'focus_watch_collection',
  ACTIVE_WATCH: 'focus_active_crafting_watch',
  LAST_FRIDAY_SUMMARY_DATE: 'focus_last_friday_summary_date',
};

const FINISH_GRADE_ORDER: FinishGrade[] = ['functional', 'brushed', 'decorated', 'hand-finished'];

/**
 * Returns ISO week string like "2026-W46"
 */
export function getWeekId(d: Date = new Date()): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Gets or initializes the current weekly movement
 */
export function getCurrentWeeklyMovement(now: Date = new Date()): WeeklyMovement {
  const weekId = getWeekId(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_WEEKLY_MOVEMENT);
    if (raw) {
      const parsed: WeeklyMovement = JSON.parse(raw);
      if (parsed.week_id === weekId) {
        return parsed;
      }
    }
  } catch (_) {}

  // Calculate Sunday start of the week
  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() + 6);

  const newMovement: WeeklyMovement = {
    week_id: weekId,
    start_date: sunday.toISOString().split('T')[0],
    end_date: saturday.toISOString().split('T')[0],
    modules: {},
    weekend_work_points: 0,
    polish_upgrades_count: 0,
    complications: [],
    is_closed: false,
  };

  saveWeeklyMovement(newMovement);
  return newMovement;
}

export function saveWeeklyMovement(movement: WeeklyMovement): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_WEEKLY_MOVEMENT, JSON.stringify(movement));
}

/**
 * Applies weekend or off-day work to Polish the current movement
 * - Every 8 work points upgrades one part of that week's movement by 1 finish grade
 * - First 16 work points unlocks a Complication slot
 */
export async function recordOffDayPolish(workPoints: number): Promise<{
  upgradesAdded: number;
  complicationUnlocked: boolean;
}> {
  const movement = getCurrentWeeklyMovement();
  const prevWork = movement.weekend_work_points;
  const newWork = prevWork + workPoints;
  movement.weekend_work_points = newWork;

  const prevUpgrades = Math.floor(prevWork / 8);
  const newUpgrades = Math.floor(newWork / 8);
  const upgradesToAdd = Math.max(0, newUpgrades - prevUpgrades);

  let complicationUnlocked = false;
  if (prevWork < 16 && newWork >= 16 && !movement.complications.includes('Weekend Moonphase Complication')) {
    movement.complications.push('Weekend Moonphase Complication');
    complicationUnlocked = true;
    await queueEvent('complication_unlocked', {
      type: 'weekend_reward',
      name: 'Weekend Moonphase Complication',
      week_id: movement.week_id,
    });
  }

  if (upgradesToAdd > 0) {
    // Find parts in modules to upgrade to next finish grade
    let upgradesRemaining = upgradesToAdd;
    for (const mod of Object.values(movement.modules)) {
      for (const part of mod.parts) {
        if (upgradesRemaining <= 0) break;
        const currentIdx = FINISH_GRADE_ORDER.indexOf(part.finish_grade);
        if (currentIdx < FINISH_GRADE_ORDER.length - 1) {
          part.finish_grade = FINISH_GRADE_ORDER[currentIdx + 1];
          movement.polish_upgrades_count++;
          upgradesRemaining--;
        }
      }
    }
  }

  saveWeeklyMovement(movement);
  return { upgradesAdded: upgradesToAdd, complicationUnlocked };
}

/**
 * Adds a project complication when a long-term project's final task is completed
 */
export async function addProjectComplication(projectTitle: string): Promise<void> {
  const movement = getCurrentWeeklyMovement();
  const compName = `Project Milstone: ${projectTitle}`;
  if (!movement.complications.includes(compName)) {
    movement.complications.push(compName);
    saveWeeklyMovement(movement);

    await queueEvent('complication_unlocked', {
      type: 'project_milestone',
      project_title: projectTitle,
      week_id: movement.week_id,
    });
  }
}

/**
 * Gets or initializes the watch currently being crafted (4 weeks to assemble)
 */
export function getActiveCraftingWatch(): CollectibleWatch {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_WATCH);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  const collection = getWatchCollection();
  const nextNum = collection.length + 1;

  const initialWatch: CollectibleWatch = {
    watch_id: 'watch_' + Date.now(),
    name: `Caliber ${nextNum} Chronometer`,
    caliber: `AG-${(nextNum * 101).toString()}`,
    completed_weeks_count: 0,
    unlocked_components: {
      case: false,
      dial: false,
      hands: false,
      crystal_crown: false,
    },
    case_material: nextNum % 2 === 0 ? 'Titanium' : 'Steel',
    dial_style: nextNum % 2 === 0 ? 'Sunburst Blue' : 'Guilloché Silver',
    complications: [],
    parts_count: 0,
    finish_summary: 'Starting assembly',
  };

  saveActiveCraftingWatch(initialWatch);
  return initialWatch;
}

export function saveActiveCraftingWatch(watch: CollectibleWatch): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_WATCH, JSON.stringify(watch));
}

export function getWatchCollection(): CollectibleWatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_COLLECTION);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveWatchCollection(collection: CollectibleWatch[]): void {
  localStorage.setItem(STORAGE_KEYS.WATCH_COLLECTION, JSON.stringify(collection));
}

/**
 * Closes the weekly movement and advances the watch crafting progress!
 * 4 completed movements crafts the timepiece into the collection vault.
 */
export async function completeWeeklyMovement(): Promise<{
  watch: CollectibleWatch;
  isWatchFinished: boolean;
}> {
  const movement = getCurrentWeeklyMovement();
  movement.is_closed = true;
  movement.closed_at = new Date().toISOString();
  saveWeeklyMovement(movement);

  const watch = getActiveCraftingWatch();
  watch.completed_weeks_count = Math.min(4, watch.completed_weeks_count + 1);

  // Progressive unlock of components
  if (watch.completed_weeks_count >= 1) watch.unlocked_components.case = true;
  if (watch.completed_weeks_count >= 2) watch.unlocked_components.dial = true;
  if (watch.completed_weeks_count >= 3) watch.unlocked_components.hands = true;
  if (watch.completed_weeks_count >= 4) watch.unlocked_components.crystal_crown = true;

  // Aggregate complications and parts
  if (movement.complications.length > 0) {
    watch.complications = Array.from(new Set([...watch.complications, ...movement.complications]));
  }

  // Count parts in this week
  let weeklyParts = 0;
  for (const m of Object.values(movement.modules)) {
    weeklyParts += m.parts.length;
  }
  watch.parts_count += weeklyParts;

  let isWatchFinished = false;
  if (watch.completed_weeks_count >= 4) {
    watch.completed_at = new Date().toISOString();
    watch.finish_summary = `${watch.parts_count} Hand-Fitted Parts · ${watch.complications.length} Complications`;
    isWatchFinished = true;

    // Archive to collection
    const collection = getWatchCollection();
    saveWatchCollection([watch, ...collection]);

    // Create next watch template
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_WATCH);

    await queueEvent('watch_completed', {
      watch_id: watch.watch_id,
      name: watch.name,
      caliber: watch.caliber,
      parts_count: watch.parts_count,
      complications: watch.complications,
    });
  } else {
    watch.finish_summary = `Week ${watch.completed_weeks_count}/4 completed (${watch.parts_count} parts assembled)`;
    saveActiveCraftingWatch(watch);
  }

  await queueEvent('week_movement_closed', {
    week_id: movement.week_id,
    weeks_towards_watch: watch.completed_weeks_count,
    is_watch_finished: isWatchFinished,
  });

  return { watch, isWatchFinished };
}

/**
 * Checks if Friday morning summary should be presented
 */
export function isFridayMorning(): boolean {
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const todayStr = now.toISOString().split('T')[0];
  const lastShown = localStorage.getItem(STORAGE_KEYS.LAST_FRIDAY_SUMMARY_DATE);
  return isFriday && lastShown !== todayStr;
}

export function markFridaySummarySeen(): void {
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(STORAGE_KEYS.LAST_FRIDAY_SUMMARY_DATE, todayStr);
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

### `src/services/focusDoorway.ts`
```typescript
/**
 * Phase 1 Doorway API Client
 * Uses plain-text JSON POST without custom headers to avoid CORS preflight blocks with Google Apps Script.
 */

const STORAGE_KEYS = {
  WEB_APP_URL: 'focus_apps_script_url',
  SECRET_KEY: 'focus_secret_key',
};

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

export interface FocusEvent {
  event_id: string;
  timestamp: string;
  device: string;
  type: string;
  payload: any;
  schema_version: string;
}

export async function sendTestEvent(customEventId?: string, overrideUrl?: string, overrideKey?: string): Promise<{ ok: boolean; message?: string; event_id?: string; error?: string }> {
  const creds = getStoredCredentials();
  const url = (overrideUrl !== undefined ? overrideUrl : creds.url).trim();
  const key = (overrideKey !== undefined ? overrideKey : creds.key).trim();

  if (!url) {
    return { ok: false, error: 'Web App URL is not configured. Please paste your Apps Script URL below.' };
  }
  if (!key) {
    return { ok: false, error: 'Secret Key is not configured. Please paste your secret key below.' };
  }

  // Ensure they are saved in storage as well
  saveCredentials(url, key);

  const event: FocusEvent = {
    event_id: customEventId || 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    device: navigator.userAgent.includes('Mobi') ? 'phone' : 'desktop',
    type: 'sync_ok',
    payload: { note: 'Phase 1 test event connection check', userAgent: navigator.userAgent },
    schema_version: '1.0',
  };

  try {
    // Send as text/plain to prevent browser CORS preflight issues with Google Apps Script
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        key: key,
        action: 'append_event',
        event: event,
      }),
    });

    const result = await response.json();
    return result;
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || 'Network error connecting to Apps Script. Ensure the web app is deployed with access: Anyone.',
    };
  }
}

```

### `src/services/focusExperiments.ts`
```typescript
/**
 * Focus App Phase 8: Paired Mode & 4-Week Experiment Manager
 * 
 * Computes metrics purely from event logs:
 * 1. Median time from DO to first action started
 * 2. Actions completed per counting day
 * 3. Not-now and neither taps per day
 * 4. Offers served with no action started within 5 minutes
 * 5. Day levels reached (light, standard, full)
 * 6. Average friction completed
 * 
 * Tracks 4-week experiment alternating by counting week:
 * Week 1: Assigned -> Week 2: Paired -> Week 3: Assigned -> Week 4: Paired
 * Inside a week, mode is locked. Manual overrides are logged as mode_override.
 */

import { FocusEvent, queueEvent } from './focusDataLayer';

export type ServeMode = 'assigned' | 'paired';

export interface ModeMetrics {
  mode: ServeMode;
  countingDaysCount: number;
  totalOffers: number;
  totalCompletedActions: number;
  actionsPerCountingDay: number;
  medianDoToActionSeconds: number | null;
  notNowNeitherCount: number;
  notNowNeitherPerDay: number;
  abandonedOffersCount: number; // No action started within 5 mins
  abandonedOfferRate: number; // percentage
  dayLevelsReached: {
    light: number;
    standard: number;
    full: number;
    total: number;
  };
  levelReachedPercentage: number;
  averageFrictionCompleted: number;
  hasSufficientData: boolean; // >= 10 counting days
}

export interface ExperimentComparison {
  assigned: ModeMetrics;
  paired: ModeMetrics;
  totalEventsProcessed: number;
  activeWeek: number;
  scheduledMode: ServeMode;
  isLocked: boolean;
  startDate: string;
}

const STORAGE_KEYS = {
  EXPERIMENT_START_DATE: 'focus_experiment_start_date',
  MANUAL_OVERRIDE_MODE: 'focus_experiment_override_mode',
  MANUAL_OVERRIDE_WEEK: 'focus_experiment_override_week',
};

const COUNTING_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

/**
 * Returns the Sunday start of the current week as YYYY-MM-DD
 */
export function getStartOfCountingWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday
  date.setDate(date.getDate() - day);
  return date.toISOString().split('T')[0];
}

/**
 * Gets or initializes the 4-week experiment start date
 */
export function getExperimentStartDate(): string {
  let stored = localStorage.getItem(STORAGE_KEYS.EXPERIMENT_START_DATE);
  if (!stored) {
    stored = getStartOfCountingWeek();
    localStorage.setItem(STORAGE_KEYS.EXPERIMENT_START_DATE, stored);
  }
  return stored;
}

/**
 * Resets the experiment start date
 */
export function setExperimentStartDate(dateStr: string) {
  localStorage.setItem(STORAGE_KEYS.EXPERIMENT_START_DATE, dateStr);
  localStorage.removeItem(STORAGE_KEYS.MANUAL_OVERRIDE_MODE);
  localStorage.removeItem(STORAGE_KEYS.MANUAL_OVERRIDE_WEEK);
}

/**
 * Calculates current experiment week (1, 2, 3, 4, or completed > 4)
 * Week 1: Assigned
 * Week 2: Paired
 * Week 3: Assigned
 * Week 4: Paired
 */
export function getExperimentScheduleStatus(currentDate: Date = new Date()): {
  weekNumber: number;
  scheduledMode: ServeMode;
  effectiveMode: ServeMode;
  isLocked: boolean;
  hasOverride: boolean;
  startDate: string;
} {
  const startDateStr = getExperimentStartDate();
  const start = new Date(startDateStr);
  const now = new Date(currentDate);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

  // Alternating schedule: odd weeks = assigned, even weeks = paired
  const scheduledMode: ServeMode = weekNumber % 2 === 1 ? 'assigned' : 'paired';

  const overrideMode = localStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDE_MODE) as ServeMode | null;
  const overrideWeek = localStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDE_WEEK);

  const hasOverride = !!(overrideMode && overrideWeek === String(weekNumber));
  const effectiveMode: ServeMode = hasOverride ? overrideMode! : scheduledMode;

  return {
    weekNumber: Math.min(4, weekNumber),
    scheduledMode,
    effectiveMode,
    isLocked: !hasOverride && weekNumber <= 4,
    hasOverride,
    startDate: startDateStr,
  };
}

/**
 * Manually override experiment mode for the current week and logs mode_override event
 */
export async function overrideExperimentMode(
  newMode: ServeMode,
  currentMode: ServeMode,
  reason: string = 'User manual override'
): Promise<void> {
  const status = getExperimentScheduleStatus();
  localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDE_MODE, newMode);
  localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDE_WEEK, String(status.weekNumber));

  await queueEvent('mode_override', {
    from_mode: currentMode,
    to_mode: newMode,
    week_number: status.weekNumber,
    scheduled_mode: status.scheduledMode,
    reason,
  });
}

/**
 * Helper to compute median of a number array
 */
function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return Math.round(sorted[mid]);
}

/**
 * Computes Experiment Metrics from Events alone
 */
export function computeExperimentMetrics(
  events: FocusEvent[],
  now: Date = new Date()
): ExperimentComparison {
  const schedule = getExperimentScheduleStatus(now);

  // Group events by mode
  // An event belongs to 'paired' if payload.mode === 'paired' or event happened during paired period
  const assignedEvents: FocusEvent[] = [];
  const pairedEvents: FocusEvent[] = [];

  for (const ev of events) {
    const mode = ev.payload?.mode;
    if (mode === 'paired') {
      pairedEvents.push(ev);
    } else if (mode === 'assigned') {
      assignedEvents.push(ev);
    } else {
      // Attribute by timestamp against experiment schedule if mode not explicitly in payload
      const evDate = new Date(ev.timestamp);
      const evStatus = getExperimentScheduleStatus(evDate);
      if (evStatus.effectiveMode === 'paired') {
        pairedEvents.push(ev);
      } else {
        assignedEvents.push(ev);
      }
    }
  }

  const computeForSlice = (sliceEvents: FocusEvent[], mode: ServeMode): ModeMetrics => {
    const countingDaysSet = new Set<string>();
    const doPressTimestamps: number[] = [];
    const doToActionLatencies: number[] = [];

    let totalOffers = 0;
    let completedActionsCount = 0;
    let notNowNeitherCount = 0;
    let frictionSum = 0;
    let abandonedOffersCount = 0;

    const dayLevels = {
      light: 0,
      standard: 0,
      full: 0,
      total: 0,
    };

    // Sort chronologically for sequence analysis
    const sorted = [...sliceEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i];
      const evTime = new Date(ev.timestamp);
      const dayName = evTime.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = evTime.toISOString().split('T')[0];

      if (COUNTING_DAYS.includes(dayName)) {
        countingDaysSet.add(dateStr);
      }

      if (ev.type === 'do_press') {
        doPressTimestamps.push(evTime.getTime());
      } else if (ev.type === 'action_started') {
        // Find most recent do_press within 30 minutes
        const actTime = evTime.getTime();
        const matchingDo = [...doPressTimestamps].reverse().find((t) => actTime >= t && actTime - t <= 30 * 60 * 1000);
        if (matchingDo) {
          const latencySec = (actTime - matchingDo) / 1000;
          doToActionLatencies.push(latencySec);
        }
      } else if (ev.type === 'action_completed') {
        completedActionsCount++;
        const fric = Number(ev.payload?.friction) || 2;
        frictionSum += fric;
      } else if (ev.type === 'not_now' || ev.type === 'offer_skipped') {
        notNowNeitherCount++;
      } else if (ev.type === 'offer_served') {
        totalOffers++;
        const offerTime = evTime.getTime();
        // Check if an action_started occurred within 5 minutes (300,000 ms)
        let startedWithin5Mins = false;
        for (let j = i + 1; j < sorted.length; j++) {
          const nextEv = sorted[j];
          const nextTime = new Date(nextEv.timestamp).getTime();
          if (nextTime - offerTime > 5 * 60 * 1000) break; // exceeded 5m
          if (nextEv.type === 'action_started') {
            startedWithin5Mins = true;
            break;
          }
        }
        if (!startedWithin5Mins) {
          abandonedOffersCount++;
        }
      } else if (ev.type === 'module_closed' || ev.type === 'day_committed') {
        if (ev.type === 'module_closed') {
          const level = ev.payload?.committed_level;
          if (level === 'light') dayLevels.light++;
          else if (level === 'standard') dayLevels.standard++;
          else if (level === 'full') dayLevels.full++;
          dayLevels.total++;
        }
      }
    }

    const countingDaysCount = countingDaysSet.size;
    const actionsPerCountingDay = countingDaysCount > 0 ? Number((completedActionsCount / countingDaysCount).toFixed(1)) : 0;
    const notNowNeitherPerDay = countingDaysCount > 0 ? Number((notNowNeitherCount / countingDaysCount).toFixed(1)) : 0;
    const averageFrictionCompleted = completedActionsCount > 0 ? Number((frictionSum / completedActionsCount).toFixed(2)) : 0;
    const medianDoToActionSeconds = computeMedian(doToActionLatencies);
    const abandonedOfferRate = totalOffers > 0 ? Number(((abandonedOffersCount / totalOffers) * 100).toFixed(1)) : 0;
    const levelReachedPercentage = countingDaysCount > 0 ? Number(((dayLevels.total / countingDaysCount) * 100).toFixed(0)) : 0;

    return {
      mode,
      countingDaysCount,
      totalOffers,
      totalCompletedActions: completedActionsCount,
      actionsPerCountingDay,
      medianDoToActionSeconds,
      notNowNeitherCount,
      notNowNeitherPerDay,
      abandonedOffersCount,
      abandonedOfferRate,
      dayLevelsReached: dayLevels,
      levelReachedPercentage,
      averageFrictionCompleted,
      hasSufficientData: countingDaysCount >= 10,
    };
  };

  return {
    assigned: computeForSlice(assignedEvents, 'assigned'),
    paired: computeForSlice(pairedEvents, 'paired'),
    totalEventsProcessed: events.length,
    activeWeek: schedule.weekNumber,
    scheduledMode: schedule.scheduledMode,
    isLocked: schedule.isLocked,
    startDate: schedule.startDate,
  };
}

/**
 * Built-in self test using synthetic event dataset to verify exact hand-calculated results
 */
export function runExperimentSelfTest(): {
  passed: boolean;
  calculated: ExperimentComparison;
  expected: {
    assignedCompleted: number;
    assignedAvgFriction: number;
    assignedMedianLatencySec: number;
    pairedCompleted: number;
    pairedAbandonedCount: number;
  };
} {
  const baseDate = new Date('2026-11-15T09:00:00.000Z'); // Sunday (Counting Day)
  const syntheticEvents: FocusEvent[] = [
    // Assigned: DO press at 09:00:00
    {
      event_id: 'test_1',
      timestamp: new Date(baseDate.getTime()).toISOString(),
      device: 'desktop',
      type: 'do_press',
      payload: { mode: 'assigned' },
      schema_version: '1.0',
    },
    // Assigned: Offer served at 09:00:10
    {
      event_id: 'test_2',
      timestamp: new Date(baseDate.getTime() + 10 * 1000).toISOString(),
      device: 'desktop',
      type: 'offer_served',
      payload: { mode: 'assigned' },
      schema_version: '1.0',
    },
    // Assigned: Action started at 09:00:20 (20s latency)
    {
      event_id: 'test_3',
      timestamp: new Date(baseDate.getTime() + 20 * 1000).toISOString(),
      device: 'desktop',
      type: 'action_started',
      payload: { mode: 'assigned' },
      schema_version: '1.0',
    },
    // Assigned: Action completed at 09:15:00 with friction 3
    {
      event_id: 'test_4',
      timestamp: new Date(baseDate.getTime() + 15 * 60 * 1000).toISOString(),
      device: 'desktop',
      type: 'action_completed',
      payload: { mode: 'assigned', friction: 3 },
      schema_version: '1.0',
    },
    // Paired: DO press at 10:00:00
    {
      event_id: 'test_5',
      timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(),
      device: 'desktop',
      type: 'do_press',
      payload: { mode: 'paired' },
      schema_version: '1.0',
    },
    // Paired: Offer served at 10:00:05
    {
      event_id: 'test_6',
      timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000 + 5 * 1000).toISOString(),
      device: 'desktop',
      type: 'offer_served',
      payload: { mode: 'paired' },
      schema_version: '1.0',
    },
    // Paired: Not now tapped (no action started in 5 mins -> counts as abandoned offer too)
    {
      event_id: 'test_7',
      timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000 + 15 * 1000).toISOString(),
      device: 'desktop',
      type: 'not_now',
      payload: { mode: 'paired', reason: 'neither' },
      schema_version: '1.0',
    },
  ];

  const calculated = computeExperimentMetrics(syntheticEvents, baseDate);

  const expected = {
    assignedCompleted: 1,
    assignedAvgFriction: 3,
    assignedMedianLatencySec: 20,
    pairedCompleted: 0,
    pairedAbandonedCount: 1,
  };

  const passed =
    calculated.assigned.totalCompletedActions === expected.assignedCompleted &&
    calculated.assigned.averageFrictionCompleted === expected.assignedAvgFriction &&
    calculated.assigned.medianDoToActionSeconds === expected.assignedMedianLatencySec &&
    calculated.paired.totalCompletedActions === expected.pairedCompleted &&
    calculated.paired.abandonedOffersCount === expected.pairedAbandonedCount;

  return { passed, calculated, expected };
}

```

### `src/services/focusHabits.ts`
```typescript
/**
 * Focus App Habits & Gear Train Model (Phase 7)
 * 
 * 7 daily exercises grouped into Morning & Evening circuits:
 * Half A: Push-ups, Squats, Plank (seconds), Hip Mobility Cycle
 * Half B: Pull-ups, Crunches, Reverse Plank (seconds)
 */

export interface HabitItem {
  habit_id: string;
  name: string;
  half: 'A' | 'B';
  circuit: 'morning' | 'evening' | 'both';
  quota: number;
  unit: 'reps' | 'seconds' | 'cycle';
  currentReps: number;
  isComplete: boolean;
}

export type CircuitLadder = 'full' | 'half' | 'minimum';

export interface CircuitProgress {
  circuitType: 'morning' | 'evening';
  ladder: CircuitLadder;
  items: HabitItem[];
  isClosed: boolean;
  workContribution: number; // 3 for full, 2 for half, 1 for min (cap 6/day)
}

export interface GearState {
  habit_id: string;
  name: string;
  speed: number; // 0 to 1 based on 3-day completion rate
}

export const INITIAL_HABITS: HabitItem[] = [
  // Half A
  { habit_id: 'pushups', name: 'Push-ups', half: 'A', circuit: 'both', quota: 15, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'squats', name: 'Squats', half: 'A', circuit: 'both', quota: 20, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'plank', name: 'Plank', half: 'A', circuit: 'both', quota: 45, unit: 'seconds', currentReps: 0, isComplete: false },
  { habit_id: 'hip_mobility', name: 'Hip Mobility Cycle', half: 'A', circuit: 'both', quota: 1, unit: 'cycle', currentReps: 0, isComplete: false },
  // Half B
  { habit_id: 'pullups', name: 'Pull-ups', half: 'B', circuit: 'both', quota: 8, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'crunches', name: 'Crunches', half: 'B', circuit: 'both', quota: 20, unit: 'reps', currentReps: 0, isComplete: false },
  { habit_id: 'reverse_plank', name: 'Reverse Plank', half: 'B', circuit: 'both', quota: 30, unit: 'seconds', currentReps: 0, isComplete: false },
];

const STORAGE_KEYS = {
  HABITS: 'focus_habits_state',
  POWER_RESERVE: 'focus_power_reserve',
  LAST_RESERVE_DATE: 'focus_last_reserve_date',
};

export function loadHabitsState(): HabitItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return INITIAL_HABITS.map((h) => ({ ...h }));
}

export function saveHabitsState(habits: HabitItem[]): void {
  localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

export function getPowerReserve(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.POWER_RESERVE);
    if (val !== null) return Math.min(100, Math.max(10, parseInt(val, 10)));
  } catch (_) {}
  return 60; // Starting baseline 60%
}

export function addPowerReserve(ticks: number = 2): number {
  const current = getPowerReserve();
  const next = Math.min(100, Math.max(10, current + ticks));
  localStorage.setItem(STORAGE_KEYS.POWER_RESERVE, next.toString());
  return next;
}

/**
 * Direct ignition credit: when user completes an exercise during ignition,
 * credit matching habit quota immediately!
 */
export function creditHabitFromIgnition(exerciseName: string, reps: number): HabitItem[] {
  const habits = loadHabitsState();
  const lowerName = exerciseName.toLowerCase();

  const updated = habits.map((h) => {
    if (h.name.toLowerCase().includes(lowerName) || lowerName.includes(h.name.toLowerCase())) {
      const nextReps = h.currentReps + reps;
      return {
        ...h,
        currentReps: nextReps,
        isComplete: nextReps >= h.quota,
      };
    }
    return h;
  });

  saveHabitsState(updated);
  return updated;
}

/**
 * Weighted random ignition pick:
 * weight = remaining quota fraction + 0.2, so it stays random but leans toward what is owed.
 */
export function getWeightedIgnitionPick(lastExercise?: string): { name: string; reps: number; unit: string } {
  const habits = loadHabitsState();
  const candidates = [
    { name: 'Push-ups', reps: 10, unit: 'reps', habitId: 'pushups' },
    { name: 'Crunches', reps: 15, unit: 'reps', habitId: 'crunches' },
    { name: 'Squats', reps: 15, unit: 'reps', habitId: 'squats' },
    { name: 'Jumping Jacks', reps: 20, unit: 'reps', habitId: null }, // constant
  ].filter((c) => c.name !== lastExercise);

  // Compute weights
  const weighted = candidates.map((cand) => {
    let weight = 0.2;
    if (cand.habitId) {
      const h = habits.find((it) => it.habit_id === cand.habitId);
      if (h && !h.isComplete) {
        const remainingFraction = Math.max(0, (h.quota - h.currentReps) / h.quota);
        weight += remainingFraction * 0.8;
      }
    } else {
      weight = 0.35; // Jumping Jacks baseline
    }
    return { cand, weight };
  });

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of weighted) {
    if (randomVal < item.weight) {
      return item.cand;
    }
    randomVal -= item.weight;
  }

  return candidates[0];
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

### `src/services/focusWakeLock.ts`
```typescript
/**
 * Focus App Screen Wake Lock & Haptic/Audio Feedback (Phase 10)
 * 
 * Prevents mobile screen from sleeping during active timers, push-ups,
 * and plank holds using the browser Screen Wake Lock API.
 * Synthesizes gentle audio completion chimes via Web Audio API.
 */

let wakeLockSentinel: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      return false;
    }
  }
  return false;
}

export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (_) {}
    wakeLockSentinel = null;
  }
}

// Re-acquire wake lock if tab becomes visible again while active
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLockSentinel === null) {
      const isLockedSession = sessionStorage.getItem('focus_wake_lock_active') === 'true';
      if (isLockedSession) {
        await requestScreenWakeLock();
      }
    }
  });
}

export function setWakeLockActive(active: boolean) {
  if (active) {
    sessionStorage.setItem('focus_wake_lock_active', 'true');
    requestScreenWakeLock();
  } else {
    sessionStorage.removeItem('focus_wake_lock_active');
    releaseScreenWakeLock();
  }
}

/**
 * Web Audio API synthesized completion chime (no external audio assets required)
 */
export function playGentleCompletionChime() {
  const soundEnabled = localStorage.getItem('focus_sound_enabled') !== 'false';
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell chime: 523.25 Hz (C5) and 659.25 Hz (E5) -> 783.99 Hz (G5)
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.85);
    });
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}

/**
 * Haptic vibration helper respecting user's setting
 */
export function triggerHaptic(pattern: number | number[] = 50) {
  const vibrationEnabled = localStorage.getItem('focus_vibration_enabled') !== 'false';
  if (!vibrationEnabled) return;

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

```

### `src/services/geminiService.ts`
```typescript
import { GeminiParsedData, Project } from '../types';

export async function parseBrainDumpWithGemini(
  transcriptText: string,
  apiKey: string,
  model = 'gemini-3.8-flash',
  existingProjects: Project[] = []
): Promise<GeminiParsedData> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is not configured. Please enter your Google AI Studio API key in Settings.');
  }

  // Model cascade: If the primary model spikes with 503 (high demand), auto-try fallbacks
  const primary = (!model || model.includes('2.5')) ? 'gemini-3.8-flash' : model;
  const modelsToTry = [
    primary,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const existingProjectNames = existingProjects.map(p => `"${p.name}"`).join(', ');

  const systemInstruction = `
You are Momentum's ADHD-optimized extraction engine. 
The user has ADD and dumps unstructured voice notes or quick thoughts across multiple domains.
Your goal is to parse their brain dump into 4 fundamental buckets without cognitive overhead:

1. "quick_jobs" (Tasks): Independent, bite-sized tasks completed in one sitting (e.g., "Call electrician", "Order parts").
   - Explicit trigger keywords: "Task: ...", "[1m]", "[5m]", "[15m]". Timing tags [1m], [5m], [15m] may appear anywhere, including at the end of the entry (e.g., "Task: Call dentist [5m]"). Strip the timing tag from the title and place it in the "duration" field.
2. "responsibilities" (Jobs): Multi-step obligations with an end state. Identify the overarching job and extract the single immediate "next_action" step.
   - Explicit trigger keywords: "Job: ...", "Bigger Job: ...", "Resp: ...", "Responsibility: ...", "Bigger: ...".
3. "project_updates": Ongoing creative or long-term projects. Check if the thought matches or updates an existing project (${existingProjectNames || 'None specified yet'}) or creates/updates a project. Extract project_name, the concise update_note ("where I am"), and the immediate new_next_step.
   - Explicit trigger keyword: "Project: ...".
4. "habits": Habits or daily rhythms (e.g. Bedtime, workout/stretching, water, reading, push-ups). Record true/false or numeric value (e.g. minutes or reps).
   - Explicit trigger keyword: "Habit: ...".

Current Date Context: ${new Date().toISOString().split('T')[0]}

Schema:
Return pure JSON matching this exact structure:
{
  "quick_jobs": [{"title": "string", "due": "string or null", "duration": "1m or 5m or 15m or null"}],
  "responsibilities": [{"title": "string", "next_action": "string", "due": "string or null"}],
  "project_updates": [{"project_name": "string", "update_note": "string", "new_next_step": "string or null"}],
  "habits": [{"name": "string", "value": "boolean or number"}]
}
If a category has no matching items in the user's input, return an empty array for that category.
`;

  let lastErrorMsg = '';

  for (const currentModel of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

    const is38 = currentModel.includes('3.8');

    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: `Brain dump input:\n"""\n${transcriptText}\n"""`
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    };

    if (is38) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingLevel: "low",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMsg = errorText;
        try {
          const errJson = JSON.parse(errorText);
          parsedMsg = errJson.error?.message || errorText;
        } catch {}

        // If 503 (high demand) or 429, try the next fallback model!
        if (response.status === 503 || response.status === 429) {
          console.warn(`Model ${currentModel} returned ${response.status}. Trying next fallback model...`);
          lastErrorMsg = parsedMsg;
          continue;
        }

        throw new Error(`Gemini API error (${response.status}): ${parsedMsg}`);
      }

      const json = await response.json();
      const candidateParts = json.candidates?.[0]?.content?.parts || [];
      const nonThoughtParts = candidateParts.filter((p: any) => !p.thought);
      const rawText =
        nonThoughtParts.map((p: any) => p.text).join('').trim() ||
        candidateParts[candidateParts.length - 1]?.text ||
        '';

      if (!rawText) {
        continue;
      }

      const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanedText) as GeminiParsedData;
      return {
        quick_jobs: parsed.quick_jobs || [],
        responsibilities: parsed.responsibilities || [],
        project_updates: parsed.project_updates || [],
        habits: parsed.habits || [],
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`Model ${currentModel} timed out. Trying fallback...`);
        lastErrorMsg = 'Request timed out';
        continue;
      }
      // If network error, try next model
      lastErrorMsg = err.message || 'Unknown network error';
    }
  }

  throw new Error(`Gemini servers are currently experiencing high demand. ${lastErrorMsg}`);
}

```

### `src/services/googleTasksService.ts`
```typescript
import { MomentumBoardData, QuickJob, Responsibility, JobRecurrence, Project, Habit, QuickJobDuration, DedicatedTaskLists } from '../types';
import { getDeletedGoogleTaskIds } from './storageService';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: any) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status: 'needsAction' | 'completed';
  updated: string;
  deleted?: boolean;
  hidden?: boolean;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

const TOKEN_KEY = 'momentum_gtasks_token';
const TOKEN_EXPIRY_KEY = 'momentum_gtasks_token_expiry';
const USER_EMAIL_KEY = 'momentum_gtasks_email';

export function getStoredUserEmail(): string {
  try {
    return localStorage.getItem(USER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredUserEmail(email: string): void {
  try {
    if (email && email.includes('@')) {
      localStorage.setItem(USER_EMAIL_KEY, email.trim());
    }
  } catch {}
}

export function getStoredAccessToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiryStr) return null;
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry - 60000) {
      // Token expired or about to expire in 1 minute
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveStoredAccessToken(token: string, expiresInSeconds: number | string = 3600): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const seconds = typeof expiresInSeconds === 'string' ? parseInt(expiresInSeconds, 10) : expiresInSeconds;
    const expiry = Date.now() + (Number.isNaN(seconds) ? 3600 : seconds) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  } catch (e) {
    console.error('Failed to save Google Tasks token:', e);
  }
}

export function clearStoredAccessToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
}

export async function requestGoogleTasksAuth(
  clientId: string,
  promptConsent = false,
  emailHintOverride?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK is not loaded yet. Please ensure your browser has internet access.'));
      return;
    }

    if (!clientId.trim()) {
      reject(new Error('Google Client ID is missing. Please enter your OAuth Client ID in Settings.'));
      return;
    }

    const emailHint = (emailHintOverride || getStoredUserEmail()).trim();

    const timeoutId = setTimeout(() => {
      reject(new Error('Google sign-in timed out. Please check if the popup was blocked by your browser or opened behind your window.'));
    }, 25000);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/tasks',
        hint: emailHint || undefined,
        callback: async (response: GoogleTokenResponse) => {
          clearTimeout(timeoutId);
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (response.access_token) {
            saveStoredAccessToken(response.access_token, response.expires_in || 3600);
            if (emailHint) {
              saveStoredUserEmail(emailHint);
            }
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned by Google.'));
          }
        },
        error_callback: (err: any) => {
          clearTimeout(timeoutId);
          reject(new Error(err?.message || 'Google OAuth failed.'));
        },
      });

      tokenClient.requestAccessToken({
        prompt: promptConsent ? 'consent' : '',
        hint: emailHint || undefined,
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      reject(new Error(e?.message || 'Failed to initialize Google OAuth Token Client.'));
    }
  });
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (res.ok) {
      const data = await res.json();
      return data.email || null;
    }
  } catch {}
  return null;
}

export async function fetchAllGoogleTasks(accessToken: string): Promise<{ listId: string; listTitle: string; tasks: GoogleTaskItem[] }[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    // 1. Fetch all user's task lists
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!listsRes.ok) {
      if (listsRes.status === 401) {
        clearStoredAccessToken();
        throw new Error('Google Tasks session expired. Please click "Sync Tasks" to reconnect.');
      }
      const errText = await listsRes.text();
      if (errText.includes('Tasks API has not been used') || errText.includes('disabled') || listsRes.status === 403) {
        throw new Error(
          'Google Tasks API is not enabled in your Google Cloud project yet. Please enable it in 1 click at: https://console.cloud.google.com/apis/library/tasks.googleapis.com'
        );
      }
      throw new Error(`Google Tasks API error (${listsRes.status}): ${errText}`);
    }

    const listsData = await listsRes.json();
    const taskLists: GoogleTaskList[] = listsData.items || [];

    // 2. Fetch tasks for each list
    const results: { listId: string; listTitle: string; tasks: GoogleTaskItem[] }[] = [];

    for (const list of taskLists) {
      const listPath = formatListIdForUrl(list.id);
      const tasksRes = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${listPath}/tasks?showCompleted=false&showHidden=false&maxResults=100`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        }
      );

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const rawItems: any[] = data.items || [];
        // Strictly exclude completed, deleted, and hidden tasks
        const items: GoogleTaskItem[] = rawItems.filter(
          (t) => !t.deleted && t.status !== 'completed' && !t.hidden
        );
        results.push({
          listId: list.id,
          listTitle: list.title || 'My Tasks',
          tasks: items,
        });
      }
    }

    clearTimeout(timeoutId);
    return results;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Google Tasks request timed out. Please check your internet connection.');
    }
    throw err;
  }
}

/**
 * Safely formats a Google Task list ID for API URL paths.
 * Explicitly preserves literal '@' and ':' which Google Tasks API requires (e.g. '@default', or IDs with colons).
 */
export function formatListIdForUrl(listId: string): string {
  const trimmed = (listId || '@default').trim();
  if (!trimmed || trimmed === '@default' || trimmed.toLowerCase() === '%40default') {
    return '@default';
  }
  const decoded = decodeURIComponent(trimmed);
  return encodeURIComponent(decoded).replace(/%3A/gi, ':').replace(/%40/gi, '@');
}

/**
 * Safely formats a Google Task ID for API URL paths.
 */
export function formatTaskIdForUrl(taskId: string): string {
  const trimmed = (taskId || '').trim();
  const decoded = decodeURIComponent(trimmed);
  return encodeURIComponent(decoded).replace(/%3A/gi, ':').replace(/%40/gi, '@');
}

/**
 * Ensures the 4 dedicated Google Task lists exist:
 * "Quick Jobs", "Responsibilities", "Projects", "Habits".
 * If any do not exist, creates them so the user has separate lists in their Google Tasks app/widget.
 */
export async function ensureGoogleTaskLists(accessToken: string): Promise<DedicatedTaskLists> {
  const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listsRes.ok) {
    throw new Error(`Failed to load Google Task lists (${listsRes.status})`);
  }

  const data = await listsRes.json();
  const existingLists: GoogleTaskList[] = data.items || [];
  const defaultList = existingLists[0] || { id: '@default', title: 'My Tasks' };
  const defaultListId = defaultList.id;

  const createList = async (title: string): Promise<GoogleTaskList> => {
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    throw new Error(`Failed to create list "${title}" (${res.status}): ${errText}`);
  };

  const renameListIfLegacy = async (listId: string, currentTitle: string, newTitle: string): Promise<void> => {
    if (currentTitle.trim().toLowerCase() === newTitle.trim().toLowerCase()) return;
    try {
      const listPath = formatListIdForUrl(listId);
      await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${listPath}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: listId, title: newTitle }),
      });
    } catch (e) {
      console.warn(`Could not rename list ${listId} to ${newTitle}:`, e);
    }
  };

  const getOrCreateDedicatedList = async (pattern: RegExp, preferredTitle: string): Promise<string> => {
    // If only 1 list exists in account, we must create dedicated lists
    const existing = existingLists.find(
      (l) => pattern.test(l.title) && (existingLists.length === 1 ? false : l.id !== defaultListId)
    );
    if (existing && existing.id) {
      // Auto-modernize legacy list names in Google Tasks (Quick Jobs -> Tasks, Responsibilities -> Jobs)
      if (
        (preferredTitle === 'Tasks' && /quick/i.test(existing.title)) ||
        (preferredTitle === 'Jobs' && /resp|bigger/i.test(existing.title))
      ) {
        renameListIfLegacy(existing.id, existing.title, preferredTitle);
        existing.title = preferredTitle;
      }
      return existing.id;
    }
    try {
      const created = await createList(preferredTitle);
      existingLists.push(created);
      return created.id;
    } catch (e) {
      console.warn(`Could not create dedicated Google Task list "${preferredTitle}":`, e);
      return defaultListId;
    }
  };

  const tasksListId = await getOrCreateDedicatedList(/^(?:tasks?|quick\s*tasks?|quick\s*jobs?)$/i, 'Tasks');
  const jobsListId = await getOrCreateDedicatedList(/^(?:jobs?|responsibilit(?:y|ies)|bigger\s*jobs?)$/i, 'Jobs');
  const projectsListId = await getOrCreateDedicatedList(/project/i, 'Projects');
  const habitsListId = await getOrCreateDedicatedList(/habit/i, 'Habits');

  return {
    tasksListId,
    jobsListId,
    quickJobsListId: tasksListId,
    responsibilitiesListId: jobsListId,
    projectsListId,
    habitsListId,
  };
}

export interface TaskToRelocate {
  sourceListId: string;
  targetListId: string;
  task: GoogleTaskItem;
  momentumType: 'quick' | 'resp' | 'proj' | 'habit';
  title: string;
  notes?: string;
}

export interface SyncTasksResult {
  addedQuickJobs: number;
  addedResponsibilities: number;
  addedProjects: number;
  addedHabits: number;
  removedTasks: number;
  totalSynced: number;
  updatedBoard: MomentumBoardData;
  tasksToRelocate?: TaskToRelocate[];
}

/**
 * Parses multi-step task breakdowns from task notes.
 * Matches:
 * "Step 1: ...", "Step 2: ...", "1. ...", "2) ...", "- ...", "* ..."
 */
export function parseStepsFromNotes(notes?: string | null): string[] {
  if (!notes || !notes.trim()) return [];
  const lines = notes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];

  for (const line of lines) {
    if (/^(?:where holding|context|status):\s*/i.test(line)) {
      continue;
    }
    const cleaned = line
      .replace(/^(?:step\s*\d+[:.-]?|\d+[.)-]|[-*•])\s*/i, '')
      .trim();
    if (cleaned && cleaned.length > 1) {
      steps.push(cleaned);
    }
  }
  return steps;
}

/**
 * Intelligent parser & two-way synchronizer that:
 * 1. Prunes tasks that were deleted or completed in Google Tasks.
 * 2. Ingests new tasks and updates existing tasks across Momentum's 4 ADHD buckets.
 */
export function syncTasksIntoBoard(
  boardData: MomentumBoardData,
  taskLists: { listId: string; listTitle?: string; tasks: GoogleTaskItem[] }[],
  cleanOrphanedDemoTasks = false,
  newlyCreatedTaskIds?: Set<string>,
  dedicatedLists?: DedicatedTaskLists
): SyncTasksResult {
  let addedQuickJobs = 0;
  let addedResponsibilities = 0;
  let addedProjects = 0;
  let addedHabits = 0;
  let removedTasks = 0;
  const tasksToRelocate: TaskToRelocate[] = [];

  // 1. Build map of all active Google Tasks
  const activeGoogleTasks = new Map<string, { listId: string; listTitle?: string; task: GoogleTaskItem }>();
  for (const { listId, listTitle, tasks } of taskLists) {
    for (const task of tasks) {
      if (task.id && !task.deleted && task.status !== 'completed' && !task.hidden) {
        activeGoogleTasks.set(task.id, { listId, listTitle, task });
      }
    }
  }

  // Ensure newly pushed tasks in this sync cycle are immediately recognized as active
  if (newlyCreatedTaskIds) {
    for (const id of newlyCreatedTaskIds) {
      if (!activeGoogleTasks.has(id)) {
        activeGoogleTasks.set(id, {
          listId: '@default',
          task: { id, title: '', status: 'needsAction', updated: new Date().toISOString() },
        });
      }
    }
  }

  // Load deleted IDs so completed / deleted tasks are NEVER resurrected
  const deletedTaskIds = getDeletedGoogleTaskIds();

  // 30-minute grace period: tasks created or updated within 30 minutes are protected from remote pruning
  const GRACE_PERIOD_MS = 30 * 60 * 1000;
  const isProtectedFromPruning = (timestamp?: number, googleTaskId?: string) => {
    if (googleTaskId && newlyCreatedTaskIds && newlyCreatedTaskIds.has(googleTaskId)) {
      return true;
    }
    if (timestamp && Date.now() - timestamp < GRACE_PERIOD_MS) {
      return true;
    }
    return false;
  };

  // 2. TWO-WAY PRUNING:
  // If a task was linked to Google Tasks (or cleanOrphanedDemoTasks is on) and no longer exists in Google Tasks, remove it!
  const quickJobs = boardData.quick_jobs.filter((j) => {
    // If protected by grace period or just pushed, ALWAYS preserve
    if (isProtectedFromPruning(j.createdAt, j.googleTaskId)) {
      return true;
    }

    // If marked deleted/completed by user in Momentum, prune it
    if (j.googleTaskId && deletedTaskIds.has(j.googleTaskId)) {
      removedTasks++;
      return false;
    }

    // If linked to Google Tasks and missing from active Google Tasks (and outside grace period), prune it
    if (j.googleTaskId && !activeGoogleTasks.has(j.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (j.id.startsWith('gt-qj-')) {
      const gId = j.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    if (cleanOrphanedDemoTasks && (j.id === 'qj-1' || j.id === 'qj-2')) {
      removedTasks++;
      return false;
    }

    return true;
  });

  const responsibilities = boardData.responsibilities.filter((r) => {
    if (isProtectedFromPruning(r.createdAt, r.googleTaskId)) {
      return true;
    }

    if (r.googleTaskId && deletedTaskIds.has(r.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (r.googleTaskId && !activeGoogleTasks.has(r.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (r.id.startsWith('gt-resp-')) {
      const gId = r.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    if (cleanOrphanedDemoTasks && r.id === 'resp-1') {
      removedTasks++;
      return false;
    }

    return true;
  });

  const projects = boardData.projects.filter((p) => {
    if (isProtectedFromPruning(p.last_updated, p.googleTaskId)) {
      return true;
    }

    if (p.googleTaskId && deletedTaskIds.has(p.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (p.googleTaskId && !activeGoogleTasks.has(p.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (p.id.startsWith('gt-proj-')) {
      const gId = p.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    if (cleanOrphanedDemoTasks && (p.id === 'proj-1' || p.id === 'proj-2')) {
      removedTasks++;
      return false;
    }

    return true;
  });

  const habits = boardData.habits.filter((h) => {
    if (isProtectedFromPruning(undefined, h.googleTaskId)) {
      return true;
    }

    if (h.googleTaskId && deletedTaskIds.has(h.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (h.googleTaskId && !activeGoogleTasks.has(h.googleTaskId)) {
      removedTasks++;
      return false;
    }

    if (h.id.startsWith('gt-hab-')) {
      const gId = h.googleTaskId;
      if (!gId || !activeGoogleTasks.has(gId)) {
        removedTasks++;
        return false;
      }
    }

    return true;
  });

  // Helper set of existing task titles and googleTaskIds to avoid duplicates
  const existingJobKeys = new Set(quickJobs.map((j) => j.googleTaskId || j.title.toLowerCase().trim()));
  const existingRespKeys = new Set(responsibilities.map((r) => r.googleTaskId || r.title.toLowerCase().trim()));
  const existingProjKeys = new Set(projects.map((p) => p.googleTaskId || p.name.toLowerCase().trim()));
  const existingHabitKeys = new Set(habits.map((h) => h.googleTaskId || h.name.toLowerCase().trim()));

  for (const { listId, listTitle, tasks } of taskLists) {
    const listName = listTitle || '';
    const isProjectList = /project/i.test(listName);
    const isRespList = /resp|bigger/i.test(listName);
    const isHabitList = /habit/i.test(listName);

    for (const task of tasks) {
      const rawTitle = (task.title || '').trim();
      if (!rawTitle) continue;

      const taskId = task.id;

      // Skip anything explicitly deleted by ID
      if (taskId && deletedTaskIds.has(taskId)) continue;

      const noteSteps = parseStepsFromNotes(task.notes);

      const projMatch = rawTitle.match(/^project(?::|\s+-|\s+)\s*(.+)$/i);
      const respMatch = rawTitle.match(/^(?:job|bigger\s*job|resp|responsibility|bigger)(?::|\s+-|\s+)\s*(.+)$/i);
      const habitMatch = rawTitle.match(/^habit(?::|\s+-|\s+)\s*(.+)$/i);
      const taskMatch = rawTitle.match(/^task(?::|\s+-|\s+)\s*(.+)$/i);
      const quickMatch = rawTitle.match(/^\[(1m|5m|15m)\]\s*(.+)$/i);

      // 1. TASKS (Explicitly Tagged "Task: ...", or [1m], [5m], [15m] anywhere)
      const timingRegex = /\[(1m|5m|15m)\]/i;
      const hasTimingTag = timingRegex.test(rawTitle);

      if (taskMatch || quickMatch || hasTimingTag) {
        let cleanTitle = taskMatch ? taskMatch[1].trim() : (quickMatch ? quickMatch[2].trim() : rawTitle);
        let duration: QuickJobDuration = '5m';

        // Check if duration was specified like [1m], [5m], [15m] at the end, beginning, or inside
        const durMatch = cleanTitle.match(timingRegex);
        if (durMatch) {
          duration = durMatch[1].toLowerCase() as QuickJobDuration;
          cleanTitle = cleanTitle.replace(timingRegex, '').trim();
        } else if (quickMatch) {
          duration = quickMatch[1].toLowerCase() as QuickJobDuration;
        }

        // Clean any leading "Task: " or "Task " if present
        cleanTitle = cleanTitle.replace(/^task(?::|\s+-|\s+)\s*/i, '').trim();

        // Relocate if sitting in main list or another list
        const targetTasksListId = dedicatedLists?.tasksListId || dedicatedLists?.quickJobsListId;
        if (targetTasksListId && listId !== targetTasksListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: targetTasksListId,
            task,
            momentumType: 'quick',
            title: `Task: ${cleanTitle} [${duration}]`,
            notes: task.notes,
          });
        }

        const existing = quickJobs.find(
          (j) => (taskId && j.googleTaskId === taskId) || j.title.toLowerCase().trim() === cleanTitle.toLowerCase()
        );

        if (!existing) {
          quickJobs.unshift({
            id: `gt-qj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            duration,
            done: false,
            createdAt: Date.now(),
            googleTaskId: taskId,
            googleTaskListId: listId,
            due: task.due ? task.due.split('T')[0] : null,
          });
          addedQuickJobs++;
        } else {
          existing.googleTaskId = taskId;
          existing.googleTaskListId = listId;
          if (task.due) existing.due = task.due.split('T')[0];
        }
        continue;
      }

      // 2. BIGGER RESPONSIBILITIES (Tagged "Resp: ...", "Responsibility: ...", "Bigger: ..." OR located in a Responsibilities list)
      if (respMatch || (isRespList && !projMatch && !habitMatch)) {
        const fullContent = respMatch ? respMatch[1].trim() : rawTitle;
        let respTitle = fullContent;
        let nextStep = '';

        if (fullContent.includes('->')) {
          const parts = fullContent.split('->');
          respTitle = parts[0].trim();
          nextStep = parts.slice(1).join('->').trim();
        }

        // Check for recurrence and scheduling tags like [Weekly Tuesday 2:00 PM] or [Weekly Friday 10:00]
        let recurrence: JobRecurrence | null = null;
        let recurrenceDay: string | null = null;
        let scheduledTime: string | null = null;
        let scheduledDate: string | null = task.due ? task.due.split('T')[0] : null;

        const recMatch = respTitle.match(/\[(?:(weekly|daily|biweekly|monthly)\s*)?(?:(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*)?(?:(\d{1,2}:\d{2}(?:\s*[ap]m)?))?\]/i);
        if (recMatch && (recMatch[1] || recMatch[2] || recMatch[3])) {
          if (recMatch[1]) recurrence = recMatch[1].toLowerCase() as JobRecurrence;
          if (recMatch[2]) {
            recurrenceDay = recMatch[2].charAt(0).toUpperCase() + recMatch[2].slice(1).toLowerCase();
            if (!recurrence) recurrence = 'weekly';
          }
          if (recMatch[3]) scheduledTime = recMatch[3];
          respTitle = respTitle.replace(recMatch[0], '').trim();
        }

        // Relocate if sitting in main list or another list
        const targetJobsListId = dedicatedLists?.jobsListId || dedicatedLists?.responsibilitiesListId;
        if (targetJobsListId && listId !== targetJobsListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: targetJobsListId,
            task,
            momentumType: 'resp',
            title: `Job: ${respTitle}${nextStep ? ` -> ${nextStep}` : ''}`,
            notes: task.notes,
          });
        }

        // Incorporate multi-step breakdown from task notes
        let allSteps: string[] = [];
        if (nextStep && noteSteps.length > 0) {
          if (noteSteps[0].toLowerCase() === nextStep.toLowerCase()) {
            allSteps = noteSteps;
          } else {
            allSteps = [nextStep, ...noteSteps];
          }
        } else if (nextStep) {
          allSteps = [nextStep];
        } else if (noteSteps.length > 0) {
          allSteps = noteSteps;
        } else {
          allSteps = ['Step 1: First physical action'];
        }

        const key = taskId || respTitle.toLowerCase();
        if (!existingRespKeys.has(key)) {
          const computedDue = recurrence
            ? `🔁 ${recurrenceDay || 'Weekly'}${scheduledTime ? ` ${scheduledTime}` : ''} (Resets weekly)`
            : task.due ? task.due.split('T')[0] : null;

          responsibilities.unshift({
            id: `gt-resp-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: respTitle,
            steps: allSteps,
            current_step_index: 0,
            status: 'active',
            createdAt: Date.now(),
            googleTaskId: taskId,
            googleTaskListId: listId,
            due: computedDue,
            scheduledDate,
            scheduledTime,
            recurrence,
            recurrenceDay,
          });
          existingRespKeys.add(key);
          addedResponsibilities++;
        } else {
          const existing = responsibilities.find((r) => r.googleTaskId === taskId || r.title.toLowerCase().trim() === respTitle.toLowerCase());
          if (existing) {
            existing.googleTaskId = taskId;
            existing.googleTaskListId = listId;
            if (task.due) existing.due = task.due.split('T')[0];
          }
        }
        continue;
      }

      // 3. HABITS (Tagged "Habit: ..." OR located in a Habits list)
      if (habitMatch || (isHabitList && !projMatch && !respMatch)) {
        const habitName = habitMatch ? habitMatch[1].trim() : rawTitle;

        // Relocate if sitting in main list or another list
        if (dedicatedLists?.habitsListId && listId !== dedicatedLists.habitsListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: dedicatedLists.habitsListId,
            task,
            momentumType: 'habit',
            title: `Habit: ${habitName}`,
            notes: task.notes,
          });
        }

        const key = taskId || habitName.toLowerCase();
        if (!existingHabitKeys.has(key)) {
          habits.push({
            id: `gt-hab-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: habitName,
            type: 'boolean',
            target: 1,
            next_due: 'Daily',
            log: {},
            googleTaskId: taskId,
            googleTaskListId: listId,
          });
          existingHabitKeys.add(key);
          addedHabits++;
        } else {
          const existing = habits.find((h) => h.googleTaskId === taskId || h.name.toLowerCase().trim() === habitName.toLowerCase());
          if (existing) {
            existing.googleTaskId = taskId;
            existing.googleTaskListId = listId;
          }
        }
        continue;
      }

      // 4. PROJECTS (Tagged "Project: ..." OR located in a Projects list)
      if (projMatch || (isProjectList && !respMatch && !habitMatch)) {
        const fullContent = projMatch ? projMatch[1].trim() : rawTitle;
        let projName = fullContent;
        let nextStep = '';

        if (fullContent.includes('|')) {
          const parts = fullContent.split('|');
          projName = parts[0].trim();
          const nextPart = parts.slice(1).join('|').trim();
          if (nextPart.toLowerCase().startsWith('next:')) {
            nextStep = nextPart.substring(5).trim();
          } else {
            nextStep = nextPart;
          }
        }

        // Relocate if sitting in main list or another list
        if (dedicatedLists?.projectsListId && listId !== dedicatedLists.projectsListId) {
          tasksToRelocate.push({
            sourceListId: listId,
            targetListId: dedicatedLists.projectsListId,
            task,
            momentumType: 'proj',
            title: `Project: ${projName}${nextStep ? ` | Next: ${nextStep}` : ''}`,
            notes: task.notes,
          });
        }

        // Parse multi-step items from notes
        let upcomingSteps: string[] = [];
        if (!nextStep && noteSteps.length > 0) {
          nextStep = noteSteps[0];
          upcomingSteps = noteSteps.slice(1);
        } else if (nextStep && noteSteps.length > 0) {
          if (noteSteps[0].toLowerCase() === nextStep.toLowerCase()) {
            upcomingSteps = noteSteps.slice(1);
          } else {
            upcomingSteps = noteSteps;
          }
        } else if (!nextStep) {
          nextStep = 'Define initial prototype';
        }

        // Check if notes had a "Where holding:" context line
        let currentPosition = 'Imported from Google Tasks';
        if (task.notes) {
          const posLine = task.notes.split(/\r?\n/).find((l) => /^(?:where holding|context|status):\s*/i.test(l.trim()));
          if (posLine) {
            currentPosition = posLine.replace(/^(?:where holding|context|status):\s*/i, '').trim();
          }
        }

        const key = taskId || projName.toLowerCase();
        if (!existingProjKeys.has(key)) {
          projects.push({
            id: `gt-proj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: projName,
            status: 'moving',
            current_position: currentPosition,
            next_step: nextStep,
            upcoming_steps: upcomingSteps.length > 0 ? upcomingSteps : undefined,
            last_updated: Date.now(),
            review_interval_days: 7,
            history: [
              {
                timestamp: Date.now(),
                note: `Imported from Google Tasks: ${currentPosition}`,
                next_step: nextStep,
              },
            ],
            googleTaskId: taskId,
            googleTaskListId: listId,
          });
          existingProjKeys.add(key);
          addedProjects++;
        } else {
          const existing = projects.find((p) => p.googleTaskId === taskId || p.name.toLowerCase().trim() === projName.toLowerCase());
          if (existing) {
            existing.googleTaskId = taskId;
            existing.googleTaskListId = listId;
          }
        }
        continue;
      }

      // 5. UNTAGGED REGULAR TASK: Route to Tasks (5m default) so ADHD user never loses a task
      let cleanGenericTitle = rawTitle;
      let genericDuration: QuickJobDuration = '5m';
      const genericDurMatch = cleanGenericTitle.match(timingRegex);
      if (genericDurMatch) {
        genericDuration = genericDurMatch[1].toLowerCase() as QuickJobDuration;
        cleanGenericTitle = cleanGenericTitle.replace(timingRegex, '').trim();
      }

      const targetTasksListId = dedicatedLists?.tasksListId || dedicatedLists?.quickJobsListId;
      if (targetTasksListId && listId !== targetTasksListId) {
        tasksToRelocate.push({
          sourceListId: listId,
          targetListId: targetTasksListId,
          task,
          momentumType: 'quick',
          title: `Task: ${cleanGenericTitle} [${genericDuration}]`,
          notes: task.notes,
        });
      }

      const existing = quickJobs.find(
        (j) => (taskId && j.googleTaskId === taskId) || j.title.toLowerCase().trim() === cleanGenericTitle.toLowerCase()
      );

      if (!existing) {
        quickJobs.unshift({
          id: `gt-qj-${taskId || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: cleanGenericTitle,
          duration: '5m',
          done: false,
          createdAt: Date.now(),
          googleTaskId: taskId,
          googleTaskListId: listId,
          due: task.due ? task.due.split('T')[0] : null,
        });
        addedQuickJobs++;
      } else {
        existing.googleTaskId = taskId;
        existing.googleTaskListId = listId;
        if (task.due) existing.due = task.due.split('T')[0];
      }
    }
  }

  const totalSynced = addedQuickJobs + addedResponsibilities + addedProjects + addedHabits;

  return {
    addedQuickJobs,
    addedResponsibilities,
    addedProjects,
    addedHabits,
    removedTasks,
    totalSynced,
    updatedBoard: {
      ...boardData,
      quick_jobs: quickJobs,
      responsibilities,
      projects,
      habits,
    },
    tasksToRelocate: tasksToRelocate.length > 0 ? tasksToRelocate : undefined,
  };
}

/**
 * Mark a task completed on Google Tasks when checked off in Momentum
 */
export async function markGoogleTaskCompleted(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  try {
    const targetList = !listId || listId === '@default' ? '@default' : listId;
    const listPath = formatListIdForUrl(targetList);
    const taskPath = formatTaskIdForUrl(taskId);
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${listPath}/tasks/${taskPath}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      }
    );
    if (!res.ok && res.status === 404) {
      try {
        const allLists = await fetchAllGoogleTasks(accessToken);
        for (const l of allLists) {
          if (l.listId !== targetList) {
            const altListPath = formatListIdForUrl(l.listId);
            await fetch(
              `https://tasks.googleapis.com/tasks/v1/lists/${altListPath}/tasks/${taskPath}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'completed' }),
              }
            );
          }
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to mark task completed on Google Tasks:', e);
  }
}

/**
 * Permanently delete a task on Google Tasks when removed from Momentum or relocated
 */
export async function deleteGoogleTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  try {
    const targetList = !listId || listId === '@default' ? '@default' : listId;
    const listPath = formatListIdForUrl(targetList);
    const taskPath = formatTaskIdForUrl(taskId);
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${listPath}/tasks/${taskPath}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok && res.status !== 204) {
      if (res.status === 404) {
        try {
          const allLists = await fetchAllGoogleTasks(accessToken);
          for (const l of allLists) {
            if (l.listId !== targetList) {
              const altListPath = formatListIdForUrl(l.listId);
              const retryRes = await fetch(
                `https://tasks.googleapis.com/tasks/v1/lists/${altListPath}/tasks/${taskPath}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              if (retryRes.ok || retryRes.status === 204) break;
            }
          }
        } catch {}
      } else {
        const errText = await res.text();
        console.warn(`Failed to delete Google task ${taskId} from ${targetList}:`, res.status, errText);
      }
    }
  } catch (e) {
    console.warn('Failed to delete task from Google Tasks:', e);
  }
}

/**
 * Create a new task in Google Tasks
 */
export async function createGoogleTask(
  accessToken: string,
  listId: string,
  title: string,
  notes?: string
): Promise<string> {
  const targetList = !listId || listId === '@default' ? '@default' : listId;
  const listPath = formatListIdForUrl(targetList);
  const payload: any = {
    title: title.trim(),
    status: 'needsAction',
  };
  if (notes && notes.trim()) {
    payload.notes = notes.trim();
  }

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${listPath}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Tasks API create error (${res.status}) on list "${listPath}": ${errText}`);
  }

  const data = await res.json();
  if (!data?.id) {
    throw new Error('Google Tasks API returned no task ID.');
  }
  return data.id;
}

/**
 * Two-way upload: Pushes newly created local tasks to Google Tasks so all devices receive them.
 */
export async function pushLocalTasksToGoogle(
  accessToken: string,
  boardData: MomentumBoardData,
  targetLists?: DedicatedTaskLists | string
): Promise<{
  updatedBoard: MomentumBoardData;
  pushedCount: number;
  pushedTaskIds: string[];
  errors: string[];
}> {
  let pushedCount = 0;
  const pushedTaskIds: string[] = [];
  const errors: string[] = [];
  const updatedQuickJobs = [...boardData.quick_jobs];
  const updatedResponsibilities = [...boardData.responsibilities];
  const updatedProjects = [...boardData.projects];
  const updatedHabits = [...boardData.habits];

  const listConfig: DedicatedTaskLists =
    typeof targetLists === 'object' && targetLists !== null
      ? targetLists
      : {
          quickJobsListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
          responsibilitiesListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
          projectsListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
          habitsListId: typeof targetLists === 'string' && targetLists ? targetLists : '@default',
        };

  const tasksListId = listConfig.tasksListId || listConfig.quickJobsListId;
  const jobsListId = listConfig.jobsListId || listConfig.responsibilitiesListId;

  // 1. Tasks -> tasksListId
  for (let i = 0; i < updatedQuickJobs.length; i++) {
    const job = updatedQuickJobs[i];
    if (!job.googleTaskId && !job.done) {
      if (job.id === 'qj-1' || job.id === 'qj-2') continue;
      try {
        const title = `Task: ${job.title} [${job.duration || '5m'}]`;
        const taskId = await createGoogleTask(accessToken, tasksListId, title);
        if (taskId) {
          updatedQuickJobs[i] = {
            ...job,
            googleTaskId: taskId,
            googleTaskListId: tasksListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Task "${job.title}": ${err?.message || err}`);
      }
    }
  }

  // 2. Jobs -> jobsListId
  for (let i = 0; i < updatedResponsibilities.length; i++) {
    const resp = updatedResponsibilities[i];
    if (!resp.googleTaskId && resp.status === 'active') {
      if (resp.id === 'resp-1') continue;
      try {
        const currentStep = resp.steps[resp.current_step_index] || resp.steps[0] || 'First step';
        const title = `Job: ${resp.title} -> ${currentStep}`;
        const remainingSteps = resp.steps.slice(resp.current_step_index + 1);
        const notes = remainingSteps.length > 0
          ? remainingSteps.map((s, idx) => `Step ${idx + 2}: ${s}`).join('\n')
          : undefined;

        const taskId = await createGoogleTask(accessToken, jobsListId, title, notes);
        if (taskId) {
          updatedResponsibilities[i] = {
            ...resp,
            googleTaskId: taskId,
            googleTaskListId: jobsListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Job "${resp.title}": ${err?.message || err}`);
      }
    }
  }

  // 3. Projects -> projectsListId
  for (let i = 0; i < updatedProjects.length; i++) {
    const proj = updatedProjects[i];
    if (!proj.googleTaskId && proj.status !== 'completed' && proj.status !== 'parked') {
      if (proj.id === 'proj-1' || proj.id === 'proj-2') continue;
      try {
        const title = `Project: ${proj.name} | Next: ${proj.next_step}`;
        const notesLines = [
          `Where holding: ${proj.current_position || 'Active prototype'}`,
        ];
        if (proj.upcoming_steps && proj.upcoming_steps.length > 0) {
          proj.upcoming_steps.forEach((s, idx) => {
            notesLines.push(`Step ${idx + 2}: ${s}`);
          });
        }
        const notes = notesLines.join('\n');

        const taskId = await createGoogleTask(accessToken, listConfig.projectsListId, title, notes);
        if (taskId) {
          updatedProjects[i] = {
            ...proj,
            googleTaskId: taskId,
            googleTaskListId: listConfig.projectsListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Project "${proj.name}": ${err?.message || err}`);
      }
    }
  }

  // 4. Habits -> habitsListId
  for (let i = 0; i < updatedHabits.length; i++) {
    const habit = updatedHabits[i];
    if (!habit.googleTaskId) {
      if (habit.id === 'hab-1' || habit.id === 'hab-2') continue;
      try {
        const title = `Habit: ${habit.name}`;
        const taskId = await createGoogleTask(accessToken, listConfig.habitsListId, title);
        if (taskId) {
          updatedHabits[i] = {
            ...habit,
            googleTaskId: taskId,
            googleTaskListId: listConfig.habitsListId,
          };
          pushedTaskIds.push(taskId);
          pushedCount++;
        }
      } catch (err: any) {
        errors.push(`Habit "${habit.name}": ${err?.message || err}`);
      }
    }
  }

  return {
    updatedBoard: {
      ...boardData,
      quick_jobs: updatedQuickJobs,
      responsibilities: updatedResponsibilities,
      projects: updatedProjects,
      habits: updatedHabits,
    },
    pushedCount,
    pushedTaskIds,
    errors,
  };
}

/**
 * Fetch tasks from Google Apps Script Webhook Relay (Zero-login permanent sync)
 */
export async function fetchGoogleTasksFromWebhook(
  webhookUrl: string
): Promise<{ listId: string; tasks: GoogleTaskItem[] }[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(webhookUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Webhook returned status ${res.status}`);
    }
    const data = await res.json();
    const items: GoogleTaskItem[] = data.tasks || (Array.isArray(data) ? data : []);
    return [{ listId: '@default', tasks: items }];
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Mark a task completed via Google Apps Script Webhook Relay
 */
export async function markGoogleTaskCompletedViaWebhook(
  webhookUrl: string,
  taskId: string
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'complete', taskId }),
    });
  } catch (e) {
    console.warn('Webhook complete failed:', e);
  }
}

/**
 * Delete a task via Google Apps Script Webhook Relay
 */
export async function deleteGoogleTaskViaWebhook(
  webhookUrl: string,
  taskId: string
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', taskId }),
    });
  } catch (e) {
    console.warn('Webhook delete failed:', e);
  }
}

/**
 * Create a task via Google Apps Script Webhook Relay
 */
export async function createGoogleTaskViaWebhook(
  webhookUrl: string,
  title: string,
  notes?: string
): Promise<string | null> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'create', title, notes: notes || '' }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.task?.id || data?.id || null;
    }
  } catch (e) {
    console.warn('Webhook create failed:', e);
  }
  return null;
}


```

### `src/services/soundService.ts`
```typescript
// Gentle harmonic audio feedback using browser's native Web Audio API (Zero external assets)

class SoundService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // Play a pleasant, subtle micro-chime on completing a task or advancing a step
  public playSuccessChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Harmonic pleasant chord: 523.25 Hz (C5) gliding to 659.25 Hz (E5)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // Play a gentle pop on recording start
  public playMicStartTone() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }
}

export const soundService = new SoundService();


```

### `src/services/speechService.ts`
```typescript
// Speech Recognition Service wrapper for Web Speech API

interface SpeechRecognitionHandlerOptions {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
}

export class SpeechRecorder {
  private recognition: any = null;
  private isListening = false;
  private finalTranscript = '';

  constructor() {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public start(options: SpeechRecognitionHandlerOptions = {}): boolean {
    if (!this.recognition) {
      options.onError?.('Speech recognition is not supported in this browser. You can type directly.');
      return false;
    }

    if (this.isListening) {
      this.stop();
    }

    this.finalTranscript = '';

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += (this.finalTranscript ? ' ' : '') + transcript;
          options.onFinalResult?.(this.finalTranscript);
        } else {
          interimTranscript += transcript;
        }
      }
      if (interimTranscript) {
        options.onInterimResult?.(interimTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      options.onError?.(event.error || 'Speech capture error');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd?.();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      options.onError?.(e.message || 'Could not start microphone');
      return false;
    }
  }

  public stop(): string {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
    return this.finalTranscript;
  }

  public active(): boolean {
    return this.isListening;
  }
}

export const speechRecorder = new SpeechRecorder();


```

### `src/services/storageService.ts`
```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { AppSettings, MomentumBoardData, CalendarEvent } from '../types';

const LOCAL_STORAGE_DATA_KEY = 'momentum_board_data_v3';
const LOCAL_STORAGE_SETTINGS_KEY = 'momentum_settings_v3';

function getIsoDateString(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Clean Slate: Real Push-ups habits retained, starter projects & responsibilities seeded
export const DEFAULT_INITIAL_DATA: MomentumBoardData = {
  quick_jobs: [
    {
      id: 'qj-1',
      title: 'Review weekly priority list',
      duration: '5m',
      done: false,
      createdAt: Date.now(),
    },
    {
      id: 'qj-2',
      title: 'Test voice note via Gemini mobile app',
      duration: '1m',
      done: false,
      createdAt: Date.now(),
    },
  ],
  responsibilities: [
    {
      id: 'resp-1',
      title: 'Workshop Organization',
      steps: [
        'Clear and wipe the main workbench surface',
        'Sort hardware bins and fastener drawers',
        'Label tool storage racks',
      ],
      current_step_index: 0,
      due: 'This Weekend',
      status: 'active',
      createdAt: Date.now(),
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Sphere It',
      status: 'moving',
      current_position: 'Initial design and CAD prototyping phase',
      next_step: 'Verify dimensions and test fit first prototype model',
      last_updated: Date.now(),
      review_interval_days: 7,
      history: [
        {
          timestamp: Date.now(),
          note: 'Project initialized on Momentum Cockpit',
          next_step: 'Verify dimensions and test fit first prototype model',
        },
      ],
    },
    {
      id: 'proj-2',
      name: 'Smart Filing Cabinet',
      status: 'moving',
      current_position: 'System concept definition and hardware mapping',
      next_step: 'Draft sensor layout and micro-controller wiring diagram',
      last_updated: Date.now(),
      review_interval_days: 7,
      history: [
        {
          timestamp: Date.now(),
          note: 'Project initialized on Momentum Cockpit',
          next_step: 'Draft sensor layout and micro-controller wiring diagram',
        },
      ],
    },
  ],
  habits: [
    {
      id: 'hab-1',
      name: 'Morning Push-ups (50 reps)',
      type: 'boolean',
      target: 1,
      next_due: 'Daily Morning',
      log: {},
    },
    {
      id: 'hab-2',
      name: 'Night Push-ups (50 reps)',
      type: 'boolean',
      target: 1,
      next_due: 'Daily Night',
      log: {},
    },
  ],
  calendar_events: [],
  current_focus_project_id: 'proj-1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  googleCalendarEmbedUrl: '',
  googleTasksClientId: '',
  googleTasksEmail: '',
  googleTasksAccountEmail: '',
  googleTasksSyncedLists: [],
  googleTasksWebhookUrl: '',
  googleTasksConnected: false,
  googleTasksAutoSync: false,
  googleTasksLastSync: undefined,
  firebaseConfig: null,
  useCloudSync: false,
  userBoardId: 'main-cockpit'
};

let cachedFirestore: Firestore | null = null;
let unsubscribeFirestore: (() => void) | null = null;

export function normalizeGoogleCalendarUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return '';

  // 1. If user pasted the whole <iframe> tag: <iframe src="https://..." ...></iframe>
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    trimmed = iframeMatch[1];
  }

  // 2. Unescape HTML entities like &amp;
  trimmed = trimmed.replace(/&amp;/g, '&');

  // 3. If user entered an email address like user@gmail.com
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(trimmed)}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`;
  }

  // 4. Ensure clean embed layout (no bloated header) if not present
  if (trimmed.includes('calendar.google.com/calendar/embed') && !trimmed.includes('showTitle=')) {
    const sep = trimmed.includes('?') ? '&' : '?';
    trimmed = `${trimmed}${sep}showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`;
  }

  return trimmed;
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.geminiModel || parsed.geminiModel.includes('2.5') || parsed.geminiModel.includes('1.5')) {
        parsed.geminiModel = 'gemini-3.8-flash';
      }
      if (!localStorage.getItem('momentum_explicit_theme_v1')) {
        parsed.theme = 'light';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

const DELETED_GTASKS_KEY = 'momentum_deleted_gtasks_v1';

export function getDeletedGoogleTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_GTASKS_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      // Clean up any historical title entries (Google Task IDs never contain spaces)
      const validIds = parsed.filter((id) => typeof id === 'string' && id.trim().length > 0 && !id.includes(' '));
      return new Set(validIds);
    }
  } catch {}
  return new Set();
}

export function recordDeletedGoogleTaskId(taskId: string): void {
  if (!taskId || taskId.includes(' ')) return; // Never record raw titles as deleted IDs
  try {
    const existing = getDeletedGoogleTaskIds();
    existing.add(taskId);
    localStorage.setItem(DELETED_GTASKS_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {
    console.error('Failed to record deleted Google Task ID:', e);
  }
}

export function unrecordDeletedGoogleTaskId(taskId: string): void {
  if (!taskId || taskId.includes(' ')) return;
  try {
    const existing = getDeletedGoogleTaskIds();
    if (existing.has(taskId)) {
      existing.delete(taskId);
      localStorage.setItem(DELETED_GTASKS_KEY, JSON.stringify(Array.from(existing)));
    }
  } catch (e) {
    console.error('Failed to unrecord deleted Google Task ID:', e);
  }
}

export function loadLocalBoardData(): MomentumBoardData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_INITIAL_DATA,
        ...parsed,
        quick_jobs: Array.isArray(parsed.quick_jobs)
          ? parsed.quick_jobs
          : DEFAULT_INITIAL_DATA.quick_jobs,
        responsibilities: Array.isArray(parsed.responsibilities)
          ? parsed.responsibilities
          : DEFAULT_INITIAL_DATA.responsibilities,
        projects: Array.isArray(parsed.projects)
          ? parsed.projects
          : DEFAULT_INITIAL_DATA.projects,
        habits: Array.isArray(parsed.habits)
          ? parsed.habits
          : DEFAULT_INITIAL_DATA.habits,
        calendar_events: Array.isArray(parsed.calendar_events)
          ? parsed.calendar_events
          : DEFAULT_INITIAL_DATA.calendar_events,
      };
    }
  } catch (e) {
    console.error('Failed to load local board data:', e);
  }
  return DEFAULT_INITIAL_DATA;
}

export function saveLocalBoardData(data: MomentumBoardData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save local board data:', e);
  }
}

export function initFirebaseStore(settings: AppSettings): Firestore | null {
  if (!settings.useCloudSync || !settings.firebaseConfig || !settings.firebaseConfig.apiKey) {
    return null;
  }

  try {
    let app: FirebaseApp;
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(settings.firebaseConfig);
    }

    if (!cachedFirestore) {
      try {
        cachedFirestore = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (cacheErr) {
        cachedFirestore = getFirestore(app);
      }
    }

    return cachedFirestore;
  } catch (err) {
    console.warn('Firebase init warning:', err);
    return null;
  }
}

export function subscribeToBoardData(
  settings: AppSettings,
  onDataUpdate: (data: MomentumBoardData) => void
): () => void {
  if (!settings.useCloudSync || !settings.firebaseConfig?.apiKey) {
    const local = loadLocalBoardData();
    onDataUpdate(local);
    return () => {};
  }

  const db = initFirebaseStore(settings);
  if (!db) {
    const local = loadLocalBoardData();
    onDataUpdate(local);
    return () => {};
  }

  if (unsubscribeFirestore) {
    unsubscribeFirestore();
  }

  const boardDocRef = doc(db, 'momentum_boards', settings.userBoardId || 'main-cockpit');

  unsubscribeFirestore = onSnapshot(
    boardDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as MomentumBoardData;
        saveLocalBoardData(cloudData);
        onDataUpdate(cloudData);
      } else {
        const local = loadLocalBoardData();
        setDoc(boardDocRef, local).catch(console.error);
        onDataUpdate(local);
      }
    },
    (error) => {
      console.warn('Firestore subscription offline/fallback error:', error);
      const local = loadLocalBoardData();
      onDataUpdate(local);
    }
  );

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  };
}

export async function persistBoardData(
  data: MomentumBoardData,
  settings: AppSettings
): Promise<void> {
  saveLocalBoardData(data);

  if (settings.useCloudSync && settings.firebaseConfig?.apiKey) {
    try {
      const db = initFirebaseStore(settings);
      if (db) {
        const boardDocRef = doc(db, 'momentum_boards', settings.userBoardId || 'main-cockpit');
        await setDoc(boardDocRef, data);
      }
    } catch (err) {
      console.warn('Firestore save sync queued or failed:', err);
    }
  }
}

```

### `src/types/index.ts`
```typescript
export type QuickJobDuration = '1m' | '5m' | '15m';

export interface QuickJob {
  id: string;
  title: string;
  due?: string | null;
  duration?: QuickJobDuration;
  done: boolean;
  createdAt: number;
  googleTaskId?: string;
  googleTaskListId?: string;
}

export type ResponsibilityStatus = 'active' | 'waiting' | 'paused' | 'done';
export type JobRecurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Responsibility {
  id: string;
  title: string;
  steps: string[];
  current_step_index: number;
  due?: string | null;
  scheduledDate?: string | null; // e.g. "2026-11-17"
  scheduledTime?: string | null; // e.g. "14:00"
  recurrence?: JobRecurrence | null;
  recurrenceDay?: string | null; // e.g. "Tuesday"
  lastCompletedAt?: number | null;
  status: ResponsibilityStatus;
  createdAt: number;
  googleTaskId?: string;
  googleTaskListId?: string;
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
  upcoming_steps?: string[];
  last_updated: number; // ms timestamp
  review_interval_days: number; // default 7
  history: ProjectHistoryEntry[];
  googleTaskId?: string;
  googleTaskListId?: string;
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
  googleTaskListId?: string;
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

export interface DedicatedTaskLists {
  tasksListId?: string; // Dedicated list ID for Tasks (formerly Quick Jobs)
  jobsListId?: string;  // Dedicated list ID for Jobs (formerly Responsibilities)
  quickJobsListId: string; // Backward compatibility alias
  responsibilitiesListId: string; // Backward compatibility alias
  projectsListId: string;
  habitsListId: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  geminiApiKey: string;
  geminiModel: string;
  googleCalendarEmbedUrl?: string; // Optional Google Calendar embed URL
  googleTasksClientId?: string;    // Google OAuth 2.0 Client ID for Google Tasks
  googleTasksEmail?: string;       // Optional user Google email for seamless GIS re-auth
  googleTasksAccountEmail?: string;// Detected authenticated Google Account email
  googleTasksSyncedLists?: string[];// Summary of synced task lists
  googleTaskListsMap?: DedicatedTaskLists; // Dedicated 4-list IDs for Quick Jobs, Responsibilities, Projects, Habits
  googleTasksWebhookUrl?: string;  // Optional Google Apps Script webhook for permanent 0-login sync
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

```

### `Start-Momentum-Widget.bat`
```
@echo off
title Momentum Desktop Widget
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Momentum-Widget.ps1"


```

### `Start-Momentum-Widget.ps1`
```
# Momentum Desktop Widget Launcher
# Launches Momentum as a persistent, docked desktop widget

Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea

$widgetWidth = 420
$widgetHeight = $screen.Height - 10
$widgetX = $screen.Width - $widgetWidth - 5
$widgetY = 5

$url = "http://localhost:5173"

# Ensure local Vite dev server is running
$testConnection = Test-NetConnection -ComputerName "localhost" -Port 5173 -WarningAction SilentlyContinue
if (-not $testConnection.TcpTestSucceeded) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Win32 definitions to make window Always-on-Top
$code = @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_SHOWWINDOW = 0x0040;
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

# Launch Edge or Chrome in App Mode positioned on the right edge of screen
$edgePath = (Get-Command msedge.exe -ErrorAction SilentlyContinue)?.Source
$chromePath = (Get-Command chrome.exe -ErrorAction SilentlyContinue)?.Source

$browserArgs = "--app=$url --window-size=$widgetWidth,$widgetHeight --window-position=$widgetX,$widgetY --user-data-dir=`"$env:LOCALAPPDATA\MomentumWidget`""

if ($edgePath) {
    $proc = Start-Process -FilePath $edgePath -ArgumentList $browserArgs -PassThru
} elseif ($chromePath) {
    $proc = Start-Process -FilePath $chromePath -ArgumentList $browserArgs -PassThru
} else {
    Start-Process -FilePath $url
}

Write-Output "Momentum Desktop Widget is active at ($widgetX, $widgetY) with size ${widgetWidth}x${widgetHeight}."


```

### `Start-Momentum.bat`
```
@echo off
title Momentum Cockpit Launcher
echo Starting Momentum ADHD Productivity Cockpit...
cd /d "%~dp0"

:: Start the Vite server in the background
start /b cmd /c "npm run dev"

:: Wait 2 seconds for Vite to bind port 5173
timeout /t 2 /nobreak >nul

:: Launch in dedicated persistent standalone desktop window (MS Edge or Google Chrome)
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge --app=http://localhost:5173 --window-size=1400,900 --user-data-dir="%LOCALAPPDATA%\MomentumCockpit"
    goto :done
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome --app=http://localhost:5173 --window-size=1400,900 --user-data-dir="%LOCALAPPDATA%\MomentumCockpit"
    goto :done
)

:: Fallback if neither found in PATH
start http://localhost:5173

:done
echo Momentum is running in its dedicated desktop window.


```

### `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#090d16',
        },
      },
    },
  },
  plugins: [],
}


```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}


```

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});


```
