/**
 * Focus App / Momentum — Apps Script Backend Doorway
 * Target Sheet: "Focus App Data"
 * 
 * Instructions:
 * 1. Open your Google Sheet ("Focus App Data")
 * 2. Go to Extensions -> Apps Script
 * 3. Replace all content in Code.gs with this file
 * 4. Run `setupHeadersAndSettings()` once from the editor to ensure headers & settings are complete.
 * 5. Deploy -> Manage deployments -> Edit -> New version -> Deploy.
 */

function getSecretKey() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('FOCUS_SECRET_KEY') || 'changeme_secret_key_123';
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * One-time setup / check: generates headers for all 6 tabs
 * and fills Settings with starting defaults from docs/DATA_MODEL.md
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

  // Ensure tabs and headers exist
  for (const [tabName, headers] of Object.entries(tabs)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    
    // Set headers on row 1 if empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  // Populate default Settings if empty
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

  Logger.log('Focus App setup completed successfully.');
}

/**
 * Handle POST requests (appending events or batches of events)
 * Includes LockService write lock and event_id duplicate deduplication
 */
function doPost(e) {
  // Use a script lock to prevent race conditions across simultaneous writes
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds to acquire the lock
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

    // Read existing event_ids to guarantee deduplication
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

      // Duplicate protection: if already present, return success immediately without adding second row
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
      }

      if (rowsToAppend.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 6).setValues(rowsToAppend);
      }

      return jsonResponse({
        ok: true,
        message: 'Batch processed',
        appended_count: appendedIds.length,
        skipped_count: skippedIds.length,
        appended_ids: appendedIds
      });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action }, 400);

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle GET requests (reading a named tab or health check)
 */
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
