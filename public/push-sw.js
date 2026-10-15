/*
 * Notifications d'Ascension, importées par le service worker généré par Workbox
 * (vite.config.ts › workbox.importScripts). Le message reçu ne contient que son type
 * (« notion » ou « streak ») : le texte est choisi ici, sur l'appareil, à partir des
 * fiches pré-cachées et de la progression locale (IndexedDB).
 */
/* global self, clients, caches, indexedDB */
const APP_URL = self.registration.scope;
const NOTIONS_URL = new URL('notions.json', APP_URL).href;
const ICON_URL = new URL('icons/icon-192.png', APP_URL).href;

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lecture simple dans la base de l'application, sans jamais la créer ni la modifier. */
function idbGet(store, key) {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open('ascension');
    } catch {
      resolve(undefined);
      return;
    }
    req.onupgradeneeded = () => req.transaction.abort();
    req.onerror = () => resolve(undefined);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const get = db.transaction(store, 'readonly').objectStore(store).get(key);
        get.onsuccess = () => {
          resolve(get.result);
          db.close();
        };
        get.onerror = () => {
          resolve(undefined);
          db.close();
        };
      } catch {
        db.close();
        resolve(undefined);
      }
    };
  });
}

async function loadCards() {
  try {
    const cached = await caches.match(NOTIONS_URL, { ignoreSearch: true });
    const res = cached || (await fetch(NOTIONS_URL));
    const json = await res.json();
    return Array.isArray(json.cards) ? json.cards : [];
  } catch {
    return [];
  }
}

async function buildNotification(kind) {
  const kv = await idbGet('kv', 'settings');
  const settings = (kv && kv.value) || {};
  const exam = settings.activeExam === 'tagemage' ? 'tagemage' : 'toeic';
  const examLabel = exam === 'toeic' ? 'TOEIC' : 'TAGE MAGE';

  if (kind === 'streak') {
    const day = await idbGet('days', dayKey());
    const goal = Number(settings.dailyGoal) || 60;
    const xp = (day && day.xp) || 0;
    if (day && day.answers > 0 && xp >= goal) {
      return { title: 'Objectif du jour atteint 🎉', body: 'Votre série est assurée. Une notion pour la route ?', url: `${APP_URL}#/notion` };
    }
    if (day && day.answers > 0) {
      return { title: 'Presque !', body: `Encore ${goal - xp} XP pour atteindre votre objectif du jour.`, url: `${APP_URL}#/` };
    }
    return { title: 'Votre série vous attend 🔥', body: `Cinq minutes de ${examLabel} suffisent pour la garder aujourd’hui.`, url: `${APP_URL}#/` };
  }

  const cards = (await loadCards()).filter((c) => c.exam === exam);
  if (!cards.length) return { title: 'Ascension', body: 'Une notion vous attend dans l’application.', url: `${APP_URL}#/notion` };
  const card = cards[Math.floor(Math.random() * cards.length)];
  return { title: `Notion à connaître · ${examLabel}`, body: card.front, url: `${APP_URL}#/notion/${card.id}` };
}

self.addEventListener('push', (event) => {
  let kind = 'notion';
  try {
    const data = event.data ? event.data.json() : null;
    if (data && data.kind === 'streak') kind = 'streak';
  } catch {
    /* message sans contenu : notion par défaut */
  }
  event.waitUntil(
    buildNotification(kind).then(({ title, body, url }) =>
      self.registration.showNotification(title, { body, icon: ICON_URL, badge: ICON_URL, tag: `ascension-${kind}`, data: { url } }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || APP_URL;
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.startsWith(APP_URL) && 'focus' in w) {
          await w.focus();
          if ('navigate' in w) await w.navigate(url).catch(() => undefined);
          return;
        }
      }
      await clients.openWindow(url);
    })(),
  );
});
