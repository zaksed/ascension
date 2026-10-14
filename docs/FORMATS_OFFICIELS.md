# Formats officiels retenus (vérifiés le 13 octobre 2026)

Ce fichier est la référence de l'application : la structure des parcours, des examens blancs et des
moteurs de score en découle. Chaque point indique la valeur retenue, sa source et la date de consultation.
Les niveaux de confiance utilisés sont :

- **Officiel** : écrit sur le site de l'organisateur (ETS / ETS Global / IIBC pour le TOEIC ; tagemage.fr pour le TAGE MAGE).
- **Concordant** : non trouvé mot pour mot sur un site officiel, mais identique dans plusieurs sources de préparation sérieuses et récentes.
- **Incertain** : sources divergentes ou absentes ; choix de conception signalé.

Toutes les consultations ont eu lieu le **13/10/2026**.

---

## 1. TOEIC Listening & Reading

### 1.1 Structure générale

| Point | Valeur retenue | Confiance | Source |
|---|---|---|---|
| Nombre de questions | 200 QCM (100 Listening + 100 Reading) | Officiel | https://www.ets.org/toeic/about/listening-reading.html |
| Durée Listening | environ 45 min, rythmée par l'audio | Officiel | https://www.eu.ets.org/toeic/about/listening-reading.html |
| Durée Reading | 75 min, à son rythme | Officiel | idem |
| Durée totale | environ 2 h (+ ≈ 30 min de questions administratives le jour J) | Officiel | https://www.ets.org/toeic/about/listening-reading.html |
| Échelle de score | Listening 5–495, Reading 5–495, total 10–990 | Officiel | https://www.eu.ets.org/toeic/about/listening-reading.html |
| Validité des résultats | 2 ans | Officiel | idem |
| Dernière évolution de format | 1er juin 2018 (zone EMEA) ; nombre de questions, durée et grille d'interprétation inchangés | Officiel | https://www.etsglobal.org/fr/fr/help-center/les-questions-les-plus-consultees/quelles-sont-les-evolutions-du-test-toeic-listening |
| Changement en 2026 ? | **Aucun pour le L&R.** | Concordant | https://www.digischool.fr/articles/toeic/nouveau-toeic-4-skills-aout-2026/ (vérif. ETS du 24/08/2026), https://www.digischool.fr/articles/toeic/toeic-link/ (vérif. du 08/09/2026) |

**Divergence signalée (sans effet sur l'application)** : des centres agréés ont annoncé en juin 2026 une
refonte du **TOEIC 4-Skills** au 3 août 2026 (1 h 20, score sur 25 par compétence). ETS ne l'avait pas
confirmée sur ses pages au 24/08/2026. Ces caractéristiques correspondent au **TOEIC Link**, un test
distinct (modules en ligne, score de 0 à 25). Aucune source n'indique de changement pour le TOEIC
Listening & Reading. L'application cible donc le format L&R de 2018, toujours en vigueur.

### 1.2 Parties

| Partie | Intitulé | Questions | Options | Structure | Confiance | Source |
|---|---|---|---|---|---|---|
| 1 | Photographs | 6 | 4 (A–D), non imprimées | 1 photo, 4 phrases entendues une seule fois | Officiel | https://www.iibc-global.org/english/toeic/test/lr/about/format.html |
| 2 | Question-Response | 25 | 3 (A–C), non imprimées | 1 question ou affirmation, 3 réponses entendues | Officiel | idem |
| 3 | Conversations | 39 | 4 | 13 conversations × 3 questions ; 2 **ou 3** locuteurs ; certaines avec un graphique | Officiel | idem + ETS Global (évolutions 2018) |
| 4 | Talks | 30 | 4 | 10 exposés × 3 questions ; certains avec un graphique | Officiel | idem |
| 5 | Incomplete Sentences | 30 | 4 | phrases à compléter (grammaire, vocabulaire) | Officiel | idem |
| 6 | Text Completion | 16 | 4 | 4 textes × 4 questions, dont 1 insertion de phrase par texte | Officiel (4 × 4) / Concordant (1 phrase par texte) | idem |
| 7 | Reading Comprehension | 54 | 4 | 29 questions sur documents simples (2 à 4 questions par document) + 25 sur documents multiples (5 séries de 5 questions) | Officiel | idem + manuel du candidat (copie) : https://iigvietnam.com/wp-content/uploads/2026/05/TOEIC-Examinee-Handbook-update-2026.pdf |

- **Documents multiples** : 5 séries de 5 questions, doubles ou triples. La répartition **2 doubles + 3 triples**
  est la plus courante dans les sources de préparation, mais aucune source officielle consultée ne la précise
  (**Incertain**). L'application l'utilise par défaut.
- **Types de questions introduits en 2018** (Officiel, ETS Global) : conversations à plus de deux locuteurs ;
  formes orales réduites (« gonna ») et phrases incomplètes ; questions croisant l'audio et un graphique ;
  questions de sens implicite (« Why does the man say "…"? ») ; textes de type SMS, messagerie instantanée
  ou chat à plusieurs ; questions portant sur trois textes liés. Questions d'insertion de phrase en Partie 7
  (Officiel, IIBC).
- **Types de documents** retenus pour la Partie 7 (Concordant) : e-mails, lettres, notes de service, annonces,
  publicités, articles, formulaires, factures, horaires, chats et SMS, avis en ligne, pages web.

### 1.3 Accents

| Point | Valeur retenue | Confiance | Source |
|---|---|---|---|
| Accents audio | américain, britannique, canadien, australien | Concordant | https://www.ef.edu/english-tests/toeic/listening/ ; ouvrage officiel approuvé par ETS : https://etsglobal.org/fr/en/preparation-tool/les-tests-toeic-officiels-corriges ; blog ETS Global : https://etsglobal.org/ci/en/blog/news/5-tips-to-practice-your-english-listening-skills |

Le manuel officiel ETS n'a pas pu être lu en texte intégral. La liste des quatre accents est reprise de façon
identique par ETS Global (blog et ouvrage approuvé) : confiance élevée.

### 1.4 Conversion des points en score

ETS **ne publie pas** de table officielle de conversion. Chaque version du test est égalisée
(*equating*) : le même nombre de bonnes réponses peut donner des scores un peu différents selon la version.
L'application utilise une **table d'estimation** monotone (voir `src/features/scoring/toeic.ts`), proche
des tables indicatives publiées par les sites de préparation. Elle est présentée dans l'interface comme une
**estimation**, jamais comme un score officiel (**Incertain par nature**).

### 1.5 Chronométrage de l'examen blanc

- Listening : l'audio impose le rythme. Chaque document est joué **une seule fois**, suivi d'une pause de réponse
  calquée sur le test réel (environ 5 s en Parties 1–2 et 8 s par question en Parties 3–4, plus pour une question
  avec graphique). Le temps de lecture des questions en Parties 3–4 est inclus. Durée cible : environ 45 min.
- Reading : minuteur de 75 min, navigation libre dans la section.
- Total : 120 min.

---

## 2. TAGE MAGE (FNEGE)

### 2.1 Structure générale

| Point | Valeur retenue | Confiance | Source |
|---|---|---|---|
| Nombre de questions | 90 | Officiel | https://www.tagemage.fr/page/foire-aux-questions |
| Propositions par question | 5 (A–E), une seule bonne réponse | Officiel | idem ; https://www.tagemage.fr/page/comprendre-son-score |
| Durée totale | 2 h (+ ≈ 30 min de consignes ; prévoir 3 h 30 sur place) | Officiel | https://www.tagemage.fr/page/foire-aux-questions |
| Sous-tests | 6 × 15 questions × 20 min, enchaînés sans pause, chronométrage strict par sous-test | Concordant | https://www.prepaya.fr/blog/tage-mage-guide-complet-2026/ (règles vérifiées sur le site FNEGE le 22/09/2026) ; https://editions-ellipses.fr/PDF/9782340070295_extrait.pdf |
| Calculatrice | interdite ; brouillon fourni sur place | Concordant | https://www.aurlom.com/tage-mage/fiches/inscriptions-regles-materiel-tout-securiser-avant-le-jour-j (mise à jour du 16/09/2026) ; Prepaya |

### 2.2 Ordre et contenu des sous-tests (numérotation officielle)

| N° | Sous-test | Domaine | Contenu retenu | Source |
|---|---|---|---|---|
| 1 | Compréhension de textes | Aptitudes verbales | Repérer l'information, distinguer faits et opinions, suivre l'argumentation, cerner la position de l'auteur, résumer fidèlement. **3 textes × 5 questions** (voir divergence) | https://www.tagemage.fr/page/sous-tests |
| 2 | Calcul | Résolution de problèmes | Arithmétique, géométrie et algèbre de niveau 3e ; mise en équation de problèmes concrets | idem |
| 3 | Raisonnement / Argumentation | Raisonnement logique | Situations du quotidien ou débats d'opinion ; logique naturelle ; déduction, induction, choix de la meilleure option | idem |
| 4 | Conditions minimales | Résolution de problèmes | Un énoncé insuffisant + deux informations (1) et (2) : déterminer lesquelles suffisent | idem |
| 5 | Expression | Aptitudes verbales | ≈ 1/3 repérage et correction d'erreurs, ≈ 1/3 reformulation, ≈ 1/3 cohérence du discours et suite logique | idem |
| 6 | Logique | Raisonnement logique | Catégorisation : critère commun, intrus, suites numériques, items spatiaux (dominos, cartes, figures) | idem |

**Codes de réponse en Conditions minimales** (Concordant :
https://groupe-reussite.fr/ressources/cours-en-ligne-conditions-minimales/) :
- **A** : (1) suffit seule, (2) ne suffit pas seule ;
- **B** : (2) suffit seule, (1) ne suffit pas seule ;
- **C** : (1) et (2) ensemble suffisent, aucune ne suffit seule ;
- **D** : chacune suffit séparément ;
- **E** : même ensemble, elles ne suffisent pas.

**Divergence (Compréhension de textes)** : le site officiel ne précise pas le nombre de textes. Groupe
Réussite et cours-et-fiches parlent de 3 textes (300 à 600 mots, environ 5 questions chacun) ; un test
d'entraînement Ecricome (2021) parle de 2 ou 3 textes. **Retenu : 3 textes × 5 questions** (configuration
majoritaire).

### 2.3 Notation (point le plus important)

| Point | Valeur retenue | Confiance | Source |
|---|---|---|---|
| Mauvaise réponse | **aucune pénalité** (0 point) | Officiel | https://www.tagemage.fr/page/comprendre-son-score ; https://www.tagemage.fr/page/foire-aux-questions |
| Absence de réponse | 0 point | Officiel | idem |
| Bonne réponse | 4 points (sous-test sur 60) | Concordant | https://www.prepaya.fr/blog/tage-mage-guide-complet-2026/ ; https://www.nomadeducation.fr/revisions/tage-mage-tout-pour-reussir-le-test-daptitude-au-lb226145/resultat-du-tage-mage-cyd16b60 |
| Score par domaine | 3 domaines notés sur 60 (moyenne des 2 sous-tests du domaine) | Officiel (3 × /60) / Concordant (moyenne) | comprendre-son-score ; Prepaya |
| Score final | moyenne des 3 domaines × 10, arrondie → **sur 600** (soit 6,67 points par bonne réponse) | Concordant | Prepaya |
| Date de suppression de la pénalité | « depuis 2025 » | Incertain (une seule source, non officielle) | Nomad Education |

**Divergence signalée** : de nombreux ouvrages et sites (Ellipses, Groupe Réussite, cours-et-fiches mis à jour
en mars 2026) décrivent encore l'ancien barème **+4 / −1 / 0** (score de −150 à 600). Le site officiel indique
clairement que les réponses incorrectes ne sont **pas** pénalisées. **Retenu : barème sans pénalité.**
Conséquence pédagogique : l'application conseille de **toujours répondre**, en devinant si besoin, avant la fin
du chrono. L'ancien barème reste disponible en option dans les réglages, à des fins de comparaison.

Le site officiel décrit le calcul final dans une image illisible en texte. La formule retenue (moyenne des
domaines × 10) peut donc différer à la marge d'une éventuelle normalisation de la FNEGE. Elle est présentée
comme une **estimation**.

### 2.4 Règles de passage

| Point | Valeur retenue | Confiance | Source |
|---|---|---|---|
| Fréquence | **une fois par trimestre civil** (janv.–mars, avr.–juin, juil.–sept., oct.–déc.) à compter du 1er janvier 2026, soit 4 par an au maximum, tous centres confondus | Officiel | https://www.tagemage.fr/page/foire-aux-questions |
| Avant 2026 | 2 passages par an | Concordant | https://ast.training-you.fr/2025/10/30/tage-mage-2026-quatre-sessions-par-an-une-revolution-pour-les-candidats-aux-concours-ast/ ; https://www.prepacampus.fr/blog/calendrier-des-sessions-tage-mage-2025-amp-2026 |
| Validité du score | 2 ans **civils** (année N et N+1) ; les scores antérieurs au 01/01/2025 ne sont plus valables | Officiel | https://www.tagemage.fr/page/foire-aux-questions |
| Score transmis | meilleur score valide | Concordant | Prepaya ; Aurlom |
| Tarif (France métropolitaine) | 76 € | Concordant | Prepaya |

### 2.5 Difficulté croissante

**Incertain** : aucune source officielle consultée n'affirme que les questions sont classées par
difficulté croissante au sein de chaque sous-test. C'est une croyance répandue en préparation, que ni
l'officiel ni les sources consultées ne confirment explicitement. **Choix de conception (à votre demande)** :
dans les examens blancs, les 15 questions de chaque sous-test sont triées par difficulté croissante (1 → 5).
Cela reste un bon entraînement à la gestion du temps : sécuriser le début, ne pas s'enliser à la fin.

---

## 3. Ressources d'entraînement gratuites et légales (pour le style, jamais copiées)

| Ressource | Usage | Lien |
|---|---|---|
| ETS – présentation officielle du L&R et ressources de préparation | Types de parties, consignes | https://www.ets.org/toeic/about/listening-reading.html |
| ETS Global – évolutions 2018 | Nouveaux types de questions | https://www.etsglobal.org/fr/fr/help-center/les-questions-les-plus-consultees/quelles-sont-les-evolutions-du-test-toeic-listening |
| IIBC – tableau des parties avec exemples | Format de chaque partie | https://www.iibc-global.org/english/toeic/test/lr/about/format.html |
| Manuel du candidat TOEIC (exemples de questions officiels) | Style des items | https://www.fr.ets.org/content/dam/ets-org/pdfs/toeic/toeic-listening-reading-test-examinee-handbook.pdf |
| tagemage.fr – descriptif des sous-tests, annales et cahier d'exercices officiels | Contenu de chaque sous-test | https://www.tagemage.fr/page/sous-tests ; https://www.tagemage.fr/page/annales-papier |
| Test d'entraînement corrigé (Ecricome, 2021, ancien barème) | Style, niveau | https://www.ecricome.org/wp-content/uploads/2021/01/TEST-D_ENTRAINEMENT-CORRIGE%CC%81-TAGE-MAGE.pdf |
| Fiches méthode Groupe Réussite (conditions minimales, compréhension) | Pièges classiques | https://groupe-reussite.fr/ressources/cours-en-ligne-conditions-minimales/ |

**Engagement** : aucune question de la banque n'est copiée ni adaptée de près d'une de ces sources. Toutes
les questions sont des créations originales. Les ressources ont servi uniquement à calibrer les formats,
les thèmes récurrents et les types de pièges.

## 4. Thèmes récurrents retenus pour le programme

- **TOEIC** : bureau et réunions, ressources humaines et recrutement, voyages d'affaires, restauration et
  hôtellerie, achats et commandes, finances et budget, production et maintenance, marketing et ventes,
  immobilier et locaux, santé, événements d'entreprise. Grammaire de la Partie 5 : classes de mots,
  temps et voix, accords, prépositions, connecteurs, pronoms, relatives, comparatifs, collocations.
- **TAGE MAGE** : pourcentages, proportionnalité, vitesses, fractions, puissances et racines,
  équations et systèmes, géométrie plane (aires, Pythagore, Thalès), dénombrement et probabilités simples,
  âges et mélanges ; syllogismes, hypothèses implicites, renforcement et affaiblissement d'un argument ;
  accords, homophones, concordance des temps, sens des mots ; suites numériques et littérales, dominos, intrus.
