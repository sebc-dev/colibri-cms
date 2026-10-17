# 11 — L'envoi en cours se voit, et un échec garde la saisie

**Bloqué par :** 07
**Vérif :** tdd
**Fichiers :** `src/pages/api/public/demandes.ts`, `src/render/formulaire/module.ts`, `tests/integration/acheminement-en-echec.test.ts`, `tests/parcours/formulaire-echec.parcours.ts`

## Ce que ça livre

**Pendant l'envoi**, le bouton devient « Envoi en cours… » et reste inactif. Actionner deux fois de suite
le bouton ne produit qu'une demande, et un seul e-mail parvient à l'adresse autorisée.

**Quand le serveur refuse la demande** — un champ désigné (ticket 08) ou un formulaire changé (ticket 09) —,
le bouton quitte aussi « Envoi en cours… » et redevient actif, la saisie gardée : le visiteur corrige le
champ ou recharge la page, puis renvoie.

**Quand l'envoi n'aboutit pas**, le visiteur en est informé (FR-060), sans perdre aucune de ses saisies
ni de ses sélections, et peut réessayer. Trois cas d'échec sont couverts :
- la plateforme d'acheminement refuse l'e-mail ;
- son appareil n'atteint pas le site ;
- aucune adresse autorisée n'est enregistrée.

Dans chacun, il lit « Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans
quelques instants. ». Le message paraît au-dessus du bouton, et le bouton redevient actif. S'il renvoie
et que l'acheminement aboutit, la demande est confirmée, et un seul e-mail parvient pour ce nouvel envoi.

Aucun échec n'est jamais présenté comme une demande envoyée.

**Décisions à respecter (D6 de l'approche) :**
- **Le refus de la plateforme.** Quand l'expédition lève une erreur, la route rend
  `503 { "statut": "acheminement" }`. La trace dans les journaux ne porte que le motif rendu par la
  plateforme, **aucune** donnée du visiteur.
- **L'adresse autorisée absente.** Elle rend aussi `503 { "statut": "acheminement" }`, sans rien
  expédier.
- **Le module.** Il passe à l'état « envoi en cours » dès le premier geste, et ignore tout geste suivant
  jusqu'à la réponse. Sur **toute** réponse autre qu'une confirmation (`400`, `409`, `429`, `503`…) ou
  une erreur réseau, il quitte l'état « envoi en cours » : le bouton reprend « Envoyer ma demande » et
  redevient actif, aucun champ n'est touché. Sur un `503` ou une erreur réseau, il affiche en plus le
  message d'échec. Le texte est déjà posé dans `src/render/formulaire/textes.ts`
  (ticket 03), et le module l'écrit en texte seul (`textContent`). Le message est annoncé aux lecteurs
  d'écran.
- **Les tests :**
  - un espion sur `env.EXPEDITEUR_CODE_CONNEXION.send` lève une erreur pour simuler le refus ;
  - au navigateur, le site injoignable se provoque en interrompant la requête (interception du
    parcours) ;
  - le double envoi se compte en requêtes parties vers le point d'envoi ;
  - les refus `400` et `409` se fabriquent par interception du parcours ;
    `tests/parcours/formulaire-change.parcours.ts` (ticket 09) exige déjà le bouton actif après un
    `409`, et doit rester vert.

**Hors périmètre :** le message du seuil atteint (ticket 12) et celui du formulaire changé (ticket 09) —
la réactivation du bouton après ces refus, elle, est livrée ici ;
l'enregistrement de la demande avant l'e-mail (story « Réception et suivi des demandes »). Jusqu'à cette
story, une demande dont l'e-mail échoue est perdue, et le visiteur en est averti.

## Critères
- [x] Quand le visiteur actionne deux fois de suite le bouton d'envoi, une seule demande part, et un seul e-mail parvient à l'adresse autorisée   (SC-11a)
- [x] Quand le visiteur a envoyé sa demande et que la réponse n'est pas encore revenue, le formulaire dit que l'envoi est en cours, et le bouton d'envoi est inactif   (SC-11b)
- [x] Quand le visiteur envoie une demande complète et que la plateforme d'acheminement refuse l'e-mail, le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer, et toutes ses saisies et sélections sont toujours là   (SC-11c)
- [x] Quand le visiteur envoie sa demande alors que son appareil n'atteint pas le site, le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer, sans rien effacer   (SC-11d)
- [x] Quand, après un échec d'envoi, le visiteur renvoie sa demande et que l'acheminement aboutit, la demande est confirmée, et un seul e-mail parvient pour ce nouvel envoi   (SC-11e)
- [x] Quand aucune adresse autorisée n'est enregistrée et qu'un visiteur envoie une demande complète, aucun e-mail ne part, et le formulaire dit que la demande n'a pas pu être envoyée, la saisie gardée   (SC-11f)
- [x] Quand le visiteur a envoyé sa demande et que le serveur la refuse, en désignant un champ ou parce que le formulaire a changé, le formulaire n'est plus en cours d'envoi, le bouton d'envoi est de nouveau actif, et toute la saisie est gardée   (SC-11g)
