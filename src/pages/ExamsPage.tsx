/** Liste des examens blancs : n°1, n°2 (questions réservées) et aléatoire. */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MockAttempt } from '../db/db';
import { useApp } from '../store/app';
import { useAvailability, useBank } from '../hooks';
import { composeRandomMock } from '../features/exam/mock';
import { Badge, Card, LinkButton, PageTitle, Spinner } from '../components/ui';
import { ExamSwitch } from '../components/ExamSwitch';
import { EXAM_LABEL } from '../content/exams';
import { IconClock, IconTrophy } from '../components/icons';
import { dayKey, formatDayFr } from '../lib/date';

const RULES = {
  toeic: ['200 questions · 2 heures', 'Listening : 100 questions, audio diffusé une seule fois, rythme imposé', 'Reading : 100 questions en 75 minutes, navigation libre', 'Score estimé sur 990 (Listening et Reading sur 495)'],
  tagemage: ['6 sous-tests × 15 questions · 20 minutes chacun', 'Ordre : Compréhension, Calcul, R&A, Conditions minimales, Expression, Logique', 'Pas de retour à un sous-test terminé ; difficulté croissante', 'Aucune pénalité pour une mauvaise réponse : répondez à tout'],
} as const;

export default function ExamsPage() {
  const exam = useApp((s) => s.settings.activeExam);
  const { bank } = useBank(exam);
  const av = useAvailability();
  const attempts = useLiveQuery(() => db.exams.where('exam').equals(exam).toArray(), [exam]);
  const randomOk = useMemo(() => (bank ? composeRandomMock(bank, av, 'check') !== null : false), [bank, av]);

  if (!bank || !attempts) return <Spinner />;

  const byMock = (mockId: string) => attempts.filter((a) => a.mockId === mockId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const done = attempts.filter((a) => a.status === 'done').sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));

  const mocks = [
    { id: 'mock1', title: 'Examen blanc n°1', desc: 'Questions inédites réservées à cet examen.' },
    { id: 'mock2', title: 'Examen blanc n°2', desc: 'Une seconde série inédite, de même format.' },
    {
      id: 'random',
      title: 'Examen blanc aléatoire',
      desc: randomOk ? 'Tiré au sort dans les questions déjà débloquées, au format officiel.' : 'Disponible quand la banque débloquée suffit à composer un examen complet (terminez les examens n°1 et n°2, ou activez l’option dans les réglages).',
      disabled: !randomOk,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle subtitle={`${EXAM_LABEL[exam]} · conditions réelles, chronométrées`}>Examens blancs</PageTitle>
        <ExamSwitch />
      </div>

      <Card>
        <h2 className="font-bold mb-2 flex items-center gap-2">
          <IconClock /> Déroulé
        </h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {RULES[exam].map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>Vous pouvez quitter et reprendre plus tard ; le chronomètre s’arrête pendant l’absence.</li>
        </ul>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {mocks.map((m) => {
          const list = byMock(m.id);
          const inProgress = list.find((a) => a.status === 'in-progress');
          const best = list.filter((a) => a.status === 'done').sort((a, b) => (b.result?.total ?? 0) - (a.result?.total ?? 0))[0];
          return (
            <Card key={m.id} className="flex flex-col">
              <h2 className="font-bold">{m.title}</h2>
              <p className="text-sm text-muted mt-1 flex-1">{m.desc}</p>
              <div className="flex flex-wrap gap-1.5 my-3">
                {inProgress && <Badge tone="accent">En cours</Badge>}
                {best && (
                  <Badge tone="ok">
                    <IconTrophy size={12} /> Meilleur : {best.result?.total}/{best.result?.max}
                  </Badge>
                )}
              </div>
              {m.disabled ? (
                <span className="text-sm text-muted">Pas encore disponible</span>
              ) : (
                <LinkButton to={`/examen/${exam}/${m.id}`} variant={inProgress ? 'accent' : 'primary'}>
                  {inProgress ? 'Reprendre' : best ? 'Repasser' : 'Commencer'}
                </LinkButton>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="font-bold mb-2">Historique</h2>
        {done.length === 0 ? (
          <p className="text-sm text-muted">Aucun examen terminé pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-line list-none p-0">
            {done.map((a: MockAttempt) => (
              <li key={a.id}>
                <Link to={`/rapport/${encodeURIComponent(a.id)}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
                  <span>
                    <span className="font-semibold">{a.mockId === 'random' ? 'Aléatoire' : `Blanc n°${a.mockId === 'mock2' ? 2 : 1}`}</span>
                    <span className="text-sm text-muted"> · {formatDayFr(dayKey(new Date(a.finishedAt ?? a.startedAt)), { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </span>
                  <span className="font-extrabold tabular-nums">
                    {a.result?.total}
                    <span className="text-muted font-normal text-sm">/{a.result?.max}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
