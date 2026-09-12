# Combler ce que les survivants de mutation désignent

Portée : hors-cycle
Ouvert le 2026-09-12 · Actualisé le 2026-09-12 · branche `chore/chantier-corrections-analyse` · HEAD `8b6227c`

## Objectif
J'allais traiter au fur et à mesure les trente survivants classés « à traiter » par le relevé de
mutation du 12/09 — presque tous des assertions manquantes sur des tests qui existent déjà, pas des
tests neufs — en commençant par ceux qui touchent une clause de spec.

## Contexte à charger
à extraire  `~/.local/state/colibri-mutation/rapports/2026-09-12-0348-incremental.md` › `## À traiter`
            (L6-52) — les neuf entrées : le mutant, ce qu'il casse, où ça se teste (88 l. en tout)
à situer    le même rapport › `## À ignorer` (L53-84) — 59 survivants argumentés un par un ; ne
            s'ouvre que si l'un d'eux revient, jamais pour travailler
à situer    `…/2026-09-12-0348-incremental.survivants.txt` — l'extrait brut dont le rapport est
            tiré (909 l.), déjà digéré

## Acquis
- Le rapport est daté et `dernier.md` n'est qu'un lien : le timer tourne toutes les nuits à 01:07 et
  le déplacera. Citer le chemin daté, jamais `dernier.md`.
- La mesure porte `origin/main` (`9c02dab`), jamais l'arbre de travail : le script mesure dans un
  worktree détaché. Les survivants décrivent main, pas la branche où l'on corrige.
- 83 péremptions, que Stryker compte comme tuées : le score se lit 5,5 points plus haut avec elles
  que sans. Elles sont réparties uniformément entre les fichiers (4 à 12 % des mutants de chacun),
  sans se concentrer là où du code boucle — ça ressemble à de la variance de charge à onze en
  parallèle, pas à des boucles infinies. Rien ne le prouve : il faudrait rejouer ces 83 seuls, à
  faible concurrence. Et le seuil calculé (≈ 149 s pour ~70 s de durée moyenne par mutant) tient :
  `timeoutMS` n'est pas en cause au premier ordre.
- Une mesure complète coûte 2 h 47 et 19 Go de pic mémoire. Prouver un lot en la rejouant est exclu.

## Prochaine étape
J'allais d'abord établir comment rejouer un seul fichier — `stryker.conf.json` fige `mutate`, que la
ligne de commande devrait pouvoir restreindre —, puis prendre `verdict.ts:64` (2 mutants) : dans
`tests/integration/refus-de-code.test.ts:299-302`, la réponse au code correct présenté après brûlage
n'est assertée que sur l'absence de cookie, jamais sur le geste annoncé.

## Écarté
- **Rouvrir les 59 « à ignorer »** — chacun porte son argument (équivalent, inatteignable, exigé par
  un ticket non livré) ; les rejuger en bloc, c'est refaire le tri déjà fait.
- **Traiter les 2 « incertains » comme des tests à écrire** — le sort d'un `hardBreak` et celui d'un
  `#` littéral sont des décisions produit ; asserter avant de trancher figerait par accident le
  comportement actuel.
- **Lire le score sans lire la colonne des péremptions** — c'est le premier chiffre à regarder, et
  ici il déplace le résultat de 5,5 points.
- **Attendre le prochain passage du timer pour savoir si un lot a tué son mutant** — le relevé est
  incrémental un jour sur deux, complet le dimanche : la boucle de retour serait d'une nuit.
- **Ajouter un test neuf là où le rapport désigne une assertion manquante** — il nomme à chaque fois
  le test existant et la ligne ; un test parallèle laisserait le premier aussi aveugle qu'avant.
