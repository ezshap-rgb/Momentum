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
