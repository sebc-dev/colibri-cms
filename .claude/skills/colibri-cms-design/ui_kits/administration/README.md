# UI kit — Administration Colibri CMS

Recréation cliquable de l'interface d'administration : la seule surface que ce
design system couvre. Le site public porte l'identité de chaque cliente et
n'utilise pas ces tokens.

## Écrans

| Fichier | Écran | Ce qu'il montre |
| --- | --- | --- |
| `Shell.jsx` | Coquille | Navigation latérale, logo, mention Cloudflare, bandeau global d'état |
| `Dashboard.jsx` | Tableau de bord | Salutation `display`, modifié récemment, jauges du plan gratuit |
| `PagesList.jsx` | Pages | Liste filtrable, états de publication, recherche |
| `PageEditor.jsx` | Édition d'une page | Onglets Contenu / Photos / Réglages, suppression confirmée |
| `Media.jsx` | Médiathèque | Zone de dépôt, grille de vignettes, quota |
| `Requests.jsx` | Demandes de devis | Liste, fiche, trois états, suppression confirmée |
| `Technique.jsx` | Technique | Journal de build en mono, quotas Cloudflare bruts |

## Parcours à essayer

1. Le bandeau annonce « 4 modifications à publier ». Cliquer **Publier les modifications** :
   il passe en « Publication en cours » (`info`), puis « Tout est en ligne » (`plumage`),
   et tous les badges basculent en « Publié ».
2. Ouvrir une page depuis la liste, modifier un champ : l'état repasse en « Modifié, non publié ».
3. Supprimer une photo ou une demande : la modale dit ce qui va disparaître.

## Limites assumées

- **Aucune photo réelle** n'était fournie dans la source. Les vignettes sont des
  cadres `surface-sunken` portant la mention « photo de la cliente ». Ne pas les
  remplacer par des images génériques : le produit se juge avec les vraies photos.
- Les icônes viennent de **Lucide** (substitution, voir `readme.md` à la racine).
