/**
 * Graphiques du tableau de bord, en SVG natif (aucune bibliothèque).
 * Règles : traits fins, une seule échelle par graphique, grille discrète, info-bulle au survol
 * ET au focus clavier, et toujours une vue tableau équivalente (les valeurs ne dépendent jamais
 * de la couleur ni du survol). Couleurs : jetons --viz-*, --heat-* (validés, voir index.css).
 */
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from 'react';
import { formatDayFr, parseDay } from '../../lib/date';

export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Arrondi « propre » d'un maximum d'axe. */
export function niceCeil(v: number): number {
  const steps = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 100) * 100;
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
      style={{ left: x, top: y - 10 }}
      role="presentation"
    >
      {children}
    </div>
  );
}

function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-muted">Voir les données</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-muted">
            {headers.map((h) => (
              <th key={h} scope="col" className="font-medium py-1 pr-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-3 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// ---------------------------------------------------------------------------------------------

export interface ScorePoint {
  key: string;
  day: string;
  score: number;
  label: string;
}

/** Évolution des scores aux examens blancs (une série, ligne de l'objectif en repère). */
export function ScoreChart({ points, max, ticks, target, color, title }: { points: ScorePoint[]; max: number; ticks: number[]; target: number; color: string; title: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 210;
  const m = { top: 20, right: 76, bottom: 28, left: 38 };
  const w = Math.max(10, width - m.left - m.right);
  const h = H - m.top - m.bottom;
  const n = points.length;
  // Abscisse par rang chronologique : les examens sont espacés régulièrement.
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => h - (Math.max(0, Math.min(max, v)) / max) * h;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.score)}`).join(' ');
  const last = points[n - 1];

  const onMove = (e: RPointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    setHover(n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px / w) * (n - 1)))));
  };

  return (
    <div>
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`${title}. Dernier score : ${last.score} sur ${max}. Objectif : ${target}.`}>
            <g transform={`translate(${m.left},${m.top})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
                  <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fill="var(--muted)" fontSize={11} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {t}
                  </text>
                </g>
              ))}
              <line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke="var(--muted)" strokeWidth={1} />
              <text x={w + 8} y={y(target)} dy="0.32em" fill="var(--muted)" fontSize={11}>
                Objectif {target}
              </text>
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} stroke="var(--axis)" strokeWidth={1} />}
              {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {points.map((p, i) => (
                <circle key={p.key} cx={x(i)} cy={y(p.score)} r={hover === i ? 5.5 : 4} fill={color} stroke="var(--surface)" strokeWidth={2} />
              ))}
              {/* Étiquette directe sur le dernier point seulement. */}
              <text x={x(n - 1)} y={y(last.score) - 12} textAnchor="middle" fill="var(--ink)" fontSize={12} fontWeight={700}>
                {last.score}
              </text>
              <text x={x(0)} y={h + 18} textAnchor={n === 1 ? 'middle' : 'start'} fill="var(--muted)" fontSize={11}>
                {formatDayFr(points[0].day)}
              </text>
              {n > 1 && (
                <text x={x(n - 1)} y={h + 18} textAnchor="end" fill="var(--muted)" fontSize={11}>
                  {formatDayFr(last.day)}
                </text>
              )}
              <rect width={w} height={h} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} />
              {points.map((p, i) => (
                <circle
                  key={`hit-${p.key}`}
                  cx={x(i)}
                  cy={y(p.score)}
                  r={12}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${p.label}, ${formatDayFr(p.day)} : ${p.score} sur ${max}`}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onPointerEnter={() => setHover(i)}
                  className="outline-none focus-visible:stroke-[var(--ink)]"
                  stroke="transparent"
                  strokeWidth={2}
                />
              ))}
            </g>
          </svg>
        )}
        {hover !== null && points[hover] && (
          <Tooltip x={m.left + x(hover)} y={m.top + y(points[hover].score)}>
            <strong className="text-sm">
              {points[hover].score}
              <span className="text-muted font-normal">/{max}</span>
            </strong>
            <div className="text-muted">
              {points[hover].label} · {formatDayFr(points[hover].day)}
            </div>
          </Tooltip>
        )}
      </div>
      <DataTable caption={title} headers={['Date', 'Examen', 'Score']} rows={points.map((p) => [formatDayFr(p.day, { day: 'numeric', month: 'short', year: 'numeric' }), p.label, `${p.score}/${max}`])} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

/** Colonnes : temps d'étude quotidien (minutes). */
export function DailyColumns({ data, color, title }: { data: { day: string; minutes: number }[]; color: string; title: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 170;
  const m = { top: 22, right: 6, bottom: 24, left: 34 };
  const w = Math.max(10, width - m.left - m.right);
  const h = H - m.top - m.bottom;
  const maxV = niceCeil(Math.max(5, ...data.map((d) => d.minutes)));
  const band = w / data.length;
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => h - (v / maxV) * h;
  const maxIndex = data.reduce((best, d, i) => (d.minutes > data[best].minutes ? i : best), 0);
  const labelEvery = band >= 22 ? 1 : 2;

  // Barre à extrémité arrondie (4 px), carrée à la ligne de base.
  const bar = (x0: number, v: number) => {
    const top = y(v);
    const bh = h - top;
    if (bh <= 0) return '';
    const r = Math.min(4, bh, barW / 2);
    return `M${x0},${h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${h} Z`;
  };

  return (
    <div>
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`${title}. Maximum : ${Math.round(data[maxIndex].minutes)} minutes le ${formatDayFr(data[maxIndex].day)}.`}>
            <g transform={`translate(${m.left},${m.top})`}>
              {(maxV % 2 === 0 ? [0, maxV / 2, maxV] : [0, maxV]).map((t) => (
                <g key={t}>
                  <line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
                  <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fill="var(--muted)" fontSize={11} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {t}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const x0 = i * band + (band - barW) / 2;
                return (
                  <g key={d.day}>
                    <path d={bar(x0, d.minutes)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                    {i % labelEvery === labelEvery - 1 || i === data.length - 1 ? (
                      <text x={x0 + barW / 2} y={h + 16} textAnchor="middle" fill="var(--muted)" fontSize={11} fontWeight={i === data.length - 1 ? 700 : 400}>
                        {parseDay(d.day).getDate()}
                      </text>
                    ) : null}
                    {i === maxIndex && d.minutes > 0 && (
                      <text x={x0 + barW / 2} y={y(d.minutes) - 6} textAnchor="middle" fill="var(--ink)" fontSize={11} fontWeight={700}>
                        {Math.round(d.minutes)}
                      </text>
                    )}
                    <rect
                      x={i * band}
                      y={0}
                      width={band}
                      height={h}
                      fill="transparent"
                      tabIndex={0}
                      role="img"
                      aria-label={`${formatDayFr(d.day, { weekday: 'long', day: 'numeric', month: 'long' })} : ${Math.round(d.minutes)} minutes`}
                      onPointerEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      className="outline-none focus-visible:stroke-[var(--ink)]"
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        )}
        {hover !== null && data[hover] && (
          <Tooltip x={m.left + hover * band + band / 2} y={m.top + y(data[hover].minutes)}>
            <strong className="text-sm">{Math.round(data[hover].minutes)} min</strong>
            <div className="text-muted">{formatDayFr(data[hover].day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          </Tooltip>
        )}
      </div>
      <DataTable caption={title} headers={['Jour', 'Minutes']} rows={data.map((d) => [formatDayFr(d.day, { weekday: 'short', day: 'numeric', month: 'short' }), Math.round(d.minutes)])} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

export type CalState = 'active' | 'goal' | 'frozen' | 'none' | 'future';

/** Calendrier de série : 7 lignes (lundi → dimanche) × N semaines. */
export function StreakCalendar({ cells }: { cells: { day: string; state: CalState; xp: number }[] }) {
  const label: Record<CalState, string> = { goal: 'objectif atteint', active: 'actif', frozen: 'gelé', none: 'aucune activité', future: '' };
  const fill = (s: CalState) => (s === 'goal' ? 'bg-[var(--heat-2)]' : s === 'active' ? 'bg-[var(--heat-1)]' : s === 'future' ? 'bg-transparent' : 'bg-surface-2');
  // Décalage pour que la première colonne commence un lundi.
  const offset = (parseDay(cells[0].day).getDay() + 6) % 7;
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid grid-flow-col gap-[3px] w-max" style={{ gridTemplateRows: 'repeat(7, 14px)' }} role="list" aria-label="Calendrier d’activité">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden="true" />
          ))}
          {cells.map((c) => (
            <span
              key={c.day}
              role="listitem"
              title={`${formatDayFr(c.day, { weekday: 'short', day: 'numeric', month: 'short' })} : ${label[c.state]}${c.xp ? ` · ${c.xp} XP` : ''}`}
              aria-label={`${formatDayFr(c.day, { weekday: 'long', day: 'numeric', month: 'long' })} : ${label[c.state]}${c.xp ? `, ${c.xp} XP` : ''}`}
              className={`h-3.5 w-3.5 rounded-[3px] grid place-items-center text-[9px] leading-none text-frozen ${fill(c.state)}`}
            >
              {c.state === 'frozen' ? '❄' : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-surface-2 border border-line" aria-hidden="true" /> aucune activité
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-[var(--heat-1)]" aria-hidden="true" /> actif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-[var(--heat-2)]" aria-hidden="true" /> objectif atteint
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-surface-2 grid place-items-center text-[8px] text-frozen" aria-hidden="true">
            ❄
          </span>{' '}
          gelé
        </span>
      </div>
    </div>
  );
}

/** Barre de proportion en ligne (tableaux) : la valeur est toujours écrite à côté. */
export function InlineBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="block h-2 w-full rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
      <span className="block h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color }} />
    </span>
  );
}
