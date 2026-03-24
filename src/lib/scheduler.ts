import { addDays, format, isSameDay, startOfDay, getDay, addWeeks } from 'date-fns';
import { OpeningSession, UserPreferences, SealedPack } from '../types';

export function generateSchedule(
  totalPacks: number,
  prefs: UserPreferences,
  existingSessions: OpeningSession[] = []
): OpeningSession[] {
  const sessions: OpeningSession[] = [...existingSessions.filter(s => s.isCompleted)];
  let packsRemaining = totalPacks - sessions.reduce((acc, s) => acc + s.actualPacksOpened, 0);
  
  if (packsRemaining <= 0) return sessions;

  let currentDate = startOfDay(new Date(prefs.startDate));
  const now = startOfDay(new Date());
  if (currentDate < now) currentDate = now;

  // Simple distribution logic:
  // sessionsPerWeek determines which days to open.
  // For simplicity, we'll pick days spread out (e.g., if 2 sessions, Tue/Sat)
  const daysToOpen = getDaysToOpen(prefs.sessionsPerWeek);
  
  let safetyCounter = 0;
  while (packsRemaining > 0 && safetyCounter < 1000) {
    const dayOfWeek = getDay(currentDate);
    
    if (daysToOpen.includes(dayOfWeek)) {
      // Check if we already have a completed session on this day
      const alreadyOpened = sessions.find(s => isSameDay(new Date(s.date), currentDate));
      
      if (!alreadyOpened) {
        const packsThisSession = Math.min(packsRemaining, prefs.packsPerSession);
        sessions.push({
          id: crypto.randomUUID(),
          date: currentDate.toISOString(),
          plannedPacks: packsThisSession,
          actualPacksOpened: 0,
          isCompleted: false,
          pulls: []
        });
        packsRemaining -= packsThisSession;
      }
    }
    
    currentDate = addDays(currentDate, 1);
    safetyCounter++;
  }

  return sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function getDaysToOpen(sessionsPerWeek: number): number[] {
  switch (sessionsPerWeek) {
    case 1: return [6]; // Saturday
    case 2: return [2, 6]; // Tuesday, Saturday
    case 3: return [1, 3, 5]; // Mon, Wed, Fri
    case 4: return [1, 2, 4, 6]; // Mon, Tue, Thu, Sat
    case 5: return [1, 2, 3, 4, 5]; // Weekdays
    case 6: return [1, 2, 3, 4, 5, 6]; // Mon-Sat
    case 7: return [0, 1, 2, 3, 4, 5, 6]; // Every day
    default: return [6];
  }
}

export const POKEMON_SETS = [
  { id: 'sv9', name: 'Journey Together', totalCards: 190, series: 'Scarlet & Violet' },
  { id: 'sv8', name: 'Surging Sparks', totalCards: 252, series: 'Scarlet & Violet' },
  { id: 'sv7', name: 'Stellar Crown', totalCards: 175, series: 'Scarlet & Violet' },
  { id: 'sv6', name: 'Twilight Masquerade', totalCards: 226, series: 'Scarlet & Violet' },
  { id: 'sv5', name: 'Temporal Forces', totalCards: 218, series: 'Scarlet & Violet' },
  { id: 'sv4pt5', name: 'Paldean Fates', totalCards: 245, series: 'Scarlet & Violet' },
  { id: 'sv4', name: 'Paradox Rift', totalCards: 266, series: 'Scarlet & Violet' },
  { id: 'sv3pt5', name: '151', totalCards: 210, series: 'Scarlet & Violet' },
  { id: 'swsh12', name: 'Silver Tempest', totalCards: 245, series: 'Sword & Shield' },
];
