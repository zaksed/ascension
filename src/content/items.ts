/**
 * Un « item » est l'unité présentée à l'écran : soit une question isolée, soit un groupe
 * (conversation, texte…) avec tout ou partie de ses questions.
 */
import type { Bank } from './bank';
import { poolOf } from './bank';
import type { ExamId, Group, GroupKindT, Question } from './schema';

export interface Item {
  key: string;
  group?: Group;
  questions: Question[];
  /** Rang (1-n) de chaque question dans son groupe complet (numéro du blanc en Partie 6). */
  groupIndex?: number[];
}

export interface Availability {
  /** Examens blancs terminés, ex. « toeic-mock1 » : leurs questions rejoignent l'entraînement. */
  completedMocks: ReadonlySet<string>;
  /** Réglage : inclure d'emblée les questions réservées aux examens blancs. */
  includeMockQuestions: boolean;
}

export function mockKey(exam: ExamId, pool: string): string {
  return `${exam}-${pool}`;
}

export function isAvailable(bank: Bank, q: Question, av: Availability): boolean {
  const pool = poolOf(bank, q);
  if (pool === 'practice') return true;
  return av.includeMockQuestions || av.completedMocks.has(mockKey(bank.exam, pool));
}

/**
 * Items dont au moins une question vérifie `match`. Les questions isolées donnent un item
 * chacune ; un groupe donne un item complet (toutes ses questions disponibles).
 */
export function collectItems(
  bank: Bank,
  match: (q: Question) => boolean,
  av: Availability,
  opts: { groupKinds?: GroupKindT[] } = {},
): Item[] {
  const items: Item[] = [];
  const seenGroups = new Set<string>();
  for (const q of bank.questions) {
    if (!isAvailable(bank, q, av)) continue;
    if (!q.groupId) {
      if (match(q)) items.push({ key: q.id, questions: [q] });
      continue;
    }
    if (seenGroups.has(q.groupId)) continue;
    const g = bank.groups.get(q.groupId);
    if (!g) continue;
    if (opts.groupKinds && !opts.groupKinds.includes(g.kind)) continue;
    const qs = (bank.groupQuestions.get(g.id) ?? []).filter((x) => isAvailable(bank, x, av));
    if (!qs.some(match)) continue;
    seenGroups.add(g.id);
    const all = bank.groupQuestions.get(g.id) ?? [];
    items.push({ key: g.id, group: g, questions: qs, groupIndex: qs.map((x) => all.indexOf(x) + 1) });
  }
  return items;
}

/** Item contenant une seule question, avec son document éventuel (révision, placement). */
export function itemForQuestion(bank: Bank, q: Question): Item {
  if (!q.groupId) return { key: q.id, questions: [q] };
  const all = bank.groupQuestions.get(q.groupId) ?? [];
  return { key: `${q.groupId}:${q.id}`, group: bank.groups.get(q.groupId), questions: [q], groupIndex: [all.indexOf(q) + 1] };
}

/** Regroupe des questions d'un même document dans un seul item (en gardant l'ordre). */
export function itemsForQuestions(bank: Bank, qs: Question[]): Item[] {
  const out: Item[] = [];
  const byGroup = new Map<string, Item>();
  for (const q of qs) {
    if (!q.groupId) {
      out.push({ key: q.id, questions: [q] });
      continue;
    }
    let it = byGroup.get(q.groupId);
    if (!it) {
      it = { key: `${q.groupId}:sel`, group: bank.groups.get(q.groupId), questions: [], groupIndex: [] };
      byGroup.set(q.groupId, it);
      out.push(it);
    }
    it.questions.push(q);
    it.groupIndex!.push((bank.groupQuestions.get(q.groupId) ?? []).indexOf(q) + 1);
  }
  return out;
}

export function itemDifficulty(it: Item): number {
  if (it.group) return it.group.difficulty;
  return it.questions.reduce((s, q) => s + q.difficulty, 0) / it.questions.length;
}

export function countQuestions(items: Item[]): number {
  return items.reduce((s, it) => s + it.questions.length, 0);
}
