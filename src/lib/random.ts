/** Aléatoire déterministe (reproductible dans les tests et pour un même tirage de leçon). */

export function seedFrom(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32 */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], r: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tirage pondéré sans remise. */
export function weightedSample<T>(items: readonly T[], weight: (t: T) => number, n: number, r: Rng): T[] {
  // Méthode d'Efraimidis–Spirakis : clé = u^(1/w), on garde les plus grandes clés.
  return items
    .map((it) => ({ it, k: Math.pow(r(), 1 / Math.max(1e-6, weight(it))) }))
    .sort((a, b) => b.k - a.k)
    .slice(0, n)
    .map((x) => x.it);
}
