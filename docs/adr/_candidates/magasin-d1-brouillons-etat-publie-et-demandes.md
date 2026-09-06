# Candidat ADR : Magasin — D1 porte les brouillons, l'état publié et les demandes ; le dépôt reçoit la copie publiée
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0003-magasin-d1-brouillons-etat-publie-et-demandes.md` (ADR-0003 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

Le produit doit tenir ensemble deux propriétés que le socle de livraison impose et qu'un seul
magasin ne donne pas :

- l'invariant `I2` du [socle de livraison](../../legacy/socle-de-livraison.md) — « le contenu existe à
  tout moment en clair, hors base » — et sa contrainte `C1`, qui fait écrire le contenu dans la
  base **et** le commiter en fichiers plats à la publication ;
- un **index inverse** interrogeable : `FR-032` exige d'indiquer, pour une image donnée, les
  emplacements où elle est utilisée.

Servis par ailleurs : `FR-026` (enregistrement du brouillon), `FR-044`, `FR-051`, `FR-065`
(enregistrement d'une demande à réception), `FR-078` (compter une demande retirée après
effacement de son contenu), `FR-092` (abandon d'un brouillon).

La contrainte de plateforme qui décide est le plafond de **50 sous-requêtes par requête** des
Workers Cloudflare.

## Décision

Nous utiliserons **Cloudflare D1** comme magasin des brouillons, de l'état publié et des
demandes. Le **dépôt** recevra la copie publiée en fichiers plats, écrite à la publication.

## Conséquences

**Positives.**

- L'invariant `I2` et la contrainte `C1` du socle de livraison sont tenus sans retouche : le
  contenu publié est en clair dans le dépôt, daté du commit.
- L'index inverse de `FR-032` se lit en une requête, à la lecture comme à la reconstruction.
- Le compteur de demandes vit dans le compte de la cliente, jamais dans un service tiers
  (contrainte `C8` du socle de livraison).

**Négatives — ce à quoi le code s'engage.**

- **Ce que D1 porte seul n'a aucune copie.** Les invariants du socle ne couvrent que la moitié
  **copiée**, c'est-à-dire le publié. Restent sans copie : les **brouillons** de texte, les
  **médias en brouillon** — le binaire lui-même, stocké en `BLOB` — et la **suite donnée** à
  chaque demande (`FR-071`).
- **La reprise après perte n'est pas établie.** Ni `docs/stack.md`, ni le socle de livraison,
  ni aucun rapport de `docs/legacy/research/` ne porte sauvegarde, export ou restauration : le fait
  est **absent, pas contesté**. Ce que la plateforme sait rendre est le point **8** de « À
  constater en recette » de `docs/stack.md`, et c'est lui qui départagera les deux issues —
  créer une exigence de sauvegarde, ou assumer la perte par écrit. **Dette au dossier de
  `/scd-sdd:premortem socle`**, seul niveau qui puisse trancher, et il ne doit pas trancher
  avant ce constat.
- **Les demandes survivent, leur liste ne survit pas.** Chaque demande est expédiée chez la
  cliente par e-mail au moment où elle arrive (`FR-063`) ; ce qui disparaît avec la base est
  leur **liste** et leur **suite** — donc le second des deux nombres de `US10`, « ce que ça a
  donné » (`FR-075`, `FR-077`), que rien ne reconstitue. Le Brief assume cette perte **au
  départ du CMS** — « la suite donnée sert le pilotage courant de l'activité, elle n'est pas un
  actif du site » — ; il ne l'assume pas **par accident**, et le motif ne s'y transporte pas.
- **Le seul objet du lot qu'une éditrice ne peut pas ressaisir est le média en brouillon.**
- **Le palier gratuit borne la base à 500 Mo**, partagés entre les brouillons, les médias en
  brouillon et les demandes — et non les 5 Go que l'Annexe A du socle de livraison connaissait,
  qui sont le total du **compte**.

## Alternatives considérées

- **Le dépôt EST le magasin** (et sa variante *dépôt + index D1 dérivé*) : écartée car
  reconstruire l'index inverse qu'exige `FR-032` sans base dépasse le plafond de **50
  sous-requêtes par requête** des Workers — à la lecture comme à la reconstruction.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, réserve posée le
  2026-08-13 par le traitement de `S-12`. Revue humaine : 2026-08-13.
