/**
 * Sauvegarde manuelle : export de toutes les tables en un fichier JSON, et import
 * (remplacement complet) après validation de la structure.
 */
import { z } from 'zod';
import { db, TABLES, type AscensionDB, type TableName } from '../../db/db';

export const BACKUP_APP = 'ascension';
export const BACKUP_VERSION = 1;

const Row = z.record(z.string(), z.unknown());

export const BackupFile = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string(),
  tables: z.object({
    attempts: z.array(Row.and(z.object({ qid: z.string(), exam: z.string(), correct: z.boolean() }))),
    srs: z.array(Row.and(z.object({ qid: z.string(), due: z.string() }))),
    lessons: z.array(Row.and(z.object({ key: z.string(), crowns: z.number() }))),
    days: z.array(Row.and(z.object({ day: z.string() }))),
    exams: z.array(Row.and(z.object({ id: z.string(), exam: z.string() }))),
    reports: z.array(Row.and(z.object({ qid: z.string() }))),
    kv: z.array(Row.and(z.object({ key: z.string() }))),
    badges: z.array(Row.and(z.object({ id: z.string() }))),
  }),
});
export type BackupFile = z.infer<typeof BackupFile>;

export async function exportData(database: AscensionDB = db): Promise<BackupFile> {
  const tables = {} as Record<TableName, unknown[]>;
  for (const name of TABLES) tables[name] = await database.table(name).toArray();
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables: tables as BackupFile['tables'],
  };
}

export function backupFileName(date = new Date()): string {
  return `ascension-sauvegarde-${date.toISOString().slice(0, 10)}.json`;
}

export interface ImportSummary {
  counts: Record<TableName, number>;
}

export function parseBackup(json: unknown): BackupFile {
  const r = BackupFile.safeParse(json);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new Error(`Fichier de sauvegarde invalide (${first?.path.join('.') || 'racine'} : ${first?.message ?? 'format inconnu'}).`);
  }
  return r.data;
}

/** Remplace toutes les données locales par celles de la sauvegarde. */
export async function importData(json: unknown, database: AscensionDB = db): Promise<ImportSummary> {
  const backup = parseBackup(json);
  const counts = {} as Record<TableName, number>;
  await database.transaction('rw', TABLES.map((t) => database.table(t)), async () => {
    for (const name of TABLES) {
      const table = database.table(name);
      await table.clear();
      const rows = backup.tables[name] as object[];
      if (rows.length) await table.bulkPut(rows);
      counts[name] = rows.length;
    }
  });
  return { counts };
}

/** Déclenche le téléchargement d'un fichier dans le navigateur (aucun envoi réseau). */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
