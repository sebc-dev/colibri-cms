# 02 — L'écran n'annonce le code qu'une fois l'envoi accepté

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/pages/admin/adresse-e-mail.astro`, `src/platform/auth/remplacement-adresse.ts`, `src/admin/textes.ts`, `tests/integration/adresse-e-mail-envoi.test.ts`

## Ce que ça livre

Le remplacement de l'**adresse autorisée** (change 017, ADR-0033) fait partir, à l'étape `verifier`
de l'écran « Adresse e-mail » (bouton « J'ai cliqué sur le bouton », ou « Recevoir un nouveau code »
à l'étape 2), un code de remplacement vers la nouvelle adresse. Aujourd'hui,
`ecrireCodeDeRemplacement()` écrit le code et compte un message au plafond de cinq par heure, puis
l'envoi part dans `waitUntil` : l'écran passe à l'étape du code (« Un code vient de partir vers … »)
sans connaître l'issue, et un refus ne laisse qu'une ligne de journal `[adresse] envoi du code échoué`.
Un réessai en tâche de fond ne peut pas aider : `waitUntil` ne survit qu'une trentaine de secondes.

**Ce que ce ticket livre** (design D2) :

- La route **attend** l'envoi du code (`demanderExpeditionDuCodeDeRemplacement`) au lieu de le
  confier à `waitUntil`. **Trois tentatives au plus**, séparées de 1 s puis 2 s ; l'attente entre deux
  tentatives est **injectable** pour que les tests ne dorment pas.
- Une tentative acceptée → l'écran passe à l'étape du code, comme aujourd'hui, et **un seul** message
  est parti, avec le code écrit pour cette demande.
- Trois refus →
  1. le code écrit pour cette demande est annulé (`annule_le`) : il ne permet pas de remplacer l'adresse ;
  2. sa place au plafond est rendue (`libererMessageRemplacement`, même instant que la réservation) ;
  3. l'écran **revient à l'étape de la confirmation** (étape 1, bouton « J'ai cliqué sur le bouton ») et
     affiche, en message ambre :

     > Le code n'a pas pu partir vers nouvelle@exemple.fr. Patientez une minute, puis appuyez de
     > nouveau sur « J'ai cliqué sur le bouton ».

     Il ne dit jamais « Un code vient de partir », et redit l'adresse en place.
  4. la ligne de journal existante est gardée, sous sa forme du 017 : le nom de l'erreur, jamais
     l'adresse ni le code (security-review M3).

  **Arbitré à la décomposition** : la même suite vaut quand le refus survient sur « Recevoir un
  nouveau code » depuis l'étape 2. La demande a déjà annulé le code précédent (« un nouveau code
  annule le précédent »), aucun code n'est donc recopiable : l'écran revient à l'étape de la
  confirmation, sans champ Code. (`ux.md` du change disait « le champ Code reste affiché » ; il est à
  corriger par la révision du change, design D2 fait foi.)
- L'avis à l'ancienne adresse, après la bascule, **reste** dans `waitUntil` (inchangé).
- Aucun terme de développeur dans le texte nouveau (FR-117) ; il nomme le bouton par son libellé exact.

**Tests.** Intégration dans `workerd` (ADR-0014), D1 réelle, l'API des adresses doublée
(`tests/integration/double-api-adresses.ts`, adresse vérifiée depuis plus d'une minute), un **espion**
à la place de la liaison d'envoi qui refuse un nombre de fois donné puis accepte. Oracle de l'envoi
resté refusé : trois appels à l'espion, le code de la demande annulé (le recopier ne remplace pas
l'adresse), le compte de `messages_remplacement` inchangé, l'absence de « Un code vient de partir »
dans la réponse. Cas limites : refusé une fois puis accepté ; deux fois puis accepté ; trois fois ;
quatre messages déjà partis dans l'heure puis un envoi refusé (le plafond compte toujours quatre, une
nouvelle demande dans l'heure est acceptée). Les tests du 017 (notamment « Deux demandes simultanées
ne franchissent pas le plafond ») restent verts.

**Hors périmètre** : la minute d'attente après le clic (ticket 01, déjà en place), le refus du
plafond à l'étape du code (ticket 03), la garantie d'arrivée dans la boîte (indésirables, filtres) —
le produit ne connaît que l'acceptation de l'envoi.

## Critères

- [ ] Quand l'envoi du code est refusé à la première tentative puis accepté à une tentative suivante de la même demande : un seul message part, avec le code écrit pour cette demande, et l'écran invite à recopier le code reçu dans la nouvelle boîte   (SC-02a)
- [ ] Quand l'envoi du code reste refusé après les tentatives de la demande : l'écran ne dit pas qu'un code est parti, il dit que le code n'a pas pu partir et invite à le redemander un peu plus tard ; le code écrit pour cette demande ne permet pas de remplacer l'adresse ; l'écran redit l'adresse en place   (SC-02b)
- [ ] Quand quatre messages sont déjà partis dans l'heure, qu'un code est demandé et que son envoi reste refusé : le plafond compte toujours quatre messages, et une nouvelle demande de code dans la même heure est acceptée   (SC-02c)
