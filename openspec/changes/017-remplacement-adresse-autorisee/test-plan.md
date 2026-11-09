## Niveaux

- **Intégration dans workerd** (ADR-0014), le niveau principal : la route, D1 et la liaison
  `send_email` réelles servies par Miniflare ; l'API Cloudflare des adresses doublée.
- **Unité** pour ce qui vit dans `core/auth/` : le verdict d'un code de remplacement, les constantes
  du plafond.
- **Recette** sur `colibri.sebc.dev` pour ce qu'aucun double ne montre : le vrai message de Cloudflare,
  son bouton, l'effet du clic sur l'état lu, l'arrivée du code dans une seconde boîte, l'avis dans la
  première, puis le retour à l'adresse d'origine.

## Oracle

- La bascule se constate en base (`adresses_autorisees`) **et** par le comportement : l'écran de
  connexion écrit un code pour la nouvelle adresse et rien pour l'ancienne.
- Les envois se constatent sur la liaison `send_email` locale (destinataire, objet, texte seul) ; les
  appels à l'API sur le double (`GET` avant `POST`, aucun `POST` pour une adresse déjà inscrite).
- La fermeture des autres sessions : une seconde session renvoyée vers la connexion après la bascule.
- L'atomicité : deux saisies simultanées du bon code → une ligne d'adresse, un avis.

## Cas limites

- Adresse proposée : vide, sans `@`, identique à l'actuelle (casse différente comprise), déjà
  inscrite vérifiée, déjà inscrite non vérifiée.
- Plafond : 4, 5 et 6 messages dans l'heure ; une ligne qui sort de la fenêtre ; deux demandes de code
  concurrentes à 4 ; le plafond du remplacement plein pendant une connexion normale.
- Code : bon ; normalisé (minuscules, tirets, confusables) ; 4ᵉ et 5ᵉ saisie fautive ; 15 minutes
  pile et au-delà ; autre session ; déjà servi ; annulé par un nouveau code ; annulé par une nouvelle
  proposition ; présenté à l'écran de connexion.
- API : `success: false`, statut 5xx, délai dépassé, réponse illisible — chaque fois rien ne change.
- Instance sans clé, sans compte, sans les deux.
- Code de connexion envoyé à l'ancienne adresse avant la bascule, présenté après.

## Doubles

- **Un seul double** : `globalThis.fetch` limité à l'hôte `api.cloudflare.com`, qui tient une liste
  d'adresses en mémoire avec leur champ `verified`, et que le test fait passer à vérifiée pour mimer
  le clic. Patron du double de la forge GitHub (`tests/integration/revenir-et-publication.test.ts`).
- Le temps : l'instant injecté (`maintenant`), comme les tests du plafond de la connexion.
- Ni D1 ni la liaison d'e-mail ne sont doublées.

## Zones sans test automatisé

- Le message de Cloudflare (langue, libellé du bouton, arrivée en courriers indésirables) et l'effet
  réel du clic : **recette** (UX3), cas ajoutés au cahier de recette partagé.
- La portée réelle de la clé : en recette, une clé limitée aux adresses est refusée par l'API des
  règles de routage (constat, sortie conservée) — preuve de la mitigation M2.
- Le parcours au téléphone en moins de cinq minutes (UX4) : recette jouée via `playwright-cli`, gabarit
  mobile, la boîte ouverte à côté.
