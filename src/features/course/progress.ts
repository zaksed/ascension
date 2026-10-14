/**
 * Progression sur la carte du parcours : déblocage des unités et des leçons, couronnes.
 * Rien n'est jamais bloqué par un paiement : le réglage « tout débloquer » ouvre tout,
 * et le test de placement permet de sauter des unités.
 */
import type { Curriculum, ExamId, Unit } from '../../content/schema';

export interface LessonProgress {
  key: string;
  exam: ExamId;
  unitId: string;
  lesson: number;
  crowns: number;
  completions: number;
  bestAccuracy: number;
  lastAt: string;
  /** « placement » si la leçon a été validée par le test de placement. */
  source?: 'lesson' | 'placement';
}

export const lessonKey = (unitId: string, lesson: number) => `${unitId}#${lesson}`;

export interface LessonStatus {
  index: number;
  crowns: number;
  unlocked: boolean;
  completed: boolean;
}

export interface UnitStatus {
  unit: Unit;
  index: number;
  unlocked: boolean;
  completed: boolean;
  crowns: number;
  maxCrowns: number;
  lessons: LessonStatus[];
}

export function courseStatus(
  curriculum: Curriculum,
  progress: ReadonlyMap<string, LessonProgress>,
  unlockAll: boolean,
): UnitStatus[] {
  const out: UnitStatus[] = [];
  curriculum.units.forEach((unit, index) => {
    const prev = out[index - 1];
    const crownsOf = (i: number) => progress.get(lessonKey(unit.id, i))?.crowns ?? 0;
    const anyStarted = Array.from({ length: unit.lessons }, (_, i) => crownsOf(i)).some((c) => c > 0);
    const unlocked = unlockAll || index === 0 || !!prev?.completed || anyStarted;
    const lessons: LessonStatus[] = [];
    for (let i = 0; i < unit.lessons; i++) {
      const crowns = crownsOf(i);
      const prevDone = i === 0 || crownsOf(i - 1) > 0;
      lessons.push({ index: i, crowns, completed: crowns > 0, unlocked: unlocked && (unlockAll || prevDone || crowns > 0) });
    }
    const crowns = lessons.reduce((s, l) => s + l.crowns, 0);
    out.push({
      unit,
      index,
      unlocked,
      completed: lessons.every((l) => l.completed),
      crowns,
      maxCrowns: unit.lessons * 5,
      lessons,
    });
  });
  return out;
}

/** Prochaine leçon conseillée : la première débloquée qui a le moins de couronnes. */
export function nextLesson(status: UnitStatus[]): { unitIndex: number; lesson: number } | null {
  for (const u of status) {
    if (!u.unlocked) continue;
    const l = u.lessons.find((x) => x.unlocked && x.crowns === 0);
    if (l) return { unitIndex: u.index, lesson: l.index };
  }
  // Tout est commencé : on propose la leçon la moins couronnée.
  let best: { unitIndex: number; lesson: number; crowns: number } | null = null;
  for (const u of status) {
    for (const l of u.lessons) {
      if (l.unlocked && l.crowns < 5 && (!best || l.crowns < best.crowns)) best = { unitIndex: u.index, lesson: l.index, crowns: l.crowns };
    }
  }
  return best ? { unitIndex: best.unitIndex, lesson: best.lesson } : null;
}
