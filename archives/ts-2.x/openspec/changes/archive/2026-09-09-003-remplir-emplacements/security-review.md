## Surface

Ce change ouvre la **première écriture depuis une session ouverte**. Trois surfaces neuves, toutes
derrière la garde de session posée par 001 ; aucune route publique n'est ajoutée et le site public
reste statique et intact (FR-026).

- **Routes d'écriture d'une correction** (`src/pages/admin/`, ticket 04, réutilisées telles quelles
  par 05 et 06) : la colonne vertébrale d'écriture de l'administration. Elle s'appuie sur le cookie
  `__Host-session` `SameSite=Strict` de 001 et **n'introduit aucun jeton anti-forgerie dédié**
  (ADR-0011, `docs/security.md` § Politique — *Anti-forgerie par le cookie*).
- **Trois entrées externes saisies par l'éditrice** : libellé et destination d'un bouton d'action
  (04), lien de vidéo (05), texte riche sérialisé en Markdown restreint (06).
- **Nouvelle table D1 des brouillons** et sa migration versionnée (04) : la première écriture du
  produit dans D1 hors du domaine d'authentification. Clé `(page, identifiant d'emplacement)`
  (ADR-0012).
- **Nouvelle dépendance embarquée dans le bundle de l'îlot d'administration** : TipTap (06), servi
  sur l'origine commune au public et à l'administration.
- **Lecture de la déclaration des pages et emplacements** par `core/` (`page.json` + `.md`, ADR-0012) :
  entrée de confiance posée par l'intégrateur dans le dépôt, jamais écrite depuis l'administration.

## Menaces

- **Écriture forgée cross-site (CSRF)** sur les nouvelles routes — 04 pose la forme dont 05 et 06
  héritent.
- **XSS same-origin contre le cookie d'administration** — la menace de tête de `docs/security.md`,
  puisqu'un seul Worker sert le public et l'administration. Trois vecteurs ici : une destination de
  bouton en `javascript:` (04), un lien de vidéo non validé (05), et du HTML qui traverserait la
  sérialisation du texte riche (06).
- **Correction visant la structure** (ajouter, retirer, déplacer, renommer un emplacement, ou viser
  un emplacement non déclaré) : c'est un contrôle d'**autorisation métier** (FR-024/025), distinct de
  l'authentification — une session valide ne l'ouvre pas.
- **Injection SQL** sur la table des brouillons (04).
- **Élargissement de la surface script** par TipTap (06) : chargement depuis un CDN, script en ligne,
  ou `eval` rouvriraient `script-src`.
- **Vocabulaire de développeur dans un message d'erreur** (FR-117) : pas une faille, mais un invariant
  produit qui se relit au même endroit que la validation des entrées.

## Mitigations

- **CSRF** → cookie de session `SameSite=Strict` seul (ADR-0011). Ce qu'il faut scruter sur le diff
  de 04 : que la route d'écriture n'accepte que la méthode attendue, qu'elle ne se replie sur aucune
  authentification par en-tête ou par paramètre d'URL, et que rien n'assouplisse `SameSite` dans
  `src/platform/session/`. SC-04g en porte la preuve.
- **XSS** → la validation vit dans `core/`, pure et en un seul lieu : reconnaissance du lien de vidéo
  (05), liste blanche de schémas d'URL `https`, `mailto`, `tel` et chemins relatifs pour les liens du
  texte riche (06) et pour la destination du bouton d'action (04, scénario « Une destination de bouton
  hors liste blanche est refusée », SC-04h). Et que **rien ne rende de HTML** : ce change sérialise vers
  du Markdown restreint, il ne fabrique aucune balise ; toute occurrence de `{@html}` ou `set:html` hors
  de `src/render/markdown/` viole l'invariant `I5` (`docs/architecture.md`).
- **Correction de structure** → refus en `core/`, sur la déclaration lue (SC-04c) : le nombre, la
  nature et l'ordre des emplacements ne se dérivent jamais de la requête. À scruter : que
  l'identifiant d'emplacement reçu soit vérifié **contre la déclaration** avant toute écriture, et
  non simplement inséré en base.
- **Injection SQL** → API D1 native avec requêtes liées, sans concaténation (candidat
  `acces-aux-donnees-api-d1-native-et-migrations-wrangler`). Migration additive et versionnée : elle
  ne touche ni les tables d'authentification ni l'état publié.
- **Surface script** → TipTap embarqué dans le bundle de l'îlot, **aucun CDN**, aucun script en ligne.
  La CSP stricte de l'administration (ADR-0004, ADR-0008) reste inchangée : `script-src` n'est pas
  rouvert, et ADR-0010 ne tolère que les **attributs** `style="…"`. À scruter sur le diff de 06 : tout
  ajout de directive CSP, toute URL externe, tout `eval` introduit par la dépendance.
- **FR-117** → les messages de refus (lien de vidéo, correction rejetée) se relisent mot à mot :
  aucun terme de développeur, aucune trace technique renvoyée à l'éditrice. SC-05e et SC-06f en
  portent la preuve.

## Données

Aucune donnée personnelle de visiteur : ce change ne touche ni les demandes, ni les compteurs de
fréquence. Les données écrites sont le **contenu éditorial non publié** — le brouillon d'une page,
en D1 — rattaché à un emplacement déclaré, jamais à une personne. L'état publié n'est jamais écrit
par ce change. Aucun secret n'est introduit, et aucun identifiant appartenant à Isometria
(`docs/security.md` § Politique, SC-012/SC-013).
