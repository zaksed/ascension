/**
 * Test de placement adaptatif (20 questions par examen). Pour chaque partie ou épreuve, on
 * commence au niveau 3 ; une bonne réponse fait monter d'un niveau, une erreur fait descendre.
 * Le niveau estimé débloque les unités de niveau inférieur (leçons validées d'une couronne).
 */
import type { Bank } from '../../content/bank';
import { isAvailable, itemForQuestion, type Availability, type Item } from '../../content/items';
import type { Curriculum, ExamId, Question, SectionId } from '../../content/schema';
import { rng, seedFrom, shuffle } from '../../lib/random';

export const PLACEMENT_PLAN: Record<ExamId, { section: SectionId; count: number }[]> = {
  toeic: [
    { section: 'part5', count: 4 },
    { section: 'part2', count: 3 },
    { section: 'part1', count: 2 },
    { section: 'part3', count: 3 },
    { section: 'part6', count: 2 },
    { section: 'part4', count: 3 },
    { section: 'part7', count: 3 },
  ],
  tagemage: [
    { section: 'calcul', count: 4 },
    { section: 'expression', count: 4 },
    { section: 'logique', count: 3 },
    { section: 'conditions-minimales', count: 3 },
    { section: 'comprehension', count: 3 },
    { section: 'raisonnement', count: 3 },
  ],
};

export interface PlacementAnswer {
  section: SectionId;
  difficulty: number;
  correct: boolean;
}

export class PlacementRunner {
  private stepIndex = 0;
  private askedInStep = 0;
  private level = 3;
  private readonly used = new Set<string>();
  readonly answers: PlacementAnswer[] = [];
  private readonly r;

  constructor(
    private readonly bank: Bank,
    private readonly av: Availability,
    seed = 'placement',
  ) {
    this.r = rng(seedFrom(seed + bank.exam));
  }

  get plan() {
    return PLACEMENT_PLAN[this.bank.exam];
  }

  get total(): number {
    return this.plan.reduce((s, p) => s + p.count, 0);
  }

  get position(): number {
    return this.answers.length;
  }

  /** Prochaine question, ou null quand le test est terminé. */
  next(): Item | null {
    while (this.stepIndex < this.plan.length && this.askedInStep >= this.plan[this.stepIndex].count) {
      this.stepIndex++;
      this.askedInStep = 0;
      this.level = 3;
    }
    if (this.stepIndex >= this.plan.length) return null;
    const section = this.plan[this.stepIndex].section;
    const q = this.pickQuestion(section, this.level);
    if (!q) {
      // Partie sans question disponible : on passe à la suivante.
      this.stepIndex++;
      this.askedInStep = 0;
      return this.next();
    }
    this.used.add(q.id);
    if (q.groupId) for (const sib of this.bank.groupQuestions.get(q.groupId) ?? []) this.used.add(sib.id);
    return itemForQuestion(this.bank, q);
  }

  record(q: Question, correct: boolean): void {
    this.answers.push({ section: q.section, difficulty: q.difficulty, correct });
    this.askedInStep++;
    this.level = Math.max(1, Math.min(5, this.level + (correct ? 1 : -1)));
  }

  private pickQuestion(section: SectionId, level: number): Question | undefined {
    const candidates = this.bank.questions.filter(
      (q) => q.section === section && !this.used.has(q.id) && isAvailable(this.bank, q, this.av),
    );
    if (!candidates.length) return undefined;
    const best = Math.min(...candidates.map((q) => Math.abs(q.difficulty - level)));
    return shuffle(
      candidates.filter((q) => Math.abs(q.difficulty - level) === best),
      this.r,
    )[0];
  }
}

/** Niveau estimé (1-5) par partie : moyenne des difficultés, pénalisée d'un point par erreur. */
export function placementLevels(answers: PlacementAnswer[]): Map<SectionId, number> {
  const bySection = new Map<SectionId, PlacementAnswer[]>();
  for (const a of answers) bySection.set(a.section, [...(bySection.get(a.section) ?? []), a]);
  const out = new Map<SectionId, number>();
  for (const [s, arr] of bySection) {
    if (arr.every((a) => !a.correct)) {
      out.set(s, 1);
      continue;
    }
    const score = arr.reduce((sum, a) => sum + (a.correct ? a.difficulty : a.difficulty - 1), 0) / arr.length;
    out.set(s, Math.max(1, Math.min(5, Math.round(score))));
  }
  return out;
}

/** Unités à valider d'office : niveau de l'unité strictement inférieur au niveau mesuré. */
export function unitsToSkip(curriculum: Curriculum, levels: Map<SectionId, number>): string[] {
  return curriculum.units
    .filter((u) => {
      const ls = u.sections.map((s) => levels.get(s));
      if (ls.some((l) => l === undefined)) return false;
      return u.level < Math.min(...(ls as number[]));
    })
    .map((u) => u.id);
}
