-- Migration 0006 — le nom d'affichage et la description d'une image en
-- brouillon (ticket 07,
-- openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md,
-- SC-07a/SC-07b, candidat medias-deux-magasins-un-par-etat).
--
-- Additive : étend `medias_brouillon` (0005) sans toucher à aucune autre
-- table. Les deux colonnes sont NULLABLES — une image déjà persistée par le
-- ticket 04 n'a ni nom d'affichage ni description tant que l'éditrice ne les
-- a pas saisis ; `src/platform/medias/magasin.ts` retombe alors sur le nom
-- d'ORIGINE pour l'affichage (celui-ci, `nom_origine`, n'est ici jamais
-- modifié — SC-07a). Aucune valeur par défaut non nulle : une chaîne vide
-- par défaut confondrait « jamais renseigné » avec « vidé par l'éditrice »,
-- une distinction que ce magasin n'a pas à trancher (le NULL suffit, relu
-- comme absence côté `platform/`).
alter table medias_brouillon add column nom_affichage text;
alter table medias_brouillon add column description text;
