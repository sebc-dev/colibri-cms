# Montée de l'outillage Cloudflare et Astro

Portée : hors-cycle
Ouvert le 2026-09-10 · branche `chore/chantier-montee-outillage` · HEAD `d14dd9a`

## Objectif
J'allais rendre à `astro` sa contrainte `^`, en dénouant la cascade qui m'a forcé à l'épingler :
l'adaptateur Cloudflare, `wrangler`, `miniflare` et le pool de test se tiennent par la main.

## Contexte à charger
à lire      `.npmrc` — le gel de 7 jours qui décide ce qui est installable à la résolution (8 l.)
à lire      `package.json` — les quatre contraintes en jeu et leurs formes actuelles (61 l.)
à situer    `docs/chantiers/archive/2026-09-10-session-qualite.md` — la session d'où vient ce
            chantier ; ce qui compte est distillé ici, ne pas la relire
à situer    `docs/ci.md` › encadré « `npm run mutation` » — le relevé nocturne dépend de cet
            outillage ; à relire seulement si la montée casse la mesure

## Acquis
- **La cascade ne se fait pas en passant, c'est mesuré.** `astro` 7.3 retire l'export
  `beginContentEntryCollection` que `@astrojs/cloudflare@14.2.0` importe ; l'adaptateur 14.3.0
  réclame `wrangler ^4.125.0` ; et `@cloudflare/vitest-pool-workers` est une rupture majeure.
- **J'ai décidé d'épingler `astro` en `~7.2.10`** — plancher de sécurité contre la faille critique,
  et non un choix de style. Ce `~` redevient `^` quand la cascade est dénouée : c'est le signal que
  ce chantier est clos.
- Le gel de 7 jours écarte toujours les deux ou trois versions les plus fraîches au moment de
  résoudre — inutile de viser la dernière publiée, elle ne s'installera pas.
- `svgo` attend la même montée : il ne se corrige que lorsque `astro` adopte 4.1.0.

## Prochaine étape
Commencer par `@cloudflare/vitest-pool-workers`, qui porte la rupture majeure et entraîne
`miniflare` puis `wrangler` — et qui est renommé `@cloudflare/vitest-plugin` en 1.0.0, avec un
codemod officiel.
Seulement ensuite `astro` et son adaptateur, ensemble.

## Écarté
- **Monter `astro` seul en 7.3** — le build meurt en `MISSING_EXPORT` sur l'adaptateur.
- **Monter l'adaptateur seul en 14.3** — `ERESOLVE` : il réclame un `wrangler` plus récent.
- **`npm audit fix`** — jamais tenté délibérément : il embarquerait la rupture majeure sans
  arbitrage.

## Issue
Livré par la PR #82 en trois commits — `b5274b4` (le renommage du pool de test), `27460fb` (`astro`
et son adaptateur) et `0f20df8` (ADR-0014). Ouverte et verte à la clôture, pas encore fusionnée.
L'objectif est atteint : `astro` porte `^7.3.1`, le `~` de sécurité a disparu, et c'était le signal
que la fiche s'était elle-même donné.

**Deux prémisses de cette fiche étaient fausses, et les deux se mesuraient.** La « rupture majeure »
de `@cloudflare/vitest-pool-workers` n'en est pas une : les deux paquets dépaquetés côte à côte ont
une surface publique identique à une addition près, sans aucune suppression, et des déclarations
`cloudflare:test` identiques à un commentaire près — la majeure 1.0.0 ne porte qu'un renommage, et
ce dépôt utilisait déjà l'API plugin (`cloudflareTest`). Et `svgo` n'attendait pas qu'`astro` adopte
4.1.0 : `astro` réclamait `^4.0.1` **déjà en 7.2.10**, donc 4.1.0 était admissible depuis sa
publication du 24/08 ; seul le lockfile retenait 4.0.2, et `npm update svgo` a suffi à fermer son
alerte haute. La leçon qui vaut au-delà : une contrainte de paire se lit sur le registre, pas
depuis l'échec d'une montée voisine.

**Dividende non prévu** : aligner `wrangler` sur le `4.129.0` qu'épingle le plugin a fait converger
tout l'arbre. Un seul `wrangler`, un seul `miniflare`, un seul `workerd` (1.20260903.1) pour le pool
de test, `wrangler d1` et l'adaptateur Astro, là où deux chaînes cohabitaient. C'est aussi ce qui a
livré d'avance le `^4.125.0` que réclamait l'adaptateur 14.3.0 : le second maillon n'avait plus de
bloqueur quand on y est arrivé.

**Coût imprévu** : ADR-0003 nommait le paquet **et** la famille `0.21.x`, les deux devenues fausses.
Un ADR étant immuable, il a fallu ADR-0014 — le premier remplacement du dépôt, qui a donc aussi
fixé la convention de lecture d'un remplacement dans `docs/adr/README.md`. ADR-0014 ne nomme plus
aucune famille de versions : c'est la clause d'ADR-0003 qui est morte, et la mort valait d'être
tirée au clair.

Ce qui n'est pas fait et ne relève plus de cette fiche : les **9 alertes restantes**, toutes dans
l'arbre de développement et sans correctif atteignable ici (`sharp` via `miniflare`,
`vitest`/`@vitest/mocker`, `js-yaml`) ; le **relevé de mutation**, jamais rejoué depuis la montée —
`docs/ci.md` note déjà qu'aucun score n'a été relevé depuis les correctifs du 10/09, il n'y a donc
aucune base de comparaison, et le passage du mécanisme (le pont `__MUTANT_ACTIF_HOTE__`) à travers
le renommage reste non vérifié ; et **Playwright**, toujours pas installé, consigné comme tel dans
ADR-0014.
