/** Badges : récompenses symboliques, calculées à partir des statistiques locales. */

export interface BadgeContext {
  totalXp: number;
  streak: number;
  longestStreak: number;
  totalCorrect: number;
  lessonsCompleted: number;
  perfectLessons: number;
  maxCrownUnits: number;
  toeicMocks: number[];
  tagemageMocks: number[];
  reviewsDone: number;
  toeicPartsTried: number;
  bestDayMinutes: number;
  placementDone: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  test: (c: BadgeContext) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'premier-pas', name: 'Premier pas', description: 'Terminer une première leçon.', icon: '🥾', test: (c) => c.lessonsCompleted >= 1 },
  { id: 'boussole', name: 'Boussole', description: 'Passer un test de placement.', icon: '🧭', test: (c) => c.placementDone >= 1 },
  { id: 'sans-faute', name: 'Sans faute', description: 'Réussir une leçon à 100 %.', icon: '🎯', test: (c) => c.perfectLessons >= 1 },
  { id: 'cordee', name: 'Cordée de dix', description: 'Réussir 10 leçons à 100 %.', icon: '🪢', test: (c) => c.perfectLessons >= 10 },
  { id: 'serie-3', name: 'Échauffement', description: 'Série de 3 jours.', icon: '🔥', test: (c) => c.longestStreak >= 3 },
  { id: 'serie-7', name: 'Une semaine', description: 'Série de 7 jours.', icon: '📅', test: (c) => c.longestStreak >= 7 },
  { id: 'serie-30', name: 'Un mois', description: 'Série de 30 jours.', icon: '🗓️', test: (c) => c.longestStreak >= 30 },
  { id: 'serie-100', name: 'Centenaire', description: 'Série de 100 jours.', icon: '🏔️', test: (c) => c.longestStreak >= 100 },
  { id: 'xp-500', name: 'Camp de base', description: 'Gagner 500 XP.', icon: '⛺', test: (c) => c.totalXp >= 500 },
  { id: 'xp-2500', name: 'Camp d’altitude', description: 'Gagner 2 500 XP.', icon: '🧗', test: (c) => c.totalXp >= 2500 },
  { id: 'xp-10000', name: 'Sommet', description: 'Gagner 10 000 XP.', icon: '🚩', test: (c) => c.totalXp >= 10000 },
  { id: 'cent', name: 'Cent bonnes réponses', description: 'Donner 100 bonnes réponses.', icon: '💯', test: (c) => c.totalCorrect >= 100 },
  { id: 'mille', name: 'Mille bonnes réponses', description: 'Donner 1 000 bonnes réponses.', icon: '🏅', test: (c) => c.totalCorrect >= 1000 },
  { id: 'couronne', name: 'Unité couronnée', description: 'Amener toutes les leçons d’une unité à 5 couronnes.', icon: '👑', test: (c) => c.maxCrownUnits >= 1 },
  { id: 'blanc-toeic', name: 'Répétition générale', description: 'Terminer un examen blanc TOEIC.', icon: '🎧', test: (c) => c.toeicMocks.length >= 1 },
  { id: 'blanc-tm', name: 'Six épreuves', description: 'Terminer un examen blanc TAGE MAGE.', icon: '🧮', test: (c) => c.tagemageMocks.length >= 1 },
  { id: 'toeic-785', name: 'Seuil 785', description: 'Obtenir au moins 785 à un examen blanc TOEIC.', icon: '🥈', test: (c) => c.toeicMocks.some((s) => s >= 785) },
  { id: 'toeic-900', name: 'Club des 900', description: 'Obtenir au moins 900 à un examen blanc TOEIC.', icon: '🥇', test: (c) => c.toeicMocks.some((s) => s >= 900) },
  { id: 'tm-350', name: 'Barre des 350', description: 'Obtenir au moins 350/600 à un examen blanc TAGE MAGE.', icon: '📈', test: (c) => c.tagemageMocks.some((s) => s >= 350) },
  { id: 'tm-450', name: 'Barre des 450', description: 'Obtenir au moins 450/600 à un examen blanc TAGE MAGE.', icon: '🚀', test: (c) => c.tagemageMocks.some((s) => s >= 450) },
  { id: 'memoire', name: 'Mémoire d’éléphant', description: 'Réussir 50 révisions espacées.', icon: '🐘', test: (c) => c.reviewsDone >= 50 },
  { id: 'sept-parties', name: 'Tour complet', description: 'Répondre à des questions des 7 parties du TOEIC.', icon: '🧩', test: (c) => c.toeicPartsTried >= 7 },
  { id: 'marathon', name: 'Marathon', description: 'Étudier 60 minutes dans la même journée.', icon: '⏱️', test: (c) => c.bestDayMinutes >= 60 },
];

export function newlyEarned(ctx: BadgeContext, earned: ReadonlySet<string>): BadgeDef[] {
  return BADGES.filter((b) => !earned.has(b.id) && b.test(ctx));
}
