import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { buildProgressionSnapshot } from '../lib/progression';
import { CardFinish, CollectionCardState, ProfileComment } from '../types';
import {
  Award,
  BookHeart,
  Camera,
  Crown,
  Crop,
  Edit3,
  Flame,
  Heart,
  Image,
  ImagePlus,
  MessageSquare,
  MoreHorizontal,
  Package,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Upload,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { tcgService } from '../services/tcgService';
import { POKEMON_SETS } from '../lib/scheduler';
import { format } from 'date-fns';

const ICON_MAP = {
  spark: Sparkles,
  target: Trophy,
  crown: Crown,
  heart: Heart,
  flame: Flame,
  star: Star,
} as const;

const AVATAR_OPTIONS = [
  { id: 'ember-fox', label: 'Ember Fox', gradient: 'from-orange-500 via-amber-400 to-yellow-300', glyph: 'F' },
  { id: 'nova-star', label: 'Nova Star', gradient: 'from-fuchsia-500 via-orange-400 to-amber-300', glyph: 'N' },
  { id: 'mint-wave', label: 'Mint Wave', gradient: 'from-emerald-400 via-teal-400 to-cyan-300', glyph: 'M' },
  { id: 'night-bolt', label: 'Night Bolt', gradient: 'from-zinc-900 via-indigo-500 to-sky-400', glyph: 'B' },
  { id: 'rose-flare', label: 'Rose Flare', gradient: 'from-rose-500 via-orange-400 to-yellow-300', glyph: 'R' },
  { id: 'solar-orbit', label: 'Solar Orbit', gradient: 'from-amber-300 via-orange-500 to-red-500', glyph: 'S' },
] as const;

type ThemeState = {
  shell: string;
  overlay: string;
  panel: string;
  pill: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  text: string;
  subtext: string;
};

const DEFAULT_THEME: ThemeState = {
  shell: 'linear-gradient(180deg, rgba(26,26,31,0.98), rgba(18,18,22,0.94))',
  overlay: 'radial-gradient(circle at top left, rgba(249,115,22,0.24), transparent 24%), radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 28%)',
  panel: 'rgba(255,255,255,0.78)',
  pill: 'rgba(255,255,255,0.86)',
  accent: '#f97316',
  accentSoft: 'rgba(249,115,22,0.16)',
  accentText: '#ffffff',
  text: '#f8fafc',
  subtext: 'rgba(226,232,240,0.78)',
};

function getAvatarOption(avatarId: string) {
  return AVATAR_OPTIONS.find((option) => option.id === avatarId) ?? AVATAR_OPTIONS[0];
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToCss(rgb: [number, number, number], alpha = 1) {
  return `rgba(${clampChannel(rgb[0])}, ${clampChannel(rgb[1])}, ${clampChannel(rgb[2])}, ${alpha})`;
}

function luminance([r, g, b]: [number, number, number]) {
  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

function mixRgb(a: [number, number, number], b: [number, number, number], ratio: number): [number, number, number] {
  return [
    a[0] * (1 - ratio) + b[0] * ratio,
    a[1] * (1 - ratio) + b[1] * ratio,
    a[2] * (1 - ratio) + b[2] * ratio,
  ];
}

function buildAccessibleTheme(base: [number, number, number]): ThemeState {
  const darkBase = mixRgb(base, [12, 14, 20], 0.7);
  const accent = mixRgb(base, [255, 255, 255], 0.12);
  const isLight = luminance(base) > 0.55;
  const text = isLight ? '#111827' : '#f8fafc';
  const subtext = isLight ? 'rgba(31,41,55,0.78)' : 'rgba(226,232,240,0.78)';

  return {
    shell: `linear-gradient(180deg, ${rgbToCss(darkBase, 0.98)}, rgba(18,18,22,0.95))`,
    overlay: `radial-gradient(circle at top left, ${rgbToCss(accent, 0.34)}, transparent 24%), radial-gradient(circle at top right, ${rgbToCss(mixRgb(base, [59, 130, 246], 0.45), 0.2)}, transparent 28%)`,
    panel: isLight ? rgbToCss([255, 255, 255], 0.8) : rgbToCss(mixRgb(base, [17, 24, 39], 0.78), 0.74),
    pill: isLight ? rgbToCss([255, 255, 255], 0.9) : rgbToCss(mixRgb(base, [15, 23, 42], 0.84), 0.86),
    accent: rgbToCss(accent),
    accentSoft: rgbToCss(accent, isLight ? 0.14 : 0.18),
    accentText: luminance(accent) > 0.55 ? '#111827' : '#f8fafc',
    text,
    subtext,
  };
}

function getSetName(setId: string) {
  return POKEMON_SETS.find((set) => set.id === setId)?.name ?? setId.toUpperCase();
}

function getSetCode(setId: string) {
  const set = POKEMON_SETS.find((entry) => entry.id === setId);
  if (!set) return setId.toUpperCase();

  const specialCodes: Record<string, string> = {
    sv9: 'JGT',
    sv8: 'SSP',
    sv7: 'SCR',
    sv6: 'TWM',
    sv5: 'TEF',
    sv4pt5: 'PAF',
    sv4: 'PAR',
    sv3pt5: 'MEW',
    swsh12: 'SIT',
  };

  return specialCodes[setId] ?? set.name.split(/\s+/).map((part) => part[0]?.toUpperCase() ?? '').join('').slice(0, 4);
}

function getFinishLabel(finish: CardFinish) {
  if (finish === 'holo') return 'Holo';
  if (finish === 'reverse') return 'Reverse';
  return 'Normal';
}

async function cropImageToDataUrl(
  src: string,
  options: { zoom: number; offsetX: number; offsetY: number; size?: number }
) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for editing.'));
    img.src = src;
  });

  const size = options.size ?? 720;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create image editor canvas.');

  context.clearRect(0, 0, size, size);

  const baseScale = Math.max(size / image.width, size / image.height);
  const drawWidth = image.width * baseScale * options.zoom;
  const drawHeight = image.height * baseScale * options.zoom;
  const drawX = (size - drawWidth) / 2 + options.offsetX;
  const drawY = (size - drawHeight) / 2 + options.offsetY;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
}

function AvatarArt({
  avatarId,
  avatarUrl,
  thumbnailUrl,
  preferThumbnail = false,
  username,
  className,
}: {
  avatarId: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  preferThumbnail?: boolean;
  username: string;
  className?: string;
}) {
  const activeAvatar = getAvatarOption(avatarId);
  const fallbackGlyph = username.trim().charAt(0).toUpperCase() || activeAvatar.glyph;
  const imageSource = preferThumbnail ? thumbnailUrl || avatarUrl : avatarUrl || thumbnailUrl;

  if (imageSource) {
    return (
      <div className={cn('overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]', className)}>
        <img src={imageSource} alt={username} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center rounded-[28px] bg-gradient-to-br text-white shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]', activeAvatar.gradient, className)}>
      <span className="text-4xl font-black">{fallbackGlyph}</span>
    </div>
  );
}

export const ProfileView: React.FC = () => {
  const { sessions, sealedStash, collection, wishlist, profile, updateProfile } = useApp();
  const { user } = useAuth();
  const snapshot = buildProgressionSnapshot(sessions, collection, wishlist, profile);
  const unlockedAchievements = snapshot.achievements.filter((achievement) => achievement.unlocked);
  const visibleAchievements = snapshot.achievements.map((achievement) =>
    achievement.secret && !achievement.unlocked
      ? { ...achievement, title: 'Secret Achievement', description: 'Hidden until unlocked.' }
      : achievement
  );

  const [resolvedFavoriteCards, setResolvedFavoriteCards] = React.useState<
    Array<{ key: string; name: string; imageUrl?: string; rarity: string; setId: string; number: string; preferredFinish: CardFinish }>
  >([]);

  const favoritePullMap = React.useMemo(() => {
    const entries = new Map<
      string,
      { key: string; name: string; imageUrl?: string; rarity: string; setId: string; number: string; preferredFinish: CardFinish }
    >();

    for (const session of sessions) {
      for (const pull of session.pulls) {
        const key = `${pull.setId}:${pull.cardNumber}`;
        const isFavoriteKey = collection[key]?.isFavorite ?? pull.isFavorite;
        if (!isFavoriteKey) continue;
        if (!entries.has(key)) {
          entries.set(key, {
            key,
            name: pull.name,
            imageUrl: pull.imageUrl,
            rarity: pull.rarity,
            setId: pull.setId,
            number: pull.cardNumber,
            preferredFinish: collection[key]?.preferredFinish ?? (pull.isReverseHolo ? 'reverse' : 'normal'),
          });
        }
      }
    }

    return Array.from(entries.values());
  }, [collection, sessions]);

  React.useEffect(() => {
    let cancelled = false;

    const loadCollectionFavorites = async () => {
      const existingKeys = new Set(favoritePullMap.map((card) => card.key));
      const favoriteKeys = (Object.entries(collection) as Array<[string, CollectionCardState]>)
        .filter(([, value]) => Boolean(value?.isFavorite))
        .map(([key]) => key)
        .filter((key) => !existingKeys.has(key));

      if (favoriteKeys.length === 0) {
        if (!cancelled) setResolvedFavoriteCards([]);
        return;
      }

      const cards = await Promise.all(
        favoriteKeys.map(async (key) => {
          const [setId, number] = key.split(':');
          if (!setId || !number) return null;
          const card = await tcgService.getCardByNumber(setId, number);
          if (!card) return null;
          return {
            key,
            name: card.name,
            imageUrl: card.images.small || card.images.large,
            rarity: card.rarity ?? 'Unknown',
            setId,
            number,
            preferredFinish: collection[key]?.preferredFinish ?? 'normal',
          };
        })
      );

      if (!cancelled) {
        setResolvedFavoriteCards(cards.filter((card): card is NonNullable<typeof card> => Boolean(card)));
      }
    };

    loadCollectionFavorites();

    return () => {
      cancelled = true;
    };
  }, [collection, favoritePullMap]);

  const availableFavoriteCards = React.useMemo(() => {
    const merged = new Map<string, { key: string; name: string; imageUrl?: string; rarity: string; setId: string; number: string; preferredFinish: CardFinish }>();
    for (const card of favoritePullMap) merged.set(card.key, card);
    for (const card of resolvedFavoriteCards) merged.set(card.key, card);
    return Array.from(merged.values());
  }, [favoritePullMap, resolvedFavoriteCards]);

  const featuredCards = React.useMemo(() => {
    const featuredKeys = profile.featuredCardKeys ?? [];
    return featuredKeys
      .map((key) => availableFavoriteCards.find((card) => card.key === key))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));
  }, [availableFavoriteCards, profile.featuredCardKeys]);

  const recentShowcaseCards = React.useMemo(() => {
    return sessions
      .flatMap((session) =>
        session.pulls.map((pull, index) => ({
          key: `${pull.setId}:${pull.cardNumber}:${pull.timestamp}:${index}`,
          name: pull.name,
          imageUrl: pull.imageUrl,
          rarity: pull.rarity,
          setId: pull.setId,
          number: pull.cardNumber,
          preferredFinish: collection[`${pull.setId}:${pull.cardNumber}`]?.preferredFinish ?? (pull.isReverseHolo ? 'reverse' : 'normal' as CardFinish),
          sortValue: pull.timestamp || new Date(session.date).getTime() + index,
        }))
      )
      .sort((a, b) => b.sortValue - a.sortValue)
      .slice(0, 3);
  }, [collection, sessions]);

  const setSpendEntries = React.useMemo(() => {
    const spendMap = new Map<string, number>();

    for (const pack of sealedStash) {
      if (!pack.purchasePrice) continue;
      spendMap.set(pack.setId, (spendMap.get(pack.setId) ?? 0) + pack.purchasePrice * pack.count);
    }

    const showcaseSetIds = Array.from(new Set<string>(recentShowcaseCards.map((card) => card.setId)));
    return showcaseSetIds.map((setId) => ({
      setId,
      code: getSetCode(setId),
      spend: spendMap.get(setId) ?? 0,
    }));
  }, [recentShowcaseCards, sealedStash]);

  const [theme, setTheme] = React.useState<ThemeState>(DEFAULT_THEME);
  const [showAllAchievements, setShowAllAchievements] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [activeFeaturedCard, setActiveFeaturedCard] = React.useState<(typeof featuredCards)[number] | null>(null);
  const [isFeaturedFlipped, setIsFeaturedFlipped] = React.useState(false);
  const [draftUsername, setDraftUsername] = React.useState(profile.username);
  const [draftTagline, setDraftTagline] = React.useState(profile.tagline ?? '');
  const [draftAvatarId, setDraftAvatarId] = React.useState(profile.avatarId);
  const [draftAvatarUrl, setDraftAvatarUrl] = React.useState(profile.avatarUrl ?? '');
  const [draftThumbnailUrl, setDraftThumbnailUrl] = React.useState(profile.thumbnailUrl ?? '');
  const [draggingAvatar, setDraggingAvatar] = React.useState(false);
  const [draftAvatarMeta, setDraftAvatarMeta] = React.useState<{ name: string; sizeLabel: string } | null>(null);
  const [draftThumbnailMeta, setDraftThumbnailMeta] = React.useState<{ name: string; sizeLabel: string } | null>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = React.useState<'avatar' | 'thumbnail'>('avatar');
  const [editorTarget, setEditorTarget] = React.useState<'avatar' | 'thumbnail' | null>(null);
  const [editorSource, setEditorSource] = React.useState('');
  const [editorZoom, setEditorZoom] = React.useState(1);
  const [editorOffsetX, setEditorOffsetX] = React.useState(0);
  const [editorOffsetY, setEditorOffsetY] = React.useState(0);
  const [editorMeta, setEditorMeta] = React.useState<{ name: string; sizeLabel: string } | null>(null);
  const [isApplyingEditor, setIsApplyingEditor] = React.useState(false);
  const [commentMessage, setCommentMessage] = React.useState('');
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const activeAvatar = getAvatarOption(profile.avatarId);
  const activeDraftAvatar = getAvatarOption(draftAvatarId);
  const displayedAchievements = showAllAchievements ? visibleAchievements : visibleAchievements.slice(0, 4);
  const featuredFinishCounts = React.useMemo(
    () => ({
      holo: featuredCards.filter((card) => card.preferredFinish === 'holo').length,
      reverse: featuredCards.filter((card) => card.preferredFinish === 'reverse').length,
      normal: featuredCards.filter((card) => card.preferredFinish === 'normal').length,
    }),
    [featuredCards]
  );
  const showcaseSpendTotal = React.useMemo(
    () => setSpendEntries.reduce((sum, entry) => sum + entry.spend, 0),
    [setSpendEntries]
  );

  React.useEffect(() => {
    setDraftUsername(profile.username);
    setDraftTagline(profile.tagline ?? '');
    setDraftAvatarId(profile.avatarId);
    setDraftAvatarUrl(profile.avatarUrl ?? '');
    setDraftThumbnailUrl(profile.thumbnailUrl ?? '');
    setDraftAvatarMeta(null);
    setDraftThumbnailMeta(null);
  }, [profile.avatarId, profile.avatarUrl, profile.tagline, profile.thumbnailUrl, profile.username]);

  React.useEffect(() => {
    const imageUrl = featuredCards[0]?.imageUrl;
    if (!imageUrl) {
      setTheme(DEFAULT_THEME);
      return;
    }

    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const width = 24;
        const height = 24;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          setTheme(DEFAULT_THEME);
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const { data } = context.getImageData(0, 0, width, height);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }

        if (count > 0) {
          setTheme(buildAccessibleTheme([r / count, g / count, b / count]));
        }
      } catch {
        setTheme(DEFAULT_THEME);
      }
    };
    image.onerror = () => {
      if (!cancelled) setTheme(DEFAULT_THEME);
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [featuredCards]);

  const saveIdentity = () => {
    const normalizedUsername = draftUsername.trim();
    updateProfile({
      username: normalizedUsername.length >= 3 ? normalizedUsername : profile.username,
      tagline: draftTagline.trim() || 'Building the binder one session at a time.',
      avatarId: draftAvatarId,
      avatarUrl: draftAvatarUrl,
      thumbnailUrl: draftThumbnailUrl,
    });
    setIsSettingsOpen(false);
  };

  const postComment = () => {
    const message = commentMessage.trim();
    if (!message || !user) return;

    if (editingCommentId) {
      updateProfile({
        comments: (profile.comments ?? []).map((comment) =>
          comment.id === editingCommentId ? { ...comment, message } : comment
        ),
      });
      setCommentMessage('');
      setEditingCommentId(null);
      setActiveCommentMenuId(null);
      return;
    }

    const nextComment: ProfileComment = {
      id: crypto.randomUUID(),
      author: profile.username,
      message,
      createdAt: new Date().toISOString(),
      authorAvatarId: profile.avatarId,
      authorAvatarUrl: profile.avatarUrl,
    };

    updateProfile({
      comments: [nextComment, ...(profile.comments ?? [])].slice(0, 24),
    });
    setCommentMessage('');
  };

  const startEditingComment = (comment: ProfileComment) => {
    setEditingCommentId(comment.id);
    setCommentMessage(comment.message);
    setActiveCommentMenuId(null);
  };

  const removeComment = (commentId: string) => {
    updateProfile({
      comments: (profile.comments ?? []).filter((comment) => comment.id !== commentId),
    });

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setCommentMessage('');
    }

    setActiveCommentMenuId(null);
  };

  const openEditorForFile = (file: File, target: 'avatar' | 'thumbnail') => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setEditorTarget(target);
        setEditorSource(result);
        setEditorZoom(1);
        setEditorOffsetX(0);
        setEditorOffsetY(0);
        setEditorMeta({
          name: file.name,
          sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    openEditorForFile(file, pendingUploadTarget);
    event.target.value = '';
  };

  const applyEditorCrop = async () => {
    if (!editorSource || !editorTarget) return;

    setIsApplyingEditor(true);
    try {
      const croppedImage = await cropImageToDataUrl(editorSource, {
        zoom: editorZoom,
        offsetX: editorOffsetX,
        offsetY: editorOffsetY,
        size: editorTarget === 'avatar' ? 1024 : 512,
      });

      if (editorTarget === 'avatar') {
        setDraftAvatarUrl(croppedImage);
        setDraftAvatarMeta(editorMeta);
      } else {
        setDraftThumbnailUrl(croppedImage);
        setDraftThumbnailMeta(editorMeta);
      }

      setEditorTarget(null);
      setEditorSource('');
      setEditorMeta(null);
    } finally {
      setIsApplyingEditor(false);
    }
  };

  const toggleFeaturedCard = (cardKey: string) => {
    const current = profile.featuredCardKeys ?? [];
    const next = current.includes(cardKey)
      ? current.filter((key) => key !== cardKey)
      : [...current, cardKey].slice(0, 3);
    updateProfile({ featuredCardKeys: next });
  };

  const closeFeaturedViewer = () => {
    setActiveFeaturedCard(null);
    setIsFeaturedFlipped(false);
    resetFeaturedTilt();
  };

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tiltXSpring = useSpring(tiltX, { stiffness: 180, damping: 22, mass: 0.5 });
  const tiltYSpring = useSpring(tiltY, { stiffness: 180, damping: 22, mass: 0.5 });
  const rotateX = useTransform(tiltYSpring, [-0.5, 0.5], ['16deg', '-16deg']);
  const rotateY = useTransform(tiltXSpring, [-0.5, 0.5], ['-18deg', '18deg']);
  const glareX = useTransform(tiltXSpring, [-0.5, 0.5], ['12%', '88%']);
  const glareY = useTransform(tiltYSpring, [-0.5, 0.5], ['10%', '90%']);
  const sheenOpacity = useTransform(tiltXSpring, [-0.5, 0, 0.5], [0.18, 0.28, 0.18]);
  const holoSheenOpacity = useTransform(tiltXSpring, [-0.5, 0, 0.5], [0.16, 0.3, 0.18]);
  const reverseSheenOpacity = useTransform(tiltYSpring, [-0.5, 0, 0.5], [0.16, 0.26, 0.18]);
  const floatX = useTransform(tiltXSpring, [-0.5, 0.5], ['-10px', '10px']);
  const floatY = useTransform(tiltYSpring, [-0.5, 0.5], ['-12px', '12px']);
  const foilSheen = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.42), rgba(255,255,255,0.12) 14%, rgba(255,255,255,0.02) 32%, transparent 48%), linear-gradient(125deg, rgba(255,255,255,0.02), rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.02) 62%, rgba(255,255,255,0.08))`;
  const flipProgress = useSpring(0, { stiffness: 220, damping: 24, mass: 0.9 });
  const flipRotate = useMotionTemplate`${flipProgress}deg`;
  const flipScale = useTransform(flipProgress, [0, 90, 180], [1, 1.025, 1]);
  const flipLift = useTransform(flipProgress, [0, 90, 180], [0, -4, 0]);
  const frontOpacity = useTransform(flipProgress, [0, 70, 90], [1, 0.9, 0]);
  const backOpacity = useTransform(flipProgress, [90, 110, 180], [0, 0.9, 1]);
  const edgeFlashOpacity = useTransform(flipProgress, [0, 70, 90, 110, 180], [0, 0, 0.9, 0, 0]);
  const edgeFlashScale = useTransform(flipProgress, [0, 70, 90, 110, 180], [0.55, 0.75, 1, 0.75, 0.55]);

  React.useEffect(() => {
    flipProgress.set(isFeaturedFlipped ? 180 : 0);
  }, [flipProgress, isFeaturedFlipped]);

  const handleFeaturedMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltX.set(x);
    tiltY.set(y);
  };

  const resetFeaturedTilt = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-[32px] border border-zinc-200 shadow-[0_22px_60px_-36px_rgba(0,0,0,0.5)] dark:border-zinc-800"
        style={{ background: theme.shell }}
      >
        {profile.thumbnailUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-28"
            style={{ backgroundImage: `url(${profile.thumbnailUrl})` }}
          />
        )}
        <div className="absolute inset-0" style={{ background: theme.overlay }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_38%,rgba(0,0,0,0.12),transparent_28%),linear-gradient(90deg,rgba(6,6,10,0.54)_0%,rgba(6,6,10,0.3)_34%,rgba(6,6,10,0.56)_100%),linear-gradient(180deg,rgba(6,6,10,0.2)_0%,rgba(6,6,10,0.42)_58%,rgba(6,6,10,0.74)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.28))]" />

        <div className="relative p-8">
          <div className="flex justify-end">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center justify-center rounded-full border p-3 text-sm font-semibold shadow-sm backdrop-blur transition"
              style={{ background: theme.panel, color: theme.text, borderColor: 'rgba(255,255,255,0.18)' }}
              aria-label="Open profile settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid gap-8 xl:grid-cols-[auto_minmax(0,1fr)_320px] xl:items-end">
            <div className="space-y-4">
              <AvatarArt
                avatarId={profile.avatarId}
                avatarUrl={profile.avatarUrl}
                username={profile.username}
                className="h-36 w-36"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]" style={{ background: 'rgba(249,115,22,0.12)', color: theme.accent }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Collector Profile
              </div>
              <h2 className="mt-5 text-4xl font-black tracking-tight" style={{ color: theme.text }}>{profile.username}</h2>
              <p className="mt-3 max-w-2xl" style={{ color: theme.subtext }}>{profile.tagline || 'Building the binder one session at a time.'}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[snapshot.collectorType, `${snapshot.totalPacksOpened} packs opened`, `${unlockedAchievements.length} badges unlocked`].map((label) => (
                  <span key={label} className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: theme.pill, color: theme.text }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-3xl p-5 text-white" style={{ background: 'rgba(7,10,16,0.74)' }}>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">Momentum</p>
                <div className="mt-4 flex items-center gap-3">
                  <Flame className="h-7 w-7 text-orange-400" />
                  <p className="text-4xl font-black">{snapshot.streak}</p>
                </div>
                <p className="mt-2 text-sm text-zinc-400">Current rhythm streak</p>
              </div>
              <div className="rounded-3xl p-5 shadow-sm backdrop-blur" style={{ background: theme.panel, color: theme.text }}>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Top Set</p>
                <p className="mt-4 text-2xl font-black">{snapshot.setUsage[0]?.setName ?? 'None yet'}</p>
                <p className="mt-2 text-sm" style={{ color: theme.subtext }}>Most-opened set in your run.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ['Wishlist', String(snapshot.totalWishlist), 'Chase cards currently tracked.'],
          ['Favorites', String(snapshot.favoriteCount), 'Cards marked worth revisiting.'],
          ['Cards Logged', String(snapshot.totalCardsLogged), 'Pulled cards in session history.'],
          ['Unlocked', String(unlockedAchievements.length), 'Visible and secret badges earned.'],
        ].map(([title, value, desc]) => (
          <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-1 text-xs uppercase tracking-widest text-zinc-400">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="mt-2 text-sm text-zinc-500">{desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section
          className="rounded-3xl border border-zinc-200 p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800"
          style={{ background: theme.panel }}
        >
          <div className="flex items-center gap-2" style={{ color: theme.text }}>
            <Star className="h-5 w-5" />
            <h3 className="text-lg font-bold">Featured Cards</h3>
          </div>
          <p className="mt-2 text-sm" style={{ color: theme.subtext }}>
            Pick up to 3 favorite cards in profile settings. The first one also drives the profile theme.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {featuredCards.length > 0 ? (
              featuredCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => {
                    setActiveFeaturedCard(card);
                    setIsFeaturedFlipped(false);
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 text-left backdrop-blur transition hover:-translate-y-1 hover:border-white/20",
                    card.preferredFinish === 'holo' && 'border-amber-300/35 shadow-[0_16px_40px_-24px_rgba(250,204,21,0.5)]',
                    card.preferredFinish === 'reverse' && 'border-slate-200/35 shadow-[0_16px_40px_-24px_rgba(226,232,240,0.35)]'
                  )}
                >
                  {card.preferredFinish !== 'normal' && (
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1',
                        card.preferredFinish === 'holo'
                          ? 'ring-amber-200/70 shadow-[inset_0_0_0_1px_rgba(253,224,71,0.28),0_0_34px_rgba(250,204,21,0.18)]'
                          : 'ring-slate-100/75 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24),0_0_28px_rgba(226,232,240,0.15)]'
                      )}
                    />
                  )}
                  {card.imageUrl ? (
                    <div className="relative">
                      <img src={card.imageUrl} alt={card.name} className="h-56 w-full object-cover" />
                      {card.preferredFinish === 'holo' && (
                        <>
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.46),transparent_11%),radial-gradient(circle_at_76%_24%,rgba(253,224,71,0.4),transparent_13%),radial-gradient(circle_at_54%_76%,rgba(96,165,250,0.34),transparent_16%),radial-gradient(circle_at_32%_62%,rgba(244,114,182,0.28),transparent_15%)] opacity-90" />
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_16%,rgba(253,224,71,0.34)_34%,rgba(244,114,182,0.28)_48%,rgba(96,165,250,0.32)_62%,rgba(45,212,191,0.24)_76%,rgba(255,255,255,0.1)_92%)] opacity-90 mix-blend-screen" />
                        </>
                      )}
                      {card.preferredFinish === 'reverse' && (
                        <>
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.46)_18%,rgba(226,232,240,0.14)_34%,rgba(255,255,255,0.34)_52%,rgba(226,232,240,0.12)_68%,rgba(255,255,255,0.42)_84%,rgba(255,255,255,0)_100%)] opacity-85 mix-blend-screen" />
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.03)_24%,rgba(255,255,255,0)_44%,rgba(255,255,255,0.08)_68%,rgba(255,255,255,0.2)_100%)] opacity-75 mix-blend-screen" />
                        </>
                      )}
                      {card.preferredFinish !== 'normal' && (
                        <>
                          <div
                            className={cn(
                              'pointer-events-none absolute inset-0 mix-blend-screen',
                              card.preferredFinish === 'holo'
                                ? 'bg-[linear-gradient(118deg,rgba(255,255,255,0.06)_0%,rgba(253,224,71,0.22)_28%,rgba(244,114,182,0.18)_46%,rgba(96,165,250,0.2)_64%,rgba(45,212,191,0.18)_82%,rgba(255,255,255,0.05)_100%)] opacity-85'
                                : 'bg-[linear-gradient(110deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.18)_24%,rgba(226,232,240,0.26)_50%,rgba(255,255,255,0.12)_76%,rgba(255,255,255,0.06)_100%)] opacity-78'
                            )}
                          />
                          <div
                            className={cn(
                              'pointer-events-none absolute inset-0',
                              card.preferredFinish === 'holo'
                                ? 'bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.34),transparent_12%),radial-gradient(circle_at_72%_26%,rgba(253,224,71,0.28),transparent_14%),radial-gradient(circle_at_46%_74%,rgba(96,165,250,0.22),transparent_16%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.1)_46%,transparent_60%)] mix-blend-screen opacity-82'
                                : 'bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.22)_24%,rgba(255,255,255,0.04)_44%,rgba(226,232,240,0.24)_58%,rgba(255,255,255,0.06)_78%,rgba(255,255,255,0)_100%)] mix-blend-screen opacity-82'
                            )}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-black/20 text-sm font-semibold text-white/70">{card.name}</div>
                  )}
                  <div className="p-4 text-white">
                    <p className="font-bold">{card.name}</p>
                    <p className="mt-1 text-sm text-white/70">
                      {getSetCode(card.setId)} · #{card.number}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">
                      {card.rarity}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-700">
                No featured cards yet. Mark cards as favorite in collection, then pin them from profile settings.
              </div>
            )}
          </div>
          {featuredCards.length > 0 && (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.28))]" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Showcase Deck</p>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/70">
                    <Star className="h-3.5 w-3.5" />
                    {featuredCards.length}/3
                  </div>
                </div>
                <div className="relative mt-5 h-36">
                  {recentShowcaseCards.map((card, index) => (
                    <div
                      key={`${card.key}-mini`}
                      className="absolute top-0 w-28 overflow-hidden rounded-2xl border border-white/12 bg-zinc-950 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]"
                      style={{
                        left: `${index * 22}%`,
                        transform: `rotate(${index === 0 ? -8 : index === 1 ? 0 : 8}deg) translateY(${index === 1 ? '-6px' : '10px'})`,
                        zIndex: index + 1,
                      }}
                    >
                      {card.imageUrl ? (
                        <div className="relative h-36">
                          <img src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" />
                          <div
                            className={cn(
                              'absolute inset-0',
                              card.preferredFinish === 'holo'
                                ? 'bg-[linear-gradient(125deg,rgba(255,255,255,0.04),rgba(253,224,71,0.22)_34%,rgba(244,114,182,0.18)_54%,rgba(96,165,250,0.2)_72%,rgba(255,255,255,0.04))] mix-blend-screen opacity-85'
                                : card.preferredFinish === 'reverse'
                                  ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.3)_22%,rgba(226,232,240,0.12)_46%,rgba(255,255,255,0.26)_72%,rgba(255,255,255,0)_100%)] mix-blend-screen opacity-80'
                                  : ''
                            )}
                          />
                        </div>
                      ) : (
                        <div className="flex h-36 items-center justify-center text-sm font-bold text-white/70">{card.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid h-full gap-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Star, value: featuredCards.length, tone: 'text-white' },
                    { icon: Sparkles, value: featuredFinishCounts.holo + featuredFinishCounts.reverse, tone: 'text-amber-200' },
                    { icon: Heart, value: snapshot.favoriteCount, tone: 'text-rose-200' },
                  ].map(({ icon: Icon, value, tone }, index) => (
                    <div key={index} className="flex h-24 min-w-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                      <Icon className={cn('h-5 w-5', tone)} />
                      <p className="mt-3 text-2xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-1 flex-col justify-center rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Total Spend</p>
                  <div className="mt-3 flex items-end gap-2 text-white">
                    <span className="text-xl font-black text-white/70">$</span>
                    <span className="text-4xl font-black leading-none tabular-nums">{showcaseSpendTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/80">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Comments</p>
                  <p className="mt-1 text-sm text-white/50">{(profile.comments ?? []).length} on the wall</p>
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                Showcase Wall
              </div>
            </div>

            <div className="border-b border-white/8 bg-black/12 px-5 py-4">
              <div className="flex gap-3">
                <AvatarArt
                  avatarId={profile.avatarId}
                  avatarUrl={profile.avatarUrl}
                  username={profile.username}
                  className="h-12 w-12 rounded-[18px] shrink-0"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white/55">
                    <span className="font-semibold text-white/80">{profile.username}</span>
                    <span className="text-white/25">•</span>
                    <span>{editingCommentId ? 'Editing your comment' : 'Leave a note on the wall'}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <textarea
                      value={commentMessage}
                      onChange={(event) => setCommentMessage(event.target.value)}
                      placeholder={editingCommentId ? 'Update your comment...' : 'Write on the wall...'}
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-white/30 focus:border-white/20"
                    />
                    <div className="flex gap-2">
                      {editingCommentId && (
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setCommentMessage('');
                          }}
                          className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/75 transition hover:bg-black/35"
                          aria-label="Cancel editing comment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={postComment}
                        className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/90 text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!user || !commentMessage.trim()}
                        aria-label={editingCommentId ? 'Save comment' : 'Post comment'}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              {(profile.comments ?? []).length > 0 ? (
                (profile.comments ?? []).map((comment) => (
                  <div key={comment.id} className="flex gap-3 rounded-[24px] border border-white/8 bg-black/14 px-4 py-4">
                    <AvatarArt
                      avatarId={comment.author === profile.username ? profile.avatarId : comment.authorAvatarId || 'ember-fox'}
                      avatarUrl={comment.author === profile.username ? profile.avatarUrl : comment.authorAvatarUrl}
                      username={comment.author}
                      className="h-11 w-11 shrink-0 rounded-[16px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-bold text-white">{comment.author}</p>
                        <p className="text-sm text-white/40">{format(new Date(comment.createdAt), 'MMM d, yyyy · p')}</p>
                        </div>
                        {comment.author === profile.username && (
                          <div className="relative">
                            <button
                              onClick={() => setActiveCommentMenuId((current) => current === comment.id ? null : comment.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white/60 transition hover:bg-white/10 hover:text-white"
                              aria-label="Comment actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {activeCommentMenuId === comment.id && (
                              <div className="absolute right-0 top-11 z-20 min-w-[140px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-1 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                                <button
                                  onClick={() => startEditingComment(comment)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeComment(comment.id)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-white/78">{comment.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 px-4 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/55">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white/70">No comments yet.</p>
                  <p className="mt-2 text-sm text-white/40">Start the wall with a short note, pull reaction, or profile message.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
              <BookHeart className="h-5 w-5" />
              <h3 className="text-lg font-bold">Collector Identity</h3>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Archetype</p>
                    <p className="mt-3 text-2xl font-bold">{snapshot.archetype.name}</p>
                    <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{snapshot.archetype.tagline}</p>
                  </div>
                  <div
                    className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ background: theme.accentSoft, color: theme.accent }}
                  >
                    {snapshot.archetype.intensity}
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-500">{snapshot.archetype.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {snapshot.archetype.secondary.map((trait) => (
                    <span key={trait} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {snapshot.archetype.statline.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                      <p className="mt-2 font-bold text-zinc-900 dark:text-zinc-100">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {snapshot.archetype.reasons.map((reason) => (
                    <div key={reason} className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Featured Badges</p>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                  {unlockedAchievements.length > 0 ? (
                    unlockedAchievements.slice(0, 6).map((achievement) => {
                      const Icon = ICON_MAP[achievement.icon];
                      return (
                        <div key={achievement.id} className="group relative">
                          <div className="flex aspect-square items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-2xl"
                              style={{ background: theme.accentSoft, color: theme.accent, boxShadow: `0 10px 24px -14px ${theme.accent}` }}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="pointer-events-none absolute bottom-[calc(100%+0.6rem)] left-1/2 z-20 w-52 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-3 text-left opacity-0 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-zinc-800 dark:bg-zinc-950/95">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{achievement.title}</p>
                            <p className="mt-1 text-sm leading-6 text-zinc-500">{achievement.description}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                      No badges unlocked yet. Your first completed session will light this up.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
              <Award className="h-5 w-5" />
              <h3 className="text-lg font-bold">Badge Cabinet</h3>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {displayedAchievements.map((achievement) => {
                const Icon = ICON_MAP[achievement.icon];
                return (
                  <div
                    key={achievement.id}
                    className={cn(
                      'rounded-2xl border p-4 transition',
                      achievement.unlocked
                        ? ''
                        : achievement.secret
                          ? 'border-dashed border-zinc-300 bg-zinc-50/70 dark:border-zinc-700 dark:bg-zinc-950/70'
                          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950'
                    )}
                    style={
                      achievement.unlocked
                        ? { borderColor: theme.accentSoft, background: theme.accentSoft }
                        : undefined
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                          achievement.unlocked
                            ? ''
                            : achievement.secret
                              ? 'bg-zinc-900 text-zinc-200 dark:bg-zinc-800'
                              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'
                        )}
                        style={
                          achievement.unlocked
                            ? { background: theme.accent, color: theme.accentText, boxShadow: `0 10px 24px -14px ${theme.accent}` }
                            : undefined
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{achievement.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {visibleAchievements.length > 4 && (
              <button
                onClick={() => setShowAllAchievements((current) => !current)}
                className="mt-4 text-sm font-medium text-zinc-500 underline-offset-4 transition hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showAllAchievements ? 'Show fewer achievements' : `Show all achievements (${visibleAchievements.length})`}
              </button>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {activeFeaturedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={closeFeaturedViewer}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_22%)]" />
            <button
              onClick={closeFeaturedViewer}
              className="absolute right-6 top-6 z-20 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="relative z-10 flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-center"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-1 items-center justify-center">
                <motion.div
                  onMouseMove={handleFeaturedMove}
                  onMouseLeave={resetFeaturedTilt}
                  style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                  className="relative w-full max-w-[420px] cursor-default [perspective:1200px]"
                >
                  <motion.div className="absolute inset-[-8%] rounded-[36px] blur-3xl" style={{ background: foilSheen, opacity: 0.8 }} />
                  <button
                    type="button"
                    onClick={() => setIsFeaturedFlipped((current) => !current)}
                    className="relative aspect-[2.5/3.5] w-full rounded-[30px] text-left"
                  >
                    <motion.div
                      style={{ rotateY: flipRotate, scale: flipScale, y: flipLift, transformStyle: 'preserve-3d' }}
                      className="relative h-full w-full"
                    >
                      <motion.div
                        style={{ opacity: edgeFlashOpacity, scaleX: edgeFlashScale }}
                        className="pointer-events-none absolute inset-y-[5%] left-1/2 z-20 w-3 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.9),rgba(255,255,255,0.05))] shadow-[0_0_30px_rgba(255,255,255,0.45)]"
                      />

                      <motion.div
                        style={{ opacity: frontOpacity, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                        className={cn(
                          "absolute inset-0 overflow-hidden rounded-[30px] border border-white/15 bg-zinc-950 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)]",
                          activeFeaturedCard.preferredFinish === 'holo' && 'border-amber-200/45 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(253,224,71,0.2),0_0_34px_rgba(250,204,21,0.16)]',
                          activeFeaturedCard.preferredFinish === 'reverse' && 'border-slate-100/45 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.18),0_0_26px_rgba(226,232,240,0.12)]'
                        )}
                      >
                        {activeFeaturedCard.imageUrl ? (
                          <img
                            src={activeFeaturedCard.imageUrl}
                            alt={activeFeaturedCard.name}
                            className="aspect-[2.5/3.5] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[2.5/3.5] items-center justify-center text-lg font-semibold text-white/70">
                            {activeFeaturedCard.name}
                          </div>
                        )}
                        {activeFeaturedCard.preferredFinish !== 'normal' && (
                          <>
                            {activeFeaturedCard.preferredFinish === 'holo' && (
                              <>
                                <motion.div
                                  className="absolute inset-0"
                                  style={{
                                    x: floatX,
                                    y: floatY,
                                    opacity: 0.95,
                                    background:
                                      'radial-gradient(circle at 18% 16%, rgba(255,255,255,0.48), transparent 10%), radial-gradient(circle at 76% 22%, rgba(253,224,71,0.38), transparent 13%), radial-gradient(circle at 54% 76%, rgba(96,165,250,0.34), transparent 15%), radial-gradient(circle at 34% 58%, rgba(244,114,182,0.26), transparent 14%)',
                                  }}
                                />
                                <motion.div
                                  className="absolute inset-0 mix-blend-screen"
                                  style={{
                                    opacity: 0.9,
                                    background:
                                      'linear-gradient(118deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 16%, rgba(253,224,71,0.32) 34%, rgba(244,114,182,0.26) 48%, rgba(96,165,250,0.3) 62%, rgba(45,212,191,0.22) 76%, rgba(255,255,255,0.08) 92%)',
                                  }}
                                />
                              </>
                            )}
                            {activeFeaturedCard.preferredFinish === 'reverse' && (
                              <>
                                <motion.div
                                  className="absolute inset-0 mix-blend-screen"
                                  style={{
                                    x: floatX,
                                    opacity: 0.9,
                                    background:
                                      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 18%, rgba(226,232,240,0.16) 34%, rgba(255,255,255,0.38) 52%, rgba(226,232,240,0.14) 68%, rgba(255,255,255,0.46) 84%, rgba(255,255,255,0) 100%)',
                                  }}
                                />
                                <motion.div
                                  className="absolute inset-0 mix-blend-soft-light"
                                  style={{
                                    opacity: 0.82,
                                    background:
                                      'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 24%, rgba(255,255,255,0) 44%, rgba(255,255,255,0.08) 68%, rgba(255,255,255,0.24) 100%)',
                                  }}
                                />
                              </>
                            )}
                            <motion.div
                              className="absolute inset-0 mix-blend-screen"
                              style={{
                                background:
                                  activeFeaturedCard.preferredFinish === 'reverse'
                                    ? 'linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.18) 24%, rgba(226,232,240,0.26) 50%, rgba(255,255,255,0.12) 76%, rgba(255,255,255,0.06) 100%)'
                                    : foilSheen,
                                opacity: activeFeaturedCard.preferredFinish === 'holo' ? 0.55 : 0.38,
                              }}
                            />
                            {activeFeaturedCard.preferredFinish === 'holo' ? (
                              <>
                                <motion.div
                                  className="absolute inset-0 mix-blend-screen"
                                  style={{
                                    x: floatX,
                                    y: floatY,
                                    opacity: holoSheenOpacity,
                                    background:
                                      'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.32), transparent 12%), radial-gradient(circle at 70% 24%, rgba(253,224,71,0.24), transparent 14%), radial-gradient(circle at 48% 76%, rgba(96,165,250,0.22), transparent 16%)',
                                  }}
                                />
                                <motion.div
                                  className="absolute inset-0 mix-blend-screen"
                                  style={{
                                    opacity: sheenOpacity,
                                    background:
                                      'linear-gradient(128deg, transparent 12%, rgba(255,255,255,0.06) 32%, rgba(253,224,71,0.18) 46%, rgba(244,114,182,0.16) 54%, rgba(96,165,250,0.18) 66%, transparent 84%)',
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <motion.div
                                  className="absolute inset-0 mix-blend-screen"
                                  style={{
                                    x: floatX,
                                    opacity: reverseSheenOpacity,
                                    background:
                                      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.24) 24%, rgba(255,255,255,0.04) 44%, rgba(226,232,240,0.24) 58%, rgba(255,255,255,0.06) 78%, rgba(255,255,255,0) 100%)',
                                  }}
                                />
                                <motion.div
                                  className="absolute inset-0 mix-blend-soft-light"
                                  style={{
                                    opacity: reverseSheenOpacity,
                                    background:
                                      'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 24%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.14) 100%)',
                                  }}
                                />
                              </>
                            )}
                            <div
                              className={cn(
                                'absolute inset-0 mix-blend-screen',
                                activeFeaturedCard.preferredFinish === 'holo'
                                  ? 'bg-[linear-gradient(120deg,transparent_24%,rgba(253,224,71,0.24)_42%,rgba(244,114,182,0.18)_54%,rgba(96,165,250,0.22)_66%,transparent_80%)] opacity-70'
                                  : 'bg-[linear-gradient(120deg,transparent_24%,rgba(255,255,255,0.24)_50%,transparent_76%)] opacity-45'
                              )}
                            />
                          </>
                        )}
                        {activeFeaturedCard.preferredFinish !== 'normal' && (
                          <span
                            className={cn(
                              'absolute left-5 top-5 z-20 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em]',
                              activeFeaturedCard.preferredFinish === 'holo'
                                ? 'bg-amber-300 text-zinc-950 shadow-[0_12px_30px_rgba(253,224,71,0.32)]'
                                : 'bg-slate-100 text-slate-900 shadow-[0_12px_30px_rgba(226,232,240,0.22)]'
                            )}
                          >
                            {getFinishLabel(activeFeaturedCard.preferredFinish)}
                          </span>
                        )}
                      </motion.div>

                      <motion.div
                        style={{
                          rotateY: '180deg',
                          opacity: backOpacity,
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                        className="absolute inset-0 overflow-hidden rounded-[30px] border border-white/15 bg-zinc-950 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)]"
                      >
                        <img
                          src="/assets/pokemon-back.png"
                          alt="Pokemon card back"
                          className="aspect-[2.5/3.5] h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.18)_100%)]" />
                        <motion.div className="absolute inset-0 mix-blend-screen" style={{ background: foilSheen, opacity: 0.25 }} />
                        <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_18%,rgba(255,255,255,0.22)_46%,transparent_72%)] mix-blend-screen opacity-40" />
                      </motion.div>
                    </motion.div>
                  </button>
                </motion.div>
              </div>

              <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/8 p-8 text-white backdrop-blur-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-orange-300">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Featured Favorite
                </div>
                <h3 className="mt-5 text-4xl font-black tracking-tight">{activeFeaturedCard.name}</h3>
                <p className="mt-3 text-lg text-zinc-300">
                  {getSetName(activeFeaturedCard.setId)} · #{activeFeaturedCard.number} · {activeFeaturedCard.rarity}
                </p>
                <div className="mt-4">
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]',
                      activeFeaturedCard.preferredFinish === 'holo'
                        ? 'border-amber-300/35 bg-amber-300/12 text-amber-100'
                        : activeFeaturedCard.preferredFinish === 'reverse'
                          ? 'border-slate-200/35 bg-slate-100/10 text-slate-100'
                          : 'border-white/15 bg-white/8 text-white/70'
                    )}
                  >
                    {getFinishLabel(activeFeaturedCard.preferredFinish)}
                  </span>
                </div>
                <p className="mt-6 max-w-lg text-sm leading-7 text-zinc-400">
                  This card is pinned as part of your profile showcase. Move your mouse across it for depth, then click the card to flip it and reveal the back.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="w-full max-w-5xl rounded-[30px] border border-zinc-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.65)] dark:border-zinc-800 dark:bg-zinc-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Profile Settings</p>
                  <h3 className="mt-2 text-2xl font-black">Tune your showcase.</h3>
                  <p className="mt-2 text-zinc-500">Edit your identity, upload a profile picture, and choose favorite cards to drive the profile theme.</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_32%),linear-gradient(180deg,#fafafa,#f4f4f5)] p-5 shadow-[0_18px_50px_-34px_rgba(0,0,0,0.28)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_32%),linear-gradient(180deg,#111114,#0b0b0d)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Media Studio</p>
                        <h4 className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">Portrait and thumbnail</h4>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                        <Camera className="h-3.5 w-3.5" />
                        {draftThumbnailUrl ? 'Ready' : draftAvatarUrl ? 'Portrait only' : activeDraftAvatar.label}
                      </span>
                    </div>

                    <div className="mt-5 rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.25)] dark:border-white/5 dark:bg-black/25">
                      <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-900 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.35)] dark:border-zinc-700">
                        <div
                          className="relative h-28 bg-cover bg-center"
                          style={{
                            backgroundImage: draftThumbnailUrl ? `url(${draftThumbnailUrl})` : undefined,
                            backgroundColor: draftThumbnailUrl ? undefined : '#2a2b31',
                          }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.48))]" />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <div className="flex items-end gap-3">
                              <AvatarArt
                                avatarId={draftAvatarId}
                                avatarUrl={draftAvatarUrl}
                                username={draftUsername || profile.username}
                                className="h-16 w-16 rounded-[20px]"
                              />
                              <div className="min-w-0 pb-1">
                                <p className="truncate text-lg font-black text-white">{draftUsername || profile.username}</p>
                                <p className="truncate text-sm text-white/70">{draftTagline || profile.tagline}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 bg-white/80 px-4 py-3 dark:bg-zinc-950/80">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Backdrop Preview</p>
                            <p className="mt-1 text-sm text-zinc-500">This image sits behind your profile header.</p>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            <ImagePlus className="h-3.5 w-3.5" />
                            {draftThumbnailUrl ? 'Backdrop ready' : 'Using dark fallback'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <div className="grid gap-4">
                      {[
                        {
                          id: 'avatar' as const,
                          title: 'Profile Portrait',
                          copy: 'Main profile image for the hero and large profile surfaces.',
                          meta: draftAvatarMeta,
                          hasImage: Boolean(draftAvatarUrl),
                          action: 'Upload Portrait',
                          icon: Camera,
                        },
                        {
                          id: 'thumbnail' as const,
                          title: 'Profile Backdrop',
                          copy: 'Header background image for the wide profile banner behind your avatar and name.',
                          meta: draftThumbnailMeta,
                          hasImage: Boolean(draftThumbnailUrl),
                          action: 'Upload Backdrop',
                          icon: Image,
                        },
                      ].map((mediaCard) => {
                        const MediaIcon = mediaCard.icon;
                        return (
                          <div
                            key={mediaCard.id}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDraggingAvatar(true);
                            }}
                            onDragLeave={() => setDraggingAvatar(false)}
                            onDrop={(event) => {
                              event.preventDefault();
                              setDraggingAvatar(false);
                              const file = event.dataTransfer.files?.[0];
                              if (file) openEditorForFile(file, mediaCard.id);
                            }}
                            className={cn(
                              'rounded-[28px] border border-dashed p-4 transition',
                              draggingAvatar
                                ? 'border-orange-400 bg-orange-500/8 shadow-[0_18px_36px_-24px_rgba(249,115,22,0.55)]'
                                : 'border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80'
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                                <MediaIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{mediaCard.title}</p>
                                    <p className="mt-1 text-sm text-zinc-500">{mediaCard.copy}</p>
                                  </div>
                                  {mediaCard.meta && (
                                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                                      {mediaCard.meta.sizeLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      setPendingUploadTarget(mediaCard.id);
                                      fileInputRef.current?.click();
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                                  >
                                    <Upload className="h-4 w-4" />
                                    <span>{mediaCard.action}</span>
                                  </button>
                                  {mediaCard.id === 'thumbnail' && draftAvatarUrl && (
                                    <button
                                      onClick={() => {
                                        setDraftThumbnailUrl(draftAvatarUrl);
                                        setDraftThumbnailMeta(draftAvatarMeta);
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                      <ImagePlus className="h-4 w-4" />
                                      <span>Use Portrait Image</span>
                                    </button>
                                  )}
                                  {mediaCard.hasImage && (
                                    <button
                                      onClick={() => {
                                        if (mediaCard.id === 'avatar') {
                                          setDraftAvatarUrl('');
                                          setDraftAvatarMeta(null);
                                        } else {
                                          setDraftThumbnailUrl('');
                                          setDraftThumbnailMeta(null);
                                        }
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                      <X className="h-4 w-4" />
                                      <span>Clear</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[30px] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Identity</p>
                        <h4 className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">Name and intro</h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                        Live preview on the left
                      </span>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Username</span>
                      <input
                        value={draftUsername}
                        onChange={(event) => setDraftUsername(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-950"
                        minLength={3}
                      />
                    </label>

                    <label className="block xl:col-span-2">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Tagline</span>
                      <textarea
                        value={draftTagline}
                        onChange={(event) => setDraftTagline(event.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </label>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Preset Avatars</p>
                        <h4 className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">Quick fallback styles</h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                        {draftAvatarUrl ? 'Uploaded portrait active' : activeDraftAvatar.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {AVATAR_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setDraftAvatarId(option.id);
                            setDraftAvatarUrl('');
                            setDraftAvatarMeta(null);
                          }}
                          className={cn(
                            'rounded-2xl border p-3 text-left transition',
                            draftAvatarId === option.id && !draftAvatarUrl
                              ? 'border-orange-500 bg-orange-500/10 shadow-[0_12px_24px_-18px_rgba(249,115,22,0.7)]'
                              : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950'
                          )}
                        >
                          <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-black text-white', option.gradient)}>
                            {option.glyph}
                          </div>
                          <p className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">{option.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                      <Star className="h-4 w-4 text-orange-500" />
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Featured Favorite Cards</p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">Choose up to 3 favorite cards. The first selected card sets the page colors.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {availableFavoriteCards.length > 0 ? (
                        availableFavoriteCards.map((card) => {
                          const isSelected = (profile.featuredCardKeys ?? []).includes(card.key);
                          return (
                            <button
                              key={card.key}
                              onClick={() => toggleFeaturedCard(card.key)}
                              className={cn(
                                'overflow-hidden rounded-2xl border text-left transition',
                                isSelected
                                  ? 'border-orange-500 bg-orange-500/10 shadow-[0_12px_24px_-18px_rgba(249,115,22,0.7)]'
                                  : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950'
                              )}
                            >
                              {card.imageUrl ? (
                                <img src={card.imageUrl} alt={card.name} className="h-36 w-full object-cover" />
                              ) : (
                                <div className="flex h-36 items-center justify-center bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                                  {card.name}
                                </div>
                              )}
                              <div className="p-3">
                                <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">{card.name}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  #{card.number} · {card.rarity}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                          Favorite a few cards in collection first, then you can feature them here.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setDraftUsername(profile.username);
                        setDraftTagline(profile.tagline ?? '');
                        setDraftAvatarId(profile.avatarId);
                        setDraftAvatarUrl(profile.avatarUrl ?? '');
                        setDraftThumbnailUrl(profile.thumbnailUrl ?? '');
                        setDraftAvatarMeta(null);
                        setDraftThumbnailMeta(null);
                        setIsSettingsOpen(false);
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button onClick={saveIdentity} className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                      Save Profile
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {editorTarget && editorSource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => {
              if (isApplyingEditor) return;
              setEditorTarget(null);
              setEditorSource('');
              setEditorMeta(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="w-full max-w-4xl rounded-[30px] border border-zinc-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.65)] dark:border-zinc-800 dark:bg-zinc-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Media Editor</p>
                  <h3 className="mt-2 text-2xl font-black">{editorTarget === 'avatar' ? 'Edit profile picture' : 'Edit thumbnail'}</h3>
                  <p className="mt-2 text-zinc-500">Use zoom and crop positioning to create a clean square result before saving it to your profile.</p>
                </div>
                <button
                  onClick={() => {
                    if (isApplyingEditor) return;
                    setEditorTarget(null);
                    setEditorSource('');
                    setEditorMeta(null);
                  }}
                  className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      <Crop className="h-3.5 w-3.5" />
                      Square Crop
                    </div>
                    {editorMeta && <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{editorMeta.name}</span>}
                  </div>
                  <div className="mt-5 flex items-center justify-center">
                    <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-[32px] border border-zinc-200 bg-zinc-900 shadow-[0_30px_60px_-34px_rgba(0,0,0,0.6)] dark:border-zinc-700">
                      <img
                        src={editorSource}
                        alt="Editor preview"
                        className="absolute left-1/2 top-1/2 h-full w-full max-w-none object-cover"
                        style={{
                          transform: `translate(calc(-50% + ${editorOffsetX}px), calc(-50% + ${editorOffsetY}px)) scale(${editorZoom})`,
                          transformOrigin: 'center',
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 border-[14px] border-black/40" />
                      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                      <ZoomIn className="h-4 w-4" />
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Adjustments</p>
                    </div>
                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Zoom</span>
                        <input type="range" min="1" max="2.4" step="0.01" value={editorZoom} onChange={(event) => setEditorZoom(Number(event.target.value))} className="w-full accent-orange-500" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Horizontal</span>
                        <input type="range" min="-180" max="180" step="1" value={editorOffsetX} onChange={(event) => setEditorOffsetX(Number(event.target.value))} className="w-full accent-orange-500" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Vertical</span>
                        <input type="range" min="-180" max="180" step="1" value={editorOffsetY} onChange={(event) => setEditorOffsetY(Number(event.target.value))} className="w-full accent-orange-500" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Quick Reset</p>
                    <button
                      onClick={() => {
                        setEditorZoom(1);
                        setEditorOffsetX(0);
                        setEditorOffsetY(0);
                      }}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <ImagePlus className="h-4 w-4" />
                      <span>Reset Framing</span>
                    </button>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setEditorTarget(null);
                        setEditorSource('');
                        setEditorMeta(null);
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyEditorCrop}
                      disabled={isApplyingEditor}
                      className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900"
                    >
                      {isApplyingEditor ? 'Applying...' : 'Apply Crop'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
