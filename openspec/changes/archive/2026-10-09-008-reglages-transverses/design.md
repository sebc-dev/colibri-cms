## Context

Voir proposal.md — Why pour la motivation. L'administration dispose déjà de la connexion (001), du
socle d'îlots (002), du parcours d'édition des pages (003, 006), de la bibliothèque (004) et de
l'habillage (005). Ce change ajoute un objet publiable neuf — le **réglage** — à côté de la page. Il est
transverse (contenu déclaré, `core/`, magasin D1 et migration, routes d'écriture, écran et îlots, menu),
d'où ce design.

État constaté dans le code :
- **Aucun lieu n'existe pour les réglages.** `content/` ne porte que `content/pages/*/page.json` et leurs
  `.md` ; `instance.json` ne porte que le domaine, la clé publique Turnstile et l'adresse d'expédition.
  Aucune coordonnée, aucun lien de réseau n'est écrit en dur dans le code.
- **Il n'y a pas encore de site public** : `src/site/` et `src/render/` ne sont que des zones déclarées.
  Rien ne rend donc les réglages hors de l'administration, ce qui est conforme au périmètre.
- **Le patron d'édition à copier** : table `brouillons_emplacements` (migration 0004), magasin
  `src/platform/brouillons/magasin.ts` (lire le brouillon, appliquer une correction pure de `core/`,
  *upsert* seulement si acceptée), route `POST` gardée par `verifierSession`
  (`src/pages/admin/pages/[slug]/emplacements/[id].ts`), îlots montés par `src/admin/ilots-svelte-5/monter.ts`
  depuis un script externe, enregistrement explicite par un bouton « Enregistrer », dernier qui écrit
  gagne.
- **Le menu** (`src/admin/MenuRubriques.astro`) porte déjà la rubrique `reglages` avec `href: null` ;
  `IdRubriqueServie` vaut `'mes-pages' | 'medias'`.
- **L'éditeur de texte riche** (`TexteRiche.svelte`) compose lui-même l'adresse d'enregistrement d'un
  emplacement de page (`/admin/pages/${slug}/emplacements/${idEmplacement}`) ; la sérialisation en
  Markdown restreint et la règle des liens vivent en `core/pages/texte-riche.ts`.

## Goals / Non-Goals

**Goals :**
- Un lieu de déclaration des réglages, lu par `core/`, au même format que le contenu déposé à la
  publication — pour que la story « Aperçu et publication » le dépose sans conversion.
- Toute la vérification (natures des coordonnées, liste des liens, mention non vide) en logique pure de
  `core/`, couture de test la plus haute (ADR-0003).
- Trois brouillons indépendants en D1, sans jamais écrire le contenu déclaré.
- Réutiliser l'éditeur de texte riche existant pour la mention, sans le dupliquer.

**Non-Goals :**
- Le rendu des réglages sur le site public et dans les formulaires, l'aperçu, la publication, l'abandon
  d'un brouillon (stories distinctes).
- Une reconnaissance des réseaux connus (icônes) ; tout outil de saisie de la déclaration.
- La concurrence entre deux onglets : dernier qui écrit gagne, comme pour les pages.

## Decisions

- **Le lieu et le format de la déclaration des réglages appellent un ADR.** Proposé :
  « Déclaration des réglages transverses — un répertoire de contenu `content/reglages/` au format
  déposé, lu par `core/` ». Contenu proposé : un `reglages.json` portant `coordonnees` (liste ordonnée
  d'entrées `{ id, nature, nom?, valeur }`, nature ∈ `texte` | `telephone` | `email` | `adresse`) et
  `reseaux` (liste ordonnée de `{ nom, lien }`), plus un `mention.md` pour le texte de départ de la
  mention. C'est l'extension, à un nouvel objet, d'ADR-0012 (structure lue, jamais écrite ; identité
  stable comme clé du brouillon) et du candidat `format-du-contenu-un-repertoire-par-objet` (un
  répertoire par objet, un `.md` par texte riche). L'ADR est à écrire par `/scd-spec-dev:adr` **avant**
  le ticket qui pose la déclaration ; ce design ne le fige pas.
  Écartés : `instance.json` (ADR-0005 et `I8` le réservent aux valeurs d'instance ; un réglage est un
  contenu éditorial qui porte un brouillon) ; une « page » fictive `content/pages/reglages/` (la liste des
  pages la montrerait, et ses natures n'existent pas chez les emplacements) ; des réglages sans
  déclaration, posés en dur dans le produit (le choix humain : les coordonnées sont posées par
  l'intégrateur, site par site).
- **Le noyau des réglages vit dans `src/core/reglages/`**, sans framework ni plateforme (`I2`, candidat
  `core-sans-framework-ni-plateforme`) : lecture de la déclaration (entrées mal formées écartées, comme
  `core/pages/declaration.ts`), vérification de chaque nature, vérification de la liste des liens,
  application d'une correction à un brouillon et dérivation de « porte un brouillon ». La mention réutilise
  `serialiserMarkdownRestreint` / `lienDeTexteRicheAutorise` de `core/pages/texte-riche.ts` — import
  `core/` → `core/`, permis par `I1` — pour que les règles de liens restent **un seul lieu de vérité**.
  Les bornes chiffrées (120, 6–15 chiffres, 254, 5 lignes / 300, 12 liens, 40, 2048) sont des constantes
  nommées de ce module.
- **Un brouillon par réglage, une ligne par réglage** : migration additive
  `migrations/0007_brouillons_reglages.sql`, table `brouillons_reglages(reglage TEXT PRIMARY KEY CHECK
  (reglage IN ('coordonnees','reseaux','mention')), contenu TEXT NOT NULL, maj_le INTEGER NOT NULL)`.
  `contenu` est un JSON : la table des valeurs par identifiant de coordonnée, la liste des liens, ou le
  Markdown de la mention. « Porte un brouillon » se dérive de la présence de la ligne, jamais stocké
  (même règle que 0004). Chaque enregistrement remplace la ligne entière de son réglage : la carte
  soumet tout son contenu en un geste. Candidat `magasin-d1-brouillons-etat-publie-et-demandes` tenu
  (il cite déjà FR-044).
  Écartés : réutiliser `brouillons_emplacements` avec un faux `page_slug` (mêle deux objets, et la liste
  des pages dérive ses brouillons de ces lignes) ; une ligne par coordonnée (trois formes de clé pour un
  seul objet, sans gain : la carte s'enregistre d'un bloc).
- **Le magasin vit dans `src/platform/reglages/`** (lire les trois brouillons, enregistrer une correction
  par le patron lire → appliquer en `core/` → écrire si acceptée), et la lecture du contenu déclaré dans
  `src/platform/contenu/reglages.ts` par `import.meta.glob`, comme `platform/contenu/pages.ts`. La table
  est recréée défensivement au premier accès, comme `assurerTableBrouillons`.
- **Trois routes d'écriture, une par réglage** : `POST /admin/reglages/coordonnees`,
  `POST /admin/reglages/reseaux`, `POST /admin/reglages/mention` (fichiers sous
  `src/pages/admin/reglages/`). Chacune importe le garde de session (`I6`, ADR-0007) et renvoie 401 sans
  session ; corps JSON ; 400 `{ ok: false, refus: [{ champ, raison }] }` sur un refus de `core/` — la
  raison est un code que l'îlot traduit en français, jamais affiché brut ; 200 `{ ok: true }` sinon. La
  nature d'une coordonnée est **toujours** prise dans la déclaration, jamais dans le corps. Anti-forgerie :
  la session `SameSite=Strict` seule (ADR-0011, `I13`), aucun jeton dédié.
  Écarté : une route unique pour les trois réglages (un refus d'une carte bloquerait les autres, et les
  brouillons doivent rester indépendants).
- **L'écran** est `src/pages/admin/reglages.astro`, servi dans `GabaritCadre` avec `rubrique="reglages"`.
  `IdRubriqueServie` reçoit `'reglages'` et la rubrique son `href`. Les trois cartes sont rendues côté
  serveur (contenu courant présent sans script, comme le cadre), puis animées par des îlots montés depuis
  `monter.ts` : `CarteCoordonnees.svelte`, `CarteReseaux.svelte` et, pour la mention, l'îlot
  `TexteRiche` existant. Aucune directive `client:*` (`I4`, ADR-0006), aucun `set:html` (`I5`) : la
  mention est passée en Markdown à l'éditeur, jamais injectée en HTML. Couleurs par les tokens
  d'`admin.css` uniquement (`I14`) ; CSP inchangée (`I11`, `I12`, `I15`).
- **`TexteRiche` reçoit son adresse d'enregistrement en propriété** au lieu de la composer : l'éditeur de
  page lui passe `/admin/pages/<slug>/emplacements/<id>`, l'écran des réglages `/admin/reglages/mention`.
  De même, `soumettreCorrection` reçoit l'adresse au lieu de `(slug, idEmplacement)`. C'est un
  remaniement sans changement de comportement pour les pages, couvert par leurs tests existants.

## Risks / Trade-offs

- [Une liste libre de liens accepte n'importe quel site en `https`] → c'est le site de l'éditrice et le
  choix humain ; `https` seul ferme les schémas dangereux (`javascript:`, `data:`), et la story du site
  public devra rendre nom et adresse **échappés**, jamais en HTML brut (`I5`).
- [La vérification d'un téléphone ou d'une adresse e-mail est une approximation] → bornes explicites et
  testées aux limites ; le but est d'arrêter la faute de frappe, pas de prouver qu'un numéro existe.
- [La déclaration change sous un brouillon (coordonnée retirée ou renommée par l'intégrateur)] → la
  valeur se rattache par l'identifiant stable ; une valeur orpheline est ignorée à la lecture, jamais
  une erreur.
- [Remanier `TexteRiche` et `soumettreCorrection` peut casser l'édition des pages] → remaniement isolé
  dans un ticket, sous les tests d'intégration existants des pages, avant l'écran de la mention.
- [Corps de requête démesuré] → taille de corps bornée côté route (voir security-review.md).

## Migration Plan

- Migration D1 additive `0007_brouillons_reglages.sql`, aucune donnée existante à reprendre. Le
  répertoire `content/reglages/` est garni pour la démonstration.
- Retour arrière : retirer la migration, l'écran et la route ; aucun contenu publié n'est touché par ce
  change.

## Open Questions

- Aucune qui change les specs ou le découpage. L'ADR proposé ci-dessus reste à écrire et à accepter
  avant le ticket de la déclaration ; s'il s'écarte de la forme proposée, seul ce design est à reprendre.
