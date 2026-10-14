/** Retour immédiat après une réponse : correction, explication, piège, astuce, transcription. */
import type { Item } from '../../content/items';
import type { Question } from '../../content/schema';
import { LETTERS } from '../../content/exams';
import { transcriptLines, isListeningItem } from '../audio/script';
import { IconAlert, IconBulb, IconCheck, IconText, IconX } from '../../components/icons';
import { ReportButton } from './ReportDialog';

export function Feedback({ q, item, choice, tip, compact = false }: { q: Question; item: Item; choice: number | null; tip?: string; compact?: boolean }) {
  const correct = choice === q.answer;
  const listening = isListeningItem(item);
  const lang = q.exam === 'toeic' ? 'en' : 'fr';
  return (
    <div role="status" aria-live="polite" className={`rounded-2xl border-2 p-4 anim-rise ${correct ? 'border-ok bg-ok-soft' : 'border-bad bg-bad-soft'}`}>
      <div className="flex items-start gap-2">
        <span className={`grid place-items-center h-8 w-8 rounded-full shrink-0 ${correct ? 'bg-ok text-white' : 'bg-bad text-white'}`}>{correct ? <IconCheck size={18} /> : <IconX size={18} />}</span>
        <div>
          <p className="font-bold text-lg leading-tight">{correct ? 'Bonne réponse !' : choice === null ? 'Temps écoulé' : 'Pas tout à fait…'}</p>
          {!correct && (
            <p className="text-sm mt-0.5">
              Réponse attendue : <strong>{LETTERS[q.answer]}</strong> — <span lang={lang}>{q.options[q.answer]}</span>
            </p>
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-3 space-y-3 text-[0.95rem] text-ink">
          <p>{q.explanation}</p>
          <p className="flex gap-2">
            <IconAlert className="text-accent shrink-0 mt-0.5" size={18} />
            <span>
              <strong>Piège classique : </strong>
              {q.trap}
            </span>
          </p>
          {tip && (
            <p className="flex gap-2">
              <IconBulb className="text-brand shrink-0 mt-0.5" size={18} />
              <span>
                <strong>Méthode : </strong>
                {tip}
              </span>
            </p>
          )}
          {listening && (
            <details className="rounded-xl bg-surface p-3 border border-line" open={!correct}>
              <summary className="cursor-pointer font-semibold inline-flex items-center gap-1.5">
                <IconText size={16} /> Transcription
              </summary>
              <div lang="en" className="mt-2 space-y-1 text-sm">
                {transcriptLines(item).map((l, i) => (
                  <p key={i}>
                    {l.speaker && l.speaker !== 'Options' && l.speaker !== 'Speaker' && <strong>{l.speaker} : </strong>}
                    {l.text}
                  </p>
                ))}
              </div>
            </details>
          )}
          <ReportButton q={q} />
        </div>
      )}
    </div>
  );
}
