/**
 * Lecteur de séance générique : leçon, révision, entraînement, mode flash et placement.
 * Une question à la fois ; validation puis retour immédiat ; Entrée pour valider/continuer.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bank } from '../../content/bank';
import { skillTip } from '../../content/bank';
import type { Item } from '../../content/items';
import type { Question } from '../../content/schema';
import type { Mode } from '../../db/db';
import { useApp } from '../../store/app';
import { recordAnswer } from './record';
import { QuestionView } from '../question/QuestionView';
import { Feedback } from '../question/Feedback';
import { Button, ProgressBar } from '../../components/ui';
import { IconClock, IconX } from '../../components/icons';
import { playSfx } from '../audio/sfx';
import { formatClock } from '../../lib/date';
import { stopSpeech } from '../audio/tts';
import { XP } from '../gamification/xp';

export interface ItemProvider {
  next(): Item | null;
  record?(q: Question, correct: boolean): void;
  total(): number;
}

export class ArrayProvider implements ItemProvider {
  private i = 0;
  constructor(private readonly items: Item[]) {}
  next(): Item | null {
    return this.items[this.i++] ?? null;
  }
  total(): number {
    return this.items.reduce((s, it) => s + it.questions.length, 0);
  }
}

/** Fournisseur sans fin (mode flash) : reboucle sur la liste. */
export class LoopProvider implements ItemProvider {
  private i = 0;
  constructor(private readonly items: Item[]) {}
  next(): Item | null {
    if (!this.items.length) return null;
    return this.items[this.i++ % this.items.length];
  }
  total(): number {
    return 0;
  }
}

export interface AnswerResult {
  q: Question;
  choice: number | null;
  correct: boolean;
  ms: number;
}

export interface SessionSummary {
  results: AnswerResult[];
  correct: number;
  answered: number;
  seconds: number;
}

export interface FinishInfo {
  xp?: number;
  lines?: ReactNode[];
}

export interface SessionPlayerProps {
  bank: Bank;
  title: string;
  mode: Mode;
  provider: ItemProvider;
  exitTo: string;
  timeLimitSeconds?: number;
  compactFeedback?: boolean;
  onFinish?: (s: SessionSummary) => Promise<FinishInfo | void>;
  renderSummaryActions?: (s: SessionSummary) => ReactNode;
}

export function SessionPlayer({ bank, title, mode, provider, exitTo, timeLimitSeconds, compactFeedback, onFinish, renderSummaryActions }: SessionPlayerProps) {
  const navigate = useNavigate();
  const settings = useApp((s) => s.settings);
  const [item, setItem] = useState<Item | null>(() => provider.next());
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [finished, setFinished] = useState<SessionSummary | null>(null);
  const [finishInfo, setFinishInfo] = useState<FinishInfo | null>(null);
  const [xpPop, setXpPop] = useState(0);
  const [anim, setAnim] = useState('');
  const shownAt = useRef(performance.now());
  const startedAt = useRef(performance.now());
  const [remaining, setRemaining] = useState(timeLimitSeconds ?? 0);
  const busy = useRef(false);

  const total = provider.total();
  const q = item?.questions[qi];

  useEffect(() => {
    shownAt.current = performance.now();
  }, [item, qi]);

  const finish = useCallback(
    async (res: AnswerResult[]) => {
      stopSpeech();
      const summary: SessionSummary = {
        results: res,
        correct: res.filter((r) => r.correct).length,
        answered: res.length,
        seconds: (performance.now() - startedAt.current) / 1000,
      };
      setFinished(summary);
      playSfx(settings.sound, 'complete');
      const info = (await onFinish?.(summary)) ?? null;
      setFinishInfo(info);
    },
    [onFinish, settings.sound],
  );

  // Chronomètre du mode flash.
  useEffect(() => {
    if (!timeLimitSeconds || finished) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLimitSeconds, finished]);
  useEffect(() => {
    if (timeLimitSeconds && remaining === 0 && !finished && !revealed) void finish(results);
  }, [remaining, timeLimitSeconds, finished, revealed, finish, results]);

  const validate = useCallback(async () => {
    if (!q || selected === null || revealed || busy.current) return;
    busy.current = true;
    const ms = performance.now() - shownAt.current;
    const correct = selected === q.answer;
    setRevealed(true);
    setAnim(correct ? 'anim-pop' : 'anim-shake');
    playSfx(settings.sound, correct ? 'correct' : 'wrong');
    if (correct) setXpPop((n) => n + 1);
    provider.record?.(q, correct);
    setResults((r) => [...r, { q, choice: selected, correct, ms }]);
    await recordAnswer({ q, choice: selected, ms, mode, xp: mode === 'placement' ? 0 : undefined });
    busy.current = false;
  }, [q, selected, revealed, settings.sound, provider, mode]);

  const advance = useCallback(() => {
    if (!item || !revealed) return;
    setAnim('');
    setSelected(null);
    setRevealed(false);
    if (timeLimitSeconds && remaining === 0) {
      void finish(results);
      return;
    }
    if (qi + 1 < item.questions.length) {
      setQi(qi + 1);
      return;
    }
    stopSpeech();
    const next = provider.next();
    if (!next) {
      void finish(results);
      return;
    }
    setItem(next);
    setQi(0);
  }, [item, revealed, qi, provider, finish, results, timeLimitSeconds, remaining]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || finished) return;
      if (e.target instanceof HTMLElement && ['TEXTAREA', 'SELECT', 'INPUT'].includes(e.target.tagName)) return;
      if (e.target instanceof HTMLElement && e.target.closest('dialog')) return;
      e.preventDefault();
      if (revealed) advance();
      else void validate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, advance, validate, finished]);

  const quit = () => {
    if (results.length === 0 || window.confirm('Quitter la séance ? Vos réponses déjà données sont enregistrées.')) {
      stopSpeech();
      navigate(exitTo);
    }
  };

  const tip = useMemo(() => (q ? q.tip ?? skillTip(bank, q.skill) : undefined), [q, bank]);

  if (finished) {
    const acc = finished.answered ? Math.round((finished.correct / finished.answered) * 100) : 0;
    const mistakes = finished.results.filter((r) => !r.correct);
    return (
      <div className="max-w-xl mx-auto anim-rise">
        <div className="text-center py-6">
          <div className="text-5xl mb-2" aria-hidden="true">
            {acc >= 90 ? '🏔️' : acc >= 60 ? '⛰️' : '🥾'}
          </div>
          <h1 className="text-2xl font-extrabold">{acc >= 90 ? 'Superbe ascension !' : acc >= 60 ? 'Étape franchie' : 'Chaque pas compte'}</h1>
          <p className="text-muted">{title}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-surface border border-line p-3 text-center">
            <div className="text-2xl font-extrabold tabular-nums">{acc} %</div>
            <div className="text-xs text-muted">de réussite</div>
          </div>
          <div className="rounded-xl bg-surface border border-line p-3 text-center">
            <div className="text-2xl font-extrabold tabular-nums">
              {finished.correct}/{finished.answered}
            </div>
            <div className="text-xs text-muted">bonnes réponses</div>
          </div>
          <div className="rounded-xl bg-surface border border-line p-3 text-center">
            <div className="text-2xl font-extrabold tabular-nums">{formatClock(finished.seconds)}</div>
            <div className="text-xs text-muted">durée</div>
          </div>
        </div>
        {finishInfo?.xp !== undefined && <p className="text-center font-bold text-accent mb-2">+{finishInfo.xp} XP</p>}
        {finishInfo?.lines?.map((l, i) => (
          <div key={i} className="mb-2">
            {l}
          </div>
        ))}
        {mistakes.length > 0 && (
          <details className="rounded-xl bg-surface border border-line p-3 mb-4">
            <summary className="cursor-pointer font-semibold">Revoir mes {mistakes.length} erreur{mistakes.length > 1 ? 's' : ''} (ajoutées à la révision espacée)</summary>
            <ul className="mt-2 space-y-3">
              {mistakes.map((m, i) => (
                <li key={i} className="text-sm border-t border-line pt-2">
                  <p lang={m.q.exam === 'toeic' ? 'en' : 'fr'} className="font-medium whitespace-pre-line">{m.q.prompt || 'Question d’écoute'}</p>
                  <p className="text-ok">✓ {m.q.options[m.q.answer]}</p>
                  <p className="text-muted">{m.q.explanation}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="flex flex-wrap gap-2 justify-center">
          {renderSummaryActions?.(finished)}
          <Button variant="secondary" onClick={() => navigate(exitTo)}>
            Continuer
          </Button>
        </div>
      </div>
    );
  }

  if (!item || !q) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold">Aucune question disponible pour cette séance.</p>
        <p className="text-muted text-sm mt-1">Terminez un examen blanc ou activez « inclure les questions des examens blancs » dans les réglages pour élargir la banque.</p>
        <Button className="mt-4" onClick={() => navigate(exitTo)}>
          Retour
        </Button>
      </div>
    );
  }

  const progress = total ? results.length / total : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4 sticky top-0 bg-canvas/95 backdrop-blur py-2 z-10">
        <button type="button" onClick={quit} className="p-2 -ml-2 rounded-lg hover:bg-surface-2" aria-label="Quitter la séance">
          <IconX />
        </button>
        {total > 0 ? (
          <ProgressBar value={progress} label={`Progression : ${results.length} sur ${total}`} tone="ok" />
        ) : (
          <div className="flex-1 text-sm text-muted">{title}</div>
        )}
        {timeLimitSeconds ? (
          <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${remaining <= 30 ? 'text-bad' : ''}`} aria-live="off">
            <IconClock size={18} /> {formatClock(remaining)}
          </span>
        ) : (
          <span className="text-sm text-muted tabular-nums">
            {revealed ? results.length : results.length + 1}/{total || '∞'}
          </span>
        )}
      </div>

      <div className={`relative ${anim}`} key={`${item.key}-${qi}`}>
        <QuestionView item={item} qIndex={qi} selected={selected} onSelect={setSelected} reveal={revealed} mode="practice" showListeningText={settings.showListeningText} />
        {revealed && results[results.length - 1]?.correct && (
          <span key={xpPop} className="anim-float absolute right-2 -top-2 font-extrabold text-accent pointer-events-none" aria-hidden="true">
            +{mode === 'review' ? XP.reviewCorrect : mode === 'placement' ? 0 : XP.correctAnswer} XP
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3 pb-6">
        {revealed && <Feedback q={q} item={item} choice={selected} tip={tip} compact={compactFeedback} />}
        <div className="flex justify-end">
          {revealed ? (
            <Button size="lg" onClick={advance} autoFocus>
              Continuer
            </Button>
          ) : (
            <Button size="lg" onClick={() => void validate()} disabled={selected === null}>
              Valider
            </Button>
          )}
        </div>
        <p className="text-xs text-muted text-right hidden sm:block">Raccourcis : 1-5 ou A-E pour choisir · Entrée pour valider · Espace pour l’audio</p>
      </div>
    </div>
  );
}
