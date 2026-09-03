# Durcissement du portail CI

Portée : socle
Ouvert le 2026-08-14 · branche `work/reprise-socle-v2` · HEAD `00927eb`
Actualisé le 2026-08-14 par le reversement de la campagne de recherche · HEAD `388cca0`
Actualisé le 2026-08-31 par un faux positif confirmé d'`arch-invariants` (ADR-0006, cookie) · HEAD `6dafd32`
Actualisé le 2026-09-03 par le rejeu sur l'historique et la promotion d'`arch-invariants` · branche `chore/fermer-reliquats` · HEAD `5a52998`

## Objectif
Faire monter en bloquant ce que la phase `ci` a dû laisser informatif, sur mesure et non sur
conviction — et poser les contrôles qu'elle n'a pas su écrire faute de code.

## Contexte à charger
à lire   `docs/ci.md` § Registre des ADR vérifiés et § Ce que ces contrôles ne couvrent pas (~220 l.)
à lire   `docs/research/ci-code-genere/carte.md` — l'état de la campagne close le 2026-08-14 (151 l.)
à situer `docs/research/ci-code-genere/0*.md` — les 7 rapports (~800 l.) ; conclusions déjà dans la
         carte, détail à consulter à la demande

## Acquis
- J'ai arbitré le 2026-08-14 que la promotion se ferait **par mesure, pas par urgence** : seuil de
  bascule ~10-15 % de faux positifs, dans les deux sens. **Convention, pas fait publié** — aucun taux
  de faux positifs de SAST n'est une constante publiée (Johnson et al. ; Christakis & Bird existent
  mais ne chiffrent rien ; les taux qui circulent mesurent des choses différentes).
- Deux **irréductibles** que plus de lecture ne fermera pas : aucune mesure de l'effet d'un contrôle
  CI *fixe* sur un agent qui itère contre lui, et aucun taux de capture des paquets slopsquattés par
  un SCA *en production*.
- **`arch-invariants` promu bloquant le 2026-09-03, sur mesure.** Rejeu du script courant contre
  l'historique de `001-connexion-par-code` : 3 tirs — 1 faux positif (ADR-0006, corrigé) et 2 vrais
  positifs (I5 `set:html`, I8 fuite de valeur d'instance, tous deux déjà corrigés à l'époque) —,
  **0 faux positif résiduel** après le fix. Mergé, et **ajouté au ruleset** `Main protect` (11ᵉ
  contexte, vérifié le 03/09). Porté par `94b8e35 dece4d2 137c46d ad038b8` + le ruleset.
- **La méthode de rejeu se reprend telle quelle pour `boundaries`** : faire tourner le script
  *courant* contre chaque commit *historique*, chacun dans un worktree éphémère (n'exige pas d'arbre
  propre, aucun `stash`).
- **Le fix ADR-0006 vise le poseur canonique** `enteteCookieSession`, admet la forme Astro autant que
  l'en-tête littérale, et clenche sur la *présence du poseur* (pas du fichier) pour ne pas crier avant
  qu'une session s'ouvre.

## Prochaine étape
**Rejouer `boundaries`** (I1, chaîne ESLint — jamais mesuré) pour décider sa promotion, même méthode
que pour `arch-invariants`. Puis les contrôles encore `[à compléter]` ci-dessous.

## Ce qui restait à écrire
- `[à compléter]` **le reliquat d'`I3`** — ré-exports, barils, alias qu'un grep ne voit pas, plus les
  imports profonds contournant un baril (`import-x/no-internal-modules`). Sous `boundaries` ; `I1` lui
  est déjà rendu. dependency-cruiser écarté ; **seuil de réouverture** : `typescript@7.1.0` avec API
  publique **et** extension `.astro`.
- `[à compléter]` **l'e-mail acheminé inerte** (`ADR-0009`) — gabarit inexistant, chemin non décidé ;
  aucun motif ne se dérive sans l'inventer.
- `[à compléter]` **l'ablation no-op** — remplacer un artefact critique par du vide et vérifier que
  quelque chose casse. Aucune commande ne l'exprime.
- `[à compléter]` **la base de mutants survivants** (piste 1 des reliquats du verdissement, routée
  ici) — `mutate` accepte globs/fichier/plage, `--incremental` existe ; réserve : la liste Stryker
  par défaut porte `svelte`/`vue`, **pas `astro`**.
- Le **seuil chiffré de couverture du diff**, une fois vu le code réel.
- Les **constats de maturité 2026-08-08** (socle v1) à re-vérifier à l'adoption : DMNO→varlock 1.16.1 ;
  `@lhci/cli` épingle `lighthouse` exact sans `engines` ; `pa11y-ci` fige `axe-core` 4.11.x ;
  `typescript-docs-verifier` 3.0.2 et `@eslint/markdown` 8.0.3 sans peers.
- **Snyk Code** : palier gratuit invérifiable depuis un doc — `I5` se tranche à l'inscription. Dépôt
  **public** → CodeQL ouvert.
- **Cooldown Dependabot à aligner sur 7 j** à l'activation des MàJ auto (défaut GitHub 3 j) — sinon PR
  du bot rouges 4 jours. Pas de Renovate en plus.

## La réserve qui vaut pour tous les gardes greppables
**Réprimer un comportement peut le rendre plus subtil plutôt que l'éliminer.** Aucune mesure publiée
ne tranche : ces contrôles réduisent une surface, ils ne ferment pas le sujet — un taux tombé à zéro
se lit aussi bien comme une victoire que comme un contournement appris.

## Écarté
- **Design « poseur découvert où qu'il soit »** pour ADR-0006 (2026-09-03) — plus fidèle à la lettre,
  mais `connexion.astro` pose deux cookies (session `strict`, appareil `lax`) et un grep au niveau
  fichier ne lie pas `secure`/`httpOnly` à la bonne pose : ça rouvre un faux négatif. D'où le **poseur
  canonique imposé** retenu.
- **Job maison rejouant la résolution de dépendances** pour le cooldown — échoue au facteur
  maintenance ; npm porte la clé nativement.
- **Rendre les invariants bloquants d'emblée** — l'urgence n'est pas une borne ; seul le signal
  déterministe et greppable autorise à bloquer sans taux publié.
- **`required_signatures` au ruleset** — l'agent ne pourrait plus commiter ; la signature reste portée
  par les deux gardes, sur les seuls commits concernés.
- **dependency-cruiser** — ni `.astro`, ni TypeScript 7 (seuil de réouverture ci-dessus).
- **Sheriff** — meilleur modèle conceptuel, mais mono-`.ts`, TS 5.7 max, sans release depuis fin 2025.
- **ArchUnitTS** — actif et MIT, mais zéro `astro`/`svelte` : même mur. ESLint ou rien.
- **Unlighthouse en repli de `lhci`** — exige une URL déjà servie, là où `lhci` sert le build.
