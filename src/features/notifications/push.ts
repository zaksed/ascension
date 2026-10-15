/**
 * Notifications push (rappels de série et notions du jour).
 *
 * Le web ne permet pas de programmer seul des notifications : un petit service d'envoi
 * (worker/, Cloudflare Workers) déclenche les rappels aux heures choisies. Il ne reçoit que
 * l'adresse d'abonnement anonyme du navigateur, les heures et le fuseau horaire. Le contenu
 * affiché (notion, état de la série) est choisi sur l'appareil par public/push-sw.js.
 */
import type { NotificationSettings } from '../../db/db';

const PUSH_URL = (import.meta.env.VITE_PUSH_URL as string | undefined)?.replace(/\/$/, '');
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const DEFAULT_TIMES = ['08:30', '13:00', '18:30'];

export function pushConfigured(): boolean {
  return Boolean(PUSH_URL && VAPID_PUBLIC_KEY);
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Application ouverte depuis l'écran d'accueil (obligatoire pour les notifications sur iPhone). */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function permission(): NotificationPermission | 'unsupported' {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Arrondit une heure HH:MM aux 5 minutes inférieures (pas du service d'envoi). */
export function roundTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '08:30';
  return `${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`;
}

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${PUSH_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Service de notifications : erreur ${res.status}`);
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Service worker indisponible : rechargez l’application.')), 8000)),
  ]);
  return reg;
}

function schedule(n: NotificationSettings) {
  return {
    times: n.times.slice(0, 3).map(roundTime),
    streakTime: n.streak ? roundTime(n.streakTime) : null,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/** Demande l'autorisation, abonne l'appareil et transmet l'horaire. À appeler sur un geste de l'utilisateur. */
export async function enablePush(n: NotificationSettings): Promise<void> {
  if (!pushConfigured()) throw new Error('Le service d’envoi des notifications n’est pas encore configuré.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications refusées. Vous pouvez les autoriser dans les réglages du téléphone.');
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY!) });
  await post('/subscribe', { subscription: sub.toJSON(), ...schedule(n) });
}

/** Met à jour l'horaire côté service (sans redemander l'autorisation). */
export async function syncPush(n: NotificationSettings): Promise<void> {
  if (!pushConfigured() || !n.enabled || permission() !== 'granted') return;
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) await post('/subscribe', { subscription: sub.toJSON(), ...schedule(n) });
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (pushConfigured()) await post('/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
  await sub.unsubscribe();
}

/** Notification d'essai affichée immédiatement par l'appareil (aucun envoi réseau). */
export async function testNotification(): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications refusées. Vous pouvez les autoriser dans les réglages du téléphone.');
  const reg = await registration();
  await reg.showNotification('Ascension', {
    body: 'Les notifications fonctionnent. À bientôt pour la notion du jour !',
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: 'ascension-test',
  });
}
