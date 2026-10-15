## Context

Voir `proposal.md` — Why. L'état de départ, relevé dans le dépôt le 2026-10-15 :

- **Les formulaires existent, sans page pour les porter.** `content/formulaires/devis-gateau/` et
  `devis-atelier/` sont déclarés (ADR-0018) et lus par `src/core/formulaires/declaration.ts` ; leurs
  options courantes se calculent par `optionsCourantes` (`src/core/formulaires/brouillon.ts`), la même
  fonction que la publication emploie pour déposer `formulaire.json` (ADR-0026). Aucun `page.json` ne
  désigne de formulaire, et `NatureEmplacement` ne connaît que six natures.
- **Le site public est sans script et refuse tout envoi.** `public/_headers` pose
  `default-src 'none'` sans `script-src` ni `connect-src`, et `form-action 'none'`. Les pages publiques
  sont bâties à la reconstruction (`src/pages/[...slug].astro`, `prerender = true`) par le gabarit
  `src/site/page.astro`, seul importateur du baril `src/render/index.ts` (I3, ADR-0024), qui sert aussi
  la route d'aperçu.
- **La composition d'une page est une fonction pure** : `composerPage` (`src/core/rendu/page.ts`)
  assemble emplacements, navigation et pied de page ; elle lève déjà une erreur nommée quand une page pose
  une image absente des images publiées — c'est ce qui fait échouer la reconstruction (site-public).
- **L'expédition d'e-mail existe** pour le code de connexion : `src/platform/email/index.ts`, liaison
  `send_email` `EXPEDITEUR_CODE_CONNEXION` vers la destination vérifiée, adresse d'expéditeur
  `senderAddress` d'`instance.json` injectée au build (`__ADRESSE_EXPEDITEUR__`). La forme inerte et
  étiquetée est décidée (ADR-0002).
- **Aucun compteur par origine n'existe.** Le plafond de la connexion (cinq codes par heure, FR-006)
  compte des codes écrits en D1, pas des origines. Les invariants `I6` (surface publique sous
  `src/pages/api/public/`, sans garde de session, sans corps `multipart`) et `I7` (objet de fréquence
  nommé par une constante) attendent leur porteur.
- **Deux candidats d'ADR cadrent la story sans la figer** : `anti-abus-turnstile-et-compteur-a-
  empreintes-de-fenetre` (Turnstile devant un compteur dans un Durable Object) et `ilots-svelte-5`
  (îlots Svelte sur le site public comme dans l'administration). L'arbitrage humain du 2026-10-15 a écarté
  Turnstile.

## Goals / Non-Goals

**Goals :**
- Un seul lieu de rendu du formulaire, atteint par la page publique et par l'aperçu (ARCH-3, I3).
- Une page publique toujours complète à la reconstruction ; le script n'ajoute que le total et l'envoi.
- Une seule route serveur pour le visiteur, qui ne croit rien de ce que la demande annonce (ADR-0018).
- Un compteur par origine qui ne retient aucune adresse IP et ne vit qu'une fenêtre (DAT-3), sans
  nouvelle liaison de plateforme.
- La logique — vérification d'une demande, total, composition de l'e-mail, règles du seuil — en
  `core/`, testable sans plateforme (C5).

**Non-Goals :**
- Enregistrer la demande, la lister, la suivre (FR-065 → FR-079) ; Turnstile ; DAT-1, DAT-2.
- Un envoi sans script (formulaire HTML natif) : sans script, le formulaire s'affiche sans total ni envoi.
- Renommer la liaison `EXPEDITEUR_CODE_CONNEXION`.

## Decisions

### D1 — Le formulaire se pose par un emplacement qui le désigne → **ADR nouveau**

`page.json` admet `{ "id", "nature": "formulaire", "rang", "formulaire": "<id du formulaire>", "nom"? }`.
`src/core/pages/declaration.ts` lit cette septième nature ; une entrée sans `formulaire` textuel est
écartée comme toute entrée mal formée. L'emplacement n'a **aucun contenu éditable** : le noyau de
correction le refuse comme une correction de structure (FR-025), l'éditeur de la page le présente par le
nom du formulaire désigné avec un lien vers `/admin/formulaires/<id>`, et le plan de dépôt
(`src/core/publication/plan.ts`, `versJson`) le recopie tel que déclaré.

Alternatives écartées : un champ `formulaires` à la racine de `page.json` (perd le rang parmi les
emplacements) ; le formulaire décrit dans la page (écarté par ADR-0018 — un formulaire peut être posé sur
plusieurs pages) ; une pose dans le gabarit (du code propre à chaque site, contre ARCH-4). La décision
étend ADR-0012 et ADR-0018 : elle s'écrit en ADR (`/scd-spec-dev:adr`) **avant** le ticket qui pose la
nature.

Contenu de départ du dépôt produit : « Tarifs » pose `devis-gateau` au rang 3 (après son bandeau),
« Contact » le pose au rang 4 — un même formulaire sur deux pages, comme les specs l'exercent.

### D2 — La composition porte le formulaire, publié ou en brouillon

`composerPage` reçoit les formulaires déclarés et rend, pour un emplacement de formulaire, un
`FormulaireRendu` : nom, champs dans l'ordre, options courantes avec leur prix en centimes, marque
obligatoire, la mention d'information courante (déjà composée pour les réglages) et un mode d'envoi
(`actif` ou `desactive`). Deux sources, une seule fonction :
- **page publique** : la déclaration empaquetée (`content/formulaires/`, c'est-à-dire le contenu déposé
  par la dernière publication), mode `actif` ;
- **aperçu** : `optionsCourantes(declare, brouillon, publie)` — exactement ce que la publication
  déposera (ADR-0026) —, mode `desactive`.

Un emplacement qui désigne un formulaire absent, ou un formulaire sans champ `email` ni `telephone`
obligatoire, lève une erreur nommée (page + formulaire), sur le patron de l'image manquante : la
reconstruction échoue, le site en service reste tel qu'il était.

### D3 — Un document complet, amélioré par un module sans framework → **promotion amendée de `ilots-svelte-5`**

`src/render/Formulaire.astro` (exporté par le baril, I3) dessine **tout** le formulaire en HTML statique :
champs, options et prix, les deux mentions (la mention d'information par le rendu du texte riche, seul
lieu du HTML brut, I5), la zone du total et le bouton d'envoi — ces deux derniers inactifs dans le
document —, les textes des états (envoi en cours, confirmation, échecs) en éléments masqués, et un
`<noscript>` qui renvoie aux coordonnées du pied de page. Un module TypeScript, déclaré par un
`<script>` du composant, est empaqueté par Astro en fichier externe (`build.assetsInlineLimit` exclut déjà
tout `.js` de la mise en ligne) : il active le total et le bouton, calcule le total par la fonction pure
de `core/` (D5), vérifie les champs avant l'envoi, envoie par `fetch` et bascule les états. Les données
dont il a besoin (prix en centimes, natures, obligations) voyagent en attributs `data-*` du document,
jamais en script écrit dans la page.

Pourquoi pas un îlot Svelte (candidat `ilots-svelte-5`) : l'hydratation par directive `client:*` écrit
du script dans la page, refusé par `script-src 'self'` ; un `hydrate()` manuel depuis un module externe
suppose que le rendu de build d'Astro porte les marques d'hydratation de Svelte et que les props se
sérialisent à l'identique — deux paris pour un écran de dix champs ; et un `mount()` qui remplace le
HTML statique dupliquerait le rendu (deux lieux, contre ARCH-3). Le module sans framework garde un seul
rendu, le plus petit poids sur la page que SC-005 mesurera, et aucune dépendance nouvelle. Le candidat se
promeut amendé : Svelte 5 pour l'administration ; le formulaire public est un document complet amélioré
par un module servi par le site.

Les textes destinés au visiteur vivent dans `src/render/formulaire/textes.ts` (zone `render`, importable
par le composant et par son module).

### D4 — La politique du site public s'ouvre au seul site

`public/_headers` ajoute `script-src 'self'` et `connect-src 'self'`, garde `default-src 'none'`,
`form-action 'none'` (aucun envoi natif) et `frame-ancestors 'none'`. Aucun hôte tiers, aucun
`'unsafe-inline'`. Astro (≥ 5) ne rend le `<script>` d'un composant que sur les pages qui rendent ce
composant : une page sans formulaire reste sans script — la spec site-public l'exige, le parcours le
mesure. L'aperçu est servi sous la politique de l'administration, qui admet déjà `script-src 'self'` et
`connect-src 'self'` (I12).

### D5 — Le total : des centimes entiers, une fonction pure partagée

`src/core/formulaires/total.ts` : `totalDeLaSelection(formulaire, selection) → centimes`, somme des prix
des options choisies dans les champs `avecPrix`. Le module du navigateur et la route d'envoi appellent la
même fonction ; l'affichage passe par `formaterPrix` (`src/core/formulaires/prix.ts`) suivi de « € »
(« 10,50 € », « 39 € »). Aucun flottant (ADR-0018).

### D6 — La route d'envoi, seule surface serveur du visiteur

`src/pages/api/public/demandes.ts`, `prerender = false`, `POST` seul. Ordre de traitement, du moins cher
au plus cher :
1. méthode `POST`, sinon 405 ;
2. **comptage** de l'origine sur la surface `demande` (D8) — toute sollicitation reçue compte, qu'elle
   aboutisse ou non (spec `seuil-par-origine`) ; au-delà du seuil, 429 ; puis en-tête `Origin` présent et
   égal à l'origine du site, sinon 403 ; `Content-Type: application/json`, sinon 415 — un corps
   `multipart` est refusé **sans être lu** (I6) ;
3. lecture bornée du corps (16 Kio), sinon 413 ; JSON `{ formulaire, page, valeurs, totalAffiche }` ;
4. `verifierDemande` (`src/core/formulaires/demande.ts`, pure) contre la **déclaration empaquetée** des
   formulaires et des pages — jamais contre D1 : le visiteur a vu une page bâtie depuis ces fichiers-là, et
   entre une publication et la reconstruction, D1 est en avance sur le site servi. Rend soit une demande
   vérifiée, soit un refus `champs` (400, la liste `{ champ, motif }`), soit un refus `formulaire-change`
   (409 : formulaire, page, champ ou option inconnus, ou total différent) ;
5. lecture de l'adresse autorisée (`src/platform/auth/magasin.ts`, nouvelle lecture) ; absente → 503 ;
6. composition de l'e-mail (D7) et expédition **attendue** — à l'inverse du code de connexion, le
   visiteur doit connaître l'issue ; un refus de la plateforme → 503 `acheminement`, consigné dans les
   journaux sans aucune donnée du visiteur ;
7. 200 `{ statut: "envoyee" }` — aucune valeur saisie dans la réponse, aucun cookie.

La route n'importe pas le garde de session et n'appelle jamais `request.formData()` (I6). Le contrôle
d'origine d'Astro ne vise que les corps de formulaire ; la route tient le sien.

### D7 — L'e-mail : inerte, étiqueté, sur la liaison existante

`src/core/formulaires/courriel.ts` (pure) compose `{ objet, texte }` : objet « Demande de devis — » + nom
du formulaire ; corps en lignes « Étiquette : valeur » — formulaire, page d'origine (son titre), chaque
champ à choix renseigné (options, et leur prix dans un champ avec prix), « Total indicatif : … €
(estimation non engageante) », puis chaque texte et coordonnée renseignés. Une valeur d'une ligne voit
ses retours à la ligne et caractères de contrôle remplacés par des espaces ; une valeur de texte long
garde ses lignes, chacune préfixée d'un retrait marqué (`  > `), pour qu'aucune ne commence comme une
ligne du produit (SEC-7). `src/platform/email/index.ts` gagne `demanderAcheminementDeLaDemande`, qui
remet `{ from, to, subject, text }` à la **même liaison** `EXPEDITEUR_CODE_CONNEXION` : sa destination
vérifiée est l'adresse autorisée, celle que FR-063 vise. Aucune liaison ni configuration nouvelle — le
nom de la liaison, propre au code, devient inexact ; le renommer touche la connexion et la recette, hors
périmètre.

### D8 — Le compteur en D1, à empreintes de fenêtre → **promotion amendée du candidat anti-abus**

Migration `0012_seuil_par_origine.sql` : une table `fenetre_seuil` (une seule ligne : début de la fenêtre,
clé de 32 octets) et une table `comptes_seuil` (`surface`, `empreinte`, `nombre`, clé primaire
`(surface, empreinte)`). La fenêtre est l'heure d'horloge en cours. `src/core/frequence/regles.ts`
(pur) porte les seuils (`demande` : 5, `connexion` : 20), la durée et le verdict ;
`src/platform/frequence/index.ts` porte `compterEtJuger(db, surface, origine, maintenant)` :
- au premier comptage d'une heure nouvelle, une seule écriture groupée (transaction D1) **efface toutes
  les empreintes et remplace la clé** par 32 octets tirés de `crypto.getRandomValues` ;
- l'empreinte est `HMAC-SHA-256(clé, adresse IP)` (WebCrypto), jamais l'adresse ;
- l'incrément est conditionné à la clé lue : si la fenêtre a basculé entre la lecture et l'écriture,
  rien n'est compté sous l'ancienne clé, et le comptage reprend une fois ;
- l'origine est l'en-tête `CF-Connecting-IP` ; absent (outillage local), une origine commune
  « inconnue » ;
- une erreur de la base refuse la sollicitation (la protection ne s'ouvre pas sur une panne).

Pourquoi pas le Durable Object du candidat : il exige un point d'entrée de Worker propre au produit pour
exporter sa classe, or `wrangler.astro.jsonc` documente que poser `main` détourne le build d'Astro de son
graphe de pages (mesuré) ; D1 est déjà lié, ses écritures sont sérialisées, et la propriété décisive —
clé et empreintes effacées ensemble, rien de dérivé d'une adresse au-delà de sa fenêtre — se tient à
l'identique. Une différence s'assume : sans sollicitation, les empreintes de la dernière fenêtre restent
jusqu'à la suivante — jamais plus d'une fenêtre, jamais une accumulation. Turnstile est retiré du
candidat (arbitrage du 2026-10-15). L'invariant candidat `I7` (`idFromName` d'une constante) perd son
objet : l'ADR le retire, avec le candidat `objet-de-frequence-nomme-par-une-constante`.

### D9 — La connexion compte ses soumissions

`src/pages/admin/connexion.astro` appelle `compterEtJuger(…, 'connexion', …)` en tête de **tout** `POST`,
avant de lire l'adresse ou le code. Au-delà du seuil : rien n'est écrit ni vérifié, la soumission
d'adresse attend quand même le délai plancher (`DELAI_PLANCHER_MS`), et l'écran affiche l'annonce du
seuil, un texte de `src/admin/textes.ts` identique pour toute adresse. Le plafond horaire de FR-006 est
inchangé et s'évalue après.

### D10 — L'aperçu dessine le formulaire, sans envoi

La route d'aperçu lit, pour chaque formulaire posé, son brouillon et son publié (magasins existants) et
passe à `composerPage` les options de `optionsCourantes`. Le mode `desactive` pose, dans le document, l'avis
d'envoi désactivé ; le module, qui lit ce mode, n'émet aucune requête. La route d'envoi ne connaît pas
l'aperçu : elle n'a pas à le reconnaître, puisque rien n'en part.

## Architecture

**Éléments touchés (FQN) :**
- `colibri-cms.worker.routes` — la route d'envoi `src/pages/api/public/demandes.ts` ; l'écran de connexion ;
  la route d'aperçu ;
- `colibri-cms.worker.render` — le formulaire dessiné, son module, ses textes ;
- `colibri-cms.worker.site` — le gabarit dessine la nouvelle nature ;
- `colibri-cms.worker.core` — `formulaires/` (total, vérification d'une demande, e-mail), `frequence/`,
  `pages/declaration.ts`, `rendu/page.ts`, `publication/plan.ts` ;
- `colibri-cms.worker.platform` — `frequence/`, `email/`, `auth/magasin.ts` ;
- `colibri-cms.worker.admin` — l'éditeur d'une page, les textes de la connexion ;
- `colibri-cms.d1` — migration du compteur ;
- `colibri-cms.contenu` — `page.json` de « Tarifs » et « Contact » ;
- systèmes externes `email-routing` ; acteurs `visiteur`, `editrice`.

**Relations ajoutées** (chacune écrite dans le `.c4` par le ticket qui pose le code, puis
`likec4 validate --no-layout --json --project colibri-cms docs/architecture`) :
- `visiteur -> colibri-cms.worker.routes 'envoie une demande de devis'` — `context.c4`, ticket de la route
  d'envoi ;
- `colibri-cms.worker.platform -[sync]-> email-routing 'achemine une demande de devis'` et
  `email-routing -[async]-> editrice 'remet la demande'` — `context.c4`, ticket de l'acheminement ; la
  description d'`email-routing` cesse de ne parler que du code ;
- une vue dynamique `flow-demande` dans `flows.c4` (visiteur → routes → core → platform → d1, puis
  platform → email-routing → éditrice), même ticket.
Aucune arête nouvelle entre zones du Worker : `routes → platform`, `routes → core`, `render → core`,
`site → render`, `platform → d1` et `platform → core` existent déjà.

**Invariants vérifiés** : I1/I2 (logique en `core/`, sans plateforme) ; I3 (le formulaire passe par le
baril, le gabarit reste l'unique importateur) ; I5 (la mention passe par `render/markdown/`) ; I6 (route
sous `api/public/`, sans garde, sans `multipart`) ; I8/I10 (aucune valeur d'instance nouvelle) ; I12
(politique de l'administration inchangée). `I7` est retiré par l'ADR de D8.

**ADR à écrire avant les tickets qu'ils couvrent** (`/scd-spec-dev:adr`) :
1. **nouveau** — la pose d'un formulaire sur une page par un emplacement qui le désigne (D1) ;
2. **promotion amendée** de `anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre` — compteur en D1,
   sans Turnstile ; retire `I7` et le candidat `objet-de-frequence-nomme-par-une-constante` (D8) ;
3. **promotion amendée** de `ilots-svelte-5` — Svelte 5 pour l'administration, formulaire public en
   document complet amélioré par un module servi par le site (D3).

## Risks / Trade-offs

- [Un robot qui change d'adresse IP passe le seuil et remplit la boîte de l'éditrice] → assumé par
  l'arbitrage du 2026-10-15 ; l'e-mail reste inerte (SEC-7) ; Turnstile se rouvre par une décision séparée
  si le spam paraît en production.
- [Un e-mail en échec perd la demande jusqu'à la story « Réception et suivi »] → le visiteur en est averti
  et garde sa saisie ; la story suivante enregistre d'abord (FR-066) et changera ce comportement.
- [Les prix changent entre l'ouverture de la page et l'envoi] → refus `formulaire-change`, invitation à
  recharger, saisie gardée : le total acheminé est toujours celui que le visiteur a vu.
- [Le script d'un composant paraît sur une page qui ne le rend pas] → la spec exige l'absence de script
  sans formulaire ; un parcours la mesure, et la garde des parcours (`tests/parcours/garde-politique.ts`)
  fait échouer toute violation de la politique.
- [Le quota d'écritures D1 du palier gratuit, sous attaque] → une sollicitation coûte une ou deux écritures
  de ligne ; un quota épuisé refuse les sollicitations (fermé sur panne), ce qui protège la boîte de
  l'éditrice au prix des demandes légitimes pendant la panne.
- [Les empreintes de la dernière fenêtre restent tant qu'aucune sollicitation ne vient] → jamais plus d'une
  fenêtre ; assumé dans l'ADR de D8.
- [Poser le formulaire sur « Tarifs » et « Contact » peut casser un test existant qui fige leur structure]
  → le ticket de la pose joue d'abord la suite avec le contenu modifié ; un test existant qui fige la
  structure exacte d'une de ces pages se déclare au ticket (dérogation relue par l'humain), jamais réécrit
  en silence.
- [La liaison `EXPEDITEUR_CODE_CONNEXION` porte un nom devenu inexact] → dette nommée, renommage hors
  périmètre.

## Migration Plan

- La migration `0012_seuil_par_origine.sql` est additive (deux tables neuves) ; elle s'applique par
  `wrangler d1 migrations apply` sur la recette comme en local. Retour arrière : les tables se suppriment
  sans perte — elles ne portent que l'heure en cours.
- `public/_headers` et `content/pages/*/page.json` partent avec le code ; la recette (Workers Builds,
  `sebc-dev/colibri_recette`) les reçoit par son dépôt. Le site factice de la recette pose les
  formulaires sur ses pages (skill `site-factice`), et l'e-mail d'une demande se reçoit sur la boîte de
  recette.
