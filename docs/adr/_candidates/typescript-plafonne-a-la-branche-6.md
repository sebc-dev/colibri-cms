# Candidat ADR : TypeScript est plafonné à la branche 6, et le plafond est une contrainte de flotte
Statut : Candidat | Date : 2026-08-15 | Déposé par : `specs/001-scaffold-projet/plan.md` décision 1
Trace vers : [docs/ci.md](../../ci.md) § L'état du dépôt · [ADR-0010](../../legacy/1.x/adr/0010-langage-typescript-strict.md)
(mode strict, aucune version) · [ADR-0021](../../legacy/1.x/adr/0021-sens-descendant-des-dependances-entre-zones.md)
(`I1`, rendu par la chaîne ESLint)

## Contexte

`ADR-0010` fixe le **mode strict** de TypeScript et rien d'autre ; `docs/ci.md` l'écrit
explicitement — « `ADR-0010` n'épingle aucune version de TypeScript ». Aucun des 32 ADR acceptés ne
porte de version, et `docs/stack.md` non plus.

Or le scaffold ne peut pas prendre la version courante. [officiel · cité] registre npm, lu le
2026-08-15 :

- `typescript@7.0.2` est la version courante ;
- `typescript-eslint@8.66.0` déclare le pair `typescript >=4.8.4 <6.1.0` ;
- `@astrojs/svelte@9.0.1` déclare `^5.3.3 || ^6.0.0`.

Prendre TypeScript 7 **casse la chaîne ESLint**, donc le job `boundaries`, donc la **seule**
vérification de `I1` — le sens descendant des dépendances entre les cinq zones. `arch-invariants`
ne la rend pas et le déclare de lui-même : une expression régulière ne résout ni les alias, ni les
ré-exports, ni les barils. Le contrôle qui tient `ADR-0021` s'éteindrait donc en silence, sans
qu'aucun écran ne change.

**Pourquoi ce n'est pas une décision de feature.** `FR-105` et `SC-008` exigent qu'une nouvelle
version se déploie sur toute instance existante sans code propre au client : la version de
TypeScript est la même sur toute la flotte, et c'est une **fusion dans le dépôt de chaque cliente**
qui la fait bouger. Une contrainte écrite dans le `plan.md` d'une feature ne serait lue par
personne au moment où elle mordrait — la feature suivante qui monte TypeScript ne croiserait rien
qui l'en empêche, et la panne se manifesterait par un job informatif devenu muet.

## Décision

TypeScript est épinglé à la **dernière version de la branche 6** — `6.0.3`, publiée le 2026-04-16 —
et **ne monte pas en branche 7** tant que `typescript-eslint` n'a pas élargi son pair.

## Conséquences

- Le job `boundaries` reste exécutable, donc `I1` reste vérifié — c'est le seul motif du plafond.
- Toute montée de TypeScript devient une décision de socle, pas un geste de feature : elle exige de
  rouvrir ce document.
- Le projet reste une version majeure derrière l'amont. Le coût est nul aujourd'hui, le dépôt ne
  portant aucune source ; il croît avec la base de code.
- **Condition de révision, à surveiller** : la publication d'un `typescript-eslint` dont le pair
  admet TypeScript 7. Le plafond tombe alors sans autre motif à instruire.
