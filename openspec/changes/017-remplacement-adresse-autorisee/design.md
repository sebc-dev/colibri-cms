## Context

Voir `proposal.md` § Why pour la motivation. État relevé dans le code et la documentation de la
plateforme le 2026-11-09 :

- **L'adresse autorisée vit en D1**, table `adresses_autorisees (id, adresse unique)`
  (`migrations/0002`), semée à la main. ADR-0005 l'y a logée précisément pour qu'un geste de
  l'administration puisse un jour la remplacer. Elle est lue par `estAdresseAutorisee` (connexion) et
  `lireAdresseAutorisee` (`src/platform/auth/magasin.ts`), elle-même lue **à chaque envoi** par
  `src/pages/api/public/demandes.ts` : remplacer la ligne suffit à réacheminer les demandes.
- **Les codes de connexion** (`codes_connexion`) ne portent pas l'adresse à laquelle ils sont partis.
  Annuler ceux en circulation se fait en posant `annule_le` sur toute ligne vivante.
- **Une session est une ligne de `sessions`** ; la supprimer la ferme (ADR-0001). `Session` expose
  `id`. Le patron « un lot atomique qui ferme les autres sessions » existe déjà dans
  `src/platform/auth/code-de-secours.ts` (`db.batch`, `delete from sessions where id <> ?`).
- **L'envoi d'e-mails** passe par la liaison `send_email` `EXPEDITEUR_CODE_CONNEXION`, aujourd'hui
  limitée par `destination_address` (`wrangler.jsonc`, `wrangler.astro.jsonc`) à une adresse fixe.
  Le message est composé dans `src/platform/email/index.ts`, depuis `__ADRESSE_EXPEDITEUR__`.
- **La plateforme** (documentation Cloudflare, octobre 2026) : l'envoi est gratuit vers les seules
  adresses de destination **vérifiées** du compte ; une liaison `send_email` sans attribut de
  restriction écrit à toute adresse vérifiée du compte. Une adresse de destination s'inscrit par
  l'API Email Routing (`POST /accounts/{compte}/email/routing/addresses`), ce qui fait partir le
  message de vérification de Cloudflare ; son état se lit par `GET` (champ `verified`, nul tant que le
  clic n'a pas eu lieu). La permission de clé **« Email Routing Addresses Edit »** est de niveau
  compte, distincte de **« Email Routing Rules Edit »**, de niveau domaine.
- **Le seul secret en place** est `JETON_DEPOT` (optionnel, lu par `env`) ; la seule valeur d'instance
  optionnelle de même nature est `depotDePublication` d'`instance.json`, injectée à la construction
  par `astro.config.ts` (`__DEPOT_DE_PUBLICATION__`). Sans eux, la publication refuse en le disant
  (CT-31.1).
- **L'écran Réglages** porte déjà un lien vers « Code de secours » (`src/pages/admin/reglages.astro:184`).

## Goals / Non-Goals

**Goals :**
- Remplacer l'adresse autorisée depuis une session ouverte, sans visiter aucun compte.
- Ne basculer que vers une adresse vérifiée chez Cloudflare **et** dont la boîte a reçu un code du
  produit, recopié dans la session demandeuse.
- Une bascule atomique : adresse, codes de connexion, autres sessions, en un seul lot.
- Une clé de plateforme dont la perte ne détourne pas le courrier du domaine du client.

**Non-Goals :**
- Retirer une adresse de destination du compte Cloudflare.
- Plusieurs adresses autorisées ; une adresse des demandes distincte de celle de connexion.
- Créer la clé ou l'inscrire à la livraison (Epic D) ; le changement de l'adresse d'expéditeur.
- Un îlot ou une vérification automatique en arrière-plan : l'éditrice dit elle-même « j'ai
  confirmé ».

## Decisions

### D1 — Un parcours en trois écritures sur un écran gardé, sans îlot

`src/pages/admin/adresse-e-mail.astro`, gardé (sans session → renvoi vers la connexion, `I6`). GET :
l'adresse en place, l'état du remplacement en cours, le formulaire de l'étape. POST, par un champ
`etape` :

1. `proposer` (champ `adresse`) — forme, différence avec l'adresse en place, plafond (D5) ;
   inscription chez Cloudflare (D3) ; ouverture du remplacement (D4).
2. `verifier` — lecture de l'état chez Cloudflare ; si vérifiée, écriture d'un code (D4) puis envoi
   (D6) remis par `waitUntil`, comme la connexion.
3. `code` (champ `code`) — la bascule (D4), puis l'avis (D6).

Chaque POST rend directement l'écran de l'étape suivante (pas de redirection), comme
`code-de-secours.astro`. L'anti-forgerie est celle de toute écriture : le cookie `SameSite=Strict`
(ADR-0011). Les textes vivent dans `src/admin/textes.ts`. Aucune directive `client:*` (`I4`).

*Écarté.* Interroger Cloudflare à chaque affichage pour avancer seul : une requête vers l'API à chaque
rendu, et un écran qui change sans geste de l'éditrice. Le bouton « J'ai cliqué sur le bouton du
message » suffit.

### D2 — La liaison d'envoi sans adresse fixe ; la clé et le compte

- `send_email` perd `destination_address` dans `wrangler.jsonc` et `wrangler.astro.jsonc` : elle
  écrit à toute adresse **vérifiée du compte du client**. Le produit, lui, n'écrit qu'à l'adresse
  autorisée lue en base, ou à l'adresse d'un remplacement en cours **constatée vérifiée** (D3). Le
  fichier de déploiement cesse de porter une adresse propre à l'instance, ce qui sert `SC-008`.
- **Secret** `JETON_ADRESSES_EMAIL`, optionnel, posé sur le Worker du client (lieu 2 d'ADR-0005),
  déclaré à côté de `JETON_DEPOT` dans `src/platform/d1/cloudflare-workers.d.ts`. Sa seule permission
  est « Email Routing Addresses Edit » sur le compte du client.
- **Identifiant du compte** : champ optionnel `compteCloudflare` d'`instance.json`, validé par
  `astro.config.ts` (32 caractères hexadécimaux) et injecté en `__COMPTE_CLOUDFLARE__`, comme
  `depotDePublication` (`I8`, `I10`). Ce n'est pas un secret.
- L'un ou l'autre absent → l'écran dit que le remplacement n'est pas possible pour le moment.

*Écarté.* `allowed_destination_addresses` : la liste figerait les adresses dans le fichier de
déploiement, et chaque remplacement demanderait un redéploiement. L'identifiant du compte en secret :
ADR-0005 range les valeurs non secrètes dans `instance.json`.

### D3 — Un adaptateur de l'API des adresses dans `src/platform/adresses-cloudflare/`

Deux fonctions, `fetch` vers `https://api.cloudflare.com/client/v4/accounts/{compte}/email/routing/addresses` :

- `inscrireAdresse(cle, compte, adresse)` → `'inscrite' | 'deja-inscrite' | 'echec'`. Liste d'abord
  (`GET`, filtre sur l'adresse, comparaison sans casse) ; `POST` seulement si elle est absente.
- `etatAdresse(cle, compte, adresse)` → `'verifiee' | 'en-attente' | 'absente' | 'echec'`.

Délai borné par appel (`AbortSignal.timeout`), toute réponse non `success` → `'echec'`. Ni la clé ni
le corps de réponse n'entrent dans un journal : seul le statut HTTP est consigné. Le module n'importe
rien d'autre de `platform/` (`I1`) ; il ne connaît ni D1 ni la session. Le `fetch` se double en test
comme celui de la forge GitHub (`tests/integration/revenir-et-publication.test.ts`).

*Écarté.* Un `DELETE` pour relancer le message de confirmation : le produit ne retire jamais
d'adresse (proposal, point 5) ; une adresse déjà inscrite et en attente garde le message déjà parti,
que Cloudflare permet de renvoyer depuis le message lui-même.

### D4 — Le remplacement en base : deux tables et une bascule en un lot

Migration additive `0017_remplacement_adresse.sql` (même définition rejouée par le module en
`create table if not exists`, patron de `0016`) :

- `remplacement_adresse (id integer primary key check (id = 1), adresse text not null, session text not null, ouvert_le integer not null)` — au plus un remplacement en cours ;
- `codes_remplacement (id integer primary key autoincrement, empreinte text not null, sel text not null, session text not null, creee_le integer not null, expire_le integer not null, essais integer not null default 0, utilise_le integer, annule_le integer)` ;
- `messages_remplacement (envoye_le integer not null)` — une ligne par message compté (D5).

Module `src/platform/auth/remplacement-adresse.ts` (n'importe que `core/`) :

- `ouvrirRemplacement(db, adresse, session, t)` — un lot : `insert … on conflict(id) do update`
  sur `remplacement_adresse`, `update codes_remplacement set annule_le = ?t where annule_le is null`.
- `ecrireCodeSiPlafondNonAtteint(db, session, t)` — patron de `magasin.ts` : `insert … select …
  where (compte de la fenêtre) < 5`, puis annulation des codes antérieurs.
- `basculerSiCodeValide(db, session, saisie, t)` — trouve la ligne par empreinte salée (sur toutes
  les lignes, comme `trouverLigneParCode`), juge par un verdict de `core/auth/` (session, expiration,
  usage, annulation, brûlage), puis **un seul `db.batch`**. Soit `C` la condition
  `exists (select 1 from codes_remplacement where id = ?id and utilise_le = ?t)` :
  1. `select adresse from adresses_autorisees` — l'ancienne adresse, pour l'avis ;
  2. `update codes_remplacement set utilise_le = ?t where id = ?id and session = ?session and utilise_le is null and annule_le is null and expire_le > ?t and essais < 5` ;
  3. `delete from adresses_autorisees where C` ;
  4. `insert into adresses_autorisees (adresse) select adresse from remplacement_adresse where id = 1 and C` ;
  5. `update codes_connexion set annule_le = ?t where annule_le is null and utilise_le is null and C` ;
  6. `delete from sessions where id <> ?session and C` ;
  7. `delete from remplacement_adresse where id = 1 and C`.

  Le succès se lit au nombre de lignes changées par (2). Rend
  `{ reussi: true, ancienne, nouvelle } | { reussi: false, raison }`. Deux saisies simultanées sont
  sérialisées par D1 : la seconde ne trouve plus `utilise_le is null`, `C` est faux pour elle (son `?t`
  diffère, ou la ligne est déjà prise), et rien d'autre ne change.

Le verdict réutilise `rendreVerdict` si sa forme s'y prête (l'« appareil » y devient la session) ;
sinon un verdict voisin dans `src/core/auth/verdict.ts`. Les raisons rendues à l'écran se réduisent à
deux gestes : retaper, ou demander un nouveau code.

*Écarté.* Poser le code dans `codes_connexion` avec une colonne de type : le plafond de la connexion
(qui compte toutes ses lignes) et `trouverLigneParCode` le verraient ; un code de remplacement
pourrait alors ouvrir une session. Des tables séparées le rendent impossible par construction.

### D5 — Le plafond du remplacement, compté à part

`messages_remplacement` reçoit une ligne à chaque inscription Cloudflare réellement demandée
(`'inscrite'`, pas `'deja-inscrite'`) et à chaque code écrit. L'épreuve et l'écriture du code sont
une seule requête (`insert … select … where count < 5`), comme le plafond de la connexion. Pour
l'inscription, la ligne est réservée **avant** l'appel à Cloudflare par la même forme de requête ; un
`'echec'` ne la rend pas (le message a pu partir). Constantes dans `src/core/auth/regles.ts`
(`PLAFOND_MESSAGES_REMPLACEMENT_PAR_HEURE = 5`, fenêtre partagée `FENETRE_PLAFOND_MS`).

### D6 — Deux messages de plus dans `src/platform/email/index.ts`

- `demanderExpeditionDuCodeDeRemplacement(expediteur, destinataire, code, adresseExpediteur)` — objet
  fixe « Confirmez votre nouvelle adresse », texte seul, la donnée variable derrière son étiquette
  (ADR-0002).
- `demanderAvisDeRemplacement(expediteur, ancienne, nouvelle, date, adresseExpediteur)` — objet fixe
  « L'adresse de votre administration a changé » ; nomme la nouvelle adresse derrière une étiquette,
  la date, et renvoie au code de secours ; aucun code. Remis par `waitUntil` ; un échec est consigné
  sans rien défaire.

Envoyer à l'ancienne adresse après la bascule reste possible : elle demeure vérifiée chez Cloudflare
(proposal, point 5).

### D7 — Le lien depuis Réglages, hors publication

Sous le lien « Code de secours », un lien « Adresse e-mail ». Comme lui, ce n'est pas une carte de
réglage : ni brouillon, ni restauration, ni place au récapitulatif de publication.

### D8 — ADR-0033, accepté avant les tickets

La décision est structurante : une clé de la plateforme entre dans le Worker exposé, et une
conséquence de l'ADR-0002 accepté tombe (« Une destination vérifiée ne se remplace pas depuis le
produit »). **ADR-0033** — « Remplacement de l'adresse autorisée par l'API des adresses de destination,
clé limitée aux adresses, double preuve » — la fige : portée de la clé, liaison sans adresse fixe,
lecture de FR-005 limitée à l'écran de connexion, double preuve, fermeture des sessions et avis. Il
amende l'ADR-0002 sur ce point seul, sans en réécrire le corps (un ADR accepté ne s'édite pas). Ce
design en dépend ; il ne le remplace pas.

### Conformité

- **ADR-0001** : la bascule ferme les autres sessions par suppression de lignes (D4).
- **ADR-0002** : texte seul, objets fixes, données derrière étiquette (D6) ; la conséquence sur la
  destination vérifiée est remplacée par ADR-0033 (D8).
- **ADR-0005** : l'adresse reste en D1 ; la clé en secret du compte client ; l'identifiant du compte
  dans `instance.json` (D2).
- **ADR-0007 / `I6`** : la route importe le garde et s'en sert pour bloquer.
- **ADR-0011** : aucune écriture sans cookie `SameSite=Strict`.
- **ADR-0032** : le code de secours n'est pas touché ; il reste le recours si une session volée a
  détourné l'adresse.
- **`I1`, `I2`** : `adresses-cloudflare/` et `auth/remplacement-adresse.ts` n'importent que `core/` ;
  la route orchestre les trois adaptateurs.
- **`I4`, `I13`** : pas de `client:*` ; aucun cookie posé par ce parcours.
- **`I8`, `I10`** : `compteCloudflare` dans `instance.json`, lu par `astro.config.ts`.
- **FR-097** : aucune route du site public ajoutée.
- **SC-012/SC-013** : la clé est créée au nom du client ; sans elle, rien ne casse hors le remplacement.

## Architecture

**Éléments touchés (FQN) :** `colibri-cms.worker.routes` (l'écran et ses écritures),
`colibri-cms.worker.admin` (textes, lien de Réglages), `colibri-cms.worker.core` (règles et verdict),
`colibri-cms.worker.platform` (adaptateur des adresses, module du remplacement, messages),
`colibri-cms.d1` (trois tables, une migration), `email-routing` (système externe).

**Relations ajoutées / retirées :**
- ajoutée : `colibri-cms.worker.platform -[sync]-> email-routing 'inscrit une adresse de destination et lit sa vérification'` ;
- ajoutée : `email-routing -[async]-> editrice 'remet le message de confirmation'`.

Elles sont écrites dans `docs/architecture/context.c4` par ADR-0033, marquées `#planned`, avec la vue
`adr-0033` ; la description de `email-routing` s'étend à la liste des adresses. Le ticket qui pose
l'adaptateur (D3) retire `#planned` et remplace le commentaire `// décision :` par une `// trace :`,
puis rejoue `likec4 validate --no-layout --json --project colibri-cms docs/architecture`.

## Risks / Trade-offs

- [La clé fuit (session volée, lecture du Worker)] → Sa seule portée est la liste des adresses de
  destination du compte : pas de règle de routage, pas de détournement du courrier du domaine. Elle
  peut retirer des adresses, ce qui couperait l'envoi des codes : le code de secours reste la porte,
  et la clé se révoque depuis le compte du client.
- [Une session volée remplace l'adresse et ferme la session de l'éditrice] → L'avis à l'ancienne
  adresse le lui dit ; le code de secours rouvre l'administration et permet de remettre son adresse.
  Ce pouvoir existait déjà : une session volée remplace aujourd'hui le code de secours.
- [Le message de Cloudflare est en anglais et marqué Cloudflare] → L'écran l'annonce avant, avec le
  libellé exact du bouton (`ux.md`). C'est le prix de la voie gratuite.
- [Cloudflare change l'API ou la permission] → L'adaptateur rend `'echec'` ; l'écran dit que le
  remplacement n'a pas pu commencer, l'adresse en place continue de servir. Rien d'autre ne dépend
  de l'API.
- [La réponse de la bascule se perd] → L'adresse a changé, la session de l'éditrice reste ouverte :
  en rouvrant l'écran, elle voit la nouvelle adresse.
- [Une adresse est vérifiée chez Cloudflare par un autre que l'éditrice] → Le code du produit,
  recopié dans la session demandeuse, l'exclut.

## Migration Plan

1. ADR-0033 accepté le 2026-11-09, avant le premier ticket.
2. Migration `0017_remplacement_adresse.sql`, additive, jouée au déploiement.
3. `send_email` sans `destination_address` : sans effet sur l'envoi actuel, l'adresse autorisée étant
   déjà vérifiée dans le compte.
4. Sur la recette (`colibri.sebc.dev`) : créer la clé « Email Routing Addresses Edit », la poser en
   secret, renseigner `compteCloudflare` dans l'`instance.json` du dépôt de recette, puis jouer le
   parcours avec une seconde boîte, et remettre l'adresse d'origine.
5. Retour arrière : retirer le secret ferme le remplacement ; les tables restent inutilisées.

## Open Questions

- Le format exact de la réponse `GET …/email/routing/addresses` (pagination, filtre par adresse) se
  constate au premier ticket contre l'API réelle de la recette ; il ne change ni les specs ni le
  découpage.
