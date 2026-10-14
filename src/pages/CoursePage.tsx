/** Carte du parcours : unités (« camps ») et leçons en lacets, avec couronnes et déblocage. */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { useApp } from '../store/app';
import { isExamId, useBank } from '../hooks';
import { courseStatus } from '../features/course/progress';
import { Badge, LinkButton, PageTitle, ProgressBar, Spinner } from '../components/ui';
import { ExamSwitch } from '../components/ExamSwitch';
import { IconCrown, IconLock, IconMountain } from '../components/icons';
import { EXAM_LABEL, sectionDef } from '../content/exams';

export default function CoursePage() {
  const params = useParams();
  const settings = useApp((s) => s.settings);
  const profile = useApp((s) => s.profile);
  const exam = isExamId(params.exam) ? params.exam : settings.activeExam;
  const { bank } = useBank(exam);
  const lessons = useLiveQuery(() => db.lessons.where('exam').equals(exam).toArray(), [exam]);
  if (!bank || !lessons) return <Spinner />;
  const status = courseStatus(bank.curriculum, new Map(lessons.map((l) => [l.key, l])), settings.unlockAll);
  const tone = exam === 'toeic' ? 'toeic' : 'tm';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle subtitle={`${bank.curriculum.units.length} unités · leçons de 8 à 12 questions`}>Parcours {EXAM_LABEL[exam]}</PageTitle>
        <ExamSwitch />
      </div>
      {!profile.placementDone.includes(exam) && (
        <div className="mb-4 rounded-xl bg-brand-soft p-3 text-sm flex flex-wrap items-center gap-2">
          Vous avez déjà des bases ?
          <LinkButton to={`/placement/${exam}`} size="sm">
            Passer le test de placement
          </LinkButton>
        </div>
      )}
      <ol className="space-y-6 list-none p-0">
        {status.map((u) => (
          <li key={u.unit.id}>
            <section aria-labelledby={`unit-${u.unit.id}`} className={`rounded-2xl border border-line bg-surface p-4 ${u.unlocked ? '' : 'opacity-70'}`}>
              <header className="flex items-start gap-3">
                <div className={`grid place-items-center h-11 w-11 rounded-xl shrink-0 ${u.unlocked ? (exam === 'toeic' ? 'bg-toeic text-on-toeic' : 'bg-tm text-on-tm') : 'bg-surface-2 text-muted'}`}>
                  {u.unlocked ? <IconMountain /> : <IconLock />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">Camp {u.index + 1}</p>
                  <h2 id={`unit-${u.unit.id}`} className="font-bold text-lg leading-tight">
                    {u.unit.title}
                  </h2>
                  <p className="text-sm text-muted">{u.unit.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {u.unit.sections.map((s) => (
                      <Badge key={s} tone={tone}>
                        {sectionDef(s).short}
                      </Badge>
                    ))}
                    <Badge tone="accent">
                      <IconCrown size={12} /> {u.crowns}/{u.maxCrowns}
                    </Badge>
                  </div>
                </div>
              </header>
              <ProgressBar className="mt-3" value={u.crowns} max={u.maxCrowns} label={`Couronnes de l'unité ${u.unit.title}`} tone="accent" />
              <ol className="mt-4 flex flex-col items-center gap-3 list-none p-0" aria-label={`Leçons de ${u.unit.title}`}>
                {u.lessons.map((l) => {
                  // Tracé en lacets : décalage horizontal alterné.
                  const offset = [0, 48, 72, 48, 0, -48, -72, -48][l.index % 8];
                  const label = `Leçon ${l.index + 1}${l.crowns ? `, ${l.crowns} couronne${l.crowns > 1 ? 's' : ''}` : ''}${l.unlocked ? '' : ', verrouillée'}`;
                  const circle = (
                    <span
                      className={`relative grid place-items-center h-16 w-16 rounded-full border-4 font-extrabold text-lg shadow-sm transition-transform ${
                        !l.unlocked
                          ? 'bg-surface-2 border-line text-muted'
                          : l.crowns >= 5
                            ? 'bg-accent-bright border-accent text-[#2b1700]'
                            : l.crowns > 0
                              ? `${exam === 'toeic' ? 'bg-toeic border-toeic text-on-toeic' : 'bg-tm border-tm text-on-tm'}`
                              : 'bg-surface border-brand text-brand hover:scale-105'
                      }`}
                    >
                      {l.unlocked ? l.index + 1 : <IconLock size={20} />}
                      {l.crowns > 0 && (
                        <span className="absolute -bottom-2 -right-2 inline-flex items-center gap-0.5 rounded-full bg-surface border border-line px-1.5 text-xs text-accent">
                          <IconCrown size={12} />
                          {l.crowns}
                        </span>
                      )}
                    </span>
                  );
                  return (
                    <li key={l.index} style={{ transform: `translateX(${offset}px)` }}>
                      {l.unlocked ? (
                        <Link to={`/lecon/${exam}/${u.unit.id}/${l.index}`} aria-label={label} className="block rounded-full">
                          {circle}
                        </Link>
                      ) : (
                        <span aria-label={label} role="img">
                          {circle}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted mt-6">
        Une leçon réussie (≥ 60 %) rapporte une couronne, jusqu’à 5 : chaque couronne augmente la difficulté. Tout peut être débloqué dans les réglages.
      </p>
    </div>
  );
}
