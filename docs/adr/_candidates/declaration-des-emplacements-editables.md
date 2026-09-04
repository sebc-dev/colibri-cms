# Candidat ADR : La déclaration des pages et de leurs emplacements éditables — lieu et contrat
Statut : Candidat | Date : 2026-09-04 | Provenance : `specs/003-remplir-emplacements/SPEC.md` (feature 003)

> Brouillon déposé par `/scd-sdd:spec` — décision **non tranchée**. À promouvoir (ou écarter) par
> `/scd-sdd:adr`, qui lui attribuera un `NNNN`.

## Contexte

FR-015 fait lister les pages du site, FR-017 fait éditer chaque emplacement d'une page, et
FR-024/025 interdisent à l'éditrice de créer une page ou de modifier la structure d'une page —
nombre, nature ou ordre de ses emplacements. Il existe donc une **source de vérité de la structure**
— quelles pages, quels emplacements, de quelle nature, dans quel ordre — que le produit **lit** mais
n'**écrit** jamais depuis l'administration, et que l'intégrateur pose hors administration.

Le format *déposé à la publication* est déjà fixé (candidat `format-du-contenu-un-repertoire-par-objet` :
`page.json` pour la structure, un `.md` par emplacement de texte riche). Reste ouvert : **où vit cette
déclaration côté source** (gabarits `src/site/`, un manifeste versionné, autre), **comment un emplacement
y est identifié et typé**, et **comment le brouillon D1 et le contenu déposé s'y lient par identité stable**
— ce qui conditionne aussi la reconstructibilité (ARCH-1) et la fidélité de l'aperçu (ARCH-3 / ADR-0023).

## Décision

_À trancher._

## Conséquences

_À compléter à la promotion._

## Alternatives considérées

_À compléter à la promotion._
