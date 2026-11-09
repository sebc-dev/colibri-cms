## Context

Voir `proposal.md` § Why pour la motivation. État relevé dans le code le 2026-11-08 :

- **La connexion par code** vit dans `src/pages/admin/connexion.astro` (une route, GET + POST),
  `src/platform/auth/magasin.ts` (écriture du code, ouverture de session) et `src/core/auth/`
  (`code.ts` : alphabet Crockford de 32 signes sans confusables, `engendrerCode`, `normaliserCode` ;
  `regles.ts` : `DELAI_PLANCHER_MS`, échéances de session ; `verdict.ts`).
- **Une session est une ligne de `sessions`** (`migrations/0003`, `dernier_usage_le` ajouté par un
  `alter table` défensif dans `src/platform/session/index.ts`). Sa validité se juge par la seule
  présence de la ligne (ADR-0001). Supprimer une ligne ferme donc la session au prochain accès.
  Aucune fonction ne supprime une session aujourd'hui.
- **Le cookie** est composé en un seul lieu, `enteteCookieSession` (`I13`).
- **Le seuil par origine** se juge par `compterEtJuger(db, surface, ip, maintenant)`
  (`src/platform/frequence/index.ts`, ADR-0028), en tête de toute soumission de `connexion.astro`,
  sur la surface `'connexion'`. Il rend `'traitee'`, `'refusee'` ou une panne.
- **L'adresse autorisée** est semée à la main (`wrangler d1 execute`, `docs/cahier-de-test.md` § 0.2).
  Aucun outil de livraison n'existe (Epic D non commencé).
- **Les écrans qui ne doivent pas être conservés** posent `Cache-Control: no-store` eux-mêmes
  (`src/pages/admin/apercu/[...slug].astro`, `src/pages/admin/publier.astro`).

## Goals / Non-Goals

**Goals**
- Un code de secours de 128 bits, conservé en empreinte seule, à usage unique, qui ouvre une session
  sans message.
- Un seul chemin de création : l'écran « Code de secours », pour la livraison comme pour le
  remplacement ; le renouvellement à l'emploi passe par la même écriture.
- L'emploi et le remplacement atomiques : jamais deux sessions pour un code, jamais un nouveau code
  sans que l'ancien ait cessé.

**Non-Goals**
- Le remplacement de l'adresse autorisée (FR-013, FR-014).
- Un outil de livraison en ligne de commande, le dossier d'instance (Epic D).
- Une liste des sessions ouvertes, ou leur fermeture une à une.
- Tout autre moyen de reprise (passkey, seconde adresse, session longue).

## Decisions

### D1 — Une table d'une ligne, empreinte SHA-256 sans sel

Migration additive `0016_code_de_secours.sql` :
`create table if not exists code_de_secours (id integer primary key check (id = 1), empreinte text not null, cree_le integer not null)`.
`check (id = 1)` fait qu'au plus un code est en place (patron de `fenetre_seuil`, `migrations/0012`).
Pas de ligne = aucun code en place. Le code ne se stocke jamais : seule son empreinte
`SHA-256(normaliserCode(code))`, en hexadécimal.

*Pourquoi sans sel.* Le sel du code de connexion (`magasin.ts`) défend un secret de 40 bits contre le
précalcul. Ici, le secret tiré uniformément sur 2^128 rend le précalcul impossible par l'arithmétique
seule ; un sel n'ajouterait rien. Sans sel, la reconnaissance est une égalité sur l'empreinte : une
seule requête, le même travail quelle que soit la cause d'un refus.

*Écarté.* Un KDF lent (PBKDF2) : il ne défend que des secrets faibles, et coûterait du temps CPU sur
chaque présentation, dans un Worker du palier gratuit. Le stocker dans un secret de la plateforme :
FR-011 l'interdit, et FR-012 exige un magasin modifiable.

### D2 — La forme du code dans `src/core/auth/code.ts`

`engendrerCodeDeSecours()` tire 26 signes de l'alphabet existant, un octet par signe (256 est un
multiple de 32 : aucun biais), soit 130 bits. `grouperCodeDeSecours()` rend la forme affichée, en
groupes de quatre. La saisie se ramène par `normaliserCode`, déjà en place : casse, séparateurs et
confusables.

*Pourquoi dans ce fichier.* `I1` interdit à un fichier de `core/` d'en importer un autre : l'alphabet
et la normalisation ne s'écrivent qu'une fois s'ils restent dans `code.ts`.

### D3 — Un module `src/platform/auth/code-de-secours.ts`, autonome

Trois fonctions : `lireEtatCodeDeSecours(db)` → `{ enPlace: false } | { enPlace: true, depuis }` ;
`mettreEnPlaceCodeDeSecours(db, sessionCourante, maintenant)` → le code en clair, rendu une seule fois ;
`ouvrirSessionParCodeDeSecours(db, saisie, identifiantAppareil, maintenant)` →
`{ reussi: true, jeton, nouveauCode } | { reussi: false }`.

Le module écrit lui-même dans `sessions` (insertion, suppression), comme `magasin.ts` y écrit déjà.
`I1` lui interdit d'importer `src/platform/session/` ou `magasin.ts` : il reprend le garde défensif
de création de table, selon le patron existant.

*Écarté.* Étendre `magasin.ts` : il porte la connexion par code et compte déjà 333 lignes ; le
mélange rendrait chaque review plus lourde. Une fonction `fermerAutresSessions` dans
`src/platform/session/` : elle ne pourrait pas entrer dans la transaction de D4, puisqu'un module de
`platform/` n'en importe pas un autre.

### D4 — L'emploi en une seule transaction D1

`ouvrirSessionParCodeDeSecours` calcule l'empreinte de la saisie normalisée, engendre le jeton de
session et le nouveau code, puis envoie un seul `db.batch` (une transaction, sérialisée par D1) :

1. `insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) select ?jeton, ?appareil, ?t, ?t where exists (select 1 from code_de_secours where id = 1 and empreinte = ?ancienne)` ;
2. `delete from sessions where id <> ?jeton and exists (select 1 from sessions where id = ?jeton)` ;
3. `update code_de_secours set empreinte = ?nouvelle, cree_le = ?t where id = 1 and empreinte = ?ancienne`.

Le succès se lit au nombre de lignes changées par (1). Deux présentations simultanées du même code
sont sérialisées : la seconde ne trouve plus l'ancienne empreinte, ses trois instructions ne changent
rien. Un code faux, déjà servi, remplacé, ou une table vide, suivent le même chemin et ne changent
rien : le refus est unique par construction.

`identifiant_appareil` (non nul dans `sessions`) reprend le cookie `identifiant-appareil` s'il est là,
sinon un identifiant tiré au hasard. Il n'a aucun rôle de liaison ici.

### D5 — Création et remplacement en une transaction

`mettreEnPlaceCodeDeSecours` envoie un seul `db.batch` :
`insert into code_de_secours (id, empreinte, cree_le) values (1, ?, ?) on conflict (id) do update set empreinte = excluded.empreinte, cree_le = excluded.cree_le`,
puis `delete from sessions where id <> ?sessionCourante`. La même écriture sert à la livraison (pas de
ligne) et au remplacement (une ligne).

### D6 — Deux routes, sans îlot

- **`src/pages/admin/reprise.astro`** — l'écran de saisie du code de secours. GET : le formulaire.
  POST : en tête, `compterEtJuger(env.DB, 'connexion', ip, debut)`, la **même surface** que
  `connexion.astro`, d'où un seul compte de vingt par heure ; refus ou panne → les textes
  `TEXTE_ANNONCE_SEUIL` / `TEXTE_ANNONCE_PANNE` après `DELAI_PLANCHER_MS`, comme la connexion. Sinon
  `ouvrirSessionParCodeDeSecours`. Succès → la réponse **rend directement** l'écran du nouveau code
  (pas de redirection : le code n'entre dans aucune adresse), pose le cookie par
  `enteteCookieSession` (`I13`) et `Cache-Control: no-store`. Refus → le même écran, un seul texte.
  La route importe et appelle `verifierSession` sans s'en servir pour bloquer, comme `connexion.astro`
  (`I6`, ADR-0007).
- **`src/pages/admin/code-de-secours.astro`** — gardé : sans session, renvoi vers la connexion. GET :
  l'état (`lireEtatCodeDeSecours`), et le bouton « Créer » ou « Remplacer ». GET `?remplacer` : la
  confirmation, rendue par le serveur. POST : `mettreEnPlaceCodeDeSecours`, puis l'écran du nouveau
  code, en `no-store`. L'anti-forgerie est celle de toute écriture : le cookie `SameSite=Strict`
  (ADR-0011).

Les deux écrans affichent le nouveau code par un même composant serveur `src/admin/`, sans directive
`client:*` (`I4`).

*Pourquoi sans îlot.* Le code doit vivre dans une seule réponse serveur. Un îlot qui l'obtiendrait par
`fetch` le ferait transiter par du JavaScript et par l'état d'un composant, sans rien gagner. La
confirmation à deux temps (GET puis POST) suffit, sans script.

*Écarté.* Un troisième formulaire sur `connexion.astro` : la route porte déjà deux étapes et un
contrat gelé (le formulaire d'adresse présent après toute soumission). Un écran à part garde ce
contrat intact.

### D7 — Le lien depuis Réglages, hors publication

L'écran Réglages porte, sous ses cartes, un lien vers « Code de secours ». Il n'est pas une carte de
réglage : il n'a ni brouillon, ni restauration, ni place au récapitulatif de publication.

### D8 — ADR-0032, accepté avant les tickets

La décision est structurante (le dernier recours de l'instance). Elle est figée par **ADR-0032**
(`docs/adr/0032-moyen-de-reprise-code-128-bits-hache.md`), accepté le 2026-11-08, promu depuis le
candidat avec deux amendements arbitrés le même jour : le code naît dans l'administration, et
l'éditrice le crée elle-même à la livraison, accompagnée, sur son appareil ; créer, remplacer ou
employer le code ferme les autres sessions. Ce design ne fige pas la décision : il en dépend.

### Conformité

- **ADR-0001** : session opaque en D1, cookie `__Host-` ; le remède « fermer les autres sessions »
  qu'il annonce pour FR-012 est celui de D4/D5.
- **ADR-0007 / `I6`** : les deux routes importent le garde.
- **ADR-0011** : aucune écriture sans cookie `SameSite=Strict`.
- **ADR-0028** : même compteur, même surface.
- **ADR-0032** : code de 128 bits haché (D1, D2) ; usage unique et fermeture des autres sessions
  (D4, D5) ; un seul chemin de création (D5, D6) ; aucun frein propre, le seul seuil par origine (D6).
- **`I1`, `I2`** : `core/auth/code.ts` reste sans import ; `platform/auth/code-de-secours.ts`
  n'importe que `core/`.
- **`I4`, `I13`** : pas de `client:*` sous `src/admin/` ; le cookie par `enteteCookieSession` seul.
- **FR-097** : aucune route du site public n'est ajoutée ; `/admin/reprise` est une porte de
  l'administration, comme `/admin/connexion`.
- **SC-012/SC-013** : aucun secret, aucune liaison ni configuration nouvelle.

## Architecture

**Éléments touchés (FQN) :** `colibri-cms.worker.routes` (deux routes), `colibri-cms.worker.admin`
(composant d'affichage, textes, lien de Réglages), `colibri-cms.worker.core` (forme du code),
`colibri-cms.worker.platform` (module du code de secours), `colibri-cms.d1` (table et migration).

**Relations ajoutées / retirées :** aucune. `routes -> platform`, `routes -> core`,
`routes -> admin`, `platform -> core` et `platform -> d1` existent déjà dans
`docs/architecture/model.c4`.

## Risks / Trade-offs

- [La réponse se perd après la transaction (coupure réseau) : l'ancien code est servi, le cookie et le
  nouveau code n'arrivent jamais] → Risque accepté. La fenêtre est celle d'une seule réponse, et la
  connexion par e-mail reste la voie ordinaire. Le corriger exigerait de garder l'ancien code valable
  jusqu'à un accusé de lecture, ce qui contredit l'usage unique. ADR-0032 l'accepte.
- [L'éditrice quitte l'écran du nouveau code sans le noter] → L'écran dit, sans terme technique,
  que le code ne se reverra pas. Comme elle a une session ouverte, elle peut en créer un autre. C'est
  le coût assumé par ADR-0032.
- [Une instance livrée sans code] → L'écran « Code de secours » le dit en tête ; la liste de livraison
  de l'Epic D devra porter le geste.
- [Aucun frein propre au code de secours] → Assumé (ADR-0032) : la sûreté repose sur
  l'entropie ; le seuil par origine reste devant l'écran pour le bruit.

## Migration Plan

1. Migration `0016_code_de_secours.sql`, additive, jouée au déploiement ; le module reprend la même
   définition en `create table if not exists` pour les bases de test.
2. Aucune donnée à reprendre : toute instance existante démarre sans code, et l'écran le dit.
3. Sur la recette, après le déploiement, créer le code depuis l'écran avant de jouer SC-020.
4. Retour arrière : la table reste en place et inutilisée ; rien d'autre n'en dépend.
