# Mise en page de l'administration

Portée : socle
Ouvert le 2026-09-25 · branche `chore/chantier-mise-en-page` · HEAD `b4df887`

## Objectif
L'administration n'a pas de mise en page. J'allais figer par ADR l'adoption du canvas Colibri,
puis ouvrir un change unique `005-mise-en-page-administration` portant un `ux.md` — découpé
socle d'abord (tokens et polices, composants shadcn manquants, coquille), puis un ticket par
écran ; les écrans ayant des fichiers disjoints, je comptais les jouer en `run-parallel`.

## Contexte à charger
à lire      `docs/design-system.md` — le cadrage durable, § Canvas maître (68 l.)
à lire      `.claude/skills/colibri-cms-design/RECUPERATION.md` — les trois écarts (50 l.)
à lire      `.claude/skills/colibri-cms-design/tokens/colors.css` — les valeurs à adopter (38 l.)
à lire      `src/admin/admin.css` — le thème « neutral » à remplacer (83 l.)
à extraire  `.claude/skills/colibri-cms-design/readme.md` › `# Fondations visuelles` — 326 l., seule cette partie contraint
à extraire  `docs/architecture.md` › `## Invariants` — I12 borne ce qu'un ADR de polices peut décider
à situer    `docs/adr/0009-…`, `docs/adr/0010-…` — conclusions déjà distillées dans Acquis
à situer    `openspec/specs/socle-ilots-admin/spec.md` — la capacité que le change touchera
à situer    `docs/roadmap.md` — une story reste à y poser, sur le modèle de 002 « aucun FR propre »
à situer    PR #105 — le canvas entré dans le dépôt, ne pas relire

## Acquis
- Le canvas ne se porte pas : ce sont les valeurs et les dispositions qui passent, jamais le code.
- Deux ADR conditionnent tout le reste : les tokens de marque, puis les polices en même origine.
- Un seul thème clair me paraissait le bon choix — c'est l'ADR qui tranche.
- J'ai prévu que chaque écran se scinde en « structure » (vérif `test`) et « aspect » (`observé`) :
  les tests workerd n'appliquent aucune CSP, le rendu ne s'y constate pas.
- La recette se joue sur l'artefact bâti (`build` + `wrangler dev`), jamais `npm run dev`.
- Le kit d'interface dit « Médiathèque » et « Pages » là où les specs vivantes disent « Médias »
  et « Mes pages » : les specs gagnent.
- Le kit décrit des écrans hors périmètre : tableau de bord, demandes, Technique, création de page.

## Prochaine étape
Ouvrir ADR-0015 par `/scd-spec-dev:adr` — adoption des tokens Colibri comme thème de
l'administration. Premier arbitrage : un seul thème clair, ou les deux.

## Écarté
- Porter les composants React tels quels — le produit est en Svelte, ADR-0009 fixe shadcn-svelte.
- Élargir la CSP pour Google Fonts et Lucide en CDN — contredit I12 ; vendoriser à la place.
- Deux changes séparés, socle puis écrans — un seul suffit : 004 a tenu à 11 tickets.
- `npm run dev` comme terrain de recette — Vite y injecte le CSS par script, la CSP le bloque.
