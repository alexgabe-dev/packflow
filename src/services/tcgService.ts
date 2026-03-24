const API_BASE = 'https://api.tcgdex.net/v2/en';

const setCardsCache = new Map<string, TCGCardSummary[]>();
const cardDetailsCache = new Map<string, TCGCard>();
const cardByNumberCache = new Map<string, TCGCard | null>();

const SET_ID_ALIASES: Record<string, string> = {
  sv3pt5: 'sv03.5',
  sv4: 'sv04',
  sv4pt5: 'sv04.5',
  sv5: 'sv05',
  sv6: 'sv06',
  sv7: 'sv07',
  sv8: 'sv08',
  sv9: 'sv09',
  swsh12: 'swsh12',
};

interface TCGDexCardImage {
  small?: string;
  low?: string;
  high?: string;
}

interface TCGDexSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount?: {
    total?: number;
    official?: number;
  };
  serie?: {
    id: string;
    name: string;
  };
}

interface TCGDexCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string | TCGDexCardImage;
}

interface TCGDexSetResponse extends TCGDexSetBrief {
  cards?: TCGDexCardBrief[];
}

interface TCGDexPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
}

interface TCGDexCardResponse {
  id: string;
  localId: string;
  name: string;
  image?: string | TCGDexCardImage;
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number | string;
  types?: string[];
  stage?: string;
  set: TCGDexSetBrief;
  attacks?: Array<{
    name: string;
    damage?: string | number;
    effect?: string;
    cost?: string[];
  }>;
  weaknesses?: Array<{
    type?: string;
    value?: string;
  }>;
  retreat?: number;
  regulationMark?: string;
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
  };
  description?: string;
  dexId?: number[];
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: {
      holofoil?: TCGDexPrice;
      reverseHolofoil?: TCGDexPrice;
      normal?: TCGDexPrice;
    };
  };
  pricing?: {
    low?: number;
    average?: number;
    high?: number;
    updatedAt?: string;
  };
}

export interface TCGCardSummary {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
    total: number;
    images: {
      symbol: string;
      logo: string;
    };
  };
}

export interface TCGCard extends TCGCardSummary {
  supertype: string;
  subtypes: string[];
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
  };
  hp?: string;
  types?: string[];
  rules?: string[];
  attacks?: Array<{
    name: string;
    damage?: string;
    text?: string;
  }>;
  weaknesses?: Array<{
    type?: string;
    value?: string;
  }>;
  retreatCost?: string[];
  convertedRetreatCost?: number;
  artist?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: {
      holofoil?: TCGDexPrice;
      reverseHolofoil?: TCGDexPrice;
      normal?: TCGDexPrice;
    };
  };
}

function normalizeSetId(setId: string): string {
  return SET_ID_ALIASES[setId] ?? setId;
}

function getImageUrls(image?: string | TCGDexCardImage) {
  if (!image) {
    return {
      small: '',
      large: '',
    };
  }

  if (typeof image === 'string') {
    return {
      small: `${image}/low.png`,
      large: `${image}/high.png`,
    };
  }

  return {
    small: image.small ?? image.low ?? image.high ?? '',
    large: image.high ?? image.low ?? image.small ?? '',
  };
}

function mapCard(data: TCGDexCardResponse): TCGCard {
  const images = getImageUrls(data.image);

  return {
    id: data.id,
    name: data.name,
    supertype: data.category ?? 'Pokemon',
    subtypes: data.stage ? [data.stage] : [],
    variants: data.variants,
    hp: data.hp ? String(data.hp) : undefined,
    types: data.types,
    rules: [],
    attacks: data.attacks?.map((attack) => ({
      name: attack.name,
      damage: attack.damage ? String(attack.damage) : undefined,
      text: attack.effect,
    })),
    weaknesses: data.weaknesses,
    retreatCost: data.retreat ? Array.from({ length: data.retreat }, () => 'Colorless') : undefined,
    convertedRetreatCost: data.retreat,
    set: {
      id: data.set.id,
      name: data.set.name,
      series: data.set.serie?.name ?? '',
      total: data.set.cardCount?.total ?? data.set.cardCount?.official ?? 0,
      images: {
        symbol: data.set.symbol ?? '',
        logo: data.set.logo ?? '',
      },
    },
    number: data.localId,
    artist: data.illustrator,
    rarity: data.rarity,
    flavorText: data.description,
    nationalPokedexNumbers: data.dexId,
    images,
    tcgplayer: data.tcgplayer
      ? {
          url: data.tcgplayer.url ?? '',
          updatedAt: data.tcgplayer.updatedAt ?? data.pricing?.updatedAt ?? '',
          prices: data.tcgplayer.prices,
        }
      : undefined,
  };
}

function mapCardSummary(card: TCGDexCardBrief, set: TCGDexSetBrief): TCGCardSummary {
  const images = getImageUrls(card.image);

  return {
    id: card.id,
    name: card.name,
    number: card.localId,
    images,
    rarity: undefined,
    set: {
      id: set.id,
      name: set.name,
      series: set.serie?.name ?? '',
      total: set.cardCount?.total ?? set.cardCount?.official ?? 0,
      images: {
        symbol: set.symbol ?? '',
        logo: set.logo ?? '',
      },
    },
  };
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TCGdex request failed with status ${response.status}`);
  }

  return response.json();
}

export const tcgService = {
  async searchCards(query: string, setId?: string): Promise<TCGCardSummary[]> {
    if (!query.trim()) {
      return [];
    }

    const cards = setId ? await this.getSetCards(setId) : await fetchJson<TCGDexCardResponse[]>('/cards');
    const mappedCards = Array.isArray(cards) && 'number' in (cards[0] ?? {})
      ? cards as TCGCardSummary[]
      : (cards as TCGDexCardResponse[]).map(mapCard);

    const normalizedQuery = query.trim().toLowerCase();
    return mappedCards
      .filter((card) => card.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 20);
  },

  async getCard(cardId: string): Promise<TCGCard | null> {
    if (cardDetailsCache.has(cardId)) {
      return cardDetailsCache.get(cardId) ?? null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const data = await fetchJson<TCGDexCardResponse>(`/cards/${cardId}`, controller.signal);
      const card = mapCard(data);
      cardDetailsCache.set(cardId, card);
      cardByNumberCache.set(`${data.set.id}:${data.localId}`, card);
      return card;
    } catch (error) {
      console.error('Error fetching card details:', error);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async getCardByNumber(setId: string, cardNumber: string): Promise<TCGCard | null> {
    const normalizedSetId = normalizeSetId(setId);
    const normalizedCardNumber = cardNumber.trim();
    const cacheKey = `${normalizedSetId}:${normalizedCardNumber}`;

    if (cardByNumberCache.has(cacheKey)) {
      return cardByNumberCache.get(cacheKey) ?? null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const data = await fetchJson<TCGDexCardResponse>(
        `/sets/${normalizedSetId}/${encodeURIComponent(normalizedCardNumber)}`,
        controller.signal
      );
      const card = mapCard(data);
      cardDetailsCache.set(card.id, card);
      cardByNumberCache.set(cacheKey, card);
      return card;
    } catch (error) {
      console.error('Error fetching card by number:', error);
      cardByNumberCache.set(cacheKey, null);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async getSetCards(setId: string): Promise<TCGCardSummary[]> {
    const normalizedSetId = normalizeSetId(setId);

    if (setCardsCache.has(normalizedSetId)) {
      return setCardsCache.get(normalizedSetId) ?? [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const data = await fetchJson<TCGDexSetResponse>(`/sets/${normalizedSetId}`, controller.signal);
      const cards = (data.cards ?? []).map((card) => mapCardSummary(card, data)).sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
      );

      setCardsCache.set(normalizedSetId, cards);

      return cards;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('TCGdex is taking too long to respond. Please try again in a moment.');
      }

      console.error('Error fetching set cards:', error);
      throw new Error('Failed to load this set from TCGdex.');
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
