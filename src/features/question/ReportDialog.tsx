/** Signalement d'une erreur dans une question (stocké localement, exportable depuis les réglages). */
import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { IconFlag } from '../../components/icons';
import { db } from '../../db/db';
import type { Question } from '../../content/schema';

const CATEGORIES = [
  'La bonne réponse est fausse',
  'Plusieurs réponses sont possibles',
  'Explication confuse ou incomplète',
  'Faute de frappe ou d’orthographe',
  'Problème d’audio ou d’illustration',
  'Autre',
];

export function ReportButton({ q }: { q: Question }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  const save = async () => {
    await db.reports.add({ qid: q.id, exam: q.exam, category, comment: comment.trim(), at: new Date().toISOString() });
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setComment('');
    }, 900);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink underline-offset-2 hover:underline">
        <IconFlag size={16} /> Signaler une erreur dans cette question
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Signaler une erreur">
        <p className="text-sm text-muted mb-3">
          Question <code className="font-mono">{q.id}</code>. Le signalement reste sur cet appareil ; vous pourrez l’exporter depuis les réglages.
        </p>
        <label className="block text-sm font-medium mb-1" htmlFor="report-cat">
          Type de problème
        </label>
        <select id="report-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2 mb-3">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="block text-sm font-medium mb-1" htmlFor="report-comment">
          Commentaire (facultatif)
        </label>
        <textarea id="report-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2" placeholder="Ce qui ne va pas…" />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={sent}>
            {sent ? 'Enregistré ✓' : 'Enregistrer'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
