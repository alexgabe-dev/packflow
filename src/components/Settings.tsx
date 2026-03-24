import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { POKEMON_SETS } from '../lib/scheduler';
import {
  ArrowRight,
  CalendarClock,
  Coins,
  PackagePlus,
  RefreshCcw,
  Sparkles,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Pacing } from '../types';
import { cn } from '../lib/utils';

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const PRESETS = [
  { id: 'slow-burn', label: 'Slow Burn', desc: 'One pack each week', accent: 'from-zinc-900 to-zinc-700' },
  { id: 'weekend-rip', label: 'Weekend Rip', desc: 'Big Saturday sessions', accent: 'from-orange-500 to-amber-400' },
  { id: 'budget', label: 'Budget', desc: 'Tighter monthly control', accent: 'from-emerald-500 to-teal-400' },
  { id: 'completionist', label: 'Completionist', desc: 'High-frequency opening plan', accent: 'from-rose-500 to-fuchsia-400' },
];

export const Settings: React.FC<{ onOpenSession?: (sessionId: string) => void }> = ({ onOpenSession }) => {
  const {
    preferences,
    updatePreferences,
    sealedStash,
    sessions,
    collection,
    wishlist,
    addPacks,
    addHistoricalOpening,
    removePack,
    resetSchedule,
  } = useApp();
  const [newPack, setNewPack] = useState({
    setId: POKEMON_SETS[0].id,
    count: 10,
    isMainSet: true,
    purchasePrice: '',
  });
  const [openedPack, setOpenedPack] = useState({
    setId: POKEMON_SETS[0].id,
    count: 10,
    date: new Date().toISOString().split('T')[0],
  });

  const totalStashPacks = useMemo(() => sealedStash.reduce((sum, pack) => sum + pack.count, 0), [sealedStash]);
  const estimatedStashValue = useMemo(
    () => sealedStash.reduce((sum, pack) => sum + (pack.purchasePrice ?? 0) * pack.count, 0),
    [sealedStash]
  );
  const completedSessions = useMemo(() => sessions.filter((session) => session.isCompleted), [sessions]);
  const handleAddPack = () => {
    if (!newPack.count || newPack.count < 1) return;

    addPacks({
      id: crypto.randomUUID(),
      setId: newPack.setId,
      count: newPack.count,
      isMainSet: newPack.isMainSet,
      purchasePrice: parseOptionalNumber(newPack.purchasePrice),
      purchaseDate: new Date().toISOString(),
    });

    setNewPack((current) => ({ ...current, count: 10, purchasePrice: '' }));
  };

  const handleAddOpenedPack = () => {
    if (!openedPack.count || openedPack.count < 1) return;

    addHistoricalOpening({
      setId: openedPack.setId,
      count: openedPack.count,
      date: openedPack.date,
    });

    setOpenedPack((current) => ({ ...current, count: 10 }));
  };

  const handleAddOpenedPackAndLog = () => {
    if (!openedPack.count || openedPack.count < 1) return;

    const sessionId = addHistoricalOpening({
      setId: openedPack.setId,
      count: openedPack.count,
      date: openedPack.date,
    });

    setOpenedPack((current) => ({ ...current, count: 10 }));
    onOpenSession?.(sessionId);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'slow-burn':
        updatePreferences({ packsPerSession: 1, sessionsPerWeek: 1, pacing: 'slow-burn' });
        break;
      case 'weekend-rip':
        updatePreferences({ packsPerSession: 5, sessionsPerWeek: 1, pacing: 'balanced' });
        break;
      case 'budget':
        updatePreferences({ packsPerSession: 2, sessionsPerWeek: 1, pacing: 'light', monthlyBudget: 50, maxPacksPerMonth: 12 });
        break;
      case 'completionist':
        updatePreferences({ packsPerSession: 3, sessionsPerWeek: 3, pacing: 'balanced' });
        break;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.12),transparent_22%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">Management</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Run your stash, schedule, and opening workflow.</h2>
            <p className="mt-4 text-zinc-500">
              This is the operational side of PackFlow: planning sessions, managing inventory, and keeping your collecting flow organized.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[520px]">
            <div className="min-h-[124px] rounded-3xl bg-zinc-950 px-5 py-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Packs</p>
              <p className="mt-4 text-4xl font-black">{preferences.packsPerSession}</p>
            </div>
            <div className="min-h-[124px] rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Weekly</p>
              <p className="mt-4 text-4xl font-black">{preferences.sessionsPerWeek}</p>
            </div>
            <div className="min-h-[124px] rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Stash</p>
              <p className="mt-4 text-4xl font-black">{totalStashPacks}</p>
            </div>
            <div className="min-h-[124px] rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Budget</p>
              <p className="mt-4 text-4xl font-black">{preferences.monthlyBudget ? `$${preferences.monthlyBudget}` : 'Off'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">Quick Presets</h3>
            <p className="mt-1 text-zinc-500">Jump to a familiar collecting style, then fine tune the details.</p>
          </div>
          <button
            onClick={resetSchedule}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Rebalance Schedule</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', preset.accent)} />
              <div className="flex items-center gap-2 text-orange-500">
                <Sparkles className="h-4 w-4 transition group-hover:scale-110" />
                <span className="text-xs font-bold uppercase tracking-[0.25em]">Preset</span>
              </div>
              <p className="mt-4 text-xl font-bold">{preset.label}</p>
              <p className="mt-2 text-sm text-zinc-500">{preset.desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 group-hover:text-orange-500">
                <span>Apply</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-orange-500">
                <Target className="h-5 w-5" />
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Opening Preferences</h3>
              </div>
              <p className="mt-2 text-zinc-500">Shape how your next sessions are generated and how fast you move through the stash.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Packs per Session</label>
              <input
                type="number"
                min={1}
                value={preferences.packsPerSession}
                onChange={(e) => updatePreferences({ packsPerSession: Math.max(1, Number(e.target.value) || 1) })}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-2xl font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            <div className="rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sessions per Week</label>
              <select
                value={preferences.sessionsPerWeek}
                onChange={(e) => updatePreferences({ sessionsPerWeek: Number(e.target.value) })}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-2xl font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pacing Strategy</label>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(['light', 'balanced', 'slow-burn'] as Pacing[]).map((pace) => (
                  <button
                    key={pace}
                    onClick={() => updatePreferences({ pacing: pace })}
                    className={cn(
                      'rounded-2xl px-4 py-4 text-left transition-all',
                      preferences.pacing === pace
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800 dark:hover:bg-zinc-800'
                    )}
                  >
                    <p className="text-sm font-bold capitalize">{pace.replace('-', ' ')}</p>
                    <p className={cn('mt-1 text-xs', preferences.pacing === pace ? 'text-orange-100' : 'text-zinc-400')}>
                      {pace === 'light' && 'Lower weekly commitment'}
                      {pace === 'balanced' && 'Steady default cadence'}
                      {pace === 'slow-burn' && 'Stretch the hobby out longer'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Start Date</label>
              <input
                type="date"
                value={preferences.startDate.split('T')[0]}
                onChange={(e) => updatePreferences({ startDate: new Date(e.target.value).toISOString() })}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-xl font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-orange-500">
              <PackagePlus className="h-5 w-5" />
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Sealed Stash</h3>
            </div>
            <p className="mt-2 text-zinc-500">Add sealed product here so PackFlow can plan sessions against your real inventory.</p>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <select
                value={newPack.setId}
                onChange={(e) => setNewPack({ ...newPack, setId: e.target.value })}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {POKEMON_SETS.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={newPack.count}
                  onChange={(e) => setNewPack({ ...newPack, count: Math.max(1, Number(e.target.value) || 1) })}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="Pack count"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newPack.purchasePrice}
                  onChange={(e) => setNewPack({ ...newPack, purchasePrice: e.target.value })}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="Price per pack"
                />
              </div>

              <button
                onClick={handleAddPack}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 p-4 font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-zinc-900"
              >
                <PackagePlus className="h-5 w-5" />
                <span>Add to Stash</span>
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Packs</p>
                <p className="mt-2 text-2xl font-bold">{totalStashPacks}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Est. Cost</p>
                <p className="mt-2 text-2xl font-bold">{estimatedStashValue > 0 ? `$${estimatedStashValue.toFixed(0)}` : 'N/A'}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {sealedStash.length > 0 ? (
                sealedStash.map((pack) => {
                  const set = POKEMON_SETS.find((entry) => entry.id === pack.setId);
                  return (
                    <div key={pack.id} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                      <div>
                        <p className="font-bold">{set?.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-widest text-zinc-400">
                          {pack.count} packs {pack.purchasePrice ? `• $${pack.purchasePrice.toFixed(2)} each` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removePack(pack.id)}
                        className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                  No sealed product added yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-orange-500">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Already Opened Packs</h3>
            </div>
            <p className="mt-2 text-zinc-500">Log previous openings without adding them to your sealed stash. This updates your history and dashboard totals.</p>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <select
                value={openedPack.setId}
                onChange={(e) => setOpenedPack({ ...openedPack, setId: e.target.value })}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {POKEMON_SETS.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={openedPack.count}
                  onChange={(e) => setOpenedPack({ ...openedPack, count: Math.max(1, Number(e.target.value) || 1) })}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="Opened pack count"
                />
                <input
                  type="date"
                  value={openedPack.date}
                  onChange={(e) => setOpenedPack({ ...openedPack, date: e.target.value })}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAddOpenedPackAndLog}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 p-4 font-bold text-white transition hover:bg-orange-600"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Add and Log Cards</span>
                </button>
                <button
                  onClick={handleAddOpenedPack}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <CalendarClock className="h-5 w-5" />
                  <span>Add Without Cards</span>
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-orange-500">
              <Wallet className="h-5 w-5" />
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Budget Guardrails</h3>
            </div>
            <p className="mt-2 text-zinc-500">Use soft limits to keep the schedule aligned with your budget and collecting goals.</p>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Monthly Budget ($)</label>
                <input
                  type="number"
                  min={0}
                  value={preferences.monthlyBudget ?? ''}
                  onChange={(e) => updatePreferences({ monthlyBudget: parseOptionalNumber(e.target.value) })}
                  className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-2xl font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900"
                  placeholder="e.g. 200"
                />
              </div>

              <div className="rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Max Packs per Month</label>
                <input
                  type="number"
                  min={0}
                  value={preferences.maxPacksPerMonth ?? ''}
                  onChange={(e) => updatePreferences({ maxPacksPerMonth: parseOptionalNumber(e.target.value) })}
                  className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-2xl font-bold outline-none transition focus:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900"
                  placeholder="e.g. 40"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-950 p-4 text-white">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Budget</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{preferences.monthlyBudget ? `$${preferences.monthlyBudget}` : 'Not set'}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Pack Cap</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{preferences.maxPacksPerMonth ?? 'Not set'}</p>
              </div>
            </div>
          </section>

        </div>
      </section>
    </div>
  );
};
