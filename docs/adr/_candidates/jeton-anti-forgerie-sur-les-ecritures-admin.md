# Candidat ADR : Le jeton anti-forgerie sur les écritures de l'administration
Statut : Candidat | Date : 2026-09-04 | Provenance : `specs/003-remplir-emplacements/SPEC.md` (feature 003)

> Brouillon déposé par `/scd-sdd:spec` — décision **non tranchée**. À promouvoir (ou écarter) par
> `/scd-sdd:adr`, qui lui attribuera un `NNNN`.

## Contexte

Le SPEC de 001 (connexion par code) déclarait le jeton anti-forgerie « à naître avec la première
écriture depuis une session ouverte », cette feature n'en introduisant aucune. La feature 003 introduit
cette **première écriture** : enregistrer une correction d'emplacement dans le brouillon d'une page.

Le cookie de session vit sur l'**origine commune** au public et à l'administration (SEC-1) : toute
écriture authentifiée doit être protégée d'une falsification cross-site. La décision est **transverse** —
toute écriture admin ultérieure (médias, réglages, formulaires, publication, suivi des demandes) l'héritera —
et sécuritaire : elle ne se tranche pas au fil d'un ticket. Le choix (jeton dédié vs. attribut `SameSite`
du cookie de session posé en 001, portée, durée, porteur) est à arrêter en ADR.

## Décision

_À trancher._

## Conséquences

_À compléter à la promotion._

## Alternatives considérées

_À compléter à la promotion._
