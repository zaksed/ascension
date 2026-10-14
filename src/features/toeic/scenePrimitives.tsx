/**
 * Primitives de dessin pour les illustrations originales de la Partie 1 (viewBox 400 × 260).
 * Style « à plat », volontairement simple et lisible sur petit écran.
 */
import type { ReactNode } from 'react';

export const C = {
  wall: '#e7edf4',
  wall2: '#dfe7f0',
  floor: '#cdb79a',
  floorDark: '#b89f80',
  sky: '#cfe7f6',
  grass: '#a3cf8f',
  pavement: '#c9ccd2',
  road: '#8d929b',
  wood: '#a9774f',
  woodDark: '#80573a',
  metal: '#9aa5b1',
  metalDark: '#6b7682',
  white: '#fbfcfe',
  ink: '#2d3748',
  glass: '#bfe0f2',
  plant: '#4f9d5b',
  plantDark: '#3b7c46',
  pot: '#c0663f',
  water: '#7cc2e0',
  waterDark: '#5aa7c8',
};

export const SKIN = ['#f1c7a3', '#d9a27a', '#b07850', '#8a5a3b', '#f6d5bb'];

export type Arm = [number, number, number, number];

export const ARMS: Record<string, Arm> = {
  down: [3, 20, 4, 40],
  typing: [5, 20, -4, 28],
  hold: [6, 18, -2, 24],
  holdHigh: [8, 14, 0, 6],
  up: [8, -14, 12, -32],
  point: [16, -4, 34, -12],
  phone: [12, 14, 0, -14],
  reach: [5, -22, 8, -46],
  shake: [10, 18, 24, 20],
  stir: [12, 16, 24, 14],
  pull: [8, 20, 18, 40],
  press: [12, 10, 26, 6],
  side: [12, 16, 18, 34],
  mic: [14, 8, 20, -6],
};

export interface PersonProps {
  x: number;
  y: number;
  s?: number;
  skin?: string;
  hair?: string;
  hairStyle?: 'short' | 'long' | 'bun' | 'bald' | 'curly';
  top?: string;
  bottom?: string;
  skirt?: boolean;
  pose?: 'stand' | 'sit';
  armL?: Arm;
  armR?: Arm;
  hat?: 'hard' | 'chef';
  hatColor?: string;
  apron?: string;
  hideLegs?: boolean;
  glasses?: boolean;
  /** Personnage vu de dos (file d'attente, public). */
  back?: boolean;
  children?: ReactNode;
}

function ArmPath({ sx, sy, arm, mirror, sleeve, skin }: { sx: number; sy: number; arm: Arm; mirror: boolean; sleeve: string; skin: string }) {
  const m = mirror ? -1 : 1;
  const ex = sx + arm[0] * m;
  const ey = sy + arm[1];
  const hx = sx + arm[2] * m;
  const hy = sy + arm[3];
  return (
    <g strokeLinecap="round">
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={sleeve} strokeWidth={8} />
      <line x1={ex} y1={ey} x2={hx} y2={hy} stroke={skin} strokeWidth={6.5} />
      <circle cx={hx} cy={hy} r={3.8} fill={skin} />
    </g>
  );
}

export function Person({
  x,
  y,
  s = 1,
  skin = SKIN[0],
  hair = '#3b2a20',
  hairStyle = 'short',
  top = '#3f6fb5',
  bottom = '#2f3b52',
  skirt = false,
  pose = 'stand',
  armL = ARMS.down,
  armR = ARMS.down,
  hat,
  hatColor = '#f2c230',
  apron,
  hideLegs = false,
  glasses = false,
  back = false,
  children,
}: PersonProps) {
  const hipY = pose === 'sit' ? -30 : -48;
  const torsoTop = hipY - 42;
  const headY = torsoTop - 17;
  const shoulderY = torsoTop + 7;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {!hideLegs &&
        (pose === 'stand' ? (
          skirt ? (
            <g>
              <path d={`M-14 ${hipY} L14 ${hipY} L17 ${hipY + 26} L-17 ${hipY + 26} Z`} fill={bottom} />
              <rect x={-9} y={hipY + 24} width={6} height={24} fill={skin} />
              <rect x={3} y={hipY + 24} width={6} height={24} fill={skin} />
            </g>
          ) : (
            <g fill={bottom}>
              <rect x={-11} y={hipY} width={9} height={48} rx={3} />
              <rect x={2} y={hipY} width={9} height={48} rx={3} />
            </g>
          )
        ) : (
          <g fill={bottom}>
            <rect x={-13} y={hipY - 4} width={26} height={12} rx={4} />
            <rect x={-11} y={hipY + 6} width={8} height={24} rx={3} />
            <rect x={3} y={hipY + 6} width={8} height={24} rx={3} />
          </g>
        ))}
      {!hideLegs && (
        <g fill={C.ink}>
          <ellipse cx={-7} cy={-1} rx={7} ry={3.5} />
          <ellipse cx={7} cy={-1} rx={7} ry={3.5} />
        </g>
      )}
      <rect x={-14} y={torsoTop} width={28} height={44} rx={9} fill={top} />
      {apron && <rect x={-10} y={torsoTop + 12} width={20} height={34} rx={3} fill={apron} />}
      <rect x={-4} y={torsoTop - 6} width={8} height={8} fill={skin} />
      <ArmPath sx={-12} sy={shoulderY} arm={armL} mirror sleeve={top} skin={skin} />
      <ArmPath sx={12} sy={shoulderY} arm={armR} mirror={false} sleeve={top} skin={skin} />
      {/* Tête */}
      {hairStyle === 'long' && <path d={`M-14 ${headY - 2} Q0 ${headY - 20} 14 ${headY - 2} L15 ${headY + 20} L-15 ${headY + 20} Z`} fill={hair} />}
      <circle cx={0} cy={headY} r={12} fill={skin} />
      {!back && (
        <g>
          <circle cx={-4.5} cy={headY - 1} r={1.4} fill={C.ink} />
          <circle cx={4.5} cy={headY - 1} r={1.4} fill={C.ink} />
          <path d={`M-4 ${headY + 5} Q0 ${headY + 8} 4 ${headY + 5}`} stroke={C.ink} strokeWidth={1.3} fill="none" strokeLinecap="round" />
          {glasses && (
            <g stroke={C.ink} strokeWidth={1.2} fill="none">
              <circle cx={-4.5} cy={headY - 1} r={3.4} />
              <circle cx={4.5} cy={headY - 1} r={3.4} />
              <path d={`M-1.1 ${headY - 1} H1.1`} />
            </g>
          )}
        </g>
      )}
      {hairStyle === 'short' && <path d={`M-12 ${headY - 2} Q-11 ${headY - 15} 0 ${headY - 14} Q11 ${headY - 15} 12 ${headY - 2} Q6 ${headY - 9} -12 ${headY - 2} Z`} fill={hair} />}
      {hairStyle === 'curly' && (
        <g fill={hair}>
          {[-9, -3, 3, 9].map((cx) => (
            <circle key={cx} cx={cx} cy={headY - 10} r={5} />
          ))}
        </g>
      )}
      {(hairStyle === 'long' || hairStyle === 'bun') && <path d={`M-12 ${headY - 1} Q0 ${headY - 19} 12 ${headY - 1} Q2 ${headY - 9} -12 ${headY - 1} Z`} fill={hair} />}
      {hairStyle === 'bun' && <circle cx={0} cy={headY - 15} r={6} fill={hair} />}
      {back && <circle cx={0} cy={headY} r={12} fill={hair} opacity={0.92} />}
      {hat === 'hard' && (
        <g fill={hatColor}>
          <path d={`M-13 ${headY - 3} Q0 ${headY - 22} 13 ${headY - 3} Z`} />
          <rect x={-16} y={headY - 4} width={32} height={4} rx={2} />
        </g>
      )}
      {hat === 'chef' && (
        <g fill={C.white} stroke="#d8dde5" strokeWidth={1}>
          <rect x={-10} y={headY - 18} width={20} height={9} />
          <circle cx={-6} cy={headY - 22} r={6} />
          <circle cx={4} cy={headY - 24} r={7} />
        </g>
      )}
      {children}
    </g>
  );
}

export function Room({ floorY = 175, wall = C.wall, floor = C.floor, children }: { floorY?: number; wall?: string; floor?: string; children?: ReactNode }) {
  return (
    <g>
      <rect x={0} y={0} width={400} height={floorY} fill={wall} />
      <rect x={0} y={floorY} width={400} height={260 - floorY} fill={floor} />
      <rect x={0} y={floorY - 4} width={400} height={4} fill="#c9d3de" />
      {children}
    </g>
  );
}

export function Outdoor({ horizon = 150, ground = C.grass, children }: { horizon?: number; ground?: string; children?: ReactNode }) {
  return (
    <g>
      <rect x={0} y={0} width={400} height={horizon} fill={C.sky} />
      <circle cx={340} cy={40} r={18} fill="#fde68a" />
      <rect x={0} y={horizon} width={400} height={260 - horizon} fill={ground} />
      {children}
    </g>
  );
}

export function Window({ x, y, w = 90, h = 70 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.glass} stroke={C.white} strokeWidth={5} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={C.white} strokeWidth={4} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={C.white} strokeWidth={4} />
    </g>
  );
}

export function Desk({ x, y, w = 150, h = 70, color = C.wood }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={10} rx={2} fill={color} />
      <rect x={x + 6} y={y + 10} width={8} height={h - 10} fill={C.woodDark} />
      <rect x={x + w - 14} y={y + 10} width={8} height={h - 10} fill={C.woodDark} />
      <rect x={x + w - 54} y={y + 10} width={40} height={30} fill={color} opacity={0.85} />
    </g>
  );
}

export function Laptop({ x, y, open = true, s = 1 }: { x: number; y: number; open?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {open && <path d="M-2 0 L4 -30 L40 -30 L46 0 Z" fill="#3a4556" />}
      {open && <path d="M5 -27 L39 -27 L43 -3 L1 -3 Z" fill="#9fd3ef" />}
      <rect x={-6} y={0} width={56} height={5} rx={2} fill="#5c6878" />
    </g>
  );
}

export function Cup({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y - 14} h14 l-2 14 h-10 z`} fill="#f4f1ea" stroke="#cbd2db" />
      <path d={`M${x + 14} ${y - 11} q6 0 5 5 q-1 3 -6 2`} stroke="#cbd2db" strokeWidth={2} fill="none" />
    </g>
  );
}

export function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={-8} cy={-34} rx={8} ry={16} fill={C.plant} transform="rotate(-25 -8 -34)" />
      <ellipse cx={8} cy={-36} rx={8} ry={17} fill={C.plantDark} transform="rotate(22 8 -36)" />
      <ellipse cx={0} cy={-42} rx={7} ry={18} fill={C.plant} />
      <path d="M-13 -18 h26 l-4 18 h-18 z" fill={C.pot} />
    </g>
  );
}

export function Chair({ x, y, color = '#4a6fa5', s = 1 }: { x: number; y: number; color?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-16} y={-72} width={32} height={34} rx={6} fill={color} />
      <rect x={-18} y={-40} width={36} height={8} rx={3} fill={color} />
      <rect x={-15} y={-32} width={4} height={32} fill={C.metalDark} />
      <rect x={11} y={-32} width={4} height={32} fill={C.metalDark} />
    </g>
  );
}

export function Box({ x, y, w = 40, h = 30, color = '#c99a5b' }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={color} stroke="#a47a43" strokeWidth={1.5} />
      <rect x={x + w / 2 - 4} y={y - h} width={8} height={h} fill="#e8d4a8" opacity={0.7} />
    </g>
  );
}

export function Shelves({ x, y, w = 160, h = 150, rows = 3, fill }: { x: number; y: number; w?: number; h?: number; rows?: number; fill?: (rowY: number, i: number) => ReactNode }) {
  const step = h / rows;
  return (
    <g>
      <rect x={x} y={y - h} width={6} height={h} fill={C.metalDark} />
      <rect x={x + w - 6} y={y - h} width={6} height={h} fill={C.metalDark} />
      {Array.from({ length: rows }, (_, i) => {
        const ry = y - i * step;
        return (
          <g key={i}>
            {fill?.(ry - 4, i)}
            <rect x={x} y={ry - 4} width={w} height={5} fill={C.metal} />
          </g>
        );
      })}
    </g>
  );
}

export function Books({ x, y, n = 7 }: { x: number; y: number; n?: number }) {
  const colors = ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#2c8c99', '#d4a017'];
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * 9} y={y - 26 - (i % 3) * 3} width={8} height={26 + (i % 3) * 3} fill={colors[i % colors.length]} />
      ))}
    </g>
  );
}

export function Car({ x, y, color = '#c94c4c', s = 1 }: { x: number; y: number; color?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -14 L8 -30 Q12 -36 20 -36 L58 -36 Q66 -36 72 -28 L84 -16 L96 -14 Q102 -13 102 -6 L102 0 L0 0 Z" fill={color} />
      <path d="M14 -30 Q16 -33 21 -33 L40 -33 L40 -18 L8 -18 Z" fill={C.glass} />
      <path d="M44 -33 L57 -33 Q63 -33 67 -28 L76 -18 L44 -18 Z" fill={C.glass} />
      <circle cx={22} cy={0} r={10} fill="#2b2f36" />
      <circle cx={22} cy={0} r={4} fill={C.metal} />
      <circle cx={80} cy={0} r={10} fill="#2b2f36" />
      <circle cx={80} cy={0} r={4} fill={C.metal} />
    </g>
  );
}

export function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-5} y={-50} width={10} height={50} fill={C.woodDark} />
      <circle cx={0} cy={-70} r={30} fill={C.plant} />
      <circle cx={-18} cy={-58} r={18} fill={C.plantDark} />
      <circle cx={18} cy={-60} r={18} fill={C.plantDark} />
    </g>
  );
}

export function Bicycle({ x, y, color = '#2c7fb8', s = 1 }: { x: number; y: number; color?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth={3.5} strokeLinejoin="round">
      <circle cx={-22} cy={-16} r={16} stroke="#2b2f36" />
      <circle cx={24} cy={-16} r={16} stroke="#2b2f36" />
      <path d="M-22 -16 L-4 -16 L10 -38 L-10 -38 Z M10 -38 L24 -16 M-10 -38 L-13 -46 M10 -38 L12 -48 L20 -48" />
      <path d="M-18 -46 h10" stroke="#2b2f36" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

export function Clock({ x, y, r = 22 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={C.white} stroke={C.ink} strokeWidth={3} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1={x + Math.sin(a) * (r - 4)} y1={y - Math.cos(a) * (r - 4)} x2={x + Math.sin(a) * (r - 7)} y2={y - Math.cos(a) * (r - 7)} stroke={C.ink} strokeWidth={1.5} />;
      })}
      <line x1={x} y1={y} x2={x} y2={y - r + 8} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x + r - 10} y2={y + 3} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}
