# Suites de la recette complète d'octobre

Portée : hors-cycle
Ouvert le 2026-10-30 · Actualisé le 2026-10-30 · branche `main` · HEAD `5adbd36`

## Objectif
Faire trancher, puis engager, ce qui suit la recette complète fusionnée par la PR #288 : le ménage de
sa branche, l'archivage du change 013 et le sort de chaque relevé (défaut, remarques, constats).

## Contexte à charger
à extraire  `docs/cahier-de-test.md` › lignes `CT-6.3`, `CT-15.5`, `CT-24.7`, `CT-37.4` — 940 l., seuls ces relevés comptent
à extraire  `src/pages/api/public/demandes.ts` › `export const POST` (L110-145) — garder, acheminer, noter « parti »
à situer    `docs/chantiers/archive/2026-10-27-recette-complete.md` — la recette fermée, conclusions reprises ici
à situer    PR #288 — son corps liste les constats hors cahier, distillés dans Acquis
à situer    `openspec/changes/013-reception-et-suivi-des-demandes/` — le change dont l'archivage attendait la recette

## Acquis
- J'avais retenu que plus rien ne retenait l'archivage du change 013 : la fiche de recette
  l'attendait des §§ 35 à 41, joués le 28/10.
- J'avais proposé de supprimer la branche distante `recette/complete-2026-10` et de lancer
  `/opsx:archive 013-reception-et-suivi-des-demandes` ; l'utilisateur n'avait pas encore répondu.
- Constat hors cahier : une demande dont le visiteur quittait la page pendant l'envoi (≈ 6 s) restait
  « E-mail non parti » alors que l'e-mail arrivait — le Worker était coupé entre l'envoi et
  `noterCourrielParti`. Quatre cas le 28/10 à 07:22. Je comptais regarder `waitUntil`, sans l'avoir vérifié.
- Constat hors cahier : le 28/10 entre 07:11 et 07:28, une reconstruction Workers Builds avait échoué
  (réussie à la relance) et des envois de demande restaient plus de 40 s sans réponse, comptés par le
  seuil mais jamais gardés (attente entre `compterEtJuger` et `garderDemande`). Cause non établie ;
  ensuite, 1 à 7 s par envoi.

## Prochaine étape
Faire trancher l'utilisateur : suppression de la branche distante, archivage du change 013, puis, pour
chaque relevé (image publiée cassée dans l'éditeur, demande « non parti » à tort, marges du tableau
des nombres, largeur d'« Enregistrer » dans les réglages), un change ou une correction directe.

## Écarté
- Lire les jetons de wrangler pour obtenir le journal de l'échec Workers Builds : la construction a
  été rejouée dans le clone de recette, où elle réussissait.
- Mettre les blocages de 07:24 à 07:28 sur le seul navigateur piloté : curl restait aussi 40 s sans réponse.
- Noter KO le tableau de CT-37.4 : le critère du cahier (pas de défilement de côté) tenait ; la remarque restait à trancher.

## Issue
Tout engagé et fusionné le 2026-10-31. Branche `recette/complete-2026-10` supprimée. Change 013 archivé
par #289 (13 specs vivantes valides, story cochée). Corrections directes : « non parti » à tort par #290
(envoi et marque confiés à `waitUntil`), images publiées cassées dans l'éditeur par #291, marges du
tableau des nombres et largeur d'« Enregistrer » par #292. Rejeu sur la recette (`main` `fb1f2db`) :
CT-6.3 et CT-15.5 passent à OK, remarques de CT-24.7 et CT-37.4 levées ; deux demandes envoyées puis
quittées à 0,4 s et 1,5 s sont marquées « parti » en 17 s. Les envois restés 40 s sans réponse le 28/10
ne sont pas engagés : cause non établie, non reproduits.
