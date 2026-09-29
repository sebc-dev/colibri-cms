# Carte de campagne — Contrôles CI contre les modes de défaillance du code écrit par un agent

**Nature** : thème · **Question** : Quels contrôles ajouter au portail CI de ColibriCMS pour réduire
les modes de défaillance propres à un code écrit par un agent — correction, maintenabilité,
sécurité —, et à quel coût de faux positifs sur un dépôt tenu par un développeur seul ? ·
**Ancrage** : `colibri-cms` (ce dépôt) · **Ouverte le** : 2026-08-14 ·
**Acquis** : [`docs/ci.md`](../../ci.md) · [`docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`](../../chantiers/en-attente/2026-08-14-durcissement-ci.md)

| # | Sujet | Route | Collecte | Prompt | Rapport | Comblé | Distillé |
|---|---|---|---|---|---|---|---|
| 01 | Modes de defaillance mesures du code ecrit par un agent | research | ✓ | ✓ | ✓ | ✓ | s.o. |
| 02 | Graphe d imports resolu avec astro et svelte | mixte | ✓ | ✓ | ✓ | ✓ | s.o. |
| 03 | Antidotes a l oracle faux property-based et metamorphique | research | ✓ | ✓ | ✓ | ✓ | s.o. |
| 04 | Securite applicative de la stack workers d1 astro svelte | mixte | ✓ | ✓ | ✓ | ✓ | s.o. |
| 05 | Accessibilite et budget lighthouse en ci | mixte | ✓ | ✓ | ✓ | ✓ | s.o. |
| 06 | Derive documentation code | research | ✓ | ✓ | ✓ | ✓ | s.o. |
| 07 | Flux de mise a jour des dependances sous cooldown | mixte | ✓ | ✓ | ✓ | ✓ | s.o. |

## Notes

### 01 — Modes de defaillance mesures du code ecrit par un agent

- **Comblement** :
  - [x] la référence complète des deux travaux qui portent le seuil « faux positifs < 20 % »
        (Johnson et al. ; Christakis & Bird) — les deux existent et sont bien attribués, mais
        **aucun ne pose de seuil chiffré** : le nombre est une convention de la littérature qui les
        cite. Extraits et notices dans la fiche.
  - [x] la source du « SonarQube 40-60 % de non-problèmes » — **blog d'éditeur tiers** que le
        rapport ne nomme pas ; Sonar publie de son côté **3,2 %** sur 137 M de remontées revues.
        Les deux mesurent des quantités différentes. Fiche.
  - [x] la source du « 60-90 % → 10-20 % » — page de **Mend.io**, qui vend du SAST. Le chiffre
        Veracode « 11,3 % » n'a pas été rouvert, et sa classe de preuve n'est pas en doute : la
        ligne est close sur son enjeu — **aucun taux de faux positifs de SAST n'est une constante
        publiée**, donc aucun ne calibre un seuil de bascule.
  - [x] une mesure de l'effet d'un contrôle CI **fixe** sur un agent qui itère contre lui —
        **irréductible** : les deux travaux les plus proches mesurent autre chose (renforcement
        *sur* le retour d'outil ; dérive observationnelle sans contrôle manipulé). La réserve du
        chantier de durcissement reste ouverte et doit s'écrire comme telle.
  - [x] le taux de capture des paquets slopsquattés par un SCA **en production** —
        **irréductible** : seul existe un banc d'essai en laboratoire sur corpus constitué.
- **Trouvaille du comblement, absente du rapport** : `arXiv:2511.04427` (He et al., MSR 2026),
  **807 dépôts** contre **1 380 témoins** appariés, différence-en-différences — le seul travail du
  corpus qui ait un groupe témoin.

### 02 — Graphe d imports resolu avec astro et svelte

- **Routage** : mixte — la doctrine des règles de frontière entre zones est publique et se cherche.
  Ce qui ne se cherche pas, c'est la **capacité réelle d'un outil à parser `.astro`** : elle se lit
  dans son code et dans ses tickets, jamais sur une page de présentation. `docs/ci.md` porte déjà la
  réserve pour dependency-cruiser 18.1.0, et une partie des cinq zones est faite de `.astro`.
- **Comblement** :
  - [x] `eslint-plugin-boundaries` peut-il exprimer `I3` — **oui**, la règle `boundaries/entry-point`
        le fait nommément, mais elle est **dépréciée en v7** au profit de `boundaries/dependencies`.
        Le complément générique existe aussi : `import-x/no-internal-modules`. Extraits en fiche.
  - [x] le comportement du résolveur sur une chaîne `export … from` — le périmètre déclaré ne
        mentionne aucune traversée de ré-export, et le renvoi de `import/default` vers le plugin le
        corrobore. **L'inférence du rapport se resserre, elle ne se démontre pas.**
  - [x] la trajectoire de `.astro` dans dependency-cruiser — **rien n'a bougé** : issue #1007 sans
        activité depuis 2025-08-23, PR #1009 toujours en brouillon et **en conflit** avec sa base.
  - [x] le taux de faux positifs d'une règle de frontière sur ce dépôt — **irréductible ici** : il
        n'y a pas de code, il se mesurera au rejeu.

### 03 — Antidotes a l oracle faux property-based et metamorphique

- **Routage** : research malgré un versant outillé — brancher `fast-check` sous Vitest est trivial
  et se vérifiera au scaffold. Ce qui manque est doctrinal : ces techniques valent-elles quelque
  chose quand **l'agent écrit aussi les propriétés**, ou l'oracle faux se reporte-t-il d'un cran ?
- **Comblement** :
  - [x] Stryker sait-il ne muter qu'un sous-ensemble — **oui**, `mutate` accepte des globs, un
        fichier seul, et même une plage de lignes ; `--incremental` existe. La liste par défaut
        porte `svelte` et `vue`, **pas `astro`**.
  - [x] `fc.statistics()` existe en 4.9.0 — exporté au tag `v4.9.0`.
  - [x] l'équivalent fast-check de `assume()` — **`fc.pre()`**, dont la documentation dit qu'il
        *« cancel[s] the run »* : une passe annulée, pas un échec. C'est mot pour mot le mécanisme
        d'*Assume Misuse* de PBT-Bench, dans cette stack.
  - [x] une mesure du report de l'oracle faux en TypeScript / Vitest / fast-check —
        **irréductible** : toute la littérature est en Python ou en Java, le transfert est
        conceptuel et non mesuré.

### 04 — Securite applicative de la stack workers d1 astro svelte

- **Routage** : mixte — le registre de règles Semgrep est rendu en JavaScript, donc invisible à
  Research. L'existence réelle d'un jeu de règles pour les liaisons Workers, D1 et les îlots Svelte
  se collecte par l'API ou le dépôt.
- **Angle propre à l'ancrage, à ne pas perdre** : `docs/archi.md` pose que « le graphe d'imports
  **est** la frontière de confidentialité » — ce qu'un composant hydraté importe part dans le
  navigateur. Aucun contrôle du portail ne voit cette fuite.
- **Comblement** :
  - [x] version, date, licence et santé de **DMNO** et **varlock** — **DMNO est en mode maintenance
        déclaré par son propre éditeur**, qui renvoie à varlock ; dernière version 0.0.41 du
        2025-12-01. varlock est en 1.16.1 du 2026-08-08, poussé le jour même. **Le choix que le
        rapport présente n'en est pas un.**
  - [x] le palier gratuit Snyk Code exige-t-il un moyen de paiement — la page tarifaire et le
        **corpus complet de la documentation** (558 ko) n'en disent rien ; la seule source est un
        billet de **mai 2021**. **Irréductible au-delà** : `I5` se vérifie sur le compte, à
        l'inscription — c'est un acte, pas un canal.
  - [x] le dépôt est-il public — **oui**, `visibility: public`. La condition que le rapport pose
        pour CodeQL est remplie.
  - [x] `astro:env` sous Astro 7 — tient, et la doc porte un fait que le rapport n'a pas : la
        combinaison `context:"client"` + `access:"secret"` **n'est pas exprimable** dans le schéma.
  - [x] `security.csp` — **stable depuis Astro 6.0**, dans la référence de configuration et non
        dans les *experimental flags* ; `docs/archi.md` pointe encore l'ancienne page.

### 05 — Accessibilite et budget lighthouse en ci

- **Routage** : mixte — les paliers gratuits et la stabilité en CI de chaque outil se vérifient au
  registre. Le socle `I5` de [`docs/socle-de-livraison.md`](../../socle-de-livraison.md) rend
  inutilisable ici tout composant dont le palier gratuit exige une carte bancaire, quel que soit son
  mérite.
- **Comblement** :
  - [x] ce que `@lhci/cli@0.15.1` épingle — `lighthouse` en version **exacte** `12.6.1`, et
        **aucun champ `engines`** : pas de plage de Node déclarée, donc aucun avertissement quand
        le runner montera de majeure.
  - [x] `pa11y-ci@4.1.1` — `node >=20`, et **les deux runners sont embarqués** via `pa11y ^9.1.1`
        (`axe-core ~4.11.1` + `@pa11y/html_codesniffer`), navigateur compris. Décalage à connaître :
        `axe-core` y est figé en 4.11.x quand le registre porte 4.13.0.
  - [x] **Unlighthouse** sait-il faire échouer un job — **oui**, `--budget N`, *« Exit code 1 =
        budget failed »*. Mais il exige un `--site`, donc **une URL déjà servie**, là où `lhci`
        sert lui-même le build : ce n'est pas un repli équivalent sur ce portail.

### 06 — Derive documentation code

- **Comblement** :
  - [x] `typescript-docs-verifier` — **3.0.2 du 2026-03-02** ; la « 3.0.1, il y a deux mois » du
        rapport datait en fait de **2025-07-18**. Pair `typescript >=4.7.2`, borne haute ouverte.
  - [x] la contrainte ESLint de `@eslint/markdown` — **8.0.3 du 2026-07-01, aucune
        `peerDependencies`**, développé contre ESLint `^10.0.3`. Le « ≥ 9.15 » du rapport décrivait
        la majeure 7.
  - [x] **ArchUnitTS** (npm : `archunit`) — 2.4.0, actif, MIT, mais **0 occurrence d'`astro` et 0 de
        `svelte`** dans tout le dépôt, et il embarque `typescript ^5.9.3`. La vague 2 du rapport
        bute donc sur le mur du sujet 02 : c'est la chaîne ESLint, ou rien.

### 07 — Flux de mise a jour des dependances sous cooldown

- **Routage** : mixte — la clé `minimumReleaseAge` de Renovate et son équivalent Dependabot se
  lisent dans leur schéma de configuration, pas dans un billet. La doctrine — quel régime de mise à
  jour tient sur un dépôt d'un seul développeur assisté d'un agent — se cherche.
- **Comblement** :
  - [x] le bypass ponctuel est-il documenté — **oui**, contrairement à ce qu'écrit le rapport :
        `min-release-age` est une option documentée de la commande `install`, et npm énonce
        lui-même que « a higher-priority source can always relax or override a lower-priority one ».
        Seul l'exemple `=0` vient d'un gist.
  - [x] `npm ci` applique-t-il `min-release-age` — **non**. La clé n'est documentée que pour
        `install`, `install-test`, `outdated` et `update` ; `npm-ci.1` ne la mentionne pas. Le
        cooldown protège la **résolution**, jamais l'installation en CI — où seul
        `dependency-review`, contrôle **déclaratif**, porte la garantie.
  - [x] la référence de l'objection Sonatype — trouvée, et **plus mesurée que le rapport ne le
        dit** : Sonatype admet le délai comme filet et refuse qu'il tienne lieu de socle. Le
        désaccord se transmet sous cette forme, pas sous celle du « security theater ».
- **Ce qui reste ouvert et le restera** : aucune mesure ne départage 3 et 7 jours. Le seul chiffrage
  qui circule est qualifié de non scientifique par son propre auteur.
