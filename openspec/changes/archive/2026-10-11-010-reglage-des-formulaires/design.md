## Context

Voir proposal.md — Why pour la motivation. Ce change ajoute le troisième et dernier objet publiable du
produit — le **formulaire** — à côté de la page et du réglage. Il est transverse (contenu déclaré,
`core/`, magasin D1 et migration, route d'écriture, deux écrans et un îlot, menu), d'où ce design.

État constaté dans le code :
- **Aucun formulaire n'existe.** `content/` porte `pages/` (ADR-0012) et `reglages/` (ADR-0017) ; aucun
  fichier, aucun type, aucune table ne parle de champ ni d'option. Les pages de démonstration portent un
  bouton « Demander un devis » (`content/pages/accueil/page.json`, `tarifs/page.json`) qui ne mène à
  aucun formulaire.
- **Le menu** (`src/admin/MenuRubriques.astro`) porte la rubrique `formulaires` avec `href: null` ;
  `IdRubriqueServie` vaut `'mes-pages' | 'medias' | 'reglages'`.
- **Le patron à copier est celui des réglages (008)** : déclaration lue en `core/reglages/declaration.ts`
  (entrées mal formées écartées), chargée par `import.meta.glob` dans `src/platform/contenu/reglages.ts` ;
  magasin `src/platform/reglages/magasin.ts` (table recréée défensivement, lire → appliquer en `core/` →
  écrire ssi acceptée, *upsert* d'une ligne entière) ; lecture bornée du corps
  `src/platform/reglages/corps.ts` (`CORPS_TAILLE_MAX` = 64 Kio, 413 au-delà) ; route `POST` gardée par
  `verifierSession` qui rend `400 { ok: false, refus: [{ champ, raison }] }` ; la liste éditable des
  réseaux (`CarteReseaux.svelte`, `reseaux-carte.ts`) avec ajouter / monter / descendre / retirer et un
  plafond lu depuis une constante de `core/` importée par l'îlot.
- **Dernière migration** : `migrations/0007_brouillons_reglages.sql`.
- **Matrice `I1`** : `src/admin/` importe déjà `core/` (`CarteReseaux.svelte` →
  `core/reglages/reseaux.ts`) ; `platform/` n'importe que `core/`.

## Goals / Non-Goals

**Goals :**
- Un format de déclaration des formulaires qui serve **aussi** la story suivante (rendu au visiteur,
  total, envoi) sans être repris : natures de tous les champs, marque obligatoire, marque avec / sans
  prix, prix en centimes, identifiants stables jusqu'à l'option.
- Toute la vérification (lecture de la déclaration, lecture d'un prix saisi, correction des options,
  rapprochement brouillon ↔ déclaration) en logique pure de `core/`, couture de test la plus haute
  (ADR-0003, ADR-0014).
- Un brouillon par formulaire en D1, sans jamais écrire le contenu déclaré.
- Réutiliser les briques de 008 (corps borné, patron du magasin, liste éditable) sans les dupliquer.

**Non-Goals :**
- Le rendu public d'un formulaire, sa pose sur une page, le total et l'envoi (story « Composer et
  envoyer une demande de devis ») ; l'aperçu, la publication et l'abandon d'un brouillon.
- La correction des champs sans option, de libellés de champ ou du caractère obligatoire (structure).
- La concurrence entre deux onglets : dernier qui écrit gagne, comme pour les pages et les réglages.

## Decisions

- **Le lieu et le format de la déclaration des formulaires sont fixés par ADR-0018** (accepté le
  2026-10-10) : `content/formulaires/<id>/formulaire.json`, où `<id>` (le nom du répertoire) est
  l'identifiant stable du formulaire, portant
  `{ nom, champs: [{ id, nature, libelle, obligatoire?, avecPrix?, options? }] }` ;
  `nature` ∈ `choix-unique` | `choix-multiple` | `texte` | `texte-long` | `email` | `telephone` ; pour un
  champ à choix, `avecPrix: true | false` (la marque avec / sans prix, `false` par défaut) et
  `options: [{ id, libelle, prix? }]`, le prix d'une option étant un **entier de centimes** (0 à
  9 999 999). C'est l'extension, à un troisième objet, d'ADR-0012 et d'ADR-0017 (structure lue, jamais
  écrite ; identité stable comme clé du brouillon ; format déposé) et du candidat
  `format-du-contenu-un-repertoire-par-objet`. ADR-0018 n'ajoute aucun invariant à la table et ne
  touche pas le modèle LikeC4.
  Écartés : un fichier unique `content/formulaires.json` pour tous les formulaires (la publication d'un
  formulaire réécrirait celui des autres — la conséquence négative qu'ADR-0017 a dû accepter pour
  `reglages.json` ; ici un fichier = un brouillon = un objet publiable) ; des prix en euros décimaux
  dans le JSON (`12.5` : arrondis flottants dans le total de la story suivante) ; des formulaires
  déclarés dans `page.json` comme un emplacement (un formulaire peut être posé sur plusieurs pages —
  FR-067 distingue formulaire et page d'origine — et la liste FR-045 en serait dérivée de pages).
- **Les formulaires sont rangés dans l'ordre alphabétique de leurs identifiants** (noms de répertoire),
  triés explicitement en `core/` par simple comparaison des chaînes — sans compter sur l'ordre où le
  chargement les rend. ADR-0018 ne pose aucun rang : il ne règle que l'ordre des champs et des options.
  L'intégrateur règle donc l'ordre de la liste en nommant ses répertoires ; renommer un répertoire fait
  perdre son brouillon au formulaire (conséquence déjà nommée par ADR-0018). La liste n'est vue que de
  l'éditrice et compte un à trois formulaires : l'ordre y pèse peu, contrairement aux pages, qui forment
  la navigation du site.
  Écartés : un `rang` dans `formulaire.json`, comme `page.json` (changerait le format qu'ADR-0018 vient
  de fixer, donc un nouvel ADR, pour un gain faible) ; l'ordre du nom affiché (personne ne le choisit, et
  renommer un formulaire le déplacerait dans la liste).
- **Le noyau des formulaires vit dans `src/core/formulaires/`** (`I2`) :
  - `declaration.ts` — lecture de la déclaration selon les règles d'écart de la spec ; bornes nommées
    (`OPTIONS_PAR_CHAMP_MAX = 30`, `LIBELLE_OPTION_LONGUEUR_MAX = 80`, `PRIX_CENTIMES_MAX = 9_999_999`).
  - `prix.ts` — `lirePrixSaisi(texte)` : chaîne → centimes ou raison de refus (virgule ou point, au plus
    deux décimales, bornes) ; `formaterPrix(centimes)` pour l'affichage (« 12,50 € »). L'îlot les
    importe (arête `admin → core` permise par `I1`) : **une seule règle** de lecture d'un montant, au
    champ comme à la route.
  - `options.ts` — `appliquerOptions(formulaireDeclare, brouillonCourant, corpsBrut)` : vérifie la
    soumission contre la déclaration et rend soit le nouveau contenu du brouillon, soit
    `forme-invalide`, soit `valeur-refusee` avec `refus: [{ champ, raison }]`, `champ` valant
    `<idChamp>`, `<idChamp>.<rang>.libelle` ou `<idChamp>.<rang>.prix`. Les raisons sont des codes que
    l'îlot traduit en français, jamais affichés bruts.
  - `brouillon.ts` — `optionsCourantes(formulaireDeclare, brouillon)` : rapprochement par identifiant,
    champ par champ (champ disparu ignoré ; champ qui n'est plus à choix, sans option ; champ dont la
    marque avec / sans prix ne s'accorde plus, ou champ nouveau → options de départ ; sinon la liste du
    brouillon, entière et telle quelle). La nature ne compte que pour « à choix ou non » : le brouillon
    ne la retient pas. Sert l'écran et, plus tard, l'aperçu et la publication, qui l'appellent sans la
    réécrire.
- **Forme de la soumission** : `POST /admin/formulaires/<id>/options`, corps JSON
  `{ champs: [{ id, options: [{ id?, libelle, prix? }] }] }`, `prix` étant le **texte saisi** (« 12,50 »)
  lu par `lirePrixSaisi` en `core/`. Une option sans `id` est une option ajoutée ; `core/` lui attribue
  un identifiant `o<n>`, `n` valant un de plus que le plus grand numéro que le champ a connu : le plus
  grand suffixe `o<n>` de la déclaration, du brouillon courant et de la soumission, et le dernier numéro
  que le brouillon courant retient pour ce champ. Le nouveau brouillon retient, champ par champ, ce plus
  grand numéro, attributions nouvelles comprises : un numéro attribué ne revient jamais, même après le
  retrait de son option par un enregistrement précédent (ADR-0018, « jamais réattribuée dans un
  champ »). Le dernier numéro retenu ne vient jamais de la soumission. Une option portant un `id` que ni la déclaration ni le brouillon courant ne connaissent, ou un `id`
  répété dans la soumission, rend `forme-invalide`. La marque avec / sans prix, la nature et l'existence
  des champs sont **toujours** lues dans la déclaration.
- **Un brouillon par formulaire, une ligne par formulaire** : migration additive
  `migrations/0008_brouillons_formulaires.sql` (numéro à reconfirmer par `ls migrations/` au ticket),
  table `brouillons_formulaires(formulaire TEXT PRIMARY KEY, contenu TEXT NOT NULL, maj_le INTEGER NOT
  NULL)`. `contenu` est un JSON `{ champs: { <idChamp>: [{ id, libelle, prix? }] }, derniersNumeros:
  { <idChamp>: n } }`, prix en centimes ; un brouillon sans `derniersNumeros`, ou sans entrée pour un
  champ, vaut 0 pour ce champ. `derniersNumeros` ne quitte pas le serveur : la route ne rend que les
  options, et l'affichage l'ignore. « Porte un brouillon » se dérive de la présence de la ligne, jamais stocké (règle de 0004 et 0007).
  Chaque enregistrement remplace la ligne entière du formulaire. Pas de contrainte `CHECK` sur
  l'identifiant : les formulaires sont déclarés site par site ; une ligne orpheline est ignorée à la
  lecture. Candidat `magasin-d1-brouillons-etat-publie-et-demandes` tenu.
  Écartés : une ligne par champ (le formulaire s'enregistre d'un bloc, FR-051 parle du brouillon *du
  formulaire*) ; réutiliser `brouillons_reglages` (sa contrainte `CHECK` le ferme, et mêler deux objets
  brouillerait le récapitulatif de FR-083) ; numéroter d'après les seuls numéros visibles — déclaration,
  brouillon courant, soumission — (une option ajoutée, retirée par un enregistrement, puis remplacée par
  un autre ajout, en reprendrait le numéro, contre ADR-0018) ; le dernier numéro dans une colonne D1
  dédiée (une migration de plus pour une donnée qui vit et meurt avec le brouillon).
- **Le magasin vit dans `src/platform/formulaires/magasin.ts`** (lire tous les brouillons ou celui d'un
  formulaire, enregistrer par le patron lire → appliquer en `core/` → écrire ssi acceptée ; table
  recréée défensivement au premier accès), et la lecture du contenu déclaré dans
  `src/platform/contenu/formulaires.ts` par `import.meta.glob('/content/formulaires/*/formulaire.json')`,
  l'identifiant étant le nom du répertoire. La route réutilise `lireCorpsJsonBorne` de
  `src/platform/reglages/corps.ts` (64 Kio) ; si la revue juge le nom trompeur, il remonte dans un
  module de `platform/` commun — remaniement sans changement de comportement.
- **Une route d'écriture par formulaire** : `src/pages/admin/formulaires/[id]/options.ts`. Elle importe
  le garde de session (`I6`, ADR-0007) et renvoie 401 sans session ; 404 pour un formulaire non
  déclaré ; 413 / 400 `forme-invalide` sur un corps démesuré ou illisible ; 400 `{ ok: false, refus }`
  sur un refus de `core/` ; 200 `{ ok: true, champs }` sinon, `champs` portant les options enregistrées
  avec leurs identifiants — l'îlot en reprend les identifiants neufs, pour qu'un second enregistrement
  ne duplique pas les options ajoutées. Anti-forgerie : la session `SameSite=Strict` seule (ADR-0011,
  `I13`).
- **Deux écrans** : `src/pages/admin/formulaires.astro` (liste) et `src/pages/admin/formulaires/[id].astro`
  (un formulaire), servis dans `GabaritCadre` avec `rubrique="formulaires"` ; `IdRubriqueServie` reçoit
  `'formulaires'`, la rubrique son `href`. Le contenu courant est rendu côté serveur (présent sans
  script), puis animé par un îlot `EcranFormulaire.svelte` monté depuis `monter.ts`, sa logique de liste
  (ajouter, retirer, monter, descendre, plafond) dans un module `formulaire-carte.ts` testable seul, sur
  le modèle de `reseaux-carte.ts`. Données passées à l'îlot en JSON échappé par Astro. Aucune directive
  `client:*` (`I4`, ADR-0006), aucun `set:html` ni `{@html}` (`I5`), couleurs par les tokens
  d'`admin.css` seulement (`I14`), CSP inchangée (`I11`, `I12`). Textes visibles dans `src/admin/textes.ts`.
- **Contenu de démonstration** : `content/formulaires/devis-gateau/` (champs « Parfum » avec prix,
  « Nombre de parts » avec prix, « Occasion » sans prix, coordonnées et message) et
  `content/formulaires/devis-atelier/`, pour que la liste montre deux formulaires. Le site factice de
  recette (`recette/site-factice/`) recevra une variante « aucun formulaire » au ticket qui sert la
  liste.

## Architecture

**Éléments touchés (FQN) :**
- `colibri-cms.worker.core` — `src/core/formulaires/` (déclaration, prix, options, rapprochement) ;
- `colibri-cms.worker.platform` — `src/platform/formulaires/magasin.ts`, `src/platform/contenu/formulaires.ts` ;
- `colibri-cms.worker.routes` — `src/pages/admin/formulaires.astro`, `src/pages/admin/formulaires/[id].astro`, `src/pages/admin/formulaires/[id]/options.ts` ;
- `colibri-cms.worker.admin` — `EcranFormulaire.svelte`, `formulaire-carte.ts`, `MenuRubriques.astro`, `textes.ts` ;
- `colibri-cms.d1` — `migrations/0008_brouillons_formulaires.sql` ;
- `colibri-cms.contenu` — `content/formulaires/` ; sa description (« pages, emplacements et réglages ») reçoit
  les formulaires dans le ticket qui pose la déclaration.

**Relations ajoutées / retirées :** aucune. Chaque import prévu emprunte une relation déjà modélisée :
routes → admin, platform, core ; admin → core ; platform → core, d1, contenu.

## Risks / Trade-offs

- [La déclaration change sous un brouillon — champ retiré ou devenu sans option, marque avec / sans
  prix changée] → rapprochement par identifiant en `core/` (`brouillon.ts`), scénario dédié dans la
  spec ; un champ en désaccord retombe sur ses options de départ plutôt que de mêler deux formes.
- [Les options de départ changent sous un champ déjà enregistré — option ajoutée, retirée, renommée ou
  au prix changé par l'intégrateur] → la liste du brouillon reste celle de l'éditrice, montrée telle quelle ;
  aucune fusion option par option. Ce que la publication déposera pour ce champ est **reporté à la story
  « Aperçu et publication »**, avec la décision proposée, les cas et les points d'appui :
  `docs/adr/_candidates/brouillon-d-un-champ-a-choix-porte-toute-sa-liste.md`. Les tests « SC-06d » de
  `tests/unit/formulaires/brouillon.test.ts` figent le comportement d'ici là.
- [Deux options au même libellé rendraient une demande ambiguë pour l'éditrice] → refus à la casse près
  dans le même champ.
- [Le format choisi ici engage la story suivante] → c'est l'objet de l'ADR proposé ; le format couvre
  déjà les natures des champs sans option et la marque obligatoire, que cette story ne fait que lire.
- [Une option retirée puis ré-ajoutée sous le même libellé reçoit un nouvel identifiant] → assumé : les
  demandes porteront le libellé et le prix au moment de l'envoi (FR-068), pas un renvoi à l'option.
- [Le dernier numéro attribué vit dans le brouillon] → les stories qui videront un brouillon
  (« Aperçu et publication », « Restauration ») devront reporter `derniersNumeros` ou le recalculer
  depuis l'état publié ; sans quoi un numéro déjà publié pourrait revenir, contre ADR-0018.
- [Corps de requête démesuré ou profond] → lecture bornée à 64 Kio ; 30 options × champs déclarés tient
  largement dessous (voir security-review.md).

## Migration Plan

- Migration D1 additive `0008_brouillons_formulaires.sql`, aucune donnée existante à reprendre. Le
  répertoire `content/formulaires/` est garni pour la démonstration.
- Retour arrière : retirer la migration, les écrans, la route et le lien du menu ; aucun contenu publié
  n'est touché par ce change.

## Open Questions

- Aucune qui change les specs ou le découpage. ADR-0018 est accepté ; le ticket de la déclaration s'y
  conforme.
