# Run du ticket 05 bloqué deux fois : les scripts de la page à formulaire

Portée : 012-envoi-des-demandes-de-devis · ticket 05
Ouvert le 2026-10-16 · Actualisé le 2026-10-16 · branche `impl/le-total-suit-la-selection-05` · HEAD `229d173`

## Objectif
Faire aboutir le run du ticket 05 (`wf_29fb859f-7e2`), arrêté sans PR.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/05-le-total-suit-la-selection.md` — le ticket, dont « Le module » et « Ce que fait le module »
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (design D4, delta `site-public`)

## Acquis
- Premier arrêt (`blocked-red`) : SC-04d et SC-04f, oubliés par le préalable #253, interdisaient le
  module sur `/contact` (sortie complète dans `9fc1e98`). Corrigés par la PR distincte #255, avec
  l'accord de l'humain ; `main` est entré dans la branche par `229d173`, travail en vol intact.
- Second arrêt (`blocked-verify`, `rerun: "2"`) : `npm test` était vert (926/926), mais le parcours
  navigateur du ticket, hors de `npm test`, rougissait sur SC-05h. Sortie, non tronquée :

```
  1) tests/parcours/formulaire-total.parcours.ts:97:3 › le total suit la sélection › SC-05i — le module est chargé depuis le site et le total est annoncé poliment 

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  - 0
    + Received  + 1

      Array [
        "http://localhost:8788",
    +   "http://localhost:8788",
      ]

      110 |       expect(politique).toContain("script-src 'self'");
      111 |       expect(politique).not.toMatch(/unsafe-|https?:|\*/);
    > 112 |       expect(scripts).toEqual(["http://localhost:8788"]);
          |                       ^
      113 |       await expect(
      114 |         page.locator("section.formulaire [aria-live='polite']"),
      115 |       ).toBeVisible();
        at /home/negus/projets/colibri-cms/tests/parcours/formulaire-total.parcours.ts:112:23

    Error Context: test-results/formulaire-total.parcours.-aef62--total-est-annoncé-poliment/error-context.md


  1 failed
    tests/parcours/formulaire-total.parcours.ts:97:3 › le total suit la sélection › SC-05i — le module est chargé depuis le site et le total est annoncé poliment 
```

- Deux causes. Le module importait `formaterPrix` de `src/core/formulaires/prix.ts`, que l'îlot
  d'administration importe aussi : la construction en avait fait un morceau commun, `prix.*.js`,
  chargé en second fichier, du site lui aussi. Et le total ne portait pas `aria-live="polite"`, que
  le ticket demande.
- J'avais préparé, non commité : `aria-live="polite"` sur `<output data-total>` ; l'assertion du test
  comparant l'ensemble des origines (au moins un script, tous du site). `npm test` 926/926 ; les 5
  parcours du ticket et les 4 du site public verts ; refus d'un hôte tiers et d'une liste vide.

## Prochaine étape
Avec l'accord de l'humain sur la lecture de SC-05h (« le seul script de la page est le module, ses
morceaux viennent du site »), reprendre dans cette session seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1460894.js",
         resumeFromRunId: "wf_29fb859f-7e2",
         args: { changeDir: "openspec/changes/012-envoi-des-demandes-de-devis", ticket: "05",
                 oldBase: "impl/la-page-publique-presente-le-formulaire-03", rerun: "3" })
```

Hors de cette session : commiter le travail en vol, puis relancer `/scd-spec-dev:run
012-envoi-des-demandes-de-devis 05`.

## Écarté
- Un module en un seul fichier : il fallait recopier `formaterPrix` (contraire au ticket) ou bâtir le
  module à part (configuration hors des fichiers du ticket).
- Relancer au lieu de reprendre : en `tdd`, les tests réécrits sur un code déjà là ne rougiraient pas.
- Retirer SC-04d et SC-04f du contrôle des scripts : un script de l'hébergeur passerait.
