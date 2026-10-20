# 07 — Noter la suite d'une demande, depuis la liste ou depuis son détail

**Bloqué par :** 05, 06
**Vérif :** tdd
**Fichiers :** `src/pages/admin/demandes/[id]/suite.ts`, `src/core/demandes/suite.ts`, `src/platform/demandes/magasin.ts`, `src/admin/ilots-svelte-5/EcranDemandes.svelte`, `src/admin/ilots-svelte-5/EcranDemande.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/MontageEcranDemandes.astro`, `src/admin/MontageEcranDemande.astro`, `src/pages/admin/demandes.astro`, `src/pages/admin/demandes/[id].astro`, `src/admin/textes.ts`, `docs/cahier-de-test.md`, `tests/unit/demandes/suite.test.ts`, `tests/integration/suite-d-une-demande.test.ts`, `tests/parcours/demandes-suite.parcours.ts`

## Ce que ça livre

L'éditrice note ce qu'elle a fait d'une demande — sa **suite** — en un seul geste, sans quitter l'écran
(FR-071, FR-072). Chaque ligne de la liste et l'écran du détail portent une liste déroulante de la suite :
« À renseigner », « Sans suite », « Devis envoyé », « Commande ».
- Une demande neuve affiche « À renseigner ». Cette valeur ne se choisit pas : l'éditrice choisit l'une des
  trois autres, puis peut la changer pour une autre des trois.
- La suite choisie est enregistrée dès le choix, sans autre geste, et retrouvée à tout nouvel affichage.
- Sur la liste, les nombres se mettent à jour au retour, sans recharger : choisir « Commande » fait compter
  la demande parmi les commandes.
- Quand l'enregistrement n'aboutit pas, la liste déroulante revient à la suite d'avant, et le message « La
  suite n'a pas pu être enregistrée. Réessayez dans quelques instants. » paraît sous la ligne, annoncé
  poliment aux lecteurs d'écran.
- Une demande retirée ne reçoit plus de suite.

Chaque liste déroulante est nommée, pour un lecteur d'écran, par la date de sa demande : « Suite de la
demande du 17 octobre 2026 à 14:05 ». Au téléphone, elle mesure au moins 44 px et se manie au pouce. Aucun
terme de développeur ne paraît (FR-117).

**Décisions à respecter (D4, D5, D7, D10 de l'approche ; ADR-0006, ADR-0007, ADR-0009, ADR-0011, I2, I4, I5, I6, I14) :**
- **La route.** `POST /admin/demandes/<id>/suite` (`src/pages/admin/demandes/[id]/suite.ts`), corps
  `{ suite }`, sur le patron de `src/pages/admin/formulaires/[id]/options.ts` :
  - `verifierSession` en tête ; sans session → 401, rien ne change ;
  - corps borné par `lireCorpsJsonBorne` ; illisible ou trop gros → 400 ou 413 ;
  - la valeur est comparée à la liste fermée des trois suites de `src/core/demandes/suite.ts` (pur) ;
    `a-renseigner`, une valeur inconnue, absente ou non textuelle → 400 ;
  - mise à jour conditionnée à `etat = 'presente'` ; aucune ligne touchée → 404 `introuvable` ;
  - réponse `{ ok: true, nombres }`, les nombres composés par `src/core/demandes/nombres.ts` (ticket 05).
- **Anti-forgerie** par le cookie `SameSite=Strict` (ADR-0011) ; requêtes préparées seules.
- **Les îlots.** `EcranDemandes.svelte` (liste) et `EcranDemande.svelte` (détail), Svelte 5, montés par
  `src/admin/ilots-svelte-5/monter.ts` depuis `MontageEcranDemandes.astro` et `MontageEcranDemande.astro`,
  sur le patron de `MontageEcranFormulaire.astro`. Aucune directive `client:*` (I4, ADR-0006).
- **La présentation statique reste rendue par le serveur** (tickets 03 à 06). L'îlot de la liste prend
  ses données dans un attribut `data-*` échappé par Astro ; il n'écrit qu'en liaison de texte, jamais
  `{@html}` (I5). Le filtre et la pagination restent des liens.
- **Contrôle natif** `<select>` stylé par les tokens (I14) ; aucun composant nouveau du registre
  (ADR-0009).
- **Les textes** vivent dans `src/admin/textes.ts` : intitulé de la liste déroulante, message d'échec.
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : choisir une suite
  au pouce sur un téléphone ; l'annonce du message d'échec au lecteur d'écran.
- **Parcours.** `tests/parcours/garde-politique.ts` fait échouer tout parcours qui heurte la politique de
  l'administration.
- **Doubles.** Une panne de la base par un déclencheur `raise(abort)` posé sur la mise à jour de
  `demandes`, puis retiré ; les demandes se sèment directement dans la table.
- **Cas limites à couvrir :** chacune des trois suites ; `a-renseigner` refusée ; valeur inconnue, absente,
  non textuelle ; demande inconnue (404) ; demande retirée (404) ; corps illisible, trop gros ; sans session
  (401) ; deux choix de suite successifs sur la même demande.

**Hors périmètre :**
- la sélection de demandes et le retrait (tickets 08 et 09) ;
- toute suite autre que les trois du cahier des charges, et tout historique des suites.

## Critères
- [x] Quand l'éditrice choisit « devis envoyé » pour une demande, la demande porte « devis envoyé », et la porte toujours une fois l'écran rechargé   (SC-07a)
- [x] Quand l'éditrice choisit « commande » pour une demande qui portait « devis envoyé », la demande porte « commande », et le nombre de commandes compte cette demande   (SC-07b)
- [x] Quand l'éditrice choisit une suite et que son enregistrement n'aboutit pas, l'écran dit que la suite n'a pas pu être enregistrée, sans terme de développeur, et la demande garde la suite qu'elle portait avant   (SC-07c)
- [x] Quand une suite est envoyée pour une demande déjà retirée, elle est refusée, et rien ne change dans les nombres   (SC-07d)
- [x] Quand une suite est envoyée sans session ouverte, elle est refusée, et aucune demande ni aucun nombre ne change   (SC-07e)
