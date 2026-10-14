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
          className={`px-4 py-1.5 rounded-lg transition-colors ${current === e ? (e === 'toeic' ? 'bg-toeic text-white' : 'bg-tm text-white') : 'text-muted hover:text-ink'}`}
        >
          {e === 'toeic' ? 'TOEIC' : 'TAGE MAGE'}
        </button>
      ))}
    </div>
  );
}
