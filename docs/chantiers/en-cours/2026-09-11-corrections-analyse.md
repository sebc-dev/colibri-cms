# Résorber ce que la passe d'analyse lève sur `src/`

Portée : hors-cycle
Ouvert le 2026-09-11 · Actualisé le 2026-09-11 · branche `chore/chantier-corrections-analyse` · HEAD `ff7d8e3`

## Objectif
J'allais traiter par petits lots ce que `npm run analyse` lève sur `src/`, puis retirer les deux
extinctions qui ne tiennent qu'à une API dépréciée en amont — pour que le check devienne vert, et
donc promouvable en bloquant.

## Contexte à charger
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — les deux régimes, le calibrage assumé et
            la limite `.astro`/`.svelte` ; porte aussi deux chiffres à reprendre en fin de chantier
            — « sept règles éteintes » là où la config en porte huit, et un décompte de `src/` que
            chaque lot périme (189 l., seule cette section compte)
à lire      `eslint.config.analyse.js` — les extinctions `tests/**` et leur motif ; c'est ici qu'on
            en retire une quand sa cause disparaît, et ici qu'on en ajoutera une pour `pages.ts` (78 l.)
à situer    `docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md` — la fiche du montage,
            conclusions déjà distillées ici, ne pas la relire
à situer    `.claude/agents/quality-analyse.md` — la règle de périmètre du diagnostiqueur ; à ouvrir
            seulement si un run se met à remonter l'arriéré au lieu des fichiers du ticket

## Acquis
- J'ai décidé de poser l'instrument sans traiter ce qu'il montre : mêler les deux rendait le diff
  illisible et faisait passer un refactor de `core/` pour de la configuration.
- J'ai retenu un ordre qui n'est pas celui du volume : les constats de `src/` qui demandent un regard
  d'abord, la migration `SELF`/`env` en dernier.
- J'ai appris que `--fix` n'est pas « rien à juger » : sur trois corrections proposées, deux cassaient
  `tsc`. Relire le diff ET rejouer le typage fait partie du lot, ce n'est pas un supplément.
- Les deux `as Record<…>` sur `import.meta.glob` de `src/platform/contenu/pages.ts` sont des FAUX
  POSITIFS de `no-unnecessary-type-assertion` — le programme TypeScript que résout le projectService
  d'ESLint n'est pas celui de `tsc`. Ce sont les seules corrections que `--fix` propose encore sur
  `src/` : le vert passera par une extinction motivée, comme celles de `tests/**`, pas par une
  correction.
- Deux constats de `src/` sentent le défaut réel et non le style — une comparaison toujours vraie et
  un `reduce()` sans valeur initiale, tous deux dans `core/pages/texte-riche.ts`. Pas encore ouverts.
- Le chiffre ne se recopie pas : `npm run check:agent` le refait, et `reports/analyse/eslint.json`
  porte le détail par règle et par fichier.

## Prochaine étape
Ouvrir `src/core/pages/texte-riche.ts` et traiter ses deux défauts réels — le `reduce()` sans valeur
initiale, puis le `!==` toujours vrai dont les types n'ont aucun recouvrement. Typage, build et
`tests/integration/texte-riche.test.ts` à chaque fois ; un commit isolé par défaut traité.

## Écarté
- **Lancer `--fix` sur tout le dépôt sans relire le diff** — `prefer-nullish-coalescing` est dans le
  lot, et `||` et `??` ne coïncident pas sur `0` et `''` : c'est sémantique, pas du formatage.
- **Corriger les deux `as Record<…>` de `pages.ts`** — écarté à l'épreuve : `--fix` les retire et
  `tsc` casse aussitôt (TS18046, TS2339). La remontée est fausse ; la « correction » est une régression.
- **Éteindre une règle plutôt que corriger** — `sonarjs/cognitive-complexity` en tête. Le calibrage
  est le contrat ; une extinction ne se justifie que par une cause nommée, comme celles de `tests/**`.
- **Commencer par la migration `SELF`/`env`** — elle touche beaucoup d'endroits sans changer aucun
  comportement, et noierait le diff des constats qui, eux, en changent.
- **Promouvoir `analyse` en bloquant avant qu'il soit vert** — écarté au montage : un check rouge
  déclaré bloquant paralyse le cycle `run` au premier ticket.
