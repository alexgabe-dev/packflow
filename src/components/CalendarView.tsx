import React from 'react';
import { useApp } from '../context/AppContext';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Package,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { POKEMON_SETS } from '../lib/scheduler';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC = () => {
  const { sessions } = useApp();
  const today = React.useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = React.useState(today);
  const [selectedDate, setSelectedDate] = React.useState(today);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth((prev) => addMonths(prev, -1));
  const jumpToToday = () => {
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const monthSessions = React.useMemo(
    () =>
      sessions
        .filter((session) => isSameMonth(new Date(session.date), currentMonth))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [currentMonth, sessions]
  );

  const selectedDaySessions = React.useMemo(
    () =>
      sessions
        .filter((session) => isSameDay(new Date(session.date), selectedDate))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [selectedDate, sessions]
  );

  const completedMonthSessions = monthSessions.filter((session) => session.isCompleted);
  const plannedMonthSessions = monthSessions.filter((session) => !session.isCompleted);
  const totalMonthPacks = monthSessions.reduce(
    (sum, session) => sum + (session.isCompleted ? session.actualPacksOpened : session.plannedPacks),
    0
  );
  const activeDaysThisMonth = new Set(monthSessions.map((session) => format(new Date(session.date), 'yyyy-MM-dd'))).size;

  return (
    <div className="space-y-8">
      <header className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="space-y-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
            <p className="mt-2 max-w-2xl text-zinc-500">
              See your opening rhythm, spot busy stretches, and focus on one day at a time.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 font-semibold text-orange-600 dark:text-orange-300">
              <CalendarDays className="h-4 w-4" />
              {monthSessions.length} sessions this month
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Target className="h-4 w-4" />
              {activeDaysThisMonth} active days
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Package className="h-4 w-4" />
              {totalMonthPacks} packs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-2xl border border-zinc-200 bg-white p-3 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={jumpToToday}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="rounded-2xl border border-zinc-200 bg-white p-3 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Completed</p>
          <p className="text-3xl font-bold">{completedMonthSessions.length}</p>
          <p className="mt-2 text-sm text-zinc-500">Logged openings already finished.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Upcoming</p>
          <p className="text-3xl font-bold">{plannedMonthSessions.length}</p>
          <p className="mt-2 text-sm text-zinc-500">Sessions still ahead in this month.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Packs</p>
          <p className="text-3xl font-bold">{totalMonthPacks}</p>
          <p className="mt-2 text-sm text-zinc-500">Planned and logged packs combined.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Focus Day</p>
          <p className="text-3xl font-bold">{selectedDaySessions.length}</p>
          <p className="mt-2 text-sm text-zinc-500">{format(selectedDate, 'EEE, MMM d')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,250,250,0.92))] px-5 py-4 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(24,24,27,0.92))]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400">Month Grid</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Click a day to inspect sessions</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-600 dark:text-emerald-300">Done</span>
                <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-orange-600 dark:text-orange-300">Planned</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Selected</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="py-3 text-center text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800">
            {calendarDays.map((day) => {
              const daySessions = sessions.filter((session) => isSameDay(new Date(session.date), day));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const hasCompleted = daySessions.some((session) => session.isCompleted);
              const hasPlanned = daySessions.some((session) => !session.isCompleted);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'min-h-[124px] bg-white p-3 text-left transition-all dark:bg-zinc-900',
                    !isCurrentMonth && 'bg-zinc-50/70 text-zinc-400 dark:bg-zinc-950/70',
                    isToday(day) && 'bg-orange-50 dark:bg-orange-950/20',
                    isSelected && 'bg-zinc-100 dark:bg-zinc-800/90'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-zinc-700 dark:text-zinc-200',
                        isToday(day) && 'bg-orange-500 text-white',
                        isSelected && !isToday(day) && 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-200">
                        {daySessions.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-1.5">
                    {hasCompleted && <span className="h-1.5 flex-1 rounded-full bg-emerald-500" />}
                    {hasPlanned && <span className="h-1.5 flex-1 rounded-full bg-orange-500" />}
                    {!hasCompleted && !hasPlanned && <span className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />}
                  </div>

                  {daySessions.length > 0 && (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {hasCompleted && (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
                        )}
                        {hasPlanned && (
                          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.35)]" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                        {daySessions.length} item{daySessions.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
              <CalendarDays className="h-5 w-5" />
              <h3 className="text-lg font-bold">Day Focus</h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{format(selectedDate, 'EEEE, MMMM d')}</p>

            <div className="mt-5 space-y-3">
              {selectedDaySessions.length > 0 ? (
                selectedDaySessions.map((session) => {
                  const setName = POKEMON_SETS.find((set) => set.id === session.setId)?.name;

                  return (
                    <div key={session.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{setName || 'Opening Session'}</p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
                            session.isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'
                          )}
                        >
                          {session.isCompleted ? 'Done' : 'Planned'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">
                        {session.isCompleted
                          ? `${session.actualPacksOpened} packs opened and ${session.pulls.length} cards logged.`
                          : `${session.plannedPacks} packs scheduled for this session.`}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                  No sessions on this day. Pick another date or use Settings to shape the schedule.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
              <Zap className="h-5 w-5" />
              <h3 className="text-lg font-bold">Month Agenda</h3>
            </div>

            <div className="mt-5 space-y-3">
              {monthSessions.length > 0 ? (
                monthSessions.slice(0, 6).map((session) => {
                  const setName = POKEMON_SETS.find((set) => set.id === session.setId)?.name;

                  return (
                    <div key={session.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">{format(new Date(session.date), 'EEE, MMM d')}</p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
                            session.isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'
                          )}
                        >
                          {session.isCompleted ? 'Done' : 'Planned'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">
                        {setName ? `${setName} · ` : ''}
                        {session.isCompleted ? `${session.actualPacksOpened} packs opened` : `${session.plannedPacks} packs scheduled`}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                  No openings are scheduled in this month yet.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="flex items-center gap-2 text-orange-500">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Planning Hint</p>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Spread sessions across more active days if this month feels stacked, or increase packs per session if it feels too sparse.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
