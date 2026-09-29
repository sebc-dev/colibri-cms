# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · Actualisé le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `540ae7e`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `.claude/quality.json` — la gate : six checks, six agents, pas d'applier (41 l.)
à lire      `stryker.conf.json` — le montage du rejeu complet qui reste à jouer (11 l.)
à situer    `.claude/agents/quality-*.md` — les six diagnostiqueurs posés ; leur bloc
            d'instructions est co-écrit et s'édite à la main, ne pas les relire pour reprendre
à situer    `docs/ci.md` › encadré « `npm run mutation` » — porte désormais le montage, la preuve et
            la politique de lecture du chiffre ; à relire avant de publier un score, pas avant
à situer    `docs/adr/0013-profondeur-des-tests-mesuree-par-la-mutation.md` — la question que je lui
            posais est tranchée et l'ADR reste intact : ne pas le rouvrir

## Acquis
- **J'ai tranché : ADR-0013 n'est pas à réexaminer.** Sa prémisse — le mutant emporté par le build
  jusque dans le worker bâti — tient dès lors que le mutant s'active. Je n'ai pas touché à l'ADR.
- Export mort confirmé à la lecture : la variante D1 de `pagePorteUnBrouillon`
  (`src/platform/brouillons/magasin.ts`) n'a aucun appelant, les deux routes prennent la version pure.
- Trous de la gate restants : le `scope` de `.claude/quality.json` est sans effet (les commandes sont
  globales), et aucun agent dédié n'existe (`checks[].agent`, `applier` absents).
- Outillage : `--incremental false` et `--no-incremental` n'existent pas côté CLI (l'argument est pris
  pour un fichier de config) — pour ignorer l'historique, pointer `--incrementalFile` vers un chemin neuf.
- En amont : le paquet a été renommé `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`
  en 1.0.0 ; notre nom est gelé à `0.22.0` (nous résolvons `0.20.3`), le nouveau est à `1.1.6`.
  Codemod officiel, et la seule rupture (MSW ≥ 2.14) ne nous touche pas.
- **J'ai arrêté l'ordre restant** : retirer ce qui prétend faussement (le `scope`), `knip` en
  informatif, les agents par check, puis un rejeu complet quand le reste est stable — je l'ai chiffré
  à ~2 h 45 à la cadence mesurée. Rien ne monte côté CI.
- **Les trois premières étapes de l'ordre sont franchies** (67b86d7 → 9ead843). Le `scope` est
  retiré : mesuré, il valait 1,19 s sur 29,4 s, et il aurait été FAUX sur `boundaries`, qui juge les
  arêtes sortantes — un module déplacé rend fautifs des appelants non modifiés, qu'un diff ne voit
  pas. Pas réparable finement : le contrat n'a pas de `scope` par check. `knip` est entré en avis
  (1,9 s), au vert. Les six diagnostiqueurs sont posés, sans applier : aucun de nos checks n'est une
  métrique-oracle tant que `mutation` reste hors de la liste.
- La gate complète coûte **29,4 s** : typecheck 2,4 · lint 1,5 · boundaries 1,6 · build 5,2 ·
  test 16,8 (build inclus par `pretest`) · knip 1,9.

## Prochaine étape
Le rejeu complet de mutation, la dernière étape de l'ordre — ~2 h 45 à la cadence mesurée, à jouer
au premier plan et borné. C'est lui qui décidera si `mutation` entre dans `.claude/quality.json` ; et
c'est son entrée qui justifiera alors un applier du projet (le mutant survivant est le seul défaut
qu'aucune édition de production ne répare).

## Écarté
- **Quatorze des dix-huit constats SonarLint du 10/09 — vérifiés un par un, laissés.** Six sont des
  faux positifs : `S6959` (`reduce` sans valeur initiale, `texte-riche.ts:186` — la garde
  `candidats.length === 0` est la ligne juste au-dessus), `S7758` (`fromCharCode` →
  `fromCodePoint`, `ingestion.ts:249` — on lit le FourCC d'un en-tête WebP, quatre octets, pas du
  texte Unicode), `S6564` (`type IdentifiantImage = string`, `references.ts:24` — alias de domaine
  délibéré) et `S3516` ×3 (`magasin.ts:143,189,232` — les `enregistrerCorrection*` rendent toujours
  `resultat`, mais par sorties anticipées qui sautent l'écriture ; le vrai travail est l'effet de
  bord). Sept portent sur `src/admin/composants/ui/`, déjà dans l'`ignore` de `knip.json` :
  `S4782` ×2 (`?` + `undefined` du patron shadcn) et `S7763` ×5 (`Root` DOIT passer par un import,
  il est ré-exporté sous deux noms). Un est contestable : `S3776`, complexité 19>15 de
  `lireDimensionsJpeg` — c'est la complexité du FORMAT (marqueurs sans segment, EOI, longueurs,
  SOF), l'extraire la déplacerait ; aucun seuil n'est engagé, la gate n'a pas de check de complexité.
  Les quatre autres ont été traités : `S8786` (d816ec3 + 9ead843), `S6606` ×2 (d7190f0),
  `S1874` (39cdd95).
- **Injecter le mutant par les liaisons Miniflare — inutile.** `define` plus un module de setup
  suffisent ; un binding serait arrivé dans `env`, pas dans `process.env`, faute de `nodejs_compat`.
- **Alléger la commande de test pour accélérer le rejeu — morte, et mesurée.** Restreindre aux étages
  statique et unitaire descend le rejeu de 19 s à 3,9 s, mais retire l'intégration de l'oracle et
  fabrique de faux rescapés : `trierPagesDeclarees` y sort à 0 % alors que la suite complète tue bien
  le mutant du tri. Le build par mutant n'est pas du gaspillage — c'est lui qui porte la mutation.
- **Brider la concurrence — sans objet.** La péremption venait du seuil seul ; la machine sature
  (2,8× pour onze processus), brider n'aurait ni coûté ni rapporté.
- **Resserrer le périmètre muté à `src/core/` — mauvais rapport.** `platform/` ne pèse que 256 mutants
  sur 1321 : on abandonnerait la couche qui touche D1 pour un cinquième du temps, contre l'ADR.
- **Retirer la mutation — écarté en l'état.** ADR-0013 range « renoncer à tout indicateur de
  profondeur » parmi ses alternatives écartées ; le geste demanderait un ADR qui le supersède.
- Sourcemaps pour ramener la couverture sur `src/`, et fournisseur V8 — tous deux morts et mesurés,
  avec leur condition de réouverture, désormais portés par ADR-0013 § Alternatives considérées.
- Exclure `.wrangler/**` de la couverture — le rapport paraîtrait plus propre en mesurant beaucoup moins.
- Poser un seuil de couverture nu — `docs/test.md` la veut informative, et un seuil sur une mesure
  visant le bundle serait un mensonge chiffré.
- Ajouter un outil de duplication — les volumes ne le justifient pas, et il n'y a ni `TODO` ni
  escape-hatch nulle part.
- Rendre des checks bloquants **côté CI** — la CI est informative par décision du 2026-09-06, et
  promouvoir un garde touche trois surfaces ; la gate du cycle `run` est le bon endroit.

## Issue
Livré par la PR #80 (fusion `abdcc52`, 34 commits). L'ordre que la fiche s'était donné est franchi
en entier, et sa dernière étape a changé de nature : le rejeu complet n'est plus un travail à faire,
c'est une **tâche récurrente** — timer systemd `colibri-mutation` à 01:07, un jour sur deux en
incrémental, un passage complet le dimanche, mesure dans un worktree détaché sur `origin/main`, et
tri des survivants par l'agent `mutation-analyste` en lecture seule. Les rapports datés arrivent
dans `~/.local/state/colibri-mutation/rapports/`, le dernier en `dernier.md` ; l'unité n'échoue que
si la mesure est impossible ou si le score baisse.

Ce que la session a livré au-delà du montage de la gate : une **exécution de code à distance
critique** d'Astro corrigée (GHSA-26w7-cxv4-gfx2, 7.2.0 → 7.2.10, avec `sharp` 0.35.4 emporté), et
un bug où **un lien disparaissait** du texte riche dès que son libellé contenait un crochet — le
motif d'analyse, quadratique de surcroît, ne savait pas relire la séquence échappée que
`echapperTexte` produit pourtant toujours.

Ce qui n'est pas fait et ne relève plus de cette fiche : la cascade
`wrangler` → `miniflare` → `@cloudflare/vitest-pool-workers`, qui rendra son `^` à Astro et dont
`svgo` dépend aussi ; et le traitement des survivants du premier vrai relevé, qui mérite sa propre
fiche quand le rapport sera là.
