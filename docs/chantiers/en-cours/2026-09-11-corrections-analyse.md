# Résorber ce que la passe d'analyse lève sur `src/`

Portée : hors-cycle
Ouvert le 2026-09-11 · branche `main` · HEAD `9c02dab`

## Objectif
J'allais traiter par petits lots ce que `npm run analyse` lève sur `src/`, puis retirer les deux
extinctions qui ne tiennent qu'à une API dépréciée en amont — pour que le check devienne vert, et
donc promouvable en bloquant.

## Contexte à charger
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — les deux régimes, le calibrage assumé
            et la limite `.astro`/`.svelte` (189 l., seule cette section compte)
à lire      `eslint.config.analyse.js` — les sept extinctions `tests/**` et leur motif ; c'est ici
            qu'on en retire une quand sa cause disparaît (78 l.)
à situer    `docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md` — la fiche du montage,
            conclusions déjà distillées ici, ne pas la relire
à situer    `.claude/agents/quality-analyse.md` — la règle de périmètre du diagnostiqueur ; à ouvrir
            seulement si un run se met à remonter l'arriéré au lieu des fichiers du ticket

## Acquis
- J'ai décidé de poser l'instrument sans traiter ce qu'il montre : mêler les deux rendait le diff
  illisible et faisait passer un refactor de `core/` pour de la configuration.
- J'ai retenu un ordre, et ce n'est pas celui du volume : d'abord ce que `--fix` résorbe seul
  (commit isolé, rien à juger), ensuite les constats de `src/` qui demandent un regard, la migration
  `SELF`/`env` en dernier.
- Deux des constats de `src/` sentent le défaut réel et non le style — une comparaison toujours vraie
  et un `reduce()` sans valeur initiale, tous deux dans `core/pages/texte-riche.ts`. Je ne les avais
  pas ouverts.
- Le chiffre ne se recopie pas : `npm run check:agent` le refait, et `reports/analyse/eslint.json`
  porte le détail par règle et par fichier.

## Prochaine étape
Jouer `npm run check:agent`, puis ouvrir le premier lot :
`npx eslint --config eslint.config.analyse.js --fix src` sur un arbre propre, relire le diff, commit
isolé. Ensuite seulement `src/core/pages/texte-riche.ts`.

## Écarté
- **Lancer `--fix` sur tout le dépôt sans relire le diff** — `prefer-nullish-coalescing` est dans le
  lot, et `||` et `??` ne coïncident pas sur `0` et `''` : c'est sémantique, pas du formatage.
- **Éteindre une règle plutôt que corriger** — `sonarjs/cognitive-complexity` en tête. Le calibrage
  est le contrat ; une extinction ne se justifie que par une cause nommée, comme les sept de
  `tests/**`.
- **Commencer par la migration `SELF`/`env`** — elle touche beaucoup d'endroits sans changer aucun
  comportement, et noierait le diff des constats qui, eux, en changent.
- **Promouvoir `analyse` en bloquant avant qu'il soit vert** — écarté au montage : un check rouge
  déclaré bloquant paralyse le cycle `run` au premier ticket.
