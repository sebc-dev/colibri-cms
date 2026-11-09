# 06 — Remplacer le code de secours

**Bloqué par :** 01, 03
**Vérif :** tdd
**Fichiers :** `src/pages/admin/code-de-secours.astro`, `src/platform/auth/code-de-secours.ts`, `src/admin/textes.ts`, `tests/integration/code-de-secours-remplacer.test.ts`

## Ce que ça livre

Le **code de secours** est le secret noté sur papier qui ouvre l'administration quand la boîte e-mail
de l'adresse autorisée ne répond plus. L'écran gardé `/admin/code-de-secours` (ticket 01) dit si un
code est en place et depuis quand, permet d'en créer un, et affiche le nouveau code une seule fois ; sa
route d'écriture appelle `mettreEnPlaceCodeDeSecours(db, sessionCourante, maintenant)`, qui écrit
l'empreinte dans `code_de_secours` (une ligne au plus). L'entrée par le code (tickets 02 et 03) ouvre
une session, fait cesser le code, en met un nouveau en place et ferme les autres sessions.

Ce ticket livre **le remplacement** (FR-012) : l'éditrice qui craint que son papier ait été vu demande
à remplacer le code ; une **confirmation** lui dit ce qui va se passer ; elle confirme ; l'ancien code
cesse d'ouvrir, un nouveau s'affiche une fois, et **toute autre session ouverte est fermée**. Sa
propre session reste ouverte. La fermeture des autres sessions vaut aussi pour la **création** : c'est
la même écriture.

**La confirmation**, rendue par le serveur, sans script (`I4`) : GET `/admin/code-de-secours?remplacer`
rend une carte « Remplacer le code de secours ? » — « L'ancien code ne permettra plus d'entrer. Les
autres appareils connectés devront se reconnecter. » — avec un bouton primaire « Remplacer »
(formulaire `method="post"`) et un lien de retour « Annuler ». Rien ne change avant « Remplacer ». Le
bouton « Remplacer le code de secours » de l'écran mène à cette confirmation.

**La fermeture des autres sessions** (design D5) : `mettreEnPlaceCodeDeSecours` envoie un seul
`db.batch` — l'`insert … on conflict (id) do update` déjà en place, puis
`delete from sessions where id <> ?sessionCourante`. Une transaction : jamais un nouveau code sans que
l'ancien ait cessé et que les autres sessions soient fermées. La validité d'une session se jugeant par
la seule présence de sa ligne (ADR-0001), supprimer la ligne ferme la session au prochain accès.

**Les sessions simultanées** (capacité `connexion-par-code`, exigence modifiée « La fin de session
automatique ») : elles coexistent sans que rien ne les compte ni ne les ferme, **sauf** quand le code
de secours est créé, remplacé ou employé ; alors seule reste ouverte la session qui a fait le geste,
ou celle que le code vient d'ouvrir.

Tous les textes vivent dans `src/admin/textes.ts`. Ce ticket vérifie l'absence de terme de développeur
sur les trois rendus de l'écran : l'écran lui-même, la confirmation, l'affichage d'un nouveau code
(FR-117 ; « déconnecter » se dit « les autres appareils devront se reconnecter »).

**Hors de ce ticket.** Toute liste des sessions ouvertes, ou leur fermeture une à une ; le
remplacement de l'adresse autorisée (FR-013, FR-014).

## Critères
- [x] l'éditrice demande à remplacer le code en place : une confirmation dit que l'ancien code cessera d'ouvrir et que les autres appareils seront déconnectés, et rien ne change tant qu'elle n'a pas confirmé   (SC-06a)
- [x] l'éditrice confirme le remplacement, puis l'ancien code est présenté : l'ancien code n'ouvre pas de session, et le nouveau en ouvre une   (SC-06b)
- [x] une session est ouverte sur un autre appareil, et l'éditrice remplace le code : la session de l'autre appareil ne donne plus accès, et la session de l'éditrice reste ouverte   (SC-06c)
- [x] un code de secours est mis en place alors qu'un autre l'était : seul le dernier ouvre une session   (SC-06d)
- [x] l'écran « Code de secours », sa confirmation et l'affichage d'un nouveau code ne portent aucun terme de développeur (FR-117)   (SC-06e)
- [x] plusieurs sessions sont ouvertes en même temps, et le code de secours n'est ni créé, ni remplacé, ni employé : elles coexistent sans que rien ne les compte ni ne les ferme   (SC-06f)
- [x] plusieurs sessions sont ouvertes, puis le code de secours est créé, remplacé ou employé : seule reste ouverte la session qui a fait le geste, ou celle que le code vient d'ouvrir (un cas par geste)   (SC-06g)
