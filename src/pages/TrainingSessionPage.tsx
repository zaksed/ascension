/** Séance d'entraînement (partie, compétence, faiblesses ou flash). */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../db/db';
import { isExamId, useAvailability, useBank, useToday } from '../hooks';
import { buildTrainingItems, buildWeaknessItems, flashPool } from '../features/course/selection';
import { checkBadges, questionStats } from '../features/session/record';
import { ArrayProvider, LoopProvider, SessionPlayer, type ItemProvider } from '../features/session/SessionPlayer';
import { dueQueue } from '../features/srs/sm2';
import { Spinner } from '../components/ui';
import { sectionDef } from '../content/exams';
import type { SectionId } from '../content/schema';
import { BadgeToast } from './shared';

export default function TrainingSessionPage() {
  const { exam } = useParams();
  const [search] = useSearchParams();
  const examId = isExamId(exam) ? exam : 'toeic';
  const type = search.get('type') ?? 'section';
  const value = search.get('value') ?? '';
  const { bank } = useBank(examId);
  const av = useAvailability();
  const today = useToday();
  const [provider, setProvider] = useState<ItemProvider | null>(null);

  useEffect(() => {
    if (!bank) return;
    let alive = true;
    void (async () => {
      const stats = await questionStats(examId);
      const seed = `${type}-${value}-${Date.now()}`;
      let p: ItemProvider;
      if (type === 'flash') p = new LoopProvider(flashPool(bank, av, seed));
      else if (type === 'weak') {
        const cards = await db.srs.where('exam').equals(examId).toArray();
        p = new ArrayProvider(buildWeaknessItems(bank, stats, dueQueue(cards, today, 10).map((c) => c.qid), av, seed));
      } else if (type === 'skill') p = new ArrayProvider(buildTrainingItems(bank, { skill: value }, stats, av, seed));
      else p = new ArrayProvider(buildTrainingItems(bank, { section: value as SectionId }, stats, av, seed));
      if (alive) setProvider(p);
    })();
    return () => {
      alive = false;
    };
    // La séance est tirée une seule fois à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank]);

  if (!bank || !provider) return <Spinner label="Préparation de la séance…" />;

  const title =
    type === 'flash'
      ? 'Flash 5 minutes'
      : type === 'weak'
        ? 'Mes faiblesses'
        : type === 'skill'
          ? `Compétence : ${bank.curriculum.skills[value]?.label ?? value}`
          : sectionDef(value as SectionId).label;

  return (
    <SessionPlayer
      bank={bank}
      title={title}
      mode={type === 'flash' ? 'flash' : 'training'}
      provider={provider}
      exitTo="/entrainement"
      timeLimitSeconds={type === 'flash' ? 300 : undefined}
      compactFeedback={type === 'flash'}
      onFinish={async () => {
        const badges = await checkBadges();
        return { lines: badges.map((b) => <BadgeToast key={b.id} badge={b} />) };
      }}
    />
  );
}
