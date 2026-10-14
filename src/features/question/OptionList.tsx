/** Liste d'options accessible (groupe radio) : clic, touches 1-5 ou A-E. */
import { useEffect } from 'react';
import { LETTERS } from '../../content/exams';
import { Domino, parseDominoOption } from './MediaView';
import { IconCheck, IconX } from '../../components/icons';

export interface OptionListProps {
  options: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  /** Après correction : affiche bonne et mauvaise réponses. */
  reveal?: { answer: number } | null;
  /** Masque le texte (Parties 1 et 2 du TOEIC, comme au test réel). */
  hideText?: boolean;
  disabled?: boolean;
  lang?: string;
  keyboard?: boolean;
  name: string;
}

export function OptionList({ options, selected, onSelect, reveal, hideText, disabled, lang, keyboard = true, name }: OptionListProps) {
  useEffect(() => {
    if (!keyboard || disabled || reveal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) {
        onSelect(n - 1);
        e.preventDefault();
        return;
      }
      const li = LETTERS.indexOf(e.key.toUpperCase() as (typeof LETTERS)[number]);
      if (li >= 0 && li < options.length) {
        onSelect(li);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, disabled, reveal, options.length, onSelect]);

  return (
    <div role="radiogroup" aria-label="Propositions" className={`grid gap-2 ${hideText ? 'grid-cols-4' : ''}`}>
      {options.map((opt, i) => {
        const isSel = selected === i;
        const isAnswer = reveal && reveal.answer === i;
        const isWrongSel = reveal && isSel && reveal.answer !== i;
        const domino = parseDominoOption(opt);
        const base = 'w-full text-left rounded-xl border-2 px-3.5 py-3 flex items-center gap-3 transition-colors';
        const state = isAnswer
          ? 'border-ok bg-ok-soft'
          : isWrongSel
            ? 'border-bad bg-bad-soft'
            : isSel
              ? 'border-brand bg-brand-soft'
              : 'border-line bg-surface hover:border-brand/60';
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isSel}
            name={name}
            disabled={disabled || !!reveal}
            onClick={() => onSelect(i)}
            className={`${base} ${state} ${hideText ? 'justify-center' : ''} disabled:cursor-default`}
          >
            <span className={`grid place-items-center shrink-0 h-8 w-8 rounded-lg text-sm font-bold ${isSel || isAnswer ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted'} ${isAnswer ? '!bg-ok !text-white' : ''} ${isWrongSel ? '!bg-bad !text-white' : ''}`}>
              {LETTERS[i]}
            </span>
            {!hideText && (
              <span lang={lang} className="flex-1 leading-snug">
                {domino ? <Domino top={domino[0]} bottom={domino[1]} small /> : opt}
              </span>
            )}
            {isAnswer && <IconCheck className="text-ok shrink-0" aria-label="Bonne réponse" />}
            {isWrongSel && <IconX className="text-bad shrink-0" aria-label="Votre réponse" />}
          </button>
        );
      })}
    </div>
  );
}
