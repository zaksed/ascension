/**
 * Génère la paire de clés VAPID du service de notifications (une seule fois).
 * - La clé publique est affichée : elle va dans worker/wrangler.toml (VAPID_PUBLIC_KEY)
 *   et dans .env.production (VITE_VAPID_PUBLIC_KEY).
 * - La clé privée est écrite dans worker/.vapid.json (ignoré par Git) : elle sert uniquement
 *   à définir le secret du worker (`npx wrangler secret put VAPID_PRIVATE_JWK`). Ne la publiez pas.
 * Usage : node scripts/vapid-keys.mjs
 */
import { existsSync, writeFileSync } from 'node:fs';

const out = new URL('../worker/.vapid.json', import.meta.url);
if (existsSync(out)) {
  console.error('worker/.vapid.json existe déjà : supprimez-le d’abord si vous voulez vraiment changer de clés (les abonnements existants devront être refaits).');
  process.exit(1);
}
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const publicKey = Buffer.from(raw).toString('base64url');
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
writeFileSync(out, JSON.stringify({ publicKey, privateJwk }, null, 2));
console.log(`Clé publique VAPID : ${publicKey}`);
console.log('Clé privée enregistrée dans worker/.vapid.json (ne pas publier).');
