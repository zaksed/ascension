/**
 * Définition des formats d'examen, issue de docs/FORMATS_OFFICIELS.md (vérifié le 13/10/2026).
 * Toute modification du format officiel doit être répercutée ici ET dans ce document.
 */
import type { ExamId, SectionId } from './schema';

export type Domain = 'listening' | 'reading' | 'verbal' | 'problemes' | 'logique';

export interface SectionDef {
  id: SectionId;
  exam: ExamId;
  label: string;
  short: string;
  domain: Domain;
  /** Nombre de questions dans un examen blanc. */
  mockCount: number;
  /** Nombre de groupes (documents) dans un examen blanc, si la partie est organisée en groupes. */
  mockGroups?: number;
  /** Taille attendue de chaque groupe (nombre de questions), si fixe. */
  groupSize?: number;
  directions: string;
}

export const APP_NAME = 'Ascension';

export const TOEIC_SECTIONS_DEF: SectionDef[] = [
  {
    id: 'part1',
    exam: 'toeic',
    label: 'Partie 1 — Photographies',
    short: 'P1',
    domain: 'listening',
    mockCount: 6,
    directions:
      'For each question, you will hear four statements about a picture. Select the one statement that best describes what you see in the picture. The statements will be spoken only one time.',
  },
  {
    id: 'part2',
    exam: 'toeic',
    label: 'Partie 2 — Questions-réponses',
    short: 'P2',
    domain: 'listening',
    mockCount: 25,
    directions:
      'You will hear a question or statement and three responses. Select the best response to the question or statement. They will be spoken only one time.',
  },
  {
    id: 'part3',
    exam: 'toeic',
    label: 'Partie 3 — Conversations',
    short: 'P3',
    domain: 'listening',
    mockCount: 39,
    mockGroups: 13,
    groupSize: 3,
    directions:
      'You will hear some conversations between two or more people. You will be asked to answer three questions about what the speakers say in each conversation. The conversations will be spoken only one time.',
  },
  {
    id: 'part4',
    exam: 'toeic',
    label: 'Partie 4 — Exposés',
    short: 'P4',
    domain: 'listening',
    mockCount: 30,
    mockGroups: 10,
    groupSize: 3,
    directions:
      'You will hear some talks given by a single speaker. You will be asked to answer three questions about what the speaker says in each talk. The talks will be spoken only one time.',
  },
  {
    id: 'part5',
    exam: 'toeic',
    label: 'Partie 5 — Phrases à compléter',
    short: 'P5',
    domain: 'reading',
    mockCount: 30,
    directions:
      'A word, phrase, or sentence is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence.',
  },
  {
    id: 'part6',
    exam: 'toeic',
    label: 'Partie 6 — Textes à compléter',
    short: 'P6',
    domain: 'reading',
    mockCount: 16,
    mockGroups: 4,
    groupSize: 4,
    directions:
      'Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices for each question are given below the text. Select the best answer to complete the text.',
  },
  {
    id: 'part7',
    exam: 'toeic',
    label: 'Partie 7 — Compréhension écrite',
    short: 'P7',
    domain: 'reading',
    mockCount: 54,
    directions:
      'In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question.',
  },
];

export const TM_SECTIONS_DEF: SectionDef[] = [
  {
    id: 'comprehension',
    exam: 'tagemage',
    label: 'Compréhension de textes',
    short: 'CT',
    domain: 'verbal',
    mockCount: 15,
    mockGroups: 3,
    groupSize: 5,
    directions: 'Lisez chaque texte puis répondez aux questions. Une seule réponse est correcte pour chaque question.',
  },
  {
    id: 'calcul',
    exam: 'tagemage',
    label: 'Calcul',
    short: 'Calc',
    domain: 'problemes',
    mockCount: 15,
    directions: 'Calculatrice interdite. Une seule réponse est correcte pour chaque question.',
  },
  {
    id: 'raisonnement',
    exam: 'tagemage',
    label: 'Raisonnement & Argumentation',
    short: 'R&A',
    domain: 'logique',
    mockCount: 15,
    directions: 'Lisez chaque énoncé et choisissez la proposition la plus juste.',
  },
  {
    id: 'conditions-minimales',
    exam: 'tagemage',
    label: 'Conditions minimales',
    short: 'CM',
    domain: 'problemes',
    mockCount: 15,
    directions:
      'A : (1) suffit seule mais pas (2). B : (2) suffit seule mais pas (1). C : (1) et (2) ensemble suffisent, aucune seule. D : chacune suffit séparément. E : même ensemble, elles ne suffisent pas.',
  },
  {
    id: 'expression',
    exam: 'tagemage',
    label: 'Expression',
    short: 'Expr',
    domain: 'verbal',
    mockCount: 15,
    directions: 'Choisissez la proposition correcte ou la plus appropriée.',
  },
  {
    id: 'logique',
    exam: 'tagemage',
    label: 'Logique',
    short: 'Log',
    domain: 'logique',
    mockCount: 15,
    directions: 'Trouvez l’élément qui complète logiquement la série, ou l’intrus.',
  },
];

export const ALL_SECTIONS_DEF = [...TOEIC_SECTIONS_DEF, ...TM_SECTIONS_DEF];

export function sectionsOf(exam: ExamId): SectionDef[] {
  return exam === 'toeic' ? TOEIC_SECTIONS_DEF : TM_SECTIONS_DEF;
}

export function sectionDef(id: SectionId): SectionDef {
  const def = ALL_SECTIONS_DEF.find((s) => s.id === id);
  if (!def) throw new Error(`Section inconnue : ${id}`);
  return def;
}

export const EXAM_LABEL: Record<ExamId, string> = {
  toeic: 'TOEIC Listening & Reading',
  tagemage: 'TAGE MAGE',
};

/** Chronométrage officiel des examens blancs. */
export const TIMING = {
  toeicTotalSeconds: 120 * 60,
  toeicReadingSeconds: 75 * 60,
  /** Fenêtres de réponse après l'audio (approximation du test réel, voir FORMATS_OFFICIELS §1.5). */
  toeicAnswerWindowSeconds: { part1: 6, part2: 6, perQuestionPart34: 9, graphicBonus: 4 },
  tmSubtestSeconds: 20 * 60,
} as const;

/** Composition des documents multiples de la Partie 7 dans un examen blanc. */
export const TOEIC_P7_MOCK = { singleQuestions: 29, multipleGroups: 5, doubleGroups: 2, tripleGroups: 3 } as const;

export const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
