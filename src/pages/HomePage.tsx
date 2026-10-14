/** Accueil : objectif du jour, série, prochaine leçon, révisions dues, raccourcis. */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useApp } from '../store/app';
import { db } from '../db/db';
import { useBank, useToday } from '../hooks';
import { computeStreak } from '../features/gamification/streak';
import { courseStatus, lessonKey, nextLesson } from '../features/course/progress';
import { levelFromXp } from '../features/gamification/xp';
import { diffDays, formatDayFr } from '../lib/date';
import { Card, LinkButton, ProgressBar, Ring } from '../components/ui';
import { ExamSwitch } from '../components/ExamSwitch';
import { IconBolt, IconClipboard, IconFlame, IconMountain, IconRefresh, IconSnow, IconTarget } from '../components/icons';
import { EXAM_LABEL } from '../content/exams';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export function HomePage() {
  const settings = useApp((s) => s.settings);
  const profile = useApp((s) => s.profile);
  const exam = settings.activeExam;
  const today = useToday();
  const { bank } = useBank(exam);
  const days = useLiveQuery(() => db.days.toArray(), []);
  const lessons = useLiveQuery(() => db.lessons.where('exam').equals(exam).toArray(), [exam]);
  const due = useLiveQuery(() => db.srs.where('due').belowOrEqual(today).toArray(), [today]);
  const dayMap = new Map((days ?? []).map((d) => [d.day, d]));
  const todayRec = dayMap.get(today);
  const streak = computeStreak(dayMap, today, settings.autoFreeze);
  const lvl = levelFromXp(profile.totalXp);
  const dueExam = (due ?? []).filter((c) => c.exam === exam).length;
  const status = bank && lessons ? courseStatus(bank.curriculum, new Map(lessons.map((l) => [l.key, l])), settings.unlockAll) : null;
  const next = status ? nextLesson(status) : null;
  const nextUnit = next && status ? status[next.unitIndex] : null;
  const target = settings.targets[exam];
  const daysLeft = target.date ? diffDays(today, target.date) : null;
  const placementDone = profile.placementDone.includes(exam);
  const xpToday = todayRec?.xp ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{greeting()} !</h1>
          <p className="text-muted text-sm">Niveau {lvl.level} · {EXAM_LABEL[exam]}</p>
        </div>
        <ExamSwitch />
      </div>

      <Card className="flex items-center gap-4">
        <Ring value={xpToday} max={settings.dailyGoal} size={72} label={`Objectif du jour : ${xpToday} sur ${settings.dailyGoal} XP`}>
          <span className="tabular-nums">{Math.min(100, Math.round((xpToday / settings.dailyGoal) * 100))}%</span>
        </Ring>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{xpToday >= settings.dailyGoal ? 'Objectif du jour atteint 🎉' : `Objectif du jour : ${xpToday}/${settings.dailyGoal} XP`}</p>
          <p className="text-sm text-muted flex items-center gap-1.5 mt-0.5">
            <IconFlame size={16} className="text-accent" />
            Série de <strong className="text-ink">{streak.current}</strong> jour{streak.current > 1 ? 's' : ''}
            {streak.frozenInStreak > 0 && (
              <span className="inline-flex items-center gap-0.5 text-frozen">
                · <IconSnow size={14} /> {streak.frozenInStreak} gelé{streak.frozenInStreak > 1 ? 's' : ''}
              </span>
            )}
          </p>
          <ProgressBar className="mt-2" value={lvl.into} max={lvl.needed} label={`Niveau ${lvl.level}`} tone="brand" />
          <p className="text-xs text-muted mt-1">
            {lvl.needed - lvl.into} XP avant le niveau {lvl.level + 1}
          </p>
        </div>
      </Card>

      {nextUnit && next && (
        <Card className={`border-2 ${exam === 'toeic' ? 'border-toeic/40' : 'border-tm/40'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Continuer le parcours</p>
          <h2 className="text-lg font-bold mt-0.5">
            {nextUnit.unit.title} · leçon {next.lesson + 1}
          </h2>
          <p className="text-sm text-muted">{nextUnit.unit.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <LinkButton to={`/lecon/${exam}/${nextUnit.unit.id}/${next.lesson}`} size="lg">
              <IconMountain /> {lessons?.some((l) => l.key === lessonKey(nextUnit.unit.id, next.lesson)) ? 'Reprendre' : 'Commencer'}
            </LinkButton>
            <LinkButton to={`/parcours/${exam}`} variant="secondary" size="lg">
              Voir la carte
            </LinkButton>
          </div>
        </Card>
      )}

      {!placementDone && (
        <Card className="bg-brand-soft border-brand/30">
          <h2 className="font-bold">Passer le test de placement</h2>
          <p className="text-sm mt-0.5">20 questions adaptatives pour situer votre niveau et sauter les unités que vous maîtrisez déjà.</p>
          <LinkButton to={`/placement/${exam}`} className="mt-3">
            Démarrer le test (≈ 15 min)
          </LinkButton>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to={`/revision/seance/${exam}`} className="rounded-2xl border border-line bg-surface p-4 hover:border-brand">
          <IconRefresh className="text-brand" />
          <p className="font-bold mt-1">À réviser</p>
          <p className="text-sm text-muted">{dueExam ? `${dueExam} question${dueExam > 1 ? 's' : ''} aujourd’hui` : 'Rien à réviser'}</p>
        </Link>
        <Link to={`/entrainement/seance/${exam}?type=flash`} className="rounded-2xl border border-line bg-surface p-4 hover:border-brand">
          <IconBolt className="text-accent" />
          <p className="font-bold mt-1">Flash 5 min</p>
          <p className="text-sm text-muted">Questions courtes, chrono</p>
        </Link>
        <Link to="/entrainement" className="rounded-2xl border border-line bg-surface p-4 hover:border-brand">
          <IconTarget className="text-brand" />
          <p className="font-bold mt-1">Entraînement</p>
          <p className="text-sm text-muted">Par partie, compétence, faiblesses</p>
        </Link>
        <Link to="/examens" className="rounded-2xl border border-line bg-surface p-4 hover:border-brand">
          <IconClipboard className="text-brand" />
          <p className="font-bold mt-1">Examens blancs</p>
          <p className="text-sm text-muted">Format et chrono officiels</p>
        </Link>
      </div>

      <Card>
        <h2 className="font-bold">Mon objectif</h2>
        <p className="text-sm text-muted mt-0.5">
          {EXAM_LABEL[exam]} : <strong className="text-ink">{target.score}</strong> {exam === 'toeic' ? '/ 990' : '/ 600'}
          {target.date && daysLeft !== null && (
            <>
              {' '}· examen le {formatDayFr(target.date, { day: 'numeric', month: 'long', year: 'numeric' })} ({daysLeft >= 0 ? `J−${daysLeft}` : 'passé'})
            </>
          )}
        </p>
        <Link to="/reglages#objectifs" className="text-sm text-brand font-semibold mt-1 inline-block">
          Modifier l’objectif et la date →
        </Link>
      </Card>
    </div>
  );
}
