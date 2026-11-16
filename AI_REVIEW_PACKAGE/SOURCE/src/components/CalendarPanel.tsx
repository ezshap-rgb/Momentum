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

