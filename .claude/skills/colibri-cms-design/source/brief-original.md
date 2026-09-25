# Colibri CMS

Colibri CMS est le système de gestion de contenu d'un site vitrine statique : un site Astro servi par Cloudflare, dont le contenu vit dans D1, et qu'on reconstruit à chaque publication. Tout tient dans le plan gratuit du compte Cloudflare de la cliente. Ce design system couvre l'**interface d'administration**, celle qu'utilise une personne non technicienne — une pâtissière, un artisan — quelques fois par mois pour changer un texte ou ajouter trente photos à une galerie. Le site public, lui, porte l'identité de chaque client et n'utilise pas ces tokens.

Le colibri donne la direction : léger, rapide, précis, et une seule touche de couleur vive. L'interface s'efface derrière les photos de la cliente.

## Principes

**Léger.** Le plan gratuit n'est pas une limite honteuse mais le cadre du produit. On le montre calmement : une jauge, un chiffre, jamais une alarme tant qu'il reste de la marge. Pas d'animation décorative, pas d'ombre sur les cartes, des polices chargées avec parcimonie.

**Rassurant.** La cliente doit toujours savoir si ce qu'elle voit est en ligne. Chaque contenu porte un état explicite, et chaque action irréversible le dit avant d'agir.

**Honnête sur la mécanique, muet sur la technique.** On explique le délai (« visible dans une minute environ ») sans jamais parler de build, de worker ou de D1 dans le parcours de la cliente. Le vocabulaire Cloudflare reste dans l'écran « Technique », réservé au studio.

## Voix

On vouvoie. Des phrases courtes, des verbes d'action, les chiffres écrits en français (« 2,4 Mo », « 14 h 32 »).

| À écrire | À éviter |
| --- | --- |
| Publier les modifications | Déclencher un build |
| Vos photos seront en ligne dans une minute environ. | Déploiement en cours sur Workers… |
| La publication n'a pas abouti. Votre travail est conservé ; réessayez ou prévenez le studio. | Erreur 500 : build failed |
| Il reste de la place pour environ 1 200 photos. | R2 : 3,2 Go / 10 Go |
| Supprimer définitivement cette photo ? Elle disparaîtra aussi du site. | Êtes-vous sûr ? |

Pas de point d'exclamation, pas d'emoji, pas de « Oups ».

## Fondations visuelles

**Couleur.** Des neutres chauds (`surface`, `surface-raised`, `ink`) portent 90 % de l'écran. `plumage`, le vert émeraude du colibri, est la seule couleur d'action : le bouton Publier, l'élément actif, l'état « Publié ». `gorge`, le rubis de sa gorge, est rare et ne sert qu'à une chose : signaler ce qui a été modifié mais n'est pas encore en ligne. Les signaux (`ambre`, `danger`, `info`) ont chacun leur fond `-soft`. Texte sur aplat plumage : toujours `on-plumage`, jamais un blanc codé en dur. Chaque paire texte/fond atteint 4,5:1 dans les deux thèmes ; les bordures de champs (`line-strong`) et l'anneau de focus atteignent 3:1.

**Typographie.** Fraunces pour les titres (`display`, `title`), qui apporte la chaleur artisanale commune aux clientes. Instrument Sans pour toute l'interface. JetBrains Mono seulement pour les adresses de pages et le journal technique. Les trois viennent de Google Fonts ; les piles de repli (Georgia, system-ui, Menlo) sont prévues pour un fonctionnement hors ligne.

**Espace et formes.** Grille de 4 px (`space-1` à `space-12`). Coins tenus, à peine adoucis, dans l'esprit des coupes franches du logo : `radius-sm` (4 px) pour les champs et vignettes, `radius-md` (6 px) pour boutons et cartes, `radius-lg` (10 px) pour panneaux et modales, `radius-pill` réservé aux badges et à la jauge. Les cartes se séparent par un filet `line`, pas par une ombre ; `shadow-raised` est réservé à ce qui flotte (menus, modales).

**Focus.** 2 px de `surface` puis 2 px `focus-ring`, sur tout élément interactif, visible au clavier uniquement.

## États de publication

Le cœur du produit. Un contenu est toujours dans l'un de ces états, affiché sous forme de badge `radius-pill`, en `label` :

- **Publié** — texte `plumage` sur `plumage-soft`. Ce qui est en ligne correspond à ce qui est enregistré.
- **Modifié, non publié** — pastille `gorge`, texte `gorge` sur `gorge-soft`. Un bandeau global rappelle le nombre de modifications en attente.
- **Brouillon** — texte `ink-muted` sur `surface-sunken`. Jamais mis en ligne.
- **Publication en cours** — texte `info` sur `info-soft`, avec le délai estimé.
- **Échec de publication** — texte `danger` sur `danger-soft`, avec une action « Réessayer » et la garantie que rien n'est perdu.

## Quota du plan gratuit

Les limites Cloudflare sont des murs, pas des factures : l'interface doit prévenir avant le mur. Une jauge `radius-pill` en `plumage` jusqu'à 80 %, `ambre` au-delà, `danger` quand la limite est atteinte (l'action est alors bloquée, avec une explication). La jauge parle en unités de la cliente (photos, publications ce mois-ci), le détail technique reste à l'écran « Technique ».

## Formulaire de devis

Les demandes reçues se suivent avec trois états : **Sans suite** (`ink-muted`), **Devis envoyé** (`info`), **Commande** (`plumage`). Les données personnelles s'affichent sans ornement, et la suppression d'une demande est une action `danger` confirmée.

## Logo

Un colibri en vol qui butine un nuage : le produit (le colibri, léger et précis) puise dans l'infrastructure (le nuage). Le logo est un aplat monochrome, sans dégradé.

- `logo-colibri.svg` : version sombre (#39362F), sur `surface` et `surface-raised` en thème clair.
- `logo-colibri-clair.svg` : même dessin en #EEF1EC, sur les surfaces du thème sombre.
- Le logo ne se recolore pas en `plumage` ni en `gorge`, ne s'étire pas, ne reçoit ni ombre ni contour. Zone de protection proposée : la hauteur du bec autour du dessin.
- Taille minimale proposée : 24 px de haut ; en dessous, le bec et les plumes se bouchent. Zone de protection et taille minimale restent à valider.
- À côté du nom, le logo se place à gauche, sa hauteur égale à la hauteur de capitale × 1,6, le nom en Fraunces 600, « Colibri CMS ».

Le nuage du logo porte déjà la référence à Cloudflare : il n'a pas besoin d'être orange pour la faire.

## Référence à Cloudflare

Cloudflare est l'infrastructure du produit, et l'argument de vente auprès de la cliente : son site tourne sur son propre compte, dans le plan gratuit. On le dit, avec retenue.

- **La mention.** « Hébergé sur votre compte Cloudflare » en `caption`, couleur `nuage-ink`, précédée d'une pastille `nuage` de 8 px en `radius-pill`. Elle figure en pied de la navigation de l'administration et en tête de l'écran « Technique ». C'est le seul endroit où la marque apparaît dans le parcours de la cliente.
- **La couleur.** `nuage` reprend l'orange Cloudflare, en aplat seulement. Elle reste distincte d'`ambre`, qui garde le sens « avertissement ».
- **Le logo officiel.** Il n'est pas inclus dans ce système. S'il doit figurer (écran « Technique », page « À propos »), il s'ajoute tel que fourni par Cloudflare dans son kit presse, en respectant ses règles d'usage de marque, dans un groupe d'assets « Partenaires ». On ne le redessine pas et on ne le recolore pas.

## Iconographie

Aucune bibliothèque d'icônes n'est encore arrêtée. Proposition à valider : icônes au trait, 1,5 px, 20 px dans l'interface, en `currentColor`, toujours accompagnées d'un libellé (une cliente ne devine pas une icône seule). Les pointes vives et coupes franches du logo sont un bon critère de choix.
