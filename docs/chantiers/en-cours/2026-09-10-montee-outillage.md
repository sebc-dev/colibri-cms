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
