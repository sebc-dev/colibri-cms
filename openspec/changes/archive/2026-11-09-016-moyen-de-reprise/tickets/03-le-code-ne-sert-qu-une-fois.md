# 03 — Le code de secours ne sert qu'une fois et se renouvelle à l'emploi

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/platform/auth/code-de-secours.ts`, `src/pages/admin/reprise.astro`, `src/admin/NouveauCodeDeSecours.astro`, `src/admin/textes.ts`, `tests/integration/code-de-secours-usage-unique.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Le **code de secours** est le secret noté sur papier qui ouvre l'administration quand la boîte e-mail
de l'adresse autorisée ne répond plus. Le ticket 01 le crée depuis l'écran « Code de secours » et
l'affiche une fois par le composant `src/admin/NouveauCodeDeSecours.astro` ; la base n'en garde que
l'empreinte, dans `code_de_secours` (une ligne au plus). Le ticket 02 livre l'écran de saisie
`/admin/reprise` : le code en place ouvre une session, puis renvoie vers l'accueil, mais il reste
valable.

Ce ticket livre **l'usage unique** (ADR-0032) : quand l'éditrice entre par son code, ce code cesse
aussitôt d'ouvrir ; dans le même geste, toute autre session ouverte est fermée (ce qui chasse un
intrus entré par la boîte perdue) et un **nouveau code** est mis en place puis affiché **une seule
fois**, avant qu'elle ne poursuive vers l'accueil. L'éditrice n'est jamais laissée sans filet au
sortir de la panne.

**Une seule transaction** (design D4). `ouvrirSessionParCodeDeSecours` calcule l'empreinte de la
saisie normalisée, engendre le jeton de session et le nouveau code (`engendrerCodeDeSecours`), puis
envoie un seul `db.batch` :
1. `insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) select ?jeton, ?appareil, ?t, ?t where exists (select 1 from code_de_secours where id = 1 and empreinte = ?ancienne)` ;
2. `delete from sessions where id <> ?jeton and exists (select 1 from sessions where id = ?jeton)` ;
3. `update code_de_secours set empreinte = ?nouvelle, cree_le = ?t where id = 1 and empreinte = ?ancienne`.

Le succès se lit au nombre de lignes changées par (1) ; la fonction rend alors
`{ reussi: true, jeton, nouveauCode }`. Deux présentations simultanées du même code sont sérialisées
par D1 : la seconde ne trouve plus l'ancienne empreinte, ses trois instructions ne changent rien.

**L'écran de réponse.** Au succès, `src/pages/admin/reprise.astro` ne renvoie plus vers l'accueil : la
réponse au POST **rend directement** le composant `NouveauCodeDeSecours` (pas de redirection : le code
n'entre dans aucune adresse), pose le cookie par `enteteCookieSession` (`I13`) et
`Cache-Control: no-store`. Le composant, après un emploi :
- mène « Continuer » vers l'accueil, qui mène à « Mes pages » ;
- ajoute la ligne « Les autres appareils connectés devront se reconnecter. »

Aucun `console.*` ne porte la saisie, l'empreinte ni le nouveau code. Textes dans
`src/admin/textes.ts`, sans terme de développeur (FR-117).

**SC-020, bout en bout.** Boîte inaccessible (liaison d'envoi en échec), appareil neuf (aucun cookie),
l'éditrice présente son code : une session s'ouvre, un nouveau code s'affiche, et elle atteint la liste
des demandes (`/admin/demandes`) depuis l'administration. Joué en intégration ici ; ajouter aussi au
cahier (`docs/cahier-de-test.md`) le cas de recette, boîte de recette rendue inaccessible.

**Risque accepté** (ADR-0032) : si la réponse se perd après la transaction, l'ancien code est servi et
le nouveau n'arrive pas ; la connexion par e-mail reste la voie ordinaire. Non testé.

**Hors de ce ticket.** Le refus identique quelle qu'en soit la cause (04) ; le seuil par origine (05) ;
le remplacement depuis l'écran « Code de secours » (06).

## Critères
- [x] un code de secours qui a ouvert une session, présenté une seconde fois, n'ouvre aucune session   (SC-03a)
- [x] une session vient de s'ouvrir par le code de secours : l'écran affiche un nouveau code de secours, invite à le recopier ou à l'imprimer, et offre de poursuivre vers l'accueil, qui mène à « Mes pages »   (SC-03b)
- [x] le nouveau code affiché à l'emploi, relevé dans le HTML et présenté plus tard, ouvre une session   (SC-03c)
- [x] l'éditrice quitte l'écran qui affiche le nouveau code, puis revient à l'écran « Code de secours » : le nouveau code n'y paraît pas   (SC-03d)
- [x] une session est ouverte sur un premier appareil, puis le code de secours ouvre une session sur un second : la session du premier appareil ne donne plus accès, et celle du second reste ouverte   (SC-03e)
- [x] la réponse qui affiche le nouveau code à l'emploi interdit à tout intermédiaire de la conserver (`Cache-Control: no-store`), et l'adresse de la page ne porte pas le code   (SC-03f)
- [x] le même code de secours présenté deux fois en même temps (`Promise.all`) : une seule session s'ouvre, et un seul nouveau code est mis en place   (SC-03g)
- [x] l'adresse autorisée ne reçoit plus aucun message, et l'éditrice présente son code de secours depuis un appareil neuf : une session s'ouvre, un nouveau code s'affiche une fois, et elle atteint la liste des demandes depuis l'administration (SC-020)   (SC-03h)
