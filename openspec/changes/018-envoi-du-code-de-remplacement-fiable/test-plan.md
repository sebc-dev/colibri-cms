## Niveaux

- **Intégration dans workerd** (ADR-0014), le niveau principal : la route `POST /admin/adresse-e-mail`,
  D1 réelle, l'API des adresses doublée, l'envoi observé par un espion qui peut refuser.
- **Unité** pour la constante du délai et la comparaison « vérifiée depuis moins d'une minute ».
- **Recette** sur `colibri.sebc.dev` : le seul lieu où la liaison d'envoi refuse pour de vrai une
  adresse fraîchement vérifiée (CT-47.2 rejoué, plus un cas neuf).

## Oracle

- L'attente : aucun code en base, aucune ligne de plus dans `messages_remplacement`, aucun appel à
  l'espion d'envoi, et le texte d'attente dans la réponse.
- L'envoi accepté : un appel réussi à l'espion, un code vivant en base, le texte « Un code vient de
  partir vers … » dans la réponse.
- L'envoi resté refusé : trois appels à l'espion, le code de la demande annulé, le compte de
  `messages_remplacement` inchangé, l'absence du texte « Un code vient de partir » dans la réponse.
- Le plafond avec un code en circulation : le champ `code` présent dans la réponse, et ce code
  toujours accepté ensuite.

## Cas limites

- Instant de vérification : 59 s, 60 s, 61 s avant l'heure injectée ; dans le futur (horloges
  décalées) ; champ `verified` non daté.
- Envoi : refusé une fois puis accepté ; refusé deux fois puis accepté ; refusé trois fois.
- Plafond : quatre messages partis puis un envoi refusé (reste quatre) ; cinq partis avec un code bon
  en circulation ; cinq partis sans code en circulation.
- Nouveau code demandé pendant la minute d'attente : rien n'est annulé, le code précédent reste bon.
- Adresse de quarante signes et plus dans le rendu des quatre états de l'écran.

## Doubles

- Le double de `globalThis.fetch` du change 017, limité à `api.cloudflare.com`, qui rend désormais un
  `verified` daté que le test choisit.
- Un espion à la place de la liaison d'envoi, qui refuse un nombre de fois donné puis accepte.
- Le temps : l'instant injecté, et l'attente entre deux tentatives rendue injectable pour que le test
  ne dorme pas.
- D1 n'est pas doublée.

## Zones sans test automatisé

- Le refus réel de la liaison d'envoi après une vérification fraîche, et sa durée : **recette**.
- La lisibilité d'une adresse longue à 360 px : **recette** via `playwright-cli` (capture), aucun
  navigateur dans `workerd`.
