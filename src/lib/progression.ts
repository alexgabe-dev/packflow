import { differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import { CollectionCardState, OpeningSession } from '../types';
import { POKEMON_SETS } from './scheduler';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: 'spark' | 'target' | 'crown' | 'heart' | 'flame' | 'star';
  secret?: boolean;
}

export interface ProgressionProfile {
  username?: string;
  avatarId?: string;
  tagline?: string;
  featuredCardKeys?: string[];
}

export interface CollectorArchetype {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: Achievement['icon'];
  score: number;
  intensity: 'Emerging' | 'Established' | 'Locked In' | 'Signature';
  secondary: string[];
  reasons: string[];
  statline: Array<{ label: string; value: string }>;
}

function getSetName(setId?: string) {
  return POKEMON_SETS.find((set) => set.id === setId)?.name ?? 'Mixed Session';
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getArchetypeIntensity(score: number): CollectorArchetype['intensity'] {
  if (score >= 85) return 'Signature';
  if (score >= 68) return 'Locked In';
  if (score >= 48) return 'Established';
  return 'Emerging';
}

export function buildProgressionSnapshot(
  sessions: OpeningSession[],
  collection: Record<string, CollectionCardState>,
  wishlist: string[],
  profile?: ProgressionProfile | null
) {
  const completedSessions = [...sessions]
    .filter((session) => session.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const collectionEntries = Object.values(collection);
  const collectedCount = collectionEntries.filter((entry) => entry.collected).length;
  const favoriteCount = collectionEntries.filter((entry) => entry.isFavorite).length;
  const totalPacksOpened = completedSessions.reduce((sum, session) => sum + session.actualPacksOpened, 0);
  const totalCardsLogged = completedSessions.reduce((sum, session) => sum + session.pulls.length, 0);
  const totalWishlist = wishlist.length;
  const ownedWishlist = wishlist.filter((key) => collection[key]?.collected).length;
  const missingWishlist = totalWishlist - ownedWishlist;

  const rarityBreakdown = completedSessions.reduce<Record<string, number>>((acc, session) => {
    for (const pull of session.pulls) {
      acc[pull.rarity] = (acc[pull.rarity] ?? 0) + 1;
    }
    return acc;
  }, {});

  const setUsage = Object.entries(
    completedSessions.reduce<Record<string, { packs: number; sessions: number }>>((acc, session) => {
      const key = session.setId ?? 'mixed';
      acc[key] ??= { packs: 0, sessions: 0 };
      acc[key].packs += session.actualPacksOpened;
      acc[key].sessions += 1;
      return acc;
    }, {})
  )
    .map(([setId, summary]) => ({
      setId,
      setName: getSetName(setId === 'mixed' ? undefined : setId),
      packs: summary.packs,
      sessions: summary.sessions,
    }))
    .sort((a, b) => b.packs - a.packs);

  const bestSession =
    completedSessions
      .map((session) => ({
        ...session,
        score:
          session.pulls.length * 4 +
          session.pulls.filter((pull) => pull.isFavorite).length * 8 +
          session.pulls.filter((pull) => pull.isReverseHolo).length * 5,
      }))
      .sort((a, b) => b.score - a.score)[0] ?? null;

  const productiveWeeks = Object.entries(
    completedSessions.reduce<Record<string, { packs: number; sessions: number; label: string }>>((acc, session) => {
      const weekStart = startOfWeek(new Date(session.date));
      const key = format(weekStart, 'yyyy-MM-dd');
      acc[key] ??= { packs: 0, sessions: 0, label: format(weekStart, 'MMM d') };
      acc[key].packs += session.actualPacksOpened;
      acc[key].sessions += 1;
      return acc;
    }, {})
  )
    .map(([key, summary]) => ({ key, ...summary }))
    .sort((a, b) => b.packs - a.packs);

  const recentActivityBars = completedSessions.slice(0, 8).reverse().map((session) => ({
    id: session.id,
    label: format(new Date(session.date), 'MMM d'),
    value: session.actualPacksOpened + session.pulls.filter((pull) => pull.isFavorite).length,
  }));

  const streak = completedSessions.reduce((count, session, index, arr) => {
    if (index === 0) return 1;
    const previous = arr[index - 1];
    const diff = Math.abs(differenceInCalendarDays(new Date(previous.date), new Date(session.date)));
    return diff <= 7 && count === index ? count + 1 : count;
  }, 0);

  const profileSeed = (profile?.username ?? 'PF').trim();
  const initials = profileSeed
    .split('@')[0]
    .split(/[.\-_ ]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PF';

  const anyRarePlusPull = completedSessions.some((session) =>
    session.pulls.some((pull) => /rare|ultra|secret|illustration|hyper/i.test(pull.rarity))
  );
  const totalReverseHits = completedSessions.reduce(
    (sum, session) => sum + session.pulls.filter((pull) => pull.isReverseHolo).length,
    0
  );
  const longestSessionPulls = completedSessions.reduce((max, session) => Math.max(max, session.pulls.length), 0);
  const singleSetSessions = setUsage.some((set) => set.sessions >= 5);
  const topSetPacks = setUsage[0]?.packs ?? 0;
  const completedWithFavorites = completedSessions.filter((session) => session.pulls.some((pull) => pull.isFavorite)).length;
  const featuredCount = profile?.featuredCardKeys?.length ?? 0;
  const reverseRate = totalCardsLogged > 0 ? totalReverseHits / totalCardsLogged : 0;
  const topSetShare = totalPacksOpened > 0 ? topSetPacks / totalPacksOpened : 0;
  const wishlistOwnershipRate = totalWishlist > 0 ? ownedWishlist / totalWishlist : 0;
  const favoriteSessionRate = completedSessions.length > 0 ? completedWithFavorites / completedSessions.length : 0;

  const archetypeCandidates: Omit<CollectorArchetype, 'secondary' | 'intensity'>[] = [
    {
      id: 'chase-strategist',
      name: 'Chase Strategist',
      tagline: 'Builds around targets and closes in with intent.',
      description: 'Your collection style is driven by planning, wishlist depth, and turning tracked targets into owned cards.',
      icon: 'target',
      score: clampScore(totalWishlist * 2.4 + ownedWishlist * 4 + wishlistOwnershipRate * 28),
      reasons: [
        `${totalWishlist} wishlist cards tracked`,
        `${ownedWishlist} chase cards already secured`,
        `${Math.round(wishlistOwnershipRate * 100)}% of your wishlist converted`,
      ],
      statline: [
        { label: 'Wanted', value: String(totalWishlist) },
        { label: 'Owned', value: String(ownedWishlist) },
        { label: 'Convert', value: `${Math.round(wishlistOwnershipRate * 100)}%` },
      ],
    },
    {
      id: 'curated-hunter',
      name: 'Curated Hunter',
      tagline: 'Picks favorites with taste, not just volume.',
      description: 'You collect with a spotlight mindset, shaping the run around favorite pulls, showcase picks, and memorable cards.',
      icon: 'heart',
      score: clampScore(favoriteCount * 3 + featuredCount * 9 + favoriteSessionRate * 26),
      reasons: [
        `${favoriteCount} cards marked as favorites`,
        `${featuredCount} profile showcase cards pinned`,
        `${Math.round(favoriteSessionRate * 100)}% of sessions had a favorite hit`,
      ],
      statline: [
        { label: 'Favorites', value: String(favoriteCount) },
        { label: 'Showcase', value: String(featuredCount) },
        { label: 'Fav Sessions', value: `${Math.round(favoriteSessionRate * 100)}%` },
      ],
    },
    {
      id: 'binder-builder',
      name: 'Binder Builder',
      tagline: 'Turns steady logging into visible collection depth.',
      description: 'Your profile leans completion-first, with consistent collecting, card logging, and a clear binder-building momentum.',
      icon: 'crown',
      score: clampScore(collectedCount * 1.1 + totalCardsLogged * 0.2 + completedSessions.length * 1.8),
      reasons: [
        `${collectedCount} tracked cards collected`,
        `${totalCardsLogged} cards logged into history`,
        `${completedSessions.length} completed opening sessions`,
      ],
      statline: [
        { label: 'Collected', value: String(collectedCount) },
        { label: 'Logged', value: String(totalCardsLogged) },
        { label: 'Sessions', value: String(completedSessions.length) },
      ],
    },
    {
      id: 'rhythm-keeper',
      name: 'Rhythm Keeper',
      tagline: 'Wins through consistency and repeatable momentum.',
      description: 'Your collecting style is defined by showing up regularly, maintaining streaks, and building progress week after week.',
      icon: 'flame',
      score: clampScore(streak * 8 + completedSessions.length * 2.2 + (productiveWeeks[0]?.sessions ?? 0) * 6),
      reasons: [
        `${streak}-session rhythm streak active`,
        `${completedSessions.length} sessions completed overall`,
        `${productiveWeeks[0]?.sessions ?? 0} sessions in your hottest week`,
      ],
      statline: [
        { label: 'Streak', value: String(streak) },
        { label: 'Sessions', value: String(completedSessions.length) },
        { label: 'Best Week', value: String(productiveWeeks[0]?.sessions ?? 0) },
      ],
    },
    {
      id: 'set-loyalist',
      name: 'Set Loyalist',
      tagline: 'Keeps circling back to one lane and mastering it.',
      description: 'You tend to concentrate on a core set, building familiarity and depth instead of spreading your effort everywhere.',
      icon: 'star',
      score: clampScore(topSetShare * 100 + topSetPacks * 1.8 + (singleSetSessions ? 16 : 0)),
      reasons: [
        `${Math.round(topSetShare * 100)}% of packs came from your top set`,
        `${topSetPacks} packs opened in ${setUsage[0]?.setName ?? 'your lead set'}`,
        singleSetSessions ? 'Multiple sessions focused on one set' : 'Your openings are still spread across sets',
      ],
      statline: [
        { label: 'Top Set', value: setUsage[0]?.setName ?? 'None' },
        { label: 'Share', value: `${Math.round(topSetShare * 100)}%` },
        { label: 'Packs', value: String(topSetPacks) },
      ],
    },
    {
      id: 'foil-chaser',
      name: 'Foil Chaser',
      tagline: 'Tracks shine, texture, and finish-first hits.',
      description: 'Your run skews toward special finishes, reverse pulls, and the kind of cards that look best in a spotlight.',
      icon: 'spark',
      score: clampScore(totalReverseHits * 4 + reverseRate * 40 + featuredCount * 3),
      reasons: [
        `${totalReverseHits} reverse or special finish hits logged`,
        `${Math.round(reverseRate * 100)}% of logged cards have a foil-style finish`,
        `${featuredCount} showcase slots amplify your finish-heavy style`,
      ],
      statline: [
        { label: 'Foil Hits', value: String(totalReverseHits) },
        { label: 'Finish Rate', value: `${Math.round(reverseRate * 100)}%` },
        { label: 'Showcase', value: String(featuredCount) },
      ],
    },
    {
      id: 'rip-veteran',
      name: 'Rip Veteran',
      tagline: 'Builds identity through volume and opening reps.',
      description: 'You lean into opening momentum, big pack totals, and long-run experience built from ripping often.',
      icon: 'spark',
      score: clampScore(totalPacksOpened * 0.75 + (productiveWeeks[0]?.packs ?? 0) * 3 + longestSessionPulls * 1.5),
      reasons: [
        `${totalPacksOpened} packs opened in total`,
        `${productiveWeeks[0]?.packs ?? 0} packs in your strongest week`,
        `${longestSessionPulls} cards logged in your biggest session`,
      ],
      statline: [
        { label: 'Packs', value: String(totalPacksOpened) },
        { label: 'Peak Week', value: String(productiveWeeks[0]?.packs ?? 0) },
        { label: 'Best Session', value: String(longestSessionPulls) },
      ],
    },
  ];

  const sortedArchetypes = [...archetypeCandidates].sort((a, b) => b.score - a.score);
  const primaryArchetypeBase = sortedArchetypes[0] ?? {
    id: 'rising-collector',
    name: 'Rising Collector',
    tagline: 'Still defining the shape of the run.',
    description: 'Your profile is early, but the signals are starting to show. Keep logging sessions to reveal a stronger collecting identity.',
    icon: 'star' as const,
    score: 20,
    reasons: ['Your run is just getting started', 'A few more sessions will sharpen your profile', 'Favorites, wishlist, and history will define your lane'],
    statline: [
      { label: 'Sessions', value: String(completedSessions.length) },
      { label: 'Collected', value: String(collectedCount) },
      { label: 'Wishlist', value: String(totalWishlist) },
    ],
  };
  const archetype: CollectorArchetype = {
    ...primaryArchetypeBase,
    intensity: getArchetypeIntensity(primaryArchetypeBase.score),
    secondary: sortedArchetypes
      .slice(1)
      .filter((candidate) => candidate.score >= Math.max(26, primaryArchetypeBase.score - 24))
      .slice(0, 3)
      .map((candidate) => candidate.name),
  };
  const collectorType = archetype.name;

  const achievements: Achievement[] = [
    {
      id: 'first-session',
      title: 'First Rip',
      description: 'Complete your first logged opening session.',
      unlocked: completedSessions.length >= 1,
      icon: 'spark',
    },
    {
      id: 'hundred-packs',
      title: 'Century Break',
      description: 'Open 100 packs in total.',
      unlocked: totalPacksOpened >= 100,
      icon: 'crown',
    },
    {
      id: 'first-page',
      title: 'Binder Page',
      description: 'Collect 9 tracked cards.',
      unlocked: collectedCount >= 9,
      icon: 'target',
    },
    {
      id: 'streak-seven',
      title: 'Weekly Rhythm',
      description: 'Keep a 7-session streak alive.',
      unlocked: streak >= 7,
      icon: 'flame',
    },
    {
      id: 'wishlist-builder',
      title: 'Chase Board',
      description: 'Track 10 wishlist cards.',
      unlocked: totalWishlist >= 10,
      icon: 'heart',
    },
    {
      id: 'favorite-finder',
      title: 'Spotlight Shelf',
      description: 'Mark 10 favorite cards.',
      unlocked: favoriteCount >= 10,
      icon: 'star',
    },
    {
      id: 'hidden-night-rip',
      title: 'After Hours',
      description: 'Complete a session after 10 PM local time.',
      unlocked: completedSessions.some((session) => new Date(session.date).getHours() >= 22),
      icon: 'spark',
      secret: true,
    },
    {
      id: 'hidden-perfect-focus',
      title: 'Laser Focus',
      description: 'Finish a session with exactly 1 favorite pull and at least 1 reverse hit.',
      unlocked: completedSessions.some(
        (session) =>
          session.pulls.filter((pull) => pull.isFavorite).length === 1 &&
          session.pulls.some((pull) => pull.isReverseHolo)
      ),
      icon: 'crown',
      secret: true,
    },
    {
      id: 'hidden-master-hunter',
      title: 'Master Hunter',
      description: 'Collect at least 75 cards while tracking 15 wishlist targets.',
      unlocked: collectedCount >= 75 && totalWishlist >= 15,
      icon: 'target',
      secret: true,
    },
    {
      id: 'pack-rookie',
      title: 'Pack Rookie',
      description: 'Open 10 packs in total.',
      unlocked: totalPacksOpened >= 10,
      icon: 'spark',
    },
    {
      id: 'pack-runner',
      title: 'Pack Runner',
      description: 'Open 25 packs in total.',
      unlocked: totalPacksOpened >= 25,
      icon: 'spark',
    },
    {
      id: 'pack-veteran',
      title: 'Pack Veteran',
      description: 'Open 50 packs in total.',
      unlocked: totalPacksOpened >= 50,
      icon: 'crown',
    },
    {
      id: 'double-century',
      title: 'Double Century',
      description: 'Open 200 packs in total.',
      unlocked: totalPacksOpened >= 200,
      icon: 'crown',
    },
    {
      id: 'session-starter',
      title: 'Session Starter',
      description: 'Complete 3 opening sessions.',
      unlocked: completedSessions.length >= 3,
      icon: 'spark',
    },
    {
      id: 'session-regular',
      title: 'Session Regular',
      description: 'Complete 10 opening sessions.',
      unlocked: completedSessions.length >= 10,
      icon: 'flame',
    },
    {
      id: 'session-machine',
      title: 'Session Machine',
      description: 'Complete 25 opening sessions.',
      unlocked: completedSessions.length >= 25,
      icon: 'flame',
    },
    {
      id: 'mini-binder',
      title: 'Mini Binder',
      description: 'Collect 25 tracked cards.',
      unlocked: collectedCount >= 25,
      icon: 'target',
    },
    {
      id: 'binder-stack',
      title: 'Binder Stack',
      description: 'Collect 50 tracked cards.',
      unlocked: collectedCount >= 50,
      icon: 'target',
    },
    {
      id: 'master-shelf',
      title: 'Master Shelf',
      description: 'Collect 100 tracked cards.',
      unlocked: collectedCount >= 100,
      icon: 'crown',
    },
    {
      id: 'wishlist-scout',
      title: 'Wishlist Scout',
      description: 'Track 5 wishlist cards.',
      unlocked: totalWishlist >= 5,
      icon: 'heart',
    },
    {
      id: 'wishlist-deep-dive',
      title: 'Deep Chase',
      description: 'Track 20 wishlist cards.',
      unlocked: totalWishlist >= 20,
      icon: 'heart',
    },
    {
      id: 'wishlist-complete-start',
      title: 'Chase Confirmed',
      description: 'Own 3 cards from your wishlist.',
      unlocked: ownedWishlist >= 3,
      icon: 'star',
    },
    {
      id: 'wishlist-complete-push',
      title: 'Wish Fulfilled',
      description: 'Own 10 cards from your wishlist.',
      unlocked: ownedWishlist >= 10,
      icon: 'star',
    },
    {
      id: 'favorite-scout',
      title: 'Favorite Scout',
      description: 'Mark 3 favorite cards.',
      unlocked: favoriteCount >= 3,
      icon: 'heart',
    },
    {
      id: 'favorite-curator',
      title: 'Curator',
      description: 'Mark 20 favorite cards.',
      unlocked: favoriteCount >= 20,
      icon: 'heart',
    },
    {
      id: 'foil-finder',
      title: 'Foil Finder',
      description: 'Log 5 reverse or special finish hits.',
      unlocked: totalReverseHits >= 5,
      icon: 'star',
    },
    {
      id: 'foil-collector',
      title: 'Foil Collector',
      description: 'Log 20 reverse or special finish hits.',
      unlocked: totalReverseHits >= 20,
      icon: 'star',
    },
    {
      id: 'rare-signal',
      title: 'Rare Signal',
      description: 'Log your first rare-or-better pull.',
      unlocked: anyRarePlusPull,
      icon: 'spark',
    },
    {
      id: 'best-week',
      title: 'Hot Week',
      description: 'Open 10 packs in a single week.',
      unlocked: productiveWeeks.some((week) => week.packs >= 10),
      icon: 'flame',
    },
    {
      id: 'streak-three',
      title: 'Getting Warm',
      description: 'Reach a 3-session rhythm streak.',
      unlocked: streak >= 3,
      icon: 'flame',
    },
    {
      id: 'streak-ten',
      title: 'Locked In',
      description: 'Reach a 10-session rhythm streak.',
      unlocked: streak >= 10,
      icon: 'flame',
    },
    {
      id: 'log-book',
      title: 'Log Book',
      description: 'Log 25 pulled cards.',
      unlocked: totalCardsLogged >= 25,
      icon: 'target',
    },
    {
      id: 'cataloguer',
      title: 'Cataloguer',
      description: 'Log 100 pulled cards.',
      unlocked: totalCardsLogged >= 100,
      icon: 'target',
    },
    {
      id: 'highlight-reel',
      title: 'Highlight Reel',
      description: 'Complete 5 sessions with at least one favorite pull.',
      unlocked: completedWithFavorites >= 5,
      icon: 'star',
    },
    {
      id: 'set-specialist',
      title: 'Set Specialist',
      description: 'Log 5 sessions in the same set.',
      unlocked: singleSetSessions,
      icon: 'crown',
    },
    {
      id: 'set-devotion',
      title: 'Set Devotion',
      description: 'Open 25 packs from a single set.',
      unlocked: topSetPacks >= 25,
      icon: 'crown',
    },
    {
      id: 'mega-session',
      title: 'Mega Session',
      description: 'Log 15 cards in a single session.',
      unlocked: longestSessionPulls >= 15,
      icon: 'spark',
    },
    {
      id: 'hidden-midnight-oil',
      title: 'Midnight Oil',
      description: 'Complete 3 sessions after 10 PM.',
      unlocked: completedSessions.filter((session) => new Date(session.date).getHours() >= 22).length >= 3,
      icon: 'flame',
      secret: true,
    },
    {
      id: 'hidden-wishlist-snipe',
      title: 'Wishlist Snipe',
      description: 'Own half of your tracked wishlist.',
      unlocked: totalWishlist >= 6 && ownedWishlist >= Math.ceil(totalWishlist / 2),
      icon: 'heart',
      secret: true,
    },
    {
      id: 'hidden-clean-sweep',
      title: 'Clean Sweep',
      description: 'Complete a session where every logged pull is a favorite.',
      unlocked: completedSessions.some((session) => session.pulls.length > 0 && session.pulls.every((pull) => pull.isFavorite)),
      icon: 'crown',
      secret: true,
    },
  ];

  return {
    completedSessions,
    collectedCount,
    favoriteCount,
    totalPacksOpened,
    totalCardsLogged,
    totalWishlist,
    ownedWishlist,
    missingWishlist,
    rarityBreakdown,
    setUsage,
    bestSession,
    productiveWeeks,
    recentActivityBars,
    streak,
    initials,
    collectorType,
    archetype,
    achievements,
  };
}
