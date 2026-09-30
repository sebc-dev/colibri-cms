# 0001 — Format des ADR

- Statut : accepté
- Date : 2026-09-29

## Contexte
Les décisions structurantes doivent être tracées, immuables, relisibles dans six mois.

## Décision
Chaque décision structurante est un ADR au format Nygard dans `docs/adr/NNNN-titre.md` :
**Contexte · Décision · Conséquences · Alternatives écartées**. Un ADR accepté est **immuable** ;
on le remplace par un nouvel ADR qui le supersède, on ne le réécrit pas.

## Conséquences
`design.md` d'un change est **jetable** et cite les ADR contraignants ; il ne les remplace jamais.

## Alternatives écartées
- Consigner les décisions dans les design.md : perdues à l'archivage du change.
