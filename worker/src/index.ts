/**
 * Service d'envoi des notifications d'Ascension (Cloudflare Workers, offre gratuite).
 *
 * Données conservées par abonnement (KV « SUBS ») : adresse d'abonnement push anonyme,
 * heures choisies, fuseau horaire. Rien d'autre (ni nom, ni e-mail, ni résultats).
 * Toutes les 5 minutes, la tâche planifiée envoie les messages dont l'heure est arrivée.
 *
 * Routes : POST /subscribe, POST /unsubscribe, GET /health.
 */
import { sendPush, type PushSubscriptionJSON, type VapidConfig } from './webpush';

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

interface Env {
  SUBS: KV;
  ALLOWED_ORIGINS: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_SUBJECT: string;
  VAPID_PRIVATE_JWK: string;
}

interface Record_ {
  subscription: PushSubscriptionJSON;
  times: string[];
  streakTime: string | null;
  tz: string;
  updatedAt: string;
}

// Services de push des navigateurs acceptés (Apple, Google, Mozilla, Microsoft).
const PUSH_HOSTS = /^(web\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function cors(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

async function keyFor(endpoint: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return `sub:${[...digest].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function validTz(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function parseSubscription(x: unknown): PushSubscriptionJSON | null {
  const s = x as PushSubscriptionJSON;
  try {
    if (!s || typeof s.endpoint !== 'string' || s.endpoint.length > 1024) return null;
    const url = new URL(s.endpoint);
    if (url.protocol !== 'https:' || !PUSH_HOSTS.test(url.hostname)) return null;
    if (typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string') return null;
    return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
  } catch {
    return null;
  }
}

/** Heure locale HH:MM (arrondie aux 5 minutes inférieures) dans un fuseau donné. */
export function localSlot(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return `${h}:${String(m - (m % 5)).padStart(2, '0')}`;
}

function vapid(env: Env): VapidConfig {
  return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: env.VAPID_SUBJECT };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const headers = { ...cors(origin, env), 'Content-Type': 'application/json' };
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/health') return reply(200, { ok: true });
    if (request.method !== 'POST') return reply(405, { error: 'method' });
    if (Number(request.headers.get('Content-Length') ?? '0') > 4096) return reply(413, { error: 'too large' });

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return reply(400, { error: 'json' });
    }

    if (pathname === '/subscribe') {
      const subscription = parseSubscription(body.subscription);
      const times = Array.isArray(body.times) ? body.times.filter((t): t is string => typeof t === 'string' && TIME.test(t)).slice(0, 3) : [];
      const streakTime = typeof body.streakTime === 'string' && TIME.test(body.streakTime) ? body.streakTime : null;
      if (!subscription || !validTz(body.tz) || (times.length === 0 && !streakTime)) return reply(400, { error: 'invalid' });
      const record: Record_ = { subscription, times, streakTime, tz: body.tz, updatedAt: new Date().toISOString() };
      await env.SUBS.put(await keyFor(subscription.endpoint), JSON.stringify(record));
      return reply(200, { ok: true });
    }

    if (pathname === '/unsubscribe') {
      if (typeof body.endpoint !== 'string') return reply(400, { error: 'invalid' });
      await env.SUBS.delete(await keyFor(body.endpoint));
      return reply(200, { ok: true });
    }

    return reply(404, { error: 'not found' });
  },

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const now = new Date();
    const config = vapid(env);
    let cursor: string | undefined;
    do {
      const page = await env.SUBS.list({ prefix: 'sub:', cursor });
      for (const { name } of page.keys) {
        const raw = await env.SUBS.get(name);
        if (!raw) continue;
        const rec = JSON.parse(raw) as Record_;
        const slot = localSlot(now, rec.tz);
        const kind = rec.streakTime === slot ? 'streak' : rec.times.includes(slot) ? 'notion' : null;
        if (!kind) continue;
        try {
          const status = await sendPush(rec.subscription, { kind }, config);
          // Abonnement expiré ou révoqué : on l'oublie.
          if (status === 404 || status === 410) await env.SUBS.delete(name);
        } catch {
          /* erreur réseau ponctuelle : nouvelle tentative au prochain créneau */
        }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  },
};
