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
