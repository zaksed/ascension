import { describe, expect, it } from 'vitest';
import { composeFixedMock, composeRandomMock, planQuestionIds, rebuildPlan, answerWindowSeconds } from '../src/features/exam/mock';
import { buildLessonItems, buildTrainingItems, flashPool, reviewItems } from '../src/features/course/selection';
import { courseStatus, lessonKey, nextLesson, type LessonProgress } from '../src/features/course/progress';
import { PlacementRunner, placementLevels, unitsToSkip } from '../src/features/placement/placement';
import { countQuestions, isAvailable, itemDifficulty } from '../src/content/items';
import { poolOf } from '../src/content/bank';
import { EVERYTHING, PRACTICE_ONLY, testBank } from './helpers';

describe('examens blancs TOEIC', () => {
  const bank = testBank('toeic');
  const expected: Record<string, number> = { part1: 6, part2: 25, part3: 39, part4: 30, part5: 30, part6: 16, part7: 54 };

  for (const pool of ['mock1', 'mock2'] as const) {
    it(`${pool} : 200 questions au format officiel`, () => {
      const plan = composeFixedMock(bank, pool);
      const ids = planQuestionIds(plan);
      expect(ids).toHaveLength(200);
      expect(new Set(ids).size).toBe(200);
      for (const [part, n] of Object.entries(expected)) expect(ids.filter((id) => bank.byId.get(id)!.section === part).length, part).toBe(n);
      const p7 = plan.sections[1].items.filter((it) => it.questions[0].section === 'part7');
      expect(p7.filter((it) => it.group?.kind === 'double-passage')).toHaveLength(2);
      expect(p7.filter((it) => it.group?.kind === 'triple-passage')).toHaveLength(3);
      expect(plan.sections[0].listening).toBe(true);
      expect(plan.sections[1].seconds).toBe(75 * 60);
      expect(plan.totalSeconds).toBe(120 * 60);
    });
  }

  it('les deux examens blancs ne partagent aucune question', () => {
    const a = new Set(planQuestionIds(composeFixedMock(bank, 'mock1')));
    expect(planQuestionIds(composeFixedMock(bank, 'mock2')).filter((id) => a.has(id))).toEqual([]);
  });

  it('un examen aléatoire respecte aussi le format', () => {
    const plan = composeRandomMock(bank, EVERYTHING, 'seed-1');
    expect(plan).not.toBeNull();
    const ids = planQuestionIds(plan!);
    expect(ids).toHaveLength(200);
    for (const [part, n] of Object.entries(expected)) expect(ids.filter((id) => bank.byId.get(id)!.section === part).length, part).toBe(n);
  });

  it('se reconstruit à l’identique pour la reprise', () => {
    const plan = composeFixedMock(bank, 'mock2');
    const ids = planQuestionIds(plan);
    const again = rebuildPlan(bank, 'mock2', ids);
    expect(planQuestionIds(again)).toEqual(ids);
    expect(again.sections.map((s) => countQuestions(s.items))).toEqual([100, 100]);
  });

  it('laisse une fenêtre de réponse après chaque audio', () => {
    const plan = composeFixedMock(bank, 'mock1');
    for (const it of plan.sections[0].items) expect(answerWindowSeconds(it)).toBeGreaterThanOrEqual(5);
  });
});

describe('examens blancs TAGE MAGE', () => {
  const bank = testBank('tagemage');
  for (const pool of ['mock1', 'mock2'] as const) {
    it(`${pool} : 6 × 15 questions, 20 min chacun, difficulté croissante`, () => {
      const plan = composeFixedMock(bank, pool);
      expect(plan.sections.map((s) => s.id)).toEqual(['comprehension', 'calcul', 'raisonnement', 'conditions-minimales', 'expression', 'logique']);
      expect(new Set(planQuestionIds(plan)).size).toBe(90);
      for (const s of plan.sections) {
        expect(countQuestions(s.items), s.id).toBe(15);
        expect(s.seconds).toBe(20 * 60);
        const d = s.items.map(itemDifficulty);
        expect(d, s.id).toEqual([...d].sort((a, b) => a - b));
      }
    });
  }

  it('compose un examen aléatoire quand toute la banque est disponible', () => {
    const plan = composeRandomMock(bank, EVERYTHING, 'x');
    expect(plan).not.toBeNull();
    expect(planQuestionIds(plan!)).toHaveLength(90);
  });
});

describe('sélection des questions', () => {
  it('réserve les questions des examens blancs par défaut', () => {
    const bank = testBank('toeic');
    const mockQ = bank.questions.find((q) => poolOf(bank, q) === 'mock1')!;
    expect(isAvailable(bank, mockQ, PRACTICE_ONLY)).toBe(false);
    expect(isAvailable(bank, mockQ, { completedMocks: new Set(['toeic-mock1']), includeMockQuestions: false })).toBe(true);
    expect(isAvailable(bank, mockQ, EVERYTHING)).toBe(true);
  });

  for (const exam of ['toeic', 'tagemage'] as const) {
    it(`${exam} : chaque leçon contient 8 à 12 questions d’entraînement`, () => {
      const bank = testBank(exam);
      for (const unit of bank.curriculum.units) {
        for (let i = 0; i < unit.lessons; i++) {
          const items = buildLessonItems(bank, unit, i, 0, new Map(), PRACTICE_ONLY);
          const n = countQuestions(items);
          expect(n, `${unit.id} leçon ${i}`).toBeGreaterThanOrEqual(8);
          expect(n, `${unit.id} leçon ${i}`).toBeLessThanOrEqual(12);
          for (const it of items) for (const q of it.questions) expect(isAvailable(bank, q, PRACTICE_ONLY)).toBe(true);
        }
      }
    });
  }

  for (const exam of ['toeic', 'tagemage'] as const) {
    it(`${exam} : les leçons d'une même unité n'ont aucune question en commun`, () => {
      const bank = testBank(exam);
      for (const unit of bank.curriculum.units) {
        const seen = new Map<string, number>();
        for (let i = 0; i < unit.lessons; i++) {
          for (const it of buildLessonItems(bank, unit, i, 0, new Map(), PRACTICE_ONLY)) {
            for (const q of it.questions) {
              const other = seen.get(q.id);
              expect(other === undefined || other === i, `${unit.id} : ${q.id} dans les leçons ${other} et ${i}`).toBe(true);
              seen.set(q.id, i);
            }
          }
        }
      }
    });
  }

  it('entraînement par compétence : uniquement la compétence demandée', () => {
    const bank = testBank('tagemage');
    const items = buildTrainingItems(bank, { skill: 'cm-arithmetique' }, new Map(), EVERYTHING, 's');
    for (const it of items) for (const q of it.questions) expect(q.skill).toBe('cm-arithmetique');
  });

  it('mode flash : questions courtes et autonomes', () => {
    const items = flashPool(testBank('toeic'), PRACTICE_ONLY, 'f');
    expect(items.length).toBeGreaterThan(50);
    for (const it of items) {
      expect(it.group).toBeUndefined();
      expect(it.questions[0].recommendedSeconds).toBeLessThanOrEqual(70);
    }
  });

  it('révision : retrouve le document de chaque question', () => {
    const bank = testBank('toeic');
    const q = bank.questions.find((x) => x.section === 'part6')!;
    const [item] = reviewItems(bank, [q.id, 'inconnue']);
    expect(item.group?.id).toBe(q.groupId);
    expect(item.groupIndex?.[0]).toBeGreaterThanOrEqual(1);
  });
});

describe('parcours et placement', () => {
  it('débloque progressivement les unités', () => {
    const bank = testBank('toeic');
    const empty = courseStatus(bank.curriculum, new Map(), false);
    expect(empty[0].unlocked).toBe(true);
    expect(empty[1].unlocked).toBe(false);
    expect(nextLesson(empty)).toEqual({ unitIndex: 0, lesson: 0 });
    const u0 = bank.curriculum.units[0];
    const done = new Map<string, LessonProgress>();
    for (let i = 0; i < u0.lessons; i++) {
      done.set(lessonKey(u0.id, i), { key: lessonKey(u0.id, i), exam: 'toeic', unitId: u0.id, lesson: i, crowns: 1, completions: 1, bestAccuracy: 0.8, lastAt: '' });
    }
    expect(courseStatus(bank.curriculum, done, false)[1].unlocked).toBe(true);
    expect(courseStatus(bank.curriculum, new Map(), true).every((u) => u.unlocked)).toBe(true);
  });

  for (const exam of ['toeic', 'tagemage'] as const) {
    it(`${exam} : test de placement de 20 questions, adaptatif`, () => {
      const bank = testBank(exam);
      const run = (answerRight: boolean) => {
        const r = new PlacementRunner(bank, PRACTICE_ONLY, 'test');
        let n = 0;
        for (let item = r.next(); item; item = r.next()) {
          r.record(item.questions[0], answerRight);
          n++;
        }
        return { n, levels: placementLevels(r.answers) };
      };
      const good = run(true);
      expect(good.n).toBe(20);
      const bad = run(false);
      expect([...bad.levels.values()].every((l) => l === 1)).toBe(true);
      expect(unitsToSkip(bank.curriculum, bad.levels)).toEqual([]);
      const skipped = unitsToSkip(bank.curriculum, good.levels);
      expect(skipped.length).toBeGreaterThan(0);
      for (const id of skipped) expect(bank.curriculum.units.find((u) => u.id === id)!.level).toBeLessThan(5);
    });
  }
});
