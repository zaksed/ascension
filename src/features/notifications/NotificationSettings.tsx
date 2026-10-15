/** Réglage des notifications : notions du jour (1 à 3 par jour) et rappel de série. */
import { useState } from 'react';
import type { NotificationSettings as NotifSettings } from '../../db/db';
import { useApp } from '../../store/app';
import { Button, Toggle } from '../../components/ui';
import { DEFAULT_TIMES, disablePush, enablePush, isIOS, isStandalone, permission, pushConfigured, pushSupported, syncPush, testNotification } from './push';

export function NotificationSettings({ compact = false }: { compact?: boolean }) {
  const n = useApp((s) => s.settings.notifications);
  const update = useApp((s) => s.updateSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const supported = pushSupported();
  const needsHomeScreen = isIOS() && !isStandalone();
  const configured = pushConfigured();

  const save = async (patch: Partial<NotifSettings>) => {
    const next = { ...n, ...patch };
    await update({ notifications: next });
    if (next.enabled) syncPush(next).catch((e: Error) => setMessage({ ok: false, text: e.message }));
  };

  const toggle = async (on: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (on) {
        await enablePush(n);
        await update({ notifications: { ...n, enabled: true } });
        setMessage({ ok: true, text: 'Notifications activées.' });
      } else {
        await disablePush();
        await update({ notifications: { ...n, enabled: false } });
        setMessage({ ok: true, text: 'Notifications désactivées.' });
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Action impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const setCount = (count: number) => {
    const times = Array.from({ length: count }, (_, i) => n.times[i] ?? DEFAULT_TIMES[i]);
    void save({ times });
  };

  if (!supported)
    return <p className="text-sm text-muted">Ce navigateur ne gère pas les notifications. Sur iPhone, il faut iOS 16.4 ou plus récent.</p>;
  if (needsHomeScreen)
    return (
      <p className="text-sm text-muted">
        Sur iPhone, les notifications ne sont disponibles que dans l’application installée : ouvrez Ascension depuis son icône sur l’écran d’accueil, puis revenez ici.
      </p>
    );

  return (
    <div className="space-y-1">
      {!configured && (
        <p className="text-sm text-accent mb-2">Le service d’envoi des rappels est en cours de mise en place : l’activation sera possible dès la prochaine mise à jour.</p>
      )}
      <Toggle
        checked={n.enabled}
        onChange={(v) => void toggle(v)}
        label="Recevoir des notifications"
        description={busy ? 'Un instant…' : permission() === 'denied' ? 'Notifications bloquées : autorisez-les dans les réglages du téléphone.' : 'Notions du jour et rappel de série, aux heures de votre choix.'}
      />
      {(n.enabled || compact === false) && (
        <div className={`space-y-3 pt-1 ${n.enabled ? '' : 'opacity-60'}`}>
          <fieldset>
            <legend className="font-medium">Notions par jour</legend>
            <div className="flex gap-2 mt-1.5" role="radiogroup" aria-label="Nombre de notions par jour">
              {[1, 2, 3].map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={n.times.length === c}
                  onClick={() => setCount(c)}
                  className={`rounded-lg border px-4 py-1.5 font-semibold ${n.times.length === c ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {n.times.map((t, i) => (
                <label key={i} className="text-sm text-muted">
                  Notion {i + 1}
                  <input
                    type="time"
                    step={300}
                    value={t}
                    onChange={(e) => e.target.value && void save({ times: n.times.map((x, j) => (j === i ? e.target.value : x)) })}
                    className="block mt-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <Toggle checked={n.streak} onChange={(v) => void save({ streak: v })} label="Rappel de série" description="Un message qui tient compte de votre progression du jour." />
          {n.streak && (
            <label className="text-sm text-muted block">
              Heure du rappel
              <input
                type="time"
                step={300}
                value={n.streakTime}
                onChange={(e) => e.target.value && void save({ streakTime: e.target.value })}
                className="block mt-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
              />
            </label>
          )}
          <p className="text-xs text-muted">Les heures sont arrondies aux 5 minutes. Le service d’envoi ne connaît que ces heures, votre fuseau horaire et une adresse d’abonnement anonyme : ni votre nom, ni vos résultats.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => testNotification().then(() => setMessage({ ok: true, text: 'Notification d’essai envoyée.' }), (e: Error) => setMessage({ ok: false, text: e.message }))}
          >
            Tester une notification
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className={`text-sm mt-2 ${message.ok ? 'text-ok' : 'text-bad'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
