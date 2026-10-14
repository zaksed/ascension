# Ascension — révisions TOEIC & TAGE MAGE

Application web installable (PWA) pour réviser le **TOEIC Listening & Reading** et le **TAGE MAGE** au
quotidien : parcours en unités et leçons courtes, révision espacée, modes d’entraînement, examens blancs
chronométrés et tableau de bord.

- **Gratuite et sans publicité.** Aucun abonnement, aucun achat, aucune vie ni limite quotidienne.
- **Hors ligne.** Une fois chargée, l’application fonctionne sans réseau.
- **Privée.** Pas de compte, pas de serveur, pas de mesure d’audience : vos données restent dans le
  navigateur de votre appareil. Aucun appel réseau n’est fait pendant l’utilisation.
- **Contenu original.** 712 questions TOEIC (308 Listening, 404 Reading) et 376 questions TAGE MAGE, toutes
  rédigées pour l’application, avec 2 examens blancs complets par examen. Formats sourcés dans
  [docs/FORMATS_OFFICIELS.md](docs/FORMATS_OFFICIELS.md).

> Ascension n’est ni affiliée, ni approuvée par ETS (TOEIC), la FNEGE (TAGE MAGE) ou Duolingo. Les scores
> affichés sont des **estimations**.

---

## 1. Installation et lancement

Prérequis : **Node.js 20 ou plus** (testé avec Node 24 LTS). Vérifiez avec `node --version`.

Dans le dossier du projet :

```bash
npm install
```

```bash
npm run dev
```

Ouvrez l’adresse affichée (par défaut http://localhost:5173). L’option `--host` affiche aussi une adresse
« Network » utilisable depuis un téléphone sur le même Wi-Fi, pour essayer l’interface. L’installation sur
l’écran d’accueil et le mode hors ligne exigent en revanche une adresse sécurisée (voir §3).

## 2. Build de production

```bash
npm run build
```

Cette commande valide d’abord la banque de questions (`npm run validate`), puis vérifie les types et produit
le site statique dans `dist/`, avec son service worker (tout est pré-caché pour le hors-ligne). Pour tester le
résultat localement :

```bash
npm run preview
```

## 3. Installer l’application sur un téléphone

Un navigateur n’installe une PWA que si la page est servie en **HTTPS** (ou depuis `localhost`). Deux options
gratuites :

**A. Hébergement statique gratuit (le plus simple, obligatoire pour l’iPhone).** Le projet contient un
workflow GitHub Actions (`.github/workflows/deploy.yml`) : poussez le dépôt sur GitHub, puis dans
**Settings › Pages**, choisissez la source **GitHub Actions**. À chaque envoi sur `main`, le contenu est
validé, les tests passent, puis l’application est publiée sur `https://<votre-compte>.github.io/<dépôt>/`.
Netlify ou Cloudflare Pages conviennent aussi (glisser-déposer le dossier `dist/`). L’hébergeur ne sert que
des fichiers : vos réponses et votre progression ne quittent jamais votre téléphone.

**B. Sans aucun hébergement (Android + câble USB).** Lancez `npm run preview` sur l’ordinateur, activez le
débogage USB sur le téléphone, ouvrez `chrome://inspect` dans Chrome sur l’ordinateur, puis
**Port forwarding** : `4173` → `localhost:4173`. Sur le téléphone, ouvrez http://localhost:4173.

Ensuite, sur le téléphone :

- **Android (Chrome)** : menu ⋮ → **Installer l’application** (ou « Ajouter à l’écran d’accueil »).
- **iPhone (Safari)** : bouton Partager → **Sur l’écran d’accueil**.

Ouvrez l’application une fois avec du réseau : tout est alors mis en cache et elle fonctionne hors ligne.
Les mises à jour se font automatiquement à l’ouverture suivante, quand une nouvelle version est publiée.

## 4. Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Validation du contenu + types + build PWA dans `dist/` |
| `npm run preview` | Sert `dist/` localement (port 4173) |
| `npm test` | Tests automatisés (Vitest) |
| `npm run validate` | Valide toute la banque (schéma, cohérence, examens blancs, calculs vérifiés par script) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run content:balance` | Rééquilibre la position des bonnes réponses (A/B/C/D) sans changer leur contenu |
| `npm run icons` | Régénère les icônes PNG à partir du logo (sans dépendance) |
| `npm run audio` | Facultatif : pré-génère l’audio avec Piper (voir §7) |

## 5. Ajouter ou corriger des questions

Les questions sont dans des fichiers JSON versionnés :

- `content/toeic/*.json` (une partie par fichier, ou une partie découpée en plusieurs fichiers) ;
- `content/tagemage/*.json` ;
- `content/<examen>/curriculum.json` : compétences (avec leur conseil de méthode) et unités du parcours.

Chaque fichier a la forme `{ "version", "exam", "section", "description", "groups": [...], "questions": [...] }`.
Une question contient :

| Champ | Contenu |
|---|---|
| `id` | `toeic-p5-0131`, `tm-calc-0067`… (préfixe imposé par la partie, numéro unique sur 4 chiffres ; `g` devant le numéro pour un groupe : `toeic-p6-g0018`) |
| `exam`, `section`, `skill` | examen, partie (`part1`…`part7`, `comprehension`, `calcul`, `raisonnement`, `conditions-minimales`, `expression`, `logique`) et compétence déclarée dans le curriculum |
| `difficulty` | 1 à 5 |
| `prompt`, `options`, `answer` | énoncé, propositions (3 en Partie 2, 4 au TOEIC, 5 au TAGE MAGE) et indice de la bonne réponse (0 = A) |
| `explanation`, `trap`, `tip` | explication détaillée, piège classique, conseil de méthode (facultatif : sinon celui de la compétence) |
| `recommendedSeconds`, `tags` | temps conseillé, mots-clés |
| `groupId`, `pool` | document partagé éventuel ; `pool` = `practice` (défaut), `mock1` ou `mock2` |
| `media`, `listening`, `verification` | illustration ou tableau, script audio, vérification par script |

Règles particulières :

- **Groupes** (documents partagés) : conversations et exposés des Parties 3-4 (`transcript`, 3 questions),
  textes de la Partie 6 (blancs notés `{{1}}`…`{{4}}`), documents de la Partie 7 (simples, doubles, triples ;
  positions d’insertion notées `[[1]]`…`[[4]]` ; lignes de chat « Nom (heure) : texte »), textes de
  Compréhension (5 questions).
- **Audio** : chaque réplique indique une voix (`US-F`, `UK-M`, `AU-F`, `CA-M`…).
- **Examens blancs** : les questions `mock1`/`mock2` restent hors de l’entraînement tant que l’examen
  correspondant n’a pas été passé. Leur composition est vérifiée à l’unité près ; ajoutez de nouvelles
  questions en `practice`.
- **Calcul, Conditions minimales, Logique** : le champ `verification` est **obligatoire**. Exemples :
  - calcul : `{"kind":"expr","expr":"120/0.75","values":[90,145,150,160,180]}` ; le script recalcule
    la réponse et contrôle que la valeur de chaque option correspond à son texte ;
  - conditions minimales : `{"kind":"sufficiency","vars":{"n":"int:1..60"},"s1":"(n+1)%2===1","s2":"n%3===0","target":"n%2===0"}` ;
    le script énumère tous les cas possibles et en déduit la lettre A–E, qui doit être la réponse ;
  - suites logiques : `{"kind":"sequence","series":[{"rule":"n => 4*n-1","shown":[3,7,11,15]}], ...}` ;
    le script recalcule les termes affichés et le terme suivant.

Après toute modification :

```bash
npm run validate
```

```bash
npm test
```

Les signalements faits dans l’application (« Signaler une erreur dans cette question ») s’exportent depuis
**Réglages › Signalements** pour retrouver les questions à corriger.

## 6. Sauvegarder et transférer ses données

Toutes les données (progression, historique, série, badges, réglages, signalements) sont stockées dans le
navigateur (IndexedDB). **Vider les données du site ou désinstaller l’application les efface.**

- **Exporter** : Réglages › Mes données › **Exporter (JSON)**. Un fichier `ascension-sauvegarde-AAAA-MM-JJ.json`
  est téléchargé. Faites-le régulièrement, par exemple chaque semaine.
- **Importer** (autre appareil, réinstallation) : Réglages › Mes données › **Importer une sauvegarde**. Le
  fichier est vérifié avant l’import, qui **remplace** les données présentes.

## 7. Audio du Listening

Par défaut, l’application lit les enregistrements avec les **voix de synthèse du téléphone** (hors ligne sur
Android et iOS si des voix anglaises sont installées). Elle choisit une voix par accent (américain, britannique,
australien, canadien) et par genre ; vous pouvez imposer une voix par accent dans les réglages.

- Android : Paramètres › Accessibilité (ou Système) › **Synthèse vocale** › installer des voix anglaises.
- iPhone : Réglages › Accessibilité › Contenu énoncé › **Voix** › Anglais.

Pour un son plus naturel et identique sur tous les appareils, vous pouvez **pré-générer** l’audio avec
[Piper](https://github.com/rhasspy/piper) (gratuit, local) et ffmpeg, à installer vous-même :

1. copiez `scripts/piper-voices.example.json` en `scripts/piper-voices.json` et indiquez vos modèles `.onnx` ;
2. lancez la génération (≈ 170 fichiers MP3 dans `public/audio/`, de l’ordre de 30 à 50 Mo) :

```bash
npm run audio
```

3. relancez `npm run build`. Les fichiers listés dans `public/audio/manifest.json` sont alors utilisés à la
   place de la synthèse du téléphone.

## 8. Architecture

- **TypeScript + React 19 + Vite 7** : typage strict, build rapide et statique, aucun serveur.
- **vite-plugin-pwa (Workbox)** : manifeste et service worker, tout le site pré-caché pour le hors-ligne.
- **Dexie (IndexedDB)** : historique, révision espacée, progression ; export/import JSON.
- **Zustand** : état global léger (réglages, profil). **Zod** : schéma unique de la banque.
- **Tailwind CSS 4** : interface mobile d’abord, thème clair/sombre par variables CSS.
- Contenu en JSON, découpé en modules chargés à la demande ; vérification mathématique par script au build.
- Moteurs purs et testés : SM-2, scores, série, placement, composition des examens blancs.
- Dossiers : `src/features/*` (moteurs et composants), `src/pages/*` (écrans), `content/` (banque),
  `scripts/` (validation, équilibrage, icônes, audio), `tests/` (Vitest).

Le détail de ce qui a été vérifié et de ce qui reste à contrôler est dans
[docs/RAPPORT_VERIFICATION.md](docs/RAPPORT_VERIFICATION.md).
