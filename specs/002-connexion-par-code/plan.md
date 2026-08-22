# Plan technique : Connexion de l'éditrice par code
Trace vers : [spec.md](./spec.md) · [docs/stack.md](../../docs/stack.md) ·
[docs/archi.md](../../docs/archi.md) · [docs/ci.md](../../docs/ci.md) · [docs/adr/](../../docs/adr/)
Corrigé : 2026-08-21 — gate `analyze` (2 Critical de phase `plan`, 2 Major)

> **Les faits de plateforme de ce plan ont été mesurés le 2026-08-19**, sur un dépôt jetable
> (`$CLAUDE_JOB_DIR/tmp/probe`) portant les `node_modules` du dépôt — `astro@7.2.0`,
> `@astrojs/cloudflare@14.2.0`, `@cloudflare/vitest-pool-workers@0.20.3`, `wrangler@4.120.0`.
> Chaque mesure est citée à l'endroit où elle décide. Une mesure non citée ne décide rien.
>
> **Passe de correction du 2026-08-21** — gate `analyze`, entrées de phase `plan`. Deux mesures
> nouvelles, faites sur **ce dépôt** et non sur un jetable : la collision entre le contrôle `I8` et
> la destination d'acheminement (décision 9), et l'état du registre npm qui départage
> `@cloudflare/vitest-pool-workers` (décision 15). Les mesures du 2026-08-19 portant sur `astro` et
> `@astrojs/cloudflare` ne bougent pas ; celles qui portent sur `wrangler` ont été faites sur
> `4.120.0`, et la décision 15 fait passer l'arbre à `4.123.0` — l'écart est nommé là où il décide.

## Approche

Le parcours entier — écran de connexion, émission du code, saisie du code, session, accueil —
tient dans **deux fichiers de route** sous `src/pages/admin/` et **aucun octet de JavaScript
expédié au navigateur** : deux formulaires HTML natifs, rendus par le serveur. Ce n'est pas une
économie, c'est ce que le socle impose — `I4` interdit toute directive `client:*` sous
`src/admin/`, et `ADR-0024` pose une CSP à `script-src 'self'` sans script en ligne.

La logique qui décide — l'alphabet du code, l'expiration, le brûlage, le plafond, les bornes de
session — vit dans `src/core/auth/`, sans base, sans horloge et sans plateforme : elle reçoit
l'instant et les octets d'aléa en paramètres. `src/platform/` porte les trois adaptateurs — D1, le
cookie et la garde de session, l'envoi du message — et `src/admin/` les gabarits et **le seul
fichier qui porte du texte visible**, ce qui rend `FR-025` relisable d'un coup d'œil.

Trois propriétés ne sont tenues par aucun écran et ne se voient qu'à l'attaque : le délai plancher
constant (`FR-033`), la CSP stricte sur **toute** réponse d'administration, et les quatre attributs
du cookie. Les trois sont donc portées par un mécanisme unique et vérifiées par l'étape de
vérification bout-en-bout, jamais par la relecture.

## Réutilisation du socle

**Stack imposée — appliquée, jamais re-choisie.** Authentification maison sur D1, quatre mécanismes
([ADR-0006](../../docs/adr/0006-auth-implementation-maison-sur-d1.md)) ·
acheminement par Email Routing et la liaison `send_email` vers l'adresse **vérifiée**
([ADR-0009](../../docs/adr/0009-acheminement-email-routing-send-email.md)) ·
en-têtes à deux porteurs, celui du code pour l'administration
([ADR-0015](../../docs/adr/0015-en-tetes-de-reponse-deux-porteurs.md)) ·
API D1 native et migrations `wrangler d1 migrations`, sans couche intermédiaire
([ADR-0018](../../docs/adr/0018-acces-aux-donnees-api-d1-native-et-migrations-wrangler.md)) ·
Vitest dans `workerd` ([ADR-0013](../../docs/adr/0013-tests-vitest-dans-workerd.md)) — **le dépôt
n'est pas dans la famille que cet ADR retient**, et ce lot l'y ramène : décision 15 ·
TypeScript strict, plafonné à la branche 6
([ADR-0010](../../docs/adr/0010-langage-typescript-strict.md) + le
[candidat du 2026-08-15](../../docs/adr/_candidates/typescript-plafonne-a-la-branche-6.md)) ·
quatre lieux de configuration d'instance
([ADR-0020](../../docs/adr/0020-configuration-d-instance-quatre-lieux.md),
[ADR-0028](../../docs/adr/0028-valeurs-d-instance-dans-le-fichier-d-instance.md)).
**Aucune dépendance n'est ajoutée** — ni Svelte, ni Playwright, ni bibliothèque de session : le
motif est à la décision 2 et à la décision 9.

**Invariants d'architecture confrontés, fichier par fichier. Aucune dérogation.** Le lot **réveille
deux contrôles** qui dormaient en « hors portée » depuis le scaffold, et c'est le fait le plus
structurant de cette confrontation :

- **`I6` passe de HORS PORTÉE à deux états rapportés.** Son contrôle teste
  `exists 'src/pages/api/*' 'src/pages/admin/*'` ; ce lot crée le second. Les **deux** fichiers de
  route sous `src/pages/admin/` importent donc `src/platform/session/index.ts` — et ils
  l'**appellent** l'un comme l'autre : `index.astro` pour exiger la session, `connexion.astro` pour
  l'ouvrir (`FR-011`). C'est ce qui a décidé du découpage des routes (décision 1) : un fichier de
  route pour la seule soumission d'adresse aurait importé un garde dont il n'a rien à faire,
  c'est-à-dire exactement l'angle mort qu'`ADR-0026` déclare assumé — « importer le garde n'est pas
  l'appeler ». Le second volet d'`I6` (aucun corps `multipart` sur la surface publique) passe à
  vide : ce lot ne crée **aucun** fichier sous `src/pages/api/`, donc le sous-arbre public reste
  absent.
- **Le contrôle `ADR-0006` d'`arch-invariants` s'allume avec `src/platform/session/`.** Il cherche,
  dans les fichiers de cette zone qui portent `Set-Cookie` ou `__Host-`, les quatre chaînes
  `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`. C'est la raison pour laquelle les **deux**
  cookies du parcours — session et demande — sont sérialisés par un porteur unique,
  `src/platform/session/cookies.ts` : un second cookie posé ailleurs échapperait au contrôle.

Les huit autres invariants sont confrontés sans conséquence sur le découpage : `I1` (les arêtes
`pages → admin, platform` · `admin → core, platform` · `platform → core` · `core → rien` sont
toutes légales), `I2` (`src/core/auth/` n'importe ni framework ni plateforme — d'où l'instant et
l'aléa passés en paramètres), `I3` (aucun fichier de ce lot ne porte la chaîne littérale
`src/render/` suivie d'un caractère), `I4` (aucune directive `client:*`, décision 2), `I5` (aucun
`{@html}` ni `set:html` — l'échappement par défaut d'Astro suffit, ce lot n'affichant aucun texte
d'inconnu), `I7` et `I9` (hors portée, `FR-007` du PRD et la publication étant hors périmètre),
`I10` (`astro.config.ts` continue de lire `instance.json`).

**`I8` mérite d'être écrit en entier, parce que le lot y touche des deux côtés et que la passe de
correction du 2026-08-21 y a trouvé un piège.** L'adresse d'expédition du message porte le domaine,
qui est une valeur d'instance : l'écrire en dur serait rapporté en fuite par le contrôle, qui
cherche les valeurs d'`instance.json` dans les sources et les configurations. Elle est donc
**dérivée** par un import du fichier d'instance (décision 10, mesurée).

En sens inverse, la **destination d'acheminement** est bien affectée par `I8` à la configuration du
déploiement — « rattachement D1 et destination d'acheminement dans la configuration du
déploiement ». L'y écrire ne serait donc pas une dérogation. Mais le contrôle qui **rend** `I8`
cherche chaque valeur d'`instance.json` **en sous-chaîne** dans `wrangler.*`, et une adresse
hébergée sur le domaine de l'instance contient ce domaine. *Mesuré le 2026-08-21 sur ce dépôt,
arbre restauré ensuite* :

| Ce que porte `wrangler.jsonc` | Bilan d'`arch-invariants.sh` |
|---|---|
| `"destination_address": "contact@exemple.colibri.test"` | `ko I8` · **au moins 1 violation(s)** |
| `"destination_address": "contact@boite-de-la-cliente.fr"` | `✓ I8` · 0 violation(s) |
| la liaison sans `destination_address` | `✓ I8` · 0 violation(s) |

Le verdict du contrôle ne dépend alors d'aucune ligne du dépôt : il dépend de **la boîte que la
cliente utilise**. L'exemple que le PRD donne lui-même — `contact@patisserie.fr` sur le site
`patisserie.fr` — tombe du mauvais côté. **Arbitrage humain du 2026-08-21 : la liaison perd sa
restriction** (décision 9 récrite), et `wrangler.jsonc` ne porte plus aucune valeur d'instance.
Ce n'est toujours pas une dérogation à `I8` : c'est le lieu qui se vide, pas la frontière qui se
franchit.

**ADR contraignants qui décident ici et qu'on n'instruit pas :** `ADR-0006` (les quatre mécanismes,
et la borne 40 bits), `ADR-0009` (la liaison `send_email` vers l'adresse vérifiée, et la forme
inerte et étiquetée du message), `ADR-0015` et `ADR-0024` (la CSP définie par ses interdits, portée
par le code), `ADR-0026` (`I6`), `ADR-0028` (`I8`).

## Fichiers touchés

### Configuration (racine)

| Fichier | Ce qui change | Patron / motif |
|---|---|---|
| `wrangler.jsonc` | liaison `send_email` nommée `ENVOI_CODE`, **sans `destination_address`** | forme du schéma **mesurée** — seul `name` est requis ; la restriction est retirée par la décision 9, et le fichier reste vierge de valeur d'instance (`I8`) |
| `package.json` · `package-lock.json` | `@cloudflare/vitest-pool-workers` de `^0.20.3` à `^0.21.3` | alignement sur la famille qu'`ADR-0013` retient ; décision 15 |
| `astro.config.ts` | inscription du middleware d'en-têtes par `addMiddleware` | l'intégration `sondeDev()` déjà dans ce fichier est le patron exact ; entrypoint en `new URL(…, import.meta.url)`, **mesuré** (décision 3) |
| `vitest.config.ts` | `readD1Migrations` + liaison de test `MIGRATIONS` | **mesuré** : sans elle, `applyD1Migrations` échoue (décision 11) |

Aucun script `npm` n'est ajouté, et **aucune dépendance nouvelle** : la seule ligne de
`package.json` qui bouge est une montée de version déjà décidée par un ADR (décision 15).

### Migrations

- `migrations/0002_connexion.sql` — les trois tables du contrat ci-dessous. Patron :
  `migrations/0001_amorce.sql` (le commentaire dit ce que la migration prouve et ce qu'elle
  n'introduit pas).

### `src/core/auth/` — la logique, sans framework ni plateforme (`I2`)

- `src/core/auth/code.ts` — l'alphabet de trente-deux caractères, l'engendrement d'un code de huit
  signes **à partir d'octets fournis en paramètre**, et la normalisation d'une saisie (majuscules,
  séparateurs ignorés, `O` → `0`, `I`/`L` → `1`). `FR-002`, `FR-034`, `SC-011`.
- `src/core/auth/regles.ts` — les six bornes, en un seul endroit : quinze minutes (`FR-014`), cinq
  présentations (`FR-015`), cinq envois par heure glissante (`FR-008`), sept jours d'inactivité et
  trente jours d'âge (`FR-020`, `FR-021`), le délai plancher (`FR-033`) et le seuil d'écriture du
  rafraîchissement glissant.
- `src/core/auth/verdict.ts` — la fonction pure qui rend, d'un état de code, d'un instant et d'une
  saisie, l'un des **quatre** verdicts : `ouvrir`, `retaper`, `redemander`, `autre-appareil`. C'est
  le porteur de `SC-009` — cinq causes de refus, trois réponses.
- Patron : `src/core/zone.ts` (module sans import, le commentaire dit quel invariant il sert).

### `src/platform/` — les adaptateurs

- `src/platform/session/index.ts` — **le garde**, dont le chemin est imposé par `ADR-0026` :
  `exigerSession`, `ouvrirSession`, et l'expiration lue à chaque requête.
- `src/platform/session/cookies.ts` — les deux cookies — session et appareil — et leurs quatre
  attributs, **porteur unique** : un second cookie sérialisé ailleurs échapperait au contrôle
  `ADR-0006`, qui ne lit que cette zone.
- `src/platform/session/magasin.ts` — les lectures et écritures D1 des sessions.
- `src/platform/auth/magasin.ts` — D1 : l'adresse autorisée, les codes, le comptage des émissions
  sur l'heure glissante.
- `src/platform/auth/emission.ts` — la composition du message et son envoi par la liaison
  `send_email` (`cloudflare:email`). Texte seul, objet fixe (`FR-036`, `FR-037`).
- `src/platform/auth/expediteur.ts` — l'adresse d'expédition, dérivée d'`instance.json`
  (décision 10).
- `src/platform/entetes/middleware.ts` — la CSP stricte et les en-têtes de sécurité de toute
  réponse d'administration (décision 3).
- `src/platform/test/cloudflare-test.d.ts` — la déclaration ambiante du module `cloudflare:test`,
  sans laquelle le **premier fichier de test fait échouer `npm run typecheck`**, qui est bloquant
  (décision 12, mesurée). Patron **exact** : `src/platform/d1/cloudflare-workers.d.ts`, posé par le
  scaffold pour la même raison et au même titre — `platform/` est la zone qui déclare ce que le
  runtime fournit.
- Patron pour l'accès à D1 : `src/platform/d1/sonde-dev.ts` — `import { env } from
  'cloudflare:workers'`, jamais `Astro.locals.runtime.env` (retiré depuis Astro v6).

### `src/admin/` — les gabarits, aucune directive `client:*` (`I4`)

- `src/admin/Page.astro` — la coquille HTML commune. **Aucun bloc `<style>`** (décision 4).
- `src/admin/connexion/FormulaireAdresse.astro` — le formulaire d'adresse, et l'annonce du plafond
  (`FR-009`).
- `src/admin/connexion/FormulaireCode.astro` — le formulaire de code, la mention « seul le dernier
  message reçu ouvre une session » (`FR-030`) et les trois textes de refus.
- `src/admin/accueil/Accueil.astro` — l'écran d'accueil, vide de fonction (frontière de la spec).
- `src/admin/textes.ts` — **tout** le texte visible du parcours, en un seul module. C'est ce qui
  rend `FR-025` et `SC-007` relisables : `docs/archi.md` range la conformité sémantique du nommage
  hors des invariants (classe 12), donc la seule vérification possible est une relecture — autant
  qu'elle porte sur un fichier et non sur six.
- `public/admin.css` — la feuille de style de l'administration, servie en asset statique
  (décision 4).

### `src/pages/admin/` — les routes, minces, chacune important **et appelant** le garde (`I6`)

- `src/pages/admin/connexion.astro` — les deux étapes du parcours : `GET` rend le formulaire
  d'adresse ou celui du code selon l'état ; `POST` émet ou vérifie (décision 1).
- `src/pages/admin/index.astro` — l'accueil derrière `exigerSession`.

### Vérification

- `scripts/verif-connexion.sh` — l'étape unique ci-dessous. Patron : `scripts/verif-bout-en-bout.sh`
  (`set -uo pipefail`, `ok`/`ko`, un état par contrôle, le commentaire dit le *pourquoi*). Fichier
  **distinct** : celui du scaffold porte en tête « Vérification bout-en-bout —
  `specs/001-scaffold-projet` », et une feature ne s'ajoute pas en appendice de la preuve d'une
  autre.
- `scripts/verif-bout-en-bout.sh` — **une ligne à corriger, et elle est déjà rouge** : son étape 3
  compare le bilan d'`arch-invariants.sh` à la chaîne
  `── Bilan : 9 contrôle(s) au vert · 4 hors portée · 0 violation(s)`. Ce lot déplace ces nombres
  (§ étape de vérification), **et la comparaison échoue déjà aujourd'hui** — mesuré le 2026-08-19,
  le script rend `9 contrôle(s) au vert · 1 vérifié(s) ailleurs · 4 hors portée · 0 violation(s)`.
  L'état `AILLEURS` a été introduit par `d2bc478` (« aligner les en-têtes de `ci.yml` et
  `arch-invariants.sh` sur `docs/ci.md` »), postérieur à l'écriture du script (`3f7aace`) : la
  dérive est **antérieure à cette feature**, et ce lot la referme parce qu'il touche la même ligne
  et ne peut pas la laisser fausse dans les deux sens à la fois.

## Contrats d'interface

### Routes

| Route | Méthode | Entrée | Sortie |
|---|---|---|---|
| `/admin/connexion` | `GET` | — | le formulaire d'adresse · **pose le cookie d'appareil s'il manque** (décision 6) |
| `/admin/connexion` | `GET` | `?etape=code` | le formulaire de code |
| `/admin/connexion` | `GET` | `?etape=plafond` | l'annonce du plafond (`FR-009`) |
| `/admin/connexion` | `POST` | `etape=adresse`, `adresse`, cookie d'appareil | **réponse `A`** : `303` vers `?etape=code`, au terme du délai plancher · **réponse `B`**, plafond atteint : `303` vers `?etape=plafond` |
| `/admin/connexion` | `POST` | `etape=adresse`, **sans** cookie d'appareil | `303` vers `/admin/connexion` — le formulaire pose le cookie ; rien n'est engendré ni émis |
| `/admin/connexion` | `POST` | `etape=code`, `code`, cookie d'appareil | `303` vers `/admin/` + cookie de session · `200` portant l'un des trois refus |
| `/admin/` | `GET` | cookie de session | `200` l'accueil · `302` vers `/admin/connexion` |

**Aucune des deux réponses du `POST` d'adresse ne porte de `Set-Cookie`** — le cookie d'appareil est
posé par le `GET` du formulaire, jamais par la soumission (décision 6). C'est ce qui rend `FR-038`
vrai par construction et l'assertion de l'étape 3d faisable. Le choix entre `A` et `B` ne dépend que
de l'état du plafond du déploiement, jamais de l'adresse soumise (`FR-039`) — une adresse inconnue
sous plafond reçoit `B`, comme l'adresse autorisée.

**Corps en `application/x-www-form-urlencoded`, jamais `multipart`** — `Astro.request.formData()`
sur une page rendue par le serveur : **mesuré**, `POST` sur un `.astro` en `output: 'server'` est
servi et `Astro.request.method` vaut `POST`.

**La protection d'origine est celle du framework, et elle est active par défaut.** *Mesuré* : un
`POST` sans en-tête `Origin`, ou avec une origine étrangère, reçoit `403 Cross-site POST form
submissions are forbidden` ; `security.checkOrigin` vaut `true` par défaut
(`astro/dist/types/public/config.d.ts:517`). C'est la moitié « contrôle d'en-tête `Origin` » du
quatrième mécanisme d'`ADR-0006`, tenue sans une ligne de code — et sa fragilité est qu'un
`security: { checkOrigin: false }` la retirerait en silence. D'où le défaut injecté à l'étape 3ℓ.
Le **jeton** anti-forgerie reste hors périmètre (§ NON inclus de la spec) : ce lot n'introduit
aucune écriture authentifiée.

### Cookies

Les deux portent les mêmes attributs — `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`,
`Path=/` (`ADR-0006` mécanisme 3 ; `FR-022`, `FR-023`) :

| Cookie | Valeur | Durée | Sert |
|---|---|---|---|
| `__Host-colibri-appareil` | un identifiant opaque tiré au hasard, qui ne désigne que le navigateur | quinze minutes, rafraîchies à chaque `GET` du formulaire | `FR-011`, `FR-012`, `FR-027`, `FR-032` |
| `__Host-colibri-session` | l'identifiant opaque de la session | trente jours | `FR-018` à `FR-023` |

`Path=/` **sans restriction** : `ADR-0006` en donne le motif — restreindre le chemin casserait
`FR-082`, l'aperçu vivant sur la même origine sous une autre route.

### Schéma D1 (`migrations/0002_connexion.sql`)

```sql
CREATE TABLE adresse_autorisee (
  id       INTEGER PRIMARY KEY CHECK (id = 1),   -- une seule adresse, structurellement
  adresse  TEXT NOT NULL
);

CREATE TABLE code_connexion (
  id               TEXT PRIMARY KEY,   -- opaque, interne
  appareil         TEXT NOT NULL,      -- l'identifiant que porte le cookie d'appareil (décision 6)
  sel              BLOB NOT NULL,      -- tiré au hasard, une valeur par ligne (décision 14)
  empreinte        BLOB NOT NULL,      -- SHA-256(sel ‖ code normalisé) ; le code n'est jamais écrit
  emis_le          INTEGER NOT NULL,   -- ms epoch ; c'est aussi le compteur du plafond
  expire_le        INTEGER NOT NULL,
  essais_restants  INTEGER NOT NULL,
  consomme         INTEGER NOT NULL DEFAULT 0,
  annule           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX code_connexion_emis_le  ON code_connexion (emis_le);
CREATE INDEX code_connexion_appareil ON code_connexion (appareil);

CREATE TABLE session_admin (
  id          TEXT PRIMARY KEY,        -- opaque ; c'est lui que porte le cookie de session
  ouverte_le  INTEGER NOT NULL,
  vue_le      INTEGER NOT NULL
);
```

**Le plafond n'a pas de table à lui** : chaque émission engendre une ligne de `code_connexion`, et
`FR-008` se lit en comptant les lignes dont `emis_le` tombe dans l'heure glissante. Les lignes
annulées comptent — c'est ce qu'exige « cinq **messages** émis », et non « cinq codes vivants ».

**Aucune tâche planifiée n'efface rien** : l'expiration se calcule à la lecture (`FR-014`, `FR-020`,
`FR-021`), et les lignes mortes sont supprimées à l'occasion de l'écriture suivante.

### Modules

```ts
// src/core/auth/code.ts
export const ALPHABET: string;                        // 32 caractères, sans les confusables
export function engendrerCode(octets: Uint8Array): string;   // 8 signes = 2^40 exactement
export function normaliserSaisie(saisie: string): string;

// src/core/auth/verdict.ts
export type Verdict = 'ouvrir' | 'retaper' | 'redemander' | 'autre-appareil';
export function juger(etat: EtatCode | null, saisieValide: boolean, instant: number): Verdict;
// `etat` vaut null quand le cookie d'appareil est absent ou ne porte aucune ligne vivante :
// c'est ce cas-là qui rend `autre-appareil` (FR-012, FR-032), sans comparaison de plus.

// src/platform/session/index.ts  — chemin imposé par ADR-0026
export function exigerSession(contexte: APIContext): Promise<SessionOuverte | Response>;
export function ouvrirSession(contexte: APIContext): Promise<void>;
```

`exigerSession` rend **soit** la session, **soit** la réponse `302` vers l'écran de connexion
(`FR-019`, `FR-035`) : la route la retourne telle quelle, et l'oubli se voit au typage plutôt qu'à
l'exécution.

## Décisions & alternatives écartées

**1. Une seule route porte les deux étapes de la connexion.** `I6` impose que **tout** fichier de
route sous `src/pages/admin/` importe le garde de session. Une route dédiée à la seule soumission
d'adresse l'importerait sans jamais l'appeler — l'angle mort qu'`ADR-0026` déclare assumé
(« importer le garde n'est pas l'appeler ») deviendrait la première chose que le dépôt en fait.
Avec une route unique, l'import est honnête : c'est elle qui **ouvre** la session (`FR-011`). Le
passage d'une étape à l'autre se fait par une redirection `303` vers `?etape=code`, si bien qu'un
rafraîchissement ne réémet pas de code — donc ne consomme pas le plafond de `FR-008`.
Écarté : **deux routes**, `connexion.astro` et `code.astro` — plus lisible en apparence, mais elle
achète cette lisibilité en creusant l'angle mort d'un invariant.
Écarté aussi : **l'écran de connexion hors de `/admin/`**, avec des points d'entrée sous
`src/pages/api/public/` — `I6` cesserait de s'appliquer, mais l'écran où l'on saisit un code
sortirait du préfixe que `ADR-0015` fait porter par le code, donc de la CSP stricte, pour retomber
sous le fichier `_headers` du site public.

**2. Aucun JavaScript sur le parcours.** `I4` interdit toute directive `client:*` sous
`src/admin/`, et `ADR-0024` explique pourquoi : l'administration se bâtit sans script en ligne
parce que la CSP stricte est, avec l'invariant d'échappement, l'une des deux **seules** parades à
la quatrième porte — et cette porte n'a aucun repli. Le parcours n'a d'ailleurs rien à animer : deux
formulaires et un bouton.
Écarté : **un îlot Svelte** — il faudrait installer Svelte et les greffons ESLint que le plan du
scaffold a délibérément différés « à la feature qui pose le premier îlot », et le nocturne
`dead-code` partirait en rouge le soir même pour un écran sans comportement.

**3. Les en-têtes d'administration sont posés par un middleware logé dans une zone.**
`src/platform/entetes/middleware.ts`, inscrit depuis `astro.config.ts` par `addMiddleware` —
le même patron d'intégration que la sonde de développement déjà présente dans ce fichier.
*Mesuré* : `addMiddleware` existe en `astro@7.2.0` (`integrations.d.ts:321`), son `entrypoint`
accepte une `URL` — un chemin en chaîne est résolu comme un module nu et échoue
(`Cannot find module 'src/platform/entetes/middleware.ts'`) —, et il couvre **les trois formes de
réponse** : la page `200`, la redirection `302` de la garde, et le `404` sous `/admin/`.
**Arbitrage humain du 2026-08-19.** Écarté : **un gabarit d'administration partagé** — il ne voit
pas la redirection de `FR-035` ni les pages d'erreur, et « la CSP stricte sur *toute* réponse
d'administration » deviendrait faux au premier écart, sans qu'aucun écran ne change. Écarté aussi :
**`src/middleware.ts`, la convention d'Astro** — il crée sous `src/` le seul fichier qu'aucune des
cinq zones ne couvre, donc que `eslint.config.boundaries.js` ne classe pas : la matrice `I1`
cesserait de juger ses imports.

La politique posée, exactement celle qu'`ADR-0024` décrit — `script-src 'self'` et rien d'autre,
aucune source tierce (Turnstile ne concerne que les pages publiques à formulaire) :

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
form-action 'self'; base-uri 'none'; frame-ancestors 'none'
```

accompagnée de `X-Content-Type-Options: nosniff` et `Referrer-Policy: no-referrer`.

**4. Aucun bloc `<style>` dans un gabarit d'administration : la feuille de style est un asset.**
*Mesuré* : en développement, un `<style>` d'un fichier `.astro` est servi **en ligne**
(`<style data-vite-dev-id=…>`) — donc refusé par `style-src 'self'`. La parade évidente, relâcher la
politique en développement, est **fermée par la CI** : le contrôle `ADR-0015 (b) / ADR-0024`
d'`arch-invariants` rapporte toute occurrence d'`unsafe-inline` dans les sources, et l'y écrire
exigerait un commit signé au titre de `verifier-guard`. Le style vit donc dans `public/admin.css`,
lié depuis `src/admin/Page.astro`. Bénéfice qui n'est pas un lot de consolation : **la politique est
identique en développement et en production**, et une CSP qui diffère en développement est une CSP
que personne n'éprouve.

**5. Le code fait huit signes tirés de trente-deux caractères, et vaut exactement 2^40.**
`FR-002` exige au moins 40 bits, `FR-034` la forme : `32^8 = 2^40`, la borne est atteinte au signe
près. L'alphabet est celui de Crockford — `0123456789ABCDEFGHJKMNPQRSTVWXYZ` —, d'où `I`, `L`, `O`
et `U` sont absents ; la saisie est normalisée en sens inverse (`O` → `0`, `I` et `L` → `1`,
séparateurs ignorés, casse indifférente), ce que `SC-003` et `SC-015` réclament d'une éditrice qui
recopie à la main. Le tirage se fait par `crypto.getRandomValues` **dans `src/platform/`**, et les
octets sont passés à `src/core/` : `32` divise `256`, donc le reste est uniforme et il n'y a aucun
biais à corriger.
Écarté : **six chiffres**, la convention héritée du SMS — 20 bits, ce qu'`ADR-0006` refuse
explicitement.

**6. La liaison au navigateur demandeur est un cookie d'appareil, posé par le formulaire et non par
la soumission.** Le `GET` de `/admin/connexion` pose `__Host-colibri-appareil` s'il manque : un
identifiant opaque tiré au hasard, qui ne désigne que le navigateur et ne dérive de rien. Chaque
ligne de `code_connexion` porte cet identifiant ; présenter un code depuis un autre navigateur ne
trouve aucune ligne, ce qui rend `FR-012` et `FR-032` vrais par construction plutôt que par une
comparaison de plus, et `FR-027` — l'annulation du code précédent **sur cet appareil** — se lit
comme une mise à jour des lignes vivantes portant cet identifiant.

**Le poser au `GET` est ce qui rend `FR-038` structurel, et c'est la correction du 2026-08-21.** La
forme précédente — un cookie posé à l'**émission**, donc pour la seule adresse autorisée — faisait
dépendre la **présence** d'un `Set-Cookie` de l'adresse soumise : exactement ce que `FR-038`
interdit, et la raison pour laquelle l'assertion « identique octet pour octet » de l'étape 3d était
infaisable — le constat `Critical` de la gate. Posé au `GET`, le cookie a disparu de la réponse au
`POST` : aucune des deux branches n'en porte, et l'assertion redevient vraie sans exception à
écrire. Deux effets de bord, tous deux favorables : une adresse mal tapée ne tue plus le code en
attente — rien n'est émis, donc `FR-027` ne joue pas —, et un `POST` arrivé sans cookie, donc sans
être passé par le formulaire, est renvoyé au formulaire sans rien engendrer.
Écarté : **une empreinte de l'adresse IP ou de l'en-tête `User-Agent`** — le § « Données
personnelles » de `docs/stack.md` écrit que le compteur de fréquence est **le seul endroit du
produit** qui retienne quoi que ce soit tiré d'une adresse IP ; en ouvrir un second ici
contredirait le document, et l'empreinte survivrait quinze minutes sans clé de fenêtre pour la
protéger. L'identifiant d'appareil, lui, n'est dérivé de rien : il est tiré au hasard et meurt avec
sa fenêtre de quinze minutes.
Écarté aussi : **poser le cookie sur les deux branches du `POST`** — il tiendrait `FR-038` (même
présence, même longueur), mais laisserait dans la réponse un champ dont la valeur change à chaque
tir, donc une exception à écrire dans l'assertion de 3d ; et il ferait tourner l'identifiant à
chaque soumission, ce qui rendrait à une adresse mal tapée le pouvoir de tuer le code en attente.

**7. La réponse de l'écran de connexion est rendue au terme d'un délai plancher de 1 500 ms,
l'émission étant confiée à `waitUntil`.** L'ordre est imposé par les exigences : engendrer et
**écrire le code en base** (attendu — sinon l'éditrice pourrait saisir un code que la base ignore encore), puis remettre
l'**émission** à `Astro.locals.cfContext.waitUntil` (`FR-006`, `FR-007`), puis attendre le solde du
délai plancher, puis répondre.
*Mesuré* : `Astro.locals.cfContext` est un objet portant `waitUntil`, **y compris sous
`astro dev`** — c'est le remplaçant nommé par l'adaptateur (`Astro.locals.runtime.ctx has been
removed in Astro v6. Use 'Astro.locals.cfContext' instead.`), et l'interface `Runtime` de
`@astrojs/cloudflare` le type déjà (`cfContext: ExecutionContext`), donc rien à déclarer.
*Mesuré aussi* : `scheduler.wait` est une fonction dans `workerd`.

**Le plancher vaut 1 500 ms, et il est dérivé d'un budget de travail, jamais d'une bande
observée.** La spec fixe deux bornes et laisse le chiffre à ce plan : `SC-012` impose un **rapport**
— le plancher vaut au moins **vingt fois** le travail le plus long observé sur une soumission — et
`SC-003` une **tolérance** — écart des 95ᵉ centiles ≤ 25 ms sur cent tirs par adresse. Le travail
d'une soumission est de **trois allers-retours D1** (compter la fenêtre glissante, lire l'adresse
autorisée, écrire la ligne de code) plus un hachage. À 25 ms l'aller-retour — l'ordre de grandeur
d'un D1 de production, et non celui du D1 local sur lequel l'étape 3 mesure —, le travail plafonne
vers 75 ms, et 20 × 75 = 1 500.

**La constante est gelée dans `src/core/auth/regles.ts` avant que quoi que ce soit ne la mesure**,
et l'étape 3e ne fait que la **juger** : elle relève le travail le plus long sur les mêmes cent
tirs, consigne ce relevé comme `SC-012` l'exige, et échoue si le rapport tombe sous vingt. Aucune
étape ne réécrit la constante. L'y autoriser rendrait le contrôle circulaire — une mesure qui règle
le seuil qu'elle juge ne peut jamais échouer —, et c'est le constat `Critical` que la gate du
2026-08-21 a porté sur `T39`. Un rouge est donc un **fait**, et relever le plancher est une
modification de source, avec son commit.

**Ce que le chiffre coûte, et pourquoi c'est peu.** L'éditrice attend une seconde et demie après
avoir saisi son adresse, sur le seul écran du produit qui le fasse, et le Brief pose qu'elle se
connecte « quelques fois par an ». L'attente est du temps d'horloge et non du temps de calcul :
elle ne mord sur aucun quota du palier gratuit. Choisir plus court économiserait une seconde sur un
geste rare, contre une propriété qui ne se voit qu'à l'attaque.

**Résidu nommé** : une soumission dont le travail dépasserait 1 500 ms répondrait tard, donc
distinguerait. Rien ne le rend impossible — un D1 en incident, un démarrage à froid. `SC-003` et
`SC-012` le verraient, mais tous deux se jouent contre le D1 **local** : le premier déploiement
réel est le seul endroit où le rapport se vérifie sur des latences de production. C'est nommé ici
parce que ni la spec ni ce plan ne peuvent le fermer.
Écarté : **attendre un délai *supplémentaire* constant** — le total varierait avec le travail, ce
qui est précisément ce que `SC-003` mesure.

**8. Le plafond est éprouvé avant tout autre effet, ce qui fait tomber `FR-010` sans mécanisme.**
Quand cinq messages ont déjà été émis dans l'heure glissante, la route **ne touche à rien** : elle
n'engendre pas de code, donc n'annule pas le précédent (`FR-027` n'agit qu'à l'émission), donc « le
dernier code émis ouvre encore une session » est vrai sans qu'aucune ligne ne le prévoie.

**9. La liaison `send_email` ne porte pas de destination restreinte.** *Mesuré* sur le schéma de
`wrangler@4.120.0` : seul `name` est requis ; `destination_address` est décrite comme « if this
binding should be restricted to a specific verified address ». **La forme restreinte a d'abord été
retenue, puis retirée par l'arbitrage humain du 2026-08-21** : le contrôle qui rend `I8` cherche les
valeurs d'`instance.json` **en sous-chaîne** dans `wrangler.*`, si bien qu'une adresse hébergée sur
le domaine de l'instance — `contact@patisserie.fr` sur le site `patisserie.fr`, l'exemple du PRD —
rend `ko I8` (mesuré, § Réutilisation du socle). Le verdict du contrôle dépendrait alors de la boîte
que la cliente utilise, et l'assertion de bilan de l'étape 2 devrait tolérer une violation connue,
donc cesser d'attraper les autres.

**Ce que le retrait coûte, et ce qui l'amortit.** Le garde-fou de plateforme pour `FR-004` s'élargit
d'« une adresse » à « les adresses vérifiées du compte » ; sur un compte mono-client — « un
déploiement = un site = un client », `FR-104` du PRD — il n'y en a qu'une, et la perte est donc
théorique. Ce qui tient `FR-004` reste ce qui le tenait déjà : la destination est **lue en D1**,
c'est l'adresse autorisée et rien d'autre, et la plateforme refuse de toute façon toute adresse non
vérifiée du compte.
*Mesuré* : la liaison est simulée localement par Miniflare — `env.ENVOI_CODE` est présent sous
`astro dev`, `new EmailMessage(from, to, brut)` importé de `cloudflare:email` aboutit, et le message
est écrit tel quel en `.eml` sous `.wrangler/tmp/email/**`. C'est ce qui rend l'étape 3 réellement
bout-en-bout.
Écarté : **corriger le contrôle `I8`** pour qu'il cesse de mordre sur une valeur incluse dans un
jeton plus long — il faudrait toucher `.github/scripts/arch-invariants.sh` depuis un plan de
feature, et la falsification qu'`archi` écrit pour `I8` est « l'occurrence du domaine ou de la clé
publique Turnstile, hors d'`instance.json` », qu'une adresse sur ce domaine **est** littéralement :
assouplir le script sans l'autorité de `/scd-sdd:archi` ferait dériver l'invariant en silence.
**Résidu à verser à `/scd-sdd:premortem socle`** : l'adresse de la cliente existe en **deux lieux**
— en D1 pour l'autorisation, dans le compte Cloudflare comme destination vérifiée d'Email Routing —
et **rien ne les tient synchronisées**. Une dérive ne casse aucun écran : l'émission est refusée par
la plateforme, `FR-007` rend la même réponse qu'en cas de succès, et la porte se ferme en silence.
C'est une ligne de recette de livraison, pas un contrôle — et la recette n'en porte aucune
aujourd'hui. **Le retrait de la restriction ne crée pas ce résidu : il en déplace le second lieu**,
de la configuration du déploiement vers le compte Cloudflare.

**10. L'adresse d'expédition est dérivée d'`instance.json` par un import.** *Mesuré* :
`import instance from '../../../instance.json' with { type: 'json' }` depuis `src/platform/` — la
valeur est rendue en développement, `tsc --noEmit` sort à `0`, et `eslint --config
eslint.config.boundaries.js src` sort à `0` (l'import n'est pas une arête entre zones).
Écarté : **écrire l'adresse d'expédition en dur** — `I8` la rapporterait en fuite dès qu'elle porte
le domaine. Écarté aussi : **une variable de la configuration du déploiement** — elle ajouterait une
seconde valeur d'instance à un lieu que le socle n'a ouvert que pour deux.

**11. `vitest.config.ts` lit les migrations et les expose en liaison de test.** *Mesuré* : sans
elle, `applyD1Migrations(env.DB, env.MIGRATIONS)` échoue —
`parameter 2 is not of type 'D1Migration[]'`. Avec `readD1Migrations` (exporté par la racine du
paquet) et `miniflare: { bindings: { MIGRATIONS: migrations } }`, la suite passe : deux tests, dont
un qui insère et relit dans D1.

**12. La déclaration ambiante de `cloudflare:test` est un fichier, pas une clé de `tsconfig.json`.**
*Mesuré* : le premier fichier de test fait échouer `npm run typecheck` — `TS2307: Cannot find module
'cloudflare:test'` —, et `typecheck` est **bloquant**. Un fichier portant
`/// <reference types="@cloudflare/vitest-pool-workers/types" />` et l'interface `ProvidedEnv` fait
repasser `tsc --noEmit` à `0`, `tsconfig.json` inchangé.
Écarté : **ajouter `types` à `tsconfig.json`** — la clé remplace la liste héritée au lieu de s'y
ajouter, et elle touche un fichier de plus sous `quality-config-guard`.

**13. Pas de Playwright dans ce lot.** `ADR-0013` le retient « pour les parcours », et ce plan ne le
contredit pas — il le diffère, avec son motif : le parcours livré ici ne porte **aucun
JavaScript** (décision 2), donc un navigateur ne constaterait rien que `curl` ne constate, et il
coûterait une dépendance lourde sous le gel de sept jours. Il arrive avec le premier écran qui a un
comportement client.

**14. L'empreinte du code est salée, et ce que `FR-040` promet est borné ici.** Chaque ligne de
`code_connexion` porte un sel tiré au hasard, et l'empreinte vaut `SHA-256(sel ‖ code normalisé)` :
le code n'est jamais écrit, et deux codes identiques donnent deux empreintes différentes. Le sel ne
coûte rien — seize octets à côté d'un hachage qu'il fallait faire de toute façon — et il retire la
table précalculée, qui sur un espace de 2^40 serait autrement une simple lecture.

**Ce qu'il ne retire pas, et le dire est le point.** `FR-040` — « ne conserver du code émis aucune
forme qui permette de le retrouver » — et `SC-015` se lisent au sens de la **conservation**, non au
sens de l'irréversibilité calculatoire : à 40 bits, un hachage ne résiste pas à une recherche
exhaustive hors ligne, et `docs/stack.md` l'écrit noir sur blanc en arbitrant le moyen de reprise —
« 40 bits y tombent en secondes quel que soit le KDF », ce qui est précisément le motif de ses
128 bits à lui. Ce que le code de connexion oppose à cette recherche n'est pas son empreinte, ce
sont **son expiration à quinze minutes** (`FR-014`) et **son brûlage au cinquième essai**
(`FR-015`). `SC-015` se vérifie donc pour ce qu'il dit, et l'étape 3o le prend au mot : le code émis
n'apparaît nulle part dans ce que le système a conservé.
Écarté : **allonger le code** pour rendre la recherche exhaustive vaine — `ADR-0006` fixe 40 bits et
`FR-034` la forme que l'éditrice recopie à la main ; un plan n'y revient pas.
Écarté aussi : **un KDF à coût réglable** — il ne déplace pas la borne des 40 bits, et il ajoute au
budget de travail de chaque soumission ce que la décision 7 cherche justement à borner.

**15. `@cloudflare/vitest-pool-workers` passe de `^0.20.3` à `^0.21.3`, parce que l'ADR le dit et
que ce lot est le premier à s'en servir.** `ADR-0013` retient explicitement la **famille `0.21.x`**,
et il nomme une famille plutôt qu'un correctif parce que la cadence de publication est rapide. Le
dépôt est resté sur `0.20.3`, posé par le scaffold : **l'écart est antérieur à cette feature**, mais
c'est elle qui écrit le premier fichier de test du dépôt, donc la première pour qui ce paquet est
autre chose qu'une ligne de `package.json`. Le laisser courir voudrait dire mesurer les décisions 11
et 12 sur une version que le socle ne retient pas.

*Mesuré le 2026-08-21 sur le registre npm* : `0.21.3` est publiée le **2026-08-13**, soit huit jours
— au-delà du gel de sept jours d'`.npmrc`, donc installable ce jour. `0.22.0` est publiée le
2026-08-18 : trois jours, donc **doublement hors d'atteinte**, par le gel et par la famille que
l'ADR nomme — `^0.21.3` l'exclut de lui-même. Les pairs ne bougent pas (`vitest ^4.1.0` des deux
côtés, `4.1.10` installé) ; les dépendances épinglées, si — `wrangler` de `4.120.0` à `4.123.0`,
`miniflare` de `5.20260801.1-alpha` à `5.20260811.1-alpha`. Le `compatibility_date` de
`wrangler.jsonc` n'en souffre pas : le commentaire qui le borne donne « plus haute date supportée
2026-08-08 » pour le `workerd` du lockfile, et un `miniflare` plus récent ne fait que **relever** ce
plafond, jamais l'abaisser.

**Ce que la montée oblige à revérifier** : les décisions 11 (`readD1Migrations` et la liaison
`MIGRATIONS`) et 12 (la déclaration ambiante de `cloudflare:test`) sont mesurées sur `0.20.3`. Elles
se rejouent sur `0.21.3` au moment où le premier test est écrit ; c'est la seule chose que la montée
déplace.
Écarté : **nommer l'écart et rester sur `0.20.3`** — c'est l'autre issue que la gate laissait
ouverte, et elle coûte deux décisions mesurées sur une version que le socle ne retient pas, plus une
montée à faire de toute façon avant le premier déploiement.

**Contraintes de livraison, à ne pas découvrir en PR.** Le lot touche `vitest.config.ts`, surveillé
par `quality-config-guard` : la PR **doit** porter le label `config-change`, ou le commit qui y
touche un scope `chore(config):`. Il touche aussi `package.json` et le lockfile (décision 15) : ce
commit-là porte `build(deps):` ou `chore(deps):`, ou la PR le label `deps` — `dependency-review`
distingue ainsi une évolution déclarée d'une dérive silencieuse.

## Étape de vérification bout-en-bout

Une seule commande, sur un dépôt propre :

```bash
bash scripts/verif-connexion.sh
```

Elle enchaîne et refuse au premier écart :

1. **Les quatre commandes normatives** — `npm run typecheck`, `npm test`, `npm run build`,
   `npm run lint:boundaries` : quatre codes de sortie nuls. C'est ici que le premier fichier de test
   du dépôt cesse d'être une hypothèse : `npm test` rapporte des tests **exécutés**, là où
   `docs/ci.md` note encore « réelle, et vide ».
2. **`bash .github/scripts/arch-invariants.sh`** — code de sortie nul, et le bilan **exact** :
   `── Bilan : 12 contrôle(s) au vert · 1 vérifié(s) ailleurs · 2 hors portée · 0 violation(s)`.
   Le déplacement est le fait du lot et se lit invariant par invariant. `I6` est **un seul** état
   hors portée tant que `src/pages/api/` et `src/pages/admin/` sont absents, mais **deux** états au
   vert dès que l'un existe — `I6 (a)`, l'import du garde, et `I6 (b)`, l'absence de corps
   `multipart` sur la surface publique ; `src/pages/admin/` naît ici, donc un hors portée devient
   deux verts. `ADR-0006` quitte le hors portée parce que `src/platform/session/` existe : un de
   plus au vert, un de moins hors portée. Total : **trois états de plus au vert, deux de moins hors
   portée**. Ne restent hors portée qu'`I7` et `I9`. **L'assertion attrape les deux sens** : un `I6` retombé
   hors portée dirait que les routes ont été déplacées hors du préfixe gardé ; un `ADR-0006`
   rapporté en violation dirait qu'un des quatre attributs du cookie a disparu — c'est-à-dire
   `FR-022` ou `FR-023` cassé sans qu'aucun écran ne change.
3. **Le parcours réel, sur `npm run dev`**, avec deux bocaux à cookies distincts. *Mesuré* : `curl`
   renvoie bien un cookie `Secure` sur `http://localhost`, donc la marche entière est jouable sans
   TLS.
   - **a.** semer l'adresse autorisée dans la base locale
     (`wrangler d1 execute DB --local --command "insert into adresse_autorisee …"`) — c'est le geste
     d'exploitation que la spec range hors produit, et l'étape en est la démonstration exécutable ;
   - **b.** `GET /admin/` sans cookie → **302** vers `/admin/connexion`, **et la réponse porte la
     CSP stricte** (`FR-019`, `FR-035`, décision 3) ;
   - **b-bis.** `GET /admin/connexion` dans **chacun des deux bocaux** → **200**, et chacun repart
     avec son cookie d'appareil, tiré au hasard et différent de l'autre (décision 6). C'est ce `GET`
     qui fait des deux bocaux deux appareils distincts, ce dont (g) et (i) dépendent ; et c'est ce
     qui rend l'assertion de (d) possible, la soumission ne posant plus aucun cookie ;
   - **c.** `POST` d'une adresse inconnue depuis le premier bocal → réponse `A`, et **aucun**
     fichier `.eml` n'apparaît (`FR-003`, `FR-004`, `SC-002`) ;
   - **d.** `POST` de l'adresse autorisée **depuis le même bocal** → **corps identique octet pour
     octet** à celui de (c), et
     **même jeu de champs d'en-tête, avec les mêmes valeurs, `Date` excepté** ; un `.eml` apparaît
     (`FR-001`, `FR-005`, `FR-038`, `SC-003`). L'assertion est faisable **parce qu'**aucune des deux
     réponses ne porte de `Set-Cookie` — le cookie d'appareil est posé au `GET` (décision 6) ; c'est
     le périmètre que la gate du 2026-08-21 demandait de trancher, et il est celui de `FR-005` :
     le corps et les champs d'en-tête, rien de plus, rien de moins ;
   - **e.** **cent soumissions de chaque adresse** : l'écart entre les **95ᵉ centiles** des deux
     séries est **≤ 25 ms** (`SC-003`) ; et le travail le plus long observé sur une soumission est
     relevé, puis **consigné comme pièce**, le plancher gelé à 1 500 ms dans
     `src/core/auth/regles.ts` devant valoir **au moins vingt fois** ce relevé (`SC-012`).
     L'étape **juge** la constante et ne la règle jamais (décision 7) (`FR-006`, `FR-033`) ;
   - **f.** le `.eml` est en **texte seul**, son objet est celui du produit et ne porte rien de la
     saisie (`FR-036`, `FR-037`) ; le code en est extrait pour la suite ;
   - **g.** présenter le code **depuis le second bocal** → refus, et le texte est celui qui invite à
     reprendre sur l'appareil demandeur (`FR-012`, `FR-032`) ;
   - **h.** présenter un code faux cinq fois depuis le bon bocal → les quatre premiers invitent à
     retaper (`FR-028`), le cinquième invite à demander un nouveau code et le code cesse d'être
     présentable (`FR-015`, `FR-031`) ;
   - **i.** redemander un code, puis présenter **l'avant-dernier** → refus, invitation à en demander
     un nouveau (`FR-027`, `FR-031`) ;
   - **j.** présenter le bon code → **302** vers `/admin/`, cookie de session portant les quatre
     attributs (`FR-011`, `FR-022`, `FR-023`) ; le **rejouer** → refus (`FR-013`) ;
   - **k.** `GET /admin/` avec le cookie → **200**, l'écran d'accueil (`FR-018`) ;
   - **l.** `POST` sur `/admin/connexion` avec une origine étrangère → **403** (§ contrats) ;
   - **m.** six soumissions d'affilée de l'adresse autorisée → **cinq `.eml` seulement**, la sixième
     réponse annonce le plafond, et le dernier code reçu ouvre encore une session (`FR-008`,
     `FR-009`, `FR-010`, `SC-005`) ; puis, **le plafond toujours atteint**, une soumission d'une
     **adresse inconnue** → même corps et mêmes champs d'en-tête que la sixième (`FR-039`,
     `SC-013`). Sans ce second tir, l'annonce du plafond serait le seul endroit du parcours qui
     désigne l'adresse autorisée — et la mesure ne le verrait pas ;
   - **n.** vider `adresse_autorisee`, `POST` → réponse `A`, aucun `.eml`, aucune session
     (`FR-029`, `SC-010`) ;
   - **o.** vider les trois tables de la base locale dans un fichier, et y chercher
     **littéralement** le code extrait en (f) : aucune occurrence (`FR-040`, `SC-015`). Ce que
     l'étape prouve est borné par la décision 14 — la conservation, jamais l'irréversibilité
     calculatoire ;
   - **p.** les **trois formes de réponse de l'administration** — l'écran servi de (k), le renvoi de
     (b), et un `GET /admin/chemin-inconnu` — portent toutes trois la politique de sécurité,
     `X-Content-Type-Options: nosniff` et `Referrer-Policy: no-referrer` ; et **aucune des trois**
     n'admet de script en ligne, d'évaluation dynamique de code ni de source autre que le site
     lui-même (`FR-041` à `FR-044`, `SC-014`). Les trois sont tirées séparément parce que c'est
     exactement ce que `SC-014` compte : une politique posée sur l'écran mais absente du renvoi ou
     de l'erreur laisse deux réponses nues sur l'origine commune ;
   - **q.** `astro dev stop`.
4. **Une absence, vérifiée comme telle** : aucune source de `src/pages/` ni de `src/admin/` n'écrit
   dans `adresse_autorisee` (`FR-026`). L'exigence est une absence de route ; seule une assertion
   sur les sources la rend falsifiable.

**Quatre groupes d'exigences ne passent pas par ce script, et leur porteur est nommé.** `FR-014`
(quinze minutes), `FR-020` (sept jours) et `FR-021` (trente jours) se jouent contre `src/core/auth/`
à **instant injecté** — les attendre en temps réel serait un test qui dure un mois. `FR-016`,
`FR-017` et `FR-024` sont des **absences dans un formulaire** (aucun champ de mot de passe, aucun
lien de création de compte, aucun renvoi vers un autre compte) et se lisent dans `src/admin/`.
`FR-025` et `SC-007` relèvent de la classe 12 de `docs/archi.md` — conformité sémantique, hors
d'atteinte d'un grep : la relecture est le seul moyen, et `src/admin/textes.ts` est ce qui la rend
praticable. `SC-001` est un test d'usage observé, avec une personne.

## Couverture des exigences

Les **44** `FR` de la spec sont couverts. Sept sont nés de la passe de correction du 2026-08-21 et
sont marqués **✦**.

| `FR` | Porté par |
|---|---|
| `FR-001` `FR-004` | `src/platform/auth/emission.ts` + liaison `ENVOI_CODE` ; étapes 3c, 3d |
| `FR-002` `FR-034` | `src/core/auth/code.ts` ; test unitaire, `SC-011` |
| `FR-003` `FR-029` | `src/platform/auth/magasin.ts` (lecture de l'adresse autorisée) ; étapes 3c, 3n |
| `FR-005` `FR-006` `FR-007` `FR-033` | `src/pages/admin/connexion.astro` — réponse unique, `waitUntil`, plancher gelé (décision 7) ; étapes 3d, 3e |
| ✦ `FR-038` | aucun `Set-Cookie` sur la réponse au `POST` d'adresse — décision 6 ; étape 3d |
| `FR-008` `FR-009` `FR-010` | `src/core/auth/regles.ts` + comptage sur `code_connexion` ; étape 3m |
| ✦ `FR-039` | réponse `B` choisie sur l'état du plafond seul, jamais sur l'adresse — § contrats ; étape 3m, second tir |
| `FR-011` `FR-013` | `src/platform/session/index.ts` + `magasin.ts` ; étape 3j |
| `FR-012` `FR-032` | cookie d'appareil, décision 6 ; étapes 3b-bis, 3g |
| `FR-014` `FR-020` `FR-021` | `src/core/auth/regles.ts` ; tests unitaires à instant injecté |
| `FR-015` `FR-028` `FR-031` | `src/core/auth/verdict.ts` + `src/admin/textes.ts` ; étapes 3h, 3i |
| `FR-016` `FR-017` `FR-024` | absence de champ et de lien dans `src/admin/connexion/` ; relecture |
| `FR-018` | `src/pages/admin/index.astro` + `src/admin/accueil/Accueil.astro` ; étape 3k |
| `FR-019` `FR-035` | `exigerSession` ; étape 3b |
| `FR-022` `FR-023` | `src/platform/session/cookies.ts` ; étape 3j **et** contrôle `ADR-0006`, étape 2 |
| `FR-025` | `src/admin/textes.ts`, porteur unique ; relecture (`SC-007`) |
| `FR-026` | aucune route ne l'écrit ; étape 4 |
| `FR-027` | annulation, à l'émission, des lignes vivantes portant l'identifiant d'appareil ; étape 3i |
| `FR-030` | `src/admin/connexion/FormulaireCode.astro` ; assertion de présence du texte, étape 3 |
| `FR-036` `FR-037` | `src/platform/auth/emission.ts` ; étape 3f |
| ✦ `FR-040` | colonnes `sel` et `empreinte` de `code_connexion`, décision 14 ; étape 3o |
| ✦ `FR-041` `FR-042` `FR-043` `FR-044` | `src/platform/entetes/middleware.ts`, décision 3 ; étape 3p, les trois formes tirées séparément |

Les **15** `SC` sont couverts par les mêmes porteurs, et **quatre sont nés de la même passe** :
`SC-012` (le rapport de vingt, étape 3e — c'est lui qui interdit de rogner le plancher, là où
`SC-003` seul ne le verrait pas), `SC-013` (le second tir de l'étape 3m), `SC-014` (l'étape 3p) et
`SC-015` (l'étape 3o, dans les bornes que la décision 14 écrit).

## Candidat ADR déposé

[« Les en-têtes de sécurité de l'administration sont posés par un middleware logé dans une
zone »](../../docs/adr/_candidates/en-tetes-d-administration-poses-par-un-middleware.md) —
décision 3. Il reste un **brouillon** tant qu'un humain ne l'a pas promu par `/scd-sdd:adr`.
