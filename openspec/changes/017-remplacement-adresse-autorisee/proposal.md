## Why

Aujourd'hui, l'adresse autorisée se sème à la main dans la base, et rien dans l'administration ne la
change. Si l'éditrice change de boîte, ou si sa boîte est piratée, il lui faut Isometria pour que
l'administration et les demandes suivent : la promesse « le site survit à son prestataire » tombe. Le
cycle 1.x avait laissé FR-013 et FR-014 sans porteur, faute de pouvoir écrire à une nouvelle adresse
depuis le produit. La plateforme le permet désormais par un chemin gratuit, arbitré avec l'humain le
2026-11-09 (option A, ci-dessous).

Sert l'**Epic C — Filets & reprise**, story « Remplacement de l'adresse autorisée »
(`docs/roadmap.md`) ; couvre **FR-013** et **FR-014** (`docs/vision.md`). S'appuie sur les capacités
vivantes `connexion-par-code` (forme du code, plafond de messages, fermeture des sessions) et
`moyen-de-reprise` (ADR-0032 : une session ouverte par le code de secours peut remplacer l'adresse
d'une boîte perdue). Demande un **ADR-0033**, qui remplace une conséquence de l'ADR-0002.

## What Changes

- Un écran **« Adresse e-mail »** de l'administration, atteignable depuis Réglages et seulement avec
  une session ouverte, montre l'adresse autorisée et permet d'en proposer une nouvelle (FR-013).
- La nouvelle adresse ne devient l'adresse autorisée qu'après **deux preuves** (FR-014) :
  1. **la confirmation de Cloudflare** : le produit inscrit l'adresse parmi les adresses vérifiées du
     compte du client, et Cloudflare lui envoie son propre message, en anglais, avec un bouton à
     cliquer. Tant que ce clic n'a pas eu lieu, le produit ne peut rien y envoyer ;
  2. **un code du produit** : une fois l'adresse confirmée, le produit y envoie un code court, que
     l'éditrice recopie **dans la session qui a demandé le remplacement**, dans les quinze minutes.
     Cette preuve-là rattache la maîtrise de la boîte à la personne connectée, et montre que les
     messages du produit y arrivent bien avant qu'on n'en dépende.
- Le remplacement réussi, en un seul geste : l'adresse autorisée devient la nouvelle ; les codes de
  connexion encore en circulation cessent d'ouvrir ; **toute autre session est fermée** ; un **avis**
  part vers l'ancienne adresse pour dire que l'adresse a été remplacée, et par laquelle.
- Les codes de connexion et les **demandes** partent ensuite vers la nouvelle adresse. L'ancienne
  n'ouvre plus l'administration ; elle reçoit, à l'écran de connexion, la même réponse que toute
  autre adresse.
- Au plus **cinq messages par heure glissante** partent pour le remplacement (messages de
  confirmation de Cloudflare et codes du produit confondus), et un seul remplacement est en cours à la
  fois : en demander un autre annule le précédent.
- **Configuration** : la liaison d'envoi d'e-mails n'est plus limitée à une adresse fixe ; elle
  écrit à toute adresse **vérifiée du compte du client**. Un nouveau secret du compte client, une
  clé Cloudflare limitée aux **adresses de destination**, et l'identifiant du compte dans
  `instance.json`. Sans cette clé, l'écran dit que le remplacement n'est pas possible pour le moment.
- **BREAKING (spec)** : la fin de session automatique reconnaît une seconde exception à la
  coexistence des sessions, le remplacement de l'adresse autorisée.

## Points tranchés

Le détail est dans `design.md` § Decisions.

1. **Le produit inscrit lui-même l'adresse chez Cloudflare** (arbitré le 2026-11-09). C'est la seule
   voie où l'éditrice change d'adresse seule, sans visiter le compte Cloudflare (SC-006) et sans
   Isometria. Les autres voies écartées : une personne qui vérifie l'adresse dans le compte Cloudflare
   (impossible le jour où Isometria disparaît) ; sortir le remplacement du produit (pas de remède
   durable à une boîte piratée) ; l'envoi payant vers une adresse quelconque (SC-001).
2. **La clé ne touche qu'aux adresses de destination.** Cloudflare sépare la permission « adresses de
   destination » (compte) de la permission « règles de routage » (domaine). La clé n'a que la
   première : volée, elle ne détourne pas le courrier du domaine du client. C'est la parade à
   l'objection qui avait fait écarter cette voie au cycle 1.x.
3. **Deux preuves, pas une.** Le clic sur le message de Cloudflare suffirait à prouver la maîtrise de
   la boîte, mais pas que la personne connectée la détient, ni que les codes du produit y arrivent.
   Basculer vers une adresse injoignable fermerait l'administration à l'éditrice.
4. **Le remplacement ferme les autres sessions et prévient l'ancienne adresse.** Une boîte piratée
   est la première raison de remplacer l'adresse : la session ouverte par l'intrus ne doit pas
   survivre. À l'inverse, une session volée pourrait détourner l'adresse : l'avis à l'ancienne boîte
   le fait voir, et le code de secours reste le recours.
5. **L'ancienne adresse reste inscrite chez Cloudflare.** La retirer pourrait casser d'autres règles
   de courrier du client ; le produit ne retire jamais d'adresse.
6. **La saisie du code de remplacement ne compte pas dans le seuil par origine.** Ce seuil borne les
   deux surfaces publiques ; ici, la session ouverte est déjà la porte, et le brûlage à la cinquième
   saisie fautive borne les essais.

## Point à arbitrer hors change

**FR-005** dit : « N'envoyer aucun message de preuve de maîtrise à une adresse autre que l'adresse
autorisée ». À la lettre, il interdit le code envoyé à la nouvelle adresse. Son intention, établie au
cycle 1.x (`docs/legacy/1.x/stack.md`, § « `FR-013` et `FR-014` »), visait l'écran de connexion
public. ADR-0033 retient cette lecture. Amender la formulation de FR-005 dans `docs/vision.md` est un
geste de cadrage durable, qu'un change ne fait pas : à décider par l'humain, avant l'archivage.

## Capabilities

### New Capabilities

- `remplacement-adresse-autorisee` : l'écran « Adresse e-mail » et sa garde ; la proposition d'une
  nouvelle adresse et son inscription chez Cloudflare ; la confirmation par Cloudflare ; le code du
  produit et sa saisie dans la session demandeuse ; la bascule (adresse, codes de connexion, sessions,
  avis à l'ancienne adresse) ; le plafond des messages du remplacement ; l'acheminement des demandes
  vers la nouvelle adresse ; le refus quand la clé manque.

### Modified Capabilities

- `connexion-par-code` : l'exigence « La fin de session automatique » ajoute le remplacement de
  l'adresse autorisée aux gestes qui ferment les autres sessions.

## Impact

- **Code** : un écran gardé `src/pages/admin/adresse-e-mail.astro` et ses écritures ; un module de
  remplacement dans `src/platform/auth/` (base) ; un adaptateur de l'API Cloudflare des adresses de
  destination dans `src/platform/` ; un message de code et un avis dans `src/platform/email/` ; les
  textes dans `src/admin/textes.ts` ; un lien depuis Réglages.
- **Base** : une migration additive pour le remplacement en cours et ses codes.
- **Configuration** : `send_email` sans `destination_address` dans `wrangler.jsonc` et
  `wrangler.astro.jsonc` ; un champ optionnel d'identifiant de compte dans `instance.json` (`I8`) ; un
  secret optionnel, posé sur le Worker du client.
- **Architecture** : une relation nouvelle `colibri-cms.worker.platform -> email-routing` (inscrire et
  lire une adresse de destination), écrite dans `docs/architecture/context.c4` par le ticket qui la
  crée.
- **ADR** : **ADR-0033**, accepté le 2026-11-09 avant les tickets. Il remplace la conséquence de l'ADR-0002
  « Une destination vérifiée ne se remplace pas depuis le produit » et fixe la portée de la clé.
- **Tests** : intégration dans workerd, l'API Cloudflare simulée ; le parcours réel (message de
  Cloudflare, clic, code, bascule) joué en recette sur `colibri.sebc.dev`, avec une seconde boîte.
- **Hors périmètre** : retirer une adresse du compte Cloudflare ; plusieurs adresses autorisées ;
  séparer l'adresse de connexion de celle des demandes (écarté par l'ADR-0002) ; l'outillage de
  livraison qui crée la clé (Epic D) ; une liste des sessions ouvertes.
