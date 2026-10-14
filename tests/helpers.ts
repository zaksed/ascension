/** Chargement de la banque depuis le disque (sans import.meta.glob) pour les tests. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { buildBank, type Bank } from '../src/content/bank';
import type { RawFile } from '../src/content/checks';
import type { ExamId } from '../src/content/schema';
import type { Availability } from '../src/content/items';

const ROOT = join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
}

export function rawFiles(): { content: RawFile[]; curricula: RawFile[] } {
  const all = walk(join(ROOT, 'content')).map((p) => ({
    path: relative(ROOT, p).split(sep).join('/'),
    data: JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')) as unknown,
  }));
  return { content: all.filter((f) => !f.path.endsWith('curriculum.json')), curricula: all.filter((f) => f.path.endsWith('curriculum.json')) };
}

const cache = new Map<ExamId, Bank>();
export function testBank(exam: ExamId): Bank {
  let b = cache.get(exam);
  if (!b) {
    const { content, curricula } = rawFiles();
    const mine = content.filter((f) => f.path.startsWith(`content/${exam}/`)).map((f) => f.data);
    const cur = curricula.find((f) => f.path.startsWith(`content/${exam}/`))!.data;
    b = buildBank(exam, mine, cur);
    cache.set(exam, b);
  }
  return b;
}

export const PRACTICE_ONLY: Availability = { completedMocks: new Set(), includeMockQuestions: false };
export const EVERYTHING: Availability = { completedMocks: new Set(), includeMockQuestions: true };
