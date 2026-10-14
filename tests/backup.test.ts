import { describe, expect, it } from 'vitest';
import { AscensionDB } from '../src/db/db';
import { exportData, importData, parseBackup } from '../src/features/settings/backup';

describe('sauvegarde JSON', () => {
  it('exporte puis restaure toutes les tables à l’identique', async () => {
    const src = new AscensionDB('test-export');
    await src.attempts.add({ qid: 'toeic-p5-0001', exam: 'toeic', section: 'part5', skill: 'p5-temps', correct: true, choice: 2, ms: 8000, mode: 'lesson', at: '2026-10-14T10:00:00Z', day: '2026-10-14' });
    await src.srs.put({ qid: 'tm-calc-0003', exam: 'tagemage', ef: 2.3, interval: 1, reps: 0, lapses: 1, due: '2026-10-15', lastReview: '2026-10-14' });
    await src.days.put({ day: '2026-10-14', xp: 40, seconds: 600, answers: 4, correct: 3, frozen: false });
    await src.kv.put({ key: 'settings', value: { dailyGoal: 100 } });
    await src.badges.put({ id: 'premier-pas', earnedAt: '2026-10-14T10:05:00Z' });
    const backup = JSON.parse(JSON.stringify(await exportData(src)));

    const dst = new AscensionDB('test-import');
    await dst.attempts.add({ qid: 'à-effacer', exam: 'toeic', section: 'part1', skill: 'x', correct: false, choice: 0, ms: 1, mode: 'lesson', at: '', day: '' });
    const { counts } = await importData(backup, dst);
    expect(counts.attempts).toBe(1);
    expect((await dst.attempts.toArray()).map((a) => a.qid)).toEqual(['toeic-p5-0001']);
    expect(await dst.srs.get('tm-calc-0003')).toMatchObject({ lapses: 1, due: '2026-10-15' });
    expect(await dst.kv.get('settings')).toEqual({ key: 'settings', value: { dailyGoal: 100 } });
    expect(await dst.badges.count()).toBe(1);
    src.close();
    dst.close();
  });

  it('refuse un fichier qui n’est pas une sauvegarde Ascension', () => {
    expect(() => parseBackup({ app: 'autre', tables: {} })).toThrow(/invalide/);
    expect(() => parseBackup({ app: 'ascension', schemaVersion: 99, exportedAt: '', tables: {} })).toThrow();
  });
});
