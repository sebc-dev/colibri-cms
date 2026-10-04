-- Migration 0007 — brouillons des réglages transverses (ticket 05,
-- openspec/changes/008-reglages-transverses/tickets/
-- 05-enregistrer-les-coordonnees.md, ADR-0017).
--
-- Additive : ne touche aucune table existante. Une ligne par réglage ;
-- « porte un brouillon » se dérive de la présence de la ligne. `contenu` est
-- un JSON dont la forme dépend du réglage.
create table brouillons_reglages (
  reglage text primary key check (reglage in ('coordonnees', 'reseaux', 'mention')),
  contenu text not null,
  maj_le integer not null
);
