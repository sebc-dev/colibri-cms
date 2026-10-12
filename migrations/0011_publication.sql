-- Migration 0011 — l'état de la publication (change 011-apercu-et-publication,
-- ticket 15, ADR-0023).
--
-- Additive : ne touche aucune table existante. Une ligne unique (`id` = 1) :
--   - `jeton`, `bail_jusqu_a` : le verrou. Libre quand `bail_jusqu_a` est nul
--     ou dépassé ; deux publications ne se chevauchent jamais ;
--   - `instantane` : ce que le récapitulatif confirmé a présenté (JSON) ;
--   - `marque_en_cours` : la marque de la publication qui dépose ;
--   - `derniere_marque`, `depose_le` : la dernière marque déposée et son instant.
create table publication (
  id integer primary key check (id = 1),
  jeton text,
  bail_jusqu_a integer,
  instantane text,
  marque_en_cours text,
  derniere_marque text,
  depose_le integer
);

insert into publication (id) values (1);
