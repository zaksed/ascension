/** Sons discrets générés à la volée (Web Audio) : aucun fichier, désactivables dans les réglages. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.06) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  correct() {
    tone(660, 0, 0.12);
    tone(880, 0.09, 0.18);
  },
  wrong() {
    tone(220, 0, 0.22, 'triangle', 0.05);
  },
  complete() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22));
  },
  tick() {
    tone(1200, 0, 0.04, 'square', 0.015);
  },
};

export function playSfx(enabled: boolean, name: keyof typeof sfx): void {
  if (!enabled) return;
  try {
    sfx[name]();
  } catch {
    /* audio indisponible : silence */
  }
}
