# Garde de signature sur les documents de specs

Portée : socle
Ouvert le 2026-08-16 · Actualisé le 2026-08-18 · branche `chore/garde-signature-specs` · HEAD `7b0ec7e`

## Objectif
Rendre la modification de `spec.md` et `plan.md` par un agent **impossible** et non seulement
visible : un quatrième garde d'intégrité en CI, dont la soupape est la signature SSH, sur le patron
de `verifier-guard`.

## Contexte à charger
à extraire  `docs/ci.md` › § « `verifier-guard` — et la seule soupape qu'un agent ne peut pas
            écrire » — 778 l. ; porte déjà la doctrine entière, motif du refus du scope compris
à extraire  `.github/workflows/ci.yml` › job `verifier-guard` (l. 525-611) — 706 l. ; le patron à
            copier : fermeture par défaut, boucle commit par commit, ordre des deux contrôles
à lire      `.github/scripts/verify-signed-commits.sh` — 45 l. ; la vérification est déjà écrite et
            partagée, le nouveau job n'a qu'à lui passer la liste des commits fautifs
à situer    `.github/allowed_signers` — registre existant et auto-protégé, rien à y faire
à situer    PR #26 — le run qui a révélé le trou, ne pas la relire

## Acquis
- J'avais proposé un scope de commit (`docs(specs):`) ; l'humain a tranché pour la signature, et
  `docs/ci.md` lui donnait déjà raison par écrit — « un agent écrit `chore(types):` aussi facilement
  qu'il écrit `as any` ». Le nouveau garde n'invente donc rien : il applique à un quatrième chemin
  une doctrine déjà rédigée.
- **La règle se scinde par fichier, et c'est ce qui la rend tenable.** Mesuré sur le commit du lot
  R2 : `tasks.md` n'y change que par des lignes de case. D'où — `spec.md`/`plan.md` : signature
  toujours ; `tasks.md` : lignes de case libres, toute autre ligne signée. Sans cette exception,
  chaque run était bloqué, `progress-recorder` cochant sans surveillance et ne pouvant pas signer.
- **Le contrôle du registre n'a pas à être répliqué.** Vérifié dans le job : celui de
  `verifier-guard` se déclenche dès que `.github/allowed_signers` est touché — pas seulement quand
  un motif est ajouté. Le nouveau job reste donc à un seul contrôle, tant que `verifier-guard` est
  bloquant. Cette dépendance est à écrire, sinon elle se perd.
- **Trois pièges déjà identifiés, à ne pas repayer.** Le garde doit juger **chaque commit sur son
  propre diff** et jamais le diff net — leçon déjà payée par `chore(ci): le garde de config juge
  chaque commit sur son propre diff`. Un rebase efface les signatures, et le workflow
  d'implémentation en joue un à chaque lot : un commit de specs signé passant par une branche de
  lot rougirait pour une raison étrangère à son contenu. Enfin une signature prouve un geste, pas
  une lecture — limite déjà assumée par `verifier-guard`, qu'on ne revend pas ici pour autre chose.
- Le coût — une signature par phase specs jouée — a été pesé et accepté à l'ouverture.

## Prochaine étape
Écrire le job `specs-integrity` dans `.github/workflows/ci.yml`, puis sa section dans `docs/ci.md`
§ « Les trois gardes d'intégrité », dont le titre, le tableau des contrôles et la grille des cinq
modes sont à corriger avec — ils en comptent trois. Commit `chore(ci):`.

## Issue
Fermé le 2026-08-18 — commit `b984aee`, PR #28. Le job `specs-integrity` est dans `ci.yml` sur le
patron de `verifier-guard` : fermeture par défaut si la base est introuvable, boucle commit par
commit, globs normatifs, appel de `verify-signed-commits.sh` sur les seuls commits fautifs. Les
deux régimes annoncés y sont — `spec.md`/`plan.md` sans exception, `tasks.md` jugé sur un diff dont
le marqueur de case est neutralisé des deux côtés : si les lignes retirées et ajoutées coïncident
alors, seul l'état des cases a bougé, et une case cochée en même temps qu'un libellé réécrit rompt
l'égalité et retombe sous signature.

Côté document, `docs/ci.md` gagne son § « `specs-integrity` — la même soupape, sur ce contre quoi
le code est jugé », et les trois endroits qui comptaient à trois ont été corrigés : le titre
(« Les **quatre** gardes d'intégrité »), le tableau des contrôles (ligne 10) et la grille des cinq
modes, dont le mode 2 dit désormais « ou il **réécrit l'exigence** contre laquelle son code est
jugé ». La dépendance à `verifier-guard` pour le contrôle du registre de clés est écrite, comme
l'Acquis l'exigeait.

**Écrire un garde et le rendre bloquant sont deux gestes.** Le job a tourné vert sur la PR qui
l'apportait alors que le ruleset ne l'exigeait pas encore — il ne bloquait rien. Le ruleset
`Main protect` a été repris le jour même et porte ses **dix** contextes requis, `specs-integrity`
compris ; `66f23b7` en est le constat au document.

## Écarté
- **Un hook `PreToolUse` sur `specs/`** — `/scd-sdd:specify` et `/scd-sdd:plan` y écrivent
  légitimement, avec les mêmes outils, dans la même session ; un hook voit le chemin, jamais la
  phase. Il faudrait un drapeau de phase que l'agent poserait, donc pourrait retirer.
- **Le scope de commit seul** — c'est du texte que l'agent écrit : ça rend visible, pas impossible.
  Il reste le bon outil pour la config, où le changement par l'agent est souvent légitime.
- **Corriger `fix-applier` pour qu'il n'édite pas `specs/`** — c'est la cause réelle, mais elle vit
  dans le plugin `scd-sdd`, hors de ce dépôt. Le garde couvre le symptôme sans attendre l'amont.
