/**
 * Enregistrement des réponses et de leurs effets : historique, répétition espacée,
 * statistiques du jour, XP, couronnes et badges.
 */
import { db, type AttemptRecord, type Mode, type Profile } from '../../db/db';
import type { ExamId, Question } from '../../content/schema';
import { dayKey } from '../../lib/date';
import { applyAnswer } from '../srs/sm2';
import { lessonKey, type LessonProgress } from '../course/progress';
import { nextCrowns, XP } from '../gamification/xp';
import { computeStreak, type DayRecord } from '../gamification/streak';
import { BADGES, newlyEarned, type BadgeContext, type BadgeDef } from '../gamification/badges';
import { useApp } from '../../store/app';
import type { QStat } from '../course/selection';

export interface AnswerInput {
  q: Question;
  choice: number | null;
  ms: number;
  mode: Mode;
  /** XP attribuée pour cette réponse (0 en examen blanc : l'XP est donnée à la fin). */
  xp?: number;
}

async function bumpDay(today: string, patch: (d: DayRecord) => DayRecord): Promise<DayRecord> {
  const cur = (await db.days.get(today)) ?? { day: today, xp: 0, seconds: 0, answers: 0, correct: 0 };
  const next = patch(cur);
  const goal = useApp.getState().settings.dailyGoal;
  next.goalMet = next.xp >= goal;
  await db.days.put(next);
  return next;
}

export async function addXp(amount: number): Promise<Profile> {
  const today = dayKey();
  if (amount > 0) await bumpDay(today, (d) => ({ ...d, xp: d.xp + amount }));
  return useApp.getState().updateProfile((p) => ({ ...p, totalXp: p.totalXp + amount }));
}

export async function recordAnswer(input: AnswerInput): Promise<{ correct: boolean }> {
  const { q, choice, ms, mode } = input;
  const correct = choice === q.answer;
  const now = new Date();
  const today = dayKey(now);
  const attempt: AttemptRecord = {
    qid: q.id,
    exam: q.exam,
    section: q.section,
    skill: q.skill,
    correct,
    choice,
    ms: Math.round(ms),
    mode,
    at: now.toISOString(),
    day: today,
  };
  const xp = input.xp ?? (correct ? (mode === 'review' ? XP.reviewCorrect : XP.correctAnswer) : 0);
  await db.transaction('rw', db.attempts, db.srs, db.days, async () => {
    await db.attempts.add(attempt);
    const card = await db.srs.get(q.id);
    const updated = applyAnswer(card, q.id, q.exam, correct, ms, q.recommendedSeconds, today);
    if (updated) await db.srs.put(updated);
    await bumpDay(today, (d) => ({
      ...d,
      answers: d.answers + 1,
      correct: d.correct + (correct ? 1 : 0),
      seconds: d.seconds + Math.min(ms, q.recommendedSeconds * 4000) / 1000,
      xp: d.xp + xp,
    }));
  });
  if (xp) await useApp.getState().updateProfile((p) => ({ ...p, totalXp: p.totalXp + xp }));
  if (mode === 'review' && correct) await useApp.getState().updateProfile((p) => ({ ...p, reviewsDone: p.reviewsDone + 1 }));
  return { correct };
}

export async function completeLesson(exam: ExamId, unitId: string, lesson: number, correct: number, total: number): Promise<LessonProgress> {
  const key = lessonKey(unitId, lesson);
  const accuracy = total ? correct / total : 0;
  const prev = await db.lessons.get(key);
  const next: LessonProgress = {
    key,
    exam,
    unitId,
    lesson,
    crowns: nextCrowns(prev?.crowns ?? 0, accuracy),
    completions: (prev?.completions ?? 0) + 1,
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
    lastAt: new Date().toISOString(),
    source: 'lesson',
  };
  await db.lessons.put(next);
  const bonus = XP.lessonComplete + (correct === total && total > 0 ? XP.perfectBonus : 0);
  await addXp(bonus);
  await useApp.getState().updateProfile((p) => ({
    ...p,
    lessonsCompleted: p.lessonsCompleted + 1,
    perfectLessons: p.perfectLessons + (correct === total && total > 0 ? 1 : 0),
  }));
  return next;
}

/** Statistiques par question (pour la sélection adaptative). */
export async function questionStats(exam: ExamId): Promise<Map<string, QStat>> {
  const attempts = await db.attempts.where('exam').equals(exam).toArray();
  const map = new Map<string, QStat>();
  for (const a of attempts.sort((x, y) => x.at.localeCompare(y.at))) {
    const s = map.get(a.qid) ?? { attempts: 0, correct: 0, lastCorrect: false, lastAt: a.at };
    s.attempts++;
    if (a.correct) s.correct++;
    s.lastCorrect = a.correct;
    s.lastAt = a.at;
    map.set(a.qid, s);
  }
  return map;
}

export async function dayMap(): Promise<Map<string, DayRecord>> {
  const days = await db.days.toArray();
  return new Map(days.map((d) => [d.day, d]));
}

export async function freezeDay(day: string, frozen: boolean): Promise<void> {
  const cur = (await db.days.get(day)) ?? { day, xp: 0, seconds: 0, answers: 0, correct: 0 };
  await db.days.put({ ...cur, frozen });
}

export async function badgeContext(): Promise<BadgeContext> {
  const { profile, settings } = useApp.getState();
  const [days, exams, lessons, attempts] = await Promise.all([
    dayMap(),
    db.exams.where('status').equals('done').toArray(),
    db.lessons.toArray(),
    db.attempts.toArray(),
  ]);
  const streak = computeStreak(days, dayKey(), settings.autoFreeze);
  const unitCrowns = new Map<string, number[]>();
  for (const l of lessons) unitCrowns.set(l.unitId, [...(unitCrowns.get(l.unitId) ?? []), l.crowns]);
  const toeicParts = new Set(attempts.filter((a) => a.exam === 'toeic').map((a) => a.section));
  return {
    totalXp: profile.totalXp,
    streak: streak.current,
    longestStreak: streak.longest,
    totalCorrect: attempts.filter((a) => a.correct).length,
    lessonsCompleted: profile.lessonsCompleted,
    perfectLessons: profile.perfectLessons,
    // Une unité compte si toutes ses leçons enregistrées sont à 5 couronnes (au moins 2 leçons).
    maxCrownUnits: [...unitCrowns.values()].filter((c) => c.length >= 2 && c.every((x) => x >= 5)).length,
    toeicMocks: exams.filter((e) => e.exam === 'toeic').map((e) => e.result?.total ?? 0),
    tagemageMocks: exams.filter((e) => e.exam === 'tagemage').map((e) => e.result?.total ?? 0),
    reviewsDone: profile.reviewsDone,
    toeicPartsTried: toeicParts.size,
    bestDayMinutes: Math.max(0, ...[...days.values()].map((d) => d.seconds / 60)),
    placementDone: profile.placementDone.length,
  };
}

/** Vérifie et enregistre les nouveaux badges ; renvoie ceux qui viennent d'être obtenus. */
export async function checkBadges(): Promise<BadgeDef[]> {
  const earned = new Set((await db.badges.toArray()).map((b) => b.id));
  const fresh = newlyEarned(await badgeContext(), earned);
  if (fresh.length) await db.badges.bulkPut(fresh.map((b) => ({ id: b.id, earnedAt: new Date().toISOString() })));
  return fresh;
}

export { BADGES };
