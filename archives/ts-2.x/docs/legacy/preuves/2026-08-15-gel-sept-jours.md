# Pièce datée — le gel d'approvisionnement de sept jours (SC-009, FR-019, T5)

| | |
|---|---|
| **Date** | 2026-08-15 |
| **Lot** | R1 — `specs/001-scaffold-projet` |
| **Vérifie** | `SC-009` : « une installation retient une version antérieure alors qu'une plus récente existe et a moins de sept jours » — le **comportement** de résolution à l'**ajout** d'une dépendance, distinct de l'installation verrouillée (`npm ci`, non concernée) |
| **Rejouable** | oui — voir la commande ci-dessous ; le résultat dépend de la date du jour et du registre npm au moment du rejeu |

## Ce qui a été fait

Dans un dossier **neuf**, sans lien avec le dépôt du projet (`/tmp/preuve-gel`), portant la
**même déclaration** `.npmrc` que le scaffold (`min-release-age=7`, copiée à l'identique de
`/home/negus/projets/colibri-cms/.npmrc`) :

```bash
mkdir /tmp/preuve-gel && cd /tmp/preuve-gel
cp <dépôt>/.npmrc .npmrc
printf '{ "name": "preuve-gel-sept-jours", "private": true }' > package.json
npm install astro
```

## Constat

Le registre npm publiait, au moment du test, **`astro@7.2.2`** — sortie le
**2026-08-13T20:42:51Z**, il y a moins de sept jours par rapport au **2026-08-15T17:42:52Z UTC**
de l'exécution. `npm install astro`, sous le gel de sept jours, **n'a pas résolu cette
version** : il a retenu **`astro@7.2.0`**, publiée le **2026-08-06T10:48:55Z** — la plus récente
version alors âgée d'au moins sept jours.

| Version | Publiée le (UTC) | Âge au moment du test | Retenue par `npm install astro` ? |
|---|---|---|---|
| `7.2.2` | 2026-08-13T20:42:51Z | ~1 j 21 h | Non — trop récente |
| `7.2.1` | 2026-08-11T16:49:05Z | ~4 j 1 h | Non — trop récente |
| **`7.2.0`** | **2026-08-06T10:48:55Z** | **~9 j 7 h** | **Oui — c'est elle qui a été installée** |

Vérifié après l'installation :

```bash
$ node -e "console.log(require('./node_modules/astro/package.json').version)"
7.2.0
```

`.npmrc` utilisé (identique à `/home/negus/projets/colibri-cms/.npmrc`) :

```ini
min-release-age=7
```

`npm --version` au moment du test : `11.16.0`.

## Ce que cette pièce ne couvre pas

- Elle ne teste pas `npm ci` : la spec (`FR-019`) est explicite — l'installation verrouillée
  réinstalle ce que le lockfile fixe, sans réexaminer aucune date de publication. C'est un
  comportement distinct, déjà couvert par l'étape 1 du script
  `scripts/verif-bout-en-bout.sh`.
- La **déclaration** de la clé (`FR-027`) — qu'elle vit bien dans `.npmrc`, à l'endroit où
  `dependency-review` (CI) la lit à chaque intégration — n'est pas ce que cette pièce démontre :
  c'est une vérification statique, distincte, portée par la tâche `T41`.
- Ce constat est **daté** : il dépend des versions publiées sur le registre npm au moment du
  test. Le rejouer un autre jour donnera d'autres numéros de version, mais la même propriété —
  la plus récente version éligible (≥ 7 jours) est retenue, jamais la plus récente tout court.
