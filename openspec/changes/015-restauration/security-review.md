## Surface

Trois routes d'écriture nouvelles, toutes dans l'administration, toutes en `POST` sans corps :
`/admin/pages/[slug]/revenir`, `/admin/reglages/[reglage]/revenir`, `/admin/formulaires/[id]/revenir`.
Elles suppriment des données que rien ne copie (ADR-0019). Aucune route publique, aucun secret, aucune
dépendance nouvelle.

## Menaces et parades

- **Suppression sans session.** Chaque route appelle `verifierSession` avant toute lecture et répond
  `401` sinon (ADR-0007, I6). La garde par import couvre les fichiers sous `src/pages/admin/`.
- **Forgerie cross-site.** Un site tiers qui pousse un `POST` vers ces routes ferait perdre un travail
  non copié. Le cookie de session `SameSite=Strict` n'est pas joint à une requête cross-site (ADR-0011),
  et Astro refuse un `POST` d'une autre origine (`checkOrigin`). Aucun jeton dédié, comme les autres
  écritures de l'administration.
- **Paramètre d'URL non fiable.** `slug`, `reglage` et `id` ne servent qu'après avoir été trouvés dans la
  déclaration (ou dans la liste fermée des trois réglages) ; sinon `404`. Ils passent en paramètre lié de
  requête D1, jamais concaténés au SQL.
- **XSS par le nom de l'objet.** La confirmation affiche un titre de page ou un nom de formulaire posé
  par l'intégrateur. L'îlot l'interpole en texte Svelte, jamais par `{@html}`.
- **Course avec la publication.** Une suppression pendant une publication confirmée laisserait partir en
  ligne un contenu que l'éditrice croit abandonné. La condition atomique sur le verrou (design D2) l'empêche.

## Données

Aucune donnée personnelle : les brouillons portent du contenu éditorial. Les coordonnées de l'atelier
(téléphone, adresse) sont des données publiques destinées au site.
