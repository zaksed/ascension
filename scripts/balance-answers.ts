/**
 * Rééquilibre la position des bonnes réponses (A, B, C, D…) dans chaque section, pour éviter
 * qu'une lettre soit sur-représentée. Seule la place de la bonne option change : le texte des
 * options, l'explication et le piège restent identiques. Déterministe et idempotent.
 *
 * Exclusions : conditions minimales (codes A–E fixes), calcul et logique (options numériques
 * triées), options de position « [1] »…« [4] », et toute explication citant une lettre.
 *
 * Usage : npx tsx scripts/balance-answers.ts
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatContentFile } from './lib/json-format';

const CONTENT = join(import.meta.dirname, '..', 'content');
const EXCLUDED_SECTIONS = new Set(['conditions-minimales', 'calcul', 'logique']);

interface Q {
  id: string;
  section: string;
  options: string[];
  answer: number;
  explanation: string;
  trap: string;
  verification?: { kind: string; values?: unknown[] };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') && !p.endsWith('curriculum.json') ? [p] : [];
  });
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seedText: string) {
  let seed = [...seedText].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703);
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const eligible = (q: Q & { skill?: string }) =>
  !EXCLUDED_SECTIONS.has(q.section) &&
  // Questions sur graphique : les options suivent l'ordre du tableau, comme au test réel.
  !(q.skill ?? '').includes('graphique') &&
  !q.options.some((o) => /^\[\d\]$/.test(o.trim())) &&
  // Options chiffrées (prix, heures, quantités) : on garde l'ordre croissant d'origine.
  !q.options.every((o) => /^[$€£]?\d/.test(o.trim())) &&
  !/\(([A-E])\)|\b(réponse|option|lettre) [A-E]\b/.test(q.explanation + ' ' + q.trap);

const files = walk(CONTENT).map((path) => ({ path, data: JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) }));
const bySection = new Map<string, Q[]>();
for (const f of files) {
  for (const q of f.data.questions as Q[]) {
    if (!eligible(q)) continue;
    const arr = bySection.get(q.section) ?? [];
    arr.push(q);
    bySection.set(q.section, arr);
  }
}

let moved = 0;
for (const [section, qs] of bySection) {
  qs.sort((a, b) => a.id.localeCompare(b.id));
  const n = qs[0].options.length;
  const targets = qs.map((_, i) => i % n);
  const rand = rng(section);
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  qs.forEach((q, i) => {
    const t = targets[i];
    if (q.answer === t) return;
    const order = q.options.map((_, k) => k).filter((k) => k !== q.answer);
    order.splice(t, 0, q.answer);
    q.options = order.map((k) => q.options[k]);
    if (q.verification?.values) q.verification.values = order.map((k) => q.verification!.values![k]);
    q.answer = t;
    moved++;
  });
}

for (const f of files) writeFileSync(f.path, formatContentFile(f.data), 'utf8');
console.log(`Bonnes réponses déplacées : ${moved}`);
