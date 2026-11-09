# 06 — Le remplacement ferme les autres sessions et annule les codes de connexion en circulation

**Bloqué par :** 04
**Vérif :** tdd
**Fichiers :** `src/platform/auth/remplacement-adresse.ts`, `src/admin/textes.ts`, `src/pages/admin/adresse-e-mail.astro`, `tests/integration/adresse-e-mail-sessions.test.ts`

## Ce que ça livre

Une boîte piratée est la première raison de remplacer l'**adresse autorisée** (proposal, point 4).
Le ticket 04 fait de la nouvelle adresse l'adresse autorisée, par un seul lot `db.batch` dans
`basculerSiCodeValide` (`src/platform/auth/remplacement-adresse.ts`), gardé par la condition `C`
(« le code vient d'être marqué utilisé à cet instant »). Ce ticket ajoute **au même lot** les deux
effets qui privent l'intrus de ce qu'il tenait par l'ancienne boîte (menaces M1, M6) :

- `update codes_connexion set annule_le = ?t where annule_le is null and utilise_le is null and C` —
  tout code de connexion encore en circulation, parti vers l'ancienne adresse, cesse d'ouvrir (les
  lignes de `codes_connexion` ne portent pas l'adresse : on les annule toutes) ;
- `delete from sessions where id <> ?session and C` — toute autre session est fermée (une session
  est une ligne de `sessions`, la supprimer la ferme, ADR-0001) ; la session de l'éditrice reste
  ouverte. Patron existant : `src/platform/auth/code-de-secours.ts`.

C'est la seconde exception à la coexistence des sessions de la capacité `connexion-par-code`
(exigence « La fin de session automatique », modifiée par ce change) : hors le code de secours et ce
remplacement, les sessions simultanées coexistent sans que rien ne les ferme — un remplacement **en
cours**, non abouti, n'en ferme aucune.

À la réussite, l'écran ajoute « Vos autres appareils devront se reconnecter. » (`ux.md` § 5).

**Hors de ce ticket.** L'avis à l'ancienne adresse et la concurrence de deux saisies (07).

## Critères
- [ ] une session ouverte sur un autre appareil, puis l'éditrice remplace l'adresse : la session de l'autre appareil est renvoyée vers l'écran de connexion, et la session de l'éditrice reste ouverte   (SC-06a)
- [ ] plusieurs sessions ouvertes, puis l'adresse autorisée remplacée : seule reste ouverte la session qui a fait le remplacement   (SC-06b)
- [ ] plusieurs sessions ouvertes, un remplacement proposé et son code envoyé mais non recopié : toutes les sessions coexistent, rien ne les ferme   (SC-06c)
- [ ] un code de connexion envoyé à l'ancienne adresse, puis l'adresse remplacée avant qu'il serve : ce code n'ouvre plus de session   (SC-06d)
