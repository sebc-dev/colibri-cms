# 04 — Le code recopié dans la session demandeuse remplace l'adresse autorisée

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/core/auth/verdict.ts`, `src/platform/auth/remplacement-adresse.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `tests/integration/adresse-e-mail-bascule.test.ts`

## Ce que ça livre

L'**adresse autorisée** (`adresses_autorisees`, D1) ouvre l'administration et reçoit les **demandes**.
Les tickets 02 et 03 ont mené un **remplacement en cours** (`remplacement_adresse`, `id = 1` :
`adresse` candidate, `session` demandeuse) jusqu'à l'envoi d'un **code de remplacement** vers la
nouvelle adresse (`codes_remplacement`, empreinte salée, quinze minutes) ; l'écran montre l'étape 2,
son champ « Code » et le bouton « Valider » (POST `etape=code`). Ce ticket livre **la bascule
nominale** : le bon code, recopié dans la session qui a demandé le remplacement, fait de la nouvelle
adresse l'adresse autorisée.

**`basculerSiCodeValide(db, session, saisie, t)`** (`src/platform/auth/remplacement-adresse.ts`,
design D4) : normalise la saisie comme le code de connexion (`normaliserCode` : casse, séparateurs,
confusables), trouve la ligne par empreinte salée **sur toutes les lignes** (comme
`trouverLigneParCode` — jamais une clause `where` qui exclurait la ligne avant le verdict), juge par
un verdict de `core/auth/` (`rendreVerdict` si sa forme s'y prête, l'« appareil » devenant la session ;
sinon un verdict voisin dans `src/core/auth/verdict.ts`), puis **un seul `db.batch`**, où `C` est
`exists (select 1 from codes_remplacement where id = ?id and utilise_le = ?t)` :
1. `select adresse from adresses_autorisees` (l'ancienne, rendue pour l'avis du ticket 07) ;
2. `update codes_remplacement set utilise_le = ?t where id = ?id and session = ?session and utilise_le is null and annule_le is null and expire_le > ?t and essais < 5` ;
3. `delete from adresses_autorisees where C` ;
4. `insert into adresses_autorisees (adresse) select adresse from remplacement_adresse where id = 1 and C` ;
5. `delete from remplacement_adresse where id = 1 and C`.
Le succès se lit au nombre de lignes changées par (2). Rend `{ reussi: true, ancienne, nouvelle } |
{ reussi: false, raison }`. L'annulation des codes de connexion et la fermeture des autres sessions
s'ajouteront à ce lot au ticket 06 ; l'avis, au ticket 07.

**Ce qui suit de soi.** `estAdresseAutorisee` (connexion) et `lireAdresseAutorisee` (lue à chaque
envoi par `src/pages/api/public/demandes.ts`) lisent la même ligne : la remplacer suffit pour que la
connexion et les demandes suivent, sans toucher à ces routes. L'ancienne adresse, soumise à l'écran
de connexion, reçoit la même réponse que toute adresse inconnue. Le code de secours (`code_de_secours`)
n'est pas touché (ADR-0032).

**La réussite à l'écran** (`ux.md` § 5) : « C'est fait : votre adresse est désormais <nouvelle>. Vos
codes de connexion et vos demandes de devis y arriveront. » et un bouton « Revenir aux réglages ». Les
phrases sur les autres appareils et l'ancienne adresse s'ajoutent avec les tickets 06 et 07. Un refus
rend l'étape 2 avec un message provisoire ; les messages par geste sont le ticket 05.

**Hors de ce ticket.** Les refus (fautif, brûlage, expiration, autre session, usage unique, code de
connexion) au ticket 05 ; la fermeture des sessions et l'annulation des codes de connexion au 06 ;
l'avis et la concurrence au 07 ; le plafond au 08.

## Critères
- [x] l'éditrice recopie le code de remplacement dans la session qui l'a demandé, dans les quinze minutes : l'adresse autorisée devient la nouvelle adresse (une seule ligne dans `adresses_autorisees`), et l'écran confirme la nouvelle adresse   (SC-04a)
- [x] le code de remplacement saisi avec des minuscules, des espaces ou des tirets, ou des confusables, est reconnu et remplace l'adresse   (SC-04b)
- [x] juste après le remplacement, la nouvelle adresse soumise à l'écran de connexion reçoit un code écrit et envoyé ; pour l'ancienne, rien n'est écrit ni envoyé, et la réponse est celle de toute autre adresse   (SC-04c)
- [x] le code de secours en place ouvre toujours une session juste après le remplacement   (SC-04d)
- [x] juste après le remplacement, une demande complète est acheminée vers la nouvelle adresse, et aucun message de la demande ne part vers l'ancienne   (SC-04e)
- [x] pendant un remplacement en cours, non encore abouti, une demande complète est acheminée vers l'adresse autorisée en place   (SC-04f)
