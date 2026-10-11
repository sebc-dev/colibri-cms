-- Migration 0009 — la table des images porte aussi les images publiées
-- (change 011-apercu-et-publication, design D4 ; ADR-0020).
--
-- `medias_brouillon` (0005, 0006) devient `medias` : la même table tiendra
-- les images en brouillon et les images publiées, celles que l'éditrice
-- publie comme celles que l'intégrateur pose au départ. Le renommage garde
-- chaque ligne telle quelle (identité, noms, description, octets).
--
-- Trois colonnes NULLABLES de l'état publié s'y ajoutent, sans valeur par
-- défaut : une image jamais publiée n'en porte aucune.
--   - `publiee_le` : l'instant de sa dernière publication ;
--   - `description_publiee` : la description qu'elle portait alors, pour
--     annoncer au récapitulatif celles dont la description va changer ;
--   - `empreinte_depot` : l'identifiant git du blob déposé sur la branche
--     des images, pour qu'une publication reprise ne la redépose pas.
-- Aucune autre table n'est touchée.
alter table medias_brouillon rename to medias;
alter table medias add column publiee_le integer;
alter table medias add column description_publiee text;
alter table medias add column empreinte_depot text;
