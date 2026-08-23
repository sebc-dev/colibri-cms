# Candidat ADR : Langage — TypeScript en mode strict
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0010-langage-typescript-strict.md` (ADR-0010 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

Le [Brief](../../1.x/brief.md) pose que « le code entrant n'est pas relu ligne à ligne » et que la
confiance doit venir de **vérifications mécaniques**. C'est la même exigence qui fonde la
caractéristique architecturale `C5` de [`docs/archi.md`](../../1.x/archi.md) — testabilité sans
plateforme — et la phase `ci` tout entière.

Elle ne trace vers aucun `FR` propre : c'est une propriété du mode de production du code, pas
du produit. Elle sert donc **toutes** les exigences, indirectement.

## Décision

Nous écrirons le produit en **TypeScript, en mode strict**.

## Conséquences

**Positives.**

- Le premier vérificateur mécanique est en place dès la première ligne, sans rien installer de
  plus : il tourne en local, à l'édition, et en CI.
- Les structures du produit — schéma des emplacements éditables, contrats de publication — sont
  décrites une fois et vérifiées partout où elles circulent.

**Négatives — ce à quoi le code s'engage.**

- **Un type ne vérifie rien à l'exécution.** Une réponse de D1, un corps de requête, un
  `page.json` relu depuis le dépôt sont typés par **déclaration**, pas par contrôle : la
  validation aux frontières reste entièrement à la charge du code, et le mode strict ne la
  rattrape pas.
- **Le mode strict a un coût d'écriture réel**, et il est payé partout — y compris là où le
  code est trivial. C'est un coût assumé au titre du Brief, pas une préférence.
- **Une étape de build s'ajoute** entre les sources et l'artefact déployé, dont la chaîne doit
  rester compatible avec l'outillage retenu pour la cible.

## Alternatives considérées

- **JavaScript annoté en JSDoc, vérifié par `tsc`** : écartée. Le vérificateur serait le même,
  donc la propriété que le Brief réclame serait tenue — mais l'ergonomie se dégrade précisément
  sur les structures du produit (schéma des emplacements, contrats de publication), qui sont
  l'endroit où le typage rapporte le plus.

## Vérifiable ?

Oui — job `typecheck` (`tsc --noEmit`). Sortie 0 mesurée le 2026-08-19.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, arbitrée par
  l'humain. Revue humaine : 2026-08-13.
