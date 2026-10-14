/**
 * Estimation du score TOEIC Listening & Reading.
 *
 * ETS ne publie pas de table de conversion : chaque version du test est égalisée. Les points
 * d'ancrage ci-dessous reproduisent l'allure des tables indicatives utilisées en préparation
 * (relation non linéaire, plafond atteint avant 100 % de réussite en Listening). Le résultat
 * est TOUJOURS présenté comme une estimation (voir docs/FORMATS_OFFICIELS.md §1.4).
 */

type Anchor = readonly [raw: number, scaled: number];

const LISTENING: readonly Anchor[] = [
  [0, 5], [5, 5], [10, 25], [20, 85], [30, 140], [40, 200], [50, 255],
  [60, 310], [70, 365], [80, 415], [90, 460], [96, 495], [100, 495],
];

const READING: readonly Anchor[] = [
  [0, 5], [5, 5], [10, 15], [20, 65], [30, 120], [40, 175], [50, 230],
  [60, 285], [70, 340], [80, 395], [90, 445], [97, 495], [100, 495],
];

function interpolate(table: readonly Anchor[], raw: number): number {
  const r = Math.max(0, Math.min(100, raw));
  for (let i = 1; i < table.length; i++) {
    const [r0, s0] = table[i - 1];
    const [r1, s1] = table[i];
    if (r <= r1) {
      const t = r1 === r0 ? 0 : (r - r0) / (r1 - r0);
      return s0 + t * (s1 - s0);
    }
  }
  return table[table.length - 1][1];
}

/** Arrondi au multiple de 5 le plus proche, comme les scores officiels. */
const round5 = (x: number) => Math.round(x / 5) * 5;

export function scaleListening(raw: number): number {
  return Math.max(5, Math.min(495, round5(interpolate(LISTENING, raw))));
}

export function scaleReading(raw: number): number {
  return Math.max(5, Math.min(495, round5(interpolate(READING, raw))));
}

export interface ToeicScore {
  listeningRaw: number;
  readingRaw: number;
  listening: number;
  reading: number;
  total: number;
}

/** `listeningCorrect` et `readingCorrect` sur 100 questions chacun. */
export function toeicScore(listeningCorrect: number, readingCorrect: number): ToeicScore {
  const listening = scaleListening(listeningCorrect);
  const reading = scaleReading(readingCorrect);
  return { listeningRaw: listeningCorrect, readingRaw: readingCorrect, listening, reading, total: listening + reading };
}

/** Estimation à partir d'un taux de réussite à l'entraînement (0-1) par section. */
export function toeicEstimateFromAccuracy(listeningAcc: number, readingAcc: number): ToeicScore {
  return toeicScore(Math.round(listeningAcc * 100), Math.round(readingAcc * 100));
}

/** Correspondance indicative avec le CECRL (seuils publiés par ETS pour le L&R). */
export function toeicCefr(listening: number, reading: number): string {
  const l = listening >= 490 ? 'C1' : listening >= 400 ? 'B2' : listening >= 275 ? 'B1' : listening >= 110 ? 'A2' : 'A1';
  const r = reading >= 455 ? 'C1' : reading >= 385 ? 'B2' : reading >= 275 ? 'B1' : reading >= 115 ? 'A2' : 'A1';
  return `Listening ${l} · Reading ${r}`;
}
