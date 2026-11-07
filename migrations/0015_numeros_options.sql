-- Migration 0015 — numéros d'options retenus (change 015, ticket 04, ADR-0018, ADR-0026).
--
-- Additive : ne touche aucune table existante. Quand le retour d'un formulaire
-- supprime son brouillon, le plus grand numéro attribué à chaque champ est
-- retenu ici : un numéro attribué ne revient jamais.
-- `if not exists` : la même définition est rejouée par le code (`src/platform/formulaires/magasin.ts`).
create table if not exists numeros_options (
  formulaire text not null,
  champ text not null,
  dernier integer not null,
  primary key (formulaire, champ)
);
