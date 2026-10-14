/**
 * Contrôles de cohérence de la banque de questions (au-delà du schéma Zod).
 * Fonctions pures : utilisées par scripts/validate-content.ts et par les tests Vitest.
 */
import {
  ContentFile,
  Curriculum,
  expectedOptionCount,
  idPrefix,
  type ContentFile as TContentFile,
  type Curriculum as TCurriculum,
  type Group,
  type Pool,
  type Question,
} from './schema';
import { sectionsOf, TOEIC_P7_MOCK, type SectionDef } from './exams';
import { verifyQuestion } from './verify';

export interface RawFile {
  path: string;
  data: unknown;
}

export interface CheckReport {
  errors: string[];
  warnings: string[];
  stats: Record<string, unknown>;
  files: TContentFile[];
  curricula: TCurriculum[];
  verified: { auto: number; manual: number; byKind: Record<string, number> };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function questionPool(q: Question, groups: Map<string, Group>): Pool {
  if (q.pool) return q.pool;
  if (q.groupId) return groups.get(q.groupId)?.pool ?? 'practice';
  return 'practice';
}

export function runChecks(contentFiles: RawFile[], curriculumFiles: RawFile[]): CheckReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files: TContentFile[] = [];
  const curricula: TCurriculum[] = [];
  const verified = { auto: 0, manual: 0, byKind: {} as Record<string, number> };

  // 1. Schéma
  for (const f of contentFiles) {
    const r = ContentFile.safeParse(f.data);
    if (!r.success) {
      for (const issue of r.error.issues.slice(0, 15)) {
        errors.push(`${f.path} : ${issue.path.join('.')} — ${issue.message}`);
      }
      continue;
    }
    files.push(r.data);
  }
  for (const f of curriculumFiles) {
    const r = Curriculum.safeParse(f.data);
    if (!r.success) {
      for (const issue of r.error.issues.slice(0, 15)) errors.push(`${f.path} : ${issue.path.join('.')} — ${issue.message}`);
      continue;
    }
    curricula.push(r.data);
  }

  // 2. Identifiants uniques, cohérence fichier / question
  const ids = new Set<string>();
  const groups = new Map<string, Group>();
  const questions: Question[] = [];
  const groupQuestions = new Map<string, Question[]>();
  for (const file of files) {
    for (const g of file.groups) {
      if (ids.has(g.id)) errors.push(`Identifiant en double : ${g.id}`);
      ids.add(g.id);
      groups.set(g.id, g);
      if (g.exam !== file.exam || g.section !== file.section) errors.push(`${g.id} : examen/section ≠ fichier`);
      if (!g.id.startsWith(idPrefix(g.exam, g.section) + '-g')) errors.push(`${g.id} : préfixe attendu ${idPrefix(g.exam, g.section)}-g`);
    }
    for (const q of file.questions) {
      if (ids.has(q.id)) errors.push(`Identifiant en double : ${q.id}`);
      ids.add(q.id);
      questions.push(q);
      if (q.exam !== file.exam || q.section !== file.section) errors.push(`${q.id} : examen/section ≠ fichier`);
      if (!q.id.startsWith(idPrefix(q.exam, q.section) + '-') || /-g\d{4}$/.test(q.id)) {
        errors.push(`${q.id} : préfixe attendu ${idPrefix(q.exam, q.section)}-NNNN`);
      }
    }
  }

  // 3. Règles par question
  const prompts = new Map<string, string>();
  for (const q of questions) {
    const n = expectedOptionCount(q.exam, q.section);
    if (q.options.length !== n) errors.push(`${q.id} : ${q.options.length} options au lieu de ${n}`);
    if (q.answer >= q.options.length) errors.push(`${q.id} : index de réponse hors limites`);
    const normalized = q.options.map(norm);
    if (new Set(normalized).size !== normalized.length) errors.push(`${q.id} : options en double`);
    if (q.groupId) {
      const g = groups.get(q.groupId);
      if (!g) errors.push(`${q.id} : groupe ${q.groupId} introuvable`);
      else {
        if (g.section !== q.section) errors.push(`${q.id} : section ≠ groupe`);
        if (q.pool && q.pool !== g.pool) errors.push(`${q.id} : pool ${q.pool} ≠ pool du groupe ${g.pool}`);
        const arr = groupQuestions.get(g.id) ?? [];
        arr.push(q);
        groupQuestions.set(g.id, arr);
      }
    }
    // Doublons d'énoncé (hors questions de groupe, dont l'énoncé peut être générique)
    if (!q.groupId && q.prompt.length > 15 && !['conditions-minimales', 'part1'].includes(q.section)) {
      // Les énoncés génériques (« Quelle phrase est correcte ? », dominos, tableaux) se distinguent
      // par leur illustration ou leurs propositions : on compare donc l'ensemble.
      const key = norm(q.prompt) + (q.media ? JSON.stringify(q.media) : '') + '|' + q.options.map(norm).sort().join('|');
      if (prompts.has(key)) errors.push(`${q.id} : même énoncé que ${prompts.get(key)}`);
      prompts.set(key, q.id);
    }
    if (q.explanation.trim() === q.trap.trim()) warnings.push(`${q.id} : explication identique au piège`);

    // Spécificités par partie
    switch (q.section) {
      case 'part1':
        if (q.media?.type !== 'scene') errors.push(`${q.id} : la Partie 1 exige une illustration (media.scene)`);
        if (!q.listening?.readOptions) errors.push(`${q.id} : options lues attendues (Partie 1)`);
        break;
      case 'part2':
        if (!q.listening || q.listening.script.length === 0 || !q.listening.readOptions) {
          errors.push(`${q.id} : la Partie 2 exige un script audio et des options lues`);
        }
        break;
      case 'part3':
      case 'part4':
      case 'part6':
      case 'part7':
      case 'comprehension':
        if (!q.groupId) errors.push(`${q.id} : cette partie exige un groupe (document partagé)`);
        break;
      case 'conditions-minimales': {
        const std = ['A', 'B', 'C', 'D', 'E'];
        if (!q.options.every((o, i) => o.trim().startsWith(std[i]))) {
          warnings.push(`${q.id} : options attendues sous la forme standard A–E`);
        }
        break;
      }
      default:
        break;
    }

    // Vérification mathématique
    const mathSections = ['calcul', 'conditions-minimales', 'logique'];
    if (mathSections.includes(q.section)) {
      if (!q.verification) errors.push(`${q.id} : vérification par script obligatoire en ${q.section}`);
      else if (q.section === 'calcul' && q.verification.kind === 'manual') {
        errors.push(`${q.id} : une question de calcul ne peut pas être validée manuellement`);
      }
    }
    if (q.verification) {
      verified.byKind[q.verification.kind] = (verified.byKind[q.verification.kind] ?? 0) + 1;
      if (q.verification.kind === 'manual') verified.manual++;
      else verified.auto++;
      const res = verifyQuestion(q);
      if (res && !res.ok) errors.push(`${q.id} : vérification échouée — ${res.messages.join(' | ')}`);
    }
  }

  // 4. Règles par groupe
  for (const g of groups.values()) {
    const qs = groupQuestions.get(g.id) ?? [];
    if (qs.length === 0) errors.push(`${g.id} : groupe sans question`);
    const size = qs.length;
    switch (g.section) {
      case 'part3':
      case 'part4':
        if (!g.transcript?.length) errors.push(`${g.id} : transcription manquante`);
        if (size !== 3) errors.push(`${g.id} : ${size} questions au lieu de 3`);
        break;
      case 'part6': {
        if (!g.passages?.length) errors.push(`${g.id} : texte manquant`);
        if (size !== 4) errors.push(`${g.id} : ${size} questions au lieu de 4`);
        const body = g.passages?.map((p) => p.body).join('\n') ?? '';
        for (let i = 1; i <= size; i++) if (!body.includes(`{{${i}}}`)) errors.push(`${g.id} : blanc {{${i}}} absent du texte`);
        break;
      }
      case 'part7': {
        if (!g.passages?.length) errors.push(`${g.id} : document manquant`);
        const n = g.passages?.length ?? 0;
        if (g.kind === 'single-passage' && (n !== 1 || size < 2 || size > 4)) errors.push(`${g.id} : document simple = 1 texte, 2 à 4 questions`);
        if (g.kind === 'double-passage' && (n !== 2 || size !== 5)) errors.push(`${g.id} : document double = 2 textes, 5 questions`);
        if (g.kind === 'triple-passage' && (n !== 3 || size !== 5)) errors.push(`${g.id} : document triple = 3 textes, 5 questions`);
        break;
      }
      case 'comprehension':
        if (!g.passages?.length) errors.push(`${g.id} : texte manquant`);
        if (size !== 5) errors.push(`${g.id} : ${size} questions au lieu de 5`);
        break;
      default:
        break;
    }
    // Insertion de phrase : les marqueurs doivent exister dans le texte
    const body = g.passages?.map((p) => p.body).join('\n') ?? '';
    for (const q of qs) {
      if (q.skill.includes('insertion') && g.section === 'part7') {
        for (let i = 1; i <= 4; i++) if (!body.includes(`[[${i}]]`)) errors.push(`${q.id} : marqueur [[${i}]] absent du document`);
      }
    }
  }

  // 5. Compétences et curriculum
  const skillIndex = new Map<string, { exam: string; section: string }>();
  for (const c of curricula) {
    for (const [k, s] of Object.entries(c.skills)) skillIndex.set(`${c.exam}:${k}`, { exam: c.exam, section: s.section });
  }
  for (const q of questions) {
    const s = skillIndex.get(`${q.exam}:${q.skill}`);
    if (!s) errors.push(`${q.id} : compétence inconnue « ${q.skill} »`);
    else if (s.section !== q.section) errors.push(`${q.id} : compétence ${q.skill} rattachée à ${s.section}, pas à ${q.section}`);
  }
  for (const c of curricula) {
    const unitIds = new Set<string>();
    for (const u of c.units) {
      if (unitIds.has(u.id)) errors.push(`Unité en double : ${u.id}`);
      unitIds.add(u.id);
      for (const sk of u.skills) if (!c.skills[sk]) errors.push(`${u.id} : compétence inconnue ${sk}`);
      const pool = questions.filter(
        (q) => q.exam === c.exam && u.skills.includes(q.skill) && questionPool(q, groups) === 'practice',
      );
      if (pool.length < 8) warnings.push(`${u.id} : seulement ${pool.length} questions d'entraînement`);
    }
  }

  // 6. Composition des examens blancs
  const stats: Record<string, unknown> = {};
  for (const exam of ['toeic', 'tagemage'] as const) {
    const examQs = questions.filter((q) => q.exam === exam);
    stats[`${exam}.total`] = examQs.length;
    for (const def of sectionsOf(exam)) {
      const secQs = examQs.filter((q) => q.section === def.id);
      stats[`${exam}.${def.id}`] = secQs.length;
      for (const pool of ['mock1', 'mock2'] as const) {
        checkMockSection(def, pool, secQs, groups, errors, warnings);
      }
    }
    if (exam === 'toeic') {
      const listening = examQs.filter((q) => ['part1', 'part2', 'part3', 'part4'].includes(q.section)).length;
      stats['toeic.listening'] = listening;
      stats['toeic.reading'] = examQs.length - listening;
    }
  }

  // 7. Répartition des bonnes réponses (A, B, C…) par section : alerte si trop déséquilibrée
  const bySection = new Map<string, number[]>();
  for (const q of questions) {
    if (q.section === 'conditions-minimales') continue;
    const arr = bySection.get(q.section) ?? [0, 0, 0, 0, 0];
    arr[q.answer]++;
    bySection.set(q.section, arr);
  }
  for (const [sec, arr] of bySection) {
    const total = arr.reduce((a, b) => a + b, 0);
    const max = Math.max(...arr);
    if (total >= 20 && max / total > 0.4) warnings.push(`${sec} : la lettre la plus fréquente représente ${Math.round((100 * max) / total)} % des bonnes réponses`);
  }

  return { errors, warnings, stats, files, curricula, verified };
}

function checkMockSection(
  def: SectionDef,
  pool: 'mock1' | 'mock2',
  secQs: Question[],
  groups: Map<string, Group>,
  errors: string[],
  warnings: string[],
) {
  const qs = secQs.filter((q) => questionPool(q, groups) === pool);
  if (qs.length !== def.mockCount) {
    errors.push(`Examen blanc ${pool} — ${def.label} : ${qs.length} questions au lieu de ${def.mockCount}`);
    return;
  }
  const gids = [...new Set(qs.map((q) => q.groupId).filter(Boolean))] as string[];
  if (def.mockGroups && gids.length !== def.mockGroups) {
    errors.push(`Examen blanc ${pool} — ${def.label} : ${gids.length} documents au lieu de ${def.mockGroups}`);
  }
  if (def.id === 'part7') {
    const kinds = gids.map((id) => groups.get(id)?.kind);
    const single = qs.filter((q) => groups.get(q.groupId!)?.kind === 'single-passage').length;
    const doubles = kinds.filter((k) => k === 'double-passage').length;
    const triples = kinds.filter((k) => k === 'triple-passage').length;
    if (single !== TOEIC_P7_MOCK.singleQuestions) errors.push(`Examen blanc ${pool} — P7 : ${single} questions sur documents simples au lieu de 29`);
    if (doubles + triples !== TOEIC_P7_MOCK.multipleGroups) errors.push(`Examen blanc ${pool} — P7 : ${doubles + triples} séries multiples au lieu de 5`);
    if (doubles !== TOEIC_P7_MOCK.doubleGroups) warnings.push(`Examen blanc ${pool} — P7 : ${doubles} doubles (2 attendus)`);
  }
  if (def.exam === 'tagemage') {
    const diffs = new Set(qs.map((q) => q.difficulty));
    if (diffs.size < 3) warnings.push(`Examen blanc ${pool} — ${def.label} : seulement ${diffs.size} niveaux de difficulté`);
  }
}
