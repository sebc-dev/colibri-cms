# 03 — Le refus du plafond garde l'étape du code

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/pages/admin/adresse-e-mail.astro`, `src/platform/auth/remplacement-adresse.ts`, `tests/integration/adresse-e-mail-plafond-code.test.ts`

## Ce que ça livre

Le remplacement de l'**adresse autorisée** (change 017, ADR-0033) est borné par un plafond : au plus
cinq messages par heure glissante pour le remplacement (inscriptions chez Cloudflare et codes partis),
indépendant du plafond des codes de connexion. À l'étape 2 de l'écran « Adresse e-mail », l'éditrice
a reçu un code, voit le champ Code et le bouton « Valider », et peut presser « Recevoir un nouveau
code » (POST `etape=verifier`).

**Le défaut corrigé** (constaté en recette du 017) : quand le plafond refuse ce nouveau code —
`ecrireCodeDeRemplacement()` rend `null` —, l'écran revient à l'étape de la confirmation et le champ
Code disparaît, alors que le code déjà parti est toujours bon.

**Ce que ce ticket livre** (design D3) :

- Une fonction de lecture dans `src/platform/auth/remplacement-adresse.ts` : la session tient-elle un
  code de remplacement **encore bon** (non servi, non annulé, non expiré) ? Cette fonction existe déjà depuis le
  ticket 01 (`codeRecopiableExiste`) : la réutiliser, ne pas la recréer.
- À un refus du plafond à l'étape `verifier`, la route consulte cette lecture :
  - code encore bon → l'écran rend **l'étape du code** (champ Code et « Valider » affichés) avec le
    texte existant du plafond, « Trop de messages sont partis en peu de temps. Réessayez dans une
    heure. » ; le code déjà parti permet toujours de remplacer l'adresse ;
  - sinon → l'étape de la confirmation avec le même texte, comme aujourd'hui.
- Rien n'est inscrit, écrit ni envoyé au refus ; le refus ne retire rien de ce qui est en cours.

**Tests.** Intégration dans `workerd` (ADR-0014), D1 réelle, API des adresses doublée
(`tests/integration/double-api-adresses.ts`), espion d'envoi. Oracle : le champ `code` présent dans
la réponse au refus, et ce code toujours accepté ensuite (la bascule a lieu). Cas limites : cinq
messages partis avec un code bon en circulation (étape du code gardée) ; cinq partis sans code en
circulation (étape de la confirmation).

**Hors périmètre** : la minute d'attente (ticket 01), l'envoi attendu et son refus (ticket 02), toute
modification du plafond lui-même (nombre, fenêtre, indépendance avec la connexion).

## Critères

- [ ] Quand un code de remplacement est parti et reste bon, et qu'une nouvelle demande de code est refusée par le plafond : l'écran dit qu'il faut attendre avant de réessayer et garde le champ de saisie du code, et le code déjà parti permet toujours de remplacer l'adresse   (SC-03a)
