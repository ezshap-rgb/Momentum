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

