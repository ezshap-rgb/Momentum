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
