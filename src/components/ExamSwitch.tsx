/** Sélecteur d'examen (TOEIC / TAGE MAGE), mémorisé dans les réglages. */
import type { ExamId } from '../content/schema';
import { useApp } from '../store/app';

export function ExamSwitch({ value, onChange }: { value?: ExamId; onChange?: (e: ExamId) => void }) {
  const active = useApp((s) => s.settings.activeExam);
  const update = useApp((s) => s.updateSettings);
  const current = value ?? active;
  const set = (e: ExamId) => {
    void update({ activeExam: e });
    onChange?.(e);
  };
  return (
    <div role="tablist" aria-label="Examen" className="inline-grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
      {(['toeic', 'tagemage'] as ExamId[]).map((e) => (
        <button
          key={e}
          type="button"
          role="tab"
          aria-selected={current === e}
          onClick={() => set(e)}
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg transition-colors ${current === e ? (e === 'toeic' ? 'bg-toeic text-on-toeic' : 'bg-tm text-on-tm') : 'text-muted hover:text-ink'}`}
        >
          {current !== e && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${e === 'toeic' ? 'bg-toeic' : 'bg-tm'}`} />}
          {e === 'toeic' ? 'TOEIC' : 'TAGE MAGE'}
        </button>
      ))}
    </div>
  );
}
