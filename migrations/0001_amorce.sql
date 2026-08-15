-- Migration d'amorce — sans effet de schéma (FR-021).
--
-- Elle prouve que la chaîne de migration fonctionne de bout en bout
-- (FR-013, FR-014) sans créer le moindre objet propre au produit : après son
-- application, le schéma ne porte que les tables de service du mécanisme de
-- migration (`d1_migrations`) et du moteur (`sqlite_sequence`,
-- `_cf_METADATA`). Aucune unité de logique métier n'existe encore à ce lot
-- (spec § NON inclus) — il n'y a donc rien à modéliser.
SELECT 1;
