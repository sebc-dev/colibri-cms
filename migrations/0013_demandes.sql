-- Migration 0013 - la liste des demandes (change 013, ticket 01, ADR-0030, I17).
--
-- Une demande acceptee est gardee a sa reception, avant l'envoi de son e-mail. Cinq colonnes
-- survivent au retrait (id, formulaire_id, formulaire_nom, suite, etat) ; les autres sont
-- effacees : la base refuse une ligne `retiree` qui porterait une valeur hors des cinq.
--
-- `if not exists` : la meme definition est rejouee par le code (`src/platform/demandes/magasin.ts`).
create table if not exists demandes (
  id text primary key,
  formulaire_id text not null,
  formulaire_nom text not null,
  suite text not null check (suite in ('a-renseigner', 'sans-suite', 'devis-envoye', 'commande')),
  etat text not null check (etat in ('presente', 'retiree')),
  recue_le integer,
  page_titre text,
  total integer,
  contact text,
  detail text,
  courriel text check (courriel in ('parti', 'non-parti')),
  check (
    etat = 'presente'
    or (recue_le is null and page_titre is null and total is null and contact is null and detail is null and courriel is null)
  )
);

create index if not exists demandes_etat_recue_le on demandes (etat, recue_le desc);
