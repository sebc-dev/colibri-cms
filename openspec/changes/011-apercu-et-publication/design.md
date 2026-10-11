## Context

État constaté dans le code (motivation : voir proposal.md — Why) :

- **Aucune page publique.** `src/pages/` ne porte que `admin/` ; `astro.config.ts` est en `output:
  'server'` et toute adresse hors `/admin/` tombe dans le 404 par défaut d'Astro. `src/render/` et
  `src/site/` ne contiennent que leur `zone.ts`. Aucun fichier `_headers` n'est versionné
  (`docs/security.md` : « il naîtra avec la publication ») ; l'adaptateur `@astrojs/cloudflare` en
  écrit déjà un dans `dist/client/` pour le seul `Cache-Control` de `/_astro/*`, et fusionne celui
  qu'on lui donne (`node_modules/@astrojs/cloudflare/dist/index.js`, `astro:build:done`). Le
  `wrangler.json` généré ne pose aucun `run_worker_first` : les fichiers statiques passent avant le
  Worker.
- **L'état publié n'a aucune représentation.** Les écrans superposent le brouillon D1 à la
  déclaration empaquetée au build (`import.meta.glob` dans `src/platform/contenu/{pages,reglages,
  formulaires}.ts`) : `appliquerBrouillonSurEmplacement` (`src/core/pages/brouillon.ts`),
  `coordonneesCourantes` (`src/core/reglages/coordonnees.ts`), `optionsCourantes`
  (`src/core/formulaires/brouillon.ts`). La bibliothèque passe `REFERENCES_PUBLIEES_VIDE` à
  `imageEffacable` (`src/platform/medias/magasin.ts:58`).
- **Les images n'existent qu'en brouillon.** Table `medias_brouillon` (migrations 0005, 0006), octets
  en `BLOB`, servis sous garde par `src/pages/admin/medias/[id]/octets.ts`. Le contenu de départ pose
  pourtant `media-fixture-hero` (Accueil, Tarifs) et `media-fixture-equipe` (Contact), qu'aucun fichier
  ne porte.
- **Le texte riche** est stocké en Markdown restreint ; `analyserMarkdownRestreint`
  (`src/core/pages/texte-riche.ts`) le rend en arbre de nœuds (paragraphe, titre, liste ; gras,
  italique, lien), et `lienDeTexteRicheAutorise` tient la liste blanche des liens.
- **La politique de l'administration** (`src/platform/entetes/middleware.ts`) part de `default-src
  'none'` : aucun `frame-src` — un lecteur vidéo intégré serait bloqué dans l'aperçu.
- **Les tests** tournent dans `workerd` (ADR-0014) sur l'artefact bâti par `npm run build`
  (`scripts/preparer-worker-de-test.mjs`) ; aucun moyen d'intercepter un `fetch` sortant n'est câblé
  (`@cloudflare/vitest-plugin` 1.x n'exporte pas de `fetchMock`, et `vitest.config.ts` est protégé).
- **La recette** (`.claude/skills/recette/`) se déploie depuis le poste par `wrangler` ; aucun dépôt
  GitHub ne porte le site de recette ; aucune reconstruction automatique n'est branchée.

Contraintes : I1 à I15 (`docs/architecture.md`), ADR-0004 (deux porteurs d'en-têtes), ADR-0005 (quatre
lieux de configuration), ADR-0006/0008/0010/0011 (administration), ADR-0012/0017/0018 (déclarations au
format déposé), ADR-0014 (tests en `workerd`) ; palier gratuit : 50 sous-requêtes externes par requête,
128 Mo de mémoire, 2 Mo par ligne D1.

## Goals / Non-Goals

**Goals :**
- Un seul lieu de rendu des emplacements, atteint par la page publique bâtie et par l'aperçu (I3).
- Un état publié en D1 de même forme que les brouillons, superposé par les fonctions `core/` existantes,
  sans seconde règle de rattachement.
- Toute la décision de publication — récapitulatif, plan de dépôt, chemins autorisés, état de la mise en
  ligne — en logique pure de `core/`, la forge n'étant qu'un port que `platform/` fournit.
- Une publication rejouable de bout en bout : chaque étape reprend sans doublon après une interruption.
- Aucun secret d'Isometria, aucune adresse publique nouvelle, aucun script sur les pages publiques.

**Non-Goals :**
- Le dessin public d'un formulaire et l'envoi d'une demande ; la mention d'information sur le site
  (story « Composer et envoyer une demande de devis »).
- La rapidité mesurée (SC-005), un lecteur vidéo intégré et la question `frame-src` qu'ADR-0004 laisse
  ouverte, la mise en page fine du gabarit (story « Site public rapide et complet »).
- L'abandon d'un brouillon (story « Restauration »).
- Le Cron de maintien en vie de la clé, le déploiement d'une instance au nom du client, la procédure de
  reconstruction sans le CMS (Epic D) — le ticket de recette n'en monte que ce qui prouve SC-004.

## Decisions

### D1 — Huit candidats d'ADR promus, dont trois amendés, avant les tickets

Ce change est le premier à toucher le publié ; il dépend de décisions héritées du cycle 1.x, encore
candidates. Elles sont promues par `/scd-spec-dev:adr` **avant `/scd-spec-dev:tickets`**, pour que les
tickets les citent par numéro (le prochain numéro libre se lit par `ls docs/adr/` au moment de promouvoir).

| Candidat | Promotion | Ce que le change en tire |
|---|---|---|
| `rendu-partage-par-le-publie-et-l-apercu` | telle quelle | I3 devient opposable : `src/render/index.ts`, `src/site/page.astro`, `src/pages/[...slug].astro`, `src/pages/admin/apercu/[...slug].astro` |
| `format-du-contenu-un-repertoire-par-objet` | telle quelle, complétée de la fiche d'image `content/medias/<id>.json` (FR-108) | D6 |
| `magasin-d1-brouillons-etat-publie-et-demandes` | telle quelle | D2 |
| `prefixes-de-publication-en-constante-unique` | telle quelle | I9 devient opposable ; valeur de la constante en D6 |
| `brouillon-d-un-champ-a-choix-porte-toute-sa-liste` | telle quelle, ses cinq points tranchés (D7) | D7 |
| `medias-deux-magasins-un-par-etat` | **amendée** : les octets d'une image publiée restent en D1 jusqu'à ce que le site en service la porte (D4) | D4 |
| `forge-github-api-git-data-jeton-a-portee-fine` | **amendée** : la branche `media` est réécrite en un commit sans parent, calculé depuis D1 (dépôt et élagage ne font qu'un geste) ; le Cron de maintien en vie est renvoyé à l'Epic D | D8 |
| `serialisation-des-publications-et-constat-de-mise-en-ligne` | **amendée** : le constat compare une marque de publication déposée dans le contenu et empaquetée au build, sans adresse publique (D9) | D9, D10 |

`cible-de-deploiement-worker-unique-workers-builds` et `pipeline-d-images-variantes-au-build` sont
appliqués sans être promus ici : le premier relève de l'Epic D (son point bloquant — la branche `media`
atteinte par la reconstruction — est constaté par le ticket de recette), le second de SC-005.

### D2 — L'état publié vit en D1, de même forme que les brouillons, superposé deux fois

Trois tables nouvelles (migration `0009`, additive) recopient la forme des tables de brouillons :
`publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le)`,
`publies_reglages (reglage, contenu, publie_le)` (même contrainte `CHECK`),
`publies_formulaires (formulaire, contenu, publie_le)` — `contenu` ayant exactement la forme du
brouillon correspondant (`ContenuCorrige`, JSON du réglage, `{ champs, derniersNumeros }`).

La valeur courante d'un objet devient **déclaration ← publié ← brouillon**, en appliquant deux fois la
fonction de superposition existante : `appliquerBrouillonSurEmplacement(appliquer…(declaré, publié),
brouillon)`, idem pour les réglages ; pour les formulaires, `optionsCourantes` reçoit la liste publiée
comme repli avant la déclaration (même règle d'accord à `avecPrix` pour le publié que pour le
brouillon). La **structure** vient toujours de la déclaration : une ligne publiée orpheline est ignorée.

« Porte un brouillon » reste dérivé de la seule présence d'une ligne de brouillon. Après la
reconstruction, la déclaration empaquetée et l'état publié coïncident : la redondance est voulue, elle
ferme la fenêtre entre le dépôt et la mise en ligne (spec `publication`, « Le contenu publié remplace le
contenu de départ »).
Écartés : lire le publié dans la seule déclaration empaquetée (l'éditrice reverrait l'ancien contenu
pendant la reconstruction, et ses brouillons effacés sembleraient perdus) ; garder les brouillons
jusqu'au constat de mise en ligne (marque « publié mais pas encore en ligne » à porter sur chaque objet,
et la marque de brouillon resterait affichée après « Publier »).

### D3 — Le rendu partagé : données en entrée, aucun HTML brut

- `src/core/rendu/page.ts` (pur) compose une **page à rendre** depuis la déclaration, l'état publié, les
  brouillons voulus et les réglages courants : `{ titre, navigation: [{ titre, adresse, courante }],
  emplacements: EmplacementARendre[], pied: { coordonnees, reseaux } }`. Le texte riche y entre déjà
  analysé en arbre (`analyserMarkdownRestreint`) ; chaque lien y est revérifié par
  `lienDeTexteRicheAutorise`, chaque destination de bouton par `destinationBoutonAutorisee`, chaque
  adresse de vidéo par la règle de `src/core/pages/lien-video.ts` — un lien refusé devient du texte.
- `src/render/index.ts` exporte les composants Astro de rendu (un par nature, le texte riche sous
  `src/render/markdown/` qui rend l'arbre nœud par nœud). **Aucun `set:html`** : I5 est tenu par absence.
- `src/site/page.astro` est le gabarit (document complet : `<html lang="fr">`, titre, navigation,
  emplacements, pied de page), seul importateur de `render/index.ts`, lié à une feuille
  `src/site/site.css` externe (jamais Tailwind ni `admin.css`, ADR-0009). Aucun script.
- Une image entre dans le rendu comme `{ source, largeur, hauteur, description }`, où `source` est soit
  la métadonnée d'une image empaquetée (image publiée, traitée par `<Image>` au build — variantes
  d'ADR-0019 1.x), soit l'adresse sous garde `/admin/medias/<id>/octets` (image en brouillon, aperçu
  seulement). Le même composant reçoit les deux.
- Le carrousel est une bande `overflow-x` avec `scroll-snap`, sans script ; le lien de vidéo un lien
  « Voir la vidéo » (`rel="noopener noreferrer"`), sans `iframe` : aucune ressource tierce, aucune
  directive de politique à rouvrir.
- **Dans l'aperçu seulement**, une fonction pure de `src/core/rendu/page.ts` réécrit, sur la page
  composée, les liens dont le chemin correspond à une page déclarée — entrées de la navigation,
  destination d'un bouton, liens d'un texte riche — vers `/admin/apercu<adresse>`, requête et ancre
  gardées (`/tarifs` → `/admin/apercu/tarifs`, `/` → `/admin/apercu/`). L'adresse réécrite est
  construite depuis la déclaration, jamais recopiée du contenu. Les liens externes, de contact
  (`tel:`, `mailto:`), en `//hôte`, et les adresses du site qui ne sont pas une page déclarée restent
  intacts. Le gabarit ne sait rien de l'aperçu : il reçoit la page déjà réécrite.
Écartés : un HTML produit en `core/` puis injecté par `set:html` sous `render/markdown/` (I5 le
permettrait, mais l'arbre rendu en composants n'ouvre aucune porte) ; un composant `<img>` pour
l'aperçu et `<Image>` pour le public (deux jeux de composants, contre I3) ; garder dans l'aperçu les
liens publics vers les autres pages (arbitrage du 2026-10-11 : une fois les brouillons montrés, un clic
sur le menu ferait quitter l'aperçu pour le site en ligne, et l'éditrice croirait ses brouillons
perdus).

### D4 — Les images publiées : octets sur `media`, fiche dans le contenu, inventaire en D1

- **Déposé** : les octets sur la branche orpheline `media`, sous `medias/<id>.<ext>` ; la fiche
  `content/medias/<id>.json` sur la branche principale `{ id, nomOrigine, format, largeur, hauteur,
  description }` (FR-108). La description voyage avec la fiche : la modifier déclenche la reconstruction.
- **Au build** : `scripts/recuperer-images-publiees.mjs` (appelé par `prebuild`) extrait `medias/` de
  `origin/media` (ou d'une référence locale `media` déjà présente) dans un dossier `medias/` à la racine,
  ignoré par git ; absente, la branche donne un dossier vide. `src/platform/contenu/medias.ts`
  empaquette les fiches et les octets (`import.meta.glob`). La route publique échoue au build — message
  nommant l'image et la page — dès qu'une image posée n'a ni fiche ni octets (spec `site-public`).
- **Inventaire D1** : la table `medias_brouillon` est renommée `medias` (migration `0010`) et gagne
  `publiee_le`, `description_publiee`, `empreinte_depot` (l'oid git du blob déposé). Les images posées au
  départ par l'intégrateur y sont inscrites sans octets à leur première rencontre (bibliothèque,
  publication) depuis les fiches empaquetées. Les octets d'une image publiée restent en D1 **jusqu'à ce
  que le site en service la porte** — c'est-à-dire que le Worker qui répond l'a empaquetée — puis sont
  vidés (BLOB de longueur nulle : la colonne reste `NOT NULL`). Tant qu'ils sont là, l'administration
  sert l'image depuis D1 ; ensuite, depuis l'adresse statique de la variante originale empaquetée.
- **Rejeu défensif** : `assurerTableMedias` rejoue aujourd'hui 0005 puis 0006 ; il doit rejouer jusqu'à
  0010 sans recréer `medias_brouillon` après le renommage (point de vigilance du ticket qui pose 0010).
Écartés : effacer les octets de D1 dès le dépôt (candidat d'origine : l'image disparaîtrait de la
bibliothèque pendant la reconstruction) ; une table `medias_publiees` à côté de `medias_brouillon` (deux
lignes pour une image, nom et description à tenir en phase) ; servir l'administration depuis GitHub (un
jeton d'écriture sollicité en lecture à chaque écran, écarté par le candidat).

### D5 — L'effaçabilité suit le contenu courant de chaque emplacement

« Référencée » = posée par le **contenu courant** d'un emplacement : son brouillon s'il en porte un, sa
version publiée sinon (spec `bibliotheque-de-medias`, MODIFIED). `imageEffacable` garde sa signature :
l'ensemble « publié » qu'on lui passe ne compte plus que les emplacements **sans brouillon**. C'est la
lecture qui rend vrais ensemble les cas limites du PRD 1.x (une suppression rend l'image orpheline
aussitôt ; l'abandon futur du brouillon la ré-référence). La suppression d'une image écrit un retrait
dans le brouillon de chaque page dont la version publiée la pose.
À la publication N, une image effaçable quitte D1 et perd sa fiche ; ses octets quittent `media` à la
publication N+1, dont l'arbre est recalculé depuis D1 (D8) — jamais avant que le contenu de N, qui ne la
pose plus, soit le dernier déposé.

### D6 — Le plan de dépôt, en `core/`, borné par `PREFIXES_AUTORISES`

`src/core/publication/prefixes.ts` porte `PREFIXES_AUTORISES` (I9), seul porteur :
`content/pages/`, `content/reglages/`, `content/formulaires/`, `content/medias/`,
`content/publication.json` pour la branche principale, `medias/` pour la branche `media` — jamais
`.github/`. `cheminAutorise(chemin)` le vérifie et refuse tout segment `..`, vide ou absolu ; chaque
identifiant qui entre dans un chemin (page, emplacement, formulaire, image) est revérifié contre
`^[a-z0-9][a-z0-9-]*$` avant composition.

`src/core/publication/plan.ts` (pur) rend, depuis un **instantané** (D10), le plan :
- les fichiers texte de la branche principale : `page.json` (structure de la déclaration, valeurs
  publiées après superposition) et un `.md` par texte riche pour chaque page à brouillon ;
  `reglages.json` + `mention.md` si un réglage a un brouillon (ADR-0017 : le fichier commun reprend
  l'état publié des autres) ; `formulaire.json` par formulaire à brouillon (D7) ; la fiche de chaque
  image nouvellement publiée ou redécrite ; la **suppression** de la fiche de chaque image effacée ;
  `content/publication.json` = `{ "publication": "<marque>" }`, la marque étant 128 bits aléatoires en
  hexadécimal ;
- les images à déposer (posées par le nouveau contenu, sans `empreinte_depot`) ;
- l'inventaire `media` après dépôt (images publiées encore présentes en D1 + nouvelles) ;
- les lignes à écrire en D1 à la finalisation (D10).
JSON sérialisé par `JSON.stringify(…, null, 2)` + saut de ligne final : lisible et stable d'une
publication à l'autre (un `git diff` ligne à ligne, et le même contenu donne le même arbre).

### D7 — Les options d'un champ à choix : le candidat confirmé, ses cinq points tranchés

1. La décision du candidat est retenue telle quelle : la liste du brouillon, lisible et accordée, est
   déposée telle quelle ; tout le reste vient de la déclaration ; `optionsCourantes` reste la seule règle.
2. Le récapitulatif **ne signale pas** les options de départ changées sous un brouillon (l'éditrice
   publie ce qu'elle a vu ; un signal demanderait un état et un geste nouveaux).
3. `derniersNumeros` **passe dans l'état publié** : la ligne de `publies_formulaires` le garde, et un
   brouillon neuf part du maximum, champ par champ, entre son propre compteur et celui du publié — un
   identifiant `o<n>` déjà donné ne revient jamais (ADR-0018).
4. Format déposé : `options` du champ remplacées par la liste `{ id, libelle, prix? }`, prix en centimes,
   sans conversion.
5. Les cinq cas sont des scénarios de la spec `publication`, testés sur « Devis gâteau ».

### D8 — La forge : un port en `core/`, un adaptateur GitHub en `platform/`

`src/core/publication/forge.ts` déclare le port `Forge` (lire une référence, lire un commit, créer un
blob en base64, créer un arbre avec contenus inlinés et suppressions, créer un commit, déplacer une
référence avec ou sans `force`, créer une référence) et `src/core/publication/depot.ts` l'orchestre :
- **branche principale** : lire `refs/heads/main` → son commit → son arbre ; `POST /git/trees` avec
  `base_tree`, les fichiers texte **inlinés** et les suppressions (`sha: null`) ; `POST /git/commits` à un
  parent ; `PATCH` en `force: false`. Un refus « pas une avance rapide » relit la référence et rebâtit
  (au plus 2 nouveaux essais) ; si l'arbre du HEAD relu **est** l'arbre bâti, le dépôt est reconnu fait
  (réponse perdue) ;
- **branche `media`** : un arbre complet calculé **depuis D1 seul** (chemin → `empreinte_depot`), sans
  `base_tree`, un commit **sans parent**, puis `PATCH force: true` (ou création de la référence si elle
  manque). Dépôt et élagage sont un seul geste : l'historique de `media` n'a jamais qu'un commit, et un
  octet effacé n'y survit pas (FR-084 vrai) ;
- **blobs** : `POST /git/blobs` en base64, un appel par image — jamais inliné (UTF-8 corrompt un binaire,
  mesure du 2026-08-11).
`src/platform/publication/forge-github.ts` implémente le port par un `fetch` reçu en paramètre (le
`fetch` global en production, une fonction locale en test) vers `api.github.com`, avec
`Authorization: Bearer <clé>`, `X-GitHub-Api-Version`, un `User-Agent` neutre ; il traduit les réponses
en issues typées (`refusee-pas-avance-rapide`, `acces-refuse`, `injoignable`, `introuvable`) et ne
journalise ni la clé ni les corps.
Configuration (ADR-0005) : le dépôt `proprietaire/nom` dans `instance.json` (clé `depotDePublication`,
lue par `astro.config.ts` et injectée par `define`, I8/I10) ; la clé d'écriture, à portée fine, sur ce
seul dépôt, `Contents: Read and write` seule, est un **secret du compte Cloudflare du client**
(`JETON_DEPOT`, `wrangler secret put`), jamais dans le dépôt ni dans `wrangler*.jsonc`. Dépôt ou clé
absents → la publication échoue avant tout appel, sans rien changer.
Écartés : GraphQL (`Workflows: write` exigé, candidat) ; lire l'état de `media` pour décider quoi garder
(réplication en retard : une image fraîchement déposée disparaîtrait).

### D9 — Le constat de mise en ligne par la marque de publication empaquetée

Chaque dépôt écrit `content/publication.json` avec une marque neuve, gardée en D1. Le build l'empaquette
(`src/platform/contenu/publication.ts`) : le Worker qui répond sait **de quelle publication il est né**.
`src/core/publication/etat.ts` (pur) dérive l'état : marque du site = dernière marque déposée →
« en ligne » ; sinon, moins de `BORNE_MISE_EN_LIGNE` (30 min) depuis le dépôt → « en cours de mise en
ligne » ; sinon « n'a pas abouti ». L'état n'est jamais stocké, il se dérive à chaque écran ; l'écran
Publier interroge `GET /admin/publication/etat` toutes les 10 s tant que l'état est « en cours ».
Une marque survit aux commits ultérieurs de l'intégrateur (le fichier n'est réécrit que par une
publication), là où une empreinte de commit cesserait d'être égale. La **relance** dépose une marque neuve
sans autre fichier : nouveau commit, nouvelle reconstruction, contenu inchangé.
Écartés : une empreinte de commit exposée à une adresse publique (candidat d'origine : surface publique
de plus, et un commit ultérieur de l'intégrateur ferait dire « n'a pas abouti » à tort) ; une variable de
build de Workers Builds (absente des builds locaux et de recette) ; l'API Cloudflare ou un webhook (un
secret de plus).

### D10 — L'orchestration : instantané, verrou à bail, passes, finalisation en un lot

- **Instantané et empreinte.** L'écran Publier calcule le récapitulatif (`src/core/publication/
  recapitulatif.ts`, pur) et son **empreinte** : condensat SHA-256 de la liste triée des objets à
  brouillon avec leur `maj_le`, des images redécrites et des images effacées. La confirmation renvoie
  l'empreinte ; recalculée différente → 409, aucun dépôt, récapitulatif à jour (SC-016 strict).
- **Verrou à bail.** Ligne unique `publication` (migration `0009`) : `jeton`, `bail_jusqu_a`,
  `instantane` (JSON), `marque_en_cours`, `derniere_marque`, `depose_le`. Prise par un `UPDATE …
  WHERE bail_jusqu_a IS NULL OR bail_jusqu_a < ?maintenant` ; chaque passe le renouvelle de `BAIL`
  (5 min) ; un bail expiré est repris par la publication suivante, qui rejoue l'instantané (les blobs
  déjà déposés portent leur `empreinte_depot` et ne repartent pas).
- **Passes.** `POST /admin/publication` (confirmation) prend le verrou ; `POST /admin/publication/suite`
  enchaîne : des passes de blobs bornées à **40 images et 10 Mo d'octets** (50 sous-requêtes, 128 Mo de
  mémoire, base64 compris), puis la passe finale (branche `media` : 3 appels ; branche principale : 5,
  plus au plus 10 en nouveaux essais). L'îlot enchaîne les passes et affiche « n sur m ».
- **Finalisation en un lot D1** (`batch`), seulement après le dépôt réussi de la branche principale :
  brouillons de l'instantané → tables `publies_*` ; suppression de ces brouillons **à `maj_le` égal à
  celui de l'instantané** (une correction postérieure reste en brouillon) ; images publiées
  (`publiee_le`, `description_publiee`) ; images effacées supprimées ; `derniere_marque`, `depose_le` ;
  verrou libéré. Un échec avant le dépôt de la branche principale libère le verrou sans rien écrire
  d'autre (spec : « ne change rien »).
- **Vidage des octets** (D4) : au début de chaque publication et à chaque lecture de l'état « en
  ligne », les images publiées que le Worker empaquette voient leurs octets vidés.
Écartés : une publication en une seule requête (mur des 42 images du candidat) ; des commits
intermédiaires sur `main` par passe (déclencheraient autant de reconstructions, contre FR-089) ;
supprimer tous les brouillons à la fin (une correction faite pendant le dépôt serait perdue).

### D11 — Routes, écrans et en-têtes

- `src/pages/[...slug].astro` (`prerender = true`, `getStaticPaths` depuis la déclaration) et
  `src/pages/404.astro` (bâtie) : documents statiques, en-têtes posés par `public/_headers` (règle `/*`) :
  `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self';
  base-uri 'none'; form-action 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`. La story du formulaire
  public y ajoutera `script-src` et Turnstile (ADR-0004).
- `src/pages/admin/apercu/[...slug].astro` : garde (`verifierSession`, I6), superposition D2 avec
  brouillons, liens vers les pages déclarées réécrits vers leur aperçu (D3), même
  `src/site/page.astro`, bandeau d'aperçu (composant `src/admin/BandeauApercu.astro`) **hors** du
  gabarit ; `Cache-Control: no-store` posé par la route (I11 ne régit que les quatre en-têtes
  de sécurité, que le middleware pose déjà). Le gabarit se rend sous la CSP de l'administration :
  feuille externe, aucun attribut `style`.
- `src/pages/admin/publier.astro` (écran) + îlot `EcranPublier.svelte` ; routes `POST
  /admin/publication`, `POST /admin/publication/suite`, `POST /admin/publication/relancer`, `GET
  /admin/publication/etat`, toutes gardées (I6), écritures protégées par `SameSite=Strict` (ADR-0011).
- Le cadre (`src/admin/GabaritCadre.astro`) porte « Publier » dans sa barre haute (visible tiroir
  fermé) et l'état dérivé (D9) ; l'éditeur d'une page porte « Voir l'aperçu ».

### D12 — Le contenu de démonstration gagne ses images publiées

Le dépôt produit reçoit une branche `media` portant `medias/media-fixture-hero.png` et
`medias/media-fixture-equipe.png` (images générées, quelques Ko), et `content/medias/<id>.json` pour
chacune : les pages de démonstration se bâtissent, et `npm test` (qui bâtit) récupère la branche. La
CI la récupère après le `checkout` (dépôt public : lecture anonyme). Hors réseau, une référence locale
déjà récupérée suffit ; sinon la construction échoue en le disant.

## Architecture

**Éléments touchés (FQN) :** `colibri-cms.worker.routes`, `colibri-cms.worker.site`,
`colibri-cms.worker.render`, `colibri-cms.worker.core`, `colibri-cms.worker.platform`,
`colibri-cms.worker.admin`, `colibri-cms.d1`, `colibri-cms.contenu` ; nouveaux : `github`,
`workers-builds`, `visiteur`.

**Relations ajoutées** (chacune écrite dans le `.c4` par le ticket qui pose l'import, puis
`likec4 validate --no-layout --json --project colibri-cms docs/architecture`) :
- `colibri-cms.worker.routes -[sync]-> colibri-cms.worker.site 'rend la page publique et son aperçu par
  le gabarit'` — `model.c4`, ticket du rendu partagé ;
- `colibri-cms.worker.site -[sync]-> colibri-cms.worker.render 'dessine les emplacements'` — `model.c4`,
  même ticket ;
- `visiteur -> colibri-cms.worker 'consulte les pages publiques'` — `context.c4`, même ticket (acteur
  `visiteur` ajouté) ;
- `colibri-cms.worker.platform -[sync]-> github 'dépose le contenu et les images publiés'` —
  `context.c4`, ticket de la forge (système externe `github`, `#external`) ;
- `github -[async]-> workers-builds 'déclenche la reconstruction (branche principale seule)'` et
  `workers-builds -[async]-> colibri-cms.worker 'bâtit, récupère les images, déploie'` — `context.c4`,
  ticket de recette (système externe `workers-builds`, `#external`), avec une vue dynamique
  `flow-publication` dans `flows.c4`.
Descriptions à mettre à jour dans `model.c4` : `render` et `site` cessent d'être « vides » ;
`contenu` « lu par le produit ; la publication en dépose la copie publiée » ; `d1` porte aussi l'état
publié et l'état de la publication.
**Relations retirées :** aucune.

## Risks / Trade-offs

- [La reconstruction automatique n'atteint pas la branche `media` sans clé — point bloquant hérité, ni
  documenté ni infirmé] → constaté au ticket de recette ; s'il échoue, une clé en lecture seule
  (`Contents: Read-only`, secret du client) est passée au script de récupération, qui l'accepte déjà en
  variable d'environnement optionnelle.
- [La reconstruction automatique doit trouver la base et la liaison d'envoi de l'instance — identifiants
  du compte du client dans le dépôt de l'instance, que le dépôt produit ne porte pas] → résolu pour la
  recette par le dépôt de recette lui-même (ses identifiants sont ceux du compte de recette) ; la
  convention de flotte revient à l'Epic D.
- [Le changement de sens du comptage (D5) contredit des tests de 004 qui supposaient l'état publié vide]
  → le ticket qui le pose déclare ces tests en dérogation et les met à jour dans son périmètre.
- [Les builds de test et de développement dépendent désormais de la branche `media`] → référence locale
  acceptée hors réseau ; message explicite sinon (D12).
- [Une structure changée par l'intégrateur et pas encore reconstruite serait réécrite par une
  publication avec l'ancienne structure] → la procédure de mise à jour d'une instance (Epic D) impose une
  reconstruction avant toute publication ; noté au dossier d'instance.
- [Session volée : `force: true` sur `media` peut détruire des images publiées (SEC-8)] → accepté par le
  candidat ; le contenu textuel reste indestructible dans l'historique de la branche principale.
- [Bail de 5 min et borne de 30 min non mesurés] → constantes nommées en `core/`, mesurées au ticket de
  recette et rapportées dans l'ADR de sérialisation.
- [Dix publications rapprochées font dix reconstructions en file] → la dernière peut dépasser 30 min :
  « n'a pas abouti » puis « en ligne » à son arrivée (spec, scénario de mise en ligne tardive).
- [La base de recette est partagée entre branches : la migration `0010` (renommage) appliquée par une
  branche en relecture touche la recette de `main`] → le ticket qui pose `0010` se relit sur la recette
  avant les autres tickets en vol, et le skill recette est mis à jour dans le même ticket.
- [Le gabarit public est sobre et générique] → la mise en page fine revient à la story « Site public
  rapide et complet » ; le rendu partagé ne bouge pas.

## Migration Plan

1. Promouvoir les huit ADR (D1), puis `/scd-spec-dev:tickets`.
2. Migrations `0009` (tables `publies_*`, ligne `publication`, additives) et `0010` (renommage de
   `medias_brouillon` en `medias` + trois colonnes) : appliquées par `wrangler d1 migrations apply` au
   déploiement ; les données existantes (brouillons, images) sont conservées telles quelles.
3. Branche `media` du dépôt produit et fiches de démonstration (D12) avant le ticket des images publiques.
4. Recette : dépôt privé du site de recette, clé à portée fine, reconstruction automatique — trois gestes
   humains, guidés par le skill `recette` mis à jour au dernier ticket.
5. Retour arrière : sans publication faite, supprimer les tables neuves et renommer `medias` suffit ;
   après une publication, le contenu déposé reste valide pour l'ancienne version (même format).

## Open Questions

- Nom du dépôt de recette et compte qui le porte (geste humain du ticket de recette) — sans effet sur les
  specs ni sur le découpage.
