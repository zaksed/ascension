import { describe, expect, it } from 'vitest';
import { b64urlDecode, b64urlEncode, concat, encryptPayload, vapidAuthorization } from '../worker/src/webpush';
import { localSlot } from '../worker/src/index';

const enc = new TextEncoder();

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

describe('Web Push (service de notifications)', () => {
  it('chiffre un message que le navigateur destinataire sait déchiffrer (RFC 8291)', async () => {
    // Clés du « navigateur » destinataire.
    const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
    const sub = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: b64urlEncode(uaPublic), auth: b64urlEncode(auth) } };

    const body = await encryptPayload(sub, enc.encode(JSON.stringify({ kind: 'notion' })));

    // Déchiffrement, comme le ferait le navigateur.
    const salt = body.slice(0, 16);
    const rs = new DataView(body.buffer).getUint32(16);
    const idlen = body[20];
    const asPublic = body.slice(21, 21 + idlen);
    const ciphertext = body.slice(21 + idlen);
    expect(rs).toBe(4096);
    expect(idlen).toBe(65);
    const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
    const ikm = await hkdf(b64urlDecode(sub.keys.auth), ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
    const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, ciphertext));
    expect(plain[plain.length - 1]).toBe(2);
    expect(JSON.parse(new TextDecoder().decode(plain.slice(0, -1)))).toEqual({ kind: 'notion' });
  });

  it('signe un jeton VAPID vérifiable avec la clé publique', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const publicKey = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const header = await vapidAuthorization('https://web.push.apple.com/xyz', 'https://example.org/', publicKey, privateJwk, Date.UTC(2026, 9, 15));
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    expect(k).toBe(publicKey);
    const [h, p, s] = jwt.split('.');
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
    expect(claims.aud).toBe('https://web.push.apple.com');
    expect(claims.sub).toBe('https://example.org/');
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, b64urlDecode(s), enc.encode(`${h}.${p}`));
    expect(ok).toBe(true);
  });

  it('calcule le créneau local (arrondi aux 5 minutes, heure d’été comprise)', () => {
    expect(localSlot(new Date('2026-01-15T07:32:00Z'), 'Europe/Paris')).toBe('08:30');
    expect(localSlot(new Date('2026-07-15T06:34:59Z'), 'Europe/Paris')).toBe('08:30');
    expect(localSlot(new Date('2026-07-15T23:01:00Z'), 'America/Montreal')).toBe('19:00');
  });
});
