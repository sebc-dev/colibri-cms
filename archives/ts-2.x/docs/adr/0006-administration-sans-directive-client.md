# ADR-0006 : Aucun gabarit de `src/admin/` ne porte de directive `client:*`
Statut : Accepté | Date : 2026-08-25

Promu depuis `docs/legacy/1.x/adr/0024-administration-sans-directive-client.md` — ADR-0024, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x. Les renvois `FR-xxx`,
> `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers `docs/legacy/1.x/` : ce ne sont
> pas des noms de fichier.

## Contexte

[ADR-0015](../legacy/1.x/adr/0015-en-tetes-de-reponse-deux-porteurs.md) a retenu une **CSP stricte propre à
l'administration**, définie par ses interdits : aucun `unsafe-inline`, aucun `unsafe-eval`,
aucune source tierce hors Turnstile. C'est, avec l'invariant d'échappement, l'une des **deux
seules** parades au XSS same-origin — celui que la liste des demandes rend possible, puisque du
texte d'inconnus y atteint un écran d'administration.

Or l'**hydratation des îlots Svelte produit du script en ligne**
([ADR-0011](../legacy/1.x/adr/0011-ilots-svelte-5.md)). Il faudrait donc un nonce à chaque réponse — et Astro ne
sait pas en poser.

> *Sourcé le 2026-08-13.* Astro sait poser une politique de sécurité depuis `astro@6.0.0`, et
> calcule lui-même les empreintes de ses scripts groupés, îlots compris — mais **il la pose dans
> un `<meta>`, jamais dans un en-tête, et sans nonce**. La
> [référence CSP](https://docs.astro.build/en/reference/experimental-flags/csp/) écrit « Added
> in: `astro@6.0.0` » et « Astro will add a `<meta>` element inside the `<head>` element of each
> page ». **L'absence de nonce n'est pas un manque, c'est un refus de conception** : le
> [billet 5.9](https://astro.build/blog/astro-590/) explique qu'un nonce « requires a
> server/edge function » réécrivant le HTML à chaque requête, ce qui « wouldn't work for
> websites that are served from static hosts ». La référence note en outre que les scripts en
> ligne écrits à la main ne sont **pas** couverts d'office.

La Stack avait déposé « aucun script ni style en ligne sans nonce ou empreinte dans
l'administration », avec une trace « dans les réponses **et** dans les sources ». Une réponse
est du **runtime**, donc hors du périmètre d'un invariant de structure : cet invariant retient
la moitié **statique**, et l'arbitrage ci-dessus explique pourquoi elle suffit.

**Caractéristique architecturale servie** : `C2` — confinement de l'origine commune.
**Exigences servies** : `FR-082`, `SC-021`.

**Trace observable** : la **directive `client:*`**, dans un gabarit sous `src/admin/`.

## Décision

**Aucun fichier `.astro` sous `src/admin/` ne portera de directive `client:*`.**

Il s'ensuit que **l'administration se bâtit comme une application montée par un point d'entrée
externe**, et non comme des îlots dans des pages.

## Conséquences

**Positives.**

- **`script-src 'self'` et rien d'autre devient tenable** : pas de nonce à engendrer, pas
  d'empreinte à calculer, donc **aucun mécanisme ajouté** au chemin de chaque réponse
  d'administration. On ne satisfait pas le besoin, on le supprime.
- La seconde parade de la porte de la liste des demandes **ne dépend d'aucune fonctionnalité de
  framework** — donc d'aucune montée de version subie par toute la flotte (`FR-105`).
- La règle est **falsifiable dans les sources**, sans exécuter de réponse.

**Négatives — ce à quoi le code s'engage.**

- **Deux manières de bâtir cohabitent dans le même dépôt** : îlots côté public, application
  montée côté administration. C'est un coût d'apprentissage et de cohérence réel, payé à chaque
  écran d'administration.
- **L'invariant ne tient que la moitié statique.** Ce que la réponse porte réellement —
  l'en-tête et ses interdits — est du runtime : c'est un **contrôle bloquant** de `docs/ci.md`,
  pas cet invariant, et la présence seule de l'en-tête ne prouve rien.
- **Le style en ligne n'est pas couvert par cette forme.** L'invariant nomme `client:*`, non
  `style=` : ce versant reste à la charge du contrôle de CSP.
- **La règle ne vaut que sous `src/admin/`.** Le site public garde ses îlots et sa politique
  portée par `_headers` — l'asymétrie est voulue, mais elle est une exception de plus à
  connaître.

## Alternatives considérées

- **Poser la CSP par la fonctionnalité d'Astro** : écartée. Elle la pose en `<meta>`, qui ne
  peut exprimer ni `frame-ancestors`, ni `report-uri`, ni `sandbox` ; elle ne couvre pas les
  scripts en ligne écrits à la main ; et confier la parade à une fonctionnalité de framework,
  sous une flotte qu'on met à jour sans code propre au client (`FR-105`), met le risque hors de
  portée du produit.
- **Engendrer un nonce à chaque réponse d'administration et le poser dans le balisage** :
  écartée bien qu'elle soit réalisable — le second porteur d'en-têtes est le code lui-même,
  donc il pourrait poser la même valeur dans l'en-tête et dans le balisage. Elle ajoute un
  mécanisme sur le chemin de **chaque** réponse d'administration, quand l'interdit le rend
  inutile.

## Vérifiable ?

Oui — `arch-invariants`, invariant `I4` : aucune directive `client:*` sous `src/admin/`, plus la clause CSP partagée avec ADR-0015.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — arbitrage rendu en phase Archi le 2026-08-13
  sur sources datées. Revue humaine : 2026-08-13.
