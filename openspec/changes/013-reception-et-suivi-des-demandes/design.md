## Context

Voir `proposal.md` — Why. L'état de départ, relevé dans le dépôt le 2026-10-17 :

- **La route d'envoi ne garde rien.** `src/pages/api/public/demandes.ts` compte la sollicitation
  (`compterEtJuger`, ADR-0028), contrôle l'origine, le format et la taille, vérifie la demande contre la
  déclaration empaquetée (`verifierSaisie`, `verifierDemande`, `totalAnnonceAccorde`), lit l'adresse
  autorisée, compose l'e-mail (`composerCourriel`, `src/core/formulaires/courriel.ts`) et l'expédie en
  l'attendant ; un refus de la plateforme rend 503 `acheminement`, une adresse autorisée absente aussi.
  La spec vivante `demande-de-devis` exige « rien de la demande n'est conservé ».
- **Aucune table des demandes.** Douze migrations, aucune ne porte de demande. ADR-0019 a pourtant
  décidé que D1 porte « les brouillons, l'état publié et les demandes », sans copie : la liste et la suite
  ne survivent pas à la base, l'e-mail seul survit.
- **La rubrique « Demandes » existe sans écran.** `src/admin/MenuRubriques.astro` la pose avec
  `href: null` ; `IdRubriqueServie` ne la connaît pas ; trois tests d'intégration la listent parmi les
  rubriques, et `tests/integration/cadre-avec-l-ecran.test.ts` la fige dans `RUBRIQUES_SANS_ECRAN`.
- **Le patron des écrans d'administration** : une page Astro derrière `verifierSession` (ADR-0007, I6)
  rend une présentation statique complète, puis un îlot Svelte 5 monté par `src/admin/ilots-svelte-5/
  monter.ts` depuis un composant `Montage*.astro` (aucune directive `client:*`, I4, ADR-0006) la remplace
  et écrit par `fetch` vers des routes `POST` même origine, garde de session en tête, corps JSON borné
  par `lireCorpsJsonBorne` (ADR-0011 pour l'anti-forgerie). Les textes vus par l'éditrice vivent dans
  `src/admin/textes.ts`. Le registre shadcn-svelte copié porte `dialog`, `button`, `badge`, `card`,
  `alert` — ni case à cocher ni liste déroulante.
- **Aucune date n'est encore affichée** dans l'administration : le produit n'a pas de fuseau horaire.
- **Les tests provoquent une panne de la base** par des déclencheurs `raise(abort)` posés sur une table
  (`tests/integration/panne-du-compteur.test.ts`), et une panne d'acheminement par un espion sur la
  liaison `EXPEDITEUR_CODE_CONNEXION` qui lève une erreur.

## Goals / Non-Goals

**Goals :**
- Une demande acceptée est gardée avant son e-mail ; la confirmation du visiteur suit la règle « gardée
  ou acheminée » des specs.
- Ce qu'une demande retirée garde est minimal et **tenu par la base elle-même** : une ligne retirée ne
  peut pas porter une donnée du visiteur.
- La logique — composition du détail gardé, coordonnée de réponse, nombres, règles de la suite et du
  retrait — vit en `core/`, testable sans plateforme (C5, I2).
- Deux écrans sur le patron existant, sans dépendance nouvelle.

**Non-Goals :**
- Refondre la composition de l'e-mail : `composerCourriel` reste tel quel, ses tests du change 012 aussi.
- Renommer la liaison `EXPEDITEUR_CODE_CONNEXION` (dette nommée par 012).
- Un fuseau horaire réglable par instance.
- DAT-1 (cadrage juridique) et le reste de DAT-2.

## Decisions

### D1 — Une table `demandes`, dont la base refuse qu'une ligne retirée garde une donnée du visiteur → **ADR-0030**

Migration `0013_demandes.sql`, additive :

| Colonne | Présente | Retirée (ordinaire) |
|---|---|---|
| `id` — texte tiré au hasard (`crypto.randomUUID`) | ✓ | ✓ |
| `formulaire_id`, `formulaire_nom` | ✓ | ✓ |
| `suite` — `a-renseigner` \| `sans-suite` \| `devis-envoye` \| `commande` | ✓ | ✓ |
| `etat` — `presente` \| `retiree` | `presente` | `retiree` |
| `recue_le` (millisecondes), `page_titre`, `total` (centimes, nul sans prix), `contact`, `detail` (JSON), `courriel` — `parti` \| `non-parti` | ✓ | **nuls** |

Une contrainte `check` impose qu'une ligne `retiree` porte des nuls dans toutes les colonnes du visiteur :
le code qui retire ne peut pas oublier un champ. Une contrainte posée sur la table ne protège pas une
colonne ajoutée plus tard par `alter table … add column` (essai SQLite du 2026-10-17, ADR-0030) : une
colonne nouvelle s'ajoute donc avec sa propre clause `check (etat = 'presente' or <colonne> is null)`,
sans reconstruire la table. Un test d'intégration lit les colonnes de la table par `PRAGMA table_info` et
vérifie que chacune, hors la liste fermée des cinq gardées (`id`, `formulaire_id`, `formulaire_nom`,
`suite`, `etat`), est refusée non nulle sur une ligne `retiree` : une colonne ajoutée sans sa clause le fait
échouer. Un retrait indésirable **supprime** la ligne. Un index
`(etat, recue_le desc)` sert la liste ; les nombres se lisent par un `group by formulaire_id`.

L'identifiant tiré au hasard sert l'adresse du détail (`/admin/demandes/<id>`) : il ne dit ni l'ordre ni le
nombre des demandes.

Pourquoi une ligne-témoin plutôt que des compteurs à part : les nombres restent une lecture de l'état, sans
second registre à tenir d'accord (une commande retirée se compte par sa suite, gardée sur la ligne) ; la
somme des ventilations égale le site par construction. Alternative écartée : des compteurs incrémentés au
retrait — deux écritures à garder cohérentes, et un écart impossible à réparer après coup.

La décision — ce qu'un retrait ordinaire garde (formulaire et suite), ce qu'un retrait indésirable efface
(tout), et l'absence de tout effacement d'office — est durable et touche aux données personnelles :
elle est figée par ADR-0030, qui complète ADR-0019 sans le contredire. ADR-0030 crée aussi `I17` : aucun
fichier de `src/` ni de `migrations/` ne contient `ignore_check_constraints`, le réglage de D1 qui
couperait la vérification de la contrainte.

### D2 — Le détail gardé : une composition pure, figée à la réception

`src/core/demandes/detail.ts` (pur) compose, depuis le formulaire déclaré et les valeurs vérifiées, un
`DetailDemande` : une suite de lignes étiquetées — `{ etiquette, options: [{ libelle, prix? }] }` pour un
champ à choix renseigné, `{ etiquette, valeur }` pour une coordonnée ou un texte d'une ligne,
`{ etiquette, lignes: [...] }` pour un texte long —, dans l'ordre des champs déclarés, les champs
facultatifs vides omis. Libellés et prix sont **copiés** depuis la déclaration empaquetée au moment de
l'envoi, celle contre laquelle la demande vient d'être vérifiée : une publication ultérieure ne touche pas
une demande gardée. Le JSON est lu au retour par une fonction de `core/` qui écarte toute forme inattendue
(une ligne corrompue s'affiche comme vide, jamais comme une erreur).

`contactDeReponse(formulaire, valeurs)` (même module) rend la valeur du premier champ `email` renseigné, à
défaut du premier `telephone` : c'est la coordonnée de la ligne de liste. Un formulaire posé sur une page
en a toujours une obligatoire (spec `site-public` : la reconstruction est refusée sinon).

`composerCourriel` n'est pas réécrit sur `DetailDemande` : il est testé ligne à ligne par 012, et les deux
compositions servent deux supports aux règles différentes (une ligne d'e-mail neutralise ses retours à la
ligne ; l'écran les garde). Le doublon de parcours des champs est assumé ; si l'analyse de duplication le
relève, le ticket extrait le parcours commun sans changer la sortie de l'e-mail.

### D3 — La route d'envoi garde, puis achemine, puis confirme

Après la vérification (étapes 1 à 4 du change 012, inchangées) :

5. **garder** : `garderDemande(db, demande, maintenant)` (`src/platform/demandes/magasin.ts`) insère la
   ligne avec `courriel = 'non-parti'` ; une erreur de la base est attrapée, consignée sans aucune donnée
   du visiteur (`[demande] garde refusée`), et la route continue ;
6. **lire l'adresse autorisée** ; absente ou illisible → pas d'e-mail ;
7. **acheminer** (inchangé) ; un refus de la plateforme est consigné comme aujourd'hui ;
8. **marquer** : e-mail parti et demande gardée → `courriel = 'parti'` ; une erreur ici est consignée et
   laisse la mention pessimiste ;
9. **répondre** : gardée **ou** partie → 200 `envoyee` ; ni l'une ni l'autre → 503 `acheminement`, que le
   module du visiteur présente déjà comme un échec à réessayer.

Garder avant d'acheminer tient FR-066 même si le Worker s'interrompt pendant l'envoi. La mention
pessimiste (`non-parti` jusqu'à preuve du contraire) préfère une fausse alerte — l'éditrice vérifie sa
boîte — à une demande dont l'e-mail manque sans le dire. Une sollicitation acceptée coûte deux écritures
de plus que dans 012 (insertion, marque), dans le quota du palier gratuit.

### D4 — L'`Écran : Demandes` : présentation statique, îlot pour les gestes

`src/pages/admin/demandes.astro`, derrière la garde, lit `?formulaire=<id>` (ignoré s'il ne désigne aucun
formulaire de demande présente) et `?page=<n>` (borné à la dernière page), puis rend dans le cadre
(`rubrique="demandes"`) :
- **les nombres** du site et de chaque formulaire (D6), en haut, indépendants du filtre et de la page ;
- **le filtre** — un lien par formulaire de demande présente, plus « Tous » ; le nom affiché est celui de
  la déclaration quand le formulaire est encore déclaré, sinon le nom gardé sur sa demande la plus récente
  (`nomDuFormulaire`, `src/core/demandes/liste.ts`) ;
- **la liste** — 50 lignes au plus, `order by recue_le desc, rowid desc` ; chaque ligne : date et heure,
  formulaire (sous le même nom que dans le filtre ; `formulaire_nom`, le nom gardé à l'envoi, n'est que le
  repli et ne change jamais en base), page, coordonnée de réponse, total, suite, mention d'e-mail, lien vers
  le détail ;
- **la pagination** — « Demandes plus récentes » / « Demandes plus anciennes », liens qui gardent le filtre.

L'îlot `EcranDemandes.svelte` monte sur la liste (présentation statique vidée au montage, données en
attribut `data-*` échappé par Astro) et y ajoute : une case à cocher par ligne et « tout sélectionner sur
cette page », une liste déroulante de suite par ligne (D7), et la barre de retrait (D8). Contrôles natifs
(`<input type="checkbox">`, `<select>`) stylés par les tokens ; le dialogue de confirmation reprend le
composant `dialog` déjà copié. Aucun composant nouveau du registre.

Dates : formatées par `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long',
timeStyle: 'short' })`, le fuseau étant une constante de `src/core/demandes/` (voir Risks).

### D5 — L'`Écran : Demande`

`src/pages/admin/demandes/[id].astro`, derrière la garde : une demande présente se rend en entier (D2), un
texte long ligne par ligne (une ligne de texte par élément, jamais de HTML composé, I5) ; une demande
retirée ou inconnue rend 404 avec le texte « Cette demande n'est plus dans la liste » et le lien de retour,
sans lire autre chose que son existence. Le formulaire s'y nomme comme dans la liste (D4) : la
déclaration d'abord, sinon le nom gardé sur la demande présente la plus récente de ce formulaire
(`nomDuFormulaire`). L'îlot `EcranDemande.svelte` y porte la liste déroulante de suite
et le geste « Retirer cette demande » (même dialogue que D8, sélection d'une seule demande) ; après un
retrait, l'écran mène à la liste.

### D6 — Les nombres : une lecture groupée, une composition pure

`compterParFormulaire(db)` rend, par `formulaire_id`, `presentes`, `commandes` (suite `commande`, toutes
lignes) et `retirees` (état `retiree`) ; les lignes supprimées par un retrait indésirable n'existent plus.
`src/core/demandes/nombres.ts` (pur) somme le site, résout les noms (déclaration d'abord), trie les
formulaires par nom, et dit quand le nombre de retirées s'affiche (non nul). Une seule requête par écran.

### D7 — La suite : une écriture par choix

`POST /admin/demandes/<id>/suite`, corps `{ suite }` : garde de session, corps borné, valeur parmi les trois
suites (`core/`, `a-renseigner` refusée), mise à jour conditionnée à `etat = 'presente'` ; aucune ligne
touchée → 404 `introuvable`. Réponse `{ ok: true, nombres }` : l'îlot remet à jour les nombres sans
recharger. En échec, l'îlot rétablit la valeur précédente dans la liste déroulante et affiche le texte
d'échec.

### D8 — Le retrait : sélection, motif, confirmation, une écriture groupée

`POST /admin/demandes/retrait`, corps `{ ids, motif }` : garde de session, corps borné ; `ids` de 1 à 50
identifiants textuels distincts (une page au plus), `motif` `ordinaire` ou `indesirable` (règles en
`core/demandes/retrait.ts`, pur). L'écriture est **une** `db.batch` (transaction D1) :
- `ordinaire` : `update … set etat = 'retiree', recue_le = null, … where id in (…) and etat = 'presente'` ;
- `indesirable` : `delete … where id in (…) and etat = 'presente'`.
Tout ou rien : une erreur ne retire aucune demande (500 rendu comme un échec à l'écran). Une demande déjà
retirée par un autre écran entre-temps est laissée telle quelle — jamais comptée deux fois. Réponse
`{ ok: true }` ; l'écran se recharge sur le même filtre, à la même page bornée, pour relire liste et
nombres.

Le dialogue dit, avant toute écriture, le nombre de demandes, l'effacement définitif de ce que leurs
visiteurs ont envoyé, que chaque demande reste dans la boîte e-mail si elle y est arrivée (texte exact :
`ux.md`), et, pour le motif indésirable, qu'elles ne compteront plus nulle part ; « Retirer » et
« Annuler », le focus d'ouverture sur « Annuler ».

### D9 — La rubrique « Demandes » devient servie

`MenuRubriques.astro` : `IdRubriqueServie` gagne `'demandes'`, son `href` devient `/admin/demandes`.
`tests/integration/cadre-avec-l-ecran.test.ts` fige aujourd'hui « Demandes » parmi les rubriques sans
écran : le ticket qui sert la rubrique déclare la retouche de ce test (dérogation relue par l'humain),
puisque la spec modifiée du cadre en change l'attendu.

### D10 — Les textes de l'éditrice

Dans `src/admin/textes.ts` : titre de l'écran, libellés des nombres (« demandes », « commandes »,
« retirées »), libellés des suites (« À renseigner », « Sans suite », « Devis envoyé », « Commande »),
mention d'e-mail (« L'e-mail de cette demande n'a pas pu partir. »), liste vide, filtre, pagination,
dialogue de retrait, motifs (« Retrait ordinaire », « Demande indésirable »), échecs d'enregistrement.
Aucun terme de développeur (FR-117) : ni « supprimer la ligne », ni « statut », ni « base ».

## Architecture

**Éléments touchés (FQN) :**
- `colibri-cms.worker.routes` — la route d'envoi `src/pages/api/public/demandes.ts` ; les écrans
  `src/pages/admin/demandes.astro`, `src/pages/admin/demandes/[id].astro` ; les écritures
  `src/pages/admin/demandes/[id]/suite.ts`, `src/pages/admin/demandes/retrait.ts` ;
- `colibri-cms.worker.admin` — `MenuRubriques.astro`, `textes.ts`, les îlots `EcranDemandes.svelte`,
  `EcranDemande.svelte`, leurs composants `Montage*.astro`, `ilots-svelte-5/monter.ts` ;
- `colibri-cms.worker.core` — `demandes/` (détail, coordonnée de réponse, nombres, suite, retrait, fuseau) ;
- `colibri-cms.worker.platform` — `demandes/magasin.ts` ;
- `colibri-cms.d1` — migration `0013_demandes.sql` ; sa description dans `model.c4` gagne « les demandes
  de devis et leur suite » ;
- acteurs `visiteur`, `editrice`.

**Relations ajoutées / retirées :** aucune relation de modèle nouvelle — `routes → core`,
`routes → platform`, `admin → core`, `platform → core` et `platform → d1` existent. Deux retouches de
vues dans `flows.c4`, faites par les tickets qui posent le code, puis
`likec4 validate --no-layout --json --project colibri-cms docs/architecture` :
- `flow-demande` (ticket de la garde à réception) : un pas `colibri-cms.worker.platform -> colibri-cms.d1
  'garde la demande'` avant l'acheminement ; la description cesse de dire « Rien n'est conservé en base » ;
- une vue dynamique `flow-suivi-demandes` (ticket du retrait) : `editrice -> colibri-cms.worker.routes
  'GET /admin/demandes'`, `colibri-cms.worker.platform -> colibri-cms.d1 'lit les demandes et leurs
  nombres'`, `editrice -> colibri-cms.worker.admin 'choisit une suite, retire'`,
  `colibri-cms.worker.admin -> colibri-cms.worker.routes 'POST /admin/demandes/…'`,
  `colibri-cms.worker.platform -> colibri-cms.d1 'enregistre la suite, efface au retrait'`.

**Invariants vérifiés** : I1 (aucune arête nouvelle), I2 (`core/demandes/` sans framework ni plateforme),
I4 (îlots montés par `monter.ts`), I5 (aucun HTML composé : le texte long se rend ligne à ligne), I6 (les
quatre routes d'administration importent le garde ; la route publique ne lit toujours aucun `multipart`),
I11–I13 (en-têtes et cookie inchangés), I14 (couleurs par tokens seulement), I17 (ni la migration ni le
magasin ne coupent la vérification des contraintes).

**ADR contraignants** : ADR-0030 (ce qu'une demande retirée garde, tenu par la base ; aucun effacement
d'office), ADR-0019 (D1 porte les demandes), ADR-0002 (e-mail inchangé), ADR-0007 (garde), ADR-0011
(anti-forgerie par le cookie), ADR-0028 (le comptage reste en tête), ADR-0009 (registre shadcn-svelte),
ADR-0006 (aucune directive `client:*`), ADR-0014 (tests dans `workerd`).

## Risks / Trade-offs

- [La base garde désormais des données personnelles de visiteurs, sans durée] → c'est l'arrêt du cahier
  des charges (aucun effacement d'office, effacement praticable) ; DAT-1 reste ouvert et doit être cadré
  avant la première mise en ligne — le security-review le porte.
- [L'historique restaurable de D1 (Time Travel, 7 jours) garde un contenu effacé par un retrait] → résidu
  borné, déjà assumé pour le compteur (012) ; consigné dans ADR-0030 et le security-review.
- [Une session volée lit toutes les demandes et peut les retirer] → même garde que tout geste de
  l'éditrice (SEC-8) ; chaque demande existe aussi dans la boîte e-mail ; aucun export n'élargit la fuite.
- [Le fuseau « Europe/Paris » est écrit dans le code] → vrai pour toute la flotte prévue ; le jour où une
  instance vit ailleurs, le fuseau passe dans `instance.json` (I8) par une décision séparée.
- [Spam massif sous le seuil] → 50 demandes par page et « tout sélectionner sur cette page » : quarante
  demandes indésirables se retirent en un geste ; au-delà, un geste par page.
- [La marque `non-parti` est fausse si sa mise à jour échoue après un e-mail parti] → fausse alerte
  assumée (D3), l'éditrice trouve l'e-mail dans sa boîte.
- [La garde échoue et l'e-mail part : la demande manque à la liste et aux nombres] → rare (la base vient de
  compter la sollicitation) ; la demande existe dans la boîte ; consigné sans donnée du visiteur.
- [Le quota d'écritures D1 du palier gratuit] → deux écritures de plus par demande acceptée, bornées par le
  seuil de cinq demandes par heure et par origine.
- [Retoucher un test qui fige la rubrique sans écran] → dérogation déclarée au ticket de D9, jamais réécrit
  en silence.

## Migration Plan

- `0013_demandes.sql` est additive (une table, un index). Elle s'applique par
  `wrangler d1 migrations apply` en local et sur la recette ; la recette se rebâtit par son dépôt
  (`sebc-dev/colibri_recette`). Retour arrière : la table se supprime, au prix des demandes gardées depuis
  — leurs e-mails restent dans la boîte.
- Le cahier de recette (`docs/cahier-de-test.md`) gagne les cas de la liste, de la suite, du retrait et des
  nombres ; le site factice n'a rien à changer (les formulaires y sont déjà posés).
