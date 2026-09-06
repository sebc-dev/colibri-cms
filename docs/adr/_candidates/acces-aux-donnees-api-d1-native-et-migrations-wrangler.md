# Candidat ADR : Accès aux données — l'API D1 native du Worker et les migrations `wrangler d1 migrations`, sans couche intermédiaire
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0018-acces-aux-donnees-api-d1-native-et-migrations-wrangler.md` (ADR-0018 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

`FR-105` fait déployer une nouvelle version sur une instance existante, `FR-106` interdit que ce
déploiement entraîne une perte du contenu, et `SC-008` en fait un critère mesuré — « sans
modification de code spécifique à ce client ». Ce trio exige des migrations **versionnées et
rejouables**, tenues à l'identique **sur toute la flotte**.

Le magasin est acquis ([ADR-0003](../../legacy/1.x/adr/0003-magasin-d1-brouillons-etat-publie-et-demandes.md)), et
il est **unique** : une seule base, une poignée de tables. Le plafond de **3 Mo gzip** du Worker
pèse sur toute dépendance ajoutée
([ADR-0001](../../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md)).

Faits de registre [officiel · cité], lus le **2026-08-13** : `kysely@0.29.5` n'expose **aucun**
point d'entrée D1 ; `kysely-d1@0.4.0` porte un **mainteneur unique**, dépôt
`aidenwallis/kysely-d1` ; `drizzle-orm@0.45.2` expose `./d1`, `./d1/driver` et `./d1/session` —
son pilote D1 est donc de **première main** — et `drizzle-kit@0.31.10` se présente comme « CLI
migrator tool … automatically generate SQL migrations ».

## Décision

Nous utiliserons l'**API D1 native du Worker** et les migrations **`wrangler d1 migrations`**,
**sans couche intermédiaire**.

## Conséquences

**Positives.**

- **Un seul porteur de migrations**, celui de la plateforme, déjà présent dans l'outil de
  déploiement et rejoué à chaque déploiement. C'est exactement ce dont `FR-106` et `SC-008`
  dépendent.
- **Aucune dépendance ajoutée** sous le plafond de 3 Mo gzip, et **aucun dialecte tiers** sur le
  chemin d'accès à la seule base du produit.
- L'évolution du schéma est un **répertoire ordonné** de fichiers SQL numérotés — lisible,
  versionné, et indépendant de tout outil hors `wrangler`.

**Négatives — ce à quoi le code s'engage.**

- **Pas de requêtes typées, ni de schéma décrit en un seul endroit.** TypeScript strict
  ([ADR-0010](../../legacy/1.x/adr/0010-langage-typescript-strict.md)) en couvre une part — pas tout : le lien
  entre une table et le type de ce qu'elle rend reste une déclaration à tenir à la main.
- **Le SQL est écrit à la main**, donc les paramètres liés sont obligatoires partout et chaque
  requête est à relire pour ça. Rien dans l'outillage ne l'impose.
- **Une borne de `FR-040` dépend d'un fait non acquis.** La documentation borne la ligne D1 à
  2 Mo et l'instruction SQL à 100 Ko — donc un binaire ne peut pas être inliné —, mais elle ne
  dit **rien** de la taille maximale d'un **paramètre lié**. Qu'un `BLOB` de ~2 Mo fasse
  l'aller-retour par un paramètre lié est le point **5** de « À constater en recette » de
  `docs/stack.md` : si le paramètre lié mord plus bas, c'est **ce** chiffre qui devient la borne
  du téléversement.
- **L'ergonomie de requête est le prix payé**, assumé : une base unique à une poignée de tables
  ne fait pas de ce critère un poids suffisant contre la propriété que le produit ne peut pas
  perdre.

## Alternatives considérées

- **Kysely** : écartée car il n'atteint D1 que par un dialecte **tiers**, `kysely-d1@0.4.0`,
  écrit ni par Kysely ni par Cloudflare et porté par un mainteneur unique. Le retenir
  retournerait contre le produit l'argument qui a servi à écarter Better Auth en
  [ADR-0006](../../legacy/1.x/adr/0006-auth-implementation-maison-sur-d1.md) — et cette fois sur le chemin d'accès
  à la **seule** base du produit.
- **Drizzle** : écartée sur les **migrations**, et non sur l'approvisionnement — son pilote D1
  est de première main. Il apporte ses propres migrations (`./d1/migrator` et `drizzle-kit`),
  donc un **second porteur** pour ce dont `FR-106` et `SC-008` dépendent. Le mécanisme de la
  plateforme deviendrait un outil de plus à tenir en phase avec `wrangler` **sur toute la
  flotte**, et le jour où les deux divergent la panne se manifeste au pire endroit : une montée
  de version sur une instance en production.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, les deux
  alternatives pesées le 2026-08-13 par l'audit de la stack sur faits de registre datés. Revue
  humaine : 2026-08-13.
