/**
 * Valide toute la banque de questions : schéma Zod, cohérence, composition des examens blancs
 * et vérification mathématique automatique (TAGE MAGE).
 *
 * Usage : npm run validate              (strict : échoue à la moindre erreur)
 *         npm run validate -- --partial (pendant la rédaction : composition des examens blancs en alerte)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { runChecks, type RawFile } from '../src/content/checks';

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
}

const partial = process.argv.includes('--partial');
const all = walk(CONTENT);
const load = (p: string): RawFile => {
  const text = readFileSync(p, 'utf8').replace(/^﻿/, '');
  try {
    return { path: relative(ROOT, p), data: JSON.parse(text) };
  } catch (e) {
    console.error(`✖ JSON invalide dans ${relative(ROOT, p)} : ${(e as Error).message}`);
    process.exit(1);
  }
};
const curriculumFiles = all.filter((p) => p.endsWith('curriculum.json')).map(load);
const contentFiles = all.filter((p) => !p.endsWith('curriculum.json')).map(load);

const report = runChecks(contentFiles, curriculumFiles);
let { errors } = report;
const warnings = [...report.warnings];
if (partial) {
  warnings.push(...errors.filter((e) => e.startsWith('Examen blanc')));
  errors = errors.filter((e) => !e.startsWith('Examen blanc'));
}

console.log(`\nFichiers de contenu : ${contentFiles.length} ; curriculums : ${curriculumFiles.length}`);
console.log('Statistiques :');
for (const [k, v] of Object.entries(report.stats)) console.log(`  ${k.padEnd(32)} ${v}`);
console.log(
  `Vérification par script : ${report.verified.auto} automatiques, ${report.verified.manual} manuelles ` +
    JSON.stringify(report.verified.byKind),
);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} alerte(s) :`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} erreur(s) :`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\n✔ Contenu valide.');
