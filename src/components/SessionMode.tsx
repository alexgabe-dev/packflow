import React from 'react';
import { useApp } from '../context/AppContext';
import { OpeningSession, CardPull } from '../types';
import { POKEMON_SETS } from '../lib/scheduler';
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import { tcgService } from '../services/tcgService';

interface SessionModeProps {
  session: OpeningSession;
  onClose: () => void;
}

const createEmptyPull = (setId: string): Partial<CardPull> => ({
  id: crypto.randomUUID(),
  setId,
  cardNumber: '',
  name: '',
  rarity: 'Common',
  isFavorite: false,
  isReverseHolo: false,
  timestamp: Date.now(),
});

export const SessionMode: React.FC<SessionModeProps> = ({ session, onClose }) => {
  const { completeSession, sealedStash } = useApp();
  const defaultSessionSetId = React.useMemo(() => {
    const preferredPack =
      sealedStash.find((pack) => pack.isMainSet) ??
      [...sealedStash].sort((a, b) => b.count - a.count)[0];

    return preferredPack?.setId ?? POKEMON_SETS[0].id;
  }, [sealedStash]);

  const initialSessionSetId = session.setId ?? defaultSessionSetId;
  const [sessionSetId, setSessionSetId] = React.useState(initialSessionSetId);
  const [openedCount, setOpenedCount] = React.useState(session.isCompleted ? session.actualPacksOpened : session.plannedPacks);
  const [pulls, setPulls] = React.useState<Partial<CardPull>[]>(
    session.pulls.length > 0
      ? session.pulls.map((pull) => ({ ...pull }))
      : [createEmptyPull(initialSessionSetId)]
  );
  const [isFinished, setIsFinished] = React.useState(false);
  const [searchingId, setSearchingId] = React.useState<string | null>(null);

  const addPull = React.useCallback((setId = sessionSetId) => {
    setPulls((current) => [...current, createEmptyPull(setId)]);
  }, [sessionSetId]);

  const updatePull = (id: string, updates: Partial<CardPull>) => {
    setPulls((current) => current.map((pull) => (pull.id === id ? { ...pull, ...updates } : pull)));
  };

  const removePull = (id: string) => {
    setPulls((current) => {
      const next = current.filter((pull) => pull.id !== id);
      return next.length > 0 ? next : [createEmptyPull(sessionSetId)];
    });
  };

  const fetchCardDetails = async (id: string, setId: string, cardNumber: string, shouldAutoAppend = false) => {
    const normalizedNumber = cardNumber.trim();
    if (!normalizedNumber) return;

    setSearchingId(id);
    try {
      const card = await tcgService.getCardByNumber(setId, normalizedNumber);
      if (card) {
        updatePull(id, {
          setId,
          cardNumber: card.number,
          name: card.name,
          rarity: card.rarity || 'Common',
          imageUrl: card.images.small,
          marketPrice: card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market,
        });

        if (shouldAutoAppend) {
          setPulls((current) => {
            const isLast = current[current.length - 1]?.id === id;
            if (!isLast) return current;
            const hasTrailingBlank = current.some(
              (pull) => pull.id !== id && !pull.cardNumber?.trim() && !pull.name?.trim()
            );
            return hasTrailingBlank ? current : [...current, createEmptyPull(setId)];
          });
        }
      }
    } catch (error) {
      console.error('Error fetching card:', error);
    } finally {
      setSearchingId(null);
    }
  };

  const handleNumberSubmit = async (id: string, setId: string, cardNumber: string) => {
    await fetchCardDetails(id, setId, cardNumber, true);
  };

  const handleFinish = () => {
    const completedPulls = pulls
      .filter((pull) => pull.cardNumber?.trim() || pull.name?.trim())
      .map((pull) => ({
        id: pull.id ?? crypto.randomUUID(),
        setId: pull.setId ?? sessionSetId,
        cardNumber: pull.cardNumber?.trim() ?? '',
        name: pull.name?.trim() || 'Unnamed Card',
        rarity: pull.rarity ?? 'Common',
        isReverseHolo: pull.isReverseHolo ?? false,
        isFavorite: pull.isFavorite ?? false,
        timestamp: pull.timestamp ?? Date.now(),
        imageUrl: pull.imageUrl,
        marketPrice: pull.marketPrice,
      }));

    completeSession(session.id, openedCount, completedPulls as CardPull[]);
    setIsFinished(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#fbbf24', '#ffffff'],
    });
  };

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6 dark:bg-zinc-950"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-full max-w-md space-y-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </motion.div>
          <h2 className="text-4xl font-bold">Session Complete!</h2>
          <p className="text-zinc-500">You opened {openedCount} packs and logged {pulls.filter((pull) => pull.cardNumber || pull.name).length} notable pulls.</p>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-zinc-400">Highlights</p>
            <div className="flex flex-wrap justify-center gap-2">
              {pulls.filter((pull) => pull.isFavorite).map((pull, idx) => (
                <motion.span
                  key={pull.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700"
                >
                  <Star className="h-3 w-3 fill-yellow-400" /> {pull.name || 'Unnamed Card'}
                </motion.span>
              ))}
              {pulls.filter((pull) => pull.isFavorite).length === 0 && (
                <span className="text-xs italic text-zinc-400">No favorites this time.</span>
              )}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full rounded-2xl bg-zinc-900 py-4 text-lg font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950"
    >
      <div className="mx-auto max-w-5xl space-y-10 p-6 md:p-12">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="rounded-2xl bg-orange-500 p-3 text-white shadow-lg shadow-orange-500/20"
            >
              <Sparkles className="h-6 w-6" />
            </motion.div>
            <div>
              <h2 className="text-3xl font-bold">Opening Session</h2>
              <p className="text-zinc-500">Quick-log hits without breaking your opening flow.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="mb-4 block text-xs font-bold uppercase tracking-widest text-zinc-400">Session Set</label>
              <div className="relative">
                <select
                  value={sessionSetId}
                  onChange={(e) => setSessionSetId(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 py-4 font-bold outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {POKEMON_SETS.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
              <p className="mt-3 text-sm text-zinc-500">New pulls default to this set, which keeps collection logging consistent.</p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="mb-4 block text-xs font-bold uppercase tracking-widest text-zinc-400">Packs Opened</label>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setOpenedCount(Math.max(1, openedCount - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 font-bold transition-colors hover:bg-zinc-200 dark:border-zinc-700"
                >
                  -
                </button>
                <motion.span
                  key={openedCount}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-bold"
                >
                  {openedCount}
                </motion.span>
                <button
                  onClick={() => setOpenedCount(openedCount + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 font-bold transition-colors hover:bg-zinc-200 dark:border-zinc-700"
                >
                  +
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-zinc-500">Planned: {session.plannedPacks}</p>
            </div>

            <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <Trophy className="h-5 w-5 text-yellow-400" />
                {session.isCompleted ? 'Past Session Editor' : 'Session Goals'}
              </h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Default set stays locked unless you change it.</li>
                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Enter a card number, then we prep the next blank row for you.</li>
                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Favorite your best hit before you finish.</li>
                {session.isCompleted && <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> This updates a past opening instead of creating a new one.</li>}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
              <h3 className="text-xl font-bold">{session.isCompleted ? 'Edit Logged Pulls' : 'Pull Logger'}</h3>
              <p className="text-sm text-zinc-500">
                {session.isCompleted ? 'Add the cards you opened in the past or update what is already logged.' : 'Type a card number, press Enter, and keep going.'}
              </p>
              </div>
              <button
                onClick={() => addPull()}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Add Blank Row
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {pulls.map((pull, index) => {
                  const pullSetId = pull.setId || sessionSetId;

                  return (
                    <motion.div
                      key={pull.id}
                      layout
                      initial={{ opacity: 0, scale: 0.92, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
                      className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 aspect-[2.5/3.5] dark:border-zinc-700 dark:bg-zinc-800">
                          {pull.imageUrl ? (
                            <img src={pull.imageUrl} alt={pull.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Sparkles className="h-6 w-6 text-zinc-300" />
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.3fr]">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-zinc-400">Set</label>
                              <select
                                value={pullSetId}
                                onChange={(e) => updatePull(pull.id!, { setId: e.target.value })}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-bold outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-800"
                              >
                                {POKEMON_SETS.map((set) => (
                                  <option key={set.id} value={set.id}>
                                    {set.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-zinc-400">Card #</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder={`Pull ${index + 1} number`}
                                  value={pull.cardNumber}
                                  onChange={(e) => updatePull(pull.id!, { cardNumber: e.target.value, setId: pullSetId })}
                                  onBlur={() => fetchCardDetails(pull.id!, pullSetId, pull.cardNumber || '')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleNumberSubmit(pull.id!, pullSetId, pull.cardNumber || '');
                                    }
                                  }}
                                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 pr-10 text-base font-bold outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-800"
                                />
                                <button
                                  onClick={() => fetchCardDetails(pull.id!, pullSetId, pull.cardNumber || '', true)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-orange-500 dark:hover:bg-zinc-700"
                                >
                                  {searchingId === pull.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Card Name</label>
                            <input
                              type="text"
                              placeholder="Autofills after lookup, but you can edit it"
                              value={pull.name}
                              onChange={(e) => updatePull(pull.id!, { name: e.target.value, setId: pullSetId })}
                              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-bold outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-800"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updatePull(pull.id!, { isFavorite: !pull.isFavorite })}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors',
                              pull.isFavorite ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                            )}
                          >
                            <Star className={cn('h-4 w-4', pull.isFavorite && 'fill-current')} />
                            <span>Favorite</span>
                          </button>

                          <button
                            onClick={() => updatePull(pull.id!, { isReverseHolo: !pull.isReverseHolo })}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors',
                              pull.isReverseHolo ? 'bg-cyan-100 text-cyan-700' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                            )}
                          >
                            <Sparkles className="h-4 w-4" />
                            <span>Reverse</span>
                          </button>
                        </div>

                        <button
                          onClick={() => removePull(pull.id!)}
                          className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="pb-20 pt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFinish}
            className="w-full rounded-3xl bg-orange-500 py-5 text-xl font-bold text-white shadow-xl shadow-orange-500/20 transition-all hover:bg-orange-600"
          >
            {session.isCompleted ? 'Save Past Opening' : 'Finish & Save Session'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
