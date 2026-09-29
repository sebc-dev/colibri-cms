# CMS Rust sur Cloudflare Workers (plan gratuit) : document de décision

**Date** : 29 septembre 2026
**Statut** : proposition, à valider par le prototype (section 8)
**Base** : trois rapports de recherche du 29 septembre 2026.
- **R1** : Enveloppe gratuite Cloudflare (limites, mur ou facturation au dépassement)
- **R2** : Architecture workers-rs et points bloquants sur le plan gratuit
- **R3** : Outillage compilateur, lints et tests pour une boucle agent (Claude Code)

Le document ne rapporte pas de fait nouveau. Il tranche entre les trois rapports, corrige leurs contradictions et comble les raccords qu'aucun ne traitait seul. Les confiances et marqueurs [INCERTAIN] sont repris des rapports.

---

## 1. Verdict

La réécriture en Rust est **viable sur le plan Workers Free**, sans risque de facturation : chaque dépassement de quota produit une erreur ou un blocage, jamais une facture, tant que personne ne souscrit Workers Paid (R1). Les risques restants concernent la **disponibilité** et non le coût :

1. **CPU à 10 ms par requête**, sans aucune mesure publiée pour la pile visée (R1, R2).
2. **E-mail** limité aux adresses vérifiées : impossible d'envoyer un accusé de réception au prospect sans prestataire tiers (R2).
3. **50 sous-requêtes externes** par invocation, ce qui pèse sur la publication vers GitHub (R2).

Aucun de ces trois points ne se tranche sur le papier. Le prototype de la section 8 est un préalable à tout développement fonctionnel.

---

## 2. Décisions

| # | Sujet | Décision | Motif | Source | Confiance |
|---|---|---|---|---|---|
| D1 | Plan | Workers Free sur le compte du client. Ne jamais souscrire Workers Paid. Le développeur a un rôle sans gestion des paiements. | Souscrire Workers Paid est le seul acte qui fait passer les dépassements du blocage à la facturation. | R1 | Élevée |
| D2 | Runtime | `worker` 0.8.x, Rust stable, sans `--panic-unwind` (qui exige nightly) | Maturité suffisante ; récupération après panic active par défaut depuis la 0.6.5 | R2 | Élevée |
| D3 | Routage | axum en `default-features = false`, via la feature `http` | Extracteurs typés, meilleur retour pour l'agent. Poids non mesuré. | R2 | Moyenne |
| D4 | Interface d'administration | askama + HTMX rendus par le Worker ; Tiptap en îlot compilé par Vite et servi en asset | Compatible avec une CSP stricte ; bundle client hors du binaire Worker | R2 | Moyenne-élevée |
| D5 | Texte riche | AST JSON désérialisé dans une enum Rust fermée ; schéma éditorial restreint (gras, italique, titres, listes, liens) | Plus sûr qu'un assainisseur HTML. Les extensions Highlight et Color posent des styles inline, ce qui casse `style-src 'self'`. | R2 | Élevée |
| D6 | Site public | Assets statiques Astro gratuits ; `run_worker_first` limité à `/admin/*` et `/api/*` | Assets gratuits et illimités. Si le Worker passe devant tout le site, les visiteurs reçoivent un 429 au-delà du quota. | R1, R2 | Élevée |
| D7 | Publication | Un commit groupé via l'API Git Data de GitHub, qui déclenche Workers Builds. Client REST maison sur `worker::Fetch`, sans octocrab. | Un seul build par publication. Compatibilité wasm d'octocrab non établie. | R2 | Moyenne-élevée |
| D8 | Images | Blobs GitHub envoyés **dès l'upload** ; aucun décodage dans le Worker ; lecture des seuls en-têtes ; redimensionnement dans le navigateur | Budget de 50 sous-requêtes et de 10 ms de CPU | R1, R2 | Élevée |
| D9 | Contrat de données | Primitives fermées en Rust (`Field`, `RichNode`) → JSON Schema (schemars) → Zod (json-schema-to-zod) → `content.config.ts`. Un manifeste JSON d'emplacements par site. | Exhaustivité des `match` en Rust ; le site se reconstruit sans la base | R2 | Moyenne-élevée |
| D10 | E-mail | `send_email` uniquement vers les adresses vérifiées (éditrice, adresse des devis) | Seul envoi gratuit sur Free | R1, R2 | Élevée |
| D11 | Authentification | OTP à 6 chiffres par e-mail, session par jeton de 256 bits dont seul le SHA-256 est stocké, cookie `__Host-` en SameSite=Strict, compteur D1 contre la force brute | Voir R2 §6 | R2 | Élevée (principes) |
| D12 | Workspace | Crates `core` / `app` / `html` / `worker` (+ `xtask`, voir R4) ; lints dans `[workspace.lints]` ; couches imposées par `cargo-deny` et un test sur `cargo metadata` | Boucle native rapide ; invariants garantis par le compilateur | R3 | Élevée |
| D13 | Portes | Bloquantes : fmt, clippy `-D warnings` (natif et wasm32), `cargo-deny`, test de couches, tests. Annotation seulement : mutation, couverture, duplication. | Déterministe → bloquant ; heuristique → revue | R3 | Élevée |
| D14 | Hooks Claude Code | `PostToolUse` : `cargo check` court, sortie tronquée, exit 2. `Stop` : porte complète. | Signal immédiat sans coincer l'agent en cours de refactorisation | R3 | Moyenne |

---

## 3. Contradictions entre les rapports, résolues

| # | Contradiction | Résolution |
|---|---|---|
| C1 | R2 fixe `opt-level = "z"`, qui optimise la taille. Or la taille n'est plus contraignante (64 MiB, R1) et le CPU l'est. | Profil release : `lto = true`, `codegen-units = 1`, `strip = true`. Le prototype compare `opt-level = "3"` et `"s"` et garde le meilleur CPU tant que le démarrage reste sous 1 s. `"z"` n'est retenu que si le démarrage devient un problème. |
| C2 | Tests d'intégration : Miniflare avec `node --test` (R3) ou `@cloudflare/vitest-pool-workers` (R2) | **vitest-pool-workers** : exécution dans workerd, D1 local et migrations. Miniflare nu est abandonné. |
| C3 | Le schéma de R3 cite des bindings KV et R2. | La stack n'utilise ni KV ni R2. Bindings réels : `DB` (D1), `EMAIL` (`send_email`), `ASSETS`, et en option `PUBLISH_LOCK` (Durable Object SQLite). |
| C4 | Requêtes D1 par invocation : 50 selon la page D1, 1 000 sous-requêtes Cloudflare selon la page Workers (R1) | Concevoir pour **50** (valeur prudente) : requêtes groupées en `batch`, pas de boucle N+1. Le prototype vérifie la valeur réelle. |
| C5 | Stockage par Durable Object sur Free : 1 Go ou 10 Go (R1) | Sans objet si le DO sert seulement de verrou de publication. Sinon, retenir 1 Go. |

---

## 4. Raccords entre les rapports

### R1. Confinement du HTML et askama

L'invariant « HTML brut confiné à un seul module » (R3) n'est vrai que si **askama vit dans `cms-html`**. Les gabarits (`templates/`) et les `#[derive(Template)]` sont dans `cms-html`. Seul `cms-html` expose des fonctions qui renvoient `SafeHtml`, et le Worker ne connaît que `SafeHtml`.

À ajouter dans `deny.toml` :

```toml
[bans]
deny = [
  # … entrées de R3 …
  { crate = "askama", wrappers = ["cms-html"], reason = "HTML produit uniquement par cms-html" },
]
```

### R2. Aléa et horloge passent par des ports

`core` ne tire jamais d'aléa et ne lit jamais l'heure directement.
- Dans `core`/`app` : des traits `Rng` (octets aléatoires) et `Clock` (instant courant).
- Dans `worker` : une implémentation `getrandom` (feature `wasm_js`) et `Date.now()`.
- Dans les tests natifs : implémentations déterministes, qui rendent les tests OTP et sessions reproductibles.

À ajouter dans `crates/core/clippy.toml`, en plus des interdictions d'horloge de R3 :

```toml
disallowed-methods = [
  # … SystemTime::now, Instant::now, env::var …
  { path = "getrandom::fill", reason = "passer par le port Rng" },
]
```

`getrandom` est souvent une dépendance transitive (tables de hachage, crypto). Une entrée `deny` dans `cargo-deny` exigerait une liste `wrappers` longue et fragile. Le lint clippy sur l'appel direct, avec l'absence de `getrandom` dans `core/Cargo.toml`, suffit. [À vérifier au prototype : chemin exact de la fonction selon la version 0.3 ou 0.4.]

Le rustflag `--cfg getrandom_backend="wasm_js"` (R2) se place dans `.cargo/config.toml`, sous `[target.wasm32-unknown-unknown]`. Il s'applique donc aussi au `cargo check --target wasm32` de la boucle agent, et le hook ne doit pas le redéfinir.

### R3. Crate `xtask` pour les outils de build

L'export JSON Schema (schemars) et la génération Zod tournent au build et ne vont pas dans le Worker.
- `crates/xtask` dépend de `cms-core` et de `schemars`, et c'est la seule crate à dépendre de `schemars`.
- Dans `cms-core`, `JsonSchema` est dérivé derrière une feature `schema` : `#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]`. Seul `xtask` active cette feature, ce qui garde `schemars` hors du binaire Worker.
- `deny.toml` : `{ crate = "schemars", wrappers = ["cms-core", "cms-xtask"] }`.
- CI : `cargo run -p cms-xtask -- export-schema` suivi d'un `git diff --exit-code` sur le fichier Zod généré. Si le contrat change sans que le fichier soit régénéré, la CI échoue.

### R4. Où vit le `.wasm` précompilé ? (décision ouverte, voir Q1)

R2 recommande de compiler le Rust une fois, puis de ne rebâtir qu'Astro à chaque publication, pour ménager les 3 000 minutes de Workers Builds. R3 décrit une CI qui compile le Worker. Aucun rapport ne dit comment le binaire arrive dans le build du site client.

---

## 5. Architecture cible

```
cms/                               # dépôt du CMS (un seul, versionné)
├── Cargo.toml                     # [workspace], [workspace.lints], [workspace.dependencies]
├── rust-toolchain.toml            # version stable épinglée
├── .cargo/config.toml             # rustflags getrandom (wasm32), profil release
├── clippy.toml
├── deny.toml
├── crates/
│   ├── core/                      # domaine pur : Field, RichNode, Article<Draft|Published>,
│   │   └── clippy.toml            #   newtypes, validation, ports Rng/Clock/Repo/Git/Mailer
│   ├── app/                       # cas d'usage : login OTP, édition, publication (sur les ports)
│   ├── html/                      # askama + gabarits → SafeHtml (seul producteur de HTML)
│   ├── worker/                    # wasm32 : axum, bindings DB/EMAIL/ASSETS, adaptateurs des ports
│   └── xtask/                     # export JSON Schema → Zod, tâches de build
├── admin-ui/                      # îlot Tiptap + HTMX, build Vite → admin/assets/
├── tests/integration/             # vitest-pool-workers (workerd, D1 local)
└── .claude/                       # settings.json (hooks), hooks/, skills/, CLAUDE.md à la racine

site-client/                       # un dépôt par client
├── src/content.config.ts          # importe le schéma Zod généré
├── src/content/…                  # JSON de contenu + images (écrits par le CMS)
├── cms/                           # binaire CMS (selon Q1) : index.js + index_bg.wasm
└── wrangler.toml                  # squelette de R2
```

**Flux de publication** : l'éditrice clique « Publier ». Le Worker crée le tree, le commit et met à jour la ref (les blobs sont déjà envoyés), ce qui fait 4 sous-requêtes. Le push déclenche Workers Builds, qui lance `astro build` puis déploie les assets et le Worker. Un Durable Object `PUBLISH_LOCK` en option empêche deux publications simultanées.

**Aperçu** : option C de R2 (Worker Astro SSR dédié) si le prototype la valide, sinon option A (preview build protégé). L'option B, un double rendu, est exclue.

---

## 6. Outillage agent (résumé opérationnel)

Configuration complète : R3 §3 et §7, avec les amendements de ce document.

**Boucle locale** :

```bash
cargo fmt --all
cargo check -p cms-core -p cms-app --message-format=short
cargo clippy --workspace --all-targets -- -D warnings
cargo check -p cms-worker --target wasm32-unknown-unknown
cargo nextest run -p cms-core -p cms-app -p cms-html
```

**CI bloquante** : la boucle ci-dessus sans raccourci, plus `cargo clippy -p cms-worker --target wasm32-unknown-unknown -- -D warnings`, `cargo deny check`, `cargo shear --deny-warnings`, le test de couches, la vérification de l'export Zod (raccord R3), `worker-build --release`, puis `npx vitest run` dans `tests/integration`.

**CI en annotation** : `cargo mutants --in-diff … -p cms-core -p cms-app` (toujours avec `-p`, sinon le portail passe au vert sans générer de mutant), `cargo llvm-cov` sur les crates natives, `jscpd`.

**Checklist du vérificateur en contexte frais** : diff de `Cargo.toml`, `deny.toml`, `clippy.toml` et `[lints]` ; `#[allow]` ajoutés ; nouveaux `clone()`, `Rc` ou `RefCell` dans `core` ; nouvelles dépendances ; tout fichier sous `crates/html/templates/`.

---

## 7. Questions ouvertes

| # | Question | Options | Proposition |
|---|---|---|---|
| Q1 | Comment le `.wasm` arrive dans le build du site client | (a) Binaire commité dans `site-client/cms/`. (b) Release GitHub du CMS téléchargée par la commande de build. (c) Toolchain Rust dans Workers Builds. | **(a) pour le prototype** : simple, versionné avec le site, mettre à jour le CMS revient à faire un commit. (b) si le nombre de clients rend les commits pénibles. (c) écartée : présence de la toolchain [INCERTAIN] et minutes consommées. |
| Q2 | Accusé de réception au prospect | Aucun, ou prestataire tiers en `fetch` (Resend : offre gratuite sans carte, 100 e-mails/jour selon R2) | Aucun en V1. L'ajout d'un tiers crée un second compte à gérer par client. |
| Q3 | Aperçu | C (SSR dédié) ou A (preview build) | Tranché par la mesure du prototype (tâche P6). |
| Q4 | Limitation de débit | Rate Limiter (disponibilité sur Free [INCERTAIN]) + compteur D1 | Compteur D1 obligatoire ; Rate Limiter en complément s'il est disponible. |
| Q5 | Surveillance des quotas | Cron qui interroge la GraphQL Analytics API (R1) | Reportée après la V1 ; l'alerte e-mail native de D1 suffit au départ. |

---

## 8. Plan du prototype (environ une semaine)

**Objectif** : mesurer avant de construire. Un compte Cloudflare jetable, **sans moyen de paiement**, et un site Astro minimal avec la page la plus lourde du futur gabarit.

| # | Tâche | Mesure | Critère proposé |
|---|---|---|---|
| P1 | Squelette du workspace (§5) avec lints, `deny.toml`, test de couches, hooks | La boucle tourne ; un import `worker` dans `core` échoue | Portes vertes sur un code vide ; une violation volontaire est détectée |
| P2 | Worker minimal axum + askama + D1 : page d'administration listant 20 éléments | CPU par requête (tableau de bord / `wrangler tail`), taille (`wrangler deploy --dry-run`), démarrage (`wrangler check startup`) | CPU p99 nettement sous 10 ms, démarrage sous 1 s |
| P3 | Même mesure en `opt-level` `"3"` et `"s"` | Écart CPU et taille | Retenir le meilleur CPU (C1) |
| P4 | Connexion OTP complète (génération, HMAC/SHA, D1, `send_email` vers une adresse vérifiée) | CPU ; livraison de l'e-mail | Sous 10 ms ; e-mail reçu |
| P5 | Publication : enregistrement d'un brouillon avec AST et 2 images, puis commit Git Data | Nombre de sous-requêtes, CPU, déclenchement du build, durée du build | Moins de 50 sous-requêtes ; un seul build ; CPU sous 10 ms |
| P6 | Aperçu option C : Worker Astro SSR qui rend la page la plus lourde | CPU par rendu | Régulièrement sous 10 ms → C ; sinon A |
| P7 | CSP stricte en `Report-Only` sur l'administration avec Tiptap et HTMX | Violations remontées | Zéro violation avec le schéma éditorial restreint |
| P8 | Tests sur le compte sans carte (liste R1) : envoi `send_email` vers une adresse non vérifiée, quota D1 (alerte e-mail), tentative de souscription sans carte | Comportements réels | Blocages confirmés, aucune facture, même à 0 $ |

Les tests de quota lourds (3 000 minutes de build, 501e build Pages, 100 000 requêtes DO) sont facultatifs. Ils ne concernent que la disponibilité, et R1 donne déjà les indices d'un blocage.

**Sortie du prototype** : les tableaux P2 à P6 sont remplis, Q1 et Q3 sont tranchées, et la section 2 est mise à jour (confiances relevées ou décisions révisées).

---

## 9. Risques résiduels

- **CPU** : si P2 ou P5 dépassent régulièrement 10 ms, la conclusion de viabilité tombe. La parade de repli est un Durable Object pour les endpoints lourds, comme le fait warden-worker (R2), à évaluer.
- **Limites mouvantes** : Cloudflare a modifié en septembre 2026 la taille maximale du Worker et l'application des quotas D1. Il faut relire la page Limits avant chaque déploiement client.
- **Agents** : les crates inventées (22 % des recommandations selon R3) et les API obsolètes sont bloquées à la compilation. Clonage excessif et contournements ne sont pas mesurés ; la revue en contexte frais reste la garantie.
- **Versions** : les versions marquées [INCERTAIN] dans R2 (serde, sha2, hmac, maud, schemars) sont relevées sur crates.io au moment de figer `Cargo.lock`.
