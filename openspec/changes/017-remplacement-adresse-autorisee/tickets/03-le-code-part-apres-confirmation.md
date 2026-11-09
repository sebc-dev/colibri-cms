# 03 — Le code de remplacement ne part qu'une fois la confirmation de Cloudflare constatée

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `wrangler.jsonc`, `wrangler.astro.jsonc`, `src/platform/adresses-cloudflare/index.ts`, `src/platform/auth/remplacement-adresse.ts`, `src/platform/email/index.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `tests/integration/double-api-adresses.ts`, `tests/integration/adresse-e-mail-code.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Le remplacement de l'**adresse autorisée** exige deux preuves (FR-014, ADR-0033). La première est la
confirmation de Cloudflare : le ticket 02 a inscrit la nouvelle adresse parmi les adresses de
destination du compte du client, et ouvert un **remplacement en cours** (`remplacement_adresse`,
`id = 1`, rattaché à la session demandeuse) ; l'écran montre l'étape 1 et son bouton « J'ai cliqué sur
le bouton » (POST `etape=verifier`). Ce ticket livre **la seconde preuve, à l'envoi** : quand
l'éditrice presse ce bouton, le produit demande à Cloudflare si l'adresse est vérifiée ; si oui, il
engendre un code et l'envoie à la nouvelle adresse.

**L'adaptateur** `src/platform/adresses-cloudflare/index.ts` gagne
`etatAdresse(cle, compte, adresse)` → `'verifiee' | 'en-attente' | 'absente' | 'echec'` (champ
`verified` de la réponse `GET`, nul tant que le clic n'a pas eu lieu), mêmes règles que
`inscrireAdresse` : délai borné, toute réponse non `success` → `'echec'`, seul le statut HTTP dans les
journaux, jamais la clé.

**La liaison d'envoi** perd `destination_address` dans `wrangler.jsonc` et `wrangler.astro.jsonc`
(design D2) : elle écrit à toute adresse vérifiée du compte du client. Le produit, lui, n'écrit qu'à
l'adresse autorisée lue en base, ou à l'adresse d'un remplacement en cours **constatée vérifiée**. Les
commentaires qui justifiaient l'adresse fixe (FR-005) se mettent à jour : FR-005 vise l'écran de
connexion public (ADR-0033).

**Le code** (`src/platform/auth/remplacement-adresse.ts`, design D4) : de la même forme que le code de
connexion — huit signes de l'alphabet sans confusables (`src/core/auth/code.ts`) —, gardé en base
seulement en empreinte salée dans `codes_remplacement` (`session`, `creee_le`, `expire_le` à quinze
minutes, `essais`, `utilise_le`, `annule_le`), jamais en clair. Écrire un code annule les codes de
remplacement antérieurs. Le plafond qui borne cette écriture est le ticket 08 ; la fonction s'écrit
déjà sous la forme d'une seule requête `insert … select …` pour qu'il s'y greffe.

**Le message** (`src/platform/email/index.ts`, design D6) :
`demanderExpeditionDuCodeDeRemplacement(expediteur, destinataire, code, adresseExpediteur)` — vers la
nouvelle adresse, depuis l'adresse d'expéditeur de l'instance (`__ADRESSE_EXPEDITEUR__`), texte seul,
objet fixe « Confirmez votre nouvelle adresse » (différent de celui du code de connexion), corps
`Code : XXXXXXXX` derrière son étiquette (ADR-0002). Remis par `waitUntil`, comme la connexion. Aucun
code dans un journal.

**L'étape `verifier`** :
- `'en-attente'` ou `'absente'` → rien n'est écrit ni envoyé ; l'étape 1 revient avec le message ambre
  « Le clic n'a pas encore été enregistré. Vérifiez vos courriers indésirables, cliquez sur le bouton
  du message, puis réessayez. » ;
- `'echec'` → rien n'est écrit ni envoyé ; « … Réessayez dans quelques minutes. », l'adresse en place
  redite (UX2) ;
- `'verifiee'` → code écrit, envoi demandé, et **l'étape 2** (`ux.md` § 4) : « Un code vient de partir
  vers <nouvelle>. Recopiez-le ici. Il reste bon quinze minutes. », champ « Code », bouton « Valider »
  (POST `etape=code`, traité au ticket 04 — ici il rend l'étape 2 sans rien écrire), et « Recevoir un
  nouveau code » (un nouveau POST `etape=verifier`). Une adresse déjà vérifiée avant la proposition
  suit le même chemin : l'étape 1 s'affiche, le premier clic fait partir le code.

**Recette.** Ajouter au cahier (§ de ce ticket) : sur `colibri.sebc.dev`, après le clic sur « Verify
email address », « J'ai cliqué sur le bouton » fait arriver le code dans la seconde boîte, en texte
seul, sous l'objet « Confirmez votre nouvelle adresse » ; pressé avant le clic, l'écran le dit.

**Hors de ce ticket.** La saisie du code et la bascule (04) ; ses refus (05) ; le plafond (08).

## Critères
- [ ] l'éditrice dit avoir confirmé alors que Cloudflare ne tient pas encore l'adresse pour vérifiée : aucun code n'est écrit ni envoyé, et l'écran redit qu'il faut cliquer sur le bouton du message de confirmation   (SC-03a)
- [ ] l'éditrice dit avoir confirmé et Cloudflare tient l'adresse pour vérifiée : un code est écrit, son envoi vers la nouvelle adresse est demandé, et l'écran invite à recopier le code reçu dans la nouvelle boîte   (SC-03b)
- [ ] le code de remplacement engendré fait huit signes de l'alphabet sans confusables, et la base n'en garde qu'une empreinte salée, jamais le code   (SC-03c)
- [ ] le message du code a pour destinataire la nouvelle adresse et pour expéditeur l'adresse d'expéditeur de l'instance ; il part en texte seul, sous un objet fixe qui n'est pas celui du code de connexion   (SC-03d)
- [ ] un second code de remplacement demandé : le premier ne permet plus de remplacer l'adresse (sa ligne est annulée)   (SC-03e)
- [ ] quand Cloudflare refuse ou ne répond pas à la demande d'état de l'adresse, aucun code n'est écrit ni envoyé, et l'écran invite à réessayer dans quelques instants   (SC-03f)
- [ ] une proposition, une vérification ou un refus de Cloudflare traité ne fait paraître la clé ni dans la réponse, ni dans les journaux de la plateforme   (SC-03g)
