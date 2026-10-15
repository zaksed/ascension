/**
 * Choix des voix anglaises par accent (américain, britannique, canadien, australien) et par
 * genre. Utilisé à l'écran de bienvenue et dans les réglages. Les voix proposées sont celles
 * installées sur l'appareil ; « Automatique » laisse le moteur choisir la meilleure.
 */
import { useEffect, useState } from 'react';
import type { Voice } from '../../content/schema';
import { englishVoices, loadVoices, pickVoice, speakLines, speechSupported, stopSpeech, voiceLabel, voicesForAccent, type Accent } from './tts';
import { IconPlay } from '../../components/icons';

const ACCENTS: { id: Accent; label: string; fem: string; sample: string }[] = [
  { id: 'US', label: 'Américain', fem: 'américaine', sample: 'Hi! I will be reading some of the American English recordings for your practice.' },
  { id: 'UK', label: 'Britannique', fem: 'britannique', sample: 'Hello! I will be reading some of the British English recordings for your practice.' },
  { id: 'CA', label: 'Canadien', fem: 'canadienne', sample: 'Hi there! I will be reading some of the Canadian English recordings for your practice.' },
  { id: 'AU', label: 'Australien', fem: 'australienne', sample: 'Hello! I will be reading some of the Australian English recordings for your practice.' },
];

const SLOTS: { suffix: 'F' | 'M'; label: string }[] = [
  { suffix: 'F', label: 'Voix féminine' },
  { suffix: 'M', label: 'Voix masculine' },
];

/** Charge la liste des voix (elle arrive parfois avec un léger délai, surtout sur iOS). */
export function useEnglishVoices(): { ready: boolean; voices: SpeechSynthesisVoice[] } {
  const [state, setState] = useState<{ ready: boolean; voices: SpeechSynthesisVoice[] }>({ ready: false, voices: [] });
  useEffect(() => {
    let alive = true;
    if (!speechSupported()) {
      setState({ ready: true, voices: [] });
      return;
    }
    const refresh = () => void loadVoices().then(() => alive && setState({ ready: true, voices: englishVoices() }));
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => {
      alive = false;
      window.speechSynthesis.removeEventListener('voiceschanged', refresh);
    };
  }, []);
  return state;
}

export function VoicePicker({ prefs, onChange, rate = 1 }: { prefs: Partial<Record<Voice, string>>; onChange: (p: Partial<Record<Voice, string>>) => void; rate?: number }) {
  const { ready, voices } = useEnglishVoices();
  const [playing, setPlaying] = useState<Voice | null>(null);

  if (!ready) return <p className="text-sm text-muted">Recherche des voix installées…</p>;
  if (!speechSupported() || voices.length === 0)
    return (
      <p className="text-sm text-bad">
        Aucune voix anglaise n’est installée sur cet appareil : les enregistrements seront remplacés par leur transcription. Vous pourrez en ajouter une plus tard
        (iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › Anglais ; Android : Paramètres › Synthèse vocale) puis revenir ici depuis les réglages.
      </p>
    );

  const listen = async (slot: Voice, sample: string) => {
    stopSpeech();
    setPlaying(slot);
    await speakLines([{ voice: slot, text: sample }], { rate, voicePrefs: prefs });
    setPlaying((p) => (p === slot ? null : p));
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACCENTS.map((accent) => {
        const own = voicesForAccent(accent.id);
        const choices = own.length ? own : voices;
        return (
          <fieldset key={accent.id} className="rounded-2xl border border-line bg-surface p-3">
            <legend className="px-1 font-bold">{accent.label}</legend>
            {own.length === 0 && <p className="text-xs text-muted mb-2">Pas de voix {accent.fem} sur cet appareil : choisissez la voix anglaise qui s’en rapproche le plus.</p>}
            {SLOTS.map(({ suffix, label }) => {
              const slot = `${accent.id}-${suffix}` as Voice;
              const auto = pickVoice(slot, {});
              const id = `voice-${slot}`;
              return (
                <div key={slot} className="mt-2">
                  <label htmlFor={id} className="text-sm text-muted">
                    {label}
                  </label>
                  <div className="flex gap-2 mt-1">
                    <select
                      id={id}
                      value={prefs[slot] ?? ''}
                      onChange={(e) => onChange({ ...prefs, [slot]: e.target.value || undefined })}
                      className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                    >
                      <option value="">Automatique{auto ? ` (${voiceLabel(auto)})` : ''}</option>
                      {choices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {voiceLabel(v)}
                          {v.localService ? '' : ' · en ligne'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void listen(slot, accent.sample)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-surface-2"
                      aria-label={`Écouter la ${label.toLowerCase()} ${accent.label.toLowerCase()}`}
                    >
                      <IconPlay size={14} /> {playing === slot ? '…' : 'Écouter'}
                    </button>
                  </div>
                </div>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
