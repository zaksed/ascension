/**
 * Lecteur audio du Listening. En entraînement : lecture, réécoute, vitesse réglable.
 * En examen blanc : une seule écoute, déclenchée automatiquement (voir ExamRunner).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item } from '../../content/items';
import { audioKey, isListeningItem, listeningLines, transcriptLines } from '../audio/script';
import { audioManifest, englishVoices, loadVoices, playListening, speechSupported, stopSpeech } from '../audio/tts';
import { useApp } from '../../store/app';
import { IconHeadphones, IconPlay, IconReplay, IconStop } from '../../components/icons';

/**
 * L'audio de cet item peut-il être joué ? (fichier pré-généré, ou au moins une voix anglaise).
 * null tant que la vérification est en cours. Sans audio, la transcription remplace l'écoute.
 */
export function useAudioAvailable(item: Item | null): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!item || !isListeningItem(item)) return;
    let alive = true;
    void (async () => {
      const manifest = await audioManifest();
      let available = !!manifest[audioKey(item)];
      if (!available && speechSupported()) {
        await loadVoices();
        available = englishVoices().length > 0;
      }
      if (alive) setOk(available);
    })();
    return () => {
      alive = false;
    };
  }, [item]);
  return ok;
}

/** Transcription affichée à la place de l'audio quand aucune voix n'est disponible. */
export function TranscriptFallback({ item }: { item: Item }) {
  return (
    <div className="rounded-xl border border-bad bg-bad-soft p-3 text-sm">
      <p className="font-semibold mb-1">Aucune voix anglaise sur cet appareil : lisez la transcription.</p>
      <div lang="en" className="space-y-1">
        {transcriptLines(item).map((l, i) => (
          <p key={i}>
            {l.speaker && l.speaker !== 'Options' && <strong>{l.speaker} : </strong>}
            {l.text}
          </p>
        ))}
      </div>
      <p className="text-xs text-muted mt-2">Pour entendre l’audio, ajoutez une voix anglaise dans les réglages de synthèse vocale du système (voir Réglages › Audio du Listening).</p>
    </div>
  );
}

export function useListening(item: Item) {
  const { speechRate, voicePrefs } = useApp((s) => s.settings);
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [plays, setPlays] = useState(0);
  const [engine, setEngine] = useState<'file' | 'tts' | 'none' | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    ctrl.current?.abort();
    stopSpeech();
  }, []);

  const play = useCallback(
    async (rate?: number) => {
      stop();
      const c = new AbortController();
      ctrl.current = c;
      setState('playing');
      setPlays((p) => p + 1);
      const used = await playListening(audioKey(item), listeningLines(item), { rate: rate ?? speechRate, voicePrefs, signal: c.signal });
      setEngine(used);
      if (!c.signal.aborted) setState('done');
      return used;
    },
    [item, speechRate, voicePrefs, stop],
  );

  useEffect(() => () => stop(), [item, stop]);

  return { state, plays, engine, play, stop, setState };
}

export function ListeningPanel({ item, autoPlay = false, allowReplay = true }: { item: Item; autoPlay?: boolean; allowReplay?: boolean }) {
  const { state, plays, engine, play, stop } = useListening(item);
  const { speechRate } = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const supported = speechSupported();
  const started = useRef(false);

  useEffect(() => {
    if (autoPlay && !started.current) {
      started.current = true;
      void play();
    }
  }, [autoPlay, play]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (state === 'playing') stop();
        else if (allowReplay || plays === 0) void play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, play, stop, allowReplay, plays]);

  const kind = item.group?.kind === 'conversation' ? 'Conversation' : item.group?.kind === 'talk' ? 'Exposé' : item.questions[0].section === 'part1' ? 'Photo' : 'Question-réponse';
  const threeSpeakers = item.group?.tags.includes('3-locuteurs');

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3 flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 font-semibold">
        <IconHeadphones /> {kind}
        {threeSpeakers && <span className="text-xs font-normal text-muted">(3 personnes)</span>}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {state === 'playing' ? (
          <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 border border-line font-semibold" aria-label="Arrêter l'audio">
            <IconStop size={16} /> Arrêter
          </button>
        ) : (
          (allowReplay || plays === 0) && (
            <button type="button" onClick={() => void play()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-on-brand px-3 py-2 font-semibold" aria-label={plays ? 'Réécouter' : 'Écouter'}>
              {plays ? <IconReplay size={16} /> : <IconPlay size={16} />} {plays ? 'Réécouter' : 'Écouter'}
            </button>
          )
        )}
        {allowReplay && (
          <label className="text-sm text-muted inline-flex items-center gap-1">
            Vitesse
            <select
              className="rounded-md border border-line bg-surface px-1.5 py-1 text-ink"
              value={speechRate}
              onChange={(e) => void updateSettings({ speechRate: Number(e.target.value) })}
              aria-label="Vitesse de lecture"
            >
              {[0.75, 0.9, 1, 1.1, 1.25].map((r) => (
                <option key={r} value={r}>
                  ×{r}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {(!supported || engine === 'none') && (
        <p className="w-full text-sm text-bad">Audio indisponible sur cet appareil : la transcription est affichée ci-dessous.</p>
      )}
    </div>
  );
}
