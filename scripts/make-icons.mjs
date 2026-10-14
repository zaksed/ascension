/**
 * Génère les icônes PNG de la PWA (192, 512 et 512 « maskable ») sans aucune dépendance :
 * rastérisation des formes du logo (public/icons/logo.svg) avec anticrénelage 4×4,
 * puis encodage PNG avec zlib (module natif de Node).
 * Usage : npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BRAND = [14, 116, 144];
const WHITE = [255, 255, 255];
const SNOW = [214, 243, 248];
const AMBER = [245, 158, 11];

// Géométrie du logo dans un repère 64 × 64 (identique à logo.svg et Logo.tsx).
const SHAPES = [
  { poly: [[8, 52], [26, 22], [34, 34], [40, 26], [56, 52]], color: WHITE, alpha: 0.95 },
  { poly: [[26, 22], [30, 28], [26, 27], [22, 30]], color: SNOW, alpha: 1 },
  { poly: [[38.5, 12], [41.5, 12], [41.5, 26], [38.5, 26]], color: AMBER, alpha: 1 },
  { poly: [[40, 12], [50, 12], [47, 15.5], [50, 19], [40, 19]], color: AMBER, alpha: 1 },
];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundRect(x, y, size, r) {
  if (r === 0) return x >= 0 && y >= 0 && x <= size && y <= size;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Couleur d'un point (repère 64), ou null hors du fond. */
function sample(x, y, maskable) {
  if (!inRoundRect(x, y, 64, maskable ? 0 : 16)) return null;
  // Version « maskable » : contenu réduit à 78 % autour du centre (zone de sécurité).
  const k = maskable ? 0.78 : 1;
  const ux = (x - 32) / k + 32;
  const uy = (y - 32) / k + 32;
  let c = BRAND;
  for (const s of SHAPES) {
    if (inPoly(ux, uy, s.poly)) c = c.map((v, i) => v * (1 - s.alpha) + s.color[i] * s.alpha);
  }
  return c;
}

function render(size, maskable) {
  const ss = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 4); // octet de filtre 0 puis RGBA
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((px + (sx + 0.5) / ss) / size) * 64;
          const y = ((py + (sy + 0.5) / ss) / size) * 64;
          const c = sample(x, y, maskable);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 1;
          }
        }
      }
      const o = 1 + px * 4;
      if (a) {
        row[o] = Math.round(r / a);
        row[o + 1] = Math.round(g / a);
        row[o + 2] = Math.round(b / a);
      }
      row[o + 3] = Math.round((a / (ss * ss)) * 255);
    }
    rows.push(row);
  }
  return encodePng(size, size, Buffer.concat(rows));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  // iPhone : fond plein (iOS arrondit lui-même les coins ; la transparence deviendrait noire).
  ['apple-touch-icon.png', 180, true],
]) {
  writeFileSync(`public/icons/${name}`, render(size, maskable));
  console.log(`public/icons/${name} (${size}×${size}${maskable ? ', maskable' : ''})`);
}
