-- Migration 0012 - seuil par origine (change 012, ticket 02, ADR-0028).
--
-- Le compteur ne retient jamais une adresse IP : une empreinte HMAC calculee
-- avec une cle aleatoire valable une heure. A la bascule d'heure, la cle et
-- toutes les empreintes de la fenetre precedente sont effacees.
--
-- `if not exists` : la meme definition est rejouee par le code
-- (`src/platform/frequence/index.ts`) sur une base ou seules les migrations
-- anterieures ont ete jouees, comme pour la migration 0003.
create table if not exists fenetre_seuil (
  id integer primary key check (id = 1),
  debut integer not null,
  cle blob not null
);

create table if not exists comptes_seuil (
  surface text not null,
  empreinte blob not null,
  nombre integer not null,
  primary key (surface, empreinte)
);
