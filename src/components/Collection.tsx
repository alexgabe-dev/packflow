import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { POKEMON_SETS } from '../lib/scheduler';
import {
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  CopyMinus,
  Eye,
  Filter,
  Grid,
  Heart,
  Info,
  List,
  Loader2,
  PackageCheck,
  PackageX,
  Search,
  Square,
  Star,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { tcgService, TCGCard, TCGCardSummary } from '../services/tcgService';
import { CardViewer } from './CardViewer';
import { CardFinish } from '../types';

type CollectionStatusFilter = 'all' | 'collected' | 'missing' | 'duplicates' | 'favorites' | 'wanted';
type CollectionSort = 'number' | 'name' | 'collected-first' | 'missing-first';
const COLLECTION_VIEW_STATE_KEY = 'packflow:collection-view';

const SORT_OPTIONS: Array<{ value: CollectionSort; label: string }> = [
  { value: 'number', label: '#'},
  { value: 'name', label: 'A-Z' },
  { value: 'collected-first', label: 'Owned' },
  { value: 'missing-first', label: 'Need' },
];

const STATUS_OPTIONS: Array<{
  id: CollectionStatusFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'collected', label: 'Owned', icon: PackageCheck },
  { id: 'missing', label: 'Missing', icon: PackageX },
  { id: 'duplicates', label: 'Dupes', icon: CopyIcon },
  { id: 'favorites', label: 'Favs', icon: Heart },
  { id: 'wanted', label: 'Wanted', icon: Star },
];

function CopyIcon({ className }: { className?: string }) {
  return <span className={cn('text-xs font-black', className)}>2x</span>;
}

function getCardKey(setId: string, cardNumber: string) {
  return `${setId}:${cardNumber}`;
}

function getCollectionSummary(isCollected: boolean, duplicateCount: number) {
  if (!isCollected) return 'Missing from your collection';
  if (duplicateCount > 0) return `${duplicateCount + 1} copies tracked`;
  return 'Collected in your binder';
}

function getGridOwnedLabel(isCollected: boolean, duplicateCount: number) {
  if (!isCollected) return 'Missing';
  if (duplicateCount > 0) return `${duplicateCount + 1} owned`;
  return 'Collected';
}

export const Collection: React.FC = () => {
  const { sessions, collection, wishlist, toggleWishlistCard, bulkSetWishlistCards, updateCollectionCard, bulkUpdateCollectionCards } = useApp();
  const initialViewState = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        selectedSet: POKEMON_SETS[POKEMON_SETS.length - 1].id,
        view: 'grid' as const,
        searchQuery: '',
        statusFilter: 'all' as CollectionStatusFilter,
        sortBy: 'number' as CollectionSort,
      };
    }

    try {
      const rawState = window.localStorage.getItem(COLLECTION_VIEW_STATE_KEY);
      if (!rawState) {
        return {
          selectedSet: POKEMON_SETS[POKEMON_SETS.length - 1].id,
          view: 'grid' as const,
          searchQuery: '',
          statusFilter: 'all' as CollectionStatusFilter,
          sortBy: 'number' as CollectionSort,
        };
      }

      const parsed = JSON.parse(rawState) as Partial<{
        selectedSet: string;
        view: 'grid' | 'list';
        searchQuery: string;
        statusFilter: CollectionStatusFilter;
        sortBy: CollectionSort;
      }>;

      return {
        selectedSet:
          parsed.selectedSet && POKEMON_SETS.some((set) => set.id === parsed.selectedSet)
            ? parsed.selectedSet
            : POKEMON_SETS[POKEMON_SETS.length - 1].id,
        view: parsed.view === 'list' ? 'list' : 'grid',
        searchQuery: parsed.searchQuery ?? '',
        statusFilter:
          parsed.statusFilter === 'collected' ||
          parsed.statusFilter === 'missing' ||
          parsed.statusFilter === 'duplicates' ||
          parsed.statusFilter === 'favorites' ||
          parsed.statusFilter === 'wanted' ||
          parsed.statusFilter === 'all'
            ? parsed.statusFilter
            : 'all',
        sortBy:
          parsed.sortBy === 'name' ||
          parsed.sortBy === 'collected-first' ||
          parsed.sortBy === 'missing-first' ||
          parsed.sortBy === 'number'
            ? parsed.sortBy
            : 'number',
      };
    } catch {
      return {
        selectedSet: POKEMON_SETS[POKEMON_SETS.length - 1].id,
        view: 'grid' as const,
        searchQuery: '',
        statusFilter: 'all' as CollectionStatusFilter,
        sortBy: 'number' as CollectionSort,
      };
    }
  }, []);
  const [selectedSet, setSelectedSet] = useState(initialViewState.selectedSet);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<'grid' | 'list'>(initialViewState.view);
  const [searchQuery, setSearchQuery] = useState(initialViewState.searchQuery);
  const [statusFilter, setStatusFilter] = useState<CollectionStatusFilter>(initialViewState.statusFilter);
  const [sortBy, setSortBy] = useState<CollectionSort>(initialViewState.sortBy);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [setCards, setSetCards] = useState<TCGCardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingCard, setViewingCard] = useState<TCGCard | null>(null);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const lastSetRef = React.useRef(initialViewState.selectedSet);

  const createViewerCard = (card: TCGCardSummary): TCGCard => ({
    ...card,
    supertype: 'Pokemon',
    subtypes: [],
    variants: {
      normal: true,
    },
    rarity: card.rarity ?? 'Unknown',
    rules: [],
  });

  useEffect(() => {
    const fetchCards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cards = await tcgService.getSetCards(selectedSet);
        setSetCards(cards);
        if (cards.length === 0) {
          setError('No cards found for this set. Please try another set or check your connection.');
        }
      } catch (err: any) {
        console.error('Collection: Error in fetchCards:', err);
        setError(err.message || 'Failed to load card database. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [selectedSet, reloadKey]);

  useEffect(() => {
    window.localStorage.setItem(
      COLLECTION_VIEW_STATE_KEY,
      JSON.stringify({
        selectedSet,
        view,
        searchQuery,
        statusFilter,
        sortBy,
      })
    );
  }, [searchQuery, selectedSet, sortBy, statusFilter, view]);

  useEffect(() => {
    if (lastSetRef.current === selectedSet) return;
    lastSetRef.current = selectedSet;
    setSelectedCardIds([]);
    setShowSelectedOnly(false);
    setSelectionMode(false);
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('number');
  }, [selectedSet]);

  const allPulls = sessions.flatMap((session) => session.pulls);
  const setPulls = allPulls.filter((pull) => pull.setId === selectedSet);
  const currentSet = POKEMON_SETS.find((set) => set.id === selectedSet);
  const hasPullsButNoCards = !!error && setPulls.length > 0 && setCards.length === 0;

  const cardMeta = useMemo(() => {
    return setCards.map((card) => {
      const pulls = setPulls.filter((pull) => pull.cardNumber === card.number);
      const override = collection[getCardKey(selectedSet, card.number)];
      const duplicateCount = Math.max(0, pulls.length - 1);
      const isCollected = override?.collected ?? pulls.length > 0;
      const isFavorite = override?.isFavorite ?? pulls.some((pull) => pull.isFavorite);
      const isWanted = wishlist.includes(getCardKey(selectedSet, card.number));
      const preferredFinish = override?.preferredFinish ?? (pulls.some((pull) => pull.isReverseHolo) ? 'reverse' : 'normal');

      return {
        key: getCardKey(selectedSet, card.number),
        card,
        pulls,
        duplicateCount,
        isCollected,
        isFavorite,
        isWanted,
        preferredFinish: preferredFinish as CardFinish,
      };
    });
  }, [collection, selectedSet, setCards, setPulls, wishlist]);

  const uniquePulls = cardMeta.filter((entry) => entry.isCollected).length;
  const completionPercentage = currentSet ? Math.round((uniquePulls / currentSet.totalCards) * 100) : 0;
  const duplicateCards = cardMeta.filter(({ duplicateCount }) => duplicateCount > 0).length;
  const favoriteCards = cardMeta.filter(({ isFavorite }) => isFavorite).length;
  const wantedCards = cardMeta.filter(({ isWanted }) => isWanted).length;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleCards = cardMeta
    .filter(({ card, isCollected, isFavorite, isWanted, duplicateCount }) => {
      if (normalizedSearch) {
        const matchesText =
          card.name.toLowerCase().includes(normalizedSearch) ||
          card.number.toLowerCase().includes(normalizedSearch);

        if (!matchesText) return false;
      }

      switch (statusFilter) {
        case 'collected':
          return isCollected;
        case 'missing':
          return !isCollected;
        case 'duplicates':
          return duplicateCount > 0;
        case 'favorites':
          return isFavorite;
        case 'wanted':
          return isWanted;
        default:
          return true;
      }
    })
    .filter(({ card }) => !showSelectedOnly || selectedCardIds.includes(card.id))
    .sort((left, right) => {
      if (sortBy === 'name') {
        return left.card.name.localeCompare(right.card.name);
      }

      if (sortBy === 'collected-first' && left.isCollected !== right.isCollected) {
        return left.isCollected ? -1 : 1;
      }

      if (sortBy === 'missing-first' && left.isCollected !== right.isCollected) {
        return left.isCollected ? 1 : -1;
      }

      return left.card.number.localeCompare(right.card.number, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

  const selectedVisibleCount = visibleCards.filter(({ card }) => selectedCardIds.includes(card.id)).length;
  const selectedEntries = cardMeta.filter(({ card }) => selectedCardIds.includes(card.id));
  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'all' || sortBy !== 'number' || showSelectedOnly;

  const openCard = async (card: TCGCardSummary) => {
    setViewingCard(createViewerCard(card));
    setLoadingCardId(card.id);

    try {
      const detailedCard = await tcgService.getCard(card.id);
      if (detailedCard) {
        setViewingCard(detailedCard);
      }
    } catch (loadError) {
      console.error('Collection: Error loading card details:', loadError);
    } finally {
      setLoadingCardId(null);
    }
  };

  const toggleSelection = (cardId: string) => {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('number');
    setShowSelectedOnly(false);
  };

  const runBulkUpdate = (updates: { collected?: boolean; isFavorite?: boolean; preferredFinish?: CardFinish }) => {
    if (selectedEntries.length === 0) return;
    bulkUpdateCollectionCards(selectedEntries.map((entry) => entry.key), updates);
  };

  const handleQuickCollectedToggle = (cardKey: string, isCollected: boolean) => {
    updateCollectionCard(cardKey, { collected: !isCollected });
  };

  const handleQuickFavoriteToggle = (cardKey: string, isFavorite: boolean) => {
    updateCollectionCard(cardKey, { isFavorite: !isFavorite });
  };

  const copyMissingList = async () => {
    const missingCards = visibleCards.filter((entry) => !entry.isCollected);
    if (missingCards.length === 0) {
      toast.message('No missing cards in the current view.');
      return;
    }

    const content = missingCards.map((entry) => `#${entry.card.number} ${entry.card.name}`).join('\n');

    try {
      await navigator.clipboard.writeText(content);
      toast.success(`Copied ${missingCards.length} missing cards.`);
    } catch (error) {
      console.error('Collection: Failed to copy missing list', error);
      toast.error('Could not copy the missing card list.');
    }
  };

  const viewingMeta = viewingCard
    ? cardMeta.find((entry) => entry.card.number === viewingCard.number)
    : null;

  return (
    <div className="space-y-8">
      <header className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,620px)] xl:items-start">
        <div className="space-y-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Collection</h2>
            <p className="mt-2 max-w-2xl text-zinc-500">Browse like a binder, edit like a collection manager.</p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 font-semibold text-orange-600 dark:text-orange-300">
              <PackageCheck className="h-4 w-4" />
              {uniquePulls} owned
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Heart className="h-4 w-4" />
              {favoriteCards} favorites
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Star className="h-4 w-4" />
              {wantedCards} wanted
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <CopyIcon className="text-[10px]" />
              {duplicateCards} dupes
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Eye className="h-4 w-4" />
              {visibleCards.length} visible
            </span>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white/90 p-4 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.45)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cards by name or number"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3.5 pl-11 pr-11 text-sm font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="relative">
                  <select
                    value={selectedSet}
                    onChange={(e) => setSelectedSet(e.target.value)}
                    className="min-w-0 appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 pr-10 font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {POKEMON_SETS.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </div>

                <div className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    onClick={() => setView('grid')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                      view === 'grid' ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
                    )}
                    aria-label="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                      view === 'list' ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
                    )}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-300">
                  <Filter className="h-3.5 w-3.5" />
                  Filters active
                </span>
              )}
              {selectionMode && (
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-300">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Bulk mode
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Completion</p>
          <p className="text-3xl font-bold">{completionPercentage}%</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Owned</p>
          <p className="text-3xl font-bold">
            {uniquePulls} <span className="text-lg text-zinc-400">/ {currentSet?.totalCards}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Dupes</p>
          <p className="text-3xl font-bold">{duplicateCards}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">Favs</p>
          <p className="text-3xl font-bold">{favoriteCards}</p>
        </div>
      </div>

      <section className="rounded-[26px] border border-zinc-200/80 bg-white/70 p-4 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.4)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/65">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => setStatusFilter(option.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                      statusFilter === option.id
                        ? 'border border-orange-400/40 bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-[0_10px_24px_-12px_rgba(249,115,22,0.7)]'
                        : 'border border-zinc-200/80 bg-white/85 text-zinc-600 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CollectionSort)}
                  className="appearance-none rounded-full border border-zinc-200/80 bg-white/85 py-2.5 pl-9 pr-9 text-sm font-semibold text-zinc-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
              <button
                onClick={copyMissingList}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-3.5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <CopyMinus className="h-4 w-4" />
                <span>Copy Missing</span>
              </button>
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-3.5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Undo2 className="h-4 w-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[22px] border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-semibold text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  <Eye className="h-4 w-4" />
                  {visibleCards.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-semibold text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  <ArrowUpDown className="h-4 w-4" />
                  {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
                </span>
                {selectionMode && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1.5 font-semibold text-orange-600 dark:text-orange-300">
                    <CheckSquare className="h-4 w-4" />
                    {selectedCardIds.length} selected
                  </span>
                )}
                {selectionMode && selectedVisibleCount > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-semibold text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    <Sparkles className="h-4 w-4" />
                    {selectedVisibleCount} in view
                  </span>
                )}
                {showSelectedOnly && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1.5 font-semibold text-orange-600 dark:text-orange-300">
                    <Filter className="h-4 w-4" />
                    Selected only
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setSelectionMode((current) => {
                      const next = !current;
                      if (!next) {
                        setShowSelectedOnly(false);
                      }
                      return next;
                    })
                  }
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-bold transition-colors',
                    selectionMode ? 'bg-orange-500 text-white shadow-[0_10px_24px_-12px_rgba(249,115,22,0.7)]' : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  )}
                >
                  {selectionMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span>{selectionMode ? 'Bulk On' : 'Bulk Edit'}</span>
                </button>
                {selectionMode && (
                  <>
                    <button
                      onClick={() => setSelectedCardIds(visibleCards.map(({ card }) => card.id))}
                      disabled={visibleCards.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>Visible</span>
                    </button>
                    <button
                      onClick={() => setSelectedCardIds([])}
                      disabled={selectedCardIds.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear</span>
                    </button>
                    <button
                      onClick={() => setShowSelectedOnly((current) => !current)}
                      disabled={selectedCardIds.length === 0}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                        showSelectedOnly
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-zinc-200/80 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'
                      )}
                    >
                      <Filter className="h-4 w-4" />
                      <span>Selected Only</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectionMode && (
              <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3 md:grid-cols-3 xl:grid-cols-6 dark:border-zinc-800">
                <button
                  onClick={() => runBulkUpdate({ collected: true })}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PackageCheck className="h-4 w-4" />
                  <span>Owned</span>
                </button>
                <button
                  onClick={() => runBulkUpdate({ collected: false })}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  <PackageX className="h-4 w-4" />
                  <span>Missing</span>
                </button>
                <button
                  onClick={() => runBulkUpdate({ isFavorite: true })}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  <span>Fav</span>
                </button>
                <button
                  onClick={() => runBulkUpdate({ isFavorite: false })}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Heart className="h-4 w-4" />
                  <span>Unfav</span>
                </button>
                <button
                  onClick={() => bulkSetWishlistCards(selectedEntries.map((entry) => entry.key), true)}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Star className="h-4 w-4 fill-current" />
                  <span>Track</span>
                </button>
                <button
                  onClick={() => bulkSetWishlistCards(selectedEntries.map((entry) => entry.key), false)}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Star className="h-4 w-4" />
                  <span>Untrack</span>
                </button>
                <button
                  onClick={() => runBulkUpdate({ preferredFinish: 'normal' })}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Star className="h-4 w-4" />
                  <span>Normal</span>
                </button>
                <button
                  onClick={() => runBulkUpdate({ preferredFinish: 'holo' })}
                  disabled={selectedEntries.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Holo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-3xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-800 dark:bg-zinc-950 min-h-[420px]">
        {isLoading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            <p className="font-medium text-zinc-500">Loading set database...</p>
          </div>
        ) : hasPullsButNoCards ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  TCGdex is still warming up for this set. Showing only your pulled cards for now.
                </p>
              </div>
              <button
                onClick={() => setReloadKey((key) => key + 1)}
                className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-amber-600"
              >
                Reload
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
              <Info className="h-8 w-8 text-red-500" />
            </div>
            <p className="max-w-xs font-medium text-zinc-500">{error}</p>
            <button
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-xl bg-zinc-900 px-6 py-2 text-sm font-bold text-white dark:bg-white dark:text-zinc-900"
            >
              Retry
            </button>
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-zinc-200 p-4 dark:bg-zinc-800">
              <Search className="h-7 w-7 text-zinc-500" />
            </div>
            <div>
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Nothing matches this view.</p>
              <p className="mt-1 text-sm text-zinc-500">Try a different filter, search, or selected-only view.</p>
            </div>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-3">
            {visibleCards.map((entry) => {
              const { card, pulls, isCollected, isFavorite, isWanted, duplicateCount, preferredFinish } = entry;
              const isSelected = selectedCardIds.includes(card.id);

              return (
                <button
                  key={card.id}
                  onClick={() => openCard(card)}
                  onKeyDown={(event) => {
                    if (event.key.toLowerCase() === 'c') {
                      event.preventDefault();
                      handleQuickCollectedToggle(entry.key, isCollected);
                    }
                    if (event.key.toLowerCase() === 'f') {
                      event.preventDefault();
                      handleQuickFavoriteToggle(entry.key, isFavorite);
                    }
                    if (event.key.toLowerCase() === 'w') {
                      event.preventDefault();
                      toggleWishlistCard(entry.key);
                    }
                  }}
                  className={cn(
                    'relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-3 text-left transition',
                    isCollected
                      ? 'border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50/60 dark:border-orange-900/40 dark:bg-zinc-900'
                      : 'border-zinc-200 bg-white/70 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/70',
                    isFavorite && 'border-amber-300/80 shadow-[0_0_0_1px_rgba(251,191,36,0.32),0_18px_45px_-24px_rgba(251,191,36,0.65)] dark:border-amber-400/35',
                    isSelected && 'ring-2 ring-orange-500'
                  )}
                >
                  {isFavorite && (
                    <>
                      <div className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-amber-200/50 dark:border-amber-300/20" />
                      <div className="pointer-events-none absolute inset-x-8 top-0 h-16 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.3),transparent_72%)] opacity-80 blur-xl" />
                    </>
                  )}
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <img src={card.images.small} alt={card.name} className={cn('h-full w-full object-cover', !isCollected && 'grayscale opacity-50')} loading="lazy" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{card.name}</p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                        #{card.number}
                      </span>
                      {isFavorite && (
                        <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                          <Heart className="mr-1 h-3 w-3 fill-current" />
                          Fav
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{getCollectionSummary(isCollected, duplicateCount)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={cn('rounded-full px-2 py-1 font-bold', isCollected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')}>
                        {isCollected ? 'Owned' : 'Missing'}
                      </span>
                      {isWanted && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 font-bold text-amber-600">
                          Wanted
                        </span>
                      )}
                      {duplicateCount > 0 && (
                        <span className="rounded-full bg-orange-500/10 px-2 py-1 font-bold text-orange-600">
                          +{duplicateCount} dupes
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-100 px-2 py-1 font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {preferredFinish}
                      </span>
                    </div>
                  </div>

                  {selectionMode ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelection(card.id);
                      }}
                      className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-orange-500 dark:hover:bg-zinc-800"
                    >
                      {isSelected ? <CheckSquare className="h-5 w-5 text-orange-500" /> : <Square className="h-5 w-5 text-zinc-400" />}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleQuickCollectedToggle(entry.key, isCollected);
                        }}
                        className={cn(
                          'rounded-full p-2 transition',
                          isCollected ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                        )}
                        aria-label="Toggle collected"
                      >
                        <PackageCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleQuickFavoriteToggle(entry.key, isFavorite);
                        }}
                        className={cn(
                          'rounded-full p-2 transition',
                          isFavorite ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                        )}
                        aria-label="Toggle favorite"
                      >
                        <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleWishlistCard(entry.key);
                        }}
                        className={cn(
                          'rounded-full p-2 transition',
                          isWanted ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                        )}
                        aria-label="Toggle wishlist"
                      >
                        <Star className={cn('h-4 w-4', isWanted && 'fill-current')} />
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.005 } } }}
            className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9"
          >
            {visibleCards.map((entry) => {
              const { card, pulls, isCollected, isFavorite, isWanted, duplicateCount, preferredFinish } = entry;
              const isSelected = selectedCardIds.includes(card.id);

              return (
                <motion.button
                  key={card.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: { opacity: 1, scale: 1 },
                  }}
                  whileHover={{ scale: 1.03, zIndex: 10 }}
                  onClick={() => openCard(card)}
                  onKeyDown={(event) => {
                    if (event.key.toLowerCase() === 'c') {
                      event.preventDefault();
                      handleQuickCollectedToggle(entry.key, isCollected);
                    }
                    if (event.key.toLowerCase() === 'f') {
                      event.preventDefault();
                      handleQuickFavoriteToggle(entry.key, isFavorite);
                    }
                    if (event.key.toLowerCase() === 'w') {
                      event.preventDefault();
                      toggleWishlistCard(entry.key);
                    }
                  }}
                  className={cn(
                    'group relative aspect-[2.5/3.5] overflow-hidden rounded-2xl border-2 transition-all',
                    isCollected
                      ? 'border-orange-500 bg-white shadow-md shadow-orange-500/10 dark:bg-zinc-900'
                      : 'border-zinc-300 bg-zinc-200/50 opacity-55 grayscale hover:opacity-100 hover:grayscale-0 dark:border-zinc-700 dark:bg-zinc-800/50',
                    isFavorite && 'border-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_18px_40px_-18px_rgba(245,158,11,0.8)]',
                    isSelected && 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950'
                  )}
                >
                  {isFavorite && (
                    <>
                      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(251,191,36,0.22),transparent_24%,transparent_70%,rgba(253,224,71,0.24))]" />
                      <div className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-amber-100/60 mix-blend-screen" />
                      <div className="pointer-events-none absolute -inset-x-6 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(253,224,71,0.45),transparent_64%)] blur-2xl" />
                    </>
                  )}
                  <span className={cn('absolute left-2 top-2 z-20 rounded px-1.5 py-0.5 text-[9px] font-bold text-white', isCollected ? 'bg-orange-500' : 'bg-black/50')}>
                    #{card.number}
                  </span>

                  <img
                    src={card.images.small}
                    alt={card.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />

                  {loadingCardId === card.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}

                  {selectionMode && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelection(card.id);
                      }}
                      className="absolute right-2 top-2 z-20 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                    >
                      {isSelected ? <CheckSquare className="h-4 w-4 text-orange-400" /> : <Square className="h-4 w-4" />}
                    </button>
                  )}

                  {isCollected && isFavorite && (
                    <div className="absolute right-2 top-9 z-20 rounded-full border border-amber-200/60 bg-black/55 p-1.5 shadow-[0_0_20px_rgba(251,191,36,0.35)] backdrop-blur-sm">
                      <Heart className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    </div>
                  )}
                  {isWanted && (
                    <div className="absolute right-2 top-16 z-20 rounded-full border border-orange-200/60 bg-black/55 p-1.5 shadow-[0_0_18px_rgba(249,115,22,0.3)] backdrop-blur-sm">
                      <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                    </div>
                  )}

                  {!selectionMode && (
                    <div className="absolute inset-x-2 top-2 z-20 flex items-center justify-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleQuickCollectedToggle(entry.key, isCollected);
                        }}
                        className={cn(
                          'rounded-full p-1.5 backdrop-blur-sm transition',
                          isCollected ? 'bg-emerald-500 text-white' : 'bg-black/60 text-white'
                        )}
                        aria-label="Toggle collected"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleQuickFavoriteToggle(entry.key, isFavorite);
                        }}
                        className={cn(
                          'rounded-full p-1.5 backdrop-blur-sm transition',
                          isFavorite ? 'bg-amber-400 text-zinc-950' : 'bg-black/60 text-white'
                        )}
                        aria-label="Toggle favorite"
                      >
                        <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleWishlistCard(entry.key);
                        }}
                        className={cn(
                          'rounded-full p-1.5 backdrop-blur-sm transition',
                          isWanted ? 'bg-orange-500 text-white' : 'bg-black/60 text-white'
                        )}
                        aria-label="Toggle wishlist"
                      >
                        <Star className={cn('h-3.5 w-3.5', isWanted && 'fill-current')} />
                      </button>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 text-left opacity-100 transition group-hover:from-black/90">
                    <p className="line-clamp-2 text-xs font-bold uppercase leading-tight text-white">{card.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', isCollected ? 'bg-orange-500 text-white' : 'bg-white/15 text-white')}>
                        {getGridOwnedLabel(isCollected, duplicateCount)}
                      </span>
                      {isWanted && (
                        <span className="rounded-full bg-orange-500/80 px-2 py-0.5 text-[9px] font-bold text-white">
                          Wanted
                        </span>
                      )}
                      {duplicateCount > 0 && (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
                          +{duplicateCount}
                        </span>
                      )}
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
                        {preferredFinish}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {viewingCard && viewingMeta && (
          <CardViewer
            card={viewingCard}
            isCollected={viewingMeta.isCollected}
            isFavorite={viewingMeta.isFavorite}
            preferredFinish={viewingMeta.preferredFinish}
            onToggleCollected={(collected) => updateCollectionCard(viewingMeta.key, { collected })}
            onToggleFavorite={(isFavorite) => updateCollectionCard(viewingMeta.key, { isFavorite })}
            onChangeFinish={(preferredFinish) => updateCollectionCard(viewingMeta.key, { preferredFinish })}
            onClose={() => setViewingCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
