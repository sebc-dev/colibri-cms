## Context

Voir proposal.md — Why pour la motivation. L'administration a déjà : la connexion (001, cookie de session
`SameSite=Strict`) et le socle d'îlots (002, candidat `ilots-svelte-5` — hydratation d'îlots
d'administration sous CSP stricte, sans directive `client:*` sous `src/admin/`). Ce change pose le premier
parcours d'édition par-dessus. Il est transverse (cadre UI, routes admin, logique `core/`, persistance D1,
migration, nouvelle dépendance TipTap) et touche la sécurité (première écriture depuis une session ouverte)
— d'où ce design. Il reste JETABLE : les décisions structurantes qu'il pointe sont figées par un ADR
accepté ou déposées en candidat (voir Decisions), jamais gravées ici.

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
  `ilots-svelte-5`, ADR-0006 : aucune directive `client:*` sous `src/admin/`). La barre latérale et le
  menu sont ce même îlot, pas une hydratation par page. L'état replié/déployé est une préférence retenue
  sur l'appareil (UX-2), sans effet serveur. Seule « Mes pages » y est branchée. Servi sous la CSP stricte
  de l'administration (ADR-0004, ADR-0008), sans script en ligne ni `client:*` (ADR-0006) ; seuls les
  attributs `style="…"` des primitives y sont tolérés (ADR-0010).
- **Le modèle d'emplacement et l'application d'une correction vivent dans `core/`, sans base ni HTTP** —
  candidat `core-sans-framework-ni-plateforme` (`src/core/` n'importe ni framework ni plateforme) et
  ARCH-5. Appliquer une correction à un brouillon, en dériver l'état « porte un brouillon », refuser une
  correction de structure : logique pure, couture de test la plus haute (ADR-0003, Vitest dans `workerd`).
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
  cookie de session `SameSite=Strict` posé par 001, non attaché à une requête cross-site, sans introduire
  de jeton dédié. Décision figée par ADR-0011.
- **La déclaration des pages et emplacements est posée par l'intégrateur, hors administration** — le
  produit la lit, ne l'écrit pas (FR-024/025). Lieu et contrat sont figés par ADR-0012 : un répertoire de
  contenu versionné du dépôt, au **même format que le contenu déposé à la publication** (un `page.json`
  par page portant, pour chaque emplacement, son identifiant stable, sa nature et son rang ; un `.md` par
  emplacement de texte riche — candidat `format-du-contenu-un-repertoire-par-objet`). La déclaration vit
  dans `content/pages/<slug>/page.json`, le nom du répertoire portant l'identité de la page ; les `.md`
  d'emplacement du ticket 03 vivront dans ce même répertoire. Le modèle et la lecture de cette
  déclaration vivent dans `core/`, et le brouillon D1 s'y rattache par la clé
  `(page, identifiant d'emplacement)`.

## Risks / Trade-offs

- [Un script tiers chargé dans l'îlot admin = risque XSS same-origin contre le cookie de session] →
  CSP stricte de l'administration (ADR-0004, ADR-0008 ; `script-src` non rouvert par ADR-0010), aucun
  script en ligne, TipTap embarqué dans le bundle de l'îlot, pas de CDN.
- [TipTap comme nouvelle dépendance élargit la surface] → montée bornée à l'éditeur de texte riche, marques
  et schémas d'URL réduits à une liste testée en aller-retour ; toute marque hors liste écartée à la
  sérialisation.
- [La reconnaissance d'un lien de vidéo et la liste des schémas d'URL peuvent dériver] → logique pure de
  `core/`, testée en aller-retour, un seul lieu de vérité.
- [Décisions structurantes figées prématurément] → design JETABLE ; chaque décision structurante est
  portée par un ADR accepté (ADR-0011, ADR-0012) ou déposée en candidat, pas gravée ici.

## Migration Plan

- Nouvelle table D1 des brouillons via migration versionnée (`wrangler d1 migrations`, additive) ; aucune
  donnée existante à reprendre. Rollback : retrait de la migration ; l'état publié n'est jamais touché par
  ce change, donc aucun risque sur le site en ligne.

## Open Questions

- (aucune reportable sans changer les specs, l'approche ou le découpage — le lieu et le contrat de la
  déclaration sont tranchés par ADR-0012, et le magasin D1 par le candidat listé ci-dessus.)
