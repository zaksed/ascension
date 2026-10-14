/**
 * Série quotidienne. Un jour est « actif » dès qu'au moins une réponse a été donnée.
 * Le gel de série est gratuit et illimité :
 * - gel manuel : un jour marqué `frozen` ne casse pas la série ;
 * - gel automatique (réglage, activé par défaut) : tout jour manqué est gelé.
 * Un jour gelé préserve la série sans l'allonger (seuls les jours actifs comptent).
 */
import { addDays } from '../../lib/date';

export interface DayRecord {
  day: string;
  xp: number;
  seconds: number;
  answers: number;
  correct: number;
  goalMet?: boolean;
  frozen?: boolean;
}

export interface StreakInfo {
  current: number;
  frozenInStreak: number;
  longest: number;
  activeToday: boolean;
}

const isActive = (d?: DayRecord) => !!d && d.answers > 0;

export function computeStreak(days: Map<string, DayRecord>, today: string, autoFreeze: boolean): StreakInfo {
  const keys = [...days.keys()].sort();
  const first = keys[0];
  const activeToday = isActive(days.get(today));
  let current = 0;
  let frozenInStreak = 0;
  if (first) {
    // Aujourd'hui n'est pas encore terminé : s'il est vide, on part d'hier sans casser la série.
    let cursor = activeToday ? today : addDays(today, -1);
    while (cursor >= first) {
      const rec = days.get(cursor);
      if (isActive(rec)) current++;
      else if (rec?.frozen || autoFreeze) frozenInStreak++;
      else break;
      cursor = addDays(cursor, -1);
    }
    // Des gels en fin de parcours (avant le premier jour actif compté) ne font pas partie de la série.
    if (current === 0) frozenInStreak = 0;
  }
  return { current, frozenInStreak, longest: longestStreak(days, keys, autoFreeze, today), activeToday };
}

function longestStreak(days: Map<string, DayRecord>, sortedKeys: string[], autoFreeze: boolean, today: string): number {
  if (!sortedKeys.length) return 0;
  let best = 0;
  let run = 0;
  for (let cursor = sortedKeys[0]; cursor <= today; cursor = addDays(cursor, 1)) {
    const rec = days.get(cursor);
    if (isActive(rec)) {
      run++;
      best = Math.max(best, run);
    } else if (cursor === today || rec?.frozen || autoFreeze) {
      // préservé
    } else {
      run = 0;
    }
  }
  return best;
}

/** Jours actifs et gelés des n dernières semaines (calendrier du tableau de bord). */
export function calendar(days: Map<string, DayRecord>, today: string, nDays: number, autoFreeze: boolean) {
  const keys = [...days.keys()].sort();
  const first = keys[0];
  const out: { day: string; state: 'active' | 'goal' | 'frozen' | 'none' | 'future'; xp: number }[] = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const rec = days.get(day);
    let state: 'active' | 'goal' | 'frozen' | 'none' | 'future' = 'none';
    if (isActive(rec)) state = rec!.goalMet ? 'goal' : 'active';
    else if (rec?.frozen || (autoFreeze && first && day > first && day < today)) state = 'frozen';
    out.push({ day, state, xp: rec?.xp ?? 0 });
  }
  return out;
}
