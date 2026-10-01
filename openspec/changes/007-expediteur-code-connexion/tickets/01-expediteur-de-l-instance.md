# 01 — Le code part depuis l'adresse d'expéditeur de l'instance

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `instance.json`, `astro.config.ts`, `src/platform/instance/expediteur.ts` (validation appelée par la configuration Astro — nom pressenti), `src/env.d.ts` (déclaration de la constante de build), `src/platform/email/index.ts`, `src/pages/admin/connexion.astro`, `tests/unit/expediteur-instance.test.ts`, `tests/unit/message-code.test.ts`, `tests/integration/code-vers-adresse-autorisee.test.ts`

## Ce que ça livre

Le message qui porte le code de connexion ne part plus jamais depuis l'adresse autorisée elle-même
— la plateforme refuse d'expédier depuis un domaine où son acheminement d'e-mail n'est pas activé,
si bien qu'aujourd'hui aucun message n'arrive hors du poste de développement. Il part désormais
depuis l'**adresse d'expéditeur de l'instance**, une valeur que chaque dépôt de cliente déclare dans
son fichier d'instance (typiquement sur un sous-domaine dédié, `code@envoi.<domaine>`, pour que
l'activation de l'acheminement d'e-mail ne remplace pas la messagerie existante de la cliente). Le
destinataire, l'objet fixe et le texte seul ne changent pas.

Une instance qui ne déclare pas cette adresse, ou en déclare une qui n'a pas la forme d'une adresse
e-mail, **ne se bâtit plus** : la construction s'arrête avec un message qui nomme le champ
(`senderAddress`). C'est voulu — un échec au build vaut mieux qu'une porte de connexion muette.

**Décisions à respecter :**
- Le champ s'appelle `senderAddress`, dans `instance.json`, à côté de `domain` et
  `turnstilePublicKey` (`I8`, ADR-0005 : le quatrième lieu, « tout le reste »). Le fichier
  d'instance du dépôt (celui des tests) reçoit une adresse d'exemple sur un sous-domaine du domaine
  d'exemple, p. ex. `code@envoi.exemple.colibri.test`.
- `astro.config.ts` reste le **seul** lecteur d'`instance.json` (`I10`). Il lit `senderAddress` avec
  `domain`, le valide par une fonction pure (testable en unité, sans build) qui refuse l'absence et
  une forme invalide en levant une erreur nommant `senderAddress`, puis l'injecte comme constante de
  build (`vite.define`). La zone `platform` n'importe jamais `instance.json`.
- La route de connexion lit cette constante et la transmet au module d'e-mail, comme elle lui
  transmet déjà la liaison `EXPEDITEUR_CODE_CONNEXION`. Le module d'e-mail reste pur : il reçoit
  l'expéditeur en paramètre et le pose en `from` ; il ne connaît toujours pas le domaine.
- `wrangler.jsonc` et `wrangler.astro.jsonc` ne reçoivent **aucune** valeur d'instance (ADR-0032) :
  ni `allowed_sender_addresses`, ni domaine. La `destination_address` neutre ne change pas.
- Aucun identifiant ni domaine d'Isometria (SC-012/SC-013) : l'adresse est sur le domaine de la
  cliente.
- Mettre à jour le commentaire d'en-tête de `src/platform/email/index.ts`, qui justifie aujourd'hui
  `from: destinataire` — ce raisonnement devient faux.
- Les tests existants de la connexion (code vers l'adresse autorisée, branches indiscernables,
  plafond, ouverture de session, refus de code) restent verts : le comportement déjà livré ne
  change pas, seul l'expéditeur du message change. Ajouter des cas à un test existant est permis ;
  en retirer ou en affaiblir ne l'est pas.

**Limite connue :** la plateforme locale (Miniflare) accepte n'importe quel expéditeur. Les tests
fixent donc l'expéditeur **composé** (valeur remise à la liaison) ; l'arrivée réelle du message se
prouve ailleurs (ticket 03, serveur de recette).

**Cas limites de la validation :** absent · chaîne vide · sans `@` · avec espaces · domaine sans
point → refusés ; adresse valide sur sous-domaine (`code@envoi.exemple.fr`) → acceptée.

**Hors périmètre :** la trace d'un envoi échoué (ticket 02) ; signaler l'échec à l'éditrice sur
l'écran (anti-énumération) ; l'envoi des demandes de devis ; automatiser l'activation de
l'acheminement d'e-mail.

## Critères
- [ ] Un message portant un code part vers l'adresse autorisée avec, pour expéditeur, l'adresse d'expéditeur déclarée par l'instance — et jamais l'adresse autorisée   (SC-01a)
- [ ] Quand le fichier d'instance ne déclare pas d'adresse d'expéditeur, ou en déclare une qui n'est pas une adresse e-mail, la construction du site échoue en nommant le champ manquant ou invalide   (SC-01b)
