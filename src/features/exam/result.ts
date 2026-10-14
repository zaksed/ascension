/** Calcul du résultat d'un examen blanc (score converti + détail par partie). */
import type { Bank } from '../../content/bank';
import { sectionsOf } from '../../content/exams';
import type { Question, SectionId, TmSection } from '../../content/schema';
import type { MockResult } from '../../db/db';
import { toeicScore } from '../scoring/toeic';
import { tagemageScore, TM_DOMAINS, type SubtestResult } from '../scoring/tagemage';

export function computeMockResult(bank: Bank, questionIds: string[], answers: Record<string, number | null>, times: Record<string, number>): MockResult {
  const qs = questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q);
  const isCorrect = (q: Question) => answers[q.id] === q.answer;
  const parts = sectionsOf(bank.exam)
    .map((def) => {
      const mine = qs.filter((q) => q.section === def.id);
      return {
        id: def.id as string,
        label: def.label,
        correct: mine.filter(isCorrect).length,
        total: mine.length,
        seconds: Math.round(mine.reduce((s, q) => s + (times[q.id] ?? 0), 0) / 1000),
      };
    })
    .filter((p) => p.total > 0);

  if (bank.exam === 'toeic') {
    const count = (ids: SectionId[]) => {
      const mine = qs.filter((q) => ids.includes(q.section));
      // Ramené sur 100 si la section ne compte pas exactement 100 questions (sécurité).
      return mine.length ? Math.round((mine.filter(isCorrect).length / mine.length) * 100) : 0;
    };
    const s = toeicScore(count(['part1', 'part2', 'part3', 'part4']), count(['part5', 'part6', 'part7']));
    return {
      total: s.total,
      max: 990,
      parts,
      detail: { listening: s.listening, reading: s.reading, listeningRaw: s.listeningRaw, readingRaw: s.readingRaw },
    };
  }

  const results = Object.fromEntries(
    sectionsOf('tagemage').map((def) => {
      const mine = qs.filter((q) => q.section === def.id);
      const r: SubtestResult = {
        correct: mine.filter(isCorrect).length,
        wrong: mine.filter((q) => answers[q.id] !== null && answers[q.id] !== undefined && !isCorrect(q)).length,
        blank: mine.filter((q) => answers[q.id] === null || answers[q.id] === undefined).length,
      };
      return [def.id, r];
    }),
  ) as Record<TmSection, SubtestResult>;
  const official = tagemageScore(results, 'official');
  const legacy = tagemageScore(results, 'legacy');
  const detail: Record<string, number> = {};
  for (const [k, v] of Object.entries(official.subtests)) detail[k] = v;
  for (const d of Object.keys(TM_DOMAINS) as (keyof typeof TM_DOMAINS)[]) detail[`domain:${d}`] = official.domains[d];
  return { total: official.total, max: 600, parts, detail, legacyTotal: legacy.total };
}
