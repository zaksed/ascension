/**
 * Répétition espacée — algorithme SM-2 (Wozniak, 1987), adapté aux QCM.
 *
 * Une carte est créée dès qu'une question est ratée. Chaque nouvelle réponse la reprogramme :
 * - réponse fausse → qualité 1 : la carte revient le lendemain ;
 * - réponse juste → qualité 3 à 5 selon la rapidité par rapport au temps conseillé.
 */
import { addDays } from '../../lib/date';
import type { ExamId } from '../../content/schema';

export interface SrsCard {
  qid: string;
  exam: ExamId;
  /** Facteur de facilité (≥ 1,3). */
  ef: number;
  /** Intervalle courant en jours. */
  interval: number;
  /** Nombre de réussites consécutives. */
  reps: number;
  lapses: number;
  /** Prochaine échéance (AAAA-MM-JJ). */
  due: string;
  lastReview: string;
}

export const MIN_EF = 1.3;
export const MASTERED_INTERVAL = 30;

/** Qualité SM-2 (0-5) déduite d'une réponse à un QCM. */
export function qualityFromAnswer(correct: boolean, ms: number, recommendedSeconds: number): number {
  if (!correct) return 1;
  const ratio = ms / 1000 / Math.max(1, recommendedSeconds);
  if (ratio <= 0.6) return 5;
  if (ratio <= 1.3) return 4;
  return 3;
}

export function newCard(qid: string, exam: ExamId, today: string): SrsCard {
  return { qid, exam, ef: 2.5, interval: 0, reps: 0, lapses: 0, due: today, lastReview: today };
}

export function review(card: SrsCard, quality: number, today: string): SrsCard {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ef, interval, reps, lapses } = card;
  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps += 1;
  }
  ef = Math.max(MIN_EF, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { ...card, ef: Math.round(ef * 1000) / 1000, interval, reps, lapses, due: addDays(today, interval), lastReview: today };
}

/**
 * Met à jour (ou crée) la carte après une réponse. Une bonne réponse sur une question
 * jamais ratée ne crée pas de carte : seules les erreurs alimentent la révision.
 */
export function applyAnswer(
  card: SrsCard | undefined,
  qid: string,
  exam: ExamId,
  correct: boolean,
  ms: number,
  recommendedSeconds: number,
  today: string,
): SrsCard | undefined {
  if (!card && correct) return undefined;
  const base = card ?? newCard(qid, exam, today);
  return review(base, qualityFromAnswer(correct, ms, recommendedSeconds), today);
}

export function isDue(card: SrsCard, today: string): boolean {
  return card.due <= today;
}

export function isMastered(card: SrsCard): boolean {
  return card.interval >= MASTERED_INTERVAL;
}

/** File du jour : échéances dépassées d'abord, puis les cartes les plus souvent ratées. */
export function dueQueue(cards: SrsCard[], today: string, limit = 20): SrsCard[] {
  return cards
    .filter((c) => isDue(c, today))
    .sort((a, b) => (a.due === b.due ? b.lapses - a.lapses : a.due.localeCompare(b.due)))
    .slice(0, limit);
}
