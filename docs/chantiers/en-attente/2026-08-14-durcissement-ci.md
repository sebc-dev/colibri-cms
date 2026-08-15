# Durcissement du portail CI

Portée : socle
Ouvert le 2026-08-14 · branche `work/reprise-socle-v2` · HEAD `00927eb`
Actualisé le 2026-08-14 par le reversement de la campagne de recherche · HEAD `388cca0`

## Objectif
Faire monter en bloquant ce que la phase `ci` a dû laisser informatif, sur mesure et non sur
conviction — et poser les trois contrôles qu'elle n'a pas su écrire faute de code.

## Contexte à charger
à lire  `docs/ci.md` § Registre des ADR vérifiés et § Ce que ces contrôles ne couvrent pas — les
        deux seules rubriques dont ce chantier dépend
à lire  `docs/research/ci-code-genere/carte.md` — l'état de la campagne close le 2026-08-14 et,
        sujet par sujet, ce que le comblement a tranché ou déclaré irréductible
à déléguer `docs/research/ci-code-genere/0*.md` — les 7 rapports (~800 lignes). Une question à la
        fois, jamais le contenu : ils portent le détail que les notes de la carte résument

## Acquis
- J'ai arbitré le 2026-08-14 que `coverage`, `sast` et `arch-invariants` resteraient informatifs :
  aucun n'avait jamais tourné sur du code de ce projet, et un chiffre posé sans mesure est un pari.
- J'ai retenu la mesure **par rejeu sur l'historique du dépôt**, et pas sur une fenêtre de temps :
  le volume de PR d'un développeur seul ne suffit pas à estimer un taux en temps réel.
- J'ai fixé le seuil à ~10-15 % de faux positifs, **dans les deux sens** : au-delà, un bloquant
  redescend informatif.
  > **Ce seuil est une convention, pas une mesure — la campagne l'a établi le 2026-08-14.** Les
  > deux travaux qu'on cite d'ordinaire pour le « < 20 % » (Johnson et al. ; Christakis & Bird)
  > existent et sont bien attribués, mais **aucun ne pose de seuil chiffré** : le nombre vient de
  > la littérature qui les cite. Les taux qui circulent mesurent des choses différentes — un blog
  > tiers annonce 40-60 % de non-problèmes chez SonarQube quand Sonar publie 3,2 % sur 137 M de
  > remontées revues ; le « 60-90 % → 10-20 % » vient d'une page de Mend.io, qui vend du SAST.
  > **Aucun taux de faux positifs de SAST n'est une constante publiée.** Le seuil garde sa valeur
  > d'engagement pris d'avance ; il n'a pas celle d'un fait, et ne doit pas être défendu comme tel.
- La campagne a aussi buté sur deux **irréductibles**, qui ne se refermeront pas par plus de
  lecture : aucune mesure de l'effet d'un contrôle CI **fixe** sur un agent qui itère contre lui
  (les deux travaux les plus proches mesurent autre chose), et aucun taux de capture des paquets
  slopsquattés par un SCA **en production** — seulement un banc d'essai sur corpus constitué.
- J'avais noté que six ADR acceptés — `0006`, `0008`, `0009`, `0012`, `0015`, `0024` — écrivent au
  présent qu'un contrôle **bloquant** porte leur propriété. Huit clauses. C'est ce chantier qui
  ferme l'écart, et rien d'autre.

## Prochaine étape
Rejouer `.github/scripts/arch-invariants.sh` sur l'historique du dépôt une fois le scaffold posé,
compter les signalements et les trier vrai / faux, puis décider invariant par invariant.

## Ce qui restait à écrire
- `[à compléter]` **le graphe d'imports** — `I1` (sens des dépendances entre zones) et `I3` (point
  d'entrée unique du rendu). **L'outil est tranché depuis le 2026-08-14** : `eslint-plugin-boundaries`
  7.2.0 sur `eslint-import-resolver-typescript` 4.4.5, avec les parsers Astro et Svelte. Ce qui
  reste : écrire les `boundaries/elements` des cinq zones et la règle `boundaries/dependencies` en
  `default: "disallow"` dans `eslint.config.*`, déclarer les modules virtuels `astro:*` en
  `import/core-modules` (leur oubli est la première cause de faux positifs), et ajouter
  `import-x/no-internal-modules` si l'on veut aussi fermer les imports profonds qui contournent un
  baril — `boundaries` ne le fait pas. Viser **zéro violation fantôme** au run à blanc : une
  violation légitime qui remonte est presque toujours un alias ou un module virtuel mal configuré,
  à corriger avant d'assouplir la règle.
- `[à compléter]` **la composition inerte de l'e-mail acheminé** (`ADR-0009`) — le gabarit n'existe
  pas, son chemin n'est pas décidé, et aucun motif ne se dérive sans l'inventer. La cinquième porte
  reste ouverte à la CI tant que ce contrôle manque.
- `[à compléter]` **l'ablation no-op** — remplacer un artefact critique par une implémentation vide
  et vérifier que quelque chose casse. Aucune commande réelle ne l'exprime aujourd'hui.
- `[à compléter]` **la base de référence des mutants survivants** — sans elle, le premier vrai run
  de mutation remonte l'intégralité du corpus comme nouveau. Deux faits mesurés le 2026-08-14 qui
  la rendent posable : `mutate` accepte des globs, un fichier seul et même une plage de lignes, et
  `--incremental` existe — la base peut donc naître d'un sous-ensemble plutôt que du corpus entier.
  Réserve : la liste de fichiers par défaut de Stryker porte `svelte` et `vue`, **pas `astro`**.
- Le **seuil chiffré de couverture du diff**, à poser une fois qu'on aura vu ce que le code réel
  produit.
- Les **constats de maturité datés du 2026-08-08**, repris de l'archive du socle v1 : à
  re-vérifier à l'adoption, sur le dépôt et le registre, jamais sur une page de présentation. La
  campagne en a déjà repris quatre le 2026-08-14, à ne pas remesurer : **DMNO** est en mode
  maintenance déclaré par son propre éditeur, qui renvoie à **varlock** (1.16.1) — le choix n'en
  est pas un ; **`@lhci/cli@0.15.1`** épingle `lighthouse` en version exacte `12.6.1` et ne déclare
  **aucun `engines`**, donc aucun avertissement le jour où le runner montera de majeure ;
  **`pa11y-ci@4.1.1`** embarque ses deux runners, navigateur compris, avec `axe-core` figé en
  4.11.x quand le registre porte 4.13.0 ; **`typescript-docs-verifier`** est en 3.0.2 du 2026-03-02
  et **`@eslint/markdown`** en 8.0.3 du 2026-07-01, sans `peerDependencies`.
- **Le palier gratuit de Snyk Code ne se vérifie pas depuis un document** : ni la page tarifaire ni
  les 558 ko de documentation ne disent s'il exige un moyen de paiement, et la seule source qui
  l'affirme date de mai 2021. Le socle `I5` se tranche donc **à l'inscription**, sur le compte.
  Point acquis en revanche : le dépôt est **public** (`visibility: public`), donc CodeQL est
  ouvert — la condition que posait le rapport est remplie.
- **Le cooldown Dependabot, à aligner sur 7 jours** au moment où l'on activera les mises à jour
  automatisées. Le défaut de GitHub est 3 jours depuis le 14 juillet 2026 : le laisser désaligné du
  `min-release-age=7` de `.npmrc` produit des PR du bot **qui échouent en CI pendant quatre jours**
  — le paquet est proposé avant d'être installable. Les mises à jour de sécurité ne sont jamais
  retardées, des deux côtés. Et ne pas ajouter Renovate en plus : l'un ou l'autre.

## La réserve qui vaut pour tous les gardes greppables
**Réprimer un comportement peut le rendre plus subtil plutôt que l'éliminer.** Aucune mesure
publiée ne tranche. Ces contrôles réduisent une surface, ils ne ferment pas le sujet — et un taux
de faux positifs qui tomberait à zéro se lirait aussi bien comme une victoire que comme un
contournement appris.

## Écarté
- **Un job maison qui rejoue la résolution de dépendances** pour tenir le cooldown — il échoue au
  facteur maintenance, et npm porte la clé nativement.
- **Rendre les invariants bloquants d'emblée** parce que six ADR le demandent : l'urgence n'est pas
  une borne, et la seule qui autorise les gardes d'intégrité à bloquer sans taux publié est leur
  signal déterministe et greppable.
- **`required_signatures` au ruleset** — l'agent ne pourrait plus commiter du tout ; l'exigence de
  signature reste portée par les deux gardes, sur les seuls commits concernés.
- **dependency-cruiser** pour le graphe d'imports (2026-08-14) — écarté sur deux constats
  indépendants : `.astro` absent de sa table d'extensions, et `typescript >=2.0.0 <7.0.0` quand la
  7.0.2 est la version courante du registre. **Seuil de réouverture** : `typescript@7.1.0` livrée
  avec une API publique **et** l'extension `.astro` ajoutée — les deux, pas l'une. Il resterait
  alors utile en complément, pour la visualisation et la détection de cycles, jamais comme porte.
- **Sheriff** — le meilleur modèle conceptuel (le baril comme API publique), mais mono-`.ts`,
  testé jusqu'à TS 5.7, sans release depuis fin 2025 et dépendant de l'API du compilateur.
- **ArchUnitTS** (npm `archunit`) — actif et MIT, mais **zéro occurrence d'`astro` et de `svelte`**
  dans tout son dépôt : il bute sur le même mur. Pour ce projet, c'est la chaîne ESLint ou rien.
- **Unlighthouse en repli de `lhci`** — il sait bien faire échouer un job (`--budget N`, code de
  sortie 1), mais il exige un `--site`, donc une URL **déjà servie**, là où `lhci` sert lui-même le
  build. Ce n'est pas un repli équivalent sur ce portail.
