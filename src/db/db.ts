/**
 * Stockage local (IndexedDB via Dexie). Toutes les données restent sur l'appareil ;
 * l'export/import JSON (src/features/settings/backup.ts) permet de changer d'appareil.
 */
import Dexie, { type Table } from 'dexie';
import type { ExamId, SectionId, Voice } from '../content/schema';
import type { SrsCard } from '../features/srs/sm2';
import type { LessonProgress } from '../features/course/progress';
import type { DayRecord } from '../features/gamification/streak';

export type Mode = 'lesson' | 'review' | 'training' | 'flash' | 'placement' | 'mock';

export interface AttemptRecord {
  id?: number;
  qid: string;
  exam: ExamId;
  section: SectionId;
  skill: string;
  correct: boolean;
  /** Index de l'option choisie, null si sans réponse (examen blanc). */
  choice: number | null;
  ms: number;
  mode: Mode;
  at: string;
  day: string;
}

export interface MockAttempt {
  id: string;
  exam: ExamId;
  mockId: string;
  status: 'in-progress' | 'done' | 'abandoned';
  startedAt: string;
  finishedAt?: string;
  questionIds: string[];
  answers: Record<string, number | null>;
  times: Record<string, number>;
  flagged: string[];
  /** Indice de la section en cours et secondes restantes par section (reprise). */
  sectionIndex: number;
  remaining: Record<string, number>;
  /** Position dans la section d'écoute (TOEIC), pour reprendre au bon item. */
  listeningIndex?: number;
  result?: MockResult;
}

export interface MockResult {
  total: number;
  max: number;
  parts: { id: string; label: string; correct: number; total: number; seconds: number }[];
  detail: Record<string, number>;
  legacyTotal?: number;
}

export interface ReportRecord {
  id?: number;
  qid: string;
  exam: ExamId;
  category: string;
  comment: string;
  at: string;
}

export interface BadgeRecord {
  id: string;
  earnedAt: string;
}

export interface KvRecord {
  key: string;
  value: unknown;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  dailyGoal: number;
  sound: boolean;
  animations: boolean;
  autoFreeze: boolean;
  speechRate: number;
  voicePrefs: Partial<Record<Voice, string>>;
  /** Mode facile : afficher le texte des options des Parties 1 et 2 avant de répondre. */
  showListeningText: boolean;
  includeMockQuestions: boolean;
  unlockAll: boolean;
  /** Affiche aussi le score TAGE MAGE selon l'ancien barème (+4/−1), pour comparaison. */
  showLegacyTmScore: boolean;
  targets: Record<ExamId, { score: number; date?: string }>;
  activeExam: ExamId;
}

export interface Profile {
  totalXp: number;
  placementDone: ExamId[];
  completedMocks: string[];
  createdAt: string;
  reviewsDone: number;
  perfectLessons: number;
  lessonsCompleted: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  dailyGoal: 60,
  sound: true,
  animations: true,
  autoFreeze: true,
  speechRate: 1,
  voicePrefs: {},
  showListeningText: false,
  includeMockQuestions: false,
  unlockAll: false,
  showLegacyTmScore: false,
  targets: { toeic: { score: 850 }, tagemage: { score: 400 } },
  activeExam: 'toeic',
};

export const DEFAULT_PROFILE: Profile = {
  totalXp: 0,
  placementDone: [],
  completedMocks: [],
  createdAt: new Date().toISOString(),
  reviewsDone: 0,
  perfectLessons: 0,
  lessonsCompleted: 0,
};

export class AscensionDB extends Dexie {
  attempts!: Table<AttemptRecord, number>;
  srs!: Table<SrsCard, string>;
  lessons!: Table<LessonProgress, string>;
  days!: Table<DayRecord, string>;
  exams!: Table<MockAttempt, string>;
  reports!: Table<ReportRecord, number>;
  kv!: Table<KvRecord, string>;
  badges!: Table<BadgeRecord, string>;

  constructor(name = 'ascension') {
    super(name);
    this.version(1).stores({
      attempts: '++id, qid, exam, section, skill, mode, day',
      srs: 'qid, exam, due',
      lessons: 'key, exam, unitId',
      days: 'day',
      exams: 'id, exam, mockId, status',
      reports: '++id, qid, exam',
      kv: 'key',
      badges: 'id',
    });
  }
}

export const db = new AscensionDB();

export const TABLES = ['attempts', 'srs', 'lessons', 'days', 'exams', 'reports', 'kv', 'badges'] as const;
export type TableName = (typeof TABLES)[number];

export async function getKv<T>(key: string, fallback: T): Promise<T> {
  const rec = await db.kv.get(key);
  return rec ? ({ ...fallback, ...(rec.value as object) } as T) : fallback;
}

export async function setKv<T>(key: string, value: T): Promise<void> {
  await db.kv.put({ key, value });
}
