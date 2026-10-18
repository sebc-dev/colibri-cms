# Run bloqué — 02, le visiteur est confirmé dès que sa demande est gardée ou partie

Portée : 013-reception-et-suivi-des-demandes · ticket 02
Ouvert le 2026-10-18 · branche `impl/le-visiteur-est-confirme-des-que-sa-demande-est-gardee-ou-partie-02` · HEAD `ea1c700`

## Objectif
Faire aboutir le ticket 02 jusqu'à la PR, une fois tranchée la contradiction entre ses critères et
deux tests du ticket 01.

## Contexte à charger
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/tickets/02-le-visiteur-est-confirme-des-que-sa-demande-est-gardee-ou-partie.md` — le ticket à honorer
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/` — le change (proposal, delta, design)

## Acquis
- Le run `wf_2a2ee8b8-712` s'est arrêté en `blocked-arbitrage`, mode `tdd`, au triage d'avant
  écriture : aucun code ni test n'a été écrit. Cinq critères passaient (SC-02b, c, d, f, g).
- Les deux escalades, telles que rendues par le triage :

```
SC-02a — Le test existant SC-01b (tests/integration/garde-d-une-demande.test.ts:213, ticket 01) attend
503 quand la demande est gardée et l'e-mail refusé. SC-02a exige 200 « envoyee », et le ticket interdit
de modifier un test existant : porte d'étape 0 (tests fournis contradictoires).
SC-02e — Le test existant SC-01c (tests/integration/garde-d-une-demande.test.ts:237, ticket 01) attend
503 sans adresse autorisée alors que la demande est gardée. SC-02e exige 200 « envoyee », et le ticket
interdit de modifier un test existant : même porte d'étape 0 que SC-02a, une seule réponse humaine
suffit pour les deux.
```

- J'ai vérifié les deux lignes : `expect(reponse.status).toBe(503)`. Les autres `toBe(503)` de
  `tests/` portent sur le seuil et la panne du compteur, que la nouvelle règle ne change pas.
- Cause : le ticket 01 a figé dans ses tests le statut provisoire qu'il annonçait (« Ce que voit le
  visiteur ne change pas dans ce ticket »). Le préalable du ticket 02 date d'avant ces tests et ne
  cite que la retouche `d73a642` (PR #274).
- Trois voies proposées par le triage : retouche préalable des deux lignes dans une PR séparée (ma
  recommandation, même geste que #274), dérogation déclarée dans le ticket 02, ou révision du change.

## Prochaine étape
Faire trancher l'arbitrage. Sur la voie recommandée : PR depuis `origin/main` qui retire les deux
`toBe(503)` et garde le reste de SC-01b et SC-01c, fusion par l'utilisateur, puis relancer
`/scd-spec-dev:run 013-reception-et-suivi-des-demandes 02` depuis cette branche.

## Écarté
- Reprendre le run par `resumeFromRunId` : un `blocked-arbitrage` ne se reprend pas, il se relance.
