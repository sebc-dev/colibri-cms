# 01 — Une confirmation de moins d'une minute fait patienter

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/platform/adresses-cloudflare/index.ts`, `src/core/auth/regles.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `tests/integration/double-api-adresses.ts`, `tests/integration/adresse-e-mail-attente.test.ts`, `tests/unit/confirmation-recente.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Le remplacement de l'**adresse autorisée** (change 017, ADR-0033) exige deux preuves : l'éditrice
clique sur le bouton du message de confirmation de Cloudflare, puis recopie le code que le produit
envoie à la nouvelle adresse. À l'étape 1 de l'écran « Adresse e-mail », le bouton « J'ai cliqué sur
le bouton » (POST `etape=verifier`) demande à Cloudflare si l'adresse est vérifiée ; si oui, le
produit écrit un code, compte un message au plafond de cinq par heure, et l'envoie. Le bouton
« Recevoir un nouveau code » de l'étape 2 passe par la même étape `verifier`.

**Le défaut corrigé** (recette du 017, CT-47.2) : Cloudflare tient l'adresse pour vérifiée dès le
clic, mais refuse encore d'y écrire pendant plusieurs dizaines de secondes (refus mesurés jusqu'à
30 s après le clic, succès à partir de 45 s). L'éditrice qui revient aussitôt presser le bouton reçoit
« Un code vient de partir » et aucun message — et chaque essai entame le plafond.

**Ce que ce ticket livre** (design D1) :

- L'adaptateur `src/platform/adresses-cloudflare/index.ts` — seul fichier qui connaît l'API des
  adresses (`I18`) — rend, avec l'état `verifiee`, **l'instant de vérification** lu dans le champ
  `verified` de l'adresse (un horodatage, ex. `2026-11-11T08:37:23.130447Z`). Aujourd'hui il n'en
  garde qu'un booléen. Un `verified` présent mais non daté (illisible) est traité comme **ancien** :
  le code part comme avant.
- Une constante pure `DELAI_APRES_CONFIRMATION_MS = 60 000` dans `src/core/auth/regles.ts`, à côté
  des constantes du plafond (`I2`), et la comparaison « vérifiée depuis moins d'une minute » comme
  fonction pure du même module (instant de vérification, maintenant → booléen).
- L'étape `verifier` de la route : si la vérification date de moins d'une minute, elle **ne réserve
  aucune place au plafond, n'écrit aucun code, n'envoie rien**, et l'écran affiche, en message ambre,
  à la place du « clic pas encore enregistré » :

  > Votre clic est bien enregistré. Il faut encore un instant avant que le code puisse partir.
  > Patientez une minute, puis appuyez de nouveau sur « J'ai cliqué sur le bouton ».

  Depuis l'étape 2 (« Recevoir un nouveau code » pressé pendant la minute), le même message nomme
  le bouton « Recevoir un nouveau code », le champ Code reste affiché, et **le code précédent n'est
  pas annulé** : il reste recopiable. La ligne « Tant que ce n'est pas terminé, votre adresse reste … »
  reste affichée. Aucun terme de développeur (FR-117) ; le texte nomme le bouton par son libellé exact.
- Passé la minute, le comportement du change 017 reste inchangé : le code est écrit et part.

**Tests.** Intégration dans `workerd` (ADR-0014) sur `POST /admin/adresse-e-mail`, D1 réelle : le
double de `globalThis.fetch` limité à `api.cloudflare.com` (`tests/integration/double-api-adresses.ts`)
rend désormais un `verified` **daté que le test choisit** (il rend aujourd'hui `2026-01-01T00:00:00Z`
fixe — les tests du 017 qui s'y appuient doivent rester verts sans retouche) ; le temps courant est
injecté. Oracle de l'attente : aucun code en base (`codes_remplacement`), aucune ligne de plus dans
`messages_remplacement`, aucun appel à l'espion d'envoi, le texte d'attente dans la réponse. Cas
limites : 59 s, 60 s, 61 s avant l'heure injectée ; instant dans le futur (horloges décalées → attente) ;
`verified` non daté (→ le code part). Unité pour la comparaison pure.

**Recette.** Ajouter à `docs/cahier-de-test.md` un cas neuf (section du change 018) : cliquer chez
Cloudflare, revenir aussitôt, presser le bouton → message d'attente, rien au plafond ; patienter une
minute, represser → le code arrive.

**Hors périmètre** : attendre l'issue de l'envoi et le réessai (ticket 02), le refus du plafond à
l'étape du code (ticket 03), la césure de l'adresse (ticket 04), tout rafraîchissement automatique de
l'écran (il demanderait un script de navigateur, `I4`/`I12`). Aucune table, colonne ni secret nouveau.

## Critères

- [x] Quand l'éditrice dit avoir confirmé, ou demande un nouveau code, alors que Cloudflare tient l'adresse pour vérifiée depuis moins d'une minute : aucun code n'est écrit ni envoyé, aucun message n'est compté au plafond, l'écran dit que le clic est bien enregistré et invite à réessayer dans un instant, et redit l'adresse en place   (SC-01a)
- [x] Quand l'éditrice dit avoir confirmé, que Cloudflare tient l'adresse pour vérifiée depuis une minute ou plus et que l'envoi est accepté : un code est écrit et envoyé vers la nouvelle adresse, et l'écran invite à recopier le code reçu dans la nouvelle boîte   (SC-01b)
