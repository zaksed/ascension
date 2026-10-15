import { describe, expect, it } from 'vitest';
import { runChecks } from '../src/content/checks';
import { verifyQuestion } from '../src/content/verify';
import { SCENE_IDS } from '../src/features/toeic/scenes';
import { rawFiles, testBank } from './helpers';

describe('banque de questions', () => {
  const { content, curricula } = rawFiles();
  const report = runChecks(content, curricula);

  it('passe toutes les vérifications structurelles sans erreur', () => {
    expect(report.errors).toEqual([]);
  });

  it('atteint les volumes demandés', () => {
    const toeic = testBank('toeic');
    const tm = testBank('tagemage');
    const listening = toeic.questions.filter((q) => ['part1', 'part2', 'part3', 'part4'].includes(q.section)).length;
    const reading = toeic.questions.length - listening;
    expect(listening).toBeGreaterThanOrEqual(300);
    expect(reading).toBeGreaterThanOrEqual(400);
    for (const s of ['comprehension', 'calcul', 'raisonnement', 'conditions-minimales', 'expression', 'logique']) {
      expect(tm.questions.filter((q) => q.section === s).length, s).toBeGreaterThanOrEqual(60);
    }
  });

  it('a des identifiants uniques et des réponses dans les bornes', () => {
    for (const exam of ['toeic', 'tagemage'] as const) {
      const bank = testBank(exam);
      expect(new Set(bank.questions.map((q) => q.id)).size).toBe(bank.questions.length);
      for (const q of bank.questions) {
        expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
        expect(q.answer, q.id).toBeLessThan(q.options.length);
        expect(q.explanation.length, q.id).toBeGreaterThan(10);
        expect(q.trap.length, q.id).toBeGreaterThan(5);
      }
    }
  });

  it('associe chaque photo de la Partie 1 à une illustration SVG existante', () => {
    const part1 = testBank('toeic').questions.filter((q) => q.section === 'part1');
    expect(part1.length).toBeGreaterThan(0);
    for (const q of part1) {
      expect(q.media?.type, q.id).toBe('scene');
      if (q.media?.type === 'scene') expect(SCENE_IDS, q.id).toContain(q.media.scene);
    }
  });

  it('vérifie par script toutes les questions de Calcul, Conditions minimales et Logique', () => {
    const tm = testBank('tagemage');
    for (const q of tm.questions.filter((x) => ['calcul', 'conditions-minimales', 'logique'].includes(x.section))) {
      expect(q.verification, q.id).toBeDefined();
      expect(q.verification?.kind, q.id).not.toBe('manual');
      const r = verifyQuestion(q);
      expect(r?.ok, `${q.id} : ${r?.messages.join(' ; ')}`).toBe(true);
    }
  });

  it('détecte une réponse falsifiée (le vérificateur n’est pas complaisant)', () => {
    const tm = testBank('tagemage');
    let tested = 0;
    for (const q of tm.questions.filter((x) => x.verification && x.verification.kind !== 'manual')) {
      const mutated = { ...q, answer: (q.answer + 1) % q.options.length };
      expect(verifyQuestion(mutated)?.ok, q.id).toBe(false);
      tested++;
    }
    expect(tested).toBeGreaterThanOrEqual(180);
  });

  it('répartit les bonnes réponses sans lettre dominante', () => {
    for (const exam of ['toeic', 'tagemage'] as const) {
      const qs = testBank(exam).questions.filter((q) => q.section !== 'conditions-minimales' && q.options.length >= 4);
      const counts = new Map<number, number>();
      for (const q of qs) counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
      for (const [, n] of counts) expect(n / qs.length).toBeLessThan(0.4);
    }
  });
});

describe('fiches « notion à connaître »', () => {
  it('sont valides, uniques et rattachées à des compétences existantes', async () => {
    const { readFileSync } = await import('node:fs');
    const { NotionsFile } = await import('../src/features/notions/notions');
    const file = NotionsFile.parse(JSON.parse(readFileSync(new URL('../public/notions.json', import.meta.url), 'utf8')));
    const ids = file.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const exam of ['toeic', 'tagemage'] as const) {
      const cards = file.cards.filter((c) => c.exam === exam);
      expect(cards.length, exam).toBeGreaterThanOrEqual(30);
      const skills = testBank(exam).curriculum.skills;
      for (const c of cards) if (c.skill) expect(skills[c.skill], `${c.id} : ${c.skill}`).toBeDefined();
    }
  });
});
