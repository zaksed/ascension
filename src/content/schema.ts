/**
 * Schéma Zod de la banque de questions.
 * Toute question ou tout groupe (document partagé par plusieurs questions) des fichiers
 * content/**\/*.json doit respecter ce schéma ; `npm run validate` le vérifie, ainsi que les tests.
 */
import { z } from 'zod';

export const EXAMS = ['toeic', 'tagemage'] as const;
export const TOEIC_SECTIONS = ['part1', 'part2', 'part3', 'part4', 'part5', 'part6', 'part7'] as const;
export const TM_SECTIONS = [
  'comprehension',
  'calcul',
  'raisonnement',
  'conditions-minimales',
  'expression',
  'logique',
] as const;

export const ExamId = z.enum(EXAMS);
export const ToeicSection = z.enum(TOEIC_SECTIONS);
export const TmSection = z.enum(TM_SECTIONS);
export const SectionId = z.union([ToeicSection, TmSection]);

/** practice = parcours et entraînement ; mock1/mock2 = réservées aux examens blancs n°1 et n°2. */
export const Pool = z.enum(['practice', 'mock1', 'mock2']);

/** Voix de synthèse : accent + genre. */
export const Voice = z.enum(['US-F', 'US-M', 'UK-F', 'UK-M', 'AU-F', 'AU-M', 'CA-F', 'CA-M']);

export const SpokenLine = z.object({
  speaker: z.string().optional(),
  voice: Voice,
  text: z.string().min(1),
});

const TableMedia = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  /** Vide pour une grille sans en-tête (matrices de la Logique). */
  headers: z.array(z.string()).default([]),
  rows: z.array(z.array(z.string())).min(1),
  alt: z.string().optional(),
});

export const Media = z.discriminatedUnion('type', [
  /** Illustration SVG originale de la Partie 1, dessinée par le composant src/features/toeic/scenes. */
  z.object({ type: z.literal('scene'), scene: z.string().min(2), alt: z.string().min(20) }),
  TableMedia,
  /** Suite de dominos (Logique). "?" = case à trouver. */
  z.object({
    type: z.literal('dominoes'),
    items: z.array(z.tuple([z.union([z.number().int(), z.literal('?')]), z.union([z.number().int(), z.literal('?')])])).min(3),
    alt: z.string().min(10),
  }),
  /** SVG en ligne (figures géométriques, matrices). */
  z.object({ type: z.literal('svg'), svg: z.string().startsWith('<svg'), alt: z.string().min(10) }),
]);

export const PassageKind = z.enum([
  'email',
  'letter',
  'memo',
  'notice',
  'advertisement',
  'article',
  'chat',
  'text-message',
  'form',
  'invoice',
  'schedule',
  'webpage',
  'review',
  'text',
]);

/**
 * Document écrit. Conventions dans `body` :
 * - paragraphes séparés par une ligne vide ;
 * - `{{1}}`…`{{4}}` : blanc de la Partie 6 correspondant à la 1re…4e question du groupe ;
 * - `[[1]]`…`[[4]]` : positions d'insertion de phrase (Partie 6/7) ;
 * - chat : une ligne par message, au format « Nom (10:02) : texte ».
 */
export const Passage = z.object({
  kind: PassageKind,
  title: z.string().optional(),
  meta: z.record(z.string(), z.string()).optional(),
  body: z.string().min(1),
  table: TableMedia.optional(),
});

/**
 * Vérification automatique d'une réponse mathématique (TAGE MAGE).
 * - expr : expression JS calculant la réponse ; `values` = valeur numérique de chaque option.
 * - sequence : une ou plusieurs suites (règle n => terme, n commence à 1), `values` = prochain terme par option.
 * - sufficiency : conditions minimales vérifiées par énumération exhaustive d'un domaine.
 * - manual : raisonnement non numérique, justifié dans `reason`.
 */
export const Verification = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('expr'),
    expr: z.string().min(1),
    values: z.array(z.number()),
    tolerance: z.number().positive().optional(),
  }),
  z.object({
    kind: z.literal('sequence'),
    series: z.array(z.object({ rule: z.string(), shown: z.array(z.number()) })).min(1),
    /** Pour chaque option, le(s) terme(s) suivant(s) proposé(s), un par suite. */
    values: z.array(z.array(z.number())),
  }),
  z.object({
    kind: z.literal('sufficiency'),
    /** Domaine de chaque variable : "int:a..b" ou "step:a..b:pas". */
    vars: z.record(z.string(), z.string()),
    base: z.string().optional(),
    s1: z.string(),
    s2: z.string(),
    /** Expression dont on cherche la valeur unique (nombre ou booléen). */
    target: z.string(),
  }),
  z.object({ kind: z.literal('manual'), reason: z.string().min(10) }),
]);

export const ListeningSpec = z.object({
  /** Ce qui est entendu avant les options (vide en Partie 1). */
  script: z.array(SpokenLine),
  /** Les options sont-elles lues à voix haute (Parties 1 et 2) ? */
  readOptions: z.boolean(),
  optionsVoice: Voice.optional(),
});

const ID_RE = /^(toeic-p[1-7]|tm-(ct|calc|rais|cm|expr|log))-(g)?\d{4}$/;

export const GroupKind = z.enum([
  'conversation',
  'talk',
  'text-completion',
  'single-passage',
  'double-passage',
  'triple-passage',
  'reading-text',
]);

export const Group = z.object({
  id: z.string().regex(ID_RE),
  exam: ExamId,
  section: SectionId,
  pool: Pool.default('practice'),
  kind: GroupKind,
  title: z.string().optional(),
  /** Consigne affichée, ex. « Questions 32-34 refer to the following conversation. » */
  intro: z.string().optional(),
  transcript: z.array(SpokenLine).optional(),
  passages: z.array(Passage).optional(),
  media: Media.optional(),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string()).default([]),
});

export const Question = z.object({
  id: z.string().regex(ID_RE),
  exam: ExamId,
  section: SectionId,
  skill: z.string().min(2),
  difficulty: z.number().int().min(1).max(5),
  prompt: z.string(),
  options: z.array(z.string().min(1)).min(3).max(5),
  answer: z.number().int().min(0),
  explanation: z.string().min(20),
  trap: z.string().min(5),
  tip: z.string().optional(),
  recommendedSeconds: z.number().int().min(5).max(900),
  tags: z.array(z.string()).min(1),
  groupId: z.string().optional(),
  pool: Pool.optional(),
  media: Media.optional(),
  listening: ListeningSpec.optional(),
  verification: Verification.optional(),
});

export const ContentFile = z.object({
  version: z.number().int().min(1),
  exam: ExamId,
  section: SectionId,
  description: z.string().optional(),
  groups: z.array(Group).default([]),
  questions: z.array(Question).min(1),
});

export const SkillInfo = z.object({
  label: z.string(),
  section: SectionId,
  tip: z.string().min(10),
});

export const Unit = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  sections: z.array(SectionId).min(1),
  skills: z.array(z.string()).min(1),
  lessons: z.number().int().min(1).max(8),
  /** Niveau de difficulté de référence (1-5), utilisé par le test de placement. */
  level: z.number().int().min(1).max(5),
  /** Restreint l'unité à certains types de documents (ex. documents multiples de la Partie 7). */
  groupKinds: z.array(GroupKind).optional(),
});

export const Curriculum = z.object({
  version: z.number().int(),
  exam: ExamId,
  skills: z.record(z.string(), SkillInfo),
  units: z.array(Unit).min(1),
});

export type ExamId = z.infer<typeof ExamId>;
export type SectionId = z.infer<typeof SectionId>;
export type ToeicSection = z.infer<typeof ToeicSection>;
export type TmSection = z.infer<typeof TmSection>;
export type Pool = z.infer<typeof Pool>;
export type Voice = z.infer<typeof Voice>;
export type SpokenLine = z.infer<typeof SpokenLine>;
export type Media = z.infer<typeof Media>;
export type TableMedia = z.infer<typeof TableMedia>;
export type Passage = z.infer<typeof Passage>;
export type Verification = z.infer<typeof Verification>;
export type Group = z.infer<typeof Group>;
export type GroupKindT = z.infer<typeof GroupKind>;
export type Question = z.infer<typeof Question>;
export type ContentFile = z.infer<typeof ContentFile>;
export type Curriculum = z.infer<typeof Curriculum>;
export type Unit = z.infer<typeof Unit>;
export type SkillInfo = z.infer<typeof SkillInfo>;

/** Nombre d'options attendu selon l'examen et la partie. */
export function expectedOptionCount(exam: ExamId, section: SectionId): number {
  if (exam === 'tagemage') return 5;
  return section === 'part2' ? 3 : 4;
}

/** Préfixe d'identifiant attendu selon la section. */
export function idPrefix(exam: ExamId, section: SectionId): string {
  if (exam === 'toeic') return `toeic-p${section.replace('part', '')}`;
  const map: Record<TmSection, string> = {
    comprehension: 'tm-ct',
    calcul: 'tm-calc',
    raisonnement: 'tm-rais',
    'conditions-minimales': 'tm-cm',
    expression: 'tm-expr',
    logique: 'tm-log',
  };
  return map[section as TmSection];
}
