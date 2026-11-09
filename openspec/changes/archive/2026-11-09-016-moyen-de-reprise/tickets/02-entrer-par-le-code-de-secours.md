# 02 — Entrer par le code de secours

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/pages/admin/reprise.astro`, `src/platform/auth/code-de-secours.ts`, `src/pages/admin/connexion.astro`, `src/admin/textes.ts`, `tests/integration/code-de-secours-entrer.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Le **code de secours** est le secret noté sur papier qui ouvre l'administration quand la boîte e-mail
de l'adresse autorisée ne répond plus. Le ticket 01 permet de le créer depuis l'écran « Code de
secours » ; la base n'en garde que l'empreinte `SHA-256(normaliserCode(code))`, dans la table
`code_de_secours` (une ligne au plus, `id = 1`).

Ce ticket livre **l'entrée** : depuis l'écran de connexion, l'éditrice suit le lien « Je n'ai plus
accès à ma boîte e-mail », saisit son code de secours, et une session d'administration s'ouvre, **sans
qu'aucun message ne parte** (FR-010), depuis n'importe quel appareil, même quand l'envoi des messages
est impossible.

**Le lien.** Sur `src/pages/admin/connexion.astro`, sous les deux formulaires existants et séparé par
un filet, un lien discret « Je n'ai plus accès à ma boîte e-mail » vers `/admin/reprise`. Rien d'autre
de l'écran ne change : son contrat gelé (le formulaire d'adresse présent après toute soumission) reste
intact.

**L'écran de saisie** `src/pages/admin/reprise.astro` — porte de l'administration, non gardée comme
`connexion.astro`, mais qui importe et appelle `verifierSession` sans s'en servir pour bloquer (`I6`,
ADR-0007). Rendu serveur sans `client:*` (`I4`), même carte (`Card`) que la connexion :
- titre « Entrer avec le code de secours » ; « Saisissez le code de secours que vous avez noté sur
  papier. » ; champ « Code de secours », qui accepte espaces et tirets, assez large pour 26 signes
  groupés, et qui passe à la ligne sans déborder à 360 px ; bouton « Entrer » ; lien « ← Revenir à la
  connexion par e-mail » ;
- **POST** : `ouvrirSessionParCodeDeSecours(db, saisie, identifiantAppareil, maintenant)`, ajoutée à
  `src/platform/auth/code-de-secours.ts`, → `{ reussi: true, jeton } | { reussi: false }`. Elle
  calcule l'empreinte de la saisie normalisée (`normaliserCode` : casse, séparateurs, confusables
  O/I/L/U), engendre le jeton de session, et insère la session **sous condition** :
  `insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) select ?jeton, ?appareil, ?t, ?t where exists (select 1 from code_de_secours where id = 1 and empreinte = ?empreinte)`.
  Le succès se lit au nombre de lignes changées. `identifiant_appareil` (non nul dans `sessions`)
  reprend le cookie `identifiant-appareil` s'il est là, sinon un identifiant tiré au hasard ; il n'a
  aucun rôle de liaison ici. Le module reprend le garde défensif de création de `sessions` (patron
  existant) ;
- **succès** : le cookie de session posé par `enteteCookieSession` seul (`I13`) — préfixe `__Host-`,
  `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` — puis renvoi vers l'accueil, comme la connexion.
  La session est en tout point ordinaire : mêmes échéances de sept et trente jours, jugées par le
  garde existant. Le ticket 03 remplacera ce renvoi par l'affichage du nouveau code ;
- **refus** : le même écran, avec le message « Ce code n'a pas permis d'entrer. Vérifiez chaque
  signe, puis réessayez. » L'égalité stricte des réponses de refus est le ticket 04.

La liaison d'envoi d'e-mail n'est jamais appelée par cette route. Aucun `console.*` ne porte la
saisie, l'empreinte ni le jeton. Tous les textes vivent dans `src/admin/textes.ts`, sans terme de
développeur (FR-117).

**Hors de ce ticket.** L'usage unique, le nouveau code et la fermeture des autres sessions (03) ; le
refus identique quelle qu'en soit la cause (04) ; le seuil de vingt tentatives par origine (05).
Entre la fusion de ce ticket et celle du 03, un code de secours ouvre plusieurs fois : écart
temporaire accepté à l'arbitrage, rien n'est livré entre-temps.

**Recette.** Ajouter au cahier (`docs/cahier-de-test.md`) : à 360 px, l'écran de saisie ne fait pas
défiler la page horizontalement, et un code de 26 signes groupés tient dans le champ.

## Critères
- [x] l'éditrice présente le code de secours en place sur l'écran de saisie du code de secours : une session s'ouvre, et la liaison d'envoi n'a reçu aucun appel   (SC-02a)
- [x] le code de secours présenté depuis un appareil qui n'a jamais demandé de code de connexion ni ouvert de session ouvre une session   (SC-02b)
- [x] alors que plus aucun message ne peut partir vers l'adresse autorisée (liaison d'envoi en échec), le code de secours en place ouvre une session   (SC-02c)
- [x] le code de secours saisi en minuscules, avec des espaces ou des tirets, ou avec un O, un I, un L ou un U à la place de 0, 1, 1 ou V, est reconnu comme le code en place   (SC-02d)
- [x] la session ouverte par le code de secours a un cookie au préfixe `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, dont rien de la session ne se lit ; elle se ferme après sept jours sans usage, et après trente jours quoi qu'il arrive   (SC-02e)
- [x] l'écran de connexion porte un lien vers l'écran de saisie du code de secours, et aucun terme de développeur ne paraît sur l'un ni l'autre écran   (SC-02f)
