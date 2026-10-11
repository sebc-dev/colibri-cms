# Les liens du menu font sortir de l'aperçu

Portée : 011-apercu-et-publication
Ouvert le 2026-10-11 · branche `main` · HEAD `70a5ea8`
Bloqué par : arbitrage humain, avant le lancement du ticket 09

## Objectif
Décider si, dans un aperçu, les liens vers les autres pages du site doivent mener à leur aperçu
plutôt qu'à leur page publique, avant que l'aperçu ne montre les brouillons (ticket 09).

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/09-l-apercu-montre-les-brouillons.md` — le ticket où le défaut deviendra visible (39 l.)
à extraire  `openspec/changes/011-apercu-et-publication/specs/apercu/spec.md` › `### Requirement: Même rendu que la page publique` — l'exigence d'une navigation identique
à extraire  `src/site/page.astro` › `href={entree.adresse}` — où le gabarit pose les liens du menu
à situer    PR #215 — le ticket 08 fusionné, qui a livré l'aperçu

## Acquis
- Le 2026-10-11, j'ai essayé l'aperçu dans un navigateur sur la recette (`colibri.sebc.dev`, `main`
  à `70a5ea8`). Les liens du menu (Accueil, Tarifs, Contact) menaient aux adresses publiques `/`,
  `/tarifs` et `/contact`. Le bouton « Demander un devis » de l'accueil menait à `/contact`. Un clic
  sur l'un d'eux faisait quitter l'aperçu pour le site public.
- C'était conforme au critère SC-08b : la navigation de l'aperçu devait être identique à celle de
  la page publique, élément par élément.
- Le ticket 08 n'affichait que l'état publié, donc l'éditrice ne perdait rien en sortant. Avec le
  ticket 09, l'aperçu montrera les brouillons : en cliquant sur le menu, elle tomberait sur la
  version en ligne et pourrait croire ses modifications perdues.

## Prochaine étape
J'allais soumettre deux voies à l'humain avant `/scd-spec-dev:run 011-apercu-et-publication 09` :
- réécrire, dans l'aperçu seulement, les liens internes vers `/admin/apercu<adresse>`. Il faudrait
  amender le critère SC-08b et le delta `apercu` (`/opsx:update`), puis décider du sort des
  destinations internes des boutons d'action ;
- ou garder la sortie, et dire dans le bandeau que les liens mènent au site en ligne.

## Écarté
- Corriger dans le ticket 08 : la navigation identique était son critère, et il est fusionné.
