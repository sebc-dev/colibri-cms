## Surface

- **Une écriture gardée** : `POST /admin/adresse-e-mail` (trois étapes : proposer, vérifier, code),
  qui change l'adresse qui ouvre l'administration et reçoit les demandes, et ferme les autres
  sessions. Aucune porte publique nouvelle.
- **Un secret de plateforme nouveau** : `JETON_ADRESSES_EMAIL`, permission « Email Routing Addresses
  Edit » sur le compte du client, présent dans le Worker exposé à l'internet.
- **Un appel sortant nouveau** : l'API Cloudflare des adresses de destination, appelée depuis le
  Worker avec cette clé.
- **Une liaison élargie** : `send_email` n'est plus limitée à une adresse ; elle écrit à toute
  adresse vérifiée du compte du client.
- **Des données nouvelles** : l'adresse candidate, l'empreinte salée des codes de remplacement, les
  instants des messages du remplacement.

## Menaces

- **M1 — Une session volée détourne l'adresse.** L'intrus remplace l'adresse par la sienne : il
  reçoit dès lors les codes de connexion et les demandes (données des visiteuses), et la bascule
  ferme la session de l'éditrice.
- **M2 — Fuite de la clé.** Une lecture des secrets du Worker livre la clé.
- **M3 — Abus d'envoi.** Une session (légitime ou volée) fait partir des messages en série vers des
  adresses tierces, par Cloudflare ou par le produit.
- **M4 — Bascule vers une adresse que la personne connectée ne tient pas.** Quelqu'un d'autre clique
  le message de Cloudflare, ou l'adresse est injoignable par la liaison du produit : l'éditrice se
  ferme elle-même la porte.
- **M5 — Un code de remplacement ouvre une session**, ou un code de connexion sert au remplacement.
- **M6 — Un code de connexion envoyé à l'ancienne boîte, piratée, sert après la bascule.**
- **M7 — Devinette du code de remplacement** (40 bits) depuis la session.
- **M8 — Fuite de la clé ou du code par les journaux ou les réponses** de l'API Cloudflare.
- **M9 — Contenu injecté dans les messages.** L'adresse candidate est une saisie, reprise dans l'avis
  et l'écran.

## Mitigations

- **M1** → l'avis à l'ancienne adresse dit le remplacement, la nouvelle adresse et la date, et renvoie
  au code de secours, qui rouvre l'administration et permet de remettre l'adresse. Le rayon d'action
  d'une session volée inclut déjà le remplacement du code de secours (`SEC-8`) : ce change ne l'élargit
  qu'aux demandes à venir. Résidu assumé, consigné dans ADR-0033.
- **M2** → la clé n'a que la permission des adresses de destination (niveau compte), jamais celle des
  règles de routage (niveau domaine) : elle ne détourne pas le courrier du domaine. Au pire, elle
  ajoute ou retire des adresses de destination ; un retrait couperait l'envoi des codes, et le code de
  secours reste la porte. La clé se révoque depuis le compte du client.
- **M3** → plafond de cinq messages du remplacement par heure glissante, épreuve indivisible de
  l'écriture (design D5) ; Cloudflare n'envoie son message qu'à une inscription neuve ; le produit
  n'écrit qu'à une adresse vérifiée par son propriétaire.
- **M4** → double preuve : vérification constatée chez Cloudflare, puis code du produit, envoyé par la
  liaison même qui servira ensuite, recopié dans la session demandeuse (design D4).
- **M5** → tables séparées pour les codes de remplacement ; ni l'écran de connexion ni le plafond de
  la connexion ne les lisent (design D4, écarté).
- **M6** → la bascule annule tout code de connexion vivant, dans le même lot.
- **M7** → brûlage à la cinquième saisie fautive, expiration à quinze minutes, cinq codes par heure
  au plus : au plus vingt-cinq essais par heure sur 2^40 ; la session est déjà requise.
- **M8** → l'adaptateur ne consigne que le statut HTTP, jamais la clé, l'en-tête d'autorisation ni le
  corps de réponse ; aucun code dans un journal (patron de la connexion).
- **M9** → l'avis est en texte seul, objet fixe, l'adresse derrière une étiquette (ADR-0002) ; à
  l'écran, l'adresse est interpolée par Astro (échappement), jamais par `set:html` (`I5`). La forme
  d'adresse est validée avant toute inscription.

## Données

- L'adresse candidate vit dans `remplacement_adresse` jusqu'à la bascule ou l'annulation, puis
  devient l'adresse autorisée ou disparaît. Un remplacement abandonné reste en base jusqu'au suivant :
  une seule ligne, l'adresse de l'éditrice elle-même.
- L'ancienne adresse reste inscrite parmi les adresses de destination du compte Cloudflare du client
  (proposal, point 5) ; le produit ne la conserve pas en base après la bascule.
- Les codes de remplacement ne sont gardés qu'en empreinte salée ; `messages_remplacement` ne porte
  que des instants, sans adresse.
