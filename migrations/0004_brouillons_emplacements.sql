-- Migration 0004 — brouillons des emplacements (ticket 04,
-- openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md,
-- SC-04d, ADR-0012, candidat
-- acces-aux-donnees-api-d1-native-et-migrations-wrangler).
--
-- Additive : ne touche ni aux tables d'authentification (`adresses_autorisees`,
-- `codes_connexion`, `sessions`) ni à l'état publié — qui n'a aucune
-- représentation en D1 avant la publication (feature distincte). Chaque
-- ligne porte la correction COURANTE d'un emplacement, liée à sa page par
-- son slug et à sa déclaration par son identifiant stable
-- (`page_slug`, `id_emplacement` — ADR-0012 § Décision : la clé est
-- `(page, identifiant d'emplacement)`). `nature` et `contenu` (JSON, forme
-- dépendant de la nature) portent le contenu corrigé ; « porte un brouillon »
-- se dérive de la seule présence d'au moins une ligne pour une page
-- (`src/core/pages/brouillon.ts`, SC-04b), jamais stocké ici.
create table brouillons_emplacements (
  page_slug text not null,
  id_emplacement text not null,
  nature text not null,
  contenu text not null,
  maj_le integer not null,
  primary key (page_slug, id_emplacement)
);
