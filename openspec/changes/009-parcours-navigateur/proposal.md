## Why

Tout ce que l'éditrice touche dans l'administration passe par du code exécuté dans son navigateur —
le cadre (repli, tiroir), le montage des îlots, l'envoi d'une correction, la marque de brouillon qui
apparaît après un enregistrement — et aucun test automatique n'exécute ce code : les tests tournent
dans `workerd`, côté serveur, et ne voient ni la page servie, ni la politique de sécurité réellement
appliquée par un navigateur. Le défaut le plus coûteux qui ait échappé aux tests en est la preuve : la
directive `connect-src` manquante (PR #72) bloquait toute correction au navigateur alors que le serveur
était vert. Seule la recette, déroulée à la main, l'a vu. Le relevé de couverture du 2026-10-03
(chantier `trous-de-couverture`) confirme le trou : environ 640 lignes de modules navigateur et 1 550
lignes de composants d'îlots ne sont exercées par aucun test.

L'étage « Parcours » de la pyramide (`docs/test.md`) est décidé depuis ADR-0014 (Playwright pour les
parcours) et reste « à venir ». Ce change l'ouvre.

Comme 002 et 005, ce change ne sert **aucun FR propre** : c'est un substrat de vérification pour les
features de l'**Epic A — Entrer et éditer** (`docs/roadmap.md`). Il protège ce qu'elles ont déjà livré
— en particulier **SC-003** et **SC-015** (l'éditrice corrige seule un emplacement) et **FR-117** (aucun
terme de développeur) — contre les régressions qu'aucun test serveur ne peut voir. Il ne figure pas à
la roadmap, qui ne recense que des stories produit ; le rattachement se fait ici.

## What Changes

- **Un étage de parcours dans un vrai navigateur.** Des parcours rejouent, dans Chromium, des gestes de
  l'éditrice contre le Worker bâti, servi en local avec sa base locale — la même page, les mêmes
  en-têtes, la même politique de sécurité que ce qu'un navigateur reçoit en production.
- **Un parcours pilote.** L'éditrice, déjà entrée, ouvre l'éditeur d'une page, corrige le libellé
  d'un bouton d'action, enregistre ; le parcours constate que la correction est acceptée, que la marque
  de brouillon apparaît sans recharger l'écran, et qu'après rechargement la correction est toujours là.
  Pendant tout le parcours, **aucune violation de la politique de sécurité** n'est tolérée.
- **Le pilote éprouve d'abord le dispositif.** Avant tout geste, il vérifie que le Worker servi en
  local pose bien les en-têtes de sécurité de l'administration — sans quoi un parcours vert ne
  prouverait rien de ce que voit un navigateur en production.
- **Entrer sans e-mail, sans porte dérobée.** Le parcours entre dans l'administration par une session
  semée directement dans la base locale et un cookie posé par le navigateur de test. **Aucune route,
  aucun drapeau, aucune branche de code de test n'est ajouté au produit.**
- **Une commande dédiée** pour jouer les parcours en local, distincte de `npm test`.
- **Un job de CI informatif** qui joue les parcours sur chaque PR, une fois le pilote stable — il
  annote, il ne bloque pas, comme le reste de la CI (`docs/ci.md`).

Hors-périmètre :
- Les tests de composants montés seuls dans un navigateur (mode navigateur de Vitest) : une décision
  distincte, qui appellera son propre ADR si la logique des gros îlots le justifie.
- Toute simulation de navigateur dans Node (jsdom, happy-dom) : écartée, ce n'est pas l'oracle du
  produit (ADR-0014).
- Les parcours au-delà du pilote (téléversement d'une image, connexion par code de bout en bout,
  réglages, site public) : ils viendront parcours par parcours, une fois le dispositif éprouvé.
- La mesure de couverture du code navigateur par les parcours.
- L'épreuve de réversibilité scriptée (SC-011), autre élément « à venir » d'ADR-0014.

## Capabilities

### New Capabilities
Aucune. Ce change est de l'outillage de vérification : aucun comportement de l'éditrice, de la
visiteuse ni de l'intégrateur ne change, et aucune spec vivante n'est créée. Le `.openspec.yaml` pose
`skip_specs: true` ; les critères observables des tickets sont portés par `test-plan.md`.

### Modified Capabilities
Aucune.

## Impact

- **Tests** : un nouvel étage `tests/parcours/`, écarté de la collecte de Vitest ; une configuration
  Playwright ; une préparation de la base locale (migrations, session semée) propre aux parcours.
- **Dépendances** : `@playwright/test` en dépendance de développement, et le navigateur Chromium qu'il
  installe. Aucune dépendance d'exécution du produit.
- **Commandes / CI** : une commande npm dédiée ; un job informatif dans `.github/workflows/ci.yml`, et
  sa ligne dans `docs/ci.md`.
- **Documents durables** : `docs/test.md` verra l'étage « Parcours » passer de « à venir » à présent —
  mise à jour faite par le ticket qui livre le pilote, pas au fil de la conception.
- **Code produit, site public, politique de sécurité, données** : inchangés. Les invariants **I6**
  (garde de session sur toute route d'administration) et **I13** (cookie de session composé en un seul
  lieu) sont tenus : le parcours ne crée aucune route et ne compose aucun en-tête `Set-Cookie`.
- **Décisions** : aucune nouvelle décision structurante — ADR-0014 a déjà décidé Playwright pour les
  parcours. Le choix du serveur local et de l'entrée par session semée est consigné dans `design.md`.
