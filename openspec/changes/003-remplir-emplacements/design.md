## Context

Voir proposal.md — Why pour la motivation. L'administration a déjà : la connexion (001, cookie de session
`SameSite=Strict`) et le socle d'îlots (002, candidat `ilots-svelte-5` — hydratation d'îlots
d'administration sous CSP stricte, sans directive `client:*` sous `src/admin/`). Ce change pose le premier
parcours d'édition par-dessus. Il est transverse (cadre UI, routes admin, logique `core/`, persistance D1,
migration, nouvelle dépendance TipTap) et touche la sécurité (première écriture depuis une session ouverte)
— d'où ce design. Il reste JETABLE : les décisions structurantes qu'il pointe sont déposées en candidats
d'ADR (voir Decisions), pas figées ici.

## Goals / Non-Goals

**Goals :**
- Poser le cadre de navigation (barre latérale rétractable + menu) comme substrat commun des écrans
  d'édition, en un unique îlot d'administration.
- Isoler dans `core/` la logique pure d'édition d'un brouillon (appliquer, dériver l'état, refuser la
  structure, reconnaître un lien de vidéo, sérialiser le texte riche) — la couture de test la plus haute.
- Persister le brouillon en D1 sans jamais toucher l'état publié, jusqu'à une publication (feature distincte).

**Non-Goals :**
- Les rubriques autres que « Mes pages » (features distinctes) ; les emplacements porteurs d'image
  (FR-019/020/021, renvoyés à « Bibliothèque de médias ») ; l'aperçu et la publication (FR-080→091) ;
  l'abandon d'un brouillon (FR-092→094) ; la déconnexion explicite ; la saisie de la déclaration des
  pages/emplacements (geste d'intégration hors produit).
- Le rendu HTML du Markdown (I5 / `render/markdown/`) : il naît avec l'aperçu, hors de ce change.

## Decisions

- **Le cadre est un unique îlot d'administration monté en application** — substrat de 002 (candidat
  `ilots-svelte-5`, ADR-0024 : aucune directive `client:*` sous `src/admin/`). La barre latérale et le
  menu sont ce même îlot, pas une hydratation par page. L'état replié/déployé est une préférence retenue
  sur l'appareil (UX-2), sans effet serveur. Seule « Mes pages » y est branchée. Servi sous CSP stricte
  (ADR-0010), sans script en ligne ni `client:*` (ADR-0006).
- **Le modèle d'emplacement et l'application d'une correction vivent dans `core/`, sans base ni HTTP** —
  ADR-0022 (`src/core/` n'importe ni framework ni plateforme) et ARCH-5. Appliquer une correction à un
  brouillon, en dériver l'état « porte un brouillon », refuser une correction de structure : logique pure,
  couture de test la plus haute (ADR-0013, Vitest dans `workerd`).
- **Le brouillon est porté par D1** — candidat `magasin-d1-brouillons-etat-publie-et-demandes` : la
  correction écrit le brouillon de la page ; l'état publié reste intact jusqu'à la publication. Table créée
  par une migration versionnée (`wrangler d1 migrations`), liant le brouillon à l'emplacement par son
  identité stable.
- **Le texte riche est édité par TipTap et sérialisé en Markdown restreint** — candidat
  `texte-riche-markdown-restreint` : l'éditrice met en forme, elle n'écrit pas de balise (FR-117) ; seules
  les marques et schémas d'URL retenus survivent (`https`, `mailto`, `tel`, chemins relatifs). Le rendu
  HTML n'est pas ici (I5 / `render/markdown/`, naît avec l'aperçu).
- **Première écriture depuis une session ouverte → aucun jeton anti-forgerie dédié** — 001 renvoyait le
  jeton « à la première écriture » ; enregistrer une correction l'est. La décision retenue s'appuie sur le
  cookie de session `SameSite=Strict` posé par 001, non attaché à une requête cross-site (ADR-0011), sans
  introduire de jeton dédié. Décision structurante déposée en candidat.
- **La déclaration des pages et emplacements est posée par l'intégrateur, hors administration** — le
  produit la lit, ne l'écrit pas (FR-024/025) ; sa forme s'accorde au format déposé (candidat
  `format-du-contenu-un-repertoire-par-objet`). Lieu et contrat déposés en candidat.

## Risks / Trade-offs

- [Un script tiers chargé dans l'îlot admin = risque XSS same-origin contre le cookie de session] →
  CSP stricte (ADR-0010), aucun script en ligne, TipTap embarqué dans le bundle de l'îlot, pas de CDN.
- [TipTap comme nouvelle dépendance élargit la surface] → montée bornée à l'éditeur de texte riche, marques
  et schémas d'URL réduits à une liste testée en aller-retour ; toute marque hors liste écartée à la
  sérialisation.
- [La reconnaissance d'un lien de vidéo et la liste des schémas d'URL peuvent dériver] → logique pure de
  `core/`, testée en aller-retour, un seul lieu de vérité.
- [Décisions structurantes figées prématurément] → design JETABLE ; chaque décision structurante est
  déposée en candidat d'ADR, pas gravée ici.

## Migration Plan

- Nouvelle table D1 des brouillons via migration versionnée (`wrangler d1 migrations`, additive) ; aucune
  donnée existante à reprendre. Rollback : retrait de la migration ; l'état publié n'est jamais touché par
  ce change, donc aucun risque sur le site en ligne.

## Open Questions

- (aucune reportable sans changer les specs, l'approche ou le découpage — les lieux/contrats de la
  déclaration et du magasin D1 sont tranchés en candidats d'ADR listés ci-dessus.)
