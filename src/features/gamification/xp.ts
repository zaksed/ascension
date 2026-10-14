/** Barème d'XP : simple, prévisible, sans pénalité. */

export const XP = {
  correctAnswer: 10,
  lessonComplete: 15,
  perfectBonus: 10,
  reviewCorrect: 8,
  mockComplete: 100,
  placementComplete: 30,
} as const;

export const DAILY_GOALS = [
  { xp: 30, label: 'Détente', hint: '≈ 5 min par jour' },
  { xp: 60, label: 'Régulier', hint: '≈ 10 min par jour' },
  { xp: 100, label: 'Sérieux', hint: '≈ 15 min par jour' },
  { xp: 150, label: 'Intense', hint: '≈ 25 min par jour' },
] as const;

export function lessonXp(correct: number, total: number): number {
  const base = correct * XP.correctAnswer + XP.lessonComplete;
  return total > 0 && correct === total ? base + XP.perfectBonus : base;
}

/** Niveau global : chaque niveau demande 50 XP de plus que le précédent (100, 150, 200…). */
export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let remaining = totalXp;
  let needed = 100;
  while (remaining >= needed) {
    remaining -= needed;
    level++;
    needed += 50;
  }
  return { level, into: remaining, needed };
}

/** Couronnes : une couronne par leçon réussie (≥ 60 %), jusqu'à 5. */
export const MAX_CROWNS = 5;
export const PASS_ACCURACY = 0.6;

export function nextCrowns(current: number, accuracy: number): number {
  return accuracy >= PASS_ACCURACY ? Math.min(MAX_CROWNS, current + 1) : current;
}
