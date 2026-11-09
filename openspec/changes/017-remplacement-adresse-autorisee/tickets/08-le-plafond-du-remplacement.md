# 08 — Au plus cinq messages par heure pour le remplacement

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/core/auth/regles.ts`, `src/platform/auth/remplacement-adresse.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `tests/integration/adresse-e-mail-plafond.test.ts`

## Ce que ça livre

Le remplacement de l'**adresse autorisée** fait partir deux sortes de messages vers une adresse saisie
dans l'administration : le message de confirmation de Cloudflare, à chaque inscription d'une adresse
neuve (ticket 02), et le code de remplacement du produit (ticket 03). Une session — légitime ou
volée — pourrait en faire partir en série vers des adresses tierces (menace M3). Ce ticket livre **le
plafond** : au plus cinq messages pour le remplacement par heure glissante, toutes adresses
confondues, compté à part du plafond des codes de connexion.

**Le comptage** (design D5) : la table `messages_remplacement (envoye_le)` (migration
`0017_remplacement_adresse.sql`, ticket 02) reçoit une ligne :
- à chaque inscription **réellement demandée** chez Cloudflare (`'inscrite'`, jamais
  `'deja-inscrite'`, qui ne fait partir aucun message). La ligne est réservée **avant** l'appel, par
  une requête `insert … select … where (compte de la fenêtre) < 5` ; si elle n'a pas pu l'être, rien
  n'est inscrit. Un `'echec'` ne la rend pas : le message a pu partir ;
- à chaque code de remplacement écrit : l'épreuve et l'écriture du code sont **une seule requête**
  (`insert … select … where count < 5`), patron d'`ecrireCodeSiPlafondNonAtteint` dans
  `src/platform/auth/magasin.ts`. Deux demandes concurrentes ne peuvent donc pas franchir le plafond.

Constantes dans `src/core/auth/regles.ts` : `PLAFOND_MESSAGES_REMPLACEMENT_PAR_HEURE = 5`, et la
fenêtre partagée `FENETRE_PLAFOND_MS` (une heure). Une ligne plus vieille que la fenêtre cesse de
compter. Le plafond de la connexion (`PLAFOND_CODES_PAR_HEURE`, qui compte `codes_connexion`) ne lit
jamais `messages_remplacement`, et réciproquement.

**À l'écran** (`ux.md` § 6) : « Trop de messages sont partis en peu de temps. Réessayez dans une
heure. », l'adresse en place redite (UX2), sans terme de développeur (FR-117) — ce ticket le contrôle
pour ce texte.

## Critères
- [ ] cinq messages déjà partis pour le remplacement dans l'heure, puis l'éditrice propose une adresse neuve ou demande un code : rien n'est inscrit chez Cloudflare, aucun code n'est écrit, rien n'est envoyé, et l'écran dit, sans terme de développeur, qu'il faut attendre avant de réessayer   (SC-08a)
- [ ] le plafond du remplacement atteint, l'adresse autorisée soumise à l'écran de connexion reçoit un code de connexion écrit et envoyé comme sans plafond du remplacement   (SC-08b)
- [ ] un message du remplacement sort de l'heure glissante : une nouvelle proposition ou un nouveau code redevient possible   (SC-08c)
- [ ] deux demandes de code concurrentes alors que quatre messages sont déjà partis dans l'heure : un seul code est écrit   (SC-08d)
