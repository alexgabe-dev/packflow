export type Pacing = 'light' | 'balanced' | 'slow-burn';

export interface PokemonSet {
  id: string;
  name: string;
  totalCards: number;
  series: string;
  logoUrl?: string;
  symbolUrl?: string;
}

export interface CardPull {
  id: string;
  setId: string;
  cardNumber: string;
  name: string;
  rarity: string;
  isReverseHolo: boolean;
  isFavorite: boolean;
  timestamp: number;
  imageUrl?: string;
  marketPrice?: number;
}

export interface OpeningSession {
  id: string;
  date: string; // ISO date
  setId?: string;
  plannedPacks: number;
  actualPacksOpened: number;
  isCompleted: boolean;
  notes?: string;
  pulls: CardPull[];
}

export interface SealedPack {
  id: string;
  setId: string;
  count: number;
  purchasePrice?: number;
  purchaseDate?: string;
  isMainSet: boolean;
}

export interface UserPreferences {
  packsPerSession: number;
  sessionsPerWeek: number;
  pacing: Pacing;
  startDate: string;
  weeklyBudget?: number;
  monthlyBudget?: number;
  maxPacksPerMonth?: number;
}

export type CardFinish = 'normal' | 'reverse' | 'holo';

export interface CollectionCardState {
  collected?: boolean;
  isFavorite?: boolean;
  preferredFinish?: CardFinish;
}

export interface ProfileComment {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  authorAvatarId?: string;
  authorAvatarUrl?: string;
}

export interface UserProfile {
  username: string;
  avatarId: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  tagline?: string;
  featuredCardKeys?: string[];
  comments?: ProfileComment[];
}

export interface AppState {
  sealedStash: SealedPack[];
  sessions: OpeningSession[];
  preferences: UserPreferences;
  wishlist: string[]; // Card IDs or names
  collection: Record<string, CollectionCardState>;
  profile: UserProfile;
}
