/**
 * Sélection des questions pour les leçons et les modes d'entraînement.
 * Fonctions pures et déterministes (graine) : testées dans tests/selection.test.ts.
 */
import type { Bank } from '../../content/bank';
import {
  collectItems,
  countQuestions,
  itemDifficulty,
  itemForQuestion,
  itemsForQuestions,
  isAvailable,
  type Availability,
  type Item,
} from '../../content/items';
import type { Question, SectionId, Unit } from '../../content/schema';
import { rng, seedFrom, shuffle, weightedSample, type Rng } from '../../lib/random';

export interface QStat {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  lastAt: string;
}

export type StatsMap = ReadonlyMap<string, QStat>;

export const LESSON_MIN = 8;
export const LESSON_MAX = 12;

/** Plage de difficulté visée selon le nombre de couronnes de la leçon. */
export function difficultyBand(crowns: number): [number, number] {
  const bands: [number, number][] = [[1, 3], [1, 4], [2, 5], [3, 5], [3, 5], [4, 5]];
  return bands[Math.max(0, Math.min(5, crowns))];
}

function noveltyWeight(it: Item, stats: StatsMap): number {
  let w = 1;
  for (const q of it.questions) {
    const s = stats.get(q.id);
    if (!s) w += 2; // jamais vue : priorité
    else if (!s.lastCorrect) w += 1.5; // ratée la dernière fois
    else if (s.correct >= 2) w -= 0.3; // déjà maîtrisée
  }
  return Math.max(0.2, w / it.questions.length);
}

function bandWeight(it: Item, band: [number, number]): number {
  const d = itemDifficulty(it);
  if (d >= band[0] && d <= band[1]) return 1;
  const dist = d < band[0] ? band[0] - d : d - band[1];
  return Math.max(0.05, 1 - dist * 0.6);
}

/** Remplit jusqu'à `min` questions (au plus `max`) en ajoutant des items entiers. */
function fill(items: Item[], min: number, max: number): Item[] {
  const out: Item[] = [];
  let n = 0;
  for (const it of items) {
    if (n >= min) break;
    if (n + it.questions.length > max && n > 0) continue;
    out.push(it);
    n += it.questions.length;
  }
  return out;
}

function pick(candidates: Item[], weight: (it: Item) => number, r: Rng, min: number, max: number): Item[] {
  const ordered = weightedSample(candidates, weight, candidates.length, r);
  let chosen = fill(ordered, min, max);
  // Pas assez de questions distinctes : on complète en reprenant des items (révision naturelle).
  if (countQuestions(chosen) < min && candidates.length) {
    const extra = shuffle(candidates, r);
    for (const it of extra) {
      if (countQuestions(chosen) >= min) break;
      if (!chosen.includes(it)) chosen.push(it);
    }
  }
  chosen = chosen.slice().sort((a, b) => itemDifficulty(a) - itemDifficulty(b));
  return chosen;
}

export function unitItems(bank: Bank, unit: Unit, av: Availability): Item[] {
  return collectItems(
    bank,
    (q) => unit.sections.includes(q.section) && unit.skills.includes(q.skill),
    av,
    { groupKinds: unit.groupKinds },
  );
}

/**
 * Répartit les items d'une unité entre ses leçons, pour que chaque leçon ait ses propres
 * questions : tri par difficulté puis distribution en alternance (chaque leçon couvre ainsi
 * toute la gamme de difficulté, et les couronnes suivantes y puisent les questions plus dures).
 */
export function lessonBuckets(items: Item[], lessons: number): Item[][] {
  const sorted = items.slice().sort((a, b) => itemDifficulty(a) - itemDifficulty(b) || a.key.localeCompare(b.key));
  const buckets: Item[][] = Array.from({ length: Math.max(1, lessons) }, () => []);
  sorted.forEach((it, i) => buckets[i % buckets.length].push(it));
  return buckets;
}

export function buildLessonItems(
  bank: Bank,
  unit: Unit,
  lessonIndex: number,
  crowns: number,
  stats: StatsMap,
  av: Availability,
  salt = '',
): Item[] {
  const band = difficultyBand(crowns);
  const r = rng(seedFrom(`${unit.id}#${lessonIndex}#${crowns}#${salt}`));
  const all = unitItems(bank, unit, av);
  const own = new Set(lessonBuckets(all, unit.lessons)[lessonIndex] ?? []);
  // Les questions des autres leçons ne servent qu'en complément, si la leçon en manque.
  const candidates = countQuestions([...own]) >= LESSON_MIN ? [...own] : all;
  return pick(candidates, (it) => bandWeight(it, band) * noveltyWeight(it, stats) * (own.has(it) ? 1 : 0.1), r, LESSON_MIN, LESSON_MAX);
}

export interface TrainingFilter {
  section?: SectionId;
  skill?: string;
}

export function buildTrainingItems(
  bank: Bank,
  filter: TrainingFilter,
  stats: StatsMap,
  av: Availability,
  seed: string,
  size = 10,
): Item[] {
  const r = rng(seedFrom(seed));
  const candidates = collectItems(
    bank,
    (q) => (!filter.section || q.section === filter.section) && (!filter.skill || q.skill === filter.skill),
    av,
  );
  return pick(candidates, (it) => noveltyWeight(it, stats), r, Math.min(size, 8), Math.max(size, 12));
}

export interface SkillAccuracy {
  skill: string;
  attempts: number;
  accuracy: number;
}

export function skillAccuracies(bank: Bank, stats: StatsMap): SkillAccuracy[] {
  const agg = new Map<string, { a: number; c: number }>();
  for (const q of bank.questions) {
    const s = stats.get(q.id);
    if (!s) continue;
    const cur = agg.get(q.skill) ?? { a: 0, c: 0 };
    cur.a += s.attempts;
    cur.c += s.correct;
    agg.set(q.skill, cur);
  }
  return [...agg.entries()].map(([skill, { a, c }]) => ({ skill, attempts: a, accuracy: a ? c / a : 0 }));
}

/**
 * Mode « faiblesses » : questions dues en révision d'abord, puis questions des compétences
 * les moins réussies (au moins 3 tentatives), en privilégiant les questions ratées ou jamais vues.
 */
export function buildWeaknessItems(
  bank: Bank,
  stats: StatsMap,
  dueQids: string[],
  av: Availability,
  seed: string,
  size = 10,
): Item[] {
  const r = rng(seedFrom(seed));
  const due = dueQids.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q).slice(0, Math.ceil(size / 2));
  const weakest = skillAccuracies(bank, stats)
    .filter((s) => s.attempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((s) => s.skill);
  const pool = bank.questions.filter(
    (q) => weakest.includes(q.skill) && isAvailable(bank, q, av) && !due.includes(q) && stats.get(q.id)?.lastCorrect !== true,
  );
  const chosen = [...due, ...weightedSample(pool, (q) => (stats.has(q.id) ? 2 : 1), size - due.length, r)];
  if (chosen.length < size) {
    // Pas encore assez d'historique : on complète avec des questions jamais vues.
    const fresh = shuffle(
      bank.questions.filter((q) => !q.groupId && isAvailable(bank, q, av) && !stats.has(q.id) && !chosen.includes(q)),
      r,
    );
    chosen.push(...fresh.slice(0, size - chosen.length));
  }
  return itemsForQuestions(bank, chosen);
}

/** Mode flash : uniquement des questions courtes et autonomes (sans document long). */
export function flashPool(bank: Bank, av: Availability, seed: string): Item[] {
  const r = rng(seedFrom(seed));
  const qs = bank.questions.filter((q) => !q.groupId && isAvailable(bank, q, av) && q.recommendedSeconds <= 70);
  return shuffle(qs, r).map((q) => itemForQuestion(bank, q));
}

/** Révision espacée : une question par item, avec son document. */
export function reviewItems(bank: Bank, qids: string[]): Item[] {
  return qids
    .map((id) => bank.byId.get(id))
    .filter((q): q is Question => !!q)
    .map((q) => itemForQuestion(bank, q));
}
