/** Modes d'entraînement : par partie/épreuve, par compétence, faiblesses, flash 5 minutes. */
import { useState } from 'react';
import { useApp } from '../store/app';
import { useBank } from '../hooks';
import { Card, LinkButton, PageTitle, Spinner } from '../components/ui';
import { ExamSwitch } from '../components/ExamSwitch';
import { sectionsOf } from '../content/exams';
import { IconBolt, IconTarget } from '../components/icons';

export default function TrainingPage() {
  const exam = useApp((s) => s.settings.activeExam);
  const { bank } = useBank(exam);
  const [skill, setSkill] = useState('');
  if (!bank) return <Spinner />;
  const skills = Object.entries(bank.curriculum.skills);
  const base = `/entrainement/seance/${exam}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle subtitle="Séances libres, sans limite : chaque erreur rejoint la révision espacée.">Entraînement</PageTitle>
        <ExamSwitch />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <h2 className="font-bold flex items-center gap-2">
            <IconTarget className="text-bad" /> Mes faiblesses
          </h2>
          <p className="text-sm text-muted mt-1">Révisions dues + compétences les moins réussies.</p>
          <LinkButton to={`${base}?type=weak`} className="mt-3">
            Lancer (10 questions)
          </LinkButton>
        </Card>
        <Card>
          <h2 className="font-bold flex items-center gap-2">
            <IconBolt className="text-accent" /> Flash 5 minutes
          </h2>
          <p className="text-sm text-muted mt-1">Un maximum de questions courtes en 5 minutes chrono.</p>
          <LinkButton to={`${base}?type=flash`} variant="accent" className="mt-3">
            Top départ
          </LinkButton>
        </Card>
      </div>

      <Card>
        <h2 className="font-bold mb-2">Par {exam === 'toeic' ? 'partie' : 'épreuve'}</h2>
        <ul className="grid sm:grid-cols-2 gap-2 list-none p-0">
          {sectionsOf(exam).map((s) => (
            <li key={s.id}>
              <LinkButton to={`${base}?type=section&value=${s.id}`} variant="secondary" className="w-full !justify-start">
                <span className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${exam === 'toeic' ? 'bg-toeic-soft text-toeic' : 'bg-tm-soft text-tm'}`}>{s.short}</span>
                {s.label.replace(/^Partie \d — /, '')}
              </LinkButton>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold mb-2">Par compétence</h2>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="skill-select">
            Compétence
          </label>
          <select id="skill-select" value={skill} onChange={(e) => setSkill(e.target.value)} className="flex-1 min-w-48 rounded-xl border border-line bg-surface px-3 py-2.5">
            <option value="">Choisir une compétence…</option>
            {sectionsOf(exam).map((sec) => (
              <optgroup key={sec.id} label={sec.label}>
                {skills
                  .filter(([, s]) => s.section === sec.id)
                  .map(([id, s]) => (
                    <option key={id} value={id}>
                      {s.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <LinkButton to={`${base}?type=skill&value=${skill}`} aria-disabled={!skill} className={skill ? '' : 'pointer-events-none opacity-50'}>
            S’entraîner
          </LinkButton>
        </div>
        {skill && <p className="text-sm text-muted mt-2">💡 {bank.curriculum.skills[skill]?.tip}</p>}
      </Card>
    </div>
  );
}
