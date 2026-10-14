/** Rapport détaillé d'un examen blanc : score converti, détail par partie et compétence, erreurs commentées. */
import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MockAttempt } from '../db/db';
import { useApp } from '../store/app';
import { useBank } from '../hooks';
import type { Bank } from '../content/bank';
import { skillLabel, skillTip } from '../content/bank';
import { itemForQuestion } from '../content/items';
import type { Question } from '../content/schema';
import { EXAM_LABEL, LETTERS, sectionsOf } from '../content/exams';
import { toeicCefr } from '../features/scoring/toeic';
import { TM_DOMAIN_LABEL, TM_DOMAINS } from '../features/scoring/tagemage';
import { BADGES } from '../features/gamification/badges';
import { QuestionView } from '../features/question/QuestionView';
import { Feedback } from '../features/question/Feedback';
import { Card, EmptyState, LinkButton, PageTitle, ProgressBar, Spinner, Stat } from '../components/ui';
import { formatDayFr, dayKey, formatDuration } from '../lib/date';
import { BadgeToast } from './shared';

export default function ExamReportPage() {
  const { attemptId = '' } = useParams();
  const attempt = useLiveQuery(() => db.exams.get(attemptId), [attemptId], null as MockAttempt | null | undefined);
  const { bank } = useBank(attempt?.exam);

  if (attempt === null) return <Spinner />;
  if (attempt === undefined)
    return (
      <EmptyState title="Rapport introuvable">
        <LinkButton to="/examens" className="mt-4">
          Retour aux examens
        </LinkButton>
      </EmptyState>
    );
  if (!attempt.result)
    return (
      <EmptyState title="Cet examen n’est pas terminé">
        <LinkButton to={`/examen/${attempt.exam}/${attempt.mockId}`} className="mt-4">
          Reprendre
        </LinkButton>
      </EmptyState>
    );
  if (!bank) return <Spinner />;
  return <Report bank={bank} attempt={attempt} />;
}

function Report({ bank, attempt }: { bank: Bank; attempt: MockAttempt }) {
  const location = useLocation();
  const settings = useApp((s) => s.settings);
  const result = attempt.result!;
  const fresh = ((location.state as { badges?: string[] } | null)?.badges ?? []).map((id) => BADGES.find((b) => b.id === id)).filter((b) => !!b);
  const qs = useMemo(() => attempt.questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q), [attempt, bank]);
  const numbering = useMemo(() => {
    const map = new Map<string, number>();
    if (bank.exam === 'toeic') qs.forEach((q, i) => map.set(q.id, i + 1));
    else for (const def of sectionsOf('tagemage')) qs.filter((q) => q.section === def.id).forEach((q, i) => map.set(q.id, i + 1));
    return map;
  }, [qs, bank.exam]);

  const isCorrect = (q: Question) => attempt.answers[q.id] === q.answer;
  const mistakes = qs.filter((q) => !isCorrect(q));
  const target = settings.targets[bank.exam].score;
  const gap = result.total - target;

  // Compétences les moins réussies (au moins 2 questions).
  const skills = useMemo(() => {
    const m = new Map<string, { correct: number; total: number }>();
    for (const q of qs) {
      const s = m.get(q.skill) ?? { correct: 0, total: 0 };
      s.total++;
      if (attempt.answers[q.id] === q.answer) s.correct++;
      m.set(q.skill, s);
    }
    return [...m.entries()]
      .filter(([, s]) => s.total >= 2)
      .map(([skill, s]) => ({ skill, ...s, acc: s.correct / s.total }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 5);
  }, [qs, attempt]);

  const finished = attempt.finishedAt ? formatDayFr(dayKey(new Date(attempt.finishedAt)), { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const title = attempt.mockId === 'random' ? 'Examen blanc aléatoire' : `Examen blanc n°${attempt.mockId === 'mock2' ? 2 : 1}`;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle back="/examens" subtitle={`${EXAM_LABEL[bank.exam]} · ${finished}`}>
        {title} — rapport
      </PageTitle>

      {fresh.map((b) => (
        <BadgeToast key={b.id} badge={b} />
      ))}

      <Card>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-sm text-muted">{bank.exam === 'toeic' ? 'Score estimé' : 'Score (barème officiel)'}</p>
            <p className="text-5xl font-extrabold tabular-nums leading-none mt-1">
              {result.total}
              <span className="text-xl text-muted font-semibold">/{result.max}</span>
            </p>
          </div>
          <p className={`font-semibold ${gap >= 0 ? 'text-ok' : 'text-muted'}`}>{gap >= 0 ? `Objectif ${target} atteint (+${gap})` : `Objectif ${target} : encore ${-gap} points`}</p>
        </div>
        {bank.exam === 'toeic' ? (
          <>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Stat label="Listening" value={`${result.detail.listening}/495`} hint={`${result.detail.listeningRaw} bonnes réponses sur 100`} />
              <Stat label="Reading" value={`${result.detail.reading}/495`} hint={`${result.detail.readingRaw} bonnes réponses sur 100`} />
            </div>
            <p className="text-sm text-muted mt-3">
              Niveau indicatif : {toeicCefr(result.detail.listening, result.detail.reading)}. ETS ne publie pas de table de conversion : ce score est une estimation, pas un résultat officiel.
            </p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {(Object.keys(TM_DOMAINS) as (keyof typeof TM_DOMAINS)[]).map((d) => (
                <Stat key={d} label={TM_DOMAIN_LABEL[d]} value={`${Math.round(result.detail[`domain:${d}`] ?? 0)}/60`} />
              ))}
            </div>
            <p className="text-sm text-muted mt-3">
              +4 points par bonne réponse, aucune pénalité ; chaque domaine est la moyenne de ses deux sous-tests, le total est la moyenne des trois domaines × 10.
              {settings.showLegacyTmScore && result.legacyTotal !== undefined && ` Avec l’ancien barème (−1 par erreur) : ${result.legacyTotal}/600.`}
            </p>
          </>
        )}
      </Card>

      <Card>
        <h2 className="font-bold mb-3">Détail par {bank.exam === 'toeic' ? 'partie' : 'sous-test'}</h2>
        <ul className="space-y-3 list-none p-0">
          {result.parts.map((p) => {
            const perQ = p.total ? p.seconds / p.total : 0;
            return (
              <li key={p.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{p.label}</span>
                  <span className="tabular-nums">
                    {p.correct}/{p.total}
                    {bank.exam === 'tagemage' && <span className="text-muted"> · {result.detail[p.id] ?? p.correct * 4}/60</span>}
                  </span>
                </div>
                <ProgressBar value={p.correct} max={p.total} label={`${p.label} : ${p.correct} sur ${p.total}`} tone={bank.exam === 'toeic' ? 'toeic' : 'tm'} className="mt-1" />
                <p className="text-xs text-muted mt-1">
                  Temps : {formatDuration(p.seconds)} · {Math.round(perQ)} s par question en moyenne
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      {skills.length > 0 && (
        <Card>
          <h2 className="font-bold mb-2">Compétences à travailler en priorité</h2>
          <ul className="space-y-2 list-none p-0">
            {skills.map((s) => (
              <li key={s.skill} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{skillLabel(bank, s.skill)}</span>
                  <span className="text-sm text-muted">
                    {' '}
                    · {s.correct}/{s.total}
                  </span>
                </span>
                <LinkButton size="sm" variant="secondary" to={`/entrainement/seance/${bank.exam}?type=skill&value=${s.skill}`}>
                  S’entraîner
                </LinkButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-bold mb-1">Erreurs et questions sans réponse ({mistakes.length})</h2>
        <p className="text-sm text-muted mb-3">Elles rejoignent la révision espacée. Ouvrez une question pour voir la correction détaillée.</p>
        {sectionsOf(bank.exam).map((def) => {
          const mine = mistakes.filter((q) => q.section === def.id);
          if (!mine.length) return null;
          return (
            <div key={def.id} className="mb-4">
              <h3 className="text-sm font-bold text-muted mb-1.5">{def.label}</h3>
              <ul className="space-y-1.5 list-none p-0">
                {mine.map((q) => (
                  <MistakeRow key={q.id} bank={bank} q={q} n={numbering.get(q.id) ?? 0} choice={attempt.answers[q.id] ?? null} />
                ))}
              </ul>
            </div>
          );
        })}
        {mistakes.length === 0 && <p className="text-ok font-semibold">Aucune erreur : sans faute !</p>}
      </Card>

      <div className="flex flex-wrap gap-2 pb-6">
        <LinkButton to="/examens">Retour aux examens</LinkButton>
        <LinkButton to="/stats" variant="secondary">
          Voir ma progression
        </LinkButton>
      </div>
    </div>
  );
}

/** Ligne d'erreur repliable ; le contenu n'est rendu qu'à l'ouverture (rapport de 200 questions). */
function MistakeRow({ bank, q, n, choice }: { bank: Bank; q: Question; n: number; choice: number | null }) {
  const [open, setOpen] = useState(false);
  const item = useMemo(() => itemForQuestion(bank, q), [bank, q]);
  const label = q.section === 'part1' ? 'Photographie' : q.section === 'part2' ? 'Question-réponse' : q.prompt;
  return (
    <li>
      <details className="rounded-xl border border-line" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer px-3 py-2 text-sm flex gap-2">
          <span className="font-bold tabular-nums">{n}.</span>
          <span lang={q.exam === 'toeic' ? 'en' : 'fr'} className="flex-1 truncate">
            {label}
          </span>
          <span className={choice === null ? 'text-muted' : 'text-bad'}>{choice === null ? 'sans réponse' : `${LETTERS[choice]} → ${LETTERS[q.answer]}`}</span>
        </summary>
        {open && (
          <div className="p-3 pt-1 space-y-3">
            <QuestionView item={item} qIndex={0} selected={choice} onSelect={() => undefined} reveal mode="practice" />
            <Feedback q={q} item={item} choice={choice} tip={q.tip ?? skillTip(bank, q.skill)} />
          </div>
        )}
      </details>
    </li>
  );
}
