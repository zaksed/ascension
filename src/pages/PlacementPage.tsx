/** Test de placement adaptatif : situe le niveau par partie et débloque les unités maîtrisées. */
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useApp } from '../store/app';
import { isExamId, useAvailability, useBank } from '../hooks';
import { PlacementRunner, placementLevels, unitsToSkip } from '../features/placement/placement';
import { SessionPlayer, type ItemProvider } from '../features/session/SessionPlayer';
import { addXp, checkBadges } from '../features/session/record';
import { lessonKey } from '../features/course/progress';
import { XP } from '../features/gamification/xp';
import { Button, Card, PageTitle, Spinner } from '../components/ui';
import { EXAM_LABEL, sectionDef } from '../content/exams';
import { BadgeToast } from './shared';

export default function PlacementPage() {
  const { exam } = useParams();
  const examId = isExamId(exam) ? exam : 'toeic';
  const { bank } = useBank(examId);
  const av = useAvailability();
  const updateProfile = useApp((s) => s.updateProfile);
  const [started, setStarted] = useState(false);

  const provider = useMemo<(ItemProvider & { runner: PlacementRunner }) | null>(() => {
    if (!bank || !started) return null;
    const runner = new PlacementRunner(bank, av, String(Date.now()));
    return { runner, next: () => runner.next(), record: (q, c) => runner.record(q, c), total: () => runner.total };
  }, [bank, av, started]);

  if (!bank) return <Spinner />;

  if (!started)
    return (
      <div className="max-w-xl mx-auto">
        <PageTitle back="/" subtitle={EXAM_LABEL[examId]}>
          Test de placement
        </PageTitle>
        <Card>
          <ul className="list-disc pl-5 space-y-1.5 text-[0.95rem]">
            <li>20 questions, toutes {examId === 'toeic' ? 'parties' : 'épreuves'} confondues.</li>
            <li>La difficulté s’adapte : elle monte après une bonne réponse, baisse après une erreur.</li>
            <li>Les unités nettement en dessous de votre niveau seront validées d’office (1 couronne).</li>
            <li>Vous pouvez repasser le test quand vous voulez ; il ne retire jamais de progression.</li>
          </ul>
          <Button size="lg" className="mt-4" onClick={() => setStarted(true)}>
            Commencer
          </Button>
        </Card>
      </div>
    );

  if (!provider) return <Spinner />;

  return (
    <SessionPlayer
      bank={bank}
      title={`Test de placement · ${EXAM_LABEL[examId]}`}
      mode="placement"
      provider={provider}
      exitTo={`/parcours/${examId}`}
      compactFeedback
      onFinish={async () => {
        const levels = placementLevels(provider.runner.answers);
        const skip = unitsToSkip(bank.curriculum, levels);
        const now = new Date().toISOString();
        for (const unitId of skip) {
          const unit = bank.curriculum.units.find((u) => u.id === unitId)!;
          for (let i = 0; i < unit.lessons; i++) {
            const key = lessonKey(unitId, i);
            const prev = await db.lessons.get(key);
            if (!prev || prev.crowns === 0) {
              await db.lessons.put({ key, exam: examId, unitId, lesson: i, crowns: 1, completions: prev?.completions ?? 0, bestAccuracy: prev?.bestAccuracy ?? 0, lastAt: now, source: 'placement' });
            }
          }
        }
        await updateProfile((p) => ({ ...p, placementDone: [...new Set([...p.placementDone, examId])] }));
        await addXp(XP.placementComplete);
        const badges = await checkBadges();
        return {
          xp: XP.placementComplete,
          lines: [
            <Card key="levels">
              <h2 className="font-bold mb-2">Niveau estimé par {examId === 'toeic' ? 'partie' : 'épreuve'}</h2>
              <ul className="space-y-1.5 list-none p-0">
                {[...levels.entries()].map(([s, l]) => (
                  <li key={s} className="flex items-center justify-between gap-3">
                    <span>{sectionDef(s).label}</span>
                    <span aria-label={`Niveau ${l} sur 5`} className="tracking-widest text-accent">
                      {'★'.repeat(l)}
                      <span className="text-line">{'★'.repeat(5 - l)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted mt-3">
                {skip.length ? `${skip.length} unité${skip.length > 1 ? 's' : ''} validée${skip.length > 1 ? 's' : ''} d’office : vous pouvez les revoir quand vous voulez.` : 'Aucune unité sautée : le parcours commence au premier camp.'}
              </p>
            </Card>,
            ...badges.map((b) => <BadgeToast key={b.id} badge={b} />),
          ],
        };
      }}
    />
  );
}
