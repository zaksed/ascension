/**
 * Tableau de bord : score estimé et objectif, évolution aux examens blancs, réussite et vitesse
 * par partie et par compétence, temps d'étude, calendrier de série, badges.
 * Le sélecteur d'examen (en haut) s'applique à tout ce qui est propre à un examen.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useApp } from '../store/app';
import { useBank, useToday } from '../hooks';
import { sectionsOf, EXAM_LABEL } from '../content/exams';
import { skillLabel } from '../content/bank';
import { calendar, computeStreak } from '../features/gamification/streak';
import { BADGES } from '../features/gamification/badges';
import { levelFromXp } from '../features/gamification/xp';
import { toeicEstimateFromAccuracy, toeicCefr } from '../features/scoring/toeic';
import { tagemageEstimateFromAccuracy } from '../features/scoring/tagemage';
import { DailyColumns, InlineBar, ScoreChart, StreakCalendar, type ScorePoint } from '../features/stats/charts';
import { Card, PageTitle, Spinner, Stat } from '../components/ui';
import { ExamSwitch } from '../components/ExamSwitch';
import { addDays, dayKey, diffDays, formatDayFr, formatDuration, parseDay } from '../lib/date';

const WEEKS = 18;
const RECENT_DAYS = 30;

export default function StatsPage() {
  const settings = useApp((s) => s.settings);
  const profile = useApp((s) => s.profile);
  const exam = settings.activeExam;
  const today = useToday();
  const { bank } = useBank(exam);
  const attempts = useLiveQuery(() => db.attempts.where('exam').equals(exam).toArray(), [exam]);
  const days = useLiveQuery(() => db.days.toArray(), []);
  const mocks = useLiveQuery(() => db.exams.where('status').equals('done').toArray(), []);
  const earned = useLiveQuery(() => db.badges.toArray(), []);
  const [allSkills, setAllSkills] = useState(false);

  const color = exam === 'toeic' ? 'var(--viz-toeic)' : 'var(--viz-tm)';

  const data = useMemo(() => {
    if (!attempts || !bank) return null;
    const since = addDays(today, -(RECENT_DAYS - 1));
    const recent = attempts.filter((a) => a.day >= since);
    const acc = (list: typeof attempts) => (list.length ? list.filter((a) => a.correct).length / list.length : 0);
    const recByQ = new Map(bank.questions.map((q) => [q.id, q.recommendedSeconds]));

    const sections = sectionsOf(exam).map((def) => {
      const mine = attempts.filter((a) => a.section === def.id && a.choice !== null);
      const avg = mine.length ? mine.reduce((s, a) => s + a.ms, 0) / mine.length / 1000 : 0;
      const rec = mine.length ? mine.reduce((s, a) => s + (recByQ.get(a.qid) ?? 0), 0) / mine.length : 0;
      return { id: def.id, label: def.label, n: mine.length, acc: acc(mine), avg, rec };
    });

    const skillMap = new Map<string, typeof attempts>();
    for (const a of attempts) skillMap.set(a.skill, [...(skillMap.get(a.skill) ?? []), a]);
    const skills = [...skillMap.entries()]
      .map(([skill, list]) => {
        const answered = list.filter((a) => a.choice !== null);
        return {
          skill,
          n: list.length,
          acc: acc(list),
          avg: answered.length ? answered.reduce((s, a) => s + a.ms, 0) / answered.length / 1000 : 0,
        };
      })
      .sort((a, b) => a.acc - b.acc || b.n - a.n);

    // Estimation du score sur les 30 derniers jours (indicative : la difficulté s'adapte au niveau).
    let estimate: { total: number; detail: string } | null = null;
    if (exam === 'toeic') {
      const l = recent.filter((a) => ['part1', 'part2', 'part3', 'part4'].includes(a.section));
      const r = recent.filter((a) => ['part5', 'part6', 'part7'].includes(a.section));
      if (l.length >= 20 && r.length >= 20) {
        const s = toeicEstimateFromAccuracy(acc(l), acc(r));
        estimate = { total: s.total, detail: `Listening ${s.listening} · Reading ${s.reading} · ${toeicCefr(s.listening, s.reading)}` };
      }
    } else if (recent.length >= 30) {
      estimate = { total: tagemageEstimateFromAccuracy(acc(recent)), detail: `${Math.round(acc(recent) * 100)} % de réussite sur ${recent.length} réponses` };
    }
    return { sections, skills, estimate, total: attempts.length, accAll: acc(attempts) };
  }, [attempts, bank, exam, today]);

  if (!data || !days || !mocks || !earned || !bank) return <Spinner />;

  const dayMap = new Map(days.map((d) => [d.day, d]));
  const streak = computeStreak(dayMap, today, settings.autoFreeze);
  const lvl = levelFromXp(profile.totalXp);
  const studySeconds = days.reduce((s, d) => s + d.seconds, 0);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(today, i - 13);
    return { day, minutes: (dayMap.get(day)?.seconds ?? 0) / 60 };
  });
  // Calendrier : de lundi il y a WEEKS-1 semaines jusqu'à aujourd'hui.
  const monday = addDays(today, -((parseDay(today).getDay() + 6) % 7) - 7 * (WEEKS - 1));
  const cal = calendar(dayMap, today, diffDays(monday, today) + 1, settings.autoFreeze);
  const activeDays = cal.filter((c) => c.state === 'active' || c.state === 'goal').length;

  const target = settings.targets[exam];
  const max = exam === 'toeic' ? 990 : 600;
  const ticks = exam === 'toeic' ? [0, 200, 400, 600, 800] : [0, 100, 200, 300, 400, 500, 600];
  const points: ScorePoint[] = mocks
    .filter((m) => m.exam === exam && m.result)
    .sort((a, b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? ''))
    .map((m) => ({
      key: m.id,
      day: dayKey(new Date(m.finishedAt ?? m.startedAt)),
      score: m.result!.total,
      label: m.mockId === 'random' ? 'Blanc aléatoire' : `Blanc n°${m.mockId === 'mock2' ? 2 : 1}`,
    }));
  const best = points.length ? Math.max(...points.map((p) => p.score)) : null;
  const daysLeft = target.date ? diffDays(today, target.date) : null;
  const shownSkills = allSkills ? data.skills : data.skills.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle subtitle={EXAM_LABEL[exam]}>Progrès</PageTitle>
        <ExamSwitch />
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Score estimé (30 derniers jours)</p>
            {data.estimate ? (
              <>
                <p className="text-5xl font-extrabold leading-none mt-1">
                  {data.estimate.total}
                  <span className="text-xl text-muted font-semibold">/{max}</span>
                </p>
                <p className="text-sm text-muted mt-1.5">{data.estimate.detail}</p>
              </>
            ) : (
              <p className="text-muted mt-1">Répondez à quelques dizaines de questions (Listening et Reading pour le TOEIC) pour obtenir une estimation.</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Objectif</p>
            <p className="text-2xl font-extrabold">{target.score}</p>
            <p className="text-sm text-muted">
              {daysLeft !== null ? (daysLeft >= 0 ? `Examen dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} (${formatDayFr(target.date!, { day: 'numeric', month: 'long' })})` : 'Date d’examen passée') : 'Pas de date d’examen'}
            </p>
            <Link to="/reglages#objectifs" className="text-sm text-brand underline">
              Modifier
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">L’estimation se fonde sur vos réponses d’entraînement, dont la difficulté s’adapte à votre niveau : seul un examen blanc donne une mesure en conditions réelles.</p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Série actuelle" value={`${streak.current} j`} hint={`Record : ${streak.longest} j`} />
        <Stat label="Temps d’étude" value={formatDuration(studySeconds)} hint="toutes épreuves" />
        <Stat label="Réponses" value={data.total.toLocaleString('fr-FR')} hint={`${Math.round(data.accAll * 100)} % de réussite`} />
        <Stat label="Niveau" value={lvl.level} hint={`${profile.totalXp.toLocaleString('fr-FR')} XP`} />
      </div>

      <Card>
        <h2 className="font-bold">Scores aux examens blancs</h2>
        <p className="text-sm text-muted mb-2">{best !== null ? `Meilleur score : ${best}/${max}` : 'Aucun examen blanc terminé pour l’instant.'}</p>
        {points.length > 0 ? (
          <ScoreChart points={points} max={max} ticks={ticks} target={target.score} color={color} title={`Scores aux examens blancs ${EXAM_LABEL[exam]}`} />
        ) : (
          <Link to="/examens" className="text-sm text-brand underline">
            Passer un examen blanc
          </Link>
        )}
      </Card>

      <Card>
        <h2 className="font-bold mb-3">Réussite et vitesse par {exam === 'toeic' ? 'partie' : 'épreuve'}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left">
                <th scope="col" className="font-medium pb-2 pr-3">
                  {exam === 'toeic' ? 'Partie' : 'Épreuve'}
                </th>
                <th scope="col" className="font-medium pb-2 pr-3 w-[35%]">
                  Réussite
                </th>
                <th scope="col" className="font-medium pb-2 pr-3 text-right">
                  Temps moyen
                </th>
                <th scope="col" className="font-medium pb-2 text-right">
                  Réponses
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sections.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <th scope="row" className="font-medium text-left py-2 pr-3">
                    {s.label}
                  </th>
                  <td className="py-2 pr-3">
                    {s.n ? (
                      <span className="flex items-center gap-2">
                        <InlineBar value={s.acc} color={color} />
                        <span className="tabular-nums w-10 text-right">{Math.round(s.acc * 100)} %</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                    {s.n ? (
                      <>
                        {Math.round(s.avg)} s <span className={`text-xs ${s.avg > s.rec * 1.2 ? 'text-bad' : 'text-muted'}`}>/ {Math.round(s.rec)} s conseillées</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">Temps conseillé : moyenne des durées recommandées des questions traitées (en rouge si vous dépassez de plus de 20 %).</p>
      </Card>

      <Card>
        <h2 className="font-bold mb-3">Par compétence</h2>
        {data.skills.length === 0 ? (
          <p className="text-sm text-muted">Aucune réponse pour l’instant.</p>
        ) : (
          <>
            <ul className="space-y-2.5 list-none p-0">
              {shownSkills.map((s) => (
                <li key={s.skill}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <Link to={`/entrainement/seance/${exam}?type=skill&value=${s.skill}`} className="font-medium hover:text-brand">
                      {skillLabel(bank, s.skill)}
                    </Link>
                    <span className="tabular-nums whitespace-nowrap">
                      {Math.round(s.acc * 100)} % <span className="text-muted text-xs">· {s.n} rép. · {Math.round(s.avg)} s</span>
                    </span>
                  </div>
                  <div className="mt-1">
                    <InlineBar value={s.acc} color={color} />
                  </div>
                </li>
              ))}
            </ul>
            {data.skills.length > 8 && (
              <button type="button" className="text-sm text-brand underline mt-3" onClick={() => setAllSkills((v) => !v)}>
                {allSkills ? 'Afficher moins' : `Afficher les ${data.skills.length} compétences`}
              </button>
            )}
            <p className="text-xs text-muted mt-2">Triées de la moins réussie à la plus réussie. Touchez une compétence pour vous entraîner.</p>
          </>
        )}
      </Card>

      <Card>
        <h2 className="font-bold">Temps d’étude</h2>
        <p className="text-sm text-muted mb-2">Minutes par jour, 14 derniers jours (toutes épreuves)</p>
        <DailyColumns data={last14} color="var(--heat-2)" title="Temps d’étude quotidien, 14 derniers jours" />
      </Card>

      <Card>
        <h2 className="font-bold">Calendrier de série</h2>
        <p className="text-sm text-muted mb-3">
          {activeDays} jour{activeDays > 1 ? 's' : ''} actif{activeDays > 1 ? 's' : ''} sur les {WEEKS} dernières semaines
          {settings.autoFreeze ? ' · gel automatique activé' : ''}
        </p>
        <StreakCalendar cells={cal} />
      </Card>

      <Card>
        <h2 className="font-bold mb-3">
          Badges ({earned.length}/{BADGES.length})
        </h2>
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2 list-none p-0">
          {BADGES.map((b) => {
            const got = earned.find((e) => e.id === b.id);
            return (
              <li key={b.id} className={`rounded-xl border p-2.5 text-center ${got ? 'border-accent-bright bg-accent-soft' : 'border-line bg-surface-2'}`}>
                <div className={`text-2xl ${got ? '' : 'grayscale opacity-40'}`} aria-hidden="true">
                  {b.icon}
                </div>
                <p className="text-xs font-semibold mt-1">{b.name}</p>
                <p className="text-[11px] text-muted leading-tight mt-0.5">{got ? `Obtenu le ${formatDayFr(dayKey(new Date(got.earnedAt)))}` : b.description}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
