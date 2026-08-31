-- Migration 0003 — sessions (ticket 06,
-- specs/001-connexion-par-code/06-code-ouvre-la-session.md).
--
-- Une session est opaque en base (SPEC.md § Ce que ça livre) : `id` porte
-- directement le jeton aléatoire remis dans le cookie `__Host-session` — il
-- n'y a ni clé de signature à ranger ni à faire tourner, la validité se juge
-- par la seule présence de la ligne. `identifiant_appareil` reprend
-- l'appareil qui a ouvert la session (FR-120). `creee_le` (millisecondes
-- époque) porte la date d'ouverture ; le ticket 08 (fin de session — sept
-- jours sans usage, trente jours quoi qu'il arrive) ajoutera ce qu'il faut
-- pour juger l'expiration, absent ici.
--
-- `if not exists` (inhabituel dans ce dépôt face à 0001/0002) : cette même
-- définition est rejouée par le code de production lui-même
-- (`assurerTableSessions`, `src/platform/auth/magasin.ts` et
-- `src/platform/session/index.ts`) pour rester fonctionnel sur une D1 où
-- seule la migration 0002 a été rejouée (couture de test du ticket 06,
-- aucun fichier de test ne rejoue de migration de session) — la rejouer ici
-- au déploiement doit donc rester sans effet sur une base qui la porte déjà.
create table if not exists sessions (
  id text primary key,
  identifiant_appareil text not null,
  creee_le integer not null
);
