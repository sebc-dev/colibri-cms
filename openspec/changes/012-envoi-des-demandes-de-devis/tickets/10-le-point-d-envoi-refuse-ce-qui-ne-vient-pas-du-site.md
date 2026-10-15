# 10 — Le point d'envoi refuse ce qui ne vient pas du site

**Bloqué par :** 07
**Vérif :** tdd
**Fichiers :** `src/pages/api/public/demandes.ts`, `tests/integration/point-d-envoi-ferme.test.ts`

## Ce que ça livre

Le point d'envoi des demandes n'accepte qu'un envoi de demande **venu du site lui-même** (FR-097). Les
requêtes suivantes sont refusées sans rien envoyer :
- une requête émise depuis une autre origine ;
- une requête d'une autre méthode ;
- une requête d'un autre format ;
- une requête dont le corps dépasse la taille d'une demande.

Un corps qui porte un fichier, sous la forme d'un formulaire à pièces jointes, est refusé **sans être
lu** (FR-061). Une page tierce ne peut donc pas faire envoyer des demandes par le navigateur de ses
visiteurs.

Ce ticket est à jouer **en premier** parmi les tickets 08 à 11. Jusqu'à lui, le point d'envoi accepte des
requêtes venues d'un autre site.

**Décisions à respecter (D6 de l'approche ; I6) :**
- **L'ordre des contrôles**, du moins cher au plus cher, avant toute lecture du corps :
  1. la méthode `POST`, sinon `405` ;
  2. *(le comptage par origine s'insère ici, ticket 12)* ;
  3. l'en-tête `Origin` présent et égal à l'origine du site, sinon `403` ;
  4. `Content-Type: application/json` (`application/json; charset=utf-8` accepté), sinon `415`. Un corps
     `multipart/form-data` est refusé **sans être lu** : jamais `request.formData()` (I6).
- **La taille du corps.** Le corps est lu par un lecteur **borné à 16 Kio**, que `Content-Length` soit
  présent ou non. Au-delà, la réponse est `413`. Un JSON invalide rend `400`.
- **Le contrôle d'origine d'Astro.** Il ne vise que les corps de formulaire : la route tient le sien.
  Un test qui veut atteindre la route avec un corps de formulaire envoie un `Origin` valide. Sinon, le
  contrôle d'Astro répond `403` avant la route.
- **Les cas limites à couvrir :**
  - un `Origin` absent, d'un autre hôte, ou d'un autre schéma ;
  - un corps de 16 Kio, puis de 16 Kio + 1 ;
  - un JSON invalide.
- **Ce qu'une réponse de refus ne fait jamais.** Elle n'envoie aucun e-mail, ne pose aucun cookie et ne
  renvoie aucune valeur.

**Hors périmètre :** le comptage par origine (ticket 12) ; les refus de saisie (ticket 08) et d'accord
(ticket 09).

## Critères
- [ ] Quand une demande parvient au point d'envoi avec une origine qui n'est pas celle du site, elle est refusée, et aucun e-mail n'est envoyé   (SC-10a)
- [ ] Quand un envoi parvient au point d'envoi sous la forme d'un formulaire à pièces jointes, il est refusé sans que son corps soit lu, et aucun e-mail n'est envoyé   (SC-10b)
- [ ] Quand un envoi parvient au point d'envoi avec un corps plus grand que la taille d'une demande, il est refusé, et aucun e-mail n'est envoyé   (SC-10c)
