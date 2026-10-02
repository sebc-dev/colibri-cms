# 02 — Un envoi de code qui échoue laisse une trace pour l'exploitation

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/pages/admin/connexion.astro`, `wrangler.astro.jsonc`, `wrangler.jsonc`, `tests/integration/trace-envoi-echoue.test.ts`

## Ce que ça livre

Aujourd'hui, quand la plateforme refuse d'expédier le message portant le code de connexion,
l'échec est absorbé sans laisser la moindre trace : l'éditrice ne reçoit rien et personne ne peut
savoir pourquoi. Désormais, un envoi qui échoue écrit **une ligne d'erreur dans les journaux de la
plateforme**, lisibles seulement depuis le compte Cloudflare de la cliente, par qui exploite le
site. Cette ligne ne porte **jamais le code**. Un envoi qui aboutit n'écrit rien.

Pour l'éditrice, rien ne change : l'écran de connexion rend exactement la même réponse — même corps,
mêmes champs d'en-tête, même moment — que l'adresse soumise soit reconnue ou non, que l'envoi
aboutisse ou non.

**Décisions à respecter :**
- La trace est écrite par `console.error` dans le `.catch` de l'envoi différé de la route de
  connexion (aujourd'hui `.catch(() => {})`), donc **après** la réponse, dans la même promesse remise
  à `waitUntil` : ni le corps, ni les en-têtes, ni le moment de la réponse ne peuvent en dépendre.
  L'ordre « délai plancher, puis réponse, puis expédition » ne bouge pas.
- La ligne porte une **étiquette fixe** et le **motif** rendu par la plateforme — ni le code, ni le
  message composé, ni l'adresse soumise.
- Pour que la trace survive à l'instant où elle est écrite, la configuration de déploiement active
  les journaux de la plateforme (`observability`). C'est un réglage de plateforme, pas une valeur
  d'instance : il a sa place dans `wrangler.astro.jsonc` (candidat `invariant-i10-restreint-a-la-configuration-astro`) ; `wrangler.jsonc` reste aligné.
  Aucun identifiant de compte ni domaine n'y entre (SC-012/SC-013).
- Les tests existants d'indiscernabilité des deux branches (corps, en-têtes, délai plancher,
  expédition après le rendu, instance non semée, temps de réponse) restent verts tels quels.

**Oracle de test :** la plateforme locale refuse un destinataire autre que la
`destination_address` de la liaison (`editrice@example.com`). Semer une adresse autorisée
**différente** fait donc échouer l'envoi réel, sans double ; semer l'adresse égale à la
`destination_address` le fait aboutir. La trace se lit dans la sortie console capturée du worker,
une fois la promesse différée terminée ; le code, connu du test par la base de test, ne doit pas y
figurer.

**Hors périmètre :** signaler l'échec à l'éditrice sur l'écran (ce serait distinguer les deux
branches) ; relancer un envoi échoué ; mesurer un taux d'échec ; l'expéditeur du message (ticket 01).

## Critères
- [x] Quand l'expédition demandée échoue, une trace de l'échec est écrite dans les journaux de la plateforme, et cette trace ne porte pas le code   (SC-02a)
- [x] Quand l'expédition demandée aboutit, aucune trace d'échec n'est écrite   (SC-02b)
