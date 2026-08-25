# Candidat ADR : Les préfixes que la publication a le droit d'écrire sont déclarés dans une constante unique, et `.github/` n'y figure pas
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0029-prefixes-de-publication-en-constante-unique.md` (ADR-0029 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

[ADR-0005](../../1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md) a retenu un jeton à portée
fine portant **`Contents: Read and write` seule**, et cet argument — « une seule permission » —
est ce qui a écarté GraphQL. Il n'est vrai que **sous une condition**.

La donnée source de la documentation GitHub donne au **déplacement de ref** deux jeux de
permissions suffisants : `Contents: write`, **ou** `Contents: write` + `Workflows: write`
[officiel · cité,
[relevé](../../research/2026-08-12-permissions-rest-git-data.md)]. Lecture non citée : le second se
lève quand le commit visé touche `.github/workflows/`.

Si la publication écrivait sous `.github/`, le jeton se ferait donc refuser **au dernier geste
de la publication** — celui qui rend le contenu visible — et **rien dans le code ne relierait la
panne à cette cause**. La mesure du 2026-08-11 ne pouvait pas le voir : le dépôt d'essai n'avait
aucun fichier de workflow.

**Exigences servies** : `FR-101` (une publication aboutit après retrait de tous les accès de
l'intégrateur), `FR-086`, `FR-089`.

**Trace observable** : la **valeur de `PREFIXES_AUTORISES`**, dans
`src/core/publication/prefixes.ts`.

## Décision

Les préfixes que la publication a le droit d'écrire seront déclarés dans la **constante
littérale `PREFIXES_AUTORISES` de `src/core/publication/prefixes.ts`**, **seul porteur de cette
liste**, et **`.github/` n'y figurera pas**.

## Conséquences

**Positives.**

- **La contrainte silencieuse de [ADR-0005](../../1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md)
  devient lisible dans un fichier** : ce qui n'avait aucun message d'erreur a désormais une
  valeur qu'un contrôle prend en défaut.
- **Un seul porteur de la liste** : elle ne peut pas diverger entre deux endroits du code.
- La liste vit dans `src/core/`, donc **la décision de ce qui est écrit est du métier**, et
  `src/platform/` ne fait qu'exécuter — cohérent avec
  [ADR-0021](../../1.x/adr/0021-sens-descendant-des-dependances-entre-zones.md) et
  [ADR-0022](../../1.x/adr/0022-core-sans-framework-ni-plateforme.md).

**Négatives — ce à quoi le code s'engage.**

- **L'invariant tient la constante, pas son usage.** Un chemin **construit dynamiquement**, qui
  ne dériverait pas de cette liste, passerait le contrôle. C'est l'angle mort le plus large de
  la série : `docs/archi.md` a explicitement refusé de poser « tout chemin écrit par la
  publication dérive de la constante », faute de trace observable — un chemin dynamique ne se
  suit pas statiquement. **La dérivation reste une règle de relecture.**
- **Le fichier et le nom de la constante sont en dur** : les renommer casse le contrôle et
  demande un ADR de remplacement.
- **La logique de chemins ne doit jamais descendre dans l'adaptateur.** Si elle y descendait,
  la constante cesserait d'être le seul porteur sans que l'invariant s'en aperçoive.

## Alternatives considérées

- **« Tout chemin écrit par la publication dérive de la constante »** : écartée faute de trace
  observable — c'est la propriété qu'on voudrait, et elle n'est pas décidable statiquement.
- **Ne rien poser, au motif que le produit n'a aucune raison d'écrire sous `.github/`** :
  écartée car c'est exactement le mode de défaillance à éviter — la panne surviendrait au
  dernier geste de la publication, sans lien lisible avec sa cause, sur une instance dont
  l'intégrateur est parti.

## Vérifiable ?

Oui — `arch-invariants`, invariant `I9` : `PREFIXES_AUTORISES` a un seul porteur, et `.github/` n'y figure pas.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — contrainte posée le 2026-08-12 par le
  cinquième grief de `S-10`, rendue falsifiable en phase Archi. Revue humaine : 2026-08-13.
