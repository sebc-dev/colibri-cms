## Surface

Aucune porte nouvelle. La route gardée `POST /admin/adresse-e-mail` change de comportement à l'étape
« vérifier » : elle attend l'issue de l'envoi et en dit le résultat à la session ouverte. Aucun
secret, aucune permission, aucun appel sortant nouveau.

## Menaces

- **M1 — L'écran devient un oracle.** Le message « le code n'a pas pu partir » révèle que la
  plateforme a refusé un envoi. Il n'est rendu qu'à une session ouverte, pour l'adresse que cette
  session a elle-même proposée : il n'apprend rien sur une adresse tierce, et l'écran de connexion,
  lui, garde sa réponse unique.
- **M2 — Contourner le plafond par des envois refusés.** Une place rendue à chaque refus pourrait
  permettre des tentatives sans fin vers une adresse.
- **M3 — Fuite dans le journal.** La ligne de journal d'un envoi refusé pourrait porter l'adresse ou
  le code.

## Mitigations

- M1 : le message ne paraît que derrière le garde de session (`I6`) ; l'écran de connexion n'est pas
  touché.
- M2 : une place n'est rendue que si aucun message n'est parti ; l'adresse visée est déjà vérifiée
  chez Cloudflare par son titulaire ; chaque demande reste bornée à trois tentatives ; la minute
  d'attente après la confirmation ne lance aucun envoi.
- M3 : la ligne de journal garde sa forme du change 017 — le nom de l'erreur, jamais l'adresse ni le
  code.

## Données

Aucune donnée nouvelle. L'instant de vérification lu chez Cloudflare n'est pas gardé en base.
