-- Migration 0002 — adresses autorisées et codes de connexion (ticket 03,
-- specs/001-connexion-par-code/03-code-vers-adresse-autorisee.md).
--
-- `adresses_autorisees` : l'adresse qui ouvre l'administration. Semée par un
-- geste d'exploitation à la livraison (hors produit, SPEC.md § Hors-
-- périmètre) — cette migration ne crée que la table, jamais la ligne.
--
-- `codes_connexion` : un code n'y est jamais conservé en clair (ADR-0001) —
-- seules une empreinte et son sel le sont (`empreinte`, `sel`), au sens
-- structurel où la colonne existe, pas au sens où elle est déjà vérifiée à
-- ce ticket. `identifiant_appareil` porte l'appareil qui a demandé le code
-- (FR-120). `creee_le`/`expire_le` (millisecondes époque) portent la borne
-- des quinze minutes qu'ADR-0001 fixe ; `essais` et `annule_le` restent à
-- zéro/nul tant que le brûlage (ticket 07) et l'annulation par nouvelle
-- demande (ticket 07) ne les écrivent pas encore ; `utilise_le` reste nul
-- tant que l'ouverture de session (ticket 06) ne le pose pas.
create table adresses_autorisees (
  id integer primary key autoincrement,
  adresse text not null unique
);

create table codes_connexion (
  id integer primary key autoincrement,
  identifiant_appareil text not null,
  empreinte text not null,
  sel text not null,
  creee_le integer not null,
  expire_le integer not null,
  essais integer not null default 0,
  utilise_le integer,
  annule_le integer
);
