## Context

Voir `proposal.md` § Why pour la motivation. État relevé dans le code le 2026-11-02 :

- **Trois tables de brouillons**, dont la seule présence d'une ligne fait la marque de brouillon :
  `brouillons_emplacements` (une ligne par emplacement corrigé, clé `(page_slug, id_emplacement)`,
  `migrations/0004`), `brouillons_reglages` (clé `reglage` ∈ `coordonnees` | `reseaux` | `mention`,
  `migrations/0007`) et `brouillons_formulaires` (clé `formulaire`, `migrations/0008`).
- **L'état publié est déjà copié en D1** (`migrations/0010_etat_publie.sql`, ADR-0019), un seul cran par
  objet. Chaque écran calcule le contenu courant par la même superposition : brouillon, sinon publié,
  sinon contenu de départ de la déclaration (`src/pages/admin/pages/[slug].astro`,
  `src/pages/admin/reglages.astro`, `src/core/formulaires/brouillon.ts` `optionsCourantes`,
  `src/core/publication/plan.ts`, l'aperçu). Supprimer la ligne de brouillon suffit donc à faire
  reparaître la dernière version publiée, ou le contenu de départ, partout à la fois.
- **Seule la publication supprime un brouillon** aujourd'hui (`finaliser`,
  `src/platform/publication/magasin.ts:217-296`), sous condition `maj_le = ?`.
- **Le verrou de publication** (table `publication`, ADR-0023) porte un `instantane` non nul de la
  confirmation jusqu'à la fin du dépôt, y compris quand la publication s'est interrompue et attend sa
  reprise. Cet instantané contient déjà le contenu des brouillons confirmés.
- **Le compteur d'identifiants d'option** (`derniersNumeros`) vit dans le brouillon et dans le publié
  d'un formulaire. `plafondDesNumeros` (`src/core/formulaires/options.ts:183`) prend le maximum de la
  déclaration, du brouillon, du publié et de la soumission. Supprimer le brouillon perdrait les numéros
  qu'il était seul à porter.
- **La marque de brouillon** se révèle sans recharger par `afficherPastilleDansLaZone`
  (`src/admin/pastille-brouillon.ts`), qui ne sait que l'ajouter.
- **Le motif de confirmation** existe : la suppression d'un média ouvre un `Dialog` de `bits-ui`
  (`src/admin/ilots-svelte-5/FicheMedia.svelte`, ADR-0009).

## Goals / Non-Goals

**Goals**
- Un geste par objet publiable (page, réglage, formulaire) qui supprime son brouillon et lui seul.
- Le geste refusé pendant une publication confirmée non terminée, de façon atomique.
- Aucun identifiant d'option redonné après un retour.

**Non-Goals**
- Revenir sur un seul emplacement, sur la description ou le nom d'une image.
- Tout historique, toute lecture du dépôt du client.
- Défaire le geste.

## Decisions

### D1 — Supprimer la ligne de brouillon, ne rien recopier

Le geste supprime les lignes de brouillon de l'objet : toutes celles de `brouillons_emplacements` pour
`page_slug = ?`, y compris celles d'emplacements que la déclaration ne porte plus ; la ligne de
`brouillons_reglages` ou de `brouillons_formulaires`. Il ne copie rien depuis `publies_*`.

*Pourquoi.* La superposition existante fait déjà reparaître le publié, ou le départ. Recopier le publié
au brouillon ferait porter une marque de brouillon à un objet identique au publié.

*Écarté.* Écrire au brouillon une copie du publié : marque fausse, et l'objet resterait au récapitulatif.

### D2 — Refus atomique pendant une publication

La suppression et la lecture du verrou partent dans un seul `db.batch` (une transaction D1). La
suppression porte la condition `and not exists (select 1 from publication where id = 1 and instantane is
not null)`. La seconde instruction lit `instantane is not null`. Si elle est vraie, la route répond
`409` avec la raison `publication-en-cours`, et rien n'a été supprimé. Sinon le geste aboutit, qu'il ait
supprimé une ligne ou non (spec : un objet sans brouillon ne change rien et le geste aboutit). La table
`publication` est assurée avant (`assurerTablePublication`), comme le font déjà les lectures du verrou.

*Pourquoi.* Un contrôle puis une suppression séparés laisseraient une confirmation de publication se
glisser entre les deux. Le refus couvre aussi la publication interrompue, car son instantané reste en
place jusqu'à la reprise (ADR-0023).

*Écarté.* Laisser abandonner pendant la publication et la laisser déposer le contenu confirmé : le geste
mentirait, puisque la correction partirait en ligne.

### D3 — Le compteur d'options survit dans une table propre

Une migration additive crée `numeros_options(formulaire, champ, dernier, primary key (formulaire,
champ))`. Au retour d'un formulaire, la route lit son brouillon, calcule par champ le plus grand numéro
qu'il porte (`derniersNumeros` et suffixes des options), puis envoie dans le même `db.batch` :
1. un upsert `dernier = max(dernier, excluded.dernier)` par champ ;
2. la suppression du brouillon, sous `maj_le = ?` (la valeur lue) et sous la condition de D2.

Si la suppression ne touche aucune ligne alors que le brouillon existe encore (enregistré entre la lecture
et le batch), la route relit et recommence, trois fois au plus, puis répond `409` avec la raison
`modifie-pendant-le-retour`. `plafondDesNumeros` reçoit cette table comme cinquième source.

*Pourquoi.* La ligne publiée n'existe pas pour un formulaire jamais publié, et en créer une le ferait
passer pour publié. Le brouillon ne peut pas rester, puisque sa présence fait la marque.

*Écarté.* Accepter qu'un numéro donné au seul brouillon revienne : la spec `publication` (« publié ou
non ») et ADR-0026 l'interdisent.

### D4 — Trois routes minces, un magasin par genre

`POST /admin/pages/[slug]/revenir`, `POST /admin/reglages/[reglage]/revenir` et
`POST /admin/formulaires/[id]/revenir`. Chacune suit le patron de `src/pages/admin/formulaires/[id]/options.ts` :
`verifierSession` puis `401` (ADR-0007), `404` pour un objet absent de la déclaration, aucun corps lu,
anti-forgerie par le cookie `SameSite=Strict` (ADR-0011). La suppression vit dans le magasin de chaque
genre (`src/platform/brouillons/magasin.ts`, `src/platform/reglages/magasin.ts`,
`src/platform/formulaires/magasin.ts`), la condition de D2 dans un fragment SQL partagé exporté par
`src/platform/publication/magasin.ts`. Le calcul du plus grand numéro est une fonction pure de
`src/core/formulaires/options.ts`.

### D5 — Un îlot de confirmation partagé, rechargement de l'écran au succès

Un îlot `RevenirVersionPubliee.svelte` porte le bouton, le `Dialog` (même habillage que la suppression
d'un média) et l'appel à la route. Il est monté une fois par objet : dans le fil de retour de l'éditeur de
page, dans l'en-tête de chaque carte de réglage, dans l'en-tête de l'écran d'un formulaire. Il reçoit le
nom de l'objet en propriété et l'affiche en texte (jamais `{@html}`). Il reste caché tant que l'objet ne
porte pas de brouillon. `afficherPastilleDansLaZone` émet un événement `brouillon-enregistre` sur la zone
quand elle révèle la marque ; l'îlot de la zone l'écoute et se montre.

Au succès, l'îlot recharge l'écran (`location.reload()`). Le serveur rend alors le contenu courant et
l'absence de marque par le chemin déjà testé. Au refus, l'îlot garde la confirmation ouverte et y affiche
le message.

*Pourquoi.* Remettre à jour en place chaque îlot d'édition (texte riche, galerie, options…) demanderait
une remise à zéro propre à chacun, pour un geste rare. Le rechargement passe par le rendu serveur que la
spec de chaque écran couvre déjà.

*Écarté.* Retirer la marque et réinitialiser chaque îlot en place : sept natures d'emplacement et trois
cartes à reprogrammer.

### D6 — Textes

Les textes vivent dans `src/admin/textes.ts` : le bouton « Revenir à la version publiée », le titre et le
corps de la confirmation (le nom de l'objet, « Vos modifications seront perdues. »), les boutons « Garder
mes modifications » et « Revenir à la version publiée », le refus pendant une publication, l'échec réseau.
Aucun terme de développeur (FR-117).

## Architecture

Éléments LikeC4 touchés : `colibri-cms.worker.routes` (trois routes), `colibri-cms.worker.admin` (l'îlot,
les textes, la pastille), `colibri-cms.worker.platform` (les magasins), `colibri-cms.worker.core` (le
plafond des numéros), `colibri-cms.d1` (la table `numeros_options`). Aucune relation nouvelle : routes →
platform (« lit et écrit les brouillons »), routes → admin et platform → d1 existent déjà. Le `.c4` n'est
pas modifié ; la description de `colibri-cms.d1` couvre déjà les brouillons des formulaires.

Aucun ADR nouveau : le geste applique ADR-0019 (FR-092 y est déjà servi), ADR-0023 (verrou) et ADR-0026
(compteur), sans décision structurante neuve.

## Risks / Trade-offs

- [Une correction enregistrée dans un autre onglet juste avant le retour d'une page ou d'un réglage est
  perdue avec le reste] → C'est le sens du geste : il abandonne le brouillon tel qu'il est. La
  confirmation dit que les modifications seront perdues. Seul le formulaire garde la condition `maj_le`,
  pour son compteur (D3).
- [`location.reload()` perd la position de défilement] → Geste rare ; l'écran repart en haut, où se
  trouve la marque.
- [Le refus pendant une publication interrompue dure jusqu'à la reprise] → Le message dit qu'une
  publication est en cours ; la publication suivante la reprend (ADR-0023).
- [La CSP de l'administration n'est pas vue par les tests workerd] → Le parcours navigateur
  (`tests/parcours/`) joue le geste de bout en bout.

## Migration Plan

Une migration additive (`numeros_options`), créée aussi paresseusement par le magasin comme les autres
tables. Aucune donnée existante n'est réécrite. Retour arrière : retirer les routes et l'îlot ; la table
reste, inerte.
