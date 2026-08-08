# ADR-0004 : Plateforme et topologie — Cloudflare Workers, deux Workers séparés
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le socle de livraison (`docs/socle-de-livraison.md`) impose que tout objet nécessaire au
site vive dans le compte de la cliente (`I1`) et que le retrait des accès d'Isometria ne
dégrade rien (`I6`, `FR-097`, `FR-098`, `FR-099`). Le compte Cloudflare de la cliente est
donc la cible ; reste à choisir **quel produit de cette plateforme** et **combien d'objets
déployables**.

Le site public et l'outil d'édition ont des cycles de vie disjoints. Publier du contenu ne
doit pas redéployer du code, et sortir une version du CMS ne doit pas retoucher au site en
ligne (`SC-008`, `FR-086`). Surtout, un défaut de l'admin ne doit pas pouvoir retirer le
site : `US14` exige que le site reste servi dans des conditions où l'admin pourrait ne
plus fonctionner.

Trois faits datés ont orienté le choix du produit. Vérifiés le 2026-08-07 sur leurs sources
primaires :

- Cloudflare publie un **guide officiel de migration de Pages vers Workers**
  (`developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/`) ;
- Cloudflare écrit, le 8 avril 2025 : « *Cloudflare Pages will continue to be supported,
  but, going forward, all of our investment, optimizations, and feature work will be
  dedicated to improving Workers* » et « *you should start with Workers* »
  (`blog.cloudflare.com/full-stack-development-on-cloudflare-workers/`) ;
- l'adaptateur `@astrojs/cloudflare` **ne supporte plus du tout** le déploiement sur Pages
  depuis sa v13 (Astro 6) : « *The Astro Cloudflare adapter no longer supports deployment
  on Cloudflare Pages* » (`docs.astro.build/en/guides/integrations-guide/cloudflare/`).

À l'inverse, l'annexe A du socle de livraison, datée du 5 août 2026, note que Pages porte
une limite **écrite** de 500 déploiements par mois là où le comportement au dépassement des
minutes de build de Workers Builds n'est pas documenté pour le plan gratuit (réserve 1).
Pages n'est pour autant déclaré ni déprécié ni en maintenance — la formule officielle est
« continuera d'être supporté ».

Exigences concernées : `FR-046`, `FR-086`, `FR-097`, `FR-098`, `FR-099`, `FR-100`,
`SC-008`, `SC-012` · `US13`, `US14` · invariants `I1`, `I6`.

## Décision

Nous déploierons sur **Cloudflare Workers**, dans le compte de la cliente, sous la forme
de **deux Workers séparés** :

- un **Worker de site public** qui ne sert que des assets statiques, et n'exécute jamais
  de script propre à l'instance ;
- un **Worker de CMS** qui porte l'admin, la base D1, la publication et l'unique
  traitement serveur du produit — la réception d'une demande de devis.

Nous n'utiliserons pas Cloudflare Pages.

## Conséquences

**Positives**

- `SC-008` devient structurel : les deux objets se déploient indépendamment, donc publier
  du contenu ne touche pas au code et monter le CMS de version ne touche pas au site.
- Un défaut du Worker de CMS ne peut pas retirer le site public — ce que `US14` et
  `FR-097` exigent, et qu'un déploiement unique ne pourrait pas garantir.
- `FR-046` est acquis par construction du côté public : ce Worker ne sert que des assets.

**Négatives — ce que ce choix coûte**

- **Deux objets à déployer, à router et à documenter** au lieu d'un. Le dossier d'instance
  (`FR-090`) doit dire où vit chacun, et la procédure de redéploiement (`FR-094`) doit les
  couvrir tous les deux, dans le bon ordre.
- **Tout partage de code entre les deux passe par le paquet versionné** (`ADR-0011`) : il
  n'y a pas d'espace mémoire commun, et une évolution du format de contenu doit sortir en
  version des deux côtés.
- **La limite de 10 ms de CPU par invocation** (annexe A) interdit tout rendu de gabarit à
  la demande dans le Worker de CMS : l'admin est servie en assets et le script ne fait que
  des écritures courtes. C'est un engagement d'architecture, pas une optimisation.
- **La réserve 1 de l'annexe A devient un risque subi, pas un arbitrage.** Le comportement
  au dépassement des 3 000 minutes mensuelles de Workers Builds n'est pas documenté pour le
  plan gratuit, et rien ne doit être contractualisé dessus. On renonce à la limite
  **écrite** de 500 déploiements par mois que Pages offrait — **sans contrepartie
  possible**, puisque l'adaptateur retenu ne permet plus de revenir à Pages. Il n'existe
  donc aucun chemin de repli documenté sur ce point tant que Cloudflare ne publie pas ce
  comportement.

## Alternatives considérées

- **Cloudflare Pages** : **l'alternative est fermée, pas seulement moins bonne.** Elle
  était réellement supérieure sur un point — sa limite **écrite** de 500 déploiements par
  mois aurait levé la réserve 1 de l'annexe A — mais `@astrojs/cloudflare` v13 a
  **supprimé** le support de Pages, et non pas seulement cessé de le cibler par défaut.
  Rester sur Pages supposerait donc de figer l'adaptateur à une version antérieure, ou de
  renoncer à Astro : ce serait bâtir toute la flotte sur un chemin que l'éditeur du
  framework a fermé et vers lequel l'exploitant de la plateforme dirige explicitement la
  sortie. Le choix se constate ; il ne s'arbitre plus.
- **Un Worker unique servant l'admin et le site public** : écartée parce qu'elle couple
  les deux cycles de vie que `SC-008` sépare, et parce qu'un déploiement de CMS raté
  emporterait alors le site en ligne — exactement la panne contre laquelle `FR-097` est
  écrit.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 4 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
