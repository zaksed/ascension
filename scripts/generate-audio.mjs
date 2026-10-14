/**
 * FACULTATIF — Pré-génère l'audio du Listening TOEIC avec Piper (synthèse neuronale locale,
 * gratuite, hors ligne) et ffmpeg. Sans ce script, l'application utilise les voix du téléphone.
 *
 * Prérequis, à installer vous-même (le script ne télécharge RIEN) :
 *   - Piper : https://github.com/rhasspy/piper (exécutable `piper` ou chemin via --piper)
 *   - des modèles de voix anglaises .onnx (+ .onnx.json), par exemple en_US, en_GB…
 *   - ffmpeg (exécutable `ffmpeg` ou chemin via --ffmpeg)
 *
 * Configuration : scripts/piper-voices.json associe chaque voix de la banque à un modèle :
 *   { "US-F": "C:/voix/en_US-amy-medium.onnx", "US-M": "…", "UK-F": "…", "UK-M": "…",
 *     "AU-F": "…", "AU-M": "…", "CA-F": "…", "CA-M": "…" }
 *   Une voix absente retombe sur une autre voix du même genre, puis sur n'importe laquelle.
 *
 * Usage :
 *   npm run audio                       # génère ce qui manque
 *   npm run audio -- --force            # régénère tout
 *   npm run audio -- --only part2       # une seule partie
 *   npm run audio -- --piper C:/piper/piper.exe --ffmpeg C:/ffmpeg/bin/ffmpeg.exe
 *
 * Sortie : public/audio/<clé>.mp3 et public/audio/manifest.json ({ clé: fichier }).
 * La clé est l'identifiant du groupe (Parties 3-4) ou de la question (Parties 1-2),
 * exactement comme src/features/audio/script.ts.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const FORCE = args.includes('--force');
const ONLY = opt('only', null);
const PIPER = opt('piper', 'piper');
const FFMPEG = opt('ffmpeg', 'ffmpeg');
const VOICES_FILE = opt('voices', 'scripts/piper-voices.json');
const OUT = 'public/audio';
const RATE = 24000;
const LETTERS = ['A', 'B', 'C', 'D'];

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function check(cmd, versionArgs) {
  const r = spawnSync(cmd, versionArgs, { encoding: 'utf8' });
  return !r.error;
}

if (!check(FFMPEG, ['-version'])) fail(`ffmpeg introuvable (« ${FFMPEG} »). Installez-le ou passez --ffmpeg <chemin>.`);
if (!check(PIPER, ['--help'])) fail(`Piper introuvable (« ${PIPER} »). Installez-le ou passez --piper <chemin>.`);
if (!existsSync(VOICES_FILE)) fail(`Fichier de voix absent : ${VOICES_FILE} (voir l'en-tête de ce script).`);
const voiceModels = JSON.parse(readFileSync(VOICES_FILE, 'utf8'));
for (const [v, model] of Object.entries(voiceModels)) if (!existsSync(model)) fail(`Modèle introuvable pour ${v} : ${model}`);
if (!Object.keys(voiceModels).length) fail('Aucun modèle configuré.');

function modelFor(voice) {
  if (voiceModels[voice]) return voiceModels[voice];
  const gender = voice.split('-')[1];
  const same = Object.keys(voiceModels).find((k) => k.endsWith(`-${gender}`));
  return voiceModels[same ?? Object.keys(voiceModels)[0]];
}

// --- Lecture de la banque TOEIC (mêmes règles que src/features/audio/script.ts) ---
const dir = 'content/toeic';
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'curriculum.json');
const jobs = new Map();
for (const f of files) {
  const data = JSON.parse(readFileSync(join(dir, f), 'utf8').replace(/^\uFEFF/, ''));
  for (const g of data.groups ?? []) {
    if (g.transcript && ['part3', 'part4'].includes(g.section)) jobs.set(g.id, { section: g.section, lines: g.transcript });
  }
  for (const q of data.questions ?? []) {
    if (q.groupId || !q.listening || !['part1', 'part2'].includes(q.section)) continue;
    const lines = [...q.listening.script];
    if (q.listening.readOptions) {
      const voice = q.listening.optionsVoice ?? q.listening.script[0]?.voice ?? 'US-F';
      q.options.forEach((o, i) => lines.push({ speaker: 'Options', voice, text: `${LETTERS[i]}. ${o}` }));
    }
    jobs.set(q.id, { section: q.section, lines });
  }
}

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const tmp = join(tmpdir(), `ascension-audio-${process.pid}`);
mkdirSync(tmp, { recursive: true });

function synth(text, voice, i) {
  const wav = join(tmp, `l${i}.wav`);
  const raw = join(tmp, `l${i}.raw`);
  const p = spawnSync(PIPER, ['--model', modelFor(voice), '--output_file', wav], { input: text, encoding: 'utf8' });
  if (p.status !== 0) throw new Error(`Piper : ${p.stderr}`);
  // Conversion en PCM brut 16 bits mono à fréquence commune, pour concaténer sans artefact.
  const f = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', String(RATE), raw]);
  if (f.status !== 0) throw new Error(`ffmpeg : ${f.stderr}`);
  return readFileSync(raw);
}

const silence = (ms) => Buffer.alloc(Math.round((RATE * ms) / 1000) * 2);

let done = 0;
let skipped = 0;
const keys = [...jobs.keys()].filter((k) => !ONLY || jobs.get(k).section === ONLY).sort();
for (const key of keys) {
  const file = `${key}.mp3`;
  if (!FORCE && manifest[key] && existsSync(join(OUT, file))) {
    skipped++;
    continue;
  }
  const parts = [silence(300)];
  let last;
  jobs.get(key).lines.forEach((line, i) => {
    // Pause plus longue entre deux locuteurs, et avant chaque proposition lue.
    if (last !== undefined) parts.push(silence(line.speaker !== last || line.speaker === 'Options' ? 600 : 250));
    parts.push(synth(line.text, line.voice, i));
    last = line.speaker;
  });
  parts.push(silence(300));
  const all = join(tmp, 'all.raw');
  writeFileSync(all, Buffer.concat(parts));
  const enc = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', all, '-b:a', '64k', join(OUT, file)]);
  if (enc.status !== 0) fail(`Encodage MP3 impossible pour ${key} : ${enc.stderr}`);
  manifest[key] = file;
  done++;
  if (done % 10 === 0) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`… ${done} fichiers générés`);
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
rmSync(tmp, { recursive: true, force: true });
console.log(`✔ ${done} fichier(s) généré(s), ${skipped} déjà présent(s). Manifeste : ${manifestPath}`);
console.log('Relancez « npm run build » pour intégrer l’audio à l’application installable.');
