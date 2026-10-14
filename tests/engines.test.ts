import { describe, expect, it } from 'vitest';
import { applyAnswer, dueQueue, isMastered, newCard, qualityFromAnswer, review, MIN_EF } from '../src/features/srs/sm2';
import { calendar, computeStreak, type DayRecord } from '../src/features/gamification/streak';
import { levelFromXp, nextCrowns } from '../src/features/gamification/xp';
import { addDays } from '../src/lib/date';

const T = '2026-10-14';

describe('répétition espacée SM-2', () => {
  it('ne crée une carte qu’après une erreur', () => {
    expect(applyAnswer(undefined, 'q', 'toeic', true, 5000, 20, T)).toBeUndefined();
    const c = applyAnswer(undefined, 'q', 'toeic', false, 5000, 20, T)!;
    expect(c.due).toBe(addDays(T, 1));
    expect(c.lapses).toBe(1);
  });

  it('allonge les intervalles après des réussites (1, 6, puis × facteur)', () => {
    let c = newCard('q', 'toeic', T);
    c = review(c, 4, T);
    expect(c.interval).toBe(1);
    c = review(c, 4, c.due);
    expect(c.interval).toBe(6);
    c = review(c, 4, c.due);
    expect(c.interval).toBe(Math.round(6 * c.ef));
    expect(isMastered({ ...c, interval: 30 })).toBe(true);
  });

  it('ne descend jamais sous le facteur minimal', () => {
    let c = newCard('q', 'toeic', T);
    for (let i = 0; i < 20; i++) c = review(c, 0, T);
    expect(c.ef).toBe(MIN_EF);
  });

  it('module la qualité selon la vitesse', () => {
    expect(qualityFromAnswer(false, 1000, 30)).toBe(1);
    expect(qualityFromAnswer(true, 10_000, 30)).toBe(5);
    expect(qualityFromAnswer(true, 30_000, 30)).toBe(4);
    expect(qualityFromAnswer(true, 60_000, 30)).toBe(3);
  });

  it('classe la file du jour par échéance puis par nombre d’erreurs', () => {
    const a = { ...newCard('a', 'toeic', T), due: addDays(T, -2), lapses: 1 };
    const b = { ...newCard('b', 'toeic', T), due: addDays(T, -1), lapses: 5 };
    const c = { ...newCard('c', 'toeic', T), due: addDays(T, -1), lapses: 1 };
    const d = { ...newCard('d', 'toeic', T), due: addDays(T, 3) };
    expect(dueQueue([d, c, b, a], T).map((x) => x.qid)).toEqual(['a', 'b', 'c']);
  });
});

function days(spec: Record<string, Partial<DayRecord>>): Map<string, DayRecord> {
  return new Map(Object.entries(spec).map(([day, r]) => [day, { day, xp: 0, seconds: 0, answers: 0, correct: 0, ...r }]));
}

describe('série et gel de série', () => {
  it('compte les jours actifs consécutifs', () => {
    const m = days({ [addDays(T, -2)]: { answers: 3 }, [addDays(T, -1)]: { answers: 1 }, [T]: { answers: 2 } });
    expect(computeStreak(m, T, false).current).toBe(3);
  });

  it('ne casse pas la série tant que la journée n’est pas finie', () => {
    const m = days({ [addDays(T, -2)]: { answers: 3 }, [addDays(T, -1)]: { answers: 1 } });
    const s = computeStreak(m, T, false);
    expect(s.current).toBe(2);
    expect(s.activeToday).toBe(false);
  });

  it('casse la série sur un jour manqué sans gel', () => {
    const m = days({ [addDays(T, -3)]: { answers: 3 }, [addDays(T, -1)]: { answers: 1 } });
    expect(computeStreak(m, T, false).current).toBe(1);
  });

  it('préserve la série avec le gel automatique, sans l’allonger', () => {
    const m = days({ [addDays(T, -3)]: { answers: 3 }, [addDays(T, -1)]: { answers: 1 } });
    const s = computeStreak(m, T, true);
    expect(s.current).toBe(2);
    expect(s.frozenInStreak).toBe(1);
  });

  it('respecte un gel manuel', () => {
    const m = days({ [addDays(T, -3)]: { answers: 3 }, [addDays(T, -2)]: { frozen: true }, [addDays(T, -1)]: { answers: 1 } });
    expect(computeStreak(m, T, false).current).toBe(2);
    expect(computeStreak(m, T, false).longest).toBe(2);
  });

  it('produit un calendrier de la bonne longueur', () => {
    const m = days({ [addDays(T, -1)]: { answers: 1, goalMet: true } });
    const cal = calendar(m, T, 14, true);
    expect(cal).toHaveLength(14);
    expect(cal[12].state).toBe('goal');
    expect(cal[13].day).toBe(T);
  });
});

describe('XP, niveaux et couronnes', () => {
  it('calcule les niveaux (100, 150, 200… XP)', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(250).level).toBe(3);
  });

  it('donne une couronne à partir de 60 % et plafonne à 5', () => {
    expect(nextCrowns(0, 0.59)).toBe(0);
    expect(nextCrowns(0, 0.6)).toBe(1);
    expect(nextCrowns(5, 1)).toBe(5);
  });
});
