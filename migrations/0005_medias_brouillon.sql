-- Migration 0005 — la réserve des médias en brouillon (ticket 04,
-- openspec/changes/004-bibliotheque-de-medias/tickets/04-reserve-persister-servir.md,
-- SC-04a, candidat medias-deux-magasins-un-par-etat).
--
-- Additive : ne touche ni `brouillons_emplacements` (0004) ni les tables
-- d'authentification (0002/0003) ni l'état publié — qui n'a ici aucune
-- représentation. Une ligne porte UNE image en brouillon : son identité
-- (`id`), son nom d'ORIGINE (celui du fichier téléversé, conservé — le nom
-- d'AFFICHAGE et la description arrivent avec le ticket 07, hors périmètre
-- ici, par une migration ultérieure additive), le TYPE DÉDUIT des octets
-- d'en-tête (jamais celui déclaré au téléversement, SC-04d), ses
-- dimensions lues au même en-tête, son poids et ses octets mêmes
-- (`BLOB`, borne 2 Mo tenue par `core/medias/ingestion.ts`, ticket 01).
create table if not exists medias_brouillon (
  id text primary key,
  nom_origine text not null,
  format text not null,
  largeur integer not null,
  hauteur integer not null,
  poids_octets integer not null,
  octets blob not null,
  creee_le integer not null
);
