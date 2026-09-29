# Prompt de recherche — Cloudflare Pages ou Workers static assets

> Composé le 2026-08-10. À coller dans Claude Research (Claude Desktop).
> Rapport attendu sous `docs/research/AAAA-MM-JJ-pages-ou-workers-static-assets.md`.

---

## Question

Cloudflare Pages est-il déprécié, gelé, mis en maintenance ou en fin de vie face aux Workers
avec static assets — et que devient le palier **gratuit** de part et d'autre ?

La question porte sur **deux axes distincts**, à départager séparément puis à recroiser :

- **(a) la cible de déploiement** du site public — un projet Pages, ou un Worker servant des
  static assets ;
- **(b) le système de build hébergé** — *Pages Build*, ou *Workers Builds*.

Dire explicitement si (a) contraint (b), et dans quel sens : peut-on déployer sur une cible sans
prendre le système de build de l'autre ?

**Décision servie.** Le choix de la cible de déploiement et du système de build d'un CMS pour
sites vitrines, arbitré en phase Stack. Le contexte impose trois choses, et elles décident :

1. **Palier gratuit strict, sans moyen de paiement enregistré sur le compte.** Un composant dont
   le dépassement se facture au compteur est disqualifié ; un composant qui oppose un mur (erreur,
   refus de déploiement) reste acceptable. Le compte appartient à la cliente finale, pas à
   l'intégrateur, et doit rester sans carte à la livraison.
2. **Site statique** : le HTML est bâti à la publication, consulter une page ne déclenche aucun
   traitement serveur. **Unique exception** : l'envoi d'un formulaire de demande de devis, qui
   déclenche un traitement serveur (réception, envoi d'un e-mail, écriture en base).
3. **Un déploiement = un site = un client**, convention identique d'un client à l'autre. Volume
   attendu : un site vitrine riche en photographies, de l'ordre de quelques milliers de fichiers
   par déploiement.

## Périmètre

**Inclus**

- Le **statut produit** de Cloudflare Pages : dépréciation, gel des nouveautés, mise en
  maintenance, fermeture de la création de nouveaux projets, date de fin de vie. Et
  symétriquement, le statut de Workers static assets (GA, bêta, en évolution).
- Le **palier gratuit des deux côtés**, chiffre par chiffre : nombre de fichiers par déploiement
  ou par version, taille maximale d'un fichier, nombre de déploiements ou de builds par mois,
  minutes de build, concurrence de build.
- Le **comportement au dépassement** de chacune de ces limites, séparément : mur (erreur, refus,
  file d'attente) ou compteur facturé. C'est le critère qui tranche.
- Ce que **consomme le service des assets** de part et d'autre : servir un fichier statique
  consomme-t-il un quota de requêtes ? Et le traitement serveur unique (Pages Functions d'un côté,
  code du Worker de l'autre) consomme-t-il le même quota, ou un autre ?
- L'existence, le caractère **imposé ou non**, le terme et le coût annoncé d'une **migration**
  Pages → Workers.
- L'exigence éventuelle d'un **moyen de paiement** pour créer ou faire vivre l'un ou l'autre.

**Exclus** — écrits, pour que la recherche ne s'étale pas

- Tout hébergement hors Cloudflare, et le build hors Cloudflare suivi d'un Direct Upload
  (`wrangler`) : l'hébergement Cloudflare est une donnée d'entrée du projet, pas un choix à
  justifier.
- Les autres composants de la plateforme — stockage objet, base, clé-valeur, Durable Objects,
  anti-abus, e-mail : ils font l'objet de recherches distinctes et sont hors sujet ici.
- Le choix du framework de site statique et de son adaptateur, déjà tranché. **Une exception** :
  ce que l'éditeur d'un adaptateur tiers **affirme du statut de Pages** est à rapporter, mais
  comme le dire d'un tiers sur un produit qui n'est pas le sien — jamais comme une source faisant
  autorité sur Cloudflare.
- Les plans payants, sauf pour dire précisément **ce qui bascule** au passage, et à partir de quel
  seuil.

**Horizon** — la réponse doit être vraie au **10 août 2026** et tenir sur **12 mois glissants**.
Rapporter en outre **toute date de fin de vie, de gel ou de mise en maintenance annoncée** au-delà
de cet horizon, avec sa source et sa date de publication.

## Contraintes de sourcing

- Source primaire exigée pour tout chiffre ; remonter au document d'origine. Un chiffre trouvé sur
  trois pages qui se citent l'une l'autre n'est pas recoupé : c'est une seule source.
- Étiqueter chaque source : officiel · préprint indépendant · benchmark d'éditeur · commercial.
  La documentation d'un éditeur fait autorité sur son propre produit, pas sur celui d'un autre.
- Séparer les niveaux de preuve : mesuré / rapporté / anecdotique / non étayé.
- Citer **verbatim** les passages qui portent une affirmation, et attribuer **par affirmation** —
  pas de bibliographie en fin de document que rien ne relie au texte.
- **Donner la date de dernière mise à jour de chaque page de documentation citée.** Sur cette
  question précise, la fraîcheur d'une page de doc est elle-même un indice du statut du produit.
- **L'absence de donnée est un résultat** : « le comportement au dépassement de X n'est documenté
  nulle part » est une réponse, à écrire comme telle et à ne pas remplacer par une estimation.
- Un silence n'est pas une dépréciation, et un renvoi vers un autre produit n'est pas une
  annonce de fin de vie. Distinguer ce que l'éditeur **annonce** de ce qu'un lecteur **infère**.

## Hypothèses concurrentes

Les sources divergent sur ce sujet. Ne pas trancher artificiellement : poser les hypothèses, dire
ce qui les départagerait, et la confiance de chacune.

- **H1 — Pages est en fin de vie de fait.** L'éditeur a cessé d'y investir, la documentation
  renvoie vers Workers, les nouveautés n'atterrissent que côté Workers, et l'écosystème (adaptateurs
  de frameworks) ne fait qu'acter l'état réel.
- **H2 — Pages reste un produit soutenu.** La documentation est maintenue, aucune fin de vie n'est
  annoncée, les nouveaux projets s'ouvrent toujours ; l'abandon vient de l'écosystème et non de
  l'éditeur, et le prendre pour une dépréciation est une erreur d'attribution.
- **H3 — Convergence sans fin de vie.** Les deux produits fusionnent progressivement, Pages
  devenant une façade au-dessus de la même plateforme, sans que le nom disparaisse ni que les
  projets existants cassent.

Ce qui les départagerait, à chercher explicitement : une annonce datée de l'éditeur ; la date de
dernière mise à jour effective des pages de documentation de chaque produit ; la présence ou
l'absence de Pages dans les changelogs des douze derniers mois ; la possibilité d'ouvrir un
nouveau projet Pages ; le libellé exact d'une éventuelle page de migration.

## Format de rendu

TL;DR · Key Findings · Details · Recommendations · Caveats.

Niveau de confiance **par affirmation**. Marqueurs `[À VÉRIFIER]` et `[INCERTAIN]` sur tout ce qui
n'est pas établi.

Deux tableaux attendus.

**1. Chiffre circulant → source primaire trouvée ? → verdict.** Au minimum ces chiffres, qui
circulent et sont à re-sourcer sans complaisance — ils peuvent être faux, périmés, ou vrais d'un
seul côté :

| Chiffre circulant | À vérifier |
|---|---|
| 20 000 fichiers par déploiement, plan gratuit | vaut-il pour Pages, pour Workers static assets, pour les deux ? |
| 100 000 fichiers | réservé aux plans payants ? sous quelle condition ? |
| 25 Mio par fichier | des deux côtés ? |
| 500 déploiements par mois | propre au système de build Pages ? |
| 1 build à la fois | des deux côtés ? |
| 100 000 requêtes par jour | s'applique-t-il au service des assets, ou seulement au traitement serveur ? |
| minutes de build sur le palier gratuit | documentées ? et au dépassement, mur ou facturation ? |

**2. Comparatif Pages / Workers static assets**, ligne par limite, avec pour chaque case : la
valeur, le comportement au dépassement (**mur** ou **compteur facturé**), la source et sa date.

## Ce qui ferait changer la recommandation

Nommer les seuils, pour que la recommandation puisse être révisée sans être refaite :

- une **date de fin de vie** de Pages publiée par l'éditeur, ou la fermeture de la création de
  nouveaux projets ;
- un palier gratuit de Workers static assets **inférieur** à celui de Pages sur le nombre de
  fichiers par version — la limite qui mord en premier sur un site riche en photographies ;
- le passage de l'une de ces limites d'un **mur** à un **compteur facturé**, de l'un ou l'autre
  côté : cela disqualifierait la voie concernée sans discussion ;
- l'apparition d'une **exigence de moyen de paiement** pour créer un projet Pages ou un Worker
  avec assets ;
- la fin du caractère **gratuit et illimité** du service des fichiers statiques d'un côté ;
- une documentation du comportement au dépassement des minutes de build qui révélerait une
  **facturation** là où on suppose un mur.
