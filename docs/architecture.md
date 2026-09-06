# ColibriCMS — Architecture

Le cap durable de la **structure** du code : les cinq zones, le sens des dépendances, et les
invariants `I1`–`I10` que le code s'interdit de franchir. C'est une synthèse de ce qu'un contrôle
pourrait prendre en défaut, pas un design — aucun schéma de table, aucune signature.

> **Le *pourquoi* n'est pas ici.** Chaque invariant existe pour une raison figée dans un **ADR**
> (`docs/adr/`, cité par son numéro 2.x quand la décision est promue ; sinon en attente de
> promotion dans `docs/adr/_candidates/`). Ce document dit *ce que* le code doit tenir ; l'ADR dit
> *pourquoi*. Ne pas rejuger un invariant ici : l'arbitrage vit dans l'ADR.
>
> **Source.** Repris de [`docs/1.x/archi.md`](./1.x/archi.md) (invariants de structure `I1`–`I10`),
> lui-même tracé vers le PRD et la Stack du cycle 1.x. À ne pas confondre avec les invariants
> **commerciaux** `I1`–`I6` du [socle de livraison](./socle-de-livraison.md) — aucun rapport de
> numérotation.

## Vue d'ensemble

Application web à instance unique par site, servie par **un seul Worker** : un site pré-rendu
(Astro) et une administration cohabitent dans un même dépôt et derrière une **même origine**. Le
déploiement unique interdit de tenir une frontière par le déploiement : elle se tient de l'intérieur
du dépôt, par le **placement des fichiers** et le **sens des imports**.

- **Style macro** — monolithe modulaire à cinq zones.
- **Style micro** — ports et adaptateurs allégés : `core/` déclare ce dont il a besoin, `platform/`
  le fournit, la route assemble les deux à chaque requête (ce que `workerd` impose déjà).
- Le rendu d'un emplacement éditable n'existe qu'en **un lieu**, atteint par le publié comme par
  l'aperçu.

| Zone | Chemin | Ce qu'elle porte |
|---|---|---|
| `site/` | `src/site/` | gabarits et composants propres au site publié |
| `admin/` | `src/admin/` | l'application d'administration |
| `render/` | `src/render/` | le rendu des emplacements éditables, partagé par le publié et l'aperçu |
| `core/` | `src/core/` | la logique métier, sans framework ni plateforme |
| `platform/` | `src/platform/` | les adaptateurs : D1, envoi d'e-mail, GitHub, session |
| — | `src/pages/` | **pas une zone** : la surface de routage imposée par Astro (un fichier = une URL) ; les routes y sont minces et délèguent à leur zone |

## Caractéristiques servies

- **C1 — Reconstructibilité sans le produit** : le graphe d'imports du site publié n'atteint jamais
  la base ; un build depuis les seuls fichiers plats produit le site.
- **C2 — Confinement de l'origine commune** : un seul lieu où du HTML brut est rendu ; garde de
  session tenu par le placement des routes ; surface publique close.
- **C3 — Fidélité de l'aperçu** : un seul jeu de composants de rendu, atteint identiquement par les
  deux entrées.
- **C4 — Uniformité de la flotte** : toute valeur d'instance qui peut vivre dans les fichiers tient
  en un seul fichier ; hors contenu, le diff entre deux dépôts est vide.
- **C5 — Testabilité sans plateforme** : la logique métier s'instancie et se vérifie sans base, sans
  HTTP, sans Worker.

## Invariants

Le sens des dépendances est **unique et descendant**. Toute arête hors de cette matrice est
interdite :

```
src/pages/    → toutes
src/site/     → src/render/, src/core/
src/admin/    → src/render/, src/core/, src/platform/
src/render/   → src/core/
src/platform/ → src/core/
src/core/     → aucune
```

| # | Invariant | Trace observable |
|---|---|---|
| **I1** | Le sens des dépendances entre zones suit la matrice ci-dessus ; toute autre arête est interdite | une ligne d'import dont la source et la cible violent la matrice |
| **I2** | Aucun fichier de `src/core/` n'importe `astro`, `svelte`, `@astrojs/*` ni `cloudflare:*` | une ligne d'import dans un fichier de `src/core/` |
| **I3** | `src/render/index.ts` est le seul chemin de `src/render/` importé depuis l'extérieur ; le gabarit `src/site/page.astro` en est l'unique importateur, et il est importé par la route publiée `src/pages/[...slug].astro` **comme** par la route d'aperçu `src/pages/admin/apercu/[...slug].astro` | chemin importé hors de `src/render/` ; absence de l'import du gabarit dans l'une des deux routes |
| **I4** | Aucun fichier `.astro` sous `src/admin/` ne porte de directive `client:*` | la directive, dans un gabarit sous `src/admin/` |
| **I5** | `{@html}` et `set:html` n'apparaissent que sous `src/render/markdown/` | l'occurrence, hors du chemin autorisé |
| **I6** | Toute route sous `src/pages/api/` ou `src/pages/admin/`, hors `src/pages/api/public/`, importe le garde de session `src/platform/session/index.ts` ; aucun fichier de `src/pages/api/public/` ne lit un corps `multipart` | absence de cet import ; appel de `request.formData()` sous `src/pages/api/public/` |
| **I7** | L'identifiant de l'objet porteur du compteur de fréquence dérive d'une constante littérale ; aucun `idFromName` de `src/platform/frequence/` ne reçoit une valeur issue d'une requête | l'argument de `idFromName`, dans `src/platform/frequence/` |
| **I8** | Les valeurs d'instance qui vivent dans les fichiers (domaine, clé **publique** Turnstile…) ne figurent que dans `instance.json`, à la racine ; aucun autre fichier versionné hors contenu ne les porte | l'occurrence du domaine ou de la clé publique, hors d'`instance.json` |
| **I9** | Les préfixes que la publication peut écrire sont déclarés dans la constante `PREFIXES_AUTORISES` de `src/core/publication/prefixes.ts`, seul porteur, et `.github/` n'y figure pas | la valeur de `PREFIXES_AUTORISES` |
| **I10** | La configuration Astro lit `instance.json` pour les valeurs qu'`I8` y loge ; aucune n'y est écrite en dur. La configuration du déploiement est **hors périmètre** : elle ne porte que des liaisons de plateforme | la lecture d'`instance.json`, dans `astro.config.*` |

## Ce qui n'est pas un invariant de structure

Hors périmètre par construction — le taire ferait croire le contraire :

- **FR-117** (aucun terme de développeur dans l'interface) relève du jugement, vérifié au niveau des
  specs, pas d'un grep.
- **Contrats de comportement runtime** : SC-004 (mise en ligne < 5 min), SC-005 (Lighthouse ≥ 95),
  l'expiration des sessions (FR-118), la durée d'un bail de publication — ce sont des `SC`/`FR`.
- **Propriétés holistiques** : « l'aperçu rend exactement le publié », « aucun secret dans le
  fichier d'instance », « la posture de sécurité de l'administration ». `I3`, `I8` et `I4` en
  tiennent chacun la moitié structurelle, jamais le tout.
