import { describe, expect, it } from 'vitest';
import { scaleListening, scaleReading, toeicScore } from '../src/features/scoring/toeic';
import { subtestScore, tagemageScore, type SubtestResult } from '../src/features/scoring/tagemage';
import type { TmSection } from '../src/content/schema';
import { computeMockResult } from '../src/features/exam/result';
import { composeFixedMock, planQuestionIds } from '../src/features/exam/mock';
import { testBank } from './helpers';

const TM: TmSection[] = ['comprehension', 'calcul', 'raisonnement', 'conditions-minimales', 'expression', 'logique'];
const all = (r: SubtestResult) => Object.fromEntries(TM.map((s) => [s, r])) as Record<TmSection, SubtestResult>;

describe('score TOEIC (estimation)', () => {
  it('reste dans les bornes officielles 5-495 par section et 10-990 au total', () => {
    expect(toeicScore(0, 0).total).toBe(10);
    expect(toeicScore(100, 100).total).toBe(990);
  });

  it('est croissant et en multiples de 5', () => {
    for (let raw = 1; raw <= 100; raw++) {
      expect(scaleListening(raw)).toBeGreaterThanOrEqual(scaleListening(raw - 1));
      expect(scaleReading(raw)).toBeGreaterThanOrEqual(scaleReading(raw - 1));
      expect(scaleListening(raw) % 5).toBe(0);
      expect(scaleReading(raw) % 5).toBe(0);
    }
  });
});

describe('score TAGE MAGE', () => {
  it('donne 600 pour un sans-faute et 0 sans réponse', () => {
    expect(tagemageScore(all({ correct: 15, wrong: 0, blank: 0 })).total).toBe(600);
    expect(tagemageScore(all({ correct: 0, wrong: 0, blank: 15 })).total).toBe(0);
  });

  it('n’applique aucune pénalité avec le barème officiel', () => {
    expect(subtestScore({ correct: 10, wrong: 5, blank: 0 })).toBe(40);
    expect(subtestScore({ correct: 10, wrong: 0, blank: 5 })).toBe(40);
    expect(subtestScore({ correct: 10, wrong: 5, blank: 0 }, 'legacy')).toBe(35);
  });

  it('calcule domaines (moyenne de deux sous-tests) et total (moyenne × 10)', () => {
    const r = all({ correct: 0, wrong: 0, blank: 15 });
    r.comprehension = { correct: 15, wrong: 0, blank: 0 }; // 60
    r.expression = { correct: 5, wrong: 0, blank: 10 }; // 20
    r.calcul = { correct: 9, wrong: 6, blank: 0 }; // 36
    const s = tagemageScore(r);
    expect(s.domains.verbal).toBe(40);
    expect(s.domains.problemes).toBe(18);
    expect(s.domains.logique).toBe(0);
    expect(s.total).toBe(Math.round(((40 + 18 + 0) / 3) * 10));
  });
});

describe('résultat d’un examen blanc', () => {
  it('TOEIC : toutes bonnes = 990, aucune = 10', () => {
    const bank = testBank('toeic');
    const ids = planQuestionIds(composeFixedMock(bank, 'mock1'));
    const perfect = Object.fromEntries(ids.map((id) => [id, bank.byId.get(id)!.answer]));
    expect(computeMockResult(bank, ids, perfect, {}).total).toBe(990);
    expect(computeMockResult(bank, ids, {}, {}).total).toBe(10);
  });

  it('TAGE MAGE : détail par sous-test sur 60 et ancien barème', () => {
    const bank = testBank('tagemage');
    const ids = planQuestionIds(composeFixedMock(bank, 'mock2'));
    // Tout faux (réponse toujours différente de la bonne).
    const wrong = Object.fromEntries(ids.map((id) => [id, (bank.byId.get(id)!.answer + 1) % 5]));
    const r = computeMockResult(bank, ids, wrong, {});
    expect(r.total).toBe(0);
    expect(r.legacyTotal).toBe(-150); // −15 par sous-test, moyenne × 10
    expect(r.parts).toHaveLength(6);
    for (const p of r.parts) expect(p.total).toBe(15);
  });
});
