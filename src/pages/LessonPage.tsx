/** Leçon du parcours : 8 à 12 questions adaptées au nombre de couronnes. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useApp } from '../store/app';
import { isExamId, useAvailability, useBank } from '../hooks';
import { buildLessonItems } from '../features/course/selection';
import { lessonKey } from '../features/course/progress';
import { checkBadges, completeLesson, questionStats } from '../features/session/record';
import { ArrayProvider, SessionPlayer, type ItemProvider } from '../features/session/SessionPlayer';
import { lessonXp } from '../features/gamification/xp';
import { Spinner } from '../components/ui';
import { IconCrown } from '../components/icons';
import { BadgeToast } from './shared';

export default function LessonPage() {
  const { exam, unitId, lesson } = useParams();
  const examId = isExamId(exam) ? exam : 'toeic';
  const { bank } = useBank(examId);
  const av = useAvailability();
  const unlockAll = useApp((s) => s.settings.unlockAll);
  const [provider, setProvider] = useState<ItemProvider | null>(null);
  const [crownsBefore, setCrownsBefore] = useState(0);
  const lessonIndex = Number(lesson ?? 0);
  const unit = bank?.curriculum.units.find((u) => u.id === unitId);

  useEffect(() => {
    if (!bank || !unit) return;
    let alive = true;
    void (async () => {
      const [stats, prog] = await Promise.all([questionStats(examId), db.lessons.get(lessonKey(unit.id, lessonIndex))]);
      const crowns = prog?.crowns ?? 0;
      const items = buildLessonItems(bank, unit, lessonIndex, crowns, stats, av, String(prog?.completions ?? 0));
      if (alive) {
        setCrownsBefore(crowns);
        setProvider(new ArrayProvider(items));
      }
    })();
    return () => {
      alive = false;
    };
  }, [bank, unit, lessonIndex, examId, av, unlockAll]);

  if (!bank || !provider) return <Spinner label="Préparation de la leçon…" />;
  if (!unit) return <p>Unité introuvable.</p>;

  return (
    <SessionPlayer
      bank={bank}
      title={`${unit.title} · leçon ${lessonIndex + 1}`}
      mode="lesson"
      provider={provider}
      exitTo={`/parcours/${examId}`}
      onFinish={async (s) => {
        const prog = await completeLesson(examId, unit.id, lessonIndex, s.correct, s.answered);
        const badges = await checkBadges();
        const gained = prog.crowns > crownsBefore;
        return {
          xp: lessonXp(s.correct, s.answered),
          lines: [
            <p key="crown" className={`text-center font-semibold flex items-center justify-center gap-1.5 ${gained ? 'text-accent' : 'text-muted'}`}>
              <IconCrown size={18} />
              {gained ? `Couronne ${prog.crowns}/5 obtenue !` : prog.crowns >= 5 ? 'Leçon au niveau maximal' : 'Visez 60 % pour gagner une couronne'}
            </p>,
            ...badges.map((b) => <BadgeToast key={b.id} badge={b} />),
          ],
        };
      }}
    />
  );
}
