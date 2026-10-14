/**
 * Moteur audio du Listening.
 * 1. Si un fichier pré-généré existe (public/audio/manifest.json, créé par `npm run audio`),
 *    on le lit : voix neuronales de qualité constante.
 * 2. Sinon, synthèse vocale locale de l'appareil (Web Speech API), avec choix d'une voix par
 *    accent (US, UK, AU, CA) et par genre. Sur Android et iOS, les voix installées fonctionnent
 *    hors ligne ; on privilégie toujours les voix locales (localService).
 * Aucun service distant n'est appelé.
 */
import type { SpokenLine, Voice } from '../../content/schema';

const LANG: Record<string, string[]> = {
  US: ['en-US'],
  UK: ['en-GB'],
  AU: ['en-AU', 'en-NZ'],
  CA: ['en-CA'],
};

// Indices de genre d'après les noms de voix courants (Windows, macOS/iOS, Android, Chrome).
const FEMALE = /(female|woman|zira|hazel|susan|samantha|karen|moira|tessa|victoria|allison|ava|serena|fiona|kate|libby|sonia|natasha|clara|jenny|aria|emma|amy|linda|catherine|heera|nicky|joanna|salli|kimberly|olivia|ruby|sarah|isabella|mia|zoe|google uk english female|google us english)/i;
const MALE = /(male|man|david|mark|george|daniel|alex|fred|ryan|guy|william|james|liam|thomas|arthur|oliver|aaron|gordon|lee|rishi|tom|brian|matthew|justin|joey|russell|google uk english male)/i;

export interface SpeakOptions {
  rate: number;
  voicePrefs?: Partial<Record<Voice, string>>;
  signal?: AbortSignal;
}

let voicesCache: SpeechSynthesisVoice[] = [];

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const list = window.speechSynthesis.getVoices();
  if (list.length) {
    voicesCache = list;
    return Promise.resolve(list);
  }
  return new Promise((resolve) => {
    const done = () => {
      voicesCache = window.speechSynthesis.getVoices();
      resolve(voicesCache);
    };
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

export function englishVoices(): SpeechSynthesisVoice[] {
  return voicesCache.filter((v) => v.lang.toLowerCase().startsWith('en'));
}

export function accentOf(v: Voice): string {
  return v.split('-')[0];
}

/** Choix de la voix : préférence de l'utilisateur, puis accent, genre et voix locale. */
export function pickVoice(v: Voice, prefs: Partial<Record<Voice, string>> = {}, used: Set<string> = new Set()): SpeechSynthesisVoice | null {
  const voices = englishVoices();
  if (!voices.length) return null;
  const pref = prefs[v] && voices.find((x) => x.voiceURI === prefs[v]);
  if (pref) return pref;
  const [accent, gender] = v.split('-') as [string, 'F' | 'M'];
  const langs = LANG[accent] ?? ['en-US'];
  const genderOk = (x: SpeechSynthesisVoice) => (gender === 'F' ? FEMALE.test(x.name) && !/\bmale\b/i.test(x.name) : MALE.test(x.name));
  const score = (x: SpeechSynthesisVoice) => {
    let s = 0;
    const lang = x.lang.replace('_', '-');
    if (langs.some((l) => lang.toLowerCase() === l.toLowerCase())) s += 8;
    else if (lang.toLowerCase().startsWith('en')) s += 2;
    if (genderOk(x)) s += 4;
    if (x.localService) s += 3;
    if (!used.has(x.voiceURI)) s += 1;
    return s;
  };
  return voices.slice().sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Découpe en phrases courtes : certains navigateurs coupent les énoncés trop longs. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g) ?? [text];
  return parts.map((p) => p.trim()).filter(Boolean);
}

function speakOne(text: string, voice: SpeechSynthesisVoice | null, v: Voice, rate: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = (LANG[accentOf(v)] ?? ['en-US'])[0];
    }
    u.rate = rate;
    // Sans voix du bon genre, on module la hauteur pour distinguer les locuteurs.
    u.pitch = voice && (v.endsWith('F') ? FEMALE.test(voice.name) : MALE.test(voice.name)) ? 1 : v.endsWith('F') ? 1.2 : 0.8;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    signal?.addEventListener('abort', finish, { once: true });
    // Garde-fou : certains moteurs n'émettent jamais « end ».
    const watchdog = setTimeout(finish, Math.max(4000, (text.length / 12) * 1000 * (1 / rate) + 3000));
    window.speechSynthesis.speak(u);
  });
}

const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });

/** Lit une suite de répliques ; la promesse se résout à la fin (ou à l'annulation). */
export async function speakLines(lines: SpokenLine[], opts: SpeakOptions): Promise<void> {
  if (!speechSupported()) return;
  await loadVoices();
  window.speechSynthesis.cancel();
  const used = new Set<string>();
  const chosen = new Map<Voice, SpeechSynthesisVoice | null>();
  let lastSpeaker: string | undefined;
  for (const line of lines) {
    if (opts.signal?.aborted) break;
    if (!chosen.has(line.voice)) {
      const voice = pickVoice(line.voice, opts.voicePrefs, used);
      if (voice) used.add(voice.voiceURI);
      chosen.set(line.voice, voice);
    }
    if (lastSpeaker !== undefined && lastSpeaker !== line.speaker) await pause(350, opts.signal);
    for (const sentence of splitSentences(line.text)) {
      if (opts.signal?.aborted) break;
      await speakOne(sentence, chosen.get(line.voice) ?? null, line.voice, opts.rate, opts.signal);
    }
    lastSpeaker = line.speaker;
  }
}

export function stopSpeech(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// ---------- Fichiers audio pré-générés (optionnels) ----------

let manifestPromise: Promise<Record<string, string>> | null = null;

export function audioManifest(): Promise<Record<string, string>> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
}

export async function playFile(file: string, rate: number, signal?: AbortSignal): Promise<void> {
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/${file}`);
  audio.playbackRate = rate;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    audio.onended = done;
    audio.onerror = done;
    signal?.addEventListener('abort', () => {
      audio.pause();
      done();
    }, { once: true });
    audio.play().catch(done);
  });
}

/** Point d'entrée : fichier pré-généré si disponible, sinon synthèse locale. */
export async function playListening(key: string, lines: SpokenLine[], opts: SpeakOptions): Promise<'file' | 'tts' | 'none'> {
  const manifest = await audioManifest();
  if (manifest[key]) {
    await playFile(manifest[key], opts.rate, opts.signal);
    return 'file';
  }
  if (!speechSupported()) return 'none';
  // Aucune voix anglaise installée : la lecture serait muette ou prononcée avec une voix d'une
  // autre langue ; on bascule sur la transcription (l'interface explique comment ajouter une voix).
  await loadVoices();
  if (!englishVoices().length) return 'none';
  await speakLines(lines, opts);
  return 'tts';
}
