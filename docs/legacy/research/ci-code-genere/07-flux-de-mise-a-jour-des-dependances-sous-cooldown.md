# Doctrine de cooldown des dépendances pour un dépôt npm solo assisté d'un agent

## TL;DR
- **Adoptez un cooldown de 7 jours à l'installation via `min-release-age=7` dans `.npmrc` (le point d'application le plus important), et alignez le cooldown Dependabot sur 7 jours plutôt que de laisser le défaut de 3 jours seul.** Les incidents 2024-2026 montrent que la quasi-totalité des paquets npm malveillants sont détectés et retirés en quelques heures à quelques jours ; 7 jours couvre 8/10 des cas documentés, 3 jours en couvre déjà la majorité.
- **Combiner npm `min-release-age` (installation) ET Dependabot `cooldown` (proposition) n'est PAS une redondance inutile : les deux couches attrapent des choses différentes.** Le cooldown Dependabot ne protège que les mises à jour proposées par le bot ; il ne protège ni un `npm install` manuel, ni un agent qui installe un paquet, ni les dépendances transitives résolues au moment de l'installation. `min-release-age` est le filet de sécurité côté install — décisif dans un dépôt où un agent agit sur le code.
- **Pour un correctif de sécurité urgent, le bypass existe et est propre à chaque couche :** Dependabot et Renovate exemptent automatiquement les *security updates* du cooldown ; côté npm, on relâche via `--min-release-age=0` ou `min-release-age-exclude`. Aucune mesure empirique ne permet de trancher formellement entre 3 et 7 jours — c'est un arbitrage de risque, pas un fait établi [INCERTAIN].

## Key Findings

1. **Le mécanisme de protection est bien compris et documenté par des sources primaires.** Un cooldown exploite l'asymétrie temporelle des attaques de chaîne d'approvisionnement : le délai entre la publication malveillante et sa détection/retrait est court (heures à jours), tandis que la fenêtre où l'attaquant a préparé son attaque peut être longue. Attendre laisse les scanners de sécurité et la communauté « faire le ménage » avant que vous n'installiez.

2. **Les durées recommandées par les sources réputées convergent sur une fourchette de 3 à 7 jours, sans consensus dur.** GitHub a choisi 3 jours comme défaut Dependabot (« goldilocks zone ») ; plusieurs praticiens en sécurité recommandent 7 jours ; l'analyse d'incidents la plus citée (yossarian.net / cooldowns.dev) montre que 7 jours aurait bloqué 8/10 attaques et 14 jours toutes sauf une (xz-utils).

3. **Les points d'application sont techniquement distincts.** npm `min-release-age` agit à la résolution/installation (y compris transitives, via `--before`) ; Dependabot `cooldown` et Renovate `minimumReleaseAge` agissent à la proposition de mise à jour (PR / check `pending`). Un délai à la première couche ne devient pas automatiquement un délai à la seconde.

4. **Il existe un désaccord réel entre sources réputées sur la valeur même des cooldowns.** yossarian.net et cooldowns.dev les défendent comme « gratuits et très efficaces » ; Sonatype et certains praticiens (blog.outv.im) les qualifient de « symptôme, pas stratégie » voire de « security theater », arguant qu'ils reposent sur le fait que quelqu'un d'autre se fasse infecter en premier et qu'ils ne remplacent pas le scanning actif.

## Details

### 1. Doctrine générale : pourquoi un délai protège

Le raisonnement, formulé par William Woodruff (yossarian.net, « We should all be using dependency cooldowns », 21 nov. 2025 — source primaire, opinion argumentée), décompose une attaque type en phases : (1) préparation/compromission, (2) publication malveillante — *le chrono démarre*, (3) adoption par les utilisateurs, (4) détection par les vendeurs/chercheurs, (5) retrait par le registre. Le point clé : le gap entre (2) et (5) est « typiquement très court : heures ou jours », alors que le gap entre la compromission et la publication peut être de semaines ou mois. Un cooldown place votre installation *après* la fenêtre (2)-(5). Woodruff conclut, verbatim : « In the very small sample set above, 8/10 attacks had windows of opportunity of less than a week… an 80-90% reduction in exposure through a technique that is free and easy seems hard to beat. »

L'incitation économique est centrale : les vendeurs de sécurité (Socket, Snyk, Aikido, StepSecurity, etc.) sont financièrement motivés à détecter vite et fort, car cela leur fait de la publicité. cooldowns.dev (Martin Prpič, Red Hat) répond directement à l'objection du « free-riding » : même dans un monde où tout le monde utilise des cooldowns, les scanners continueraient à détecter tôt car c'est leur raison d'être commerciale.

**OpenSSF** (source primaire, organisme) a publié le 28 juillet 2026 un billet « What Is a Dependency Firewall? » qui décrit exactement ce mécanisme : « A minimum package-age policy creates a waiting period before a new version can be installed. A delay of 24 to 72 hours may allow maintainers, security researchers, registries, and automated analysis systems to identify suspicious releases. Package age should not be treated as proof of safety. » Noter le verbe « may » et l'avertissement final : OpenSSF présente cela comme une mesure probabiliste, pas une garantie, et évoque une fourchette de 24-72h.

**CISA** (source primaire, organisme gouvernemental), dans son alerte de mai 2026 sur Nx Console, recommande : « Wait at least three hours before pulling a new package. This gives the software community time to identify suspicious or malicious packages before they are widely downloaded. Pin software to specific trusted versions. » CISA cite un plancher de 3 heures — bien plus court que 3-7 jours — ce qui illustre l'absence de consensus chiffré ferme.

### 2. Durées : ce que disent les sources

| Source | Durée recommandée / défaut | Nature |
|---|---|---|
| Dependabot (GitHub, off. 14 juil. 2026) | 3 jours (défaut) | Source primaire |
| Renovate `config:best-practices` (npm) | 3 jours (défaut du preset) | Source primaire (doc/preset) |
| yossarian.net (Woodruff) | 7 jours (14 pour couvrir tout sauf xz) | Opinion argumentée |
| cooldowns.dev (Prpič) | 3 jours « balanced », 7 jours « conservative », 12-24h « aggressive » | Opinion argumentée |
| Christian Schneider (DevSecOps) | 7 jours | Opinion argumentée |
| OpenSSF « dependency firewall » | 24-72h | Organisme |
| CISA (Nx alert) | ≥ 3 heures | Organisme |
| pnpm v11 (défaut) | 1 jour (1440 min) | Source primaire |
| Deno 2.9 / Yarn 4.15 (défauts) | 24h / 1 jour | Source primaire |

GitHub justifie son choix de 3 jours ainsi (annonce officielle, verbatim) : « Three days as the default balances two goals: it pushes you past the window where most of these attacks live, and it doesn't hold your dependencies back longer than necessary. » Le choix des 3 jours est attribué à Carlin Cherry (GitHub Product Manager), qui le présente comme reflétant « a community consensus, so this default behavior keeps Dependabot consistent as developers move between tools » (couverture InfoQ, juillet 2026 — reprise secondaire). L'annonce du 14 juillet 2026 précise deux points cruciaux : « The default applies only to version updates. Security updates still open immediately, so critical fixes are never delayed. » et « Use the `cooldown` option in your `.github/dependabot.yml` to set a different window or opt out entirely. »

**Point d'incertitude central [INCERTAIN] :** aucune source ne fournit de mesure empirique départageant 3 vs 7 jours. cooldowns.dev le formule honnêtement : « A longer cooldown catches more compromised releases, while a shorter one gets you fixes and features sooner. » L'analyse de 10 incidents de yossarian.net est explicitement qualifiée de « very small sample set » et « not very scientific » par son propre auteur. Le choix entre 3 et 7 jours est donc un arbitrage de tolérance au risque, pas une conclusion mesurée.

### 3. Incidents documentés 2024-2026 avec délais mesurés

Ces timelines sont des faits établis (rapports d'incident directs / post-mortems) :

- **chalk / debug (8 sept. 2025)** — compte du mainteneur « qix » (Josh Junon) hameçonné via `npmjs.help`. Selon la timeline détaillée de Sygnia (« 16 Minutes to Impact ») : e-mail de phishing envoyé à 13:00 UTC, premier paquet malveillant publié à 13:16 UTC (~16 minutes après la compromission du compte), soupçons publics à 14:16 UTC sur Bluesky, npm notifié et confirmant la brèche à 17:17 UTC, retrait complet confirmé à 19:59 UTC. La fenêtre d'installation à risque effective était d'environ 2 heures (~13:16-15:30 UTC selon Cycode/Aikido). 18 paquets affectés selon Aikido (jusqu'à 25 selon d'autres décomptes), pour une portée totale supérieure à 2,6 milliards de téléchargements/semaine (chalk ~300 M/sem, debug plusieurs centaines de M/sem). Payload : cryptostealer navigateur détournant les transactions crypto/Web3. **Fenêtre d'exposition ~2 heures.**
- **Nx (26 août 2025)** — publié à 22:32 UTC, npm alerté à 02:44 UTC, versions retirées en environ une heure. **~4-5 heures.** Vol de secrets (clés SSH, tokens GitHub), première utilisation d'outils IA CLI locaux pour la reconnaissance.
- **Shai-Hulud (v1, sept. 2025)** — ver auto-répliquant ; > 500 paquets infectés dont `@ctrl/tinycolor` (> 2M/sem). Contenu en ~24-48h selon Socket, mais propagation continue sur plusieurs jours (14-18 sept.).
- **Shai-Hulud 2.0 / « The Second Coming » (24 nov. 2025)** — 700+ à 796 paquets, 27 000+ dépôts GitHub malveillants, ~14 000 secrets exposés. Exécution en *pre-install* (élargit la surface vs post-install).
- **axios (31 mars 2026)** — compte du mainteneur principal (jasonsaayman) compromis. Post-mortem officiel (GitHub issue axios #10636) : un paquet leurre `plain-crypto-js@4.2.0` publié dès le 30 mars vers 05:57 UTC (staging ~18h à l'avance pour éviter l'alarme « paquet tout neuf ») ; axios@1.14.1 publié le 31 mars à 00:21 UTC, axios@0.30.4 environ 39 minutes plus tard ; retrait des versions vers 03:15 UTC et de `plain-crypto-js` à 03:29 UTC. **Fenêtre d'exposition ~3 heures.** Injection de la dépendance fantôme `plain-crypto-js` (typosquat de crypto-js) livrant un RAT multiplateforme via un hook postinstall. Datadog Security Labs confirme : « Axios has over 100 million weekly downloads and 174,000 dependent npm packages. » Huntress rapporte, verbatim : « Huntress alone observed at least 135 endpoints across all operating systems contacting the attacker's command-and-control infrastructure » — avec une première connexion C2 environ 1,1 seconde après la fin de `npm install`.
- **LiteLLM (mars 2026, PyPI)** — harvester de credentials cloud ; détecté 10:39 UTC, mis en quarantaine sur PyPI à 13:38 UTC. **~3 heures.**
- **xz-utils (2024)** — *outlier* : fenêtre d'environ 5 semaines (v5.6.0 du 24 fév. au rollback Debian du 28 mars 2024). Compromission de mainteneur de long terme sur des mois — cas explicitement hors de portée des cooldowns.

**Synthèse factuelle :** sur l'échantillon documenté, la fenêtre d'exposition typique d'une attaque « publie-vite, détecte-vite » est de 1 à 5 heures ; les cas plus longs (Kong ~10 jours, tj-actions 3 jours) restent sous 2 semaines ; seul xz-utils (attaque APT sur mainteneur) échappe à tout cooldown raisonnable. Conclusion : n'importe quel cooldown de 24h+ neutralise déjà la grande majorité des fenêtres, et 7 jours ajoute une marge de sécurité confortable sans coût réel pour un dépôt solo.

### 4. Les deux points d'application : mécanique précise (sources primaires)

**npm `min-release-age` (à l'installation).** Documentation officielle npm CLI v11 (verbatim) : « If set, npm will build the npm tree such that only versions that were available more than the given number of days ago will be installed. If there are no versions available for the current set of dependencies, the command will error. » Défaut : `null` (désactivé). Type : `null` ou Number. Introduit en npm v11.10.0 (février 2026). Comportement avec `npm audit fix` (verbatim) : « When this window stops `npm audit fix` from installing a patched version (because the fix was published too recently), npm keeps the package at its vulnerable version, warns that the fix was blocked, and exits with a non-zero code. To install the fix, add the package to `min-release-age-exclude`, or relax `min-release-age` or `before`. »

Le bypass par exclusion (`min-release-age-exclude`, verbatim) : « A list of package names or `minimatch` glob patterns that are exempt from the `min-release-age` (and `before`) filter. » Le bypass ponctuel `npm i --min-release-age 0 <pkg>` n'est **pas** documenté verbatim sur la page officielle npm ; il n'apparaît que dans une source communautaire (gist de Matteo Collina) — à traiter comme reprise secondaire non officielle.

*Note de discordance [INCERTAIN] :* la doc officielle indique « If `before` and `min-release-age` are both set in the same source, `before` wins » ; des sources communautaires (issue npm/cli #9005) rapportent au contraire une erreur « `--min-release-age` cannot be provided when using `--before` » lorsque Renovate combine les deux. Comportement à vérifier dans votre version exacte de npm.

**Dependabot `cooldown` (à la proposition).** Défaut de 3 jours depuis le 14 juillet 2026 sur github.com (et GHES 3.23 à venir). Options : `default-days`, `semver-major-days`, `semver-minor-days`, `semver-patch-days`, `include`/`exclude` (jusqu'à 150 entrées chacune, `exclude` l'emporte). Jours entre 1 et 90 ; `default-days: 0` désactive. Les *security updates* ne sont jamais retardées. C'est un plancher (« floor »), pas un gel roulant.

**Renovate `minimumReleaseAge` (à la proposition).** Documentation officielle (verbatim) : « `minimumReleaseAge` is a feature that requires Renovate to wait for a specified amount of time before suggesting a dependency update. » Mécanique du check : « When the time passed since the release is less than the set `minimumReleaseAge`: Renovate adds a "pending" status check to that update's branch. After enough days have passed: Renovate replaces the "pending" status with a "passing" status check. » Renovate recommande `internalChecksFilter=strict` (défaut) pour ne créer ni branche ni PR tant que le cooldown n'est pas passé. Les security updates bypassent le cooldown.

Fait crucial pour la question de la combinaison : Renovate **recommande explicitement de configurer le cooldown dans les DEUX** (verbatim) : « We recommend specifying minimum release age in both your Renovate and package manager configuration. » Raison technique : quand Renovate met à jour un lockfile, il peut introduire une dépendance transitive qu'il ne « voit » pas, contournant son propre check. Renovate passe `--before=<date>` à npm lors de la génération du lockfile pour couvrir les transitives, mais recommande quand même la ceinture-et-bretelles.

### 5. Combiner les deux couches : redondance utile ou complexité inutile ?

**Verdict : ce n'est PAS une redondance inutile pour un dépôt solo assisté d'un agent — c'est même le scénario où la double couche a le plus de valeur.**

Raisons, appuyées sur des sources primaires et des analyses réputées :

- **Elles couvrent des chemins d'entrée différents.** Le cooldown Dependabot/Renovate ne s'applique qu'aux mises à jour *proposées par le bot*. Il ne protège pas : (a) un `npm install <pkg>` tapé manuellement, (b) un **agent IA qui décide d'ajouter une dépendance** — exactement votre cas d'usage, (c) la résolution de dépendances transitives au moment de l'install. L'article de TECHi le formule ainsi : « A three-day delay at the first layer does not automatically become a three-day delay at the second... A Dependabot delay that disappears during manual installation is a dashboard improvement, not an enforced boundary. » C'est le point décisif pour un dépôt où un agent agit sur le code.

- **Le gist de Matteo Collina (mainteneur Node.js) est explicite** (reprise secondaire de qualité, auteur autorisé) : « The cooldown is enforced at install time, not at update-suggestion time. If you're using Renovate or Dependabot, configure their minimumReleaseAge / cooldown independently — otherwise they'll keep opening PRs you can't actually install. »

- **Le coût de complexité est quasi nul** pour un dépôt solo : deux lignes de config (`min-release-age=7` dans `.npmrc` ; le cooldown Dependabot en quelques lignes de YAML). Il n'y a pas d'équipe à coordonner, pas de pipeline complexe.

- **Le risque de friction réel** est le désalignement des durées : si Dependabot propose à 3 jours mais que npm bloque à 7 jours, une PR Dependabot pour un paquet âgé de 3-6 jours **échouera à l'installation/CI** (npm sort en code non nul). Deux résolutions propres : soit aligner Dependabot sur 7 jours (`cooldown.default-days: 7`), soit accepter que ces PR restent en échec CI 4 jours de plus jusqu'à ce que npm les laisse passer. Pour un solo, **aligner Dependabot sur 7 jours est le plus simple** et supprime la friction, tout en gardant `min-release-age` comme filet pour les installs manuels/agent.

**Cas du correctif de sécurité urgent (bypass) :** la double couche ne bloque PAS les correctifs urgents, à condition de connaître les bons leviers :
- Dependabot et Renovate exemptent **automatiquement** les security updates du cooldown — une PR de correctif CVE arrive immédiatement.
- MAIS `npm min-release-age` ne sait pas distinguer un correctif de sécurité d'une release ordinaire : il filtre uniquement par âge. Un correctif publié il y a moins de 7 jours sera bloqué à l'install, et `npm audit fix` sortira en code non nul. Le bypass est alors manuel : `min-release-age-exclude[]=<pkg>` dans `.npmrc`, ou `npm i --min-release-age=0 <pkg>@<version>`. **Règle d'hygiène (cooldowns.dev) : toujours retirer l'exemption après avoir installé le correctif**, sinon vous affaiblissez durablement la protection sur ce paquet.

### 6. Ce que les cooldowns NE protègent PAS (à garder en tête)

Faits établis / consensus des sources : les cooldowns n'aident pas contre (a) le typosquatting (le paquet malveillant peut vieillir tranquillement sous un nom proche), (b) la compromission de mainteneur de long terme façon xz-utils, (c) les 0-day dans des paquets déjà installés, (d) les attaques par réécriture de tag Git (Trivy/tj-actions), où aucune nouvelle version n'est publiée — la parade y est le pinning par SHA de commit immuable. Les cooldowns doivent donc s'accompagner de : lockfile committé + `npm ci`, désactivation des scripts d'install non nécessaires (`--ignore-scripts`), tokens à portée minimale, et surveillance active des advisories (`npm audit`, Dependabot security updates). Le cooldown est un contrôle préventif, pas détectif.

## Recommendations

**Étape 1 — dès l'initialisation du dépôt (configuration minimale, coût ~2 min) :**
1. Créer `.npmrc` avec `min-release-age=7`. C'est le point d'application prioritaire car il couvre les installs manuels ET les installs de l'agent ET les transitives. C'est votre filet de sécurité réel.
2. Committer le lockfile et utiliser `npm ci` en CI. Les versions déjà verrouillées bypassent le cooldown ; vous ne payez le délai qu'au moment d'une résolution nouvelle — exactement quand le risque existe.

**Étape 2 — activer les mises à jour automatisées avec cooldown aligné :**
3. Ajouter `.github/dependabot.yml` avec `cooldown.default-days: 7` (aligné sur npm pour éviter les PR qui échouent au CI). Optionnellement `semver-patch-days: 3` si vous voulez récupérer les patchs plus vite en acceptant qu'ils échouent au CI jusqu'à J+7 côté npm — mais pour un solo, tout à 7 jours est plus simple. Laisser les security updates au comportement par défaut (immédiat).
4. Ne PAS ajouter Renovate en plus de Dependabot : choisir l'un OU l'autre. Les faire tourner ensemble crée des PR concurrentes sans gain de sécurité. Dependabot suffit et applique déjà le cooldown par défaut.

**Étape 3 — préparer le chemin d'urgence (avant d'en avoir besoin) :**
5. Documenter dans le README la procédure de bypass : pour un CVE dont le correctif a < 7 jours, `npm i --min-release-age=0 <pkg>@<version>` puis retirer immédiatement toute exemption. Compter sur Dependabot pour les PR de sécurité automatiques.
6. Configurer `npm audit` en CI mais sans le rendre bloquant sur les correctifs bloqués par le cooldown (le code non nul de `min-release-age` sur `audit fix` est attendu, pas une vraie panne).

**Seuils qui changeraient ces recommandations :**
- Si vous devez consommer des paquets internes à publication fréquente : ajoutez-les à `min-release-age-exclude` (et non baisser le cooldown global).
- Si un incident réel montrait des fenêtres de détection dépassant régulièrement 7 jours, passer à 14 jours (couvre tout sauf les APT type xz) — mais aucune donnée actuelle ne le justifie.
- Si npm 12 active un cooldown par défaut (attendu par certaines sources communautaires mais **non confirmé officiellement** [INCERTAIN]), votre config explicite `min-release-age=7` continuera de fonctionner et primera.

## Caveats

- **Aucune mesure empirique ne départage 3 vs 7 jours [INCERTAIN].** La recommandation de 7 jours est un choix de tolérance au risque appuyé sur des timelines d'incidents (qui montrent des détections en heures), pas sur une étude comparant les taux de capture à 3 vs 7 jours. GitHub (3 jours) et plusieurs praticiens (7 jours) sont en désaccord de bonne foi ; les deux sont défendables. Pour un dépôt solo à faible cadence, le coût marginal de 7 vs 3 jours est négligeable, ce qui fait pencher vers 7.
- **Désaccord de fond entre sources réputées sur l'utilité même des cooldowns.** Sonatype (« a symptom, not a strategy ») et certains ingénieurs (blog.outv.im, « security theater ») soutiennent que les cooldowns reposent sur le fait que d'autres se font infecter en premier et ne remplacent pas le scanning actif. Les défenseurs (Woodruff, Prpič, Schneider) répondent que le mécanisme repose sur l'incitation *commerciale* des scanners, pas sur la malchance d'autrui. Je tranche en faveur de l'adoption car le coût est quasi nul et le gain (80-90 % de réduction d'exposition selon yossarian.net, chiffre issu d'un « very small sample set » donc à prendre avec prudence) est réel — mais l'objection « ne vous reposez pas dessus seul » est valide et intégrée dans les recommandations.
- **Chiffres à traiter avec prudence :** le « 80-90 % de réduction d'exposure » (yossarian.net) et « 8/10 attaques < 1 semaine » proviennent d'un échantillon auto-qualifié de non-scientifique par son auteur ; le « la plupart détectés en < 72h » est une généralisation de praticiens, pas une statistique de registre officielle. Les timelines individuelles des incidents (chalk ~2h, axios ~3h, Nx ~4-5h) sont en revanche des faits bien documentés par des rapports directs.
- **« npm 12 activera un cooldown par défaut » n'est PAS confirmé** par une source officielle npm/GitHub ; c'est une anticipation communautaire (gist Collina). Le changement npm 12 officiellement discuté concerne les scripts d'install et sources non-registre devenant opt-in, ce qui est différent.
- **La documentation npm officielle citée est la v11 (page 11.19.0) ;** la page v12 n'a pas pu être vérifiée directement. Le paramètre et son comportement sont néanmoins stables et documentés verbatim.
- **Comportement `before` + `min-release-age` : discordance non résolue** entre la doc officielle (« before wins ») et des rapports d'utilisateurs (erreur de conflit avec Renovate). À valider dans votre environnement si vous combinez Renovate et npm.