-- Migration 0017 - remplacement de l'adresse autorisee (change 017, ticket 02, ADR-0033).
--
-- Au plus un remplacement en cours (id = 1). Les codes et les messages comptes
-- sont poses par les tickets suivants. `if not exists` : la meme definition est
-- rejouee par le code (`src/platform/auth/remplacement-adresse.ts`).
create table if not exists remplacement_adresse (
  id integer primary key check (id = 1),
  adresse text not null,
  session text not null,
  ouvert_le integer not null
);
create table if not exists codes_remplacement (
  id integer primary key autoincrement,
  empreinte text not null,
  sel text not null,
  session text not null,
  creee_le integer not null,
  expire_le integer not null,
  essais integer not null default 0,
  utilise_le integer,
  annule_le integer
);
create table if not exists messages_remplacement (
  envoye_le integer not null
);
