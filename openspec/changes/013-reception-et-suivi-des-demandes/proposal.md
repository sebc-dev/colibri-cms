## Why

Une demande de devis part aujourd'hui par e-mail chez l'éditrice, et le site n'en garde rien : un
e-mail qui n'aboutit pas perd la demande, et l'éditrice n'a aucun moyen de noter ce qu'elle en a fait
ni de lire ce que son site lui rapporte. Cette story garde chaque demande dans une liste de
l'administration, où l'éditrice la consulte, note sa **suite**, la retire, et lit les nombres qui
mesurent le site.

Sert **Epic B — Convertir le visiteur** (`docs/roadmap.md`), story **Réception et suivi des demandes** ;
couvre **FR-065 → FR-079**, sous **FR-117**, **SEC-6**, **SEC-8** et **DAT-1** (versant produit : effacement
praticable, aucun effacement d'office). FR-063 et FR-064 (l'acheminement par e-mail et son contenu) sont
déjà livrés par le change 012. Elle sert la part « liste et suite » de **SC-007** et tout **SC-019**. Elle
répond aussi en partie à **DAT-2** : une demande dont l'e-mail n'a pas pu partir le dit dans la liste.

Arbitrages humains du 2026-10-17, pris avant la rédaction :
- quand la demande est gardée dans la liste mais que son e-mail n'a pas pu partir, le visiteur lit que sa
  demande a été envoyée, et la demande porte dans la liste la mention que son e-mail n'a pas pu partir ;
- une demande retirée sans motif indésirable dont la suite était « commande » reste comptée parmi les
  commandes : le retrait efface les données du visiteur, pas le résultat.

## What Changes

- **Chaque demande acceptée est gardée**, avant l'e-mail et quel qu'en soit le sort (FR-065, FR-066) :
  sa date de réception, le formulaire et la page d'origine (FR-067), le total affiché au visiteur au
  moment de l'envoi (FR-068), et le détail de ses sélections, de ses coordonnées et de son message tels
  qu'il les a envoyés. Une demande refusée — champ manquant, formulaire changé, seuil atteint — n'est pas
  gardée.
- **Le visiteur est confirmé dès que sa demande est gardée ou que son e-mail est parti.** L'envoi
  n'échoue, pour lui, que si ni l'un ni l'autre n'a abouti. Une demande gardée dont l'e-mail n'a pas pu
  partir — refus de la plateforme, ou aucune adresse autorisée enregistrée — le dit dans la liste.
  **BREAKING** pour la spec `demande-de-devis` : un e-mail refusé n'est plus annoncé comme un échec au
  visiteur quand la demande est gardée, et la base garde désormais les valeurs saisies.
- **L'`Écran : Demandes`** — la rubrique « Demandes » du menu y mène. Les demandes paraissent de la plus
  récente à la plus ancienne (FR-069), par pages de 50, filtrables par formulaire d'origine (FR-070).
  Chaque ligne dit la date, le formulaire, la page, le total, la suite, et, le cas échéant, que l'e-mail
  n'a pas pu partir.
- **L'`Écran : Demande`** présente le détail complet d'une demande : sélections avec leur prix, total
  affiché, coordonnées et message, chaque valeur derrière l'étiquette de son champ, affichée telle quelle.
- **La suite.** Une demande neuve est « à renseigner » ; l'éditrice choisit « sans suite », « devis
  envoyé » ou « commande », et peut la changer ensuite (FR-071, FR-072).
- **Le retrait.** L'éditrice retire une demande, ou plusieurs en un geste, en déclarant le motif :
  ordinaire ou indésirable (FR-073, FR-074). Une confirmation dit, avant, que le retrait est définitif.
  Un retrait ordinaire efface aussitôt tout ce que le visiteur a envoyé ; la demande ne survit que pour
  être comptée (FR-078). Un retrait indésirable efface la demande entière : elle ne compte nulle part. Un
  retrait n'en entraîne aucun autre, et le produit n'efface jamais une demande de lui-même (FR-079).
- **Les nombres**, pour le site et pour chaque formulaire (FR-075 → FR-077) : les demandes présentes,
  les commandes, et les retirées quand il y en a. Les ventilations par formulaire somment au nombre du
  site ; un retrait indésirable n'entre dans aucun.

Hors-périmètre :
- Le cadrage juridique des données des visiteurs (**DAT-1** : mention d'information, politique de durée,
  acte de sous-traitance) — il reste à faire avant la première mise en ligne ; cette story ne fixe aucune
  durée et n'efface rien d'office.
- La détection d'un e-mail accepté par la plateforme mais jamais remis (le reste de **DAT-2**).
- Un filtre par date, un export des demandes, une corbeille ou une annulation de retrait — écartés par
  l'ancien cahier des charges (`docs/legacy/1.x/prd.md`, § Arrêté par ce PRD et § Hors-périmètre).
- L'ouverture de l'administration par le moyen de reprise pour consulter la liste (**SC-020**, story
  « Moyen de reprise »).

## Capabilities

### New Capabilities
- `suivi-des-demandes` : la demande gardée à réception, sa liste dans l'administration, son détail, sa
  suite, son retrait à l'unité ou en groupe, et les nombres présentes / commandes / retirées, pour le
  site et par formulaire.

### Modified Capabilities
- `demande-de-devis` : la confirmation paraît dès que la demande est gardée ou que son e-mail est parti ;
  l'échec n'est annoncé que si ni l'un ni l'autre n'a abouti ; sans adresse autorisée, la demande est
  gardée et confirmée ; la base garde la demande dans la liste, et rien d'autre ne garde les valeurs
  saisies.
- `pages-et-emplacements` : dans le cadre de l'administration, la rubrique « Demandes » devient active et
  mène à l'`Écran : Demandes`.

## Impact

- **Code** : la route d'envoi (`src/pages/api/public/demandes.ts`) garde la demande avant l'e-mail et
  confirme selon la nouvelle règle ; un magasin des demandes en D1 (`src/platform/demandes/`) ; la
  composition du détail gardé, les nombres et les règles du retrait en `src/core/demandes/`, testables
  sans plateforme ; deux écrans et leurs routes d'écriture sous `src/pages/admin/demandes/` ; un îlot
  Svelte pour la liste, ses textes dans `src/admin/textes.ts` ; le menu des rubriques.
- **Données** : une migration D1 pour la table des demandes. Elle porte pour la première fois des
  données personnelles de visiteurs.
- **Configuration** : aucune nouvelle liaison, aucun nouveau secret.
- **Décisions** : ADR-0030 — ce qu'une demande retirée garde, et ce qu'un retrait indésirable efface,
  tenu par la base elle-même ; il crée l'invariant `I17` — voir design.md.
- **Modèle d'architecture** : la description de la base et la vue `flow-demande` disent que la demande
  est gardée ; un flux du suivi par l'éditrice s'ajoute.
- **Recette** : la migration s'applique à la recette ; le cahier de recette gagne les cas de la liste,
  du retrait et des nombres.
