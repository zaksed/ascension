/** État global léger (Zustand) : réglages et profil, persistés dans IndexedDB. */
import { create } from 'zustand';
import { db, DEFAULT_PROFILE, DEFAULT_SETTINGS, getKv, setKv, type Profile, type Settings } from '../db/db';

interface AppState {
  ready: boolean;
  settings: Settings;
  profile: Profile;
  init: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  updateProfile: (fn: (p: Profile) => Profile) => Promise<Profile>;
  reload: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  init: async () => {
    const [settings, profile] = await Promise.all([
      getKv<Settings>('settings', DEFAULT_SETTINGS),
      getKv<Profile>('profile', { ...DEFAULT_PROFILE, createdAt: new Date().toISOString() }),
    ]);
    if (!(await db.kv.get('profile'))) await setKv('profile', profile);
    set({ settings: { ...DEFAULT_SETTINGS, ...settings, targets: { ...DEFAULT_SETTINGS.targets, ...settings.targets } }, profile, ready: true });
    applyTheme(get().settings.theme);
  },
  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await setKv('settings', settings);
    if (patch.theme) applyTheme(patch.theme);
  },
  updateProfile: async (fn) => {
    // Relit la valeur stockée pour éviter d'écraser une mise à jour concurrente.
    const stored = await getKv<Profile>('profile', get().profile);
    const profile = fn(stored);
    await setKv('profile', profile);
    set({ profile });
    return profile;
  },
  reload: async () => {
    set({ ready: false });
    await get().init();
  },
}));

export function applyTheme(theme: Settings['theme']): void {
  if (typeof document === 'undefined') return;
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', !!dark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try {
    localStorage.setItem('ascension-theme', theme);
  } catch {
    /* stockage indisponible : sans conséquence */
  }
}
