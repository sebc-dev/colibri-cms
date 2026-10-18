# 02 — Le visiteur est confirmé dès que sa demande est gardée ou que son e-mail est parti

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/pages/api/public/demandes.ts`, `tests/integration/confirmation-gardee-ou-acheminee.test.ts`

## Ce que ça livre

La règle de confirmation du visiteur change (FR-066). Le visiteur lit que sa demande a été envoyée dès
qu'elle est **gardée** dans la liste des demandes **ou** que son e-mail est **remis** à la plateforme
d'acheminement : l'un des deux suffit. L'échec ne lui est annoncé que si aucun des deux n'a abouti, avec
le message existant qui l'invite à réessayer, sa saisie gardée.

| La demande est gardée | Son e-mail | Le visiteur lit |
|---|---|---|
| oui | parti | que sa demande a été envoyée |
| oui | refusé, ou aucune adresse autorisée | que sa demande a été envoyée ; la demande porte la mention que son e-mail n'a pas pu partir (ticket 01) |
| non, la base refuse | parti | que sa demande a été envoyée ; rien de la demande n'est conservé |
| non, la base refuse | refusé, ou aucune adresse autorisée | que sa demande n'a pas pu être envoyée, et qu'il peut réessayer |

Ce que lit le visiteur découle de la réponse du serveur. Le module du formulaire, inchangé, présente
`200 { "statut": "envoyee" }` comme la confirmation et `503 { "statut": "acheminement" }` comme un échec à
réessayer, saisie et sélections gardées : les parcours du change 012 le prouvent déjà. Les critères se
prouvent donc sur la réponse de la route, l'état de la base, les journaux et l'espion de la liaison
d'expédition.

**Préalable.** La PR de retouche des tests, fusionnée **avant** le ticket 01, a retiré de
`tests/integration/acheminement-en-echec.test.ts` les trois cas qui attendaient un échec quand la demande
est gardée : le premier SC-11c (503 sur un e-mail refusé), SC-11e (premier envoi en 503) et SC-11f (503 sans
adresse autorisée). Leurs formes nouvelles sont les critères de ce ticket. Le second SC-11c — la trace ne
porte que le motif de la plateforme — reste, et doit rester vert. Ce ticket ne modifie **aucun** test
existant.

**Décisions à respecter (D3 de l'approche ; ADR-0028, I6) :**
- **L'ordre de la route**, après la vérification inchangée :
  1. **garder** ; une erreur de la base est attrapée et consignée `[demande] garde refusée (<motif>)` — le
     seul motif rendu par la base, sans aucune donnée du visiteur, aucun identifiant de demande ni aucune
     adresse — puis la route continue ;
  2. **lire l'adresse autorisée** ; absente ou illisible → aucun e-mail, la route continue ;
  3. **acheminer** ; un refus de la plateforme est consigné comme aujourd'hui,
     `[demande] acheminement refusé (<motif>)` ;
  4. **marquer** `parti` quand la demande est gardée et son e-mail parti (posé par le ticket 01) ;
  5. **répondre** : gardée ou partie → 200 `{ "statut": "envoyee" }` ; ni l'une ni l'autre → 503
     `{ "statut": "acheminement" }`.
- **Le comptage du seuil reste en tête** (ADR-0028) : une sollicitation refusée par le seuil, ou dont le
  comptage est en panne, ne garde rien et n'envoie rien, comme aujourd'hui.
- **La réponse ne porte jamais une valeur saisie**, ni un identifiant de demande.
- **Le module du visiteur** (`src/render/formulaire/module.ts`) ne change pas.
- **La complexité.** `npm run analyse` bloque au-delà de son seuil de complexité. Si la route le dépasse,
  ses étapes s'extraient en fonctions nommées dans le même fichier.
- **Doubles.** Une panne de la base par un déclencheur `raise(abort)` posé sur l'insertion dans
  `demandes`, puis retiré, sur le patron de `tests/integration/panne-du-compteur.test.ts` ; l'espion du
  change 012 sur `env.EXPEDITEUR_CODE_CONNEXION.send` ; l'adresse autorisée absente en vidant
  `adresses_autorisees`. Aucune base simulée.

**Hors périmètre :**
- la détection d'un e-mail accepté par la plateforme mais jamais remis (le reste de DAT-2) ;
- tout changement du message présenté au visiteur, ou du module du formulaire ;
- tout écran d'administration.

## Critères
- [ ] Quand le visiteur envoie une demande complète, qu'elle est gardée dans la liste des demandes, et que la plateforme d'acheminement refuse l'e-mail, le formulaire laisse place au message qui confirme que sa demande a été envoyée   (SC-02a)
- [ ] Quand le visiteur envoie une demande complète, que la base refuse de la garder, et que son e-mail est remis à la plateforme d'acheminement, le formulaire laisse place au message qui confirme que sa demande a été envoyée   (SC-02b)
- [ ] Quand le visiteur envoie une demande complète, que la base refuse de la garder, et que la plateforme d'acheminement refuse l'e-mail, le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer, et toutes ses saisies et sélections sont toujours là   (SC-02c)
- [ ] Quand, après un échec d'envoi, le visiteur renvoie sa demande et qu'elle est gardée et acheminée, la demande est confirmée, une seule demande paraît dans la liste des demandes, et un seul e-mail parvient pour ce nouvel envoi   (SC-02d)
- [ ] Quand aucune adresse autorisée n'est enregistrée et qu'un visiteur envoie une demande complète, aucun e-mail ne part, la demande est gardée dans la liste des demandes, et le formulaire confirme qu'elle a été envoyée   (SC-02e)
- [ ] Quand aucune adresse autorisée n'est enregistrée, qu'un visiteur envoie une demande complète, et que la base refuse de la garder, aucun e-mail ne part, et le formulaire dit que la demande n'a pas pu être envoyée, la saisie gardée   (SC-02f)
- [ ] Quand une demande a été acheminée alors que la base avait refusé de la garder, la base ne porte aucune des valeurs saisies par le visiteur, et les journaux non plus   (SC-02g)
