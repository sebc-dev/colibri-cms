# ColibriCMS
<!-- Propriétaire : @sebc-dev — Revue : /2 semaines — Règle : supprimer plus qu'on n'ajoute. Mettre à
     jour quand : erreur refaite une 2ᵉ fois · revue qui attrape ce que Claude aurait dû savoir ·
     même correction retapée · contexte qu'un nouveau coéquipier aurait cherché. Entretien :
     /scd-sdd:init — elle RÉVISE section par section, elle ne ré-assemble jamais. -->

## Vue d'ensemble
- Objet : CMS auto-hébergé chez le client (Cloudflare, palier gratuit), pour un site vitrine
  statique éditable par une cliente non technicienne, qui survit à la disparition d'Isometria —
  voir `docs/1.x/brief.md` (archivé — cycle 1.x)
- Le "quoi" produit : `docs/1.x/prd.md` — Les fondations techniques : `docs/1.x/stack.md`
- Ce que le code s'interdit : `docs/1.x/archi.md` — NE PAS franchir un invariant
- Décisions figées : `docs/adr/` — NE PAS contredire un ADR accepté ; les décisions héritées
  sont dans `docs/1.x/adr/`, en attente de promotion depuis `docs/adr/_candidates/`
- Ce qui est vérifié automatiquement : `docs/ci.md` — les contrôles bloquants font foi ; l'état de
  chaque contrôle (bloquant/informatif) y est explicite, ne pas le supposer

## Commandes (reprises de docs/ci.md — s'y reporter, ne pas diverger)
- Installation : `npm ci` — jamais `npm install`
- Build : `npm run build`
- Typage : `npm run typecheck`
- Test (unitaire) : `npm test`   # préférer un seul test, pas toute la suite
- Lint/format : `npm run lint`        # SOURCE DE VÉRITÉ du style — ne pas documenter les règles ici
- Run local : `npm run dev`   # `astro dev`, liaisons D1 branchées via `wrangler.jsonc`

## Conventions qui diffèrent des défauts du langage
- Commit touchant la config qualité (`eslint.config.*`, `tsconfig*.json`, `.npmrc`,
  `.github/workflows/**`, `CLAUDE.md`…) porte un scope explicite (`chore(config):`, `chore(ci):`,
  `build(ci):`, `chore(agent):`) ou la PR porte le label `config-change` — **parce que**
  `quality-config-guard` bloque sinon toute modification silencieuse de ce qui contraint l'agent.
- Commit touchant le lockfile ou les dépendances porte `build(deps):`, `chore(deps):` ou
  `fix(deps):`, ou le label `deps` — **parce que** `dependency-review` distingue ainsi une
  évolution déclarée d'une dérive silencieuse.

## Workflow imposé
- Explorer + planifier AVANT de coder (plan mode) pour toute tâche multi-fichiers
- Typecheck + tests + lint AVANT de considérer une tâche terminée

## Principes non-négociables & seuils (constitution fondue)
- Diff descriptible en une phrase → direct. Multi-fichiers / nouveau comportement → cycle
  `/scd-sdd:spec` puis `/scd-sdd:tickets`. Décision transverse → nouvel ADR.
- Zéro traitement serveur sur une page publique hors l'envoi d'une demande de devis (FR-097) — le
  site public reste statique (FR-095/096). Toute nouvelle route serveur sur le public est un
  signal d'alerte à interroger avant d'écrire.
- Aucun identifiant appartenant à Isometria dans le code ou la config — chaque secret introduit
  est un secret du compte client (invariants `I1`/`I4` du Brief), sinon la révocation des accès
  d'Isometria casse le site (SC-012, SC-013).
- Aucun terme de développeur (commit, branche, build, déploiement…) dans un texte visible par
  l'éditrice — elle n'a aucune notion technique (FR-117).

## Definition of Done (une tâche n'est "done" que si)
- [ ] Build + typage strict passent (`npm run typecheck` **puis** `npm run build` — `astro build`
      seul ne type pas) — **bloquant**, job `build`
- [ ] Tests passent (`npm test`) — **bloquant**, job `test`
- [ ] Lint propre (`npm run lint`) — **advisory** : job `lint` informatif, pas bloquant à ce jour
- [ ] Rien hors périmètre de la tâche n'a été modifié — **advisory**, aucun contrôle CI ne le vérifie
- [ ] Preuve fournie (sortie de commande réelle), pas seulement "ça a l'air fait" — **advisory**

## Gotchas / comportements non-évidents
- Le dépôt ne porte **aucun fichier de test** : `npm test` passe au vert par `--passWithNoTests` et
  `npm run coverage` produit un `coverage/lcov.info` de 0 octet. Le vert de `test` et de `coverage`
  n'atteste que l'existence du script, jamais qu'une assertion a tourné.
- `.npmrc` porte `min-release-age=7` (voir `docs/ci.md`) : une dépendance publiée il y a moins de
  7 jours est inutilisable à la résolution. L'assouplir exige un commit
  `chore(config):` (ou label `config-change`), jamais en silence.
- `verifier-guard` (bloquant) refuse tout `@ts-ignore`, `eslint-disable`, `as any`, `catch {}`
  vide, `nosemgrep`… non accompagné d'un commit signé SSH (clé dans `.github/allowed_signers`) —
  ne jamais neutraliser un vérificateur sans signature humaine.
- `test-integrity` (bloquant) refuse sans appel tout `.skip(`/`.only(`/`.todo(`/`.fixme(`/`xit(`/
  `xdescribe(` ajouté à un test. Supprimer ou affaiblir un test reste possible mais exige un
  commit signé.
- `specs-integrity` (bloquant) exige un commit signé pour toute modification de
  `specs/**/SPEC.md`, et pour toute ligne d'un ticket `specs/**/NN-*.md` **autre
  qu'une case** (`- [ ]` ↔ `- [x]`, libres) — ne jamais réécrire une exigence pour la faire
  correspondre au code écrit ; c'est la cible qu'on déplacerait, pas le code qu'on corrigerait.
- `lint`, `coverage`, `sast`, `arch-invariants`, `boundaries` sont **informatifs**, pas bloquants
  aujourd'hui (voir chantier de durcissement CI) — un rouge ne bloque pas la PR ; ne pas les
  traiter comme une garantie.
- `boundaries` (graphe d'imports) est posé pour la matrice `I1` **seule** — `npm run lint:boundaries`,
  règles dans `eslint.config.boundaries.js`. Le reliquat d'`I3` qu'un contrôle littéral ne voit pas
  (ré-exports, barils, alias) reste `[à compléter]` dans `docs/ci.md` : trou de la phase `ci`, pas à
  inventer ici.
- Merge GitHub en mode `merge` uniquement — jamais squash/rebase dans l'UI : ça casserait la
  chaîne de signature dont dépendent `verifier-guard`, `specs-integrity` et `test-integrity`.
- Un seul Worker sert le site public et l'administration (même origine) : tout script tiers
  chargé n'importe où est un risque XSS same-origin contre le cookie de session admin.
- Médias : JPEG/PNG/WebP seuls, reconnus sur les octets d'en-tête (jamais l'extension ni le
  Content-Type) ; SVG refusé.
- Publication GitHub en écriture additive stricte (`force: false`), sauf l'élagage de la branche
  `media` — seul `force: true`, calculé depuis D1 et jamais depuis ce qui est lu sur la branche.

# IMPORTANT
- YOU MUST montrer la preuve (sortie de commande) au lieu d'affirmer le succès.

<!-- À NE PAS mettre ici : garde-fou dur (→ hook PreToolUse / permissions.deny) ·
     procédure (→ skill) · contrainte de sous-arbre (→ .claude/rules/ path-scopé) ·
     préférence perso (→ ~/.claude/CLAUDE.md) · style formaté par un outil (→ linter). -->
