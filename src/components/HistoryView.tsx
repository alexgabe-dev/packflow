import React from 'react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import {
  BarChart3,
  BookMarked,
  CalendarClock,
  Flame,
  Heart,
  Package,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { buildProgressionSnapshot } from '../lib/progression';
import { useAuth } from '../context/AuthContext';

export const HistoryView: React.FC = () => {
  const { sessions, collection, wishlist, profile } = useApp();
  const snapshot = buildProgressionSnapshot(sessions, collection, wishlist, profile);

  const rarityEntries = Object.entries(snapshot.rarityBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <header className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="space-y-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">History</h2>
            <p className="mt-2 max-w-2xl text-zinc-500">
              Review your opening run, see where progress is building, and spot the sessions that mattered most.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Sparkles className="h-4 w-4" />
              {snapshot.archetype.name}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 font-semibold text-orange-600 dark:text-orange-300">
              <Trophy className="h-4 w-4" />
              {snapshot.completedSessions.length} completed sessions
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Package className="h-4 w-4" />
              {snapshot.totalPacksOpened} packs opened
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <BookMarked className="h-4 w-4" />
              {snapshot.totalCardsLogged} cards logged
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Archetype</p>
          <p className="text-xl font-bold">{snapshot.archetype.name}</p>
          <p className="mt-2 text-sm text-zinc-500">{snapshot.archetype.intensity}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Wanted</p>
          <p className="text-3xl font-bold">{snapshot.totalWishlist}</p>
          <p className="mt-2 text-sm text-zinc-500">Cards on your chase list.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Wishlist Owned</p>
          <p className="text-3xl font-bold">{snapshot.ownedWishlist}</p>
          <p className="mt-2 text-sm text-zinc-500">Chase cards already secured.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Wishlist Missing</p>
          <p className="text-3xl font-bold">{snapshot.missingWishlist}</p>
          <p className="mt-2 text-sm text-zinc-500">Still waiting in the binder.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Streak</p>
          <p className="text-3xl font-bold">{snapshot.streak}</p>
          <p className="mt-2 text-sm text-zinc-500">Recent sessions in rhythm.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <BarChart3 className="h-5 w-5" />
            <h3 className="text-lg font-bold">Session Analytics</h3>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Best Session</p>
              <p className="mt-2 font-bold text-zinc-900 dark:text-zinc-100">
                {snapshot.bestSession ? format(new Date(snapshot.bestSession.date), 'MMM d, yyyy') : 'No session yet'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {snapshot.bestSession
                  ? `${snapshot.bestSession.actualPacksOpened} packs, ${snapshot.bestSession.pulls.length} logged pulls, score ${snapshot.bestSession.score}`
                  : 'Complete sessions to unlock your top opening.'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Most Productive Week</p>
              <p className="mt-2 font-bold text-zinc-900 dark:text-zinc-100">
                {snapshot.productiveWeeks[0] ? `Week of ${snapshot.productiveWeeks[0].label}` : 'No week yet'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {snapshot.productiveWeeks[0]
                  ? `${snapshot.productiveWeeks[0].packs} packs across ${snapshot.productiveWeeks[0].sessions} sessions`
                  : 'Open a few sessions to build weekly analytics.'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                <Flame className="h-4 w-4 text-orange-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Streak Chart</p>
              </div>
              <div className="mt-4 flex items-end gap-2">
                {snapshot.recentActivityBars.length > 0 ? (
                  snapshot.recentActivityBars.map((bar) => (
                    <div key={bar.id} className="flex-1">
                      <div
                        className="rounded-t-xl bg-gradient-to-t from-orange-500 to-amber-300"
                        style={{ height: `${Math.max(18, bar.value * 10)}px` }}
                      />
                      <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">{bar.label}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No recent session bars yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <CalendarClock className="h-5 w-5" />
            <h3 className="text-lg font-bold">Session Timeline</h3>
          </div>

          <div className="mt-5 space-y-4">
            {snapshot.completedSessions.length > 0 ? (
              snapshot.completedSessions.map((session) => {
                const favoritePullCount = session.pulls.filter((pull) => pull.isFavorite).length;
                const reverseCount = session.pulls.filter((pull) => pull.isReverseHolo).length;

                return (
                  <div key={session.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{snapshot.setUsage.find((set) => set.setId === (session.setId ?? 'mixed'))?.setName ?? 'Mixed Session'}</p>
                        <p className="mt-1 text-sm text-zinc-500">{format(new Date(session.date), 'EEEE, MMM d, yyyy')}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                        Done
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-white px-3 py-3 dark:bg-zinc-900">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Packs</p>
                        <p className="mt-2 font-bold">{session.actualPacksOpened}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3 dark:bg-zinc-900">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cards</p>
                        <p className="mt-2 font-bold">{session.pulls.length}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3 dark:bg-zinc-900">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Favorites</p>
                        <p className="mt-2 font-bold">{favoritePullCount}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3 dark:bg-zinc-900">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reverse</p>
                        <p className="mt-2 font-bold">{reverseCount}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                Nothing in history yet. Complete a session and it will appear here automatically.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <Target className="h-5 w-5" />
            <h3 className="text-lg font-bold">Wishlist Progress</h3>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Owned / Missing / Wanted</p>
              <p className="mt-3 text-3xl font-bold">
                {snapshot.ownedWishlist}
                <span className="text-lg text-zinc-400"> / {snapshot.missingWishlist} / {snapshot.totalWishlist}</span>
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
                style={{ width: `${snapshot.totalWishlist > 0 ? (snapshot.ownedWishlist / snapshot.totalWishlist) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-zinc-500">Track chase cards in collection and watch progress here as you secure them.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <Star className="h-5 w-5" />
            <h3 className="text-lg font-bold">Rarity Trends</h3>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rarityEntries.length > 0 ? (
              rarityEntries.map(([rarity, count]) => (
                <div key={rarity} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{rarity}</p>
                    <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-600">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                No rarity trend data yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
