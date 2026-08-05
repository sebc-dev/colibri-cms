---
id: ADR-0013
title: Régime d'amorçage du mécanisme d'application
status: proposed
date: 2026-08-05
scope: [".claude/", ".github/workflows/", "tooling/quality-gate/"]
depends-on: ["ADR-0002", "ADR-0006", "ADR-0009"]
---

# ADR-0013 — Régime d'amorçage du mécanisme d'application

> **CANDIDAT — brouillon.** Rédigé en phase `plan` de la feature
> [`specs/002-mecanisation-portail`](../../../specs/002-mecanisation-portail/plan.md). Il n'a
> **aucune valeur normative** tant qu'un humain ne l'a pas promu via `/scd-sdd:adr`. Il doit être
> accepté **dans la même PR** que le premier lot qu'il autorise (`CLAUDE.md` § *Comment travailler
> ici*).

## Contexte

ADR-0006 amdt 2026-08-01 pose : **INTERDIT à l'IA d'éditer le mécanisme d'application** —
`.claude/hooks/`, `.claude/settings.json`, `.github/workflows/`, `tooling/quality-gate/` et la base
de référence des mutants. La règle est juste et n'est pas remise en cause : un générateur qui peut
réécrire ce qui le vérifie n'est vérifié par rien.

Elle a cependant été écrite le 2026-08-01, **après** que le mécanisme existe (feature 001, livrée le
2026-07-26), et n'a jamais été confrontée au cas qui la met en tension : **le lot qui construit le
mécanisme lui-même**. Trois faits, relevés sur le dépôt le 2026-08-05, fixent le problème :

1. **La règle n'a aucun mécanisme.** `estCheminProtege()` ne connaît aujourd'hui que `tests/`,
   `migrations/`, `**/schema/`, la config des frontières et le seam d'auth. Passé au garde de
   session, chacun de `tooling/quality-gate/src/runner.ts`, `.github/workflows/ci.yml`,
   `.claude/hooks/protect-paths.mjs` et `package.json` sort en `exit 0` — **autorisé**. La règle est
   déclarative, et c'est exactement le trou que la feature 002 (`FR-036`) ferme.
2. **Le mécanisme existant a été écrit par l'IA, tests compris.** Chaque commit substantiel de
   `tooling/quality-gate/` porte un trailer `Co-Authored-By: Claude`. Exiger de la suite une garantie
   que la base n'a jamais eue est un choix défendable, mais il doit être écrit comme tel.
3. **Le maillon hors du dépôt est déjà posé** (ADR-0006 amdt 2026-08-02 (b), `D-09` clos) : pull
   request obligatoire, aucun push direct, aucun force-push, `bypass_actors` vide, portail en check
   requis. Toute écriture de l'IA atteint déjà la branche par défaut **par une fusion humaine**.

La question est donc étroite : *par quel régime le mécanisme d'application se construit-il, quand la
règle qu'il doit appliquer interdit à son constructeur d'y toucher ?* Sans réponse écrite, la chaîne
d'implémentation la rejouera à chaque lot sans le savoir.

## Décision

**Une modification du mécanisme d'application écrite par l'IA n'est admissible que sous un *régime
d'amorçage* — déclaré, borné à une feature nommée, et dont l'expiration est mécanique et non
calendaire.**

1. **Déclaration.** Le régime d'amorçage est ouvert par une feature `specs/NNN-…` qui le nomme dans
   son plan, avec la liste des chemins du mécanisme qu'elle touche et le lot qui l'éteint. Hors d'une
   telle déclaration, l'interdiction d'ADR-0006 s'applique sans nuance.
2. **Barrière substitutive, pendant le régime.** Elle n'est pas le garde de session — il ne voit rien
   de ces chemins. Elle est la conjonction de ce qui existe déjà : **un lot = une pull request**, la
   protection de branche d'ADR-0006 amdt (b), et la **relecture humaine de chaque PR avant fusion**.
   La relecture est ici un acte humain non mécanisé — c'est précisément l'état que la feature
   remplace par un mécanisme.
3. **Expiration mécanique, jamais calendaire.** Le régime prend fin quand l'extension de la liste des
   chemins possédés par l'humain atteint la branche par défaut : à partir de cet instant le garde de
   session refuse **absolument** toute écriture de l'IA sur ces chemins, et aucune déclaration ne
   peut le rouvrir sans une écriture que ce même garde refuse. **La dérogation ne peut pas survivre à
   ce qu'elle a servi à construire** — c'est ce qui la distingue d'une exception permanente déguisée.
4. **Ordre imposé à la feature qui l'ouvre.** L'extension de la liste est le **dernier** changement
   du lot, et l'artefact d'approbation, le registre d'approbateurs amorcé et la clé de signature
   existent **avant** elle — sinon la première approbation exigée par la feature elle-même est
   inaccordable.
5. **Ce qui reste interdit pendant le régime.** Le régime lève l'interdiction d'*éditer*, jamais
   celle d'*affaiblir* : aucun changement du lot ne peut réduire la couverture d'un contrôle
   existant, retirer une entrée d'une liste de chemins protégés ni désarmer un check requis, hors
   d'un `SHALL` de la feature qui l'écrit explicitement.

## Relation à ADR-0006 — ce que cet ADR fait, et ce qu'il ne fait pas

**Il n'amende pas ADR-0006.** Le texte de l'interdiction reste littéral, et la feature 002 reste
exacte en écrivant qu'elle n'amende aucun ADR. Le motif est au § *Alternatives* : l'exception est
transitoire et son **extinction** est ce qui la rend acceptable ; l'inscrire dans un ADR dont le sujet
est le dispositif permanent la rendrait invisible au lecteur d'ADR-0006.

**Mais un lecteur d'ADR-0006 seul ne doit pas rester devant une interdiction que le lot enfreint.**
La réconciliation vit donc là où la règle est **lue** au quotidien, pas là où elle est décidée :
`CLAUDE.md` § *Contraintes actives · Génération IA (ADR-0006)* porte une ligne renvoyant ici —
l'interdiction d'éditer le mécanisme d'application vaut **hors d'un régime d'amorçage déclaré**, dont
l'expiration est mécanique. Ce geste est dû **dans la PR qui promeut cet ADR** : sans lui, la
dérogation existerait sans qu'aucun document lu au quotidien ne la signale, ce qui est précisément le
mode d'échec que le point 1 (déclaration) cherche à fermer.

**Ce qu'un futur ADR devra reprendre.** Si le point 3 devait être rayé — c'est-à-dire si le régime
devenait permanent —, ce serait par un ADR nouveau qui *supersede* celui-ci, jamais par une
déclaration de feature. La ligne de `CLAUDE.md` suit alors le statut de cet ADR.

## Conséquences

**Ce que la décision achète.** La feature qui mécanise le portail est implémentable par la chaîne
d'agents, à exposition **identique à celle d'aujourd'hui** — le garde ne bloque déjà aucun de ces
chemins — et **strictement inférieure après** l'extinction du régime, puisque la barrière passe d'une
règle déclarative à un refus mécanique doublé d'une approbation signée.

**Ce qu'elle n'achète pas.** Pendant le régime, la seule barrière réelle sur le mécanisme est la
**lecture humaine d'une pull request**. Une PR affaiblissante fusionnée sans relecture effective
passe. C'est le mode d'échec nommé par ADR-0006 amdt (b) — « un vert qui ressemble à une garantie » —
et il n'est pas fermé ici : il est **borné dans le temps** par le point 3 et **borné en surface** par
le point 5.

**Ce qu'elle rend définitif.** Après l'extinction, le mécanisme d'application est du code humain au
même titre que les tests : les contrôles résiduels qui restent à écrire s'écriront à la main. C'est
la conséquence assumée que la feature 002 nomme `H-04`, et elle est irréversible sans un ADR qui
raye le point 3.

## Alternatives Considered

- **Lecture littérale — l'humain écrit tous les fichiers de la feature** *(écarté)*. Aucune dérogation,
  aucun résiduel de relecture. Écarté pour deux motifs, dont le second est le décisif : le coût
  (≈ 2 800 lignes, 73 tâches, la chaîne `/scd-sdd:run` inutilisable sur 16 lots sur 17) et surtout
  l'**incohérence non écrite** qu'il institue — le mécanisme existant, lui, a été écrit par l'IA
  en entier. Exiger de la suite ce qu'on n'a pas exigé de la base est tenable ; le faire sans
  l'écrire ne l'est pas.
- **Découpage par autorat — l'humain n'écrit que ce qui *arme*** *(écarté)*. L'humain tape à la main
  les quatre fichiers qui décident *ce qui est bloqué* (`protected-paths.ts`, `protect-paths.mjs`,
  `settings.json`, `ci.yml`, ≈ 200 lignes) ; l'IA écrit les ≈ 2 600 lignes de logique de contrôle.
  Attrayant parce qu'il place la main humaine là où la subversion est **invisible à la relecture d'un
  gros diff** — une entrée retirée d'une liste. Écarté parce qu'il déplace le résiduel sans le
  réduire : la logique d'un contrôle (`approval.ts` qui retourne toujours `passé`) reste
  neutralisable par l'IA, et l'illusion d'une frontière nette rendrait la relecture des PR **moins**
  attentive, pas plus.
- **Amender ADR-0006 pour y inscrire l'exception** *(écarté)*. L'exception est de nature transitoire
  et se raconte mal dans un ADR dont le sujet est le dispositif permanent ; l'inscrire là rendrait
  l'extinction (point 3) invisible au lecteur d'ADR-0006, alors qu'elle est ce qui rend la dérogation
  acceptable.

## Constraints

> À activer seulement une fois cet ADR promu en `accepted` (source de vérifications déterministes).

- **INTERDIT** : à l'IA d'éditer le mécanisme d'application **hors** d'un régime d'amorçage déclaré
  par une feature nommée (ADR-0006 reste la règle par défaut).
- **OBLIGATOIRE** : un régime d'amorçage nomme les chemins qu'il ouvre et **le lot qui l'éteint**.
- **OBLIGATOIRE** : pendant le régime, un lot = une pull request relue par un humain avant fusion ;
  **INTERDIT** de fusionner sans relecture au motif que le portail est vert.
- **OBLIGATOIRE** : l'expiration est **mécanique** — l'extension de la liste des chemins possédés par
  l'humain sur la branche par défaut ; **INTERDIT** une expiration par date ou par déclaration.
- **INTERDIT** : pendant le régime, tout changement qui réduit la couverture d'un contrôle existant,
  retire une entrée d'une liste de chemins protégés ou désarme un check requis, hors d'un `SHALL`
  explicite de la feature.

## Related

- ADR-0006 amdt 2026-08-01 pts 3-5, amdt 2026-08-02 (b) — l'interdiction et les trois maillons.
  **Non amendé** — voir § *Relation à ADR-0006*
- `CLAUDE.md` § *Contraintes actives · Génération IA (ADR-0006)* — la ligne de renvoi, due dans la
  PR qui promeut cet ADR
- ADR-0009 § 5 — la base de référence des mutants, l'un des chemins concernés
- ADR-0012 *(candidat)* — la preuve d'attribution, qui prend le relais à l'extinction du régime
- `specs/002-mecanisation-portail/` — `H-04`, `FR-036`, lot `R16`
