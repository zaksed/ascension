# Rapport de vérification — Ascension (14 octobre 2026)

Ce document liste ce qui a été vérifié, comment, avec quel résultat, ce qui reste incertain et ce que vous
devez contrôler vous-même. Les formats officiels et leurs sources sont dans
[FORMATS_OFFICIELS.md](FORMATS_OFFICIELS.md).

## 1. Ce qui a été vérifié

### 1.1 Banque de questions (`npm run validate`, `npm test`)

| Élément | Résultat |
|---|---|
| Schéma Zod, identifiants uniques, préfixes, nombre d’options, options en double | 0 erreur, 0 alerte |
| Volumes TOEIC | 712 questions : 308 Listening (P1 24, P2 80, P3 126, P4 78) et 404 Reading (P5 130, P6 68, P7 206). Objectif : ≥ 300 et ≥ 400 |
| Volumes TAGE MAGE | 376 questions : CT 60, Calcul 66, R&A 60, CM 60, Expression 70, Logique 60. Objectif : ≥ 60 par sous-test |
| Groupes | P3/P4 : 3 questions + transcription ; P6 : 4 questions et blancs `{{1}}`…`{{4}}` ; P7 : documents simples de 2 à 4 questions, doubles et triples de 5 ; CT : 5 questions par texte |
| Examens blancs TOEIC n°1 et n°2 | 200 questions chacun : 6 / 25 / 39 / 30 / 30 / 16 / 54, dont 2 doubles et 3 triples en P7 ; aucune question commune |
| Examens blancs TAGE MAGE n°1 et n°2 | 6 × 15 questions dans l’ordre officiel, difficulté croissante dans chaque sous-test |
| Examen aléatoire | composable au format exact (sous-ensemble de documents P7 totalisant exactement 29 questions) |
| Leçons | chaque leçon de chaque unité compte 8 à 12 questions d’entraînement |
| Position des bonnes réponses | aucune lettre au-dessus de 40 % (script `content:balance`) |

### 1.2 Mathématiques TAGE MAGE : vérification par script

- **196 questions vérifiées automatiquement** : 66 Calcul (expression recalculée et valeur de chaque option
  contrôlée), 60 Conditions minimales (énumération exhaustive des cas, la lettre A–E est déduite puis comparée
  à la réponse), 60 Logique (40 suites recalculées terme à terme, 20 expressions), et 10 questions chiffrées
  de R&A.
- **Test de non-complaisance** : pour chacune de ces 196 questions, une réponse volontairement faussée est
  bien rejetée par le vérificateur (`tests/content.test.ts`).
- Deux questions de Conditions minimales contradictoires ont été détectées pendant la rédaction, puis
  corrigées (tm-cm-0012, tm-cm-0025).

### 1.3 Seconde passe sur les questions verbales

Les 712 questions TOEIC et 180 questions verbales TAGE MAGE (CT, Expression, R&A non chiffrées) ont fait
l’objet d’une **relecture critique, lot par lot, par le même rédacteur** : unicité de la bonne réponse,
plausibilité des distracteurs, cohérence de l’explication et du piège. Six questions de la Partie 5 ont été
corrigées à cette occasion. **Ce n’est pas une vérification indépendante** (voir §3).

### 1.4 Code

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` (TypeScript strict, variables inutilisées interdites) | 0 erreur |
| `npm test` (Vitest) | **47 tests réussis**, 5 fichiers : contenu, scores, SM-2, série, XP et couronnes, examens blancs, sélection, placement, sauvegarde |
| `npm run build` | réussi ; 62 fichiers pré-cachés (≈ 1,5 Mo) par le service worker ; manifeste et icônes 192, 512 et 512 maskable |
| Aucun appel réseau à l’exécution | recherche dans le bundle : les seules URL sont des chaînes de bibliothèques (espaces de noms SVG, messages d’erreur) ; le seul `fetch` lit `audio/manifest.json` sur la même origine |
| Dépendances | toutes libres et gratuites (MIT/Apache) ; aucune police, image ou bibliothèque payante |
| Couleurs des graphiques | validées par script : contraste ≥ 3:1, séparation pour daltoniens, rampe ordinale monotone, en thème clair et sombre |

### 1.5 Essais dans un navigateur (fenêtre de 390 px de large, thème sombre)

- **Accueil** et **leçon** : sélection au clavier (A–E, Entrée), correction immédiate avec explication,
  piège, méthode et bouton de signalement ; aucune erreur dans la console.
- **Examen blanc TAGE MAGE complet** : 6 sous-tests enchaînés, interruption puis **reprise** au sous-test 2,
  écran de fin, rapport. Le score affiché (13/600 pour 2 bonnes réponses en CT et en Logique) a été recalculé à
  la main ; le badge « Six épreuves » est attribué.
- **Examen blanc TOEIC, Listening** : consignes de partie, lecture automatique unique, fenêtre de réponse,
  passage automatique à la question suivante.
- **Sans voix anglaise** (cas du navigateur de test, qui n’a que des voix françaises) : bascule automatique
  sur la transcription (P3/P4) ou sur l’affichage du texte (P1/P2), en entraînement comme en examen.
- **Tableau de bord** : graphiques, tableau par partie, calendrier de 18 semaines tenant dans la largeur d’un
  téléphone.
- Les données de test créées pendant ces essais ont été effacées du navigateur.

## 2. Grille d’autocontrôle (phase 4)

| Exigence | État | Preuve ou remarque |
|---|---|---|
| PWA installable, hors ligne, sans compte, sans pub, sans télémétrie | ✅ | manifeste + service worker ; aucune requête externe |
| Données uniquement sur l’appareil, export/import JSON | ✅ | IndexedDB ; Réglages › Mes données ; test aller-retour |
| Formats officiels 2026 sourcés et datés | ✅ | FORMATS_OFFICIELS.md (divergences signalées) |
| Stack justifiée en ≤ 10 lignes | ✅ | README §8 |
| JSON versionné validé par Zod, champs demandés | ✅ | `src/content/schema.ts`, `npm run validate` |
| Volumes (TOEIC ≥ 300 L / ≥ 400 R ; TAGE MAGE ≥ 60 par sous-test ; 2 blancs chacun) | ✅ | §1.1 |
| Calculs TAGE MAGE vérifiés par script | ✅ | §1.2 |
| Seconde vérification indépendante des lots | ⚠️ | faite par le même rédacteur pour le verbal ; automatique pour les maths |
| Carte du parcours, leçons de 8 à 12 questions, couronnes, déblocage progressif gratuit | ✅ | Parcours ; tests de déblocage |
| Test de placement (20 questions) qui valide des unités | ✅ | tests de placement |
| XP, série, gel de série gratuit et illimité, objectif réglable, badges, barres de progression | ✅ | Accueil, Réglages, Progrès |
| Animations et sons discrets et désactivables ; ni vies ni limite quotidienne | ✅ | Réglages › Apparence et sons |
| Correction immédiate, explication, piège, méthode, « signaler une erreur » | ✅ | essai §1.5 |
| Révision espacée et file « À réviser aujourd’hui » | ✅ | SM-2, page Révisions, tests |
| Audio : accents variés, vitesse réglable, réécoute à l’entraînement seulement, écoute unique en examen, transcription après réponse | ✅ | 388 répliques réparties entre 8 voix (US, UK, AU, CA × F/H) |
| Partie 1 : illustrations SVG originales avec équivalent textuel | ✅ | 24 scènes ; chaque photo vérifiée par test |
| Modes d’entraînement : partie, compétence, faiblesses, flash 5 min | ✅ | page Entraînement |
| Examens blancs chronométrés, conversion du score, rapport détaillé | ✅ | essai §1.5 ; TOEIC 200 q / 120 min ; TAGE MAGE 6 × 20 min |
| Tableau de bord : évolution du score, réussite et vitesse par compétence, temps, calendrier, objectif et date | ✅ | page Progrès |
| Mobile d’abord, accessible, thème sombre, interface en français et textes TOEIC en anglais | ✅ | attributs `lang`, groupes radio, navigation au clavier, `aria-live` |
| Aucun nom, logo, mascotte ou texte de Duolingo, ETS ou FNEGE | ✅ | noms d’examens cités pour désigner les épreuves ; mention de non-affiliation |
| Questions originales, rien de copié | ✅ | rédaction originale (voir §3, point 6) |
| README et rapport de vérification | ✅ | ce fichier |

## 3. Ce qui reste incertain

1. **Conversion du score TOEIC** : ETS ne publie pas de table. Le score de l’application est une estimation
   fondée sur une courbe indicative ; l’écart avec un score réel peut atteindre plusieurs dizaines de points.
2. **Barème TAGE MAGE** : l’absence de pénalité est officielle. La formule finale (moyenne des domaines × 10)
   est concordante mais n’est pas publiée en texte par la FNEGE. La date exacte de suppression de la pénalité
   n’est confirmée que par une source.
3. **Compréhension de textes** : nombre de textes non précisé officiellement (3 × 5 questions retenu).
4. **Partie 7** : la répartition 2 documents doubles + 3 triples est majoritaire dans les sources de
   préparation, mais n’est pas confirmée officiellement.
5. **Difficulté croissante au TAGE MAGE** : choix de conception, non confirmé officiellement. Les niveaux de
   difficulté (1 à 5) des questions sont des estimations du rédacteur, non calibrées sur des candidats.
6. **Questions verbales** : relues, mais pas par une seconde personne. Une ambiguïté résiduelle reste
   possible ; le bouton « Signaler une erreur » sert à les repérer.
7. **Fenêtres de réponse du Listening en examen blanc** : approximation du rythme réel (6 à 31 s selon
   l’item).
8. **Qualité de l’audio** : dépend des voix installées sur l’appareil, à moins de pré-générer l’audio avec
   Piper (script fourni, non exécuté ici).

## 4. Ce que vous devez vérifier vous-même

1. **Sur votre téléphone** : installer l’application (README §3), puis passer en mode avion et vérifier
   qu’une leçon et une révision fonctionnent hors ligne.
2. **Les voix** : dans Réglages › Audio du Listening, vérifier que des voix anglaises sont détectées et les
   tester ; sinon, en installer (README §7).
3. **Un examen blanc TOEIC complet**, en conditions réelles (≈ 2 h) : le déroulé du Listening n’a été
   essayé que sur ses premières questions.
4. **Quelques questions de chaque partie** : en cas de doute, utilisez « Signaler une erreur », puis
   exportez les signalements depuis les réglages.
5. **La sauvegarde** : faire un export, puis l’importer sur un autre navigateur ou appareil.
6. **Les règles officielles avant votre inscription** (tarifs, dates, fréquence de passage) sur ets.org et
   tagemage.fr : elles peuvent évoluer après le 13/10/2026.

## 5. Remarques sur l’environnement de développement

- Node.js 24 LTS a été installé avec `winget`, à votre demande. La commande a été lancée avec
  `--accept-source-agreements --accept-package-agreements`, ce qui a accepté en votre nom les conditions de
  la source winget et la licence de Node.js. Si une commande `node` n’est pas trouvée, ouvrez un nouveau
  terminal.
- Lors de `npm install`, npm a signalé qu’un script d’installation d’esbuild n’avait pas été exécuté. Le
  build et les tests fonctionnent malgré tout (le binaire esbuild pour Windows est présent).
- `vite.config.ts` fixe la racine du projet sur son chemin réel : le dossier de travail de cette session est
  accessible par deux chemins sous Windows, ce qui faisait échouer le build. Ce réglage est sans effet
  ailleurs.
- Piper n’a pas été téléchargé : seul le script de génération est fourni.
