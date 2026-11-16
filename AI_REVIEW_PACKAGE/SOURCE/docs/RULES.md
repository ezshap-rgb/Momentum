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
