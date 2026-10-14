/** Structure de page : en-tête (série, XP) et barre de navigation (bas d'écran sur mobile). */
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Logo } from './Logo';
import { IconChart, IconClipboard, IconFlame, IconHome, IconMap, IconSettings, IconSnow, IconTarget } from './icons';
import { useApp } from '../store/app';
import { db } from '../db/db';
import { computeStreak } from '../features/gamification/streak';
import { useToday } from '../hooks';

const NAV = [
  { to: '/', label: 'Accueil', icon: IconHome, end: true },
  { to: '/parcours', label: 'Parcours', icon: IconMap },
  { to: '/entrainement', label: 'Entraînement', icon: IconTarget },
  { to: '/examens', label: 'Examens', icon: IconClipboard },
  { to: '/stats', label: 'Progrès', icon: IconChart },
];

export function Layout() {
  const location = useLocation();
  const immersive = /^\/(lecon|revision\/seance|entrainement\/seance|placement|examen)\//.test(location.pathname + '/');
  const settings = useApp((s) => s.settings);
  const profile = useApp((s) => s.profile);
  const today = useToday();
  const days = useLiveQuery(() => db.days.toArray(), []);
  const streak = days ? computeStreak(new Map(days.map((d) => [d.day, d])), today, settings.autoFreeze) : null;
  // Couleur de l'interface : celle de l'examen de la page (leçon, examen…), sinon de l'examen choisi.
  const exam = /\/(toeic|tagemage)(\/|-|$)/.exec(location.pathname)?.[1] ?? settings.activeExam;
  useEffect(() => {
    document.documentElement.dataset.exam = exam;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color || '#0e7490');
  }, [exam, settings.theme]);

  return (
    <div className={`min-h-dvh flex flex-col ${settings.animations ? '' : 'reduce-motion'}`}>
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>
      {!immersive && (
        <header className="pt-safe sticky top-0 z-20 bg-canvas/90 backdrop-blur border-b border-line">
          <div className="h-1 bg-brand" aria-hidden="true" />
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <NavLink to="/" aria-label="Accueil Ascension">
              <Logo size={30} withText />
            </NavLink>
            <div className="ml-auto flex items-center gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-1 text-accent" title="Série de jours" aria-label={`Série : ${streak?.current ?? 0} jours`}>
                <IconFlame className={streak?.activeToday ? 'anim-flame' : 'opacity-60'} />
                {streak?.current ?? 0}
                {!!streak?.frozenInStreak && (
                  <span className="inline-flex items-center text-frozen font-semibold" title={`${streak.frozenInStreak} jour(s) gelé(s)`}>
                    <IconSnow size={14} />
                  </span>
                )}
              </span>
              <span className="text-brand tabular-nums" aria-label={`${profile.totalXp} points d'expérience`}>
                {profile.totalXp} XP
              </span>
              <NavLink to="/reglages" className="p-1.5 rounded-lg hover:bg-surface-2 text-muted" aria-label="Réglages">
                <IconSettings />
              </NavLink>
            </div>
          </div>
        </header>
      )}
      <main id="main" className={`flex-1 w-full max-w-3xl mx-auto px-4 ${immersive ? 'py-3' : 'py-5 pb-24 sm:pb-8'}`}>
        <Outlet />
      </main>
      {!immersive && (
        <nav aria-label="Navigation principale" className="pb-safe fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur border-t border-line sm:static sm:bg-transparent sm:border-t-0">
          <ul className="max-w-3xl mx-auto grid grid-cols-5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold ${isActive ? 'text-brand' : 'text-muted hover:text-ink'}`}
                >
                  <Icon size={22} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
