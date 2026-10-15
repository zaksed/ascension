/**
 * Fiches « notion à connaître » (public/notions.json) : affichées en page dédiée, sur l'accueil
 * (notion du jour) et dans les notifications. Le fichier est servi par l'application elle-même et
 * pré-caché par le service worker : aucun appel externe.
 */
import { z } from 'zod';
import type { ExamId } from '../../content/schema';
import { seedFrom } from '../../lib/random';

export const NotionCard = z.object({
  id: z.string().regex(/^(toeic|tm)-n\d{3}$/),
  exam: z.enum(['toeic', 'tagemage']),
  skill: z.string().optional(),
  front: z.string().min(5),
  back: z.string().min(10),
  example: z.string().optional(),
});
export type NotionCard = z.infer<typeof NotionCard>;

export const NotionsFile = z.object({ version: z.number(), cards: z.array(NotionCard).min(1) });

let cache: Promise<NotionCard[]> | null = null;

export function loadNotions(): Promise<NotionCard[]> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}notions.json`)
      .then((r) => r.json())
      .then((json) => NotionsFile.parse(json).cards)
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

/** Notion du jour : la même toute la journée, différente d'un jour à l'autre. */
export function notionOfTheDay(cards: NotionCard[], exam: ExamId, day: string): NotionCard | undefined {
  const mine = cards.filter((c) => c.exam === exam);
  if (!mine.length) return undefined;
  return mine[seedFrom(`${exam}-${day}`) % mine.length];
}

export function randomNotion(cards: NotionCard[], exam: ExamId, exceptId?: string): NotionCard | undefined {
  const mine = cards.filter((c) => c.exam === exam && c.id !== exceptId);
  return mine[Math.floor(Math.random() * mine.length)];
}
