/**
 * Composition des examens blancs, au format officiel (docs/FORMATS_OFFICIELS.md) :
 * - TOEIC : Listening (P1-P4, 100 questions, rythmé par l'audio) puis Reading (P5-P7,
 *   100 questions, 75 min) ; 120 min au total.
 * - TAGE MAGE : 6 sous-tests de 15 questions, 20 min chacun, difficulté croissante.
 */
import type { Bank } from '../../content/bank';
import { poolOf } from '../../content/bank';
import { isAvailable, itemDifficulty, itemsForQuestions, type Availability, type Item } from '../../content/items';
import { sectionDef, sectionsOf, TIMING, TOEIC_P7_MOCK } from '../../content/exams';
import type { Group, Question, SectionId } from '../../content/schema';
import { rng, seedFrom, shuffle, type Rng } from '../../lib/random';

export interface MockSectionPlan {
  id: string;
  label: string;
  sections: SectionId[];
  items: Item[];
  /** Durée imposée en secondes ; absente pour l'écoute TOEIC (rythmée par l'audio). */
  seconds?: number;
  listening: boolean;
}

export interface MockPlan {
  exam: Bank['exam'];
  mockId: string;
  title: string;
  sections: MockSectionPlan[];
  totalSeconds: number;
}

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

function singles(bank: Bank, section: SectionId, filter: (q: Question) => boolean): Item[] {
  return bank.questions
    .filter((q) => q.section === section && !q.groupId && filter(q))
    .sort(byId)
    .map((q) => ({ key: q.id, questions: [q] }));
}

function groups(bank: Bank, section: SectionId, filter: (g: Group) => boolean): Item[] {
  return [...bank.groups.values()]
    .filter((g) => g.section === section && filter(g))
    .sort(byId)
    .map((g) => ({ key: g.id, group: g, questions: bank.groupQuestions.get(g.id) ?? [] }));
}

const P7_ORDER: Record<string, number> = { 'single-passage': 0, 'double-passage': 1, 'triple-passage': 2 };

function toeicPlan(bank: Bank, mockId: string, title: string, parts: Record<string, Item[]>): MockPlan {
  const p7 = parts.part7.slice().sort((a, b) => (P7_ORDER[a.group!.kind] - P7_ORDER[b.group!.kind]) || a.key.localeCompare(b.key));
  return {
    exam: bank.exam,
    mockId,
    title,
    totalSeconds: TIMING.toeicTotalSeconds,
    sections: [
      {
        id: 'listening',
        label: 'Listening (Parties 1 à 4)',
        sections: ['part1', 'part2', 'part3', 'part4'],
        items: [...parts.part1, ...parts.part2, ...parts.part3, ...parts.part4],
        listening: true,
      },
      {
        id: 'reading',
        label: 'Reading (Parties 5 à 7)',
        sections: ['part5', 'part6', 'part7'],
        items: [...parts.part5, ...parts.part6, ...p7],
        seconds: TIMING.toeicReadingSeconds,
        listening: false,
      },
    ],
  };
}

function tmPlan(bank: Bank, mockId: string, title: string, parts: Record<string, Item[]>): MockPlan {
  return {
    exam: bank.exam,
    mockId,
    title,
    totalSeconds: TIMING.tmSubtestSeconds * 6,
    sections: sectionsOf('tagemage').map((def) => ({
      id: def.id,
      label: def.label,
      sections: [def.id],
      // Difficulté croissante au sein de chaque sous-test (choix de conception, FORMATS §2.5).
      items: parts[def.id].slice().sort((a, b) => itemDifficulty(a) - itemDifficulty(b) || a.key.localeCompare(b.key)),
      seconds: TIMING.tmSubtestSeconds,
      listening: false,
    })),
  };
}

/** Examen blanc officiel de l'application (questions réservées « mock1 » ou « mock2 »). */
export function composeFixedMock(bank: Bank, pool: 'mock1' | 'mock2'): MockPlan {
  const inPool = (q: Question) => poolOf(bank, q) === pool;
  const title = `Examen blanc n°${pool === 'mock1' ? 1 : 2}`;
  const parts: Record<string, Item[]> = {};
  for (const def of sectionsOf(bank.exam)) {
    parts[def.id] = def.mockGroups
      ? groups(bank, def.id, (g) => g.pool === pool)
      : def.id === 'part7'
        ? groups(bank, def.id, (g) => g.pool === pool)
        : singles(bank, def.id, inPool);
  }
  return bank.exam === 'toeic' ? toeicPlan(bank, pool, title, parts) : tmPlan(bank, pool, title, parts);
}

/** Choisit des documents dont la somme des questions vaut exactement `target` (P7 simples). */
function subsetToSize(items: Item[], target: number, r: Rng): Item[] | null {
  const pool = shuffle(items, r);
  const best: Item[] = [];
  const dfs = (i: number, sum: number): boolean => {
    if (sum === target) return true;
    if (sum > target || i >= pool.length) return false;
    best.push(pool[i]);
    if (dfs(i + 1, sum + pool[i].questions.length)) return true;
    best.pop();
    return dfs(i + 1, sum);
  };
  return dfs(0, 0) ? best.slice().sort((a, b) => a.key.localeCompare(b.key)) : null;
}

/**
 * Examen blanc aléatoire à partir des questions disponibles (entraînement + examens blancs déjà
 * passés). Renvoie null si la banque disponible ne permet pas de respecter le format.
 */
export function composeRandomMock(bank: Bank, av: Availability, seed: string): MockPlan | null {
  const r = rng(seedFrom(seed));
  const ok = (q: Question) => isAvailable(bank, q, av);
  const groupOk = (g: Group) => (bank.groupQuestions.get(g.id) ?? []).every(ok);
  const parts: Record<string, Item[]> = {};
  for (const def of sectionsOf(bank.exam)) {
    if (def.id === 'part7') {
      const singlesP7 = groups(bank, 'part7', (g) => g.kind === 'single-passage' && groupOk(g));
      const doubles = shuffle(groups(bank, 'part7', (g) => g.kind === 'double-passage' && groupOk(g)), r).slice(0, TOEIC_P7_MOCK.doubleGroups);
      const triples = shuffle(groups(bank, 'part7', (g) => g.kind === 'triple-passage' && groupOk(g)), r).slice(0, TOEIC_P7_MOCK.tripleGroups);
      const chosen = subsetToSize(singlesP7, TOEIC_P7_MOCK.singleQuestions, r);
      if (!chosen || doubles.length < TOEIC_P7_MOCK.doubleGroups || triples.length < TOEIC_P7_MOCK.tripleGroups) return null;
      parts.part7 = [...chosen, ...doubles, ...triples];
      continue;
    }
    if (def.mockGroups) {
      const gs = shuffle(groups(bank, def.id, groupOk), r).filter((it) => !def.groupSize || it.questions.length === def.groupSize);
      if (gs.length < def.mockGroups) return null;
      parts[def.id] = gs.slice(0, def.mockGroups).sort((a, b) => a.key.localeCompare(b.key));
      continue;
    }
    const ss = shuffle(singles(bank, def.id, ok), r);
    if (ss.length < def.mockCount) return null;
    if (bank.exam === 'tagemage') {
      // On équilibre les difficultés : 3 questions par niveau quand c'est possible.
      const byLevel = [1, 2, 3, 4, 5].map((d) => ss.filter((it) => it.questions[0].difficulty === d));
      const picked: Item[] = [];
      for (const lvl of byLevel) picked.push(...lvl.slice(0, 3));
      for (const it of ss) if (picked.length < def.mockCount && !picked.includes(it)) picked.push(it);
      parts[def.id] = picked.slice(0, def.mockCount);
    } else {
      parts[def.id] = ss.slice(0, def.mockCount).sort((a, b) => a.key.localeCompare(b.key));
    }
  }
  const title = 'Examen blanc aléatoire';
  return bank.exam === 'toeic' ? toeicPlan(bank, 'random', title, parts) : tmPlan(bank, 'random', title, parts);
}

export function planQuestionIds(plan: MockPlan): string[] {
  return plan.sections.flatMap((s) => s.items.flatMap((it) => it.questions.map((q) => q.id)));
}

/**
 * Reconstruit un plan à partir de la liste ordonnée des questions enregistrée dans la tentative
 * (reprise d'un examen interrompu, rapport). L'ordre d'origine est conservé.
 */
export function rebuildPlan(bank: Bank, mockId: string, questionIds: string[]): MockPlan {
  const qs = questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q);
  const items = itemsForQuestions(bank, qs);
  const title = mockId === 'random' ? 'Examen blanc aléatoire' : `Examen blanc n°${mockId === 'mock2' ? 2 : 1}`;
  const of = (ids: SectionId[]) => items.filter((it) => ids.includes(it.questions[0].section));
  if (bank.exam === 'toeic') {
    const listening: SectionId[] = ['part1', 'part2', 'part3', 'part4'];
    const reading: SectionId[] = ['part5', 'part6', 'part7'];
    return {
      exam: bank.exam,
      mockId,
      title,
      totalSeconds: TIMING.toeicTotalSeconds,
      sections: [
        { id: 'listening', label: 'Listening (Parties 1 à 4)', sections: listening, items: of(listening), listening: true },
        { id: 'reading', label: 'Reading (Parties 5 à 7)', sections: reading, items: of(reading), seconds: TIMING.toeicReadingSeconds, listening: false },
      ],
    };
  }
  return {
    exam: bank.exam,
    mockId,
    title,
    totalSeconds: TIMING.tmSubtestSeconds * 6,
    sections: sectionsOf('tagemage').map((def) => ({ id: def.id, label: def.label, sections: [def.id], items: of([def.id]), seconds: TIMING.tmSubtestSeconds, listening: false })),
  };
}

/** Fenêtre de réponse (s) après la fin de l'audio d'un item d'écoute TOEIC. */
export function answerWindowSeconds(item: Item): number {
  const w = TIMING.toeicAnswerWindowSeconds;
  const q = item.questions[0];
  if (q.section === 'part1') return w.part1;
  if (q.section === 'part2') return w.part2;
  const graphic = item.group?.media ? w.graphicBonus : 0;
  return item.questions.length * w.perQuestionPart34 + graphic;
}

export function sectionLabel(id: SectionId): string {
  return sectionDef(id).label;
}
