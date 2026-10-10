-- Migration 0008 — brouillons des formulaires de devis (ticket 05,
-- openspec/changes/010-reglage-des-formulaires/, ADR-0018).
--
-- Additive : ne touche aucune table existante. Une ligne par formulaire,
-- remplacée entière ; « porte un brouillon » se dérive de la présence de la
-- ligne. `contenu` est un JSON { champs, derniersNumeros } (prix en centimes).
create table brouillons_formulaires (
  formulaire text primary key,
  contenu text not null,
  maj_le integer not null
);
