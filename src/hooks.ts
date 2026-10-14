/** Hooks partagés : banque de questions, disponibilité des questions, date du jour. */
import { useEffect, useMemo, useState } from 'react';
import { loadBank, type Bank } from './content/bank';
import type { Availability } from './content/items';
import type { ExamId } from './content/schema';
import { useApp } from './store/app';
import { dayKey } from './lib/date';

export function useBank(exam: ExamId | undefined): { bank: Bank | null; error: string | null } {
  const [bank, setBank] = useState<Bank | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!exam) return;
    let alive = true;
    setBank(null);
    loadBank(exam)
      .then((b) => alive && setBank(b))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [exam]);
  return { bank, error };
}

export function useAvailability(): Availability {
  // Clé texte : le profil est relu depuis IndexedDB à chaque gain d'XP (nouveau tableau à chaque
  // fois) ; sans elle, les séances en cours seraient recomposées après chaque réponse.
  const key = useApp((s) => s.profile.completedMocks.join('|'));
  const includeMockQuestions = useApp((s) => s.settings.includeMockQuestions);
  return useMemo(() => ({ completedMocks: new Set(key ? key.split('|') : []), includeMockQuestions }), [key, includeMockQuestions]);
}

/** Date du jour, rafraîchie si l'app reste ouverte après minuit. */
export function useToday(): string {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const t = setInterval(() => setToday(dayKey()), 60_000);
    return () => clearInterval(t);
  }, []);
  return today;
}

export function isExamId(x: string | undefined): x is ExamId {
  return x === 'toeic' || x === 'tagemage';
}
