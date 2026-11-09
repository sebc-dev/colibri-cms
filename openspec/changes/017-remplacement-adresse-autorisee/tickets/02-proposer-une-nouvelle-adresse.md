# 02 — Proposer une nouvelle adresse l'inscrit chez Cloudflare et ouvre un remplacement en cours

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `migrations/0017_remplacement_adresse.sql`, `src/platform/adresses-cloudflare/index.ts`, `src/platform/auth/remplacement-adresse.ts`, `src/core/auth/remplacement.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `docs/architecture/context.c4`, `tests/integration/double-api-adresses.ts`, `tests/integration/adresse-e-mail-proposer.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

L'**adresse autorisée** (table `adresses_autorisees`, D1) ouvre l'administration et reçoit les
demandes. Le ticket 01 a posé l'écran gardé `src/pages/admin/adresse-e-mail.astro`, qui la montre, et
la condition `remplacementPossible(compte, cle)` (clé `JETON_ADRESSES_EMAIL` + `__COMPTE_CLOUDFLARE__`).
Ce ticket livre **la première étape** : l'éditrice propose une nouvelle adresse, le produit l'inscrit
parmi les **adresses de destination** du compte Cloudflare du client — ce qui fait partir vers elle le
message de confirmation de Cloudflare, en anglais — et ouvre un **remplacement en cours**. L'adresse
autorisée, elle, ne change pas à cette étape.

**L'adaptateur** `src/platform/adresses-cloudflare/index.ts` (design D3) — n'importe que `core/`
(`I1`), ne connaît ni D1 ni la session :
- `inscrireAdresse(cle, compte, adresse)` → `'inscrite' | 'deja-inscrite' | 'echec'`, sur
  `https://api.cloudflare.com/client/v4/accounts/{compte}/email/routing/addresses`. Liste d'abord
  (`GET`, comparaison sans casse) ; `POST` seulement si l'adresse est absente ;
- délai borné par appel (`AbortSignal.timeout`) ; toute réponse non `success`, un 5xx, un délai
  dépassé ou un corps illisible → `'echec'` ;
- seul le statut HTTP entre dans un journal, jamais la clé, l'en-tête d'autorisation ni le corps.
Le format exact de la réponse `GET` (pagination, filtre) se constate contre l'API réelle de la recette
(design, Open Questions) ; le double s'y conforme.

**Le double de test** `tests/integration/double-api-adresses.ts` : `globalThis.fetch` limité à l'hôte
`api.cloudflare.com`, tenant en mémoire une liste d'adresses avec leur champ `verified` (nul tant que
le clic n'a pas eu lieu), que le test peut faire passer à vérifiée et qu'il peut faire échouer
(`success: false`, 5xx, délai, corps illisible). Patron du double de la forge GitHub
(`tests/integration/revenir-et-publication.test.ts`). Il resservira aux tickets 03 à 08.

**La base** (design D4) : migration additive `0017_remplacement_adresse.sql` — `remplacement_adresse`
(une ligne au plus, `id = 1` : `adresse`, `session`, `ouvert_le`), `codes_remplacement` et
`messages_remplacement`, avec les définitions exactes de `design.md` D4 ; le module rejoue la même
définition en `create table if not exists` (patron de `0016` et `code-de-secours.ts`).
`src/platform/auth/remplacement-adresse.ts` porte `ouvrirRemplacement(db, adresse, session, t)` :
un lot, `insert … on conflict(id) do update` sur `remplacement_adresse` et annulation des codes de
remplacement vivants. Le comptage des messages (`messages_remplacement`) et son plafond sont le
ticket 08 ; ici, rien n'y est écrit.

**L'étape `proposer`** (POST, `etape=proposer`, champ `adresse`) :
1. forme d'adresse — la même règle que les coordonnées et le formulaire de devis (`EMAIL_FORME` de
   `src/core/reglages/coordonnees.ts`, à partager depuis `core/` plutôt qu'à recopier) ; refus :
   « Cette adresse ne semble pas complète. Exemple : prenom@exemple.fr » ;
2. différence avec l'adresse en place, sans casse ; refus : « C'est déjà votre adresse. » ;
3. `inscrireAdresse` ; sur `'echec'` : « Le changement n'a pas pu se faire. Rien n'a changé : votre
   adresse reste <adresse>. Réessayez dans quelques minutes. », et aucun remplacement ouvert ;
4. `'inscrite'` ou `'deja-inscrite'` → `ouvrirRemplacement`, rattaché à l'id de la session courante.

Chaque POST rend directement l'écran de l'étape suivante, sans redirection (patron de
`code-de-secours.astro`). L'anti-forgerie est le cookie `SameSite=Strict` (ADR-0011).

**L'étape 1 à l'écran** (`ux.md` § 3), affichée après la proposition **et** à tout GET tant qu'un
remplacement est en cours : « Un message va arriver à <nouvelle>. Il vient de notre hébergeur,
Cloudflare, et il est écrit en anglais. Ouvrez-le et cliquez sur le bouton « Verify email address ».
Revenez ensuite ici. », un bouton « J'ai cliqué sur le bouton » (POST `etape=verifier`, traité au
ticket 03 — ici, il rend l'étape 1 sans rien écrire), un lien « Revenir aux réglages » (qui n'annule
rien), et « Tant que ce n'est pas terminé, votre adresse reste <adresse>. » (UX2). Le formulaire
« Nouvelle adresse » reste offert : proposer une autre adresse remplace le remplacement en cours.

**Le modèle d'architecture.** Dans `docs/architecture/context.c4`, retirer `#planned` des deux
relations posées par ADR-0033 (`colibri-cms.worker.platform -[sync]-> email-routing 'inscrit une
adresse de destination et lit sa vérification'`, `email-routing -[async]-> editrice 'remet le message
de confirmation de la nouvelle adresse'`), remplacer leur commentaire `// décision :` par une
`// trace :`, puis rejouer `likec4 validate --no-layout --json --project colibri-cms docs/architecture`.

**Recette.** Ajouter au cahier (`docs/cahier-de-test.md`, § de ce ticket) : sur `colibri.sebc.dev`,
proposer une seconde boîte ; le message de Cloudflare y arrive, en anglais, et son bouton porte à la
lettre le libellé « Verify email address » cité à l'écran (UX3) ; une clé limitée aux adresses est
refusée par l'API des règles de routage (preuve de la mitigation M2, sortie conservée).

**Hors de ce ticket.** La vérification et le code (03) ; l'annulation d'un code par une nouvelle
proposition se constate au ticket 05 ; le plafond (08) ; aucun retrait d'adresse chez Cloudflare,
jamais.

## Critères
- [x] une saisie qui n'a pas la forme d'une adresse e-mail (vide, sans `@`) est refusée par l'écran, rien n'est inscrit chez Cloudflare et aucun remplacement n'est ouvert   (SC-02a)
- [x] l'adresse autorisée en place, proposée (casse différente comprise), est refusée : l'écran dit que c'est déjà son adresse, et rien n'est inscrit chez Cloudflare   (SC-02b)
- [x] une adresse valide absente chez Cloudflare est inscrite parmi les adresses de destination du compte (`GET` puis `POST` sur le double), et l'écran annonce le message de confirmation à venir et le geste à faire   (SC-02c)
- [x] une adresse déjà inscrite chez Cloudflare ne fait l'objet d'aucun `POST`, et un remplacement est ouvert vers elle   (SC-02d)
- [x] juste après une proposition, l'adresse autorisée en place ouvre toujours l'administration (un code de connexion lui est écrit) et une demande complète lui est toujours acheminée   (SC-02e)
- [x] quand Cloudflare refuse ou ne répond pas (`success: false`, 5xx, délai dépassé, réponse illisible), l'écran dit que le remplacement n'a pas pu commencer et invite à réessayer plus tard, aucun remplacement n'est ouvert et l'adresse autorisée ne change pas   (SC-02f)
- [x] l'écran rendu alors qu'un remplacement est en cours dit vers quelle adresse il est en cours et ce qui reste à faire   (SC-02g)
