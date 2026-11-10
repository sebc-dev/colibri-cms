# 07 — L'ancienne adresse est prévenue du remplacement

**Bloqué par :** 04
**Vérif :** tdd
**Fichiers :** `src/platform/email/index.ts`, `src/platform/auth/remplacement-adresse.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `tests/integration/adresse-e-mail-avis.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Une session volée pourrait remplacer l'**adresse autorisée** par celle d'un intrus, qui recevrait
dès lors les codes de connexion et les demandes (menace M1). Le ticket 04 fait basculer l'adresse par
`basculerSiCodeValide` (`src/platform/auth/remplacement-adresse.ts`), qui rend
`{ reussi: true, ancienne, nouvelle }`. Ce ticket livre **l'avis** : à chaque remplacement réussi, un
message part vers l'ancienne adresse pour dire ce qui s'est passé, et renvoie au code de secours, qui
permet à l'éditrice de reprendre la main et de remettre son adresse (ADR-0032).

**Le message** (`src/platform/email/index.ts`, design D6) :
`demanderAvisDeRemplacement(expediteur, ancienne, nouvelle, date, adresseExpediteur)` — texte seul,
objet fixe « L'adresse de votre administration a changé », depuis l'adresse d'expéditeur de
l'instance ; corps étiqueté (ADR-0002, la donnée variable derrière son étiquette) : la nouvelle
adresse, la date, et « Si vous n'êtes pas à l'origine de ce changement, entrez avec votre code de
secours et remettez votre adresse. » Aucun code d'aucune sorte. L'ancienne adresse reste vérifiée chez
Cloudflare (le produit n'en retire jamais), donc la liaison d'envoi y écrit encore.

**L'envoi** est remis par `waitUntil` après la bascule. Un échec ne défait pas le remplacement : il
est consigné dans les journaux de la plateforme, sans aucun code ni la clé. À la réussite, l'écran
ajoute « Un message a prévenu votre ancienne adresse, <ancienne>. » (`ux.md` § 5).

**La concurrence.** Deux saisies simultanées du bon code sont sérialisées par D1 : la seconde ne
trouve plus `utilise_le is null`, la condition `C` est fausse pour elle, rien d'autre ne change — et
seule la saisie qui a réellement basculé fait partir l'avis.

**Recette.** Ajouter au cahier (§ de ce ticket) : sur `colibri.sebc.dev`, après le remplacement vers la
seconde boîte, l'avis arrive dans la première ; puis remettre l'adresse d'origine. Et le parcours
complet, de « Changer d'adresse » à la réussite, joué au téléphone (gabarit mobile, `playwright-cli`),
la boîte ouverte à côté, en moins de cinq minutes (UX4).

## Critères
- [x] l'adresse vient d'être remplacée : un avis part vers l'ancienne adresse, en texte seul, sous un objet fixe, qui nomme la nouvelle adresse et la date, et renvoie au code de secours   (SC-07a)
- [x] l'avis du remplacement ne porte ni code de connexion, ni code de remplacement, ni code de secours   (SC-07b)
- [x] l'envoi de l'avis échoue : l'adresse autorisée reste la nouvelle adresse, et une trace de l'échec est écrite dans les journaux de la plateforme, sans aucun code   (SC-07c)
- [x] le même code de remplacement saisi deux fois en même temps : l'adresse est remplacée une seule fois et un seul avis part   (SC-07d)
