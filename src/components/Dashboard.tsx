import React from 'react';
import { useApp } from '../context/AppContext';
import { format, isAfter, startOfDay } from 'date-fns';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Flame,
  Heart,
  Package,
  Settings2,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { POKEMON_SETS } from '../lib/scheduler';
import { CollectionCardState } from '../types';
import { differenceInCalendarDays } from 'date-fns';

interface DashboardProps {
  onStartSession: (sessionId: string) => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession, onOpenSettings }) => {
  const { sealedStash, sessions, preferences, collection } = useApp();

  const totalPacks = sealedStash.reduce((acc, pack) => acc + pack.count, 0);
  const nextSession = sessions.find(
    (session) =>
      !session.isCompleted &&
      (isAfter(new Date(session.date), startOfDay(new Date())) ||
        format(new Date(session.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
  );
  const completedSessions = sessions.filter((session) => session.isCompleted);
  const totalOpened = completedSessions.reduce((acc, session) => acc + session.actualPacksOpened, 0);

  const totalSpent = sealedStash.reduce((acc, pack) => {
    if (!pack.purchasePrice || pack.count <= 0) return acc;
    return acc + pack.purchasePrice * pack.count;
  }, 0);

  const totalMonthlyBudget = preferences.monthlyBudget ?? 0;
  const monthlyBudgetUsed = totalMonthlyBudget > 0 ? Math.min(100, Math.round((totalSpent / totalMonthlyBudget) * 100)) : 0;
  const totalCardTargets = POKEMON_SETS.reduce((acc, set) => acc + set.totalCards, 0);
  const collectionEntries = Object.values(collection) as CollectionCardState[];
  const collectedCount = collectionEntries.filter((entry) => entry.collected).length;
  const favoriteCount = collectionEntries.filter((entry) => entry.isFavorite).length;
  const completionRate = totalCardTargets > 0 ? Math.round((collectedCount / totalCardTargets) * 100) : 0;
  const recentCompleted = [...completedSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const streak = recentCompleted.reduce((count, session, index, arr) => {
    if (index === 0) return 1;
    const previous = arr[index - 1];
    const diff = Math.abs(differenceInCalendarDays(new Date(previous.date), new Date(session.date)));
    return diff <= 7 && count === index ? count + 1 : count;
  }, 0);

  const summaryCards = [
    {
      label: 'Collected',
      value: collectedCount,
      detail: `${completionRate}% of tracked set list`,
      icon: Target,
    },
    {
      label: 'Opened',
      value: totalOpened,
      detail: `${completedSessions.length} completed sessions`,
      icon: Sparkles,
    },
    {
      label: 'Favorites',
      value: favoriteCount,
      detail: 'Cards you marked to revisit',
      icon: Heart,
    },
    {
      label: 'Sealed',
      value: totalPacks,
      detail: 'Packs currently in stash',
      icon: Package,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">PackFlow</h1>
          <p className="mt-2 max-w-2xl text-zinc-500 dark:text-zinc-400">
            Stay intentional with your openings, see your progress at a glance, and keep the next session feeling clear.
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Settings2 className="h-4 w-4" />
          <span>Manage Plan</span>
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-100 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,247,237,0.72))] p-8 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_35%),linear-gradient(135deg,rgba(24,24,27,0.94),rgba(39,39,42,0.82))]">
            <div className="flex items-center gap-2 text-orange-500">
              <CalendarIcon className="h-5 w-5" />
              <h2 className="font-semibold">Next Opening</h2>
            </div>
            {nextSession ? (
              <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">Scheduled</p>
                  <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-white">
                    {format(new Date(nextSession.date), 'EEEE, MMM do')}
                  </p>
                  <p className="mt-3 text-zinc-500">Planned for {nextSession.plannedPacks} packs with your current pacing.</p>
                </div>
                <button
                  onClick={() => onStartSession(nextSession.id)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Start Session</span>
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">No sessions scheduled yet.</p>
                <p className="mt-1 text-sm text-zinc-500">Add packs and tune your preferences to generate the next opening plan.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{card.label}</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
                  <p className="mt-1 text-sm text-zinc-500">{card.detail}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl"
        >
          <div className="flex items-center gap-2 text-emerald-400">
            <Wallet className="h-5 w-5" />
            <h2 className="font-semibold">Budget Guardrail</h2>
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-4xl font-bold">${totalSpent.toFixed(0)}</p>
                <p className="text-sm text-zinc-400">
                  {totalMonthlyBudget > 0 ? `of $${totalMonthlyBudget}` : 'Set a monthly budget in Management'}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${monthlyBudgetUsed}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Recommendation</p>
              <p className="mt-2 text-sm text-zinc-300">
                {totalMonthlyBudget > 0
                  ? monthlyBudgetUsed > 100
                    ? 'You are over the current monthly guardrail. Consider reducing packs per session or sessions per week.'
                    : 'Your schedule and stash are within the current monthly guardrail.'
                  : 'Add a monthly budget so PackFlow can warn you before your schedule starts feeling too aggressive.'}
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <Package className="h-5 w-5" />
              <span>Stash Snapshot</span>
            </h3>
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 transition hover:text-orange-600"
            >
              <span>Edit Stash</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {sealedStash.length > 0 ? (
              sealedStash.map((pack, idx) => {
                const set = POKEMON_SETS.find((entry) => entry.id === pack.setId);
                return (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{set?.name || 'Unknown Set'}</p>
                      <p className="text-xs uppercase tracking-widest text-zinc-400">{set?.series}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{pack.count}</p>
                      <p className="text-xs text-zinc-400">packs</p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                Your stash is empty. Add sealed product in Management to build your plan.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-xl font-bold">Pacing Summary</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sessions per week</p>
              <p className="mt-2 text-2xl font-bold">{preferences.sessionsPerWeek}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Packs per session</p>
              <p className="mt-2 text-2xl font-bold">{preferences.packsPerSession}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Start date</p>
              <p className="mt-2 text-lg font-bold">{format(new Date(preferences.startDate), 'MMM do, yyyy')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-orange-500">
            <Flame className="h-5 w-5" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Momentum</h3>
          </div>
          <p className="mt-4 text-4xl font-bold">{streak || 0}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {streak > 1 ? `You have logged ${streak} sessions in a row without losing your rhythm.` : 'Log a few sessions to build a collecting streak.'}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Recent Activity</h3>
          {recentCompleted.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recentCompleted.slice(0, 3).map((session) => (
                <div key={session.id} className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{format(new Date(session.date), 'MMM do')}</p>
                  <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                    {session.actualPacksOpened} packs opened, {session.pulls.length} pulls logged
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Your completed sessions will show up here once you start logging openings.</p>
          )}
        </div>
      </section>
    </div>
  );
};
