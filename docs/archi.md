# Architecture — ColibriCMS

| | |
|---|---|
| **Statut** | Brouillon |
| **Date** | 2026-08-13 |
| **Trace vers** | [PRD](./prd.md), [Stack](./stack.md) |
| **Consommé par** | ADR, CI, niveau specs |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants `I1`–`I6`, contraintes `C1`–`C10` |

> **Portée.** Ce document répond au *comment* au niveau **structure** : ce que la stack impose
> déjà, ce qui restait ouvert, et ce que le code s'interdit désormais. Ce n'est pas un design —
> aucun schéma de table, aucun nom de classe, aucune signature. Il est une **synthèse** : le
> rationale de chaque invariant part dans un ADR, écrit par la phase suivante.
>
> **Homonymie à ne pas confondre.** Les `I1`–`I6` du [socle de livraison](./socle-de-livraison.md)
> sont les invariants **commerciaux** du studio ; les `I1`–`I10` de **ce** document sont les
> invariants **de structure** du code. Aucun rapport de numérotation entre les deux. Ce document
> écrit toujours « socle `I3` » quand il désigne les premiers.

## Légende

- **Invariant** — une règle de structure qui doit rester vraie tout le temps (« aucun fichier de
  `src/core/` n'importe `src/platform/` »). Ce n'est pas un design : c'est ce qu'on s'interdit.
- **Trace observable** — ce qu'un contrôle automatique regarderait pour prendre la règle en défaut :
  un chemin de fichier, une ligne d'import, une occurrence dans une source. **Sans trace observable,
  la règle n'entre pas** — sinon personne ne pourra jamais dire si elle est respectée.
- **Caractéristique** — la qualité qu'on cherche à préserver. Les invariants existent pour la
  servir ; la colonne *Sert* dit laquelle.
- **Classe** — la famille de l'invariant (1 = sens des dépendances, 5 = placement des fichiers…),
  utile parce que chaque famille se vérifie avec le même genre d'outil.
- **Candidat ADR** — la colonne *ADR* est **vide** ici : elle sera remplie par `/scd-sdd:adr`, qui
  fige le pourquoi de chaque invariant dans un fichier à part. Tant qu'elle est vide, l'invariant
  est un **candidat**.

## Vue d'ensemble

ColibriCMS est une application web à instance unique par site, servie par un seul Worker : un site
pré-rendu et une administration cohabitent dans un même dépôt et derrière une même origine. **Style
macro : monolithe modulaire à cinq zones** — `site/`, `admin/`, `render/`, `core/`, `platform/` —,
la frontière étant tenue par le placement des fichiers et par le sens des imports, puisque le
déploiement unique lui interdit d'être tenue autrement. **Style micro : ports et adaptateurs
allégés** — `core/` déclare ce dont il a besoin, `platform/` le fournit, la route assemble les deux
à chaque requête, comme `workerd` l'impose déjà. Le rendu d'un emplacement éditable n'existe qu'en
un lieu, atteint par le site publié comme par l'aperçu.

Une zone est un répertoire, et c'est ce qui rend la frontière observable :

| Zone | Chemin | Ce qu'elle porte |
|---|---|---|
| `site/` | `src/site/` | les gabarits et composants propres au site publié |
| `admin/` | `src/admin/` | l'application d'administration |
| `render/` | `src/render/` | le rendu des emplacements éditables, partagé par le publié et l'aperçu |
| `core/` | `src/core/` | la logique métier, sans framework ni plateforme |
| `platform/` | `src/platform/` | les adaptateurs : D1, envoi d'e-mail, GitHub, session |
| — | `src/pages/` | **pas une zone** : la surface de routage imposée par Astro, où un fichier vaut une URL. Les routes y sont minces et délèguent à leur zone |

## Caractéristiques architecturales retenues

| # | Caractéristique | Ce qu'elle exige de la structure | Sert (FR/SC) |
|---|---|---|---|
| **C1** | Reconstructibilité sans le produit | le graphe d'imports du site publié n'atteint jamais la base : un build depuis les seuls fichiers plats produit le site | FR-107, FR-109, SC-011 |
| **C2** | Confinement de l'origine commune | un seul lieu où du HTML brut est rendu ; le garde de session tenu par le placement des routes ; la surface publique close | FR-061, FR-082, SC-021 |
| **C3** | Fidélité de l'aperçu | un seul jeu de composants de rendu, atteignable depuis les deux entrées | FR-081, SC-016 |
| **C4** | Uniformité de la flotte | toute valeur propre à une instance qui peut vivre dans les fichiers, en un seul fichier ; hors contenu, le diff entre deux dépôts est vide | FR-104, FR-105, SC-008 |
| **C5** | Testabilité sans plateforme | la logique métier s'instancie sans base, sans HTTP et sans Worker | SC-016, SC-019 |

`C5` traduit une exigence du Brief qui n'a pas de `FR` propre — « le code entrant n'est pas relu
ligne à ligne, la confiance vient de vérifications mécaniques ». Les deux `SC` cités sont les seuls
critères du PRD qui décrivent un **calcul exact** : le récapitulatif de publication et les trois
nombres de l'écran des demandes.

## Contraintes imposées par la stack

Aucune de ces lignes n'a d'ADR : on ne décide pas ce qui est déjà décidé. Le partage se lit à une
question — *le framework échouerait-il sans cette règle ?* Si oui, c'est une contrainte.

| Contrainte | Imposée par | Conséquence structurelle |
|---|---|---|
| Un fichier de `src/pages/` = une URL | Astro | l'emplacement d'un gabarit de page n'est pas un choix |
| Site public pré-rendu, routes serveur dans le même arbre de routes | Astro + `@astrojs/cloudflare` | public et administration cohabitent dans une seule arborescence |
| Un seul artefact déployé — toutes les routes serveur dans un Worker | Cloudflare Workers | aucune frontière ne peut être tenue par le déploiement ; toutes sont internes au dépôt |
| Les liaisons (D1, `send_email`, Durable Object) ne s'atteignent que depuis le contexte d'une requête | `workerd` | aucun module n'ouvre la base au chargement ; l'accès se passe de main en main depuis la route — un conteneur d'injection est hors jeu |
| Ni système de fichiers, ni sous-processus ; API Node absente par défaut | `workerd` | tout effet passe par une liaison ou par le réseau |
| Ce qu'un composant hydraté importe part dans le navigateur | Astro + Svelte 5 | le graphe d'imports **est** la frontière de confidentialité |
| Les en-têtes de `_headers` ne s'appliquent pas aux réponses générées par le code | Cloudflare · Static Assets | deux porteurs d'en-têtes — arbitré en Stack, ligne « En-têtes de réponse » |
| Une politique de sécurité livrée en `<meta>` ne peut exprimer ni `frame-ancestors`, ni `report-uri`, ni `sandbox` | spécification CSP | l'en-tête écrit dans le code reste nécessaire quoi qu'il arrive |
| Migrations D1 en fichiers SQL numérotés dans un répertoire dédié | `wrangler d1 migrations` | l'évolution du schéma est un répertoire ordonné |
| Contenu publié : un répertoire par objet ; médias sur une branche orpheline | Stack, candidats n° 4 et 7 | la forme des fichiers déposés n'est plus ouverte |
| TypeScript strict ; plafond de 3 Mo gzip du Worker | Stack candidat n° 10 ; palier gratuit | aucune couche d'abstraction n'est gratuite |

## Invariants

| # | Invariant | Classe | Trace observable | Sert | ADR |
|---|---|---|---|---|---|
| **I1** | Le sens des dépendances entre zones est unique et descendant : `src/pages/` → toutes ; `src/site/` → `src/render/`, `src/core/` ; `src/admin/` → `src/render/`, `src/core/`, `src/platform/` ; `src/render/` → `src/core/` ; `src/platform/` → `src/core/` ; `src/core/` → aucune. Toute autre arête est interdite | 1 — sens des dépendances | ligne d'import dont la source et la cible violent la matrice | C1, C2, C5, FR-107, SC-011 | [ADR-0021](./adr/0021-sens-descendant-des-dependances-entre-zones.md) |
| **I2** | Aucun fichier de `src/core/` n'importe `astro`, `svelte`, `@astrojs/*` ni `cloudflare:*` | 8 — isolation du framework | ligne d'import dans un fichier de `src/core/` | C5, C1, SC-016, SC-019 | [ADR-0022](./adr/0022-core-sans-framework-ni-plateforme.md) |
| **I3** | `src/render/index.ts` est le seul chemin de `src/render/` importé depuis l'extérieur de la zone, et le gabarit de page publiée `src/site/page.astro` en est l'unique importateur ; ce gabarit est lui-même importé par la route publiée `src/pages/[...slug].astro` **comme** par la route d'aperçu `src/pages/admin/apercu/[...slug].astro` | 4 — frontières de modules | chemin importé, dans un fichier hors de `src/render/` ; l'absence de l'import de `src/site/page.astro` dans l'une des deux routes | C3, FR-081, SC-016 | [ADR-0023](./adr/0023-rendu-partage-par-le-publie-et-l-apercu.md) |
| **I4** | Aucun fichier `.astro` sous `src/admin/` ne porte de directive `client:*` | 9 — API prohibée | la directive, dans un gabarit sous `src/admin/` | C2, FR-082, SC-021 | [ADR-0024](./adr/0024-administration-sans-directive-client.md) |
| **I5** | `{@html}` et `set:html` n'apparaissent que sous `src/render/markdown/` ; aucune occurrence ailleurs dans les sources | 9 — API prohibée | l'occurrence, hors du chemin autorisé | C2, FR-018, FR-069 | [ADR-0025](./adr/0025-html-brut-confine-au-rendu-markdown.md) |
| **I6** | Tout fichier de route sous `src/pages/api/` ou `src/pages/admin/`, hors du sous-arbre `src/pages/api/public/`, importe le garde de session `src/platform/session/index.ts` ; aucun fichier de `src/pages/api/public/` ne lit un corps `multipart` | 5 — placement | l'absence de cet import, dans un fichier de route concerné ; l'appel de `request.formData()`, dans un fichier de `src/pages/api/public/` | C2, FR-061, FR-082, FR-097 | [ADR-0026](./adr/0026-garde-de-session-par-import-et-surface-publique-close.md) |
| **I7** | L'identifiant de l'objet qui porte le compteur de fréquence est dérivé d'une constante littérale du code ; aucun appel à `idFromName`, dans `src/platform/frequence/`, ne prend une valeur issue d'une requête | 9 — API prohibée | l'argument de `idFromName`, dans `src/platform/frequence/` | C2, FR-007, FR-062 | [ADR-0027](./adr/0027-objet-de-frequence-nomme-par-une-constante.md) |
| **I8** | Les valeurs propres à une instance qui vivent dans les fichiers — le domaine, la clé **publique** Turnstile, et tout ce que la ligne « Configuration d'instance » de `docs/stack.md` n'affecte pas à l'un des trois autres lieux — ne figurent que dans le fichier d'instance `instance.json`, à la racine du dépôt ; aucun autre fichier versionné hors contenu ne les porte. Les trois autres lieux gardent les leurs : rattachement D1 et destination d'acheminement dans la configuration du déploiement, clé de vérification Turnstile dans le compte Cloudflare, adresse autorisée en D1 | 5 — placement | l'occurrence du domaine ou de la clé publique Turnstile, hors d'`instance.json` | C4, FR-104, FR-105, SC-008 | [ADR-0028](./adr/0028-valeurs-d-instance-dans-le-fichier-d-instance.md) |
| **I9** | Les préfixes que la publication a le droit d'écrire sont déclarés dans la constante littérale `PREFIXES_AUTORISES` de `src/core/publication/prefixes.ts`, seul porteur de cette liste, et `.github/` n'y figure pas | 9 — API prohibée | la valeur de `PREFIXES_AUTORISES`, dans `src/core/publication/prefixes.ts` | FR-101, FR-086, FR-089 | [ADR-0029](./adr/0029-prefixes-de-publication-en-constante-unique.md) |
| **I10** | La configuration Astro et celle du Worker lisent dans `instance.json` les valeurs qu'`I8` y loge ; aucune d'elles n'y est écrite en dur. Les liaisons de plateforme, elles, restent déclarées dans la configuration du déploiement — c'est leur lieu | 5 — placement | la lecture d'`instance.json`, dans `astro.config.*` et dans `wrangler.*` | C4, FR-104, FR-105, SC-008 | [ADR-0030](./adr/0030-configurations-lisent-le-fichier-d-instance.md), remplacé par [ADR-0032](./adr/0032-invariant-i10-restreint-a-la-configuration-astro.md) |

**Quatre de ces invariants viennent de `docs/stack.md` sous une forme resserrée**, et la
transformation se déclare ici plutôt que de se découvrir à la lecture :

- La Stack écrivait « aucune donnée fournie par un visiteur n'atteint un rendu HTML brut ». Suivre
  une donnée jusqu'à son rendu n'est pas décidable statiquement ; `I5` retient la forme qui l'est —
  **un seul lieu où le HTML brut est rendu**, et il ne rend que le Markdown restreint. C'est plus
  strict que l'énoncé d'origine, et c'est ce qui le rend vérifiable.
- La Stack écrivait « aucun script ni style en ligne sans nonce ou empreinte dans l'administration »,
  et une trace « dans les réponses et dans les sources ». Une réponse est du runtime, donc hors
  admission. `I4` retient la moitié statique, et l'arbitrage du § suivant explique pourquoi elle
  suffit.
- La Stack écrivait « rien de dérivé d'une origine ne survit à la fenêtre de comptage ». Elle en
  nommait trois falsifications ; **une seule est statique** — un objet nommé d'après une origine —
  et c'est `I7`. Les deux autres sont nommées plus bas comme non admises.
- La Stack écrivait « toute route qui ne sert pas une page publiée exige une session valide », et,
  symétriquement, décrivait la surface publique par ce qu'elle est ouverte à. Ni « ne pas servir une
  page publiée », ni « ouverte au visiteur anonyme » ne se lisent dans un fichier : ce sont des
  propriétés de l'appelant, pas de la source. `I6` **retourne la polarité** — au lieu de décrire qui
  entre, il impose ce que la route importe —, et le manquement devient une **absence d'import**, qui
  se lit. Son périmètre n'est pas choisi : c'est la liste bornée de chemins que `run_worker_first`
  impose déjà par ailleurs, `/api/*` et l'administration. Il s'ensuit que **la route d'aperçu vit
  sous `src/pages/admin/`** ; l'ajouter ailleurs demanderait un troisième préfixe servi par le code,
  donc une révision de la Stack.

**`I10` referme la réserve que la Stack déposait sur cette phase** (candidat n° 20, réserve
« la forme exacte reste à `archi` ») : « nom, format et mécanisme de lecture du fichier par les
deux configurations qui en dépendent ». `I8` en rend le nom et le format — `instance.json`, à la racine —, `I10` le mécanisme
de lecture. Les deux se complètent sans se recouvrir : `I8` interdit qu'une valeur **logée dans le
fichier** vive ailleurs, `I10` impose que les deux configurations aillent l'y chercher plutôt que de
la redire. Ni l'un ni l'autre ne déplace les trois lieux que la Stack imposait par ailleurs — les
liaisons de plateforme, les secrets et l'adresse autorisée y restent.

**Ce que l'arbitrage de la CSP de l'administration a rendu, et pourquoi `I4` prend cette forme.**
Astro sait poser une politique de sécurité depuis `astro@6.0.0` et calcule lui-même les empreintes
de ses scripts groupés, îlots compris — mais il la pose dans un `<meta>`, jamais dans un en-tête, et
sans nonce.

> *Sourcé le 2026-08-13. Expérimentale en `astro@5.9`, l'API est stable depuis `astro@6.0.0` ; la
> [référence CSP](https://docs.astro.build/en/reference/experimental-flags/csp/) écrit « Added in:
> `astro@6.0.0` » et « Astro will add a `<meta>` element inside the `<head>` element of each page ».
> **L'absence de nonce n'est pas un manque, c'est un refus de conception** : le
> [billet 5.9](https://astro.build/blog/astro-590/) explique qu'un nonce « requires a server/edge
> function » réécrivant le HTML à chaque requête, ce qui « wouldn't work for websites that are
> served from static hosts » — d'où le choix des empreintes. La référence note que les scripts en
> ligne écrits à la main ne sont **pas** couverts d'office (« Inline scripts are not supported out
> of the box »), ce qui vaut confirmation par l'autre bout : la fonctionnalité ne dispense pas de
> l'invariant `I4`, elle en dépend.*

La quatrième porte de la Stack — du texte d'inconnu affiché dans la liste des demandes —
n'a que deux parades et **aucun repli**. Confier l'une des deux à une fonctionnalité de framework,
sous une flotte qu'on met à jour sans code propre au client (`FR-105`), a été écarté au profit d'un
porteur unique : l'en-tête écrit dans le code, avec `script-src 'self'` et rien d'autre. C'est
possible parce que l'administration ne produit aucun script en ligne — d'où `I4`, et d'où le fait
que l'administration se bâtit comme une application montée par un point d'entrée externe plutôt que
comme des îlots dans des pages. **Le site public n'est pas concerné** : il garde ses îlots et sa
politique portée par `_headers`.

## Ce que cette architecture n'admet pas comme invariant

Ces propriétés sont hors périmètre **par construction** — les taire ferait croire le contraire, et
sans ça la proposition revient à chaque re-passe.

- **Classe 12 — conformité sémantique de nommage à l'intention métier** : relève du jugement, pas
  d'un grep. En particulier `FR-117` (aucun terme de développeur dans l'interface d'édition), qui
  reste une exigence à vérifier au niveau specs.
- **Classe 13 — contrats de comportement runtime** : `SC-004` (mise en ligne en moins de cinq
  minutes), `SC-005` (Lighthouse ≥ 95), la durée du bail de publication, l'expiration des sessions
  de `FR-118`. Ce sont des `SC` et des `FR`, pas des invariants.
- **Classe 14 — drift de configuration, sécurité runtime, coûts** : la liste `run_worker_first`
  bornée, l'absence de moyen de paiement, le maintien en vie du jeton d'écriture. Le premier est un
  contrôle de configuration que `ci` porte déjà ; les deux autres sont des lignes de la recette de
  livraison.
- **Classe 15 — propriétés holistiques composites** : « l'aperçu rend exactement le publié » au sens
  de l'égalité observée, « aucun secret dans le fichier d'instance », « la posture de sécurité de
  l'administration ». `I3`, `I8` et `I4` en tiennent chacun la moitié structurelle, jamais le tout.

**Proposé, puis refusé faute de trace observable :**

- *« Une route de `src/pages/` reste mince et délègue à sa zone. »* Aucun seuil ne rend « mince »
  falsifiable sans arbitraire ; la règle est réelle et se tient à la main. C'est le prix assumé du
  découpage en cinq zones.
- *« Tout chemin écrit par la publication dérive de la constante de `I9`. »* Un chemin construit
  dynamiquement ne se suit pas statiquement. `I9` ne retient que la constante elle-même ; la
  dérivation reste une règle de relecture.
- *« Aucune entrée du compteur de fréquence ne franchit sa fenêtre »* et *« la clé de fenêtre change
  d'une fenêtre à l'autre »* — les deux autres falsifications que la Stack nommait. Toutes deux sont
  du comportement à l'exécution : elles descendent en specs, et le § « Vérification mécanique
  obligatoire » de `docs/stack.md` les a déjà versées à `ci` comme contrôle de sources, non comme
  invariant de structure.
- *« Aucun secret n'entre dans le fichier d'instance. »* Reconnaître un secret est sémantique. `I8`
  tient le versant vérifiable — quelles valeurs y vivent —, jamais la nature de ce qui y entrerait.

**Ce que cette phase n'a pas tranché, faute du fait qui départage.** La Stack lui renvoyait la
bifurcation du pipeline d'images — variantes produites au build, ou produites à la publication
(candidat n° 19). Le choix se décide sur la durée d'un build à la limite de conception de `C5`, et
cette durée **ne peut pas être mesurée aujourd'hui** : le dépôt n'a pas une ligne de code, et un
chiffre obtenu en local ne dirait rien du matériel de Workers Builds. La forme retenue en Stack —
variantes au build — tient donc telle quelle, et la bifurcation reste ce qu'elle est : une révision
de la Stack, à instruire au premier déploiement réel, jamais un invariant de structure.
