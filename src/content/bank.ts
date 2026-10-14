/**
 * Chargement de la banque de questions à l'exécution. Les fichiers JSON de content/ sont
 * intégrés au build par Vite (un module par fichier, pré-caché par le service worker) :
 * aucun appel réseau externe.
 */
import {
  ContentFile,
  Curriculum,
  type Curriculum as TCurriculum,
  type ExamId,
  type Group,
  type Pool,
  type Question,
  type SectionId,
} from './schema';

export interface Bank {
  exam: ExamId;
  curriculum: TCurriculum;
  questions: Question[];
  byId: Map<string, Question>;
  groups: Map<string, Group>;
  /** Questions de chaque groupe, dans l'ordre des identifiants. */
  groupQuestions: Map<string, Question[]>;
}

type Loader = () => Promise<unknown>;

// Chemins relatifs à la racine du projet.
const modules = import.meta.glob('/content/**/*.json', { import: 'default' }) as Record<string, Loader>;

const cache = new Map<ExamId, Promise<Bank>>();

export function buildBank(exam: ExamId, rawFiles: unknown[], rawCurriculum: unknown): Bank {
  const curriculum = Curriculum.parse(rawCurriculum);
  const questions: Question[] = [];
  const groups = new Map<string, Group>();
  for (const raw of rawFiles) {
    const f = ContentFile.parse(raw);
    for (const g of f.groups) groups.set(g.id, g);
    questions.push(...f.questions);
  }
  questions.sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(questions.map((q) => [q.id, q]));
  const groupQuestions = new Map<string, Question[]>();
  for (const q of questions) {
    if (!q.groupId) continue;
    const arr = groupQuestions.get(q.groupId) ?? [];
    arr.push(q);
    groupQuestions.set(q.groupId, arr);
  }
  return { exam, curriculum, questions, byId, groups, groupQuestions };
}

export function loadBank(exam: ExamId): Promise<Bank> {
  let p = cache.get(exam);
  if (!p) {
    p = (async () => {
      const entries = Object.entries(modules).filter(([path]) => path.startsWith(`/content/${exam}/`));
      const curriculumEntry = entries.find(([path]) => path.endsWith('curriculum.json'));
      if (!curriculumEntry) throw new Error(`Curriculum introuvable pour ${exam}`);
      const files = await Promise.all(entries.filter(([p2]) => p2 !== curriculumEntry[0]).map(([, load]) => load()));
      const curriculum = await curriculumEntry[1]();
      return buildBank(exam, files, curriculum);
    })();
    cache.set(exam, p);
  }
  return p;
}

export function poolOf(bank: Bank, q: Question): Pool {
  if (q.pool) return q.pool;
  if (q.groupId) return bank.groups.get(q.groupId)?.pool ?? 'practice';
  return 'practice';
}

export function sectionQuestions(bank: Bank, section: SectionId): Question[] {
  return bank.questions.filter((q) => q.section === section);
}

export function skillLabel(bank: Bank, skill: string): string {
  return bank.curriculum.skills[skill]?.label ?? skill;
}

export function skillTip(bank: Bank, skill: string): string | undefined {
  return bank.curriculum.skills[skill]?.tip;
}
