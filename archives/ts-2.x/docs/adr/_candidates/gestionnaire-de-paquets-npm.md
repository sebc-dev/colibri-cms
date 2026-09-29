# Candidat ADR : Gestionnaire de paquets — npm
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0031-gestionnaire-de-paquets-npm.md` (ADR-0031 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — le numéro 2.x est attribué à la promotion, un geste humain dans `docs/adr/`.

(l. 38-46) — arbitré là faute d'un porteur dans `docs/stack.md` ou dans le registre des 30 ADR
précédents

## Contexte

Le cooldown de dépendances (`min-release-age`, 7 jours — voir `docs/ci.md` § Approvisionnement)
n'est pas un job CI : c'est une **clé du résolveur de paquets**, posée à l'installation. Ce choix
suppose donc un gestionnaire de paquets arrêté — et rien ne le tranchait. `docs/stack.md` ne le
mentionne nulle part (sa seule occurrence de `npm` est un `npm pack` de vérification, sans rapport)
et aucun des 30 ADR acceptés ne le porte. L'audit du 14/08 de `docs/ci.md` a relevé ce trou de
traçabilité : la décision existe en prose (l. 38-46), sans ADR qui la fixe.

Trois faits mesurés sur la machine de développement le 2026-08-14 :

- `npm 11.16.0` est présent et porte nativement `min-release-age`, **en jours** (`npm config ls -l`
  ; documentation embarquée `docs/content/using-npm/config.md` de la distribution installée) ;
- **`pnpm` n'est pas installé** ;
- `bun 1.3.14` est présent, et son aide n'expose aucun équivalent à `min-release-age`.

Le motif qui avait retenu `pnpm` au socle v1 — « le cooldown est une mécanique propre à pnpm » —
n'est donc plus vrai : npm la porte nativement depuis sa version 11.

## Décision

Nous retenons **npm** comme gestionnaire de paquets du projet.

## Conséquences

**Positives.**

- Le cooldown de dépendances (`min-release-age = 7` dans `.npmrc`) est une **clé de configuration
  native**, pas un contrôle maison à écrire et à maintenir.
- npm est déjà le gestionnaire supposé par tous les jobs CI existants (`npm ci`, `npm run <script>`
  dans `.github/workflows/ci.yml`) : aucune reprise des workflows n'est nécessaire.

**Négatives — ce à quoi le choix engage.**

- **`pnpm` et `bun` restent écartés** malgré des atouts propres (espace disque partagé pour l'un,
  vitesse d'exécution pour l'autre) sur le seul critère du cooldown natif. Si l'un des deux
  rattrape `min-release-age`, la balance pourrait changer — mais ce n'est pas mesuré aujourd'hui.
- **Si le scaffold retient un autre gestionnaire**, `docs/ci.md` et les workflows sont à reprendre
  ensemble : la clé de cooldown, les commandes `npm ci`/`npm run`, et cet ADR.

## Alternatives considérées

- **`pnpm`** — motif historique (socle v1) : le cooldown y était vu comme une mécanique propre à
  cet outil. Écarté : npm 11 porte désormais `min-release-age` nativement, et `pnpm` n'est pas
  installé sur la machine de développement.
- **`bun`** — présent (1.3.14) mais son aide n'expose aucun équivalent au cooldown de dépendances.
- **Un job CI maison qui rejoue la résolution de dépendances** pour tenir le cooldown sans dépendre
  du résolveur — écarté (voir `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md` § Écarté) :
  il échoue au facteur maintenance qu'un contrôle maison porte déjà ailleurs, et npm porte la clé
  nativement.

## Vérifiable ?

Oui, indirectement — `min-release-age` est une clé du **résolveur** (`.npmrc`), portée nativement par `npm 11.16.0`, et non un job de CI. Le fichier se lit.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — les trois faits sont mesurés sur machine par la
  campagne de recherche du 14/08 ; le choix reprend l'arbitrage déjà écrit dans `docs/ci.md`.
  Revue humaine : 2026-08-14 — candidat posé par le chantier `2026-08-14-traitement-audit-ci.md`
  (M2), promu par `/scd-sdd:adr`.
