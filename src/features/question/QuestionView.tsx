/**
 * Affiche un item (document éventuel + question courante + propositions).
 * Utilisé par les leçons, les révisions, l'entraînement, le placement et les examens blancs.
 */
import type { Item } from '../../content/items';
import { isListeningItem } from '../audio/script';
import { ListeningPanel, TranscriptFallback, useAudioAvailable } from './ListeningPanel';
import { MediaView } from './MediaView';
import { OptionList } from './OptionList';
import { PassageList } from './PassageView';
import { sectionDef } from '../../content/exams';

export interface QuestionViewProps {
  item: Item;
  qIndex: number;
  selected: number | null;
  onSelect: (i: number) => void;
  reveal: boolean;
  mode: 'practice' | 'exam';
  showListeningText?: boolean;
  /** Examen : l'audio est piloté par l'ExamRunner (pas de bouton de réécoute). */
  hideAudioControls?: boolean;
  numbering?: (qIndex: number) => number;
}

export function QuestionView({ item, qIndex, selected, onSelect, reveal, mode, showListeningText, hideAudioControls, numbering }: QuestionViewProps) {
  const q = item.questions[qIndex];
  const listening = isListeningItem(item);
  // Sans voix anglaise ni fichier audio : la transcription et les options remplacent l'écoute.
  const noAudio = useAudioAvailable(listening ? item : null) === false;
  const lang = q.exam === 'toeic' ? 'en' : 'fr';
  const section = q.section;
  // Parties 1-2 : options non imprimées au test réel ; affichées après correction (ou en mode facile).
  const hideText = (section === 'part1' || section === 'part2') && !reveal && !noAudio && !(mode === 'practice' && showListeningText);
  const promptHidden = section === 'part2' && !reveal && !noAudio && !(mode === 'practice' && showListeningText);
  // Partie 6 : le blanc correspondant à la question courante est mis en évidence.
  const groupPos = item.groupIndex?.[qIndex] ?? qIndex + 1;
  const number = numbering?.(qIndex);

  return (
    <div className="space-y-4">
      {listening && !hideAudioControls &&
        (!noAudio ? (
          <ListeningPanel item={item} allowReplay={mode === 'practice'} />
        ) : item.group?.transcript && !reveal ? (
          <TranscriptFallback item={item} />
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Audio indisponible (aucune voix anglaise sur cet appareil) : le texte est affiché à la place.</p>
        ))}
      {item.group?.media && <MediaView media={item.group.media} />}
      {!item.group && q.media && <MediaView media={q.media} />}
      {item.group?.passages && (
        <PassageList passages={item.group.passages} currentBlank={section === 'part6' ? groupPos : undefined} lang={lang} />
      )}
      <div>
        {item.group && item.questions.length > 1 && (
          <p className="text-xs font-semibold text-muted mb-1">
            Question {qIndex + 1} sur {item.questions.length}
            {item.group.passages && section === 'part6' && ` · blanc (${groupPos})`}
          </p>
        )}
        {q.prompt && section !== 'part1' && (
          <h2 lang={lang} className="text-[1.05rem] sm:text-lg font-semibold leading-snug whitespace-pre-line mb-3">
            {number !== undefined && <span className="text-muted mr-1.5">{number}.</span>}
            {promptHidden ? <span className="text-muted italic">Écoutez la question et les trois réponses.</span> : q.prompt}
          </h2>
        )}
        {section === 'part1' && <p className="text-muted text-sm mb-2">{number !== undefined && `${number}. `}Choisissez la phrase qui décrit le mieux l’image.</p>}
        {q.section === 'conditions-minimales' && <p className="text-xs text-muted mb-2">{sectionDef('conditions-minimales').directions}</p>}
        <OptionList
          name={q.id}
          options={q.options}
          selected={selected}
          onSelect={onSelect}
          reveal={reveal ? { answer: q.answer } : null}
          hideText={hideText}
          lang={lang}
          disabled={reveal}
        />
      </div>
    </div>
  );
}
