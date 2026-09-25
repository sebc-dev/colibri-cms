# Run bloqué — l'identité Colibri

Portée : 005-mise-en-page-administration · ticket 02
Ouvert le 2026-09-25 · branche `impl/identite-colibri-02` (worktree, aucun commit) · HEAD `6ad044e`

## Objectif
Poser le socle visuel (tokens Colibri, polices même origine, logo, composants shadcn de base), lancé
en `run-parallel` avec le ticket 01 (run `wf_f3929391-dcb`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/02-identite-colibri.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/proposal.md` — le change
à lire      `docs/adr/0015-tokens-colibri-theme-de-l-administration.md` — un seul thème clair
à situer    `.git/scd-worktrees/identite-colibri-02/` — le SEUL exemplaire du travail (non commité)

## Acquis
- Le run s'est arrêté en `blocked-verify` après l'implémentation (DoD rejouée propre dans le worktree).
  Le vérificateur a attesté SC-02b, SC-02c, SC-02d sur l'artefact bâti ; il a refusé SC-02a et SC-02e.
- SC-02a : les composants générés par la CLI (`input`, `textarea`, `badge`, `button`…) portent des
  classes `dark:` ; `admin.css` ne redéfinissait pas la variante `dark`, que Tailwind v4 compile en
  `@media (prefers-color-scheme: dark)`. Les écrans servis restaient identiques (aucun ne monte encore
  ces composants), mais le socle changeait de rendu en sombre.
- SC-02e : `body` passait à 15 px et les champs nus de `/admin/connexion` en héritaient sur téléphone,
  alors que le ticket demande 16 px sous 768 px pour tous les champs (iOS agrandit sous 16 px).
  Seul `input.svelte` portait `text-base md:text-sm`.
- Réserve hors critère : un champ aux classes de `input.svelte` prenait un contour d'encre + `ring-3`,
  pas le token `--focus-ring`.

## Prochaine étape
Dans le worktree : neutraliser la variante `dark` dans `admin.css` (piste du vérificateur :
`@custom-variant dark (&:where(.dark, .dark *));`, aucune classe `.dark` jamais posée) et poser la
règle 16 px / 15 px sur les champs au niveau global ; puis faire rejouer la vérif, et confirmer SC-02e
sur un vrai iPhone et un Android (le headless ne voit pas le clavier virtuel).

## Écarté
- Juger SC-02a sur les seuls écrans servis aujourd'hui : le défaut apparaîtrait au premier écran qui
  monte les composants.
