# ColibriCMS

## Vue d'ensemble
- Objet : CMS auto-hébergé chez le client (Cloudflare, palier gratuit), pour un site vitrine
  statique éditable par une cliente non technicienne, qui survit à la disparition d'Isometria.
- Le "quoi" produit (vision, FR, SC) : `docs/vision.md` — la feuille de route : `docs/roadmap.md`.
- Ce que le code s'interdit : `docs/architecture.md` (invariants `I1`–`I10`) — NE PAS franchir un
  invariant. Tests : `docs/test.md` — Sécurité : `docs/security.md` — Interface : `docs/design-system.md`.
- Décisions figées : `docs/adr/` — NE PAS contredire un ADR accepté ; numérotation 2.x, les corps
  citent les numéros 1.x (voir `docs/adr/README.md`). Les décisions non encore promues sont dans
  `docs/adr/_candidates/` — un candidat n'est pas figé.
- Ce que la CI vérifie : `docs/ci.md` — elle **annote**, elle ne bloque plus (voir plus bas).
- L'ancien cadrage (cycle 1.x, chantiers, preuves, research, socle de livraison) est **archivé** sous
  `docs/legacy/` — référence historique, pas la réalité courante.

## Glossaire du domaine (les mots du métier, pas ceux du code)
- **Éditrice** — la cliente, seule utilisatrice de l'administration, sans notion technique.
- **Intégrateur** — Isometria : pose les gabarits et les emplacements, hors administration.
- **Emplacement** — zone éditable posée par l'intégrateur dans un gabarit ; l'éditrice la remplit,
  elle n'en crée aucune et ne compose aucune page.
- **Brouillon** — état non publié d'une **page**, d'un **réglage** ou d'un **formulaire** : les
  trois — et seuls — objets publiables du produit.
- **Aperçu** — le brouillon rendu tel qu'il sera publié, jamais atteignable du site public.
- **Publication** — le geste explicite qui met le site public à jour ; rien ne part en ligne sans lui.
- **Demande** — une soumission du formulaire de devis, acheminée à l'adresse autorisée ET inscrite
  dans une liste où elle porte une **suite** que l'éditrice renseigne (sans suite, devis envoyé,
  commande).
- **Adresse autorisée** — l'unique adresse e-mail qui ouvre l'administration et reçoit les demandes.
- **Moyen de reprise** — secret non e-mail remis à la livraison, qui ouvre l'administration le jour
  où l'adresse autorisée ne répond plus.

## Cycle de travail — scd-spec-dev (OpenSpec)
- Le cadrage **durable** vit dans `docs/` (vision, roadmap, architecture, test, security,
  design-system) + `docs/adr/`. On n'y touche pas au fil d'un change.
- Diff descriptible en une phrase, sans nouveau comportement → **direct**.
- Nouveau comportement / multi-fichiers → un **change** OpenSpec : `openspec/changes/<x>/`
  (proposal + deltas `specs/` + design, options test-plan/security-review/ux) via `/opsx:propose`.
  - Décomposition en **tickets** verticaux via `/scd-spec-dev:tickets` →
    `openspec/changes/<x>/tickets/NN-*.md` (granularité arbitrée avec l'humain).
  - Implémentation **ticket par ticket** via `/scd-spec-dev:run` — **une PR par ticket**.
  - Les specs vivantes sont dans `openspec/specs/<capability>/spec.md` (fusionnées à l'archivage).
- Décision structurante nouvelle → un **ADR** (`docs/adr/`), jamais figée dans un design.md jetable.
- **RÈGLE CARDINALE : on n'appelle JAMAIS `/opsx:apply`.** `/scd-spec-dev:run` prend le relais sur
  les tickets. La rigueur passe par la **review** en contexte frais (producteur ≠ vérificateur),
  pas par des gardes automatiques.

## Commandes (source de vérité : `docs/ci.md` — s'y reporter, ne pas diverger)
- Installation : `npm ci` — jamais `npm install`
- Typage : `npm run typecheck`   # `tsc --noEmit` — le build seul ne type pas
- Build : `npm run build`         # `astro build` — lancer `typecheck` **puis** `build`
- Test : `npm test`               # dans `workerd` ; préférer un seul test, pas toute la suite
- Lint/format : `npm run lint`    # SOURCE DE VÉRITÉ du style — ne pas documenter les règles ici
- Run local : `npm run dev`       # `astro dev`, liaisons D1 branchées via `wrangler.jsonc`

## Invariants produit non-négociables (voir `docs/architecture.md` + `docs/adr/`)
- Zéro traitement serveur sur une page publique hors l'envoi d'une demande de devis (FR-097) — le
  site public reste statique. Toute nouvelle route serveur sur le public est un signal d'alerte à
  interroger avant d'écrire.
- Aucun identifiant appartenant à Isometria dans le code ou la config — chaque secret introduit est
  un secret du compte client, sinon la révocation des accès d'Isometria casse le site (SC-012/SC-013).
- Aucun terme de développeur (commit, branche, build, déploiement…) dans un texte visible par
  l'éditrice — elle n'a aucune notion technique (FR-117).

## Definition of Done (une tâche n'est "done" que si)
- [ ] Typage strict + build passent (`npm run typecheck` **puis** `npm run build`)
- [ ] Tests passent (`npm test`)
- [ ] Lint propre (`npm run lint`)
- [ ] Rien hors périmètre de la tâche n'a été modifié
- [ ] Preuve fournie (sortie de commande réelle), pas seulement "ça a l'air fait"
> Ces contrôles **ne bloquent plus la PR** : la CI est informative (voir `docs/ci.md`). La garantie
> vient de la review du cycle `scd-spec-dev`, pas d'un portail de gardes — les respecter reste la DoD.

## État de la CI (informative, ne bloque pas)
- Le ruleset « Main protect » n'exige **aucun** status check ; il ne garde que le structurel : PR
  obligatoire vers `main`, anti-force-push, anti-suppression de `main`.
- `.github/workflows/ci.yml` exécute `build` et `test` (non requis) ; `scd-escape-hatch-guard.yml`
  `git grep` les escape-hatches (`@ts-ignore`, `as any`, `eslint-disable`, `.skip(`…) et **annote**.
  Un rouge se voit, il ne bloque pas la fusion. Un escape-hatch légitime se **déroge en review**.
- Plus de portail à douze bloquants, plus de hooks de session, plus de scopes de commit imposés ni
  de signatures SSH : ces gardes n'existent plus. Ne pas raisonner comme s'ils étaient là.

## Gotchas / comportements non-évidents
- Les tests s'exécutent dans `workerd` via `@cloudflare/vitest-pool-workers` (ADR-0003) : liaisons
  D1 et Durable Object réelles, servies localement par Miniflare (rien ne part vers un compte
  Cloudflare). Voir `docs/test.md`.
- Un seul Worker sert le site public et l'administration (**même origine**) : tout script tiers
  chargé n'importe où est un risque **XSS same-origin** contre le cookie de session admin.
- Médias : JPEG/PNG/WebP seuls, reconnus sur les octets d'en-tête (jamais l'extension ni le
  Content-Type) ; SVG refusé.
- Publication GitHub en écriture additive stricte (`force: false`), sauf l'élagage de la branche
  `media` — seul `force: true`, calculé depuis D1 et jamais depuis ce qui est lu sur la branche.

# IMPORTANT
- YOU MUST montrer la preuve (sortie de commande) au lieu d'affirmer le succès.
