/** Enregistrement du service worker (mise à jour automatique, fonctionnement hors ligne). */
import { registerSW } from 'virtual:pwa-register';

export function setupPwa(): void {
  // Demande un stockage persistant : le navigateur évite alors d'effacer la progression
  // quand l'appareil manque de place (accordé d'office aux apps installées sur iPhone).
  void navigator.storage?.persist?.().catch(() => false);
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[Ascension] Prête à fonctionner hors ligne.');
    },
  });
}
