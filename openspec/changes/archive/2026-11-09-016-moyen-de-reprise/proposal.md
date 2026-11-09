## Why

Aujourd'hui, la boîte e-mail de l'adresse autorisée est la seule clé de l'administration. Si
l'éditrice la perd (compte fermé, mot de passe oublié, boîte volée), elle ne peut plus entrer, et
personne ne peut le faire à sa place sans Isometria. SC-020 exige qu'elle ouvre **seule** son
administration, boîte coupée, et consulte ses demandes. C'est le dernier recours de l'instance, et la
promesse « le site survit à son prestataire » tombe sans lui.

Sert l'**Epic C — Filets & reprise**, story « Moyen de reprise » (`docs/roadmap.md`) ; couvre
**FR-009**, **FR-010**, **FR-011**, **FR-012** et **SC-020** (`docs/vision.md`). S'appuie sur
ADR-0032 (`docs/adr/0032-moyen-de-reprise-code-128-bits-hache.md`), promu depuis le candidat et amendé
sur deux points (ci-dessous, 1 et 3).

## What Changes

- Un **code de secours** — le moyen de reprise, sous le nom que l'éditrice lit — de 26 signes,
  groupés pour la recopie, ouvre une session sans qu'aucun message ne parte (FR-010). Il se saisit
  depuis l'écran de connexion, par un lien « Je n'ai plus accès à ma boîte e-mail ».
- La base ne garde du code qu'une **empreinte**, jamais sa valeur, et rien dans la configuration du
  déploiement ne permet de le reconstituer (FR-011).
- Un écran **« Code de secours »** de l'administration dit si un code est en place, et depuis quand,
  sans jamais le montrer. Il permet d'en créer un, ou de le remplacer (FR-012). Le nouveau code
  s'affiche **une seule fois**, pour être recopié ou imprimé.
- Créer ou remplacer le code fait cesser l'ancien et **ferme toute autre session ouverte**. La
  session de l'éditrice reste ouverte.
- Le code ne sert **qu'une fois**. Quand l'éditrice entre par lui, il cesse d'ouvrir, toute autre
  session est fermée, et un **nouveau code** s'affiche aussitôt, une seule fois, avant l'accueil.
- La présentation d'un code de secours compte dans le seuil de vingt tentatives de connexion par
  heure et par origine (FR-007), comme la soumission d'une adresse ou d'un code de connexion.
- **BREAKING (spec)** : les sessions simultanées ne coexistent plus sans condition. Le remplacement
  ou l'emploi du code de secours les ferme toutes sauf celle de l'éditrice.

## Points tranchés

Le détail est dans `design.md` § Decisions. Les points 1 et 3 ont été arbitrés avec l'humain le
2026-11-08.

1. **Le code naît dans l'administration.** À la livraison, l'éditrice ouvre sa session par l'adresse
   autorisée, sur son appareil, accompagnée par l'intégrateur. Elle crée le code depuis l'écran
   « Code de secours » et le note sur papier. C'est le même écran que le remplacement : un seul chemin
   de création, et le code ne passe par aucun terminal. Isometria ne le voit jamais. ADR-0032 l'arrête
   ainsi, contre le candidat qui écartait un code né dans une session déjà ouverte. Avant ce geste,
   l'instance n'a pas de code de secours, et l'écran le dit.
2. **Un code de 128 bits, haché, sans frein propre.** L'entropie seule rend la devinette sans objet,
   en ligne comme hors ligne (ADR-0032). Aucun compteur d'essais ne le brûle : un attaquant qui
   entretiendrait des échecs priverait l'éditrice de son dernier recours.
3. **Usage unique, renouvelé à l'emploi, autres sessions fermées.** Le papier ne reste pas une porte
   permanente, et l'éditrice n'est pas laissée sans filet au sortir de la panne. Fermer les autres
   sessions à ce moment chasse un intrus entré par la boîte perdue.
4. **Un refus unique.** Un code faux, déjà servi, ou présenté sur une instance qui n'en a pas, rend
   le même écran : il ne dit jamais lequel.

## Capabilities

### New Capabilities

- `moyen-de-reprise` : l'ouverture de session par le code de secours sans message (FR-010) ; sa
  forme et sa conservation en empreinte seule (FR-011) ; sa création et son remplacement depuis une
  session ouverte, avec affichage unique (FR-009, FR-012) ; son usage unique et son renouvellement à
  l'emploi ; la fermeture des autres sessions ; le refus unique ; son compte dans le seuil par
  origine.

### Modified Capabilities

- `connexion-par-code` : l'exigence « La fin de session automatique » dit aujourd'hui que les
  sessions simultanées coexistent sans que rien ne les ferme. Elle reconnaît désormais l'exception
  du code de secours. Le seuil de vingt tentatives par origine reste inchangé dans cette capacité :
  c'est `moyen-de-reprise` qui y fait compter la présentation d'un code de secours.

## Impact

- **Code** : une route d'administration nouvelle pour la présentation du code (non gardée, comme
  `connexion.astro`, mais important le garde, `I6`) ; un écran « Code de secours » gardé et sa route
  d'écriture ; un magasin du code de secours dans `src/platform/auth/` ; la forme du code (engendrer,
  normaliser, grouper) dans `src/core/auth/` ; la fermeture des autres sessions dans
  `src/platform/session/` ; les textes dans `src/admin/textes.ts` ; un lien depuis l'écran Réglages.
- **Base** : une migration additive crée la table du code de secours (une ligne au plus).
- **Architecture** : aucune relation nouvelle dans le modèle LikeC4.
- **ADR** : ADR-0032, accepté le 2026-11-08 avant les tickets, promu depuis le candidat
  `moyen-de-reprise-code-128-bits-hache` et amendé sur la naissance du code dans l'administration et
  la fermeture des autres sessions.
- **Tests** : intégration dans workerd ; SC-020 joué en recette, boîte de recette rendue
  inaccessible.
- **Hors périmètre** : le remplacement de l'adresse autorisée (FR-013, FR-014, story suivante) ;
  l'outillage de livraison et le dossier d'instance qui note où le papier est rangé (Epic D,
  FR-112) ; tout moyen de reprise autre que le code (passkey, seconde adresse) ; toute liste des
  sessions ouvertes offerte à l'éditrice.
