import React, { useState } from 'react';
import { useMomentum } from '../context/MomentumContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Clock,
  X,
  Layers,
} from 'lucide-react';

export const CalendarPanel: React.FC = () => {
  const { boardData, settings, panelStates, setCalendarView, addCalendarEvent, deleteCalendarEvent } = useMomentum();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [showGoogleEmbed, setShowGoogleEmbed] = useState(false);

  const viewMode = panelStates.calendar === 'month' ? 'month' : 'week';

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

  // Combine calendar_events with responsibilities that have a due date
  const events = boardData.calendar_events || [];

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
          {settings.googleCalendarEmbedUrl && (
            <button
              onClick={() => setShowGoogleEmbed(!showGoogleEmbed)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition ${
                showGoogleEmbed
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Google Cal
            </button>
          )}

          {/* Month / Week View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setCalendarView('week')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                viewMode === 'week' && !showGoogleEmbed
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                viewMode === 'month' && !showGoogleEmbed
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
        </div>
      </div>

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
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-64 w-full">
          <iframe
            src={settings.googleCalendarEmbedUrl}
            className="w-full h-full border-0"
            title="Google Calendar"
          />
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
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="group/evt text-[10px] leading-tight px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-700/60 text-blue-800 dark:text-blue-200 truncate flex items-center justify-between"
                      title={`${evt.title} ${evt.time ? `(${evt.time})` : ''}`}
                    >
                      <span className="truncate">{evt.title}</span>
                      <button
                        onClick={() => deleteCalendarEvent(evt.id)}
                        className="opacity-0 group-hover/evt:opacity-100 hover:text-rose-400 ml-1"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
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
    </div>
  );
};

