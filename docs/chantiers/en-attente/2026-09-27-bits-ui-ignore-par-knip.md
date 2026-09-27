# `bits-ui` et `WithoutChildrenOrChild` ignorés par knip, à réexaminer

Portée : 005-mise-en-page-administration · avant l'archivage du change
Ouvert le 2026-09-27 · branche `impl/cadre-avec-l-ecran-03` · HEAD `91f4288`

## Objectif
Décider, avant d'archiver le change 005, si `bits-ui` reste une dépendance du projet ou s'il sort, et
retirer alors ses deux exclusions de `knip.json` : `ignoreDependencies` (`bits-ui`) et `ignoreIssues`
(`src/admin/lib/utils.ts` : `types`, pour `WithoutChildrenOrChild`).

## Contexte à charger
à lire      `knip.json` — `ignoreDependencies` et `ignore` (`src/admin/composants/ui/**`)
à lire      `openspec/specs/socle-ilots-admin/spec.md` l. 21 — `bits-ui` parmi les dépendances de fondation
à situer    `docs/adr/0009-base-de-composants-des-ilots-shadcn-svelte.md` — les primitives shadcn

## Acquis
- Le ticket 03 a supprimé `ActionRapide.svelte`, le dernier îlot qui importait le tooltip shadcn.
  Depuis, plus rien d'actif n'atteint `bits-ui` : ses 15 importeurs sont sous
  `src/admin/composants/ui/**`, que `knip.json` ignore. `knip` l'a donc signalé comme inutilisé.
- Sur décision humaine, je l'ai ajouté à `ignoreDependencies` en attendant.
- J'ai vérifié que `knip` 6.32 signale une entrée ignorée qui redevient utilisée : la ligne
  `Configuration hints` dit `Remove from ignoreDependencies`. Il ne dit rien si elle reste inutilisée.
  C'est le cas que cette fiche couvre.
- Ce qui pourrait la rebrancher : l'infobulle du rail replié (ticket 04), le `dialog` de base
  (tickets 09 et 11).
- `WithoutChildrenOrChild` (`src/admin/lib/utils.ts:25`) avait la même cause : il n'est plus utilisé
  que par `dialog-content.svelte` et `tooltip-content.svelte`, sous le chemin ignoré. Je l'ai masqué
  par `ignoreIssues`, faute d'exclusion par export dans la config. Deux limites :
  (1) l'exclusion couvre TOUS les types exportés de `utils.ts` ;
  (2) `knip` ne dit rien quand elle devient inutile (vérifié : une entrée `ignoreIssues` sur un
  fichier sans problème ne déclenche aucun indice). Contrairement à `bits-ui`, rien ne préviendra
  automatiquement.

## Prochaine étape
Juste avant `/opsx:archive 005`, retirer l'entrée `ignoreIssues`, puis lancer `npx knip`.
- Si `WithoutChildrenOrChild` n'est plus signalé, laisser l'entrée retirée. S'il l'est encore, il suit
  le sort de `bits-ui` ci-dessous.
- Si `Remove from ignoreDependencies` vise `bits-ui`, retirer l'entrée : la dépendance est revenue.
- Sinon, décider par un change : soit retirer `bits-ui` et les primitives tooltip et dialog (la spec
  `socle-ilots-admin` est touchée), soit les garder et l'écrire dans la spec.
Refermer ensuite cette fiche.

## Écarté
- Retirer `bits-ui` dès le ticket 03 : la spec vivante et les ADR-0009 et 0010 s'appuient dessus, et
  les tickets 04, 09 et 11 peuvent encore s'en servir.
