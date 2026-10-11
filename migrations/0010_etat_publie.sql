-- Migration 0010 — l'état publié des emplacements, des réglages et des
-- formulaires (change 011-apercu-et-publication, ticket 01, ADR-0019).
--
-- Additive : ne touche aucune table existante. `contenu` a la forme du
-- brouillon correspondant (contenu corrigé d'un emplacement, JSON du réglage,
-- { champs, derniersNumeros } d'un formulaire). Aucune ligne de verrou ici.
create table publies_emplacements (
  page_slug text not null,
  id_emplacement text not null,
  nature text not null,
  contenu text not null,
  publie_le integer not null,
  primary key (page_slug, id_emplacement)
);

create table publies_reglages (
  reglage text primary key check (reglage in ('coordonnees', 'reseaux', 'mention')),
  contenu text not null,
  publie_le integer not null
);

create table publies_formulaires (
  formulaire text primary key,
  contenu text not null,
  publie_le integer not null
);
