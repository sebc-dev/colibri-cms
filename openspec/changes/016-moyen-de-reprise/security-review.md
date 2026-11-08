## Surface

- **Une porte publique nouvelle** : `POST /admin/reprise`, atteignable sans session, qui ouvre une
  session sur présentation d'un secret. C'est la deuxième porte de l'administration, à côté de
  `/admin/connexion`, et la seule qui ne passe pas par la boîte e-mail.
- **Une écriture gardée** : `POST /admin/code-de-secours`, qui remplace le secret et ferme les autres
  sessions.
- **Une donnée sensible nouvelle** : l'empreinte du code dans `code_de_secours`.
- Aucune dépendance, aucun secret de plateforme, aucune liaison nouvelle.

## Menaces et parades

- **Devinette en ligne.** Un attaquant soumet des codes au hasard. Parade : 130 bits d'entropie ;
  le seuil de vingt tentatives par heure et par origine, partagé avec la connexion (ADR-0028), filtre
  le bruit. Aucun brûlage : il offrirait un déni de service sur le dernier recours (candidat d'ADR,
  alternatives écartées).
- **Devinette hors ligne après lecture de la base.** Un lecteur de D1 obtient l'empreinte. Parade :
  SHA-256 d'un secret uniforme sur 2^130, hors de portée de toute recherche ; pas de sel nécessaire
  (design D1). Les journaux ne portent jamais le code ni la saisie.
- **Rejeu d'un code servi.** Parade : usage unique tenu par une transaction (design D4) ; deux
  présentations simultanées n'ouvrent qu'une session.
- **Fuite du nouveau code par un intermédiaire ou l'historique.** Parade : le code n'apparaît que dans
  le corps d'une réponse `POST`, jamais dans une adresse ; `Cache-Control: no-store` ; pas de
  redirection qui le porterait.
- **Oracle de la cause du refus.** Un attaquant qui a trouvé un vieux papier cherche à savoir s'il a
  servi. Parade : un seul texte, mêmes en-têtes, même travail en base pour toute cause (design D4).
- **Session volée qui remplace le code.** Un intrus en session crée un code qu'il garde, et ferme la
  session de l'éditrice. C'est le rayon d'action d'une session volée (`SEC-8`) : il peut déjà tout
  publier. Le remède reste la connexion par e-mail, tant que la boîte est saine. Le produit n'offre pas
  plus (ADR-0001 : aucune capacité de constater les sessions).
- **Forgerie cross-site du remplacement.** Un site tiers ferait remplacer le code et perdre à
  l'éditrice son papier. Parade : cookie `SameSite=Strict` (ADR-0011) et `checkOrigin` d'Astro sur
  tout `POST`.
- **Intrus entré par la boîte perdue.** Parade : l'emploi du code ferme toutes les autres sessions
  (proposal, point 3).
- **XSS same-origin lisant le code affiché.** Le code est dans le DOM de l'écran 4. Parade : la CSP
  stricte de l'administration (`I12`) et l'absence de script tiers, comme pour tout écran admin.

## Données

- **Le code** : jamais conservé. Seule son empreinte l'est, en D1, sur le compte du client. Aucune
  copie dans le dépôt, la configuration, les secrets ou les journaux (FR-011, SC-013).
- **L'emplacement du papier** se note au dossier d'instance, jamais sa valeur (FR-112, Epic D).
- Aucune donnée personnelle nouvelle.

## Points pour la review

- Vérifier que `TEXTE` du refus, statut et en-têtes ne dépendent d'aucune branche de
  `ouvrirSessionParCodeDeSecours`.
- Vérifier qu'aucun `console.*` ne porte la saisie, l'empreinte ou le nouveau code.
- Vérifier que le cookie passe par `enteteCookieSession` (`I13`).
