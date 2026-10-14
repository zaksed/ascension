/**
 * Score TAGE MAGE (docs/FORMATS_OFFICIELS.md §2.3).
 * Barème officiel en vigueur : +4 par bonne réponse, aucune pénalité ; sous-test sur 60 ;
 * domaine = moyenne de ses deux sous-tests ; total = moyenne des trois domaines × 10 (sur 600).
 * Le barème « ancien » (+4 / −1 / 0) est proposé uniquement à titre de comparaison.
 */
import type { TmSection } from '../../content/schema';

export type TmScheme = 'official' | 'legacy';

export interface SubtestResult {
  correct: number;
  wrong: number;
  blank: number;
}

export const TM_DOMAINS: Record<'verbal' | 'problemes' | 'logique', [TmSection, TmSection]> = {
  verbal: ['comprehension', 'expression'],
  problemes: ['calcul', 'conditions-minimales'],
  logique: ['raisonnement', 'logique'],
};

export const TM_DOMAIN_LABEL: Record<keyof typeof TM_DOMAINS, string> = {
  verbal: 'Aptitudes verbales',
  problemes: 'Résolution de problèmes',
  logique: 'Raisonnement logique',
};

export function subtestScore(r: SubtestResult, scheme: TmScheme = 'official'): number {
  return scheme === 'official' ? 4 * r.correct : 4 * r.correct - r.wrong;
}

export interface TmScore {
  subtests: Record<TmSection, number>;
  domains: Record<keyof typeof TM_DOMAINS, number>;
  total: number;
  scheme: TmScheme;
}

export function tagemageScore(results: Record<TmSection, SubtestResult>, scheme: TmScheme = 'official'): TmScore {
  const subtests = Object.fromEntries(
    (Object.keys(results) as TmSection[]).map((s) => [s, subtestScore(results[s], scheme)]),
  ) as Record<TmSection, number>;
  const domains = Object.fromEntries(
    (Object.keys(TM_DOMAINS) as (keyof typeof TM_DOMAINS)[]).map((d) => {
      const [a, b] = TM_DOMAINS[d];
      return [d, ((subtests[a] ?? 0) + (subtests[b] ?? 0)) / 2];
    }),
  ) as Record<keyof typeof TM_DOMAINS, number>;
  const avg = (domains.verbal + domains.problemes + domains.logique) / 3;
  return { subtests, domains, total: Math.round(avg * 10), scheme };
}

/** Estimation sur 600 à partir d'un taux de réussite global (barème officiel). */
export function tagemageEstimateFromAccuracy(accuracy: number): number {
  return Math.round(Math.max(0, Math.min(1, accuracy)) * 600);
}
