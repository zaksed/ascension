/** Rendu des illustrations : scène (P1), tableau/graphique, dominos, SVG. */
import type { Media, TableMedia } from '../../content/schema';
import { Scene } from '../toeic/scenes';

export function TableView({ table, caption }: { table: TableMedia; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {(caption ?? table.title) && <caption className="text-left font-semibold mb-1.5">{caption ?? table.title}</caption>}
        {table.headers.length > 0 && (
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th key={h} scope="col" className="text-left bg-surface-2 border border-line px-2.5 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={`border border-line px-2.5 py-1.5 ${table.headers.length === 0 ? 'text-center text-lg font-bold tabular-nums w-16 h-12' : ''} ${cell === '?' ? 'text-brand bg-brand-soft' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pips({ n, x, y }: { n: number; x: number; y: number }) {
  // Position des points sur une demi-face de domino (carré 40 × 40).
  const P: Record<number, [number, number][]> = {
    0: [],
    1: [[20, 20]],
    2: [[10, 10], [30, 30]],
    3: [[10, 10], [20, 20], [30, 30]],
    4: [[10, 10], [30, 10], [10, 30], [30, 30]],
    5: [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]],
    6: [[10, 9], [30, 9], [10, 20], [30, 20], [10, 31], [30, 31]],
  };
  return (
    <g>
      {(P[n] ?? []).map(([px, py], i) => (
        <circle key={i} cx={x + px} cy={y + py} r={3.6} fill="var(--ink)" />
      ))}
    </g>
  );
}

export function Domino({ top, bottom, small = false }: { top: number | '?'; bottom: number | '?'; small?: boolean }) {
  const w = small ? 30 : 44;
  return (
    <svg width={w} height={w * 2} viewBox="0 0 44 88" role="img" aria-label={`Domino ${top} sur ${bottom}`}>
      <rect x={1} y={1} width={42} height={86} rx={7} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <line x1={6} y1={44} x2={38} y2={44} stroke="var(--ink)" strokeWidth={1.5} />
      {top === '?' ? <text x={22} y={30} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--brand)">?</text> : <Pips n={top} x={2} y={2} />}
      {bottom === '?' ? <text x={22} y={74} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--brand)">?</text> : <Pips n={bottom} x={2} y={46} />}
    </svg>
  );
}

/** Une option « 5 | 3 » est dessinée comme un domino. */
export function parseDominoOption(opt: string): [number, number] | null {
  const m = /^(\d)\s*\|\s*(\d)$/.exec(opt.trim());
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function MediaView({ media }: { media: Media }) {
  switch (media.type) {
    case 'scene':
      return <Scene id={media.scene} alt={media.alt} />;
    case 'table':
      return (
        <figure className="m-0" aria-label={media.alt ?? media.title}>
          <TableView table={media} />
        </figure>
      );
    case 'dominoes':
      return (
        <figure className="m-0" aria-label={media.alt}>
          <div className="flex flex-wrap items-center gap-3 justify-center py-2">
            {media.items.map(([t, b], i) => (
              <Domino key={i} top={t} bottom={b} />
            ))}
          </div>
        </figure>
      );
    case 'svg':
      return <figure className="m-0" role="img" aria-label={media.alt} dangerouslySetInnerHTML={{ __html: media.svg }} />;
  }
}
