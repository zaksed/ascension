/**
 * Vérification mathématique automatique des questions TAGE MAGE (et de toute question portant
 * un champ `verification`). Utilisé par `npm run validate` et par les tests — jamais par l'app.
 *
 * Le contenu est rédigé par nous : l'évaluation par `new Function` est donc acceptable ici
 * (script de build), mais ce module ne doit pas être importé dans le bundle de l'application.
 */
import type { Question, Verification } from './schema';

const HELPERS = `
const {sqrt, abs, floor, ceil, round, min, max, pow, PI, log, log10, exp, cbrt, trunc} = Math;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const comb = (n, k) => (k < 0 || k > n) ? 0 : fact(n) / (fact(k) * fact(n - k));
const perm = (n, k) => fact(n) / fact(n - k);
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const eq = (a, b) => Math.abs(a - b) < 1e-9;
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;
const sum = (arr) => arr.reduce((s, v) => s + v, 0);
const rank = (c) => c.toUpperCase().charCodeAt(0) - 64;
const assert = (c, m) => { if (!c) throw new Error('règle non vérifiée : ' + (m || '')); return true; };
const only = (arr, pred) => { const r = arr.filter(pred); if (r.length !== 1) throw new Error('intrus non unique : [' + r.join(', ') + ']'); return r[0]; };
`;

/**
 * Compile une expression. Les aides sont déclarées dans une portée englobante : les variables
 * de l'énoncé (paramètres de la fonction interne) peuvent donc porter n'importe quel nom.
 */
function compile(params: string[], body: string): (...args: number[]) => unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(`${HELPERS}\nreturn function (${params.join(', ')}) { return (${body}); };`)() as (
    ...args: number[]
  ) => unknown;
}

export function evalExpr(expr: string): number {
  const v = compile([], expr)();
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Expression non numérique : ${expr} → ${String(v)}`);
  return v;
}

function close(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * Lit la valeur numérique d'une option rédigée en français (« 12,5 % », « 1 200 € », « 3/4 »).
 * Renvoie null si l'option n'est pas un nombre simple (ex. « 2√3 », « 1 h 30 »).
 */
export function parseOptionNumber(option: string): number | null {
  const s = option.replace(/ | /g, ' ').trim();
  const m = /^(-?\d{1,3}(?:[ ]\d{3})+|-?\d+)(?:[.,](\d+))?(?:\s*\/\s*(\d+))?\s*([^\d]*)$/.exec(s);
  if (!m) return null;
  const suffix = m[4] ?? '';
  // « 2√3 », « 3π », « 1 h 30 » : pas un nombre simple (\d ne capture pas ² ni ³).
  if (/[\d√π^×x]/.test(suffix.replace(/^\s*(cm|dm|mm|km|m)\s*$/, ''))) return null;
  const intPart = m[1].replace(/ /g, '');
  const num = Number(`${intPart}${m[2] ? '.' + m[2] : ''}`);
  if (m[3]) return num / Number(m[3]);
  return num;
}

export interface VerifyResult {
  ok: boolean;
  messages: string[];
  computed?: string;
}

function verifyExpr(q: Question, v: Extract<Verification, { kind: 'expr' }>): VerifyResult {
  const messages: string[] = [];
  if (v.values.length !== q.options.length) {
    return { ok: false, messages: [`values (${v.values.length}) ≠ nombre d'options (${q.options.length})`] };
  }
  const tol = v.tolerance ?? 1e-6;
  const computed = evalExpr(v.expr);
  if (!close(computed, v.values[q.answer], tol)) {
    messages.push(`réponse calculée ${computed} ≠ valeur de l'option correcte ${v.values[q.answer]}`);
  }
  v.values.forEach((val, i) => {
    if (i !== q.answer && close(computed, val, tol)) messages.push(`l'option ${i} vaut aussi ${val} : deux bonnes réponses`);
    const parsed = parseOptionNumber(q.options[i]);
    if (parsed !== null && !close(parsed, val, 1e-6)) {
      messages.push(`option ${i} « ${q.options[i]} » lue ${parsed} mais values[${i}] = ${val}`);
    }
  });
  return { ok: messages.length === 0, messages, computed: String(computed) };
}

function verifySequence(q: Question, v: Extract<Verification, { kind: 'sequence' }>): VerifyResult {
  const messages: string[] = [];
  if (v.values.length !== q.options.length) {
    return { ok: false, messages: [`values (${v.values.length}) ≠ nombre d'options (${q.options.length})`] };
  }
  const nexts: number[] = [];
  v.series.forEach((s, k) => {
    const rule = compile([], s.rule)() as (n: number) => number;
    if (typeof rule !== 'function') {
      messages.push(`série ${k} : la règle doit être une fonction n => …`);
      return;
    }
    s.shown.forEach((term, i) => {
      const t = rule(i + 1);
      if (!close(t, term)) messages.push(`série ${k} : terme ${i + 1} attendu ${t}, affiché ${term}`);
    });
    nexts.push(rule(s.shown.length + 1));
  });
  const matches = (vals: number[]) => vals.length === nexts.length && vals.every((x, i) => close(x, nexts[i]));
  if (!matches(v.values[q.answer])) messages.push(`terme suivant calculé [${nexts}] ≠ option correcte [${v.values[q.answer]}]`);
  v.values.forEach((vals, i) => {
    if (i !== q.answer && matches(vals)) messages.push(`l'option ${i} est aussi correcte`);
  });
  return { ok: messages.length === 0, messages, computed: `[${nexts.join(', ')}]` };
}

function parseDomain(spec: string): number[] {
  let m = /^int:(-?\d+)\.\.(-?\d+)$/.exec(spec);
  if (m) {
    const out: number[] = [];
    for (let i = Number(m[1]); i <= Number(m[2]); i++) out.push(i);
    return out;
  }
  m = /^step:(-?[\d.]+)\.\.(-?[\d.]+):([\d.]+)$/.exec(spec);
  if (m) {
    const [a, b, step] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const out: number[] = [];
    for (let k = 0; a + k * step <= b + 1e-9; k++) out.push(Math.round((a + k * step) * 1e9) / 1e9);
    return out;
  }
  m = /^set:(.+)$/.exec(spec);
  if (m) return m[1].split(',').map(Number);
  throw new Error(`Domaine invalide : ${spec}`);
}

const CM_LETTER = ['A', 'B', 'C', 'D', 'E'];

/** Calcule la lettre attendue (A–E) d'une question de conditions minimales par énumération. */
export function solveSufficiency(v: Extract<Verification, { kind: 'sufficiency' }>): { letter: string; detail: string } {
  const names = Object.keys(v.vars);
  const domains = names.map((n) => parseDomain(v.vars[n]));
  const total = domains.reduce((p, d) => p * d.length, 1);
  if (total > 6_000_000) throw new Error(`Domaine trop grand (${total} combinaisons)`);
  const base = v.base ? compile(names, v.base) : () => true;
  const s1 = compile(names, v.s1);
  const s2 = compile(names, v.s2);
  const target = compile(names, v.target);
  const set1 = new Set<string>();
  const set2 = new Set<string>();
  const set12 = new Set<string>();
  const key = (x: unknown) => (typeof x === 'number' ? String(Math.round(x * 1e9) / 1e9) : String(x));
  const idx = new Array(names.length).fill(0);
  const vals = new Array(names.length).fill(0);
  for (let c = 0; c < total; c++) {
    let r = c;
    for (let i = names.length - 1; i >= 0; i--) {
      idx[i] = r % domains[i].length;
      r = Math.floor(r / domains[i].length);
      vals[i] = domains[i][idx[i]];
    }
    if (!base(...vals)) continue;
    const a = Boolean(s1(...vals));
    const b = Boolean(s2(...vals));
    if (!a && !b) continue;
    const t = key(target(...vals));
    if (a) set1.add(t);
    if (b) set2.add(t);
    if (a && b) set12.add(t);
  }
  if (set1.size === 0 || set2.size === 0) {
    throw new Error(`Information incompatible avec l'énoncé (aucune solution) : |S1|=${set1.size}, |S2|=${set2.size}`);
  }
  if (set12.size === 0) throw new Error('Les informations (1) et (2) sont contradictoires entre elles');
  const suff1 = set1.size === 1;
  const suff2 = set2.size === 1;
  const suff12 = set12.size === 1;
  let letter: string;
  if (suff1 && suff2) letter = 'D';
  else if (suff1) letter = 'A';
  else if (suff2) letter = 'B';
  else if (suff12) letter = 'C';
  else letter = 'E';
  const show = (s: Set<string>) => (s.size <= 4 ? `{${[...s].join(', ')}}` : `${s.size} valeurs`);
  return { letter, detail: `(1)→${show(set1)} ; (2)→${show(set2)} ; (1)+(2)→${show(set12)}` };
}

function verifySufficiency(q: Question, v: Extract<Verification, { kind: 'sufficiency' }>): VerifyResult {
  const { letter, detail } = solveSufficiency(v);
  const expected = CM_LETTER[q.answer];
  const messages = letter === expected ? [] : [`énumération → ${letter}, réponse prévue ${expected} (${detail})`];
  // Les options de conditions minimales doivent être les cinq codes standard, dans l'ordre.
  return { ok: messages.length === 0, messages, computed: `${letter} ${detail}` };
}

export function verifyQuestion(q: Question): VerifyResult | null {
  const v = q.verification;
  if (!v) return null;
  try {
    switch (v.kind) {
      case 'expr':
        return verifyExpr(q, v);
      case 'sequence':
        return verifySequence(q, v);
      case 'sufficiency':
        return verifySufficiency(q, v);
      case 'manual':
        return { ok: true, messages: [], computed: 'manuel' };
    }
  } catch (e) {
    return { ok: false, messages: [(e as Error).message] };
  }
}
