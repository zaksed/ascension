/** Réglages : objectifs, objectif quotidien, apparence, série, audio, parcours, données, signalements. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TABLES, type Settings } from '../db/db';
import { useApp } from '../store/app';
import { useToday } from '../hooks';
import type { ExamId } from '../content/schema';
import { EXAM_LABEL, APP_NAME } from '../content/exams';
import { DAILY_GOALS } from '../features/gamification/xp';
import { freezeDay } from '../features/session/record';
import { backupFileName, downloadJson, exportData, importData, parseBackup } from '../features/settings/backup';
import { englishVoices, loadVoices, speechSupported } from '../features/audio/tts';
import { VoicePicker } from '../features/audio/VoicePicker';
import { NotificationSettings } from '../features/notifications/NotificationSettings';
import { Button, Card, Modal, PageTitle, Toggle } from '../components/ui';
import { IconDownload, IconSnow, IconUpload } from '../components/icons';
import { formatDayFr } from '../lib/date';


function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 id={id} className="font-bold text-lg mb-2 scroll-mt-20">
        {title}
      </h2>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const set = (patch: Partial<Settings>) => void update(patch);

  useEffect(() => {
    // Ancre #objectifs (le routeur utilise déjà le hash pour la navigation).
    if (window.location.hash.endsWith('#objectifs')) document.getElementById('objectifs')?.scrollIntoView();
  }, []);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageTitle subtitle="Tout est enregistré sur cet appareil uniquement.">Réglages</PageTitle>
      <Goals settings={settings} set={set} />

      <Section title="Objectif quotidien">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Objectif quotidien">
          {DAILY_GOALS.map((g) => (
            <button
              key={g.xp}
              type="button"
              role="radio"
              aria-checked={settings.dailyGoal === g.xp}
              onClick={() => set({ dailyGoal: g.xp })}
              className={`rounded-xl border-2 p-3 text-left ${settings.dailyGoal === g.xp ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2'}`}
            >
              <span className="block font-bold">{g.label}</span>
              <span className="block text-sm">{g.xp} XP</span>
              <span className="block text-xs text-muted">{g.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted mt-2">Aucune limite ni pénalité : l’objectif sert seulement de repère.</p>
      </Section>

      <Section title="Apparence et sons">
        <fieldset className="mb-2">
          <legend className="font-medium mb-1.5">Thème</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['system', 'Comme le système'],
                ['light', 'Clair'],
                ['dark', 'Sombre'],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className={`cursor-pointer rounded-lg border px-3 py-1.5 ${settings.theme === v ? 'border-brand bg-brand-soft font-semibold' : 'border-line'}`}>
                <input type="radio" name="theme" value={v} checked={settings.theme === v} onChange={() => set({ theme: v })} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Toggle checked={settings.animations} onChange={(v) => set({ animations: v })} label="Animations" description="Désactivées automatiquement si le système demande de réduire les animations." />
        <Toggle checked={settings.sound} onChange={(v) => set({ sound: v })} label="Effets sonores" description="Sons discrets après une réponse et en fin de séance." />
      </Section>

      <StreakSettings settings={settings} set={set} />
      <Section id="notifications" title="Notifications">
        <NotificationSettings />
      </Section>
      <AudioSettings settings={settings} set={set} />

      <Section title="Parcours et banque de questions">
        <Toggle checked={settings.unlockAll} onChange={(v) => set({ unlockAll: v })} label="Tout débloquer" description="Accès libre à toutes les unités du parcours, sans test de placement." />
        <Toggle
          checked={settings.includeMockQuestions}
          onChange={(v) => set({ includeMockQuestions: v })}
          label="Inclure les questions des examens blancs"
          description="Par défaut, elles restent inédites jusqu’à ce que vous passiez l’examen correspondant."
        />
        <Toggle
          checked={settings.showLegacyTmScore}
          onChange={(v) => set({ showLegacyTmScore: v })}
          label="Afficher aussi l’ancien barème TAGE MAGE"
          description="Pour comparaison uniquement (−1 par erreur). Le barème en vigueur n’a pas de pénalité."
        />
      </Section>

      <DataSettings />
      <Reports />

      <Section title={`À propos d’${APP_NAME}`}>
        <div className="text-sm space-y-2">
          <p>Application d’entraînement personnelle, gratuite et sans publicité. Elle fonctionne hors ligne ; aucune donnée ne quitte l’appareil (pas de compte, pas de serveur, pas de mesure d’audience).</p>
          <p>Toutes les questions sont originales et ont été rédigées pour cette application. Les scores sont des estimations : seuls les organismes officiels délivrent des résultats.</p>
          <p className="text-muted">
            {APP_NAME} n’est ni affilié, ni approuvé, ni soutenu par ETS (propriétaire de la marque TOEIC), par la FNEGE (propriétaire de la marque TAGE MAGE) ou par Duolingo. Les noms
            d’examens sont cités uniquement pour désigner les épreuves préparées.
          </p>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function Goals({ settings, set }: { settings: Settings; set: (p: Partial<Settings>) => void }) {
  const setTarget = (exam: ExamId, patch: Partial<Settings['targets'][ExamId]>) => set({ targets: { ...settings.targets, [exam]: { ...settings.targets[exam], ...patch } } });
  const bounds: Record<ExamId, { min: number; max: number; step: number }> = { toeic: { min: 10, max: 990, step: 5 }, tagemage: { min: 0, max: 600, step: 10 } };
  return (
    <Section id="objectifs" title="Objectifs de score">
      <div className="grid sm:grid-cols-2 gap-4">
        {(['toeic', 'tagemage'] as const).map((exam) => {
          const b = bounds[exam];
          const t = settings.targets[exam];
          return (
            <fieldset key={exam} className="space-y-2">
              <legend className="font-semibold">{EXAM_LABEL[exam]}</legend>
              <label className="block text-sm">
                Score visé (sur {b.max})
                <input
                  type="number"
                  inputMode="numeric"
                  min={b.min}
                  max={b.max}
                  step={b.step}
                  value={t.score}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setTarget(exam, { score: Math.max(b.min, Math.min(b.max, Math.round(v))) });
                  }}
                  className="mt-1 block w-full rounded-xl border border-line bg-surface px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Date de l’examen (facultatif)
                <input type="date" value={t.date ?? ''} onChange={(e) => setTarget(exam, { date: e.target.value || undefined })} className="mt-1 block w-full rounded-xl border border-line bg-surface px-3 py-2" />
              </label>
            </fieldset>
          );
        })}
      </div>
    </Section>
  );
}

function StreakSettings({ settings, set }: { settings: Settings; set: (p: Partial<Settings>) => void }) {
  const today = useToday();
  const [day, setDay] = useState(today);
  const frozen = useLiveQuery(() => db.days.filter((d) => !!d.frozen).toArray(), []);
  return (
    <Section title="Série et gel de série">
      <Toggle checked={settings.autoFreeze} onChange={(v) => set({ autoFreeze: v })} label="Gel automatique" description="Un jour sans activité ne casse jamais la série (il ne l’allonge pas non plus)." />
      <div className="mt-2">
        <p className="font-medium">Gel manuel</p>
        <p className="text-sm text-muted">Gratuit et illimité : protégez un jour précis (vacances, examen…).</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <label className="sr-only" htmlFor="freeze-day">
            Jour à geler
          </label>
          <input id="freeze-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2" />
          <Button variant="secondary" onClick={() => day && void freezeDay(day, true)}>
            <IconSnow size={16} /> Geler ce jour
          </Button>
        </div>
        {frozen && frozen.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-3 list-none p-0">
            {frozen
              .sort((a, b) => a.day.localeCompare(b.day))
              .map((d) => (
                <li key={d.day} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 pl-3 pr-1 py-1 text-sm">
                  <IconSnow size={14} className="text-frozen" /> {formatDayFr(d.day, { day: 'numeric', month: 'short', year: 'numeric' })}
                  <button type="button" onClick={() => void freezeDay(d.day, false)} className="rounded-full px-2 hover:bg-surface" aria-label={`Retirer le gel du ${formatDayFr(d.day)}`}>
                    ×
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function AudioSettings({ settings, set }: { settings: Settings; set: (p: Partial<Settings>) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = speechSupported();
  useEffect(() => {
    void loadVoices().then(() => setVoices(englishVoices()));
  }, []);
  return (
    <Section title="Audio du Listening">
      {!supported ? (
        <p className="text-sm text-bad">La synthèse vocale n’est pas disponible dans ce navigateur : les transcriptions remplaceront l’audio.</p>
      ) : voices.length === 0 ? (
        <p className="text-sm text-bad">Aucune voix anglaise installée. Ajoutez-en une dans les réglages de synthèse vocale du système (Android : « Synthèse vocale » ; iOS : Accessibilité › Contenu énoncé › Voix).</p>
      ) : (
        <p className="text-sm text-muted">{voices.length} voix anglaise{voices.length > 1 ? 's' : ''} détectée{voices.length > 1 ? 's' : ''} sur cet appareil. Le choix automatique privilégie l’accent, le genre et les voix hors ligne.</p>
      )}
      <label className="flex items-center justify-between gap-4 py-2.5">
        <span className="font-medium">Vitesse d’entraînement</span>
        <select value={settings.speechRate} onChange={(e) => set({ speechRate: Number(e.target.value) })} className="rounded-lg border border-line bg-surface px-2 py-1.5">
          {[0.75, 0.9, 1, 1.1, 1.25].map((r) => (
            <option key={r} value={r}>
              ×{r}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted -mt-1 mb-2">Les examens blancs sont toujours lus à vitesse normale (×1).</p>
      <Toggle
        checked={settings.showListeningText}
        onChange={(v) => set({ showListeningText: v })}
        label="Afficher le texte des Parties 1 et 2 avant de répondre"
        description="Mode facile pour l’entraînement ; jamais en examen blanc."
      />
      <details className="mt-2" open={!settings.voicesChosen}>
        <summary className="cursor-pointer font-medium">Choisir les voix (4 accents)</summary>
        <div className="mt-3">
          <VoicePicker prefs={settings.voicePrefs} onChange={(voicePrefs) => set({ voicePrefs, voicesChosen: true })} rate={settings.speechRate} />
        </div>
        <p className="text-xs text-muted mt-2">Les voix marquées « en ligne » dépendent d’un service du navigateur : préférez les voix locales pour un usage hors ligne.</p>
      </details>
    </Section>
  );
}

function DataSettings() {
  const reload = useApp((s) => s.reload);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ json: unknown; summary: string } | null>(null);
  const [message, setMessage] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  const doExport = async () => {
    downloadJson(await exportData(), backupFileName());
    setMessage('Sauvegarde téléchargée. Conservez-la en lieu sûr (elle contient toute votre progression).');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMessage('');
    try {
      const json: unknown = JSON.parse(await file.text());
      const b = parseBackup(json);
      const date = new Date(b.exportedAt).toLocaleString('fr-FR');
      setPending({ json, summary: `Sauvegarde du ${date} : ${b.tables.attempts.length} réponses, ${b.tables.lessons.length} leçons, ${b.tables.exams.length} examens blancs.` });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Fichier illisible.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    try {
      await importData(pending.json);
      setPending(null);
      await reload();
      setMessage('Import terminé : vos données ont été restaurées.');
    } catch (e) {
      setPending(null);
      setMessage(e instanceof Error ? e.message : 'Import impossible.');
    }
  };

  const resetAll = async () => {
    await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
      for (const t of TABLES) await db.table(t).clear();
    });
    setResetOpen(false);
    await reload();
    setMessage('Toutes les données locales ont été effacées.');
  };

  return (
    <Section title="Mes données">
      <p className="text-sm text-muted mb-3">
        Vos données (progression, réponses, réglages) sont stockées uniquement dans ce navigateur. Exportez-les régulièrement : vider les données du navigateur ou désinstaller l’application les efface.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void doExport()}>
          <IconDownload size={18} /> Exporter (JSON)
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <IconUpload size={18} /> Importer une sauvegarde
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Fichier de sauvegarde" tabIndex={-1} />
      </div>
      {message && (
        <p className="text-sm mt-3" role="status">
          {message}
        </p>
      )}
      <button type="button" className="text-sm text-bad underline mt-4" onClick={() => setResetOpen(true)}>
        Effacer toutes mes données…
      </button>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Remplacer les données actuelles ?">
        <p className="text-sm">{pending?.summary}</p>
        <p className="text-sm text-muted mt-2">L’import remplace toute la progression présente sur cet appareil. Exportez d’abord vos données actuelles si vous voulez les garder.</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setPending(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={() => void confirmImport()}>
            Remplacer
          </Button>
        </div>
      </Modal>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Effacer toutes les données ?">
        <p className="text-sm">Progression, historique, série, badges, signalements et réglages seront supprimés de cet appareil. Cette action est définitive.</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={() => void resetAll()}>
            Tout effacer
          </Button>
        </div>
      </Modal>
    </Section>
  );
}

function Reports() {
  const reports = useLiveQuery(() => db.reports.toArray(), []);
  if (!reports) return null;
  return (
    <Section title={`Signalements (${reports.length})`}>
      {reports.length === 0 ? (
        <p className="text-sm text-muted">Aucun signalement. Utilisez « Signaler une erreur dans cette question » après une correction.</p>
      ) : (
        <>
          <ul className="divide-y divide-line list-none p-0 text-sm">
            {reports
              .slice()
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((r) => (
                <li key={r.id} className="py-2 flex items-start gap-3">
                  <div className="flex-1">
                    <p>
                      <code className="font-mono text-xs">{r.qid}</code> · <strong>{r.category}</strong>
                    </p>
                    {r.comment && <p className="text-muted">{r.comment}</p>}
                    <p className="text-xs text-muted">{new Date(r.at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button type="button" className="text-muted hover:text-bad px-2" onClick={() => r.id !== undefined && void db.reports.delete(r.id)} aria-label={`Supprimer le signalement sur ${r.qid}`}>
                    ×
                  </button>
                </li>
              ))}
          </ul>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => downloadJson(reports, `ascension-signalements-${new Date().toISOString().slice(0, 10)}.json`)}>
            <IconDownload size={16} /> Exporter les signalements
          </Button>
          <p className="text-xs text-muted mt-2">Pour corriger une question, modifiez le fichier JSON correspondant dans content/ (voir le README), puis lancez npm run validate.</p>
        </>
      )}
    </Section>
  );
}
