/** Petits composants partagés entre pages. */
import type { BadgeDef } from '../features/gamification/badges';

export function BadgeToast({ badge }: { badge: BadgeDef }) {
  return (
    <div className="rounded-xl border-2 border-accent-bright bg-accent-soft px-4 py-3 flex items-center gap-3 anim-pop" role="status">
      <span className="text-3xl" aria-hidden="true">
        {badge.icon}
      </span>
      <div>
        <p className="font-bold">Nouveau badge : {badge.name}</p>
        <p className="text-sm text-muted">{badge.description}</p>
      </div>
    </div>
  );
}
