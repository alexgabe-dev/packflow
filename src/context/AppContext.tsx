import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, CollectionCardState, OpeningSession, SealedPack, UserPreferences, UserProfile } from '../types';
import { generateSchedule } from '../lib/scheduler';

interface AppContextType extends AppState {
  isReady: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  addPacks: (pack: SealedPack) => void;
  addHistoricalOpening: (input: { setId: string; count: number; date: string }) => string;
  removePack: (packId: string) => void;
  completeSession: (sessionId: string, actualOpened: number, pulls: any[]) => void;
  toggleWishlistCard: (cardKey: string) => void;
  bulkSetWishlistCards: (cardKeys: string[], tracked: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateCollectionCard: (cardKey: string, updates: Partial<CollectionCardState>) => void;
  bulkUpdateCollectionCards: (cardKeys: string[], updates: Partial<CollectionCardState>) => void;
  clearCollectionData: () => void;
  clearHistoryData: () => void;
  clearStashData: () => void;
  resetAppData: () => void;
  resetSchedule: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_PREFS: UserPreferences = {
  packsPerSession: 2,
  sessionsPerWeek: 2,
  pacing: 'balanced',
  startDate: new Date().toISOString(),
};

const DEFAULT_STATE: AppState = {
  sealedStash: [],
  sessions: [],
  preferences: DEFAULT_PREFS,
  wishlist: [],
  collection: {},
  profile: {
    username: 'Collector',
    avatarId: 'ember-fox',
    avatarUrl: '',
    thumbnailUrl: '',
    tagline: 'Building the binder one session at a time.',
    featuredCardKeys: [],
    comments: [],
  },
};

function buildDefaultState(profileOverrides?: Partial<UserProfile>): AppState {
  return {
    ...DEFAULT_STATE,
    preferences: { ...DEFAULT_PREFS },
    profile: {
      ...DEFAULT_STATE.profile,
      ...profileOverrides,
    },
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);
  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      try {
        const response = await fetch('/api/app-state', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load app state.');
        }

        const data = await response.json();
        if (!cancelled) {
          setState({
            ...DEFAULT_STATE,
            ...data.state,
            preferences: { ...DEFAULT_PREFS, ...data.state.preferences },
            collection: data.state.collection ?? {},
            profile: { ...DEFAULT_STATE.profile, ...(data.state.profile ?? {}) },
          });
          hasLoadedRef.current = true;
          setIsReady(true);
        }
      } catch (error) {
        console.error('AppContext: failed to load remote state', error);
        if (!cancelled) {
          setState(DEFAULT_STATE);
          hasLoadedRef.current = false;
          setIsReady(true);
        }
      }
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current || !isReady) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch('/api/app-state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ state }),
        });
      } catch (error) {
        console.error('AppContext: failed to save remote state', error);
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isReady]);

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    setState((prev) => {
      const updatedPrefs = { ...prev.preferences, ...newPrefs };
      const totalPacks = prev.sealedStash.reduce((acc, pack) => acc + pack.count, 0);
      const updatedSessions = generateSchedule(totalPacks, updatedPrefs, prev.sessions);
      return { ...prev, preferences: updatedPrefs, sessions: updatedSessions };
    });
  };

  const addPacks = (pack: SealedPack) => {
    setState((prev) => {
      const newStash = [...prev.sealedStash, pack];
      const totalPacks = newStash.reduce((acc, entry) => acc + entry.count, 0);
      const updatedSessions = generateSchedule(totalPacks, prev.preferences, prev.sessions);
      return { ...prev, sealedStash: newStash, sessions: updatedSessions };
    });
  };

  const addHistoricalOpening = (input: { setId: string; count: number; date: string }) => {
    const sessionId = crypto.randomUUID();
    setState((prev) => {
      const historicalSession: OpeningSession = {
        id: sessionId,
        setId: input.setId,
        date: new Date(input.date).toISOString(),
        plannedPacks: input.count,
        actualPacksOpened: input.count,
        isCompleted: true,
        pulls: [],
      };

      return {
        ...prev,
        sessions: [...prev.sessions, historicalSession].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      };
    });
    return sessionId;
  };

  const removePack = (packId: string) => {
    setState((prev) => {
      const newStash = prev.sealedStash.filter((pack) => pack.id !== packId);
      const totalPacks = newStash.reduce((acc, pack) => acc + pack.count, 0);
      const updatedSessions = generateSchedule(totalPacks, prev.preferences, prev.sessions);
      return { ...prev, sealedStash: newStash, sessions: updatedSessions };
    });
  };

  const completeSession = (sessionId: string, actualOpened: number, pulls: any[]) => {
    setState((prev) => {
      const updatedSessions = prev.sessions.map((session) =>
        session.id === sessionId ? { ...session, isCompleted: true, actualPacksOpened: actualOpened, pulls } : session
      );

      let remainingToDeduct = actualOpened;
      const newStash = prev.sealedStash
        .map((pack) => {
          if (remainingToDeduct <= 0) return pack;
          const deduct = Math.min(pack.count, remainingToDeduct);
          remainingToDeduct -= deduct;
          return { ...pack, count: pack.count - deduct };
        })
        .filter((pack) => pack.count > 0);

      return { ...prev, sessions: updatedSessions, sealedStash: newStash };
    });
  };

  const updateCollectionCard = (cardKey: string, updates: Partial<CollectionCardState>) => {
    setState((prev) => ({
      ...prev,
      collection: {
        ...prev.collection,
        [cardKey]: {
          ...prev.collection[cardKey],
          ...updates,
        },
      },
    }));
  };

  const toggleWishlistCard = (cardKey: string) => {
    setState((prev) => ({
      ...prev,
      wishlist: prev.wishlist.includes(cardKey)
        ? prev.wishlist.filter((key) => key !== cardKey)
        : [...prev.wishlist, cardKey],
    }));
  };

  const bulkSetWishlistCards = (cardKeys: string[], tracked: boolean) => {
    setState((prev) => {
      const currentWishlist = new Set(prev.wishlist);

      for (const key of cardKeys) {
        if (tracked) {
          currentWishlist.add(key);
        } else {
          currentWishlist.delete(key);
        }
      }

      return {
        ...prev,
        wishlist: Array.from(currentWishlist),
      };
    });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...updates,
      },
    }));
  };

  const bulkUpdateCollectionCards = (cardKeys: string[], updates: Partial<CollectionCardState>) => {
    setState((prev) => {
      const nextCollection = { ...prev.collection };
      for (const key of cardKeys) {
        nextCollection[key] = {
          ...nextCollection[key],
          ...updates,
        };
      }

      return {
        ...prev,
        collection: nextCollection,
      };
    });
  };

  const clearCollectionData = () => {
    setState((prev) => ({
      ...prev,
      collection: {},
      wishlist: [],
      profile: {
        ...prev.profile,
        featuredCardKeys: [],
      },
    }));
  };

  const clearHistoryData = () => {
    setState((prev) => {
      const totalPacks = prev.sealedStash.reduce((acc, pack) => acc + pack.count, 0);
      return {
        ...prev,
        sessions: generateSchedule(totalPacks, prev.preferences, []),
        collection: {},
        wishlist: [],
        profile: {
          ...prev.profile,
          featuredCardKeys: [],
        },
      };
    });
  };

  const clearStashData = () => {
    setState((prev) => ({
      ...prev,
      sealedStash: [],
      sessions: prev.sessions.filter((session) => session.isCompleted),
    }));
  };

  const resetAppData = () => {
    setState((prev) =>
      buildDefaultState({
        username: prev.profile.username,
        avatarId: prev.profile.avatarId,
        avatarUrl: prev.profile.avatarUrl,
        thumbnailUrl: prev.profile.thumbnailUrl,
        tagline: prev.profile.tagline,
        comments: prev.profile.comments ?? [],
      })
    );
  };

  const resetSchedule = () => {
    setState((prev) => {
      const totalPacks = prev.sealedStash.reduce((acc, pack) => acc + pack.count, 0);
      const updatedSessions = generateSchedule(totalPacks, prev.preferences, prev.sessions.filter((session) => session.isCompleted));
      return { ...prev, sessions: updatedSessions };
    });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        isReady,
        updatePreferences,
        addPacks,
        addHistoricalOpening,
        removePack,
        completeSession,
        toggleWishlistCard,
        bulkSetWishlistCards,
        updateProfile,
        updateCollectionCard,
        bulkUpdateCollectionCards,
        clearCollectionData,
        clearHistoryData,
        clearStashData,
        resetAppData,
        resetSchedule,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
