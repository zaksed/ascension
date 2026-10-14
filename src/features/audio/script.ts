/** Texte à lire pour un item d'écoute TOEIC (conforme au déroulé du test). */
import type { Item } from '../../content/items';
import type { SpokenLine, Voice } from '../../content/schema';
import { LETTERS } from '../../content/exams';

export function isListeningItem(item: Item): boolean {
  return ['part1', 'part2', 'part3', 'part4'].includes(item.questions[0]?.section ?? '');
}

/** Clé du fichier audio pré-généré : identifiant de la question (P1/P2) ou du groupe (P3/P4). */
export function audioKey(item: Item): string {
  return item.group?.id ?? item.questions[0].id;
}

export function listeningLines(item: Item): SpokenLine[] {
  const q = item.questions[0];
  if (item.group?.transcript) return item.group.transcript;
  const spec = q.listening;
  if (!spec) return [];
  const lines: SpokenLine[] = [...spec.script];
  if (spec.readOptions) {
    const voice: Voice = spec.optionsVoice ?? spec.script[0]?.voice ?? 'US-F';
    q.options.forEach((opt, i) => lines.push({ speaker: 'Options', voice, text: `${LETTERS[i]}. ${opt}` }));
  }
  return lines;
}

/** Transcription affichée après la réponse. */
export function transcriptLines(item: Item): { speaker?: string; text: string }[] {
  return listeningLines(item).map((l) => ({ speaker: l.speaker, text: l.text }));
}
