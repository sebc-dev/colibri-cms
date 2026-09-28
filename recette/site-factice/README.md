# Site factice de recette

Le contenu que le serveur de recette sert pour dérouler `docs/cahier-de-test.md`. Il **ne fait pas
partie du produit** : `content/pages/` reste le contenu de démonstration livré, celui-ci n'est lu
que par le skill `site-factice` (`.claude/skills/site-factice/`), qui le recopie dans un arbre de
travail jetable avant de bâtir.

## Ce qu'il y a ici

```
pages/<slug>/page.json          la base : les trois pages attendues par le cahier (§ 0.7)
pages/<slug>/<emplacement>.md   le texte riche d'un emplacement
variantes/<nom>/variante.json   description, cas servis, pages à retirer (`retirer`)
variantes/<nom>/pages/…         SEULS les fichiers qui diffèrent de la base, recopiés par-dessus
medias/jeu.json                 le jeu d'images, décrit — le skill les génère, aucun binaire ici
```

| Variante | Sert | Adresse |
|---|---|---|
| `standard` | tout le cahier par défaut | serveur principal |
| `rang` | deux galeries et deux images sur Accueil (note sous CT-14, CT-13.5, CT-14.5) | `site-rang-…` |
| `titres-longs` | Tarifs à 80 signes sans espace, Accueil à 120 avec espaces (CT-20.5, CT-21.6) | `site-titres-longs-…` |
| `vide` | aucune page (CT-5.4, CT-20.8) | `site-vide-…` |

Les cas du cahier qui demandent de **modifier `content/pages/` puis rebâtir** se jouent en ouvrant
l'adresse de la variante correspondante — plus besoin de toucher au dépôt ni de `git restore`.

Toutes les variantes partagent **une seule base de recette** : les brouillons de `accueil` posés
sur une variante se retrouvent sur les autres.

## Le modifier

- **Un nouveau cas qui demande un contenu particulier** → une nouvelle variante : un dossier sous
  `variantes/`, un `variante.json` (`description`, `cas`, et `retirer` si des pages doivent
  disparaître), puis les seuls fichiers qui changent. Elle est aussitôt listée par
  `site.mjs variantes` et déployable par `site.mjs deployer <nom>`.
- **Le schéma d'une page change** (par exemple le change `006-nom-des-emplacements`, qui donne un
  nom à chaque emplacement) → mettre à jour `pages/` **et** chaque `variantes/*/pages/…/page.json`
  qui recopie une page entière. Le schéma fait foi dans `src/core/pages/declaration.ts`.
- **Une image de plus** → une entrée dans `medias/jeu.json` : `genere` (format, largeur, hauteur,
  fond, texte), `copieDe` (mêmes octets sous un autre nom), `tronquerA` (n premiers octets),
  `texte` (fichier texte brut), `poidsMin` (échoue si le fichier généré est plus léger).
- Les attendus du cahier (CT-5.1, CT-6.1, CT-6.2…) reposent sur `pages/` : changer la base, c'est
  changer ce que le cahier doit constater — mettre le cahier à jour dans le même geste.
