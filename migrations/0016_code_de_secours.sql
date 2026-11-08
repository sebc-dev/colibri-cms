-- Migration 0016 - code de secours (change 016, ticket 01, ADR-0032).
--
-- Une seule ligne : l'empreinte SHA-256 du code normalise, jamais le code.
-- `if not exists` : la meme definition est rejouee par le code
-- (`src/platform/auth/code-de-secours.ts`) sur une base de test.
create table if not exists code_de_secours (
  id integer primary key check (id = 1),
  empreinte text not null,
  cree_le integer not null
);
