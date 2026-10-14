/** Révision espacée : file « À réviser aujourd'hui » (SM-2). */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { db } from '../db/db';
import { isExamId, useBank, useToday } from '../hooks';
import { dueQueue, isMastered } from '../features/srs/sm2';
import { reviewItems } from '../features/course/selection';
import { ArrayProvider, SessionPlayer, type ItemProvider } from '../features/session/SessionPlayer';
import { checkBadges } from '../features/session/record';
import { Card, EmptyState, LinkButton, PageTitle, Spinner, Stat } from '../components/ui';
import { formatDayFr } from '../lib/date';
import { BadgeToast } from './shared';
import { EXAM_LABEL } from '../content/exams';

function ReviewOverview() {
  const today = useToday();
  const cards = useLiveQuery(() => db.srs.toArray(), []);
  if (!cards) return <Spinner />;
  return (
    <div className="space-y-4">
      <PageTitle subtitle="Les questions ratées reviennent à intervalles croissants (algorithme SM-2) jusqu’à être maîtrisées.">Révisions</PageTitle>
      {(['toeic', 'tagemage'] as const).map((exam) => {
        const mine = cards.filter((c) => c.exam === exam);
        const due = dueQueue(mine, today, 1000);
        const next = mine.filter((c) => c.due > today).sort((a, b) => a.due.localeCompare(b.due))[0];
        return (
          <Card key={exam}>
            <h2 className="font-bold text-lg">{EXAM_LABEL[exam]}</h2>
            <div className="grid grid-cols-3 gap-2 my-3">
              <Stat label="À réviser" value={due.length} />
              <Stat label="En cours" value={mine.filter((c) => !isMastered(c)).length} />
              <Stat label="Maîtrisées" value={mine.filter(isMastered).length} />
            </div>
            {due.length ? (
              <LinkButton to={`/revision/seance/${exam}`}>Réviser {Math.min(20, due.length)} question{due.length > 1 ? 's' : ''}</LinkButton>
            ) : (
              <p className="text-sm text-muted">{next ? `Prochaine révision le ${formatDayFr(next.due)}.` : 'Aucune erreur en attente : continuez le parcours !'}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default function ReviewPage() {
  const { exam } = useParams();
  if (!isExamId(exam)) return <ReviewOverview />;
  return <ReviewSession exam={exam} />;
}

function ReviewSession({ exam }: { exam: 'toeic' | 'tagemage' }) {
  const { bank } = useBank(exam);
  const today = useToday();
  const [provider, setProvider] = useState<ItemProvider | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!bank) return;
    void (async () => {
      const cards = await db.srs.where('exam').equals(exam).toArray();
      const due = dueQueue(cards, today, 20);
      setCount(due.length);
      setProvider(new ArrayProvider(reviewItems(bank, due.map((c) => c.qid))));
    })();
  }, [bank, exam, today]);

  if (!bank || count === null || !provider) return <Spinner label="Préparation des révisions…" />;
  if (count === 0)
    return (
      <EmptyState title="Rien à réviser aujourd’hui 🎉">
        <p>Les questions ratées apparaîtront ici au bon moment.</p>
        <LinkButton to="/" className="mt-4">
          Retour à l’accueil
        </LinkButton>
      </EmptyState>
    );

  return (
    <SessionPlayer
      bank={bank}
      title={`Révision · ${EXAM_LABEL[exam]}`}
      mode="review"
      provider={provider}
      exitTo="/revision"
      onFinish={async () => {
        const badges = await checkBadges();
        return { lines: badges.map((b) => <BadgeToast key={b.id} badge={b} />) };
      }}
    />
  );
}
