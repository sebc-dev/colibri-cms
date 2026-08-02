# CLAUDE.md — ColibriCMS

<!-- Point d'entrée injecté à chaque session. Garder < 200 lignes.
     Ne PAS dupliquer d'ADR ici : pointer + ne recopier que les contraintes actives.
     Ce fichier guide ; ce qui NE DOIT PAS arriver est appliqué par hooks/CI (cf. ADR-0002). -->

@docs/adr/README.md

## Projet

CMS sur-mesure open source pour sites vitrine, hébergé sur le free tier Cloudflare. **Site public statique (Astro SSG)** + **admin SSR sur Cloudflare Workers** (@astrojs/cloudflare + îlots React). Données **D1/R2/KV en bindings directs** (pas d'API REST).

Modèle **centré page** : une page est une instance de **gabarit**, faite de **zones typées** (texte, texte riche, image, galerie/carrousel, vidéo, CTA, **répéteur**). L'éditrice remplit les zones, ne restructure pas les pages. Un **constructeur de formulaires** (générique, borné) lui permet de composer des formulaires (dont un devis à total indicatif) acheminés par e-mail.

**Frontière cœur / client** : le **cœur** est packagé et versionné (SemVer, open source) ; chaque **site client** est un projet privé qui l'épingle et fournit ses gabarits via le **contrat de gabarit**. Une instance = un client. Le sur-mesure vit dans le projet client, jamais dans le cœur.

Chaîne documentaire : [brief](docs/brief.md) → [PRD](docs/prd.md) → [stack](docs/stack.md) → [ADR](docs/adr/README.md) → ce fichier.

## Chantier en cours — remédiation de l'audit de sécurité

Un [audit de sécurité du socle documentaire](docs/audit-securite-2026-08-01.md) (2026-08-01) a ouvert **54 constats** de conception. Aucun ne porte sur du code : il n'en existe pas encore hors `tooling/`. Tous se corrigent par **amendement documentaire**, et leur remédiation est le chantier ouvert du dépôt.

- **Le plan** — [docs/suites-audit-securite.md](docs/suites-audit-securite.md) : 11 lots, un par document cible, avec la matrice de traçabilité des 54 constats et les règles de forme des amendements. **Le lire avant de toucher un ADR.** Document temporaire, supprimé par le lot L9.
- **Le suivi par constat** — le tableau de la section `## Suivi` de l'audit. Un constat ne passe `Traité` que si sa règle vit dans un `## Constraints` **et** que le hook ou le check CI existe ; sinon `En cours`.
- **Où en est-on** — tableau d'avancement en tête du plan. **L1 à L8 sont faits** (PRD `FR-100` → `FR-113` ; [ADR-0011](docs/adr/ADR-0011-frontieres-de-contenu-hostile.md) « Frontières de contenu hostile », la racine que les lots suivants citent ; [ADR-0004](docs/adr/ADR-0004-architecture-du-code.md) amendement (c), ses suites dans le cœur ; [ADR-0010](docs/adr/ADR-0010-modele-brouillon-publie.md) amendement (c), clés naturelles, assets, cache et jeton de verrou ; [ADR-0007](docs/adr/ADR-0007-constructeur-de-formulaires.md) amendement (e), le chemin de soumission de bout en bout ; [ADR-0003](docs/adr/ADR-0003-socle-technique.md) amendement (d), la plateforme ; [ADR-0006](docs/adr/ADR-0006-generation-ia-verification.md) amendement 2026-08-01, le dispositif de confiance lui-même — innocuité vs conformité, frontière réseau par seam et allowlist, revue humaine ciblée à déclencheur mécanique, dépendances approuvées, mécanisme d'application protégé par une chaîne hook → CI → forge —, **plus la promotion d'[ADR-0009](docs/adr/ADR-0009-portail-qualite.md)** et `SECURITY.md` ; [ADR-0008](docs/adr/ADR-0008-mise-a-jour-de-la-flotte.md) amendement (b), tout ce qui vit **entre le dépôt et une instance** — distribution npm, comptes, secrets, filet de migration, urgence CVE et inventaire, signaux d'exploitation, données de l'éditrice, chiffrement et localisation) ; le lot suivant est **L9**, ADR-0005 (cibles de test de tout ce qui précède, au même rang que « aucune fuite de brouillon ») **plus la clôture du chantier** — report dans `CLAUDE.md`, mise à jour de `docs/JOURNAL.md`, clôture des trois portes de l'audit et **suppression du plan**. Ne restent après lui que L10 (mécanisation) et L11 (re-passe d'audit).

Trois faits qui ne se dérivent d'aucun fichier : le **stash unique du dépôt est écarté** (il précède la réécriture documentaire du 2026-08-01 et son candidat « ADR-0010 » entre en collision avec l'ADR-0010 accepté) — c'est ce qui a permis au lot L2 de **prendre `ADR-0011`** ; la numérotation des ADR **ne saute plus rien** depuis la promotion de `0009` au lot L7 (`0001` → `0011` existent tous, `_candidates/` est vide), si bien que le prochain numéro libre est `0012` ; et trois arbitrages sur *où placer un contrôle* — au lot L6, la route publique passe par un **motif de route dans le dépôt**, jamais par un *Bypass* Access, **parce que le portail peut lire le dépôt** ; au lot L7, le dernier rempart du mécanisme d'application est la **protection de branche sur le forge, hors du dépôt**, **parce que l'agent peut écrire le dépôt** — **posée le 2026-08-02** (*ruleset* « Main protect », `bypass_actors` vide, `quality-gate` en check requis, signalement privé de vulnérabilité et *secret scanning* actifs), ce qui a fait naître l'**amendement (b)** d'ADR-0006 : la contrainte exigeait une revue *sur le forge*, impossible à tenir à un seul mainteneur sans se contourner ; au lot L8 enfin, la règle interdisant `set:html` est **livrée comme code activé par défaut** dans un dépôt que **ni le portail ni l'agent n'atteignent** — le projet client —, avec sa case de provisionnement, et l'infériorité de cette barrière est écrite plutôt que masquée. **Les mises à jour automatiques de dépendances restent désactivées jusqu'à L10** — le check requis serait vert sur un diff que le portail ne sait pas encore refuser ; le chemin d'urgence CVE du lot L8 est **humain et en aval** des détecteurs existants (alertes de la forge, `pnpm audit` au nightly), il ne les réactive pas. Trois arbitrages du lot L8 ne se dérivent d'aucun fichier non plus : **un compte Cloudflare par client** (motif décisif : les quotas de l'offre gratuite se comptent *par compte*, pas le rayon d'un jeton) ; le cœur publié **sans aucun jeton npm** (*trusted publishing* OIDC — la question du secret réglée par sa disparition, comme `B-01` au lot L6) ; et la « sauvegarde avant migration » qui **n'est pas une copie** mais un *bookmark* Time Travel relevé (7 jours sur l'offre gratuite), ce qui éteint le constat des sauvegardes faute d'objet et rend l'export de D1 hors instance interdit. Côté PRD, `FR-113` est le maximum ; le prochain libre est `FR-114`.

## Comment travailler ici

- **Avant d'implémenter** : en Plan Mode, lire les ADR du `scope` concerné (`docs/adr/`). Signaler tout conflit avec un ADR **accepté** au lieu de le contourner.
- **Nouveau patron structurant** → rédiger un ADR *proposed* (`docs/adr/`) soumis à approbation **avant** d'écrire du code, dans la **même PR**.
- **Séquence par tranche** : schéma Zod (humain) → test rouge (humain) → implémentation (toi) jusqu'au vert.
- Donner un moyen de vérifier ton travail : lancer tests + lint avant de marquer « terminé ».

## Contraintes actives (impératif) — source : ADR, appliquées par hooks/CI

**Architecture (ADR-0004)**
- Aucun import de `cloudflare*` (hors types) dans `@colibri/core` ; aucun import de `apps/*` dans `@colibri/db` ni `@colibri/core`.
- Aucun gabarit/thème/code spécifique client dans le **cœur** ; un client déclare ses gabarits via le **contrat de gabarit**, jamais en éditant le cœur.
- Toute lecture partagée site+admin vit dans `@colibri/db` ; jamais de SQL de lecture dans `apps/*`.
- Tout endpoint d'écriture via `writeHandler({ auth: 'access' | 'public' })` ; une route **publique** vérifie **Turnstile**.
- Deux schémas Zod par surface (`xxxRow` sortie D1, `xxxInput` entrée) ; la validation d'une valeur de zone dérive du descripteur de gabarit.
- Verrou optimiste via `createRepository` uniquement.
- Seams **JWKS, mailer, Turnstile** injectables dès le code de prod.
- `ContentTypeDescriptor` reste **dormant** (non consommé en V1).
- *(amdt (c))* `toBlocks()` retourne un **arbre de blocs typés** rendu nœud par nœud ; jamais une chaîne de balisage, jamais `set:html` exigé par le contrat de gabarit.
- *(amdt (c))* Toute requête D1 **paramétrée** (`.bind()`, ou `params` de l'API REST au build) ; jamais d'interpolation, y compris pour un nom de colonne ou une clause `IN` de longueur variable.
- *(amdt (c))* Aperçu `/preview/*` **et** médias bruts sur un **hôte distinct** (sous-domaine du même apex) sous la même politique Access, avec sa propre CSP (`frame-ancestors 'none'`, aucun script inline) ; `checkOrigin` n'y protège de rien.
- *(amdt (c))* Média servi hors build : `Content-Type` du type **détecté à l'entrée**, `nosniff`, `Content-Disposition` normalisé ; bucket des originaux jamais public.
- *(amdt (c))* `verifyAccessJwt` vérifie signature (JWKS du *team domain*), `aud`, `iss`, `exp` ; tout échec, JWKS injoignable compris, **refuse** (fail-closed). Access est l'unique source d'autorisation ; `users` n'est jamais une liste d'accès.
- *(amdt (c))* Soumission publique : `writeHandler({auth:'public', against:'live-form-definition'})` — relecture de la définition `live` et **recalcul du total** dans la tête du pipeline, jamais dans `run`.
- *(amdt (c))* `LinkTarget` externe : schémas `http`/`https` **énumérés** (jamais `z.string().url()`, qui accepte `javascript:`) ; `rel="noopener noreferrer"` sur tout lien externe rendu.

**Contenu hostile (ADR-0011)**
- Le schéma d'entrée d'un texte riche est une **allowlist fermée** : nœuds, marques et attributs énumérés ; tout élément non listé **rejette** la valeur — jamais ignoré ni nettoyé.
- Jamais `z.any()`, `z.unknown()`, `z.record(...)` ni `.passthrough()` dans un schéma de valeur de zone ou de définition de formulaire.
- La neutralisation est une propriété du **schéma d'entrée**, jamais du rendu — aucun assainissement à l'étage de rendu.
- Le descripteur de gabarit déclare le **contexte de rendu** (`html`, `attribute`, `url`, `meta`, `text`) de chaque zone ; jamais de contexte implicite. Un contexte `url` énumère ses schémas d'adresse.
- Type réel d'un téléversement par **signature d'octets** côté Worker, jamais par `Content-Type` ni par extension ; liste fermée JPEG/PNG/WebP/AVIF ; **jamais `image/svg+xml`** sans nouvel ADR ; extension de clé R2 dérivée du type détecté, jamais du nom fourni.
- Toute réponse HTML porte CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, posés en **un point unique par surface** ; jamais `unsafe-inline` ni `unsafe-eval`.

**Socle (ADR-0003)**
- Versions via `catalog:` pnpm ; ne pas mélanger les majeures Astro/adaptateur.
- Pas de `@astrojs/tailwind` ni `tailwind.config.js` (Tailwind 4 = `@tailwindcss/vite`).
- `nodejs_compat` + `compatibility_date` fixés dans `apps/admin/wrangler.jsonc`, ainsi que `workers_dev: false` et `preview_urls: false` — Access protège un **nom d'hôte**, pas un Worker ; l'une de ces surfaces ouverte contourne `FR-001`.
- Auth par middleware Astro, pas de routage `src/fetch.ts` (bug #17181).
- `sharp` : `apps/site` uniquement, build-only ; réduction d'image à l'entrée **dans le navigateur**, jamais dans le Worker.
- Jamais `image/heic` dans un attribut `accept`. Boucle de Cron Trigger idempotente (aucun réessai plateforme).
- *(amdt (d))* Le Worker d'admin n'est joignable hors de son hôte protégé que par **un motif de route unique** — `<apex>/api/forms/*/submit`, dans `apps/admin/wrangler.jsonc` ; jamais d'élargissement (`/api/*` exposerait les endpoints d'écriture). **Aucune exclusion ni politique *Bypass* Access**, ni sur l'admin ni sur la surface non fiable. La soumission est **same-origin** avec le site — pas de CORS.
- *(amdt (d))* Jeton D1 du build : **lecture seule**, **une seule base**, **un jeton par instance**. Secrets provisionnés **par étage** — `wrangler secret put` ne provisionne que le **runtime** ; le jeton D1 est un secret **de build** (conteneur CI).
- *(amdt (d))* La boucle de réconciliation **signale** un `current_build_uuid` inconnu de `site_build_state`, sans redéclencher.
- *(amdt (d))* Versions **exactes** dans le `catalog:` (jamais de plage — le `catalog:` fait foi, les `^` de la table de décision sont des plages peer) ; `--frozen-lockfile` en CI ; veille CVE au nightly (`pnpm audit`).
- *(amdt (d))* **Pré-clairance Turnstile interdite** (elle déposerait un cookie `cf_clearance` et ferait basculer le produit dans le consentement) ; URL d'embed vidéo en **mode à confidentialité renforcée** (`youtube-nocookie.com`, `dnt=1`).

**Contenu — brouillon/publié (ADR-0010)**
- Toute table de valeur de contenu porte `state ∈ ('draft','live')` dans sa clé primaire.
- **Jamais** lire une ligne `state='draft'` depuis le build du site public — c'est le pire bug possible du produit.
- Deux fonctions de lecture distinctes et typées dans `@colibri/db` ; jamais une fonction générique paramétrée par l'état.
- Écrire dans `state='live'` uniquement depuis l'opération de publication ; recopie atomique (un `batch()` D1) **avant** le Deploy Hook, verrou et zones obligatoires vérifiés d'abord.
- Une référence (page, formulaire, média) est un identifiant, jamais une copie du contenu.
- Rien de rendu au visiteur ne vit hors des deux contenus — en particulier, pas de `media.alt`.
- Les états de `FR-019` sont dérivés de `publications` ; aucune colonne d'état de publication sur `pages` ou `forms`.
- Un champ de formulaire est désigné par une clé naturelle stable (`field_key`), jamais par un id de substitution.
- *(amdt (c))* `zone_key` / `field_key` / `option_key` : charset `^[a-z][a-z0-9_]{0,63}$`, engendrée **une fois** à la création puis **immuable** (un libellé renommé ne la change pas) ; unicité sur l'objet, **les deux états réunis**, suffixe déterministe ; clé non conforme **rejetée** à la lecture, jamais normalisée.
- *(amdt (c))* Tout octet servi au visiteur est le dérivé d'un média référencé par du `state='live'` ; jamais d'original public, jamais le dérivé d'un média que seul un `draft` référence.
- *(amdt (c))* Le retrait d'une page (`FR-083`) est reflété par le site servi dans le délai de `FR-036` (`FR-111`) ; jamais de HTML servi avec une fraîcheur supérieure à ce délai sans purge.
- *(amdt (c))* Le jeton de verrou optimiste est le compteur entier `version` ; jamais un horodatage à la seconde — `datetime('now')` n'est pas un jeton.

**Formulaires (ADR-0007)**
- Soumission = `writeHandler({auth:'public'})` + vérif Turnstile avant tout traitement.
- Valider toute soumission contre la définition `state='live'` ; **recalculer** le total côté serveur, jamais le reprendre de la requête.
- Ne jamais conserver une soumission au-delà de son acheminement **réussi** — une demande livrée n'entre jamais dans la corbeille de `FR-064`, qui ne contient que les **échecs**.
- La corbeille offre trois gestes et rien d'autre : consulter, relancer, effacer. Jamais de recherche, filtre, tri, export ni statut « traité » ; son expiration est **inconditionnelle**.
- Un champ `number` porte un **maximum** obligatoire ; adresse de destination **confirmée** avant publication.
- Une soumission produit **un seul** message, vers une **adresse de destination vérifiée du compte** ; jamais d'envoi au visiteur ni de `Reply-To` vers lui (`FR-095` hors v1).
- Montants en centimes entiers ; total = somme pure (`@colibri/core`), aucune règle conditionnelle en V1.
- Aucun code tiers chargé avant une action explicite du visiteur (vaut pour Turnstile et le lecteur vidéo).
- *(amdt (e))* Message acheminé : **sujet constant** (au plus le titre du formulaire), **corps en texte brut**, caractères de contrôle **rejetés à l'entrée** ; jamais d'en-tête composé à partir d'une valeur du visiteur.
- *(amdt (e))* Corbeille **rendue comme texte**, jamais interprétée ; expiration à **30 jours** exécutée par le Cron en **suppression effective** (`DELETE`), jamais par une lecture filtrée.
- *(amdt (e))* Bornes dans la **tête du pipeline**, jamais dans `run` : longueur par type de champ, corps ≤ 64 Kio ; `price_delta >= 0` ; `max_value`/`unit_price` plafonnés ; total au-delà du plafond absolu = **soumission refusée**, jamais un montant approché.
- *(amdt (e))* Limite de débit à **deux étages** (règle de périphérie + compteur par formulaire, `FR-102`), distincte de Turnstile ; `hostname` de `siteverify` contrôlé ; `siteverify` injoignable = **refus** (fail-closed).
- *(amdt (e))* Le destinataire n'est ni dans le site (projection publique **sans `recipient_email`**) ni dans le geste : adresse **relue depuis `form_defs` en `state='live'`** et appartenance à `verified_recipients` vérifiée **à chaque acheminement, relance comprise**.
- *(amdt (e))* Soumission acceptée seulement si `publications.en_ligne = 1` (`FR-112`) — des lignes `state='live'` subsistent après dépublication.
- *(amdt (e))* Zone vidéo : `ref` par **expression rationnelle du fournisseur**, URL d'embed **construite par le cœur et jamais stockée**, `sandbox` + `referrerpolicy`, oEmbed en dur, type et taille de la vignette vérifiés avant écriture R2.
- *(amdt (e))* `failure_reason` = **code + catégorie** ; jamais la réponse brute du service d'envoi ni une donnée personnelle (`FR-104`).

**Flotte (ADR-0008)**
- Aucun code spécifique client dans le cœur ; ne pas forker le cœur (épinglage de version).
- Une rupture de migration ou de contrat de gabarit → **majeure** SemVer.
- Migrations D1 : versionnées, ordonnées, appliquées par étape outillée **après sauvegarde + vérification** ; jamais en automatique au déploiement.
- *(amdt (b))* Publication du cœur **depuis la CI par *trusted publishing* OIDC**, provenance émise ; **aucun jeton de publication de longue durée** n'existe, le paquet refuse la publication par jeton, jamais depuis un poste. 2FA sur le compte de registre.
- *(amdt (b))* **Une instance cliente = un compte Cloudflare dédié** — les quotas de l'offre gratuite se comptent par compte, et la frontière de compte est celle au-delà de laquelle aucun scopage de jeton ne protège plus.
- *(amdt (b))* Sortie d'une personne = **trois gestes** : politique Access, révocation, puis **rotation** des secrets d'instance vus (Deploy Hook régénéré, jeton D1 de build, clé Turnstile, identifiants du membre non nominatif). Sur déclencheur (sortie, suspicion), jamais sur calendrier.
- *(amdt (b))* La « sauvegarde » avant migration est un **point de restauration relevé et consigné** (*bookmark* Time Travel), pas une copie ; **jamais d'export de D1 hors de l'instance**. Vérification post-migration à contenu défini (invariants ADR-0010, comptages vs delta déclaré, clés naturelles) et **fail-closed** ; exécutant = **identité d'agence**, jamais la cliente, le déploiement ou une génération d'IA.
- *(amdt (b))* **Correctif de sécurité** = classe de version **poussée** par l'agence sur les instances affectées, flotte montée **avant** la divulgation coordonnée ; **inventaire de flotte** mis à jour par le déploiement lui-même ; une version compromise est **dépréciée**, jamais dépubliée.
- *(amdt (b))* Échecs d'exploitation signalés à une **adresse d'agence** via `sendMail`, un signal par changement d'état ; cette adresse n'entre jamais dans `verified_recipients`.
- *(amdt (b))* Sortie d'une personne, côté données : ligne `users` **conservée**, adresse **neutralisée** (jeton de sépulture), entrée de cache KV supprimée, adresse retirée de `verified_recipients`.
- *(amdt (b))* D1 créé avec la **juridiction `eu`**, R2 sous **restriction juridictionnelle EU** — **à la création**, sans rattrapage possible.
- *(amdt (b))* Le cœur **livre** la règle de lint refusant `set:html` (et tout rendu hors contexte déclaré) ; le projet client la reçoit **activée**, sa CI l'exécute, le provisionnement le vérifie — les projets clients étant hors du portail.
- *(amdt (b))* Le provisionnement fournit **mentions légales** et **information de confidentialité** (`FR-105` → `FR-109`), validées par la cliente, avant toute publication de formulaire.

**Test (ADR-0005)**
- Intégration dans workerd avec vrais bindings locaux ; ne pas sur-mocker D1/R2/KV.
- 100 % des endpoints d'écriture testés pour l'autorisation ; route publique testée pour Turnstile.
- Cible nommée : **aucune fuite de brouillon** (le build ne sert jamais `state='draft'`), soumission forgée rejetée, recalcul du total, refus d'écrasement concurrent.
- Ne jamais déclencher le vrai Deploy Hook ni envoyer un vrai e-mail en test (mockés).
- Ne pas terminer une migration D1 par un commentaire (#7739).

**Génération IA (ADR-0006)**
- Ne pas éditer : `tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth.
- Ne pas lancer `--update`/`-u` sur les goldens.
- Ne pas viser un pourcentage de couverture-ligne.
- *(amdt 2026-08-01)* **Aucun appel réseau hors d'un fichier de seam déclaré** (JWKS, `sendMail`, Turnstile, Deploy Hook, API Workers Builds, API REST D1 du build, oEmbed) ; chaque seam déclare ses hôtes dans l'**allowlist réseau** versionnée, « aucun hôte » compris. Jamais de littéral d'URL vers un hôte non déclaré.
- *(amdt 2026-08-01)* Un hôte fourni **comme donnée** (`thumbnail_url` d'oEmbed) n'est atteint qu'après validation contre l'allowlist.
- *(amdt 2026-08-01)* **Revue humaine ciblée, déclenchée par le portail** : un diff touchant un seam, un endpoint d'écriture nouveau, l'allowlist, un manifeste de dépendances ou le mécanisme d'application est **refusé** jusqu'à approbation explicite. Renversement partiel assumé du brief ; le déclencheur, lui, reste mécanique.
- *(amdt 2026-08-01)* Toute dépendance **nouvelle** est approuvée par un humain ; ne pas éditer `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- *(amdt 2026-08-01)* Ne pas éditer le **mécanisme d'application** : `.claude/hooks/`, `.claude/settings.json`, `.github/workflows/`, `tooling/quality-gate/`, la baseline de mutants. Protection **re-vérifiée par la CI** (un hook désactivé ne refuse plus rien, y compris sa propre édition) et, en dernier ressort, par la protection de branche **hors du dépôt**.
- *(amdt (b) 2026-08-02)* La branche par défaut est protégée sur le forge : PR obligatoire, aucun push direct, aucun force-push, **aucun acteur en contournement**, portail en **check requis**. La relecture **humaine** n'est pas un compte d'approbations sur le forge — un mainteneur unique ne peut pas approuver sa propre PR — mais le **marqueur d'approbation du dépôt** contrôlé par la CI ; passer à 1 approbation dès qu'une seconde personne peut merger.
- *(amdt 2026-08-01)* Vulnérabilité : canal **privé** (`SECURITY.md`), jamais une issue publique.

**Portail de qualité (ADR-0009)**
- Le portail vit dans `tooling/` ; contrôles définis **une seule fois** (registre TS tagué par régime), local et CI appelant le même `runGate(ctx, régime)`.
- Régime **par-changement** = gate de merge, sans la mutation ; régime **planifié** (nightly sur `main`) porte la mutation — mécaniquement en CI, jamais par discipline locale.
- **Fail-closed** : exception ou outil absent ⇒ `échoué` ; `ignoré` réservé à un périmètre vérifié vide.
- Rapport lisible et sortie machine dérivés du **même** `GateResult`.
- Baseline de survivants **versionnée, possédée par l'humain, à cliquet** ; absente ou illisible ⇒ `échoué`.

## Pièges d'outillage constatés

- **Deux jeux de `FR-xxx` cohabitent.** `specs/001-ci-quality-gate/` utilise sa propre numérotation `FR-001…FR-030`, **locale à la feature et sans aucun rapport** avec les `FR-xxx` du PRD, qui vont jusqu'à `FR-099`. Les deux se recouvrent sur la plage 001–030 : toujours qualifier de quel jeu on parle.
- **Le contrôle `lint-format` du portail qualité ne couvre que `.ts` / `.tsx`.** Le Markdown est hors périmètre : `brief.md`, `prd.md` et `stack.md` ne sont pas conformes à Prettier et **n'ont pas à l'être** — ne pas les reformater.
- **Le hook `golden-lock` refuse toute commande shell contenant `-u` ou `--update`**, y compris un `sort -u` inoffensif. Contourner avec `sort | uniq`.
- **`pnpm gate` ne s'exécute pas tel quel dans un shell non interactif** : pnpm veut purger `node_modules` et exige un TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Forcer avec `CI=true` **supprime le répertoire d'installation** — à ne pas faire à la légère.

## Style
- TypeScript `strict`, indentation 2 espaces, ESM.
- Français pour les commentaires de décision et la doc ; anglais toléré pour le code.

## Agent skills

### Issue tracker

Le suivi est la chaîne `/scd-sdd` : `specs/NNN-slug/{spec,plan,tasks}.md` (un lot `Rn` ≈ un ticket ≈ une PR) + `docs/JOURNAL.md` pour les événements. Pas de `.scratch/`. Voir [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Les cinq rôles canoniques de triage — applicables uniquement aux demandes hors chaîne ouvertes en GitHub Issue. Voir [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Mono-contexte : `CONTEXT.md` à la racine + `docs/adr/`. Voir [docs/agents/domain.md](docs/agents/domain.md).

<!-- Si deux règles se contredisent, le corriger ici plutôt que de laisser l'agent trancher au hasard.
     Diagnostiquer le contexte chargé avec /memory et /context. -->
