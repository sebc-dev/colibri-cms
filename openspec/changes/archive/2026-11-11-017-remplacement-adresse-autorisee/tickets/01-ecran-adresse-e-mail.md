# 01 — L'écran « Adresse e-mail » montre l'adresse en place, et dit quand le remplacement n'est pas possible

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/pages/admin/adresse-e-mail.astro`, `src/pages/admin/reglages.astro`, `src/admin/textes.ts`, `src/core/auth/remplacement.ts`, `astro.config.ts`, `src/env.d.ts`, `instance.json`, `src/platform/d1/cloudflare-workers.d.ts`, `vitest.config.ts`, `tests/integration/adresse-e-mail-ecran.test.ts`, `tests/unit/remplacement-possible.test.ts`

## Ce que ça livre

L'**adresse autorisée** est l'unique adresse e-mail qui ouvre l'administration et reçoit les
**demandes** de devis. Elle vit en D1, table `adresses_autorisees (id, adresse unique)`, lue par
`lireAdresseAutorisee` (`src/platform/auth/magasin.ts`). Aujourd'hui, rien dans l'administration ne la
montre ni ne la change. Le change 017 permet à l'éditrice de la remplacer seule (FR-013, FR-014) ;
ce ticket pose **l'écran**, sans encore aucune écriture.

**L'écran** `src/pages/admin/adresse-e-mail.astro`, **gardé** : sans session, la requête (GET ou
POST) est renvoyée vers l'écran de connexion, et rien n'est lu au-delà du garde (`I6`, ADR-0007 — la
route importe le garde et s'en sert pour bloquer). Rendu serveur, sans directive `client:*` (`I4`),
avec les pièces de l'écran « Code de secours » (`Card`, `Input`/`Label`, `Alert`, boutons) :

- titre « Adresse e-mail » ; « Vos codes de connexion et vos demandes de devis arrivent à : » puis
  l'adresse en place, interpolée par Astro (jamais `set:html`, `I5`) ;
- un champ « Nouvelle adresse » et un bouton « Changer d'adresse » (le formulaire POST porte un champ
  caché `etape=proposer` ; son traitement est le ticket 02 — ici, un POST authentifié rend l'écran
  au repos sans rien écrire).

**La clé et le compte** (design D2, ADR-0033, ADR-0005) :
- secret optionnel `JETON_ADRESSES_EMAIL`, déclaré à côté de `JETON_DEPOT` dans
  `src/platform/d1/cloudflare-workers.d.ts` — une clé du compte du client, permission « Email Routing
  Addresses Edit » seulement ;
- champ optionnel `compteCloudflare` d'`instance.json` (32 caractères hexadécimaux, validé par
  `astro.config.ts`, injecté en `__COMPTE_CLOUDFLARE__`), patron exact de `depotDePublication` /
  `__DEPOT_DE_PUBLICATION__` (`I8`, `I10`) ; le `define` de test suit le même patron ;
- une fonction pure de `core/` (`remplacementPossible(compte, cle)`) tranche ; elle se teste à l'unité
  pour les trois cas (sans clé, sans compte, sans les deux), puisqu'une valeur injectée à la
  construction ne varie pas d'un test d'intégration à l'autre.

Sans l'un ou l'autre, **à la place du formulaire** : « Le changement d'adresse n'est pas possible pour
le moment. Votre adresse reste <adresse>. » Un POST est alors refusé de même, sans rien écrire.

**Réglages.** Sur `src/pages/admin/reglages.astro`, sous le lien « Code de secours », un lien
« Adresse e-mail » vers `/admin/adresse-e-mail` (cible ≥ 44 px, `min-h-11`). Comme « Code de
secours », ce n'est pas une carte de réglage : ni brouillon, ni restauration, ni place au
récapitulatif de publication.

Les textes vivent dans `src/admin/textes.ts`. L'éditrice lit « adresse e-mail » ou « votre adresse »,
jamais « adresse autorisée » (`ux.md`, FR-117).

**Hors de ce ticket.** La proposition et l'inscription chez Cloudflare (02) ; le code (03) ; la
bascule (04). Le contrôle des termes de développeur sur tous les états de l'écran est le ticket 05.

## Critères
- [x] l'écran « Adresse e-mail », en GET comme en POST, demandé sans session ouverte, renvoie vers l'écran de connexion, et rien n'est inscrit, écrit ni envoyé   (SC-01a)
- [x] l'écran Réglages porte un lien vers l'écran « Adresse e-mail »   (SC-01b)
- [x] l'écran rendu avec une session ouverte montre l'adresse autorisée en place et offre un champ pour proposer une nouvelle adresse   (SC-01c)
- [x] sur une instance sans clé, sans identifiant de compte, ou sans les deux, l'écran montre l'adresse en place et dit que le remplacement n'est pas possible pour le moment, et aucune proposition n'aboutit à une inscription ou un envoi   (SC-01d)
