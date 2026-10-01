# Run bloqué — ticket 01, expéditeur de l'instance

Portée : 007-expediteur-code-connexion · ticket 01
Ouvert le 2026-10-01 · branche `impl/expediteur-de-l-instance-01` · HEAD `d05866f`

## Objectif
Mener le ticket 01 jusqu'à sa PR : le code de connexion part depuis l'adresse d'expéditeur
déclarée par l'instance (`senderAddress`), et le build échoue si elle manque ou est mal formée.

## Contexte à charger
à lire      `openspec/changes/007-expediteur-code-connexion/tickets/01-expediteur-de-l-instance.md` — le contrat (57 l.)
à lire      `openspec/changes/007-expediteur-code-connexion/proposal.md` + `design.md` — le change (161 l.)

## Acquis
- Le run `wf_5ecc225f-dd8` s'est arrêté en `blocked-quality`, après la ceinture tdd et avant la
  review : le code et les trois fichiers de test sont restés **non commités** sur la branche.
- Sortie du check bloquant `analyse`, non tronquée :
  `tests/unit/message-code.test.ts 18:50 error Remove this use of the "void" operator sonarjs/void-use`
- L'agent `quality-analyse` a jugé le défaut cosmétique, dans un test neuf écrit par le
  test-writer. Ligne 18 : `const liaison = { send: (m: MessageEmail) => void recus.push(m) };`. Il
  a proposé un corps à accolades, `send: (m: MessageEmail) => { recus.push(m); }`, qui garde le
  sens. Il l'a déclaré non applicable par la gate, parce qu'aucun agent du cycle n'a le droit
  d'éditer un test.

## Prochaine étape
J'allais faire trancher l'humain : soit il corrige à la main la ligne 18 (édition de forme, pas
d'assertion touchée), soit il déroge en review. Ensuite, j'allais relancer
`/scd-spec-dev:run 007-expediteur-code-connexion 01`, ou bien finir à la main la suite du run
(review, PR).

## Écarté
- Laisser un agent du run corriger le test : le contrat l'interdit, la ceinture tdd le
  détecterait comme une modification de test.
