-- Migration 0014 — la trace des images effacées par une publication.
--
-- Une publication qui efface une image retire sa fiche du contenu déposé et sa
-- ligne de `medias`. Tant que le site en service n'est pas reconstruit, il
-- empaquette encore cette fiche : sans trace, les écrans qui réinscrivent les
-- images empaquetées (`inscrireImagesDeDepart`) la rendaient à la bibliothèque,
-- et la publication suivante demandait au dépôt de supprimer une fiche qu'il
-- n'a plus (refus de toute l'écriture, défaut constaté en recette le 2026-11-03).
--
-- Une ligne par image effacée ; elle disparaît quand une publication dépose de
-- nouveau une image de même identité. Aucune autre table n'est touchée.
create table if not exists medias_effacees (
  id text primary key,
  effacee_le integer not null
);
