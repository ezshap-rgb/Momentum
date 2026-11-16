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
