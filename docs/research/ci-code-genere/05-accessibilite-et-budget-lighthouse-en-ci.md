# Doctrine : contrôle CI d'accessibilité et budget de performance Lighthouse sur un portail CMS Astro/Svelte

## TL;DR
- **Rendez le budget de performance Lighthouse (≥95 mobile) BLOQUANT** — c'est une exigence produit existante — et **ajoutez l'accessibilité en INFORMATIF (non bloquant)**, pas « aucun contrôle » : l'accessibilité n'a aucun seuil PRD ni obligation légale pesant sur vous (éditeur du CMS), mais un contrôle informatif est quasi gratuit et prépare vos utilisateurs assujettis au RGAA/EAA.
- **Outillage recommandé, 100 % gratuit et sans carte bancaire : Lighthouse CI (`@lhci/cli`) pour la performance + pa11y-ci avec le runner axe-core pour l'accessibilité**, exécutés sur un serveur éphémère local dans le job GitHub Actions, sans serveur permanent et **sans la cible publique par défaut de lhci** (`temporary-public-storage`) — on utilise `staticDistDir` + `upload.target: filesystem` + artefacts CI privés.
- **Nuance de maintenance confirmée** : `@lhci/cli` est figé à la version 0.15.1 (publiée ~25-26 juin 2025, soit ~14 mois) et n'a pas suivi Lighthouse 13, MAIS le dépôt n'est **pas archivé**, reçoit toujours des issues/PR en 2026 et reste l'outil officiel Google ; pa11y-ci et axe-core sont, eux, activement maintenus.

## Key Findings

### Couverture WCAG (fait établi, sources primaires + étude Deque)
- **axe-core ≈ 57 % des problèmes d'accessibilité par volume.** Verbatim du dépôt officiel axe-core (source primaire) : *« With axe-core, you can find on average 57% of WCAG issues automatically. Additionally, axe-core will return elements as "incomplete" where axe-core could not be certain, and manual review is needed. »* Ce chiffre vient de l'étude Deque (2 000+ audits, 13 000+ pages, ~300 000 problèmes).
- **Deux chiffres coexistent et mesurent des choses différentes** — signalé explicitement car source fréquente de confusion. La formulation la plus claire est celle de Digital Applied (« WCAG 2.2 Accessibility Audit Checklist », 28 mai 2026), qui réconcilie les deux : *« axe-core surfaces about 57% of real-world issues by volume but only fully automates around 29.5% of WCAG 2.2 success criteria. Both figures are true; they measure different things, and conflating them is how teams over-trust a green Lighthouse score. »* (répartition citée : ~29,5 % entièrement automatisables, ~10,3 % partiellement, ~60,2 % test manuel).
- **La mesure « par critère de succès » donne le chiffre conventionnel de 20-40 %.** Deque elle-même l'écrit dans son *Automated Accessibility Coverage Report* : *« we found automated issues for 16 out of the 50 Success Criteria under WCAG 2.1 Level AA. This supports the 20 to 30% automated coverage claims that many experts claim today. »* → C'est précisément pourquoi Deque a redéfini la « couverture » par volume de problèmes plutôt que par nombre de critères.
- **Lighthouse ne mesure PAS un pourcentage de couverture WCAG.** Source primaire (Chrome for Developers) : le score d'accessibilité est *« a weighted average of all accessibility audits. Weighting is based on axe user impact assessments. Each accessibility audit is pass or fail. »* Il n'y a **pas de crédit partiel** : un audit avec un seul élément en échec sur cent échoue totalement. Lighthouse utilise le moteur axe-core sous le capot. Google précise que *« not all checks can be automated »* — un score de 100 est un plancher, pas une conformité.
- **Le mur des 57 % est un plafond réel, pas une limite théorique** : le WebAIM Million 2026 (cité par Digital Applied) rapporte que *« 95.9% of the top one million home pages had detectable WCAG failures … with low-contrast text alone affecting 83.9% of pages »*, rappelant que « automation only sees part of the picture ».

### Statut de maintenance des outils (fait établi + vérification ciblée)
- **`@lhci/cli` : figé mais PAS abandonné.** Dernière version **0.15.1 publiée ~25-26 juin 2025** (npm : 25 juin ; tag GitHub : 26 juin). Le dépôt `GoogleChrome/lighthouse-ci` est **Public, non archivé**, avec des issues déposées jusqu'en 2026 (#1142 le 29 juin 2026, entre autres). Il épingle toujours Lighthouse 12.6.1 et n'a **pas adopté Lighthouse 13**. Aucune déclaration officielle de dépréciation ; la documentation officielle continue de le présenter comme l'outil officiel Google. **[INCERTAIN]** : la date exacte du dernier commit sur `main` n'a pas pu être vérifiée (page bloquée) ; le jalon de code confirmé le plus récent est juin 2025. → La description « figé depuis 14 mois sans être archivé » est **exacte et confirmée**.
- **pa11y-ci : activement maintenu.** Dernière version **4.1.1** publiée ~mai 2026 (npm : « Latest version: 4.1.1, last published: 3 months ago »). Release note primaire (GitHub) : *« Pa11y CI 4.1.1 updates the lodash dependency to ~4.18.1 to resolve GHSA-f23m-r3pf-42r / CVE-2026-2950. »* Exige Node.js ≥20 (LGPL-3.0). Activité de commits sur le dépôt en août 2026.
- **axe-core : activement maintenu** par Deque. CHANGELOG primaire : version **4.11.4 le 23 avril 2026**, cadence poursuivie jusqu'à **4.12.0 le 1er juin 2026**. Moteur standard de l'industrie ; couvre WCAG 2.0/2.1/2.2 niveaux A/AA/AAA et référence Section 508, EN 301 549, RGAA, ADA.

### La cible par défaut de lhci publie publiquement (fait établi, source primaire)
- Verbatim de `configuration.md` (source primaire) : la valeur par défaut de `--target` est **`lhci`** (serveur LHCI), mais le guide getting-started configure `temporary-public-storage`, décrit ainsi : *« upload the reports to temporary public storage where they'll be accessible to anyone with the URL »* et *« this is temporary and public storage. If you're uncomfortable with the idea of your Lighthouse reports being stored on a public URL for anyone to see, skip to the add assertions or Lighthouse CI server steps. »* Les rapports y sont supprimés après 7 jours et stockés sur GCP Cloud Storage. **Attention** : c'est cette cible que la plupart des tutoriels et le guide de démarrage suggèrent — d'où le risque de publication involontaire.
- **Alternatives sans exposition publique** (source primaire) : `target: 'filesystem'` (dépose les rapports JSON/HTML localement dans un répertoire, ex. `./reports` via `outputDir`), ou `target: 'lhci'` avec un serveur LHCI auto-hébergé. Pour le besoin décrit, `filesystem` + artefacts CI est le plus simple et n'exige aucun serveur.

### Serveur éphémère : nativement géré par les deux outils (fait établi, source primaire)
- **Lighthouse CI démarre son propre serveur.** Verbatim (web.dev, reprise de la doc officielle) : *« Every time that Lighthouse CI runs, it starts a server to serve your site… When Lighthouse CI finishes running, it will automatically shutdown the server. »* Avec `staticDistDir` pointant vers le build statique (ex. `./dist`), aucun serveur permanent n'est nécessaire — la doc `configuration.md` précise : *« Lighthouse CI uses this to spin up a static server on your behalf that will be used to load your site. »*
- **pa11y-ci** embarque Puppeteer/Chrome et teste des URL ; pour un site statique on lance un petit serveur statique éphémère dans le job (ex. `npx http-server ./dist &`) puis on pointe pa11y-ci sur `http://localhost:PORT`.

### Cadre réglementaire : à qui incombe l'obligation (fait établi, sources primaires réglementaires)
- **RGAA (France) — l'obligation pèse sur l'organisme qui exploite le site, pas sur l'éditeur du CMS.** Source primaire (accessibilite.numerique.gouv.fr / article 47 loi 2005-102) : sont concernés *« les services de communication au public en ligne »* de l'État, collectivités, établissements publics, délégataires de service public, organismes d'intérêt général, et — depuis le décret du 24 juillet 2019 — les entreprises privées dont le CA en France dépasse **250 M€**. La version en vigueur est le **RGAA 4.1.2** (DINUM) ; le RGAA 5 (intégrant WCAG 2.2, applications mobiles, documents bureautiques) est attendu fin 2026. Sanctions : jusqu'à **25 000 €** par défaut d'affichage / **50 000 €** par défaut d'accessibilité (acteurs publics), renouvelables.
- **Outils d'édition : la norme applicable est ATAG 2, pas WCAG (fait établi).** Le « Référentiel CMS » de la DINUM précise que les CMS (« systèmes de gestion de contenus… applications qui permettent de générer du contenu HTML ») relèvent d'**ATAG 2**, qui décrit la capacité de l'outil à *produire* du contenu accessible et à *aider* l'auteur — distinct de WCAG 2 qui régit le contenu livré. Interprétation étayée : un CMS a intérêt à générer par défaut du code sémantique conforme, mais **la conformité légale du site publié incombe à l'organisme éditeur du site, pas au fournisseur du CMS**.
- **European Accessibility Act (UE) — en vigueur depuis le 28 juin 2025.** Transposition nationale exigée au 28 juin 2022, application au **28 juin 2025**. S'applique aux « opérateurs économiques » (fabricants, prestataires, importateurs, distributeurs) offrant produits/services couverts (e-commerce, banque, transport, télécoms, etc.) sur le marché UE, public comme privé. **Exemption microentreprise pour les services** : moins de 10 employés ET CA/bilan annuel ≤ 2 M€ (Recital 70 et art. 4(5) de la Directive 2019/882) — *« The requirements and obligations of this Directive should therefore not apply to microenterprises providing services within the scope of this Directive. »* Contrats conclus avant le 28/06/2025 : mise en conformité au 28/06/2027 ; produits/services déjà sur le marché : 28/06/2030. La norme technique de référence est **EN 301 549** (référençant WCAG 2.1 AA, bientôt 2.2).
- **Conclusion réglementaire pour un développeur solo éditeur du CMS** : ni le RGAA ni l'EAA ne vous imposent, en tant que fournisseur d'outil, de bloquer un build sur l'accessibilité. L'obligation retombe sur vos utilisateurs quand ils sont assujettis (organismes publics, entreprises >250 M€ en France, opérateurs économiques non-micro dans l'UE). Votre propre site vitrine, si vous êtes microentreprise de services, est probablement exempté de l'EAA.

## Details

### Hypothèses concurrentes sur la sévérité du contrôle d'accessibilité

**Option A — Contrôle bloquant (rejeté pour l'instant).**
- *Pour* : garantit un plancher de qualité ; force la correction avant merge ; signal fort.
- *Contre* : (1) aucun critère PRD ni obligation légale ne fonde ce blocage — poser un gate bloquant sur une exigence inexistante crée une **fausse autorité** ; (2) l'automatisé plafonne à ~57 % des problèmes par volume et ~30 % des critères — un build « vert » donne un faux sentiment de conformité ; (3) les scans a11y sur pages riches génèrent des faux positifs et de la variabilité (le WebAIM Million 2026 note que la complexité DOM des pages d'accueil a crû de 22,5 % en un an et les attributs ARIA de 27 %, « more ARIA does not mean more accessible »), source de flakiness pour un mainteneur solo ; (4) coût de maintenance non justifié par une exigence. **Verdict : à réserver au jour où un PRD ou un contrat client impose un seuil RGAA/EAA.**

**Option B — Contrôle informatif seulement (RECOMMANDÉ).**
- *Pour* : coût quasi nul ; capte les « six dominantes » (contraste, alt manquant, labels de formulaire, liens/boutons vides, langue du document) qui représentent l'essentiel du volume ; shift-left sans bloquer ; prépare l'exposition RGAA/EAA de vos utilisateurs downstream ; n'introduit pas de fausse autorité puisqu'il ne prétend pas certifier la conformité.
- *Contre* : un check non bloquant est parfois ignoré ; nécessite discipline pour traiter les rapports.
- **Verdict : meilleur rapport valeur/risque pour un solo sans exigence produit.**

**Option C — Aucun contrôle (rejeté).**
- *Pour* : zéro coût, zéro maintenance.
- *Contre* : rate une opportunité gratuite de qualité ; laisse le CMS générer des gabarits potentiellement inaccessibles qui pénaliseront tous les sites downstream ; ne prépare rien à l'échéance EAA/RGAA 5. **Verdict : sous-optimal alors que le coût de l'option B est marginal.**

### Pourquoi la performance, elle, doit être bloquante
Le seuil Lighthouse ≥95 mobile est **déjà une exigence produit existante (PRD)**. Un gate bloquant sur une exigence formalisée n'est pas de la fausse autorité : c'est l'application d'un critère produit. Techniquement réalisable sans serveur permanent via `staticDistDir` + assertions.

### Tableau comparatif des outils gratuits et maintenus

| Critère | axe-core | pa11y-ci (runner axe ou htmlcs) | Lighthouse CI (`@lhci/cli`) |
|---|---|---|---|
| Objet | Moteur a11y (bibliothèque) | Runner a11y CI multi-URL, wrappe axe-core et/ou HTML CodeSniffer | Runner performance + a11y + SEO + best practices (a11y via axe-core) |
| Couverture WCAG | ~57 % des problèmes par volume ; ~29,5 % des critères 2.2 entièrement automatisés | Identique à axe-core (runner `axe`) ; `htmlcs` par défaut | a11y = sous-ensemble axe-core, score pondéré pass/fail sans crédit partiel |
| Standards | WCAG 2.0/2.1/2.2 A/AA/AAA, Section 508, EN 301 549, RGAA | WCAG2A / WCAG2AA (défaut) / WCAG2AAA, Section508 | WCAG (via axe), + perf/SEO/best-practices |
| Maintenance | Active (Deque, v4.11.4 le 23/04/2026, 4.12.0 le 01/06/2026) | Active (v4.1.1 ~mai 2026, correctif CVE-2026-2950, Node ≥20) | Figée à 0.15.1 (juin 2025, ~14 mois), non archivée, pas de Lighthouse 13 |
| Mode CI | Bibliothèque à intégrer (Playwright/Jest…) | CLI `pa11y-ci`, config `.pa11yci`, sortie JSON, seuil `--threshold` | CLI `lhci autorun`, config `lighthouserc.js`, assertions |
| Sans serveur permanent | Oui (injecté dans un navigateur headless) | Oui (Puppeteer embarqué ; serveur statique éphémère pour un build local) | Oui (`staticDistDir` démarre et arrête un serveur local automatiquement) |
| Coût / palier gratuit | Gratuit, open source (MPL 2.0) | Gratuit, open source (LGPL-3.0) | Gratuit, open source ; **attention** cible par défaut publique |

*Alternatives écartées* : Deque axe DevTools Pro / axe Monitor et Siteimprove sont **payants sans palier gratuit sans carte bancaire** (axe DevTools : essai 14 jours ; Rocket Validator : Pro dès 59 €/mois) → **exclus de la recommandation finale** conformément à la contrainte. Accessibility Insights (Microsoft, axe-core, gratuit) et Unlighthouse existent mais n'ajoutent rien de décisif au duo retenu pour un pipeline CI ; Unlighthouse est toutefois à garder en tête comme successeur potentiel de lhci si Lighthouse 13+ devient nécessaire.

### Méthode d'exécution en CI, étape par étape (GitHub Actions, sans serveur permanent, sans publication publique)

**1. Budget de performance Lighthouse ≥95 mobile (BLOQUANT).** `lighthouserc.js` à la racine :
```js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',            // build Astro/Svelte ; lhci sert ce dossier via un serveur éphémère
      numberOfRuns: 3,                     // réduit la variabilité
      settings: {
        preset: 'mobile',                  // émulation + throttling mobile de Lighthouse
        chromeFlags: '--no-sandbox'        // requis dans conteneurs CI
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }]  // 'error' => exit code non nul => build bloqué
      }
    },
    upload: {
      target: 'filesystem',                // PAS 'temporary-public-storage' : rien de public
      outputDir: './lhci-reports'
    }
  }
};
```
Workflow :
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: { node-version: 20 }
- run: npm ci && npm run build
- run: npm install -g @lhci/cli@0.15.x
- run: lhci autorun            # collect + assert + upload(filesystem)
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: lhci-reports, path: ./lhci-reports }
```
`minScore: 0.95` = 95/100. Le niveau `error` bloque ; `warn` n'aurait pas bloqué (doc primaire : *« error… failure will result in a non-zero exit code »*, *« warn… failure will not result in a non-zero exit code »*). Aucun token GitHub App n'est requis puisqu'on n'utilise ni les status checks de lhci ni le stockage public.

**2. Contrôle d'accessibilité (INFORMATIF, non bloquant) avec pa11y-ci + axe.** `.pa11yci` :
```json
{ "defaults": { "standard": "WCAG2AA", "runners": ["axe"], "concurrency": 4 },
  "urls": ["http://localhost:8080/", "http://localhost:8080/404.html"] }
```
Étapes du job (après le build) :
```yaml
- run: npx http-server ./dist -p 8080 &   # serveur statique éphémère local
- run: npx wait-on http://localhost:8080
- run: npx pa11y-ci --json > pa11y-report.json || true   # '|| true' => n'échoue jamais le build (informatif)
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: pa11y-report, path: pa11y-report.json }
```
Le `|| true` rend le contrôle informatif (pa11y-ci sort en code 2 au-delà du `threshold`). Pour le passer bloquant plus tard, retirez `|| true` et fixez un `threshold` réaliste. Note : le runner `axe` doit être demandé explicitement (`htmlcs` est le défaut de pa11y).

### Bascule vers un serveur LHCI privé (optionnel, plus tard)
Si vous voulez l'historique et les diffs sans exposition publique, la doc primaire décrit le serveur LHCI auto-hébergé (`target: 'lhci'`, `serverBaseUrl`, `token`). Ce n'est pas nécessaire pour le besoin décrit et **contredit la contrainte « sans serveur permanent »** — donc à éviter tant qu'un besoin d'historique n'émerge pas.

## Recommendations

1. **Immédiat — rendre le budget perf bloquant.** Ajoutez `categories:performance ['error', { minScore: 0.95 }]` avec `staticDistDir` et `upload.target: filesystem`. Confiance : **élevée** (source primaire, exigence PRD existante).
2. **Immédiat — ajouter l'accessibilité en informatif** via pa11y-ci runner axe (WCAG2AA), rapport en artefact, `|| true`. Confiance : **élevée** que c'est le bon niveau ; **moyenne** sur l'ampleur du bénéfice (dépend de votre traitement des rapports).
3. **Ne PAS utiliser `temporary-public-storage`.** Utilisez `filesystem` + artefacts CI. Confiance : **élevée** (source primaire).
4. **Épingler les versions** : `@lhci/cli@0.15.x`, Node 20, pa11y-ci 4.x. Surveiller un éventuel successeur de lhci (ex. Unlighthouse) si Lighthouse 13+ devient nécessaire. Confiance : **élevée** sur l'état figé de lhci.
5. **Seuils de bascule vers un contrôle a11y BLOQUANT** — déclenchez-le si l'un de ces événements survient : (a) le PRD ajoute un seuil d'accessibilité ; (b) un client assujetti au RGAA (organisme public, entreprise >250 M€) ou à l'EAA (opérateur économique non-micro) l'exige contractuellement ; (c) vous cessez d'être microentreprise de services et exploitez vous-même des services couverts par l'EAA. À ce moment, retirez `|| true`, fixez un `threshold` réaliste, puis durcissez progressivement.
6. **Documenter l'intention** : notez dans le README du portail que le contrôle a11y est *informatif* et ne certifie pas la conformité RGAA/EAA (évite la fausse autorité), et rappelez qu'ATAG 2 vise l'outil tandis que WCAG/RGAA visent le site publié.

## Caveats
- **Chiffres de couverture WCAG divergents mais non contradictoires** : 57 % (par volume, Deque) vs ~29,5-40 % (par critère de succès ; Deque elle-même donne « 16/50 critères = 20-30 % »). Toujours préciser la métrique. Aucun de ces chiffres n'est une garantie de conformité.
- **Lighthouse n'émet pas de « pourcentage WCAG »** : son score a11y est un pass/fail pondéré, sans crédit partiel ; il ne remplace pas pa11y-ci/axe pour un rapport détaillé par critère.
- **`@lhci/cli` figé** : confirmé (dernière release juin 2025, pas de Lighthouse 13), mais **non archivé** et sans dépréciation officielle. La date exacte du dernier commit `main` reste **[INCERTAIN]**. Risque à moyen terme si Node/Chrome évoluent au-delà du support de la 0.15.x.
- **Variabilité des mesures de performance** : Lighthouse en CI fluctue selon la machine du runner ; d'où `numberOfRuns: 3`. Un seuil à 95 peut être intermittent sur des runners partagés — surveiller les faux échecs.
- **Périmètre légal** : l'analyse RGAA/EAA vise un développeur solo *fournisseur d'un CMS*. Elle ne constitue pas un avis juridique ; les seuils, échéances (notamment RGAA 5 fin 2026) et sanctions doivent être reconfirmés à la date d'usage auprès des sources officielles (accessibilite.numerique.gouv.fr, Directive 2019/882).
- **Sources secondaires vs primaires** : les patterns de config lhci/pa11y et le comportement du serveur éphémère proviennent des docs primaires (GitHub GoogleChrome/lighthouse-ci, pa11y/pa11y-ci, Chrome for Developers, web.dev) ; les exemples de seuils (0.95) sont corroborés par des articles tiers (CSS-Tricks, Thoughtworks) mais restent des choix d'auteur, pas des prescriptions officielles. Les chiffres de couverture WCAG combinent source primaire (dépôts axe-core/Deque) et reprises secondaires (Digital Applied, A11yFlow) explicitement identifiées.