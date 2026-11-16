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
