# Suites de l'audit de sécurité — plan de remédiation par lots

| | |
|---|---|
| **Statut** | en cours |
| **Créé** | 2026-08-01 |
| **Révisé** | 2026-08-01 — découpage repris avec matrice de traçabilité exhaustive |
| **Trace vers** | [docs/audit-securite-2026-08-01.md](./audit-securite-2026-08-01.md) |
| **Nature** | document de travail **temporaire** |

> **Ce document s'éteint quand il a fait son travail.** Comme `docs/suites-revue-prd.md`
> avant lui (clos et supprimé le 2026-08-01, commit `ec19120`), il n'existe que pour
> empêcher qu'un découpage tranché ne se rejoue entre deux sessions. Le contenu durable
> vit dans les ADR et le PRD ; le suivi par constat vit dans le tableau de l'audit. Quand
> les lots sont passés, ce fichier disparaît — c'est le lot L9 qui l'emporte.

## Avancement

| Lot | Cible | Constats | État |
|---|---|---|---|
| **L1** | PRD — section « Exigences transverses », `FR-100` → `FR-110` | 8 | ✅ fait le 2026-08-01 |
| **L2** | ADR-0011 « Frontières de contenu hostile » (création) | 5 | ✅ fait le 2026-08-01 |
| **L3** | ADR-0004 amendement (c) — le cœur | 10 | ✅ fait le 2026-08-01 |
| L4 | ADR-0010 amendement (c) — clés naturelles, assets, cache | 4 | à faire |
| L5 | ADR-0007 amendement (e) — chemin de soumission | 11 | à faire |
| L6 | ADR-0003 amendement (d) — plateforme et exposition | 8 | à faire |
| L7 | ADR-0006 amendement + promotion d'ADR-0009 | 4 | à faire |
| L8 | ADR-0008 amendement (b) — distribution, secrets, exploitation | 11 | à faire |
| L9 | ADR-0005 (cibles de test) + clôture du chantier | 2 | à faire |
| L10 | Mécanisation (hooks / checks) — optionnel, après L7 | — | à faire |
| L11 | Re-passe d'audit — après la Porte 1 | — | à faire |

---

## Pourquoi ce document

L'[audit](./audit-securite-2026-08-01.md) ouvre **54 constats** de conception — 4 critiques,
14 élevés, 26 moyens, 10 faibles — sur le socle documentaire (`brief → prd → stack → adr`).
Aucun ne porte sur du code : `apps/` et `packages/` n'existent pas. Tous se corrigent par
**amendement documentaire**, à coût quasi nul maintenant, au prix d'une réécriture plus tard.

Le constat racine est mécanique : ADR-0002 pose que les vérifications déterministes (hooks
`PreToolUse`, checks CI) sont **compilées depuis les `## Constraints` des ADR**. Une règle
absente de tout `## Constraints` n'est appliquée par rien — or le brief assume que « le code
n'est pas relu ligne à ligne ». D'où la recommandation de l'audit : *appliquer à l'injection
le traitement que le projet a su appliquer à la fuite de brouillon* (ADR-0010).

**Révision du 2026-08-01.** Un premier découpage avait été arrêté et son lot L1 exécuté. La
vérification de couverture contre les 54 constats a révélé **deux orphelins** — `D-05`
(métrique « 500 builds/mois » caduque dans ADR-0005) et `D-10` (écart de total absorbé sans
trace) — et un constat traité à moitié (`C-13`, cache CDN après dépublication). Le découpage
ci-dessous est repris avec une **matrice de traçabilité exhaustive** : chaque constat est
assigné, et la couverture est vérifiable.

---

## Règles de forme (relevé fait une fois, à ne pas re-dériver)

| Point | Règle |
|---|---|
| Grain | **Un lot = un document = un amendement daté unique**, structuré en points numérotés. Précédent `ec19120` : « quatre amendements, un par ADR concerné ». |
| Forme d'amendement | Bloc-citation `> **Amendement …**` en tête pour **0004, 0005, 0007** ; section `## Amendement …` en corps pour **0003, 0008, 0010**. Ne pas mélanger dans un fichier. |
| Lettre suivante | 0003 → `(d)` · 0004 → `(c)` · 0007 → `(e)` · 0010 → `(c)` · 0008 → `(b)` · 0005 → non lettré · 0006 → premier. **Piège** : le premier amendement d'une série n'est jamais lettré mais est cité comme « (a) ». |
| Contraintes | **Toujours** dans le `## Constraints` principal (avant-dernière section), puce plate `- **OBLIGATOIRE** *(2026-08-01)* : …`. **Aucun identifiant de contrainte** — ne pas en introduire. |
| Immuabilité | Jamais de suppression : `~~texte~~` + `**→ Levé / Renversé / Nuancé / Scindé le 2026-08-01.**` |
| Front-matter | 9 champs, ordre fixe. Aucun champ `amended-by` : les amendements n'y laissent pas de trace. |
| PRD, stack.md, CLAUDE.md | **Pas** de convention d'amendement lettré — seulement une date `Révisé`. Plusieurs lots peuvent donc les toucher sans conflit de forme. |

**Numérotation.** `ADR-0011` est libre ; `0009` reste réservé par
`_candidates/0009-portail-qualite-draft.md`. Côté PRD, `FR-110` est désormais le maximum —
numérotation dense, **jamais renumérotée**.

**Outillage.** Réel et extensible : 2 hooks `PreToolUse`, portail à 11 checks rejoué en CI et
en nightly. Trois voies d'application — `estCheminProtege()`
(`tooling/quality-gate/src/protected-paths.ts`, source unique), un nouveau hook, un check dans
`src/checks/index.ts`. **Mais aucun ne mord aujourd'hui** : 5 des 11 checks dépendent de
`apps/`/`packages/`, absents ; la CI est verte par vacuité de périmètre. Et **ADR-0009, qui
gouverne ce portail, est resté candidat**.

**`docs/JOURNAL.md` n'existe pas** dans l'arbre, alors que `CLAUDE.md` et l'audit y renvoient.

---

## Décisions

1. **Portée : les 54 constats**, pas seulement les élevés. Le découpage par document rend le
   marginal quasi nul — écrire `C-01` dans le même amendement que `B-02` coûte deux lignes ;
   rouvrir ADR-0004 plus tard coûte un amendement supplémentaire.
2. **Documentaire d'abord, mécanisation ensuite** (L10). Le check ne peut pas mordre avant que
   `packages/`/`apps/` existent.
3. **États du tableau de suivi**, selon la règle de l'audit : `Traité` si la règle n'est pas
   mécanisable et vit dans un document accepté · `En cours` si elle est mécanisable, écrite en
   `## Constraints`, mais sans hook ni check · `Accepté` avec motif écrit pour un risque assumé.
4. **ADR-0011 créé directement en `accepted`** (précédent ADR-0010, commit `9c3822e`) — la
   règle de suivi exige « un document **accepté**, pas un candidat ».
5. **Granularité : neuf lots documentaires, un par document.** Les lots ADR-0004, ADR-0007 et
   ADR-0008 portent 10-11 constats chacun ; ils restent relisibles parce que l'amendement est
   structuré en points numérotés, comme l'amendement `2026-08-01` existant d'ADR-0004 (4 points)
   ou l'amendement `(b)` d'ADR-0003 (3 points).
6. **Mentions légales et information de confidentialité rapatriées en V1**, en exigences
   pleines avec surface d'édition — appliqué en L1.
7. **Cadence : un lot à la fois**, sur feu vert explicite.

---

## Les lots

### L1 — PRD, section « Exigences transverses » ✅ *fait le 2026-08-01*

`docs/prd.md` · **Ferme : A-01ᵖ, B-08ᵖ, B-09ᵖ, B-12ᵖ, C-11, C-12ᵖ, C-17d, D-01ᵖ.**

`FR-100` → `FR-110` : contenu saisi jamais interprété comme instruction, bornes de taille des
entrées visiteur, plafond de volume de soumissions **distinct** de l'anti-robot, bornage des
médias, PII hors journaux techniques, information de confidentialité et mentions légales avec
surface d'édition et blocage de publication, déconnexion volontaire. Rature de la ligne
« Pied de page enrichi » des Pistes post-V1 ; `SC-001`/`SC-007` complétés ; question ouverte
RGPD amendée — ce n'est plus l'*existence* d'une mention qui est ouverte, seulement sa
*rédaction*.

### L2 — ADR-0011 « Frontières de contenu hostile » (création, `accepted`) ✅ *fait le 2026-08-01*

`docs/adr/ADR-0011-frontieres-de-contenu-hostile.md` *(nouveau)* · `docs/adr/README.md` ·
`docs/stack.md` · `CLAUDE.md` · **Ferme : A-01, A-02, C-07, C-12, C-17a.**

Famille « longue », `## Constraints` avant-dernier, `depends-on: [ADR-0004]`, tracé vers
`FR-100` → `FR-104`. Allowlist **fermée** du schéma de texte riche — nœuds, marques et
attributs énumérés, tout attribut non listé **rejeté** et non ignoré, la neutralisation étant
une propriété du **schéma d'entrée** et jamais du rendu (A-02) ; **contexte de rendu déclaré**
dans le contrat de gabarit — corps HTML, attribut, `href`, `<title>`, `content` d'une `<meta>`
n'ont pas le même échappement (C-17a) ; type réel déterminé par **signature d'octets**, liste
fermée JPEG/PNG/WebP/AVIF, `image/svg+xml` interdit sans ADR, extension de la clé R2 dérivée
du type **détecté** (C-07) ; CSP et en-têtes de réponse, site statique et Worker (C-12).
Mettre à jour l'index, le graphe de dépendance et la ligne « (0009 est réservé…) » du README.

**En premier** : c'est la racine que les lots suivants citent.

### L3 — ADR-0004 amendement (c) : le cœur ✅ *fait le 2026-08-01*

`docs/adr/ADR-0004-architecture-du-code.md` · `docs/stack.md`
**Ferme : A-03ᵖ, B-02, B-05, B-07, B-10ᵖ, C-01, C-15, C-17b, D-02, D-04.**

Six points numérotés :

1. **Forme de sortie de `toBlocks()`** tranchée comme partie du contrat de gabarit — arbre
   structuré rendu nœud par nœud avec l'échappement natif d'Astro, seul choix qui rende
   `set:html` inutile, puis interdit (A-03).
2. **Toute requête D1 est paramétrée** ; interpolation interdite, y compris pour un nom de
   colonne ou une clause `IN` de longueur variable ; vaut aussi pour l'adaptateur HTTP du
   build, qui lit le contenu devenant le site public (B-05).
3. **Aperçu SSR** reconnu comme rendu de contenu non fiable dans une origine privilégiée →
   CSP restrictive sur `/preview/*`, idéalement hôte distinct sous la même politique Access
   (B-02). Le CSRF `checkOrigin` ne protège de rien ici : la requête vient de la bonne origine.
4. **Service des médias hors build** : `Content-Type` issu du type **détecté à l'entrée** et
   jamais du fichier, `nosniff`, `Content-Disposition` normalisé, origine distincte de
   l'admin ; mode d'exposition R2 tranché via le seam `AssetResolver` (B-07, B-10). Noter la
   conséquence structurelle : le produit **ne peut pas réencoder à l'entrée** (Sharp est
   build-only), la validation par signature est donc la seule barrière.
5. **`verifyAccessJwt`** : signature contre le JWKS du team domain, `aud`, `iss`, `exp` ; tout
   échec, y compris d'obtention du JWKS, refuse (**fail-closed**) (C-01). Et `users` n'est
   jamais consulté comme liste d'autorisation — Access en est l'unique source (D-02).
6. **`FR-090`/`FR-091` remontés dans la tête du pipeline** —
   `writeHandler({auth:'public', against:'live-form-definition'})` — ou, à défaut, écrit
   explicitement que ces deux règles sont garanties par le test et non par la forme (C-15).

Plus, dans `stack.md` et le `## Constraints` : restriction `http(s)` du `LinkTarget` remontée
d'un commentaire de code vers une contrainte, `rel="noopener noreferrer"` (C-17b) ; correction
**`Email Routing` → `Email Service`** (D-04, à traiter tôt : induit une mauvaise implémentation).

*Au passage* : les signatures `getBySlug(…, { includeDrafts:true })` du § « Les flux » sont
antérieures à ADR-0010 et contredisent son interdiction d'une fonction générique paramétrée
par l'état — à raturer.

**Tranché à l'exécution** (points 3 et 4, arbitrage humain) : un **seul nom d'hôte distinct
« surface non fiable »**, sous-domaine du même apex, sous la **même politique Access**, portant
`/preview/*` **et** le service des médias bruts, avec sa politique de contenu propre. C'est le
seul point où B-07 (« origine distincte de l'admin ») et B-10 (« jamais public, derrière
Access ») se rejoignent ; l'option « CSP seule » aurait laissé B-07 à moitié ouvert, l'option
« deux hôtes » coûte une troisième application Access par instance sans rien acheter tant que
l'aperçu et les médias bruts ont le même niveau de confiance. **`Email Routing` n'existait pas
dans `stack.md`** — ses occurrences disaient déjà « Email Service » ; la correction D-04 n'a
porté que sur ADR-0004. Résiduel connu, laissé à son lot : `ADR-0005` § amendement 2026-07-17
dit encore « Email Routing » (lot **L9**).

### L4 — ADR-0010 amendement (c) : clés naturelles, assets, cache

`docs/adr/ADR-0010-modele-brouillon-publie.md` · `docs/stack.md` · `docs/prd.md`
**Ferme : B-06, B-10, C-13, D-03.**

`field_key` / `option_key` / `zone_key` : charset fermé `^[a-z][a-z0-9_]{0,63}$`, **engendrée
une fois** à la création du champ et **immuable ensuite**, unicité par suffixe déterministe en
cas de collision, rejet Zod strict à la lecture (B-06) — la contrainte de stabilité est déjà
écrite, c'est le mécanisme qui la tient qui manque. Extension de l'invariant § 8 « rien de
rendu au visiteur ne vit hors des deux contenus » aux **assets** : originaux jamais publics,
seuls les dérivés référencés par du contenu `live` atteignant une surface publique (B-10).
Délai borné d'effacement du cache CDN après dépublication, aligné sur `SC-004`, et sort des
dérivés R2 (C-13). Jeton de verrou optimiste **sous-seconde**
(`strftime('%Y-%m-%dT%H:%M:%f','now')` ou compteur entier) — sinon la cible de test « refus
d'écrasement concurrent » serait **intermittente**, pire qu'absente (D-03).

### L5 — ADR-0007 amendement (e) : le chemin de soumission

`docs/adr/ADR-0007-constructeur-de-formulaires.md` · `docs/stack.md` · `docs/prd.md`
**Ferme : B-03, B-04, B-08, B-09, B-11, C-05, C-06, C-08, C-09, C-14, D-10.**

Le lot le plus dense, mais indivisible : tout y porte sur la seule route publique.

- **Composition du message** — sujet **constant** (au plus complété par le titre du formulaire,
  donnée d'éditrice et non de visiteur), **corps en texte brut en v1**, rejet à l'entrée de
  tout caractère de contrôle dans les champs mono-ligne ; interdit de composer un en-tête à
  partir d'une valeur du visiteur (B-04).
- **Corbeille** rendue comme texte, jamais interprétée (B-03) ; purge assignée au Cron
  idempotent — suppression effective, pas filtrage — et délai rendu **normatif** (C-09).
- **Bornes** : longueur maximale par type de champ et taille maximale de corps (B-08) ;
  plafonds sur `max_value × unit_price` contre le débordement d'entier,
  `CHECK (price_delta >= 0)` — le DDL contredit aujourd'hui l'invariant « un champ à prix ne
  peut jamais faire baisser le total » —, bornes de composition d'une définition (C-14).
- **Abus** : limite de débit, contrôle du `hostname` dans la réponse `siteverify`,
  `siteverify` injoignable = **fail-closed** (B-09).
- **Destinataire** : projection publique **sans** `recipient_email` (B-11) ; appartenance à
  `verified_recipients` vérifiée **à chaque acheminement, y compris en relance**, l'adresse
  relue depuis `form_defs` en `state='live'` et jamais fournie au moment du geste (C-06).
- **Formulaire dépublié** : soumission refusée si `publications.en_ligne ≠ 1` (C-05).
- **Vidéo** : `ref` conforme à une expression rationnelle par fournisseur, URL d'embed
  **construite** par le cœur et jamais stockée, `sandbox` + `referrerpolicy`, endpoint oEmbed
  en dur, type et taille vérifiés avant écriture R2 (C-08).
- **Pour mémoire** : écrire le renoncement de `D-10` — un visiteur peut avoir vu 5 € quand
  l'éditrice reçoit 500 €, sans trace de part ni d'autre. `FR-051` est la parade et elle
  suffit, mais le corpus a l'habitude d'écrire ses renoncements.

### L6 — ADR-0003 amendement (d) : plateforme et exposition

`docs/adr/ADR-0003-socle-technique.md` · `docs/stack.md`
**Ferme : B-01, B-13ᵖ, C-03, C-04, C-17g, C-17h, D-01, D-07.**

**Mécanisme d'exposition de la route publique face à Access tranché** — Bypass strictement
limité à `POST /api/forms/*/submit`, ou hôte dédié hors Access ; toute exclusion au-delà
interdite ; question cross-origin réglée. C'est une contradiction non résolue du corpus :
l'endpoint public vit dans `apps/admin`, donc sur l'hôte qu'Access protège intégralement (B-01).
Jeton D1 de build **en lecture seule et scopé à la seule base**, un jeton distinct par instance
(B-13). Régénération du Deploy Hook comme réponse standard à toute suspicion de fuite, plus un
garde-fou dans la boucle de réconciliation détectant un `current_build_uuid` inconnu de
`site_build_state` (C-03). Colonne « vecteur d'épuisement / parade » ajoutée au tableau de
quotas de l'amendement (c) — les 100 000 requêtes/jour sont partagées entre admin, Cron et
endpoint public, et Turnstile s'exécute **dans** le Worker (C-04). **Secrets de build
distingués des secrets de runtime** : `wrangler secret put` ne provisionne que le runtime, or
le jeton D1 sert au build, qui tourne dans un conteneur CI (C-17g). `--frozen-lockfile` imposé,
arbitrage exact-pin vs plage caret, boucle de veille CVE définie (C-17h). Facteur unique nommé
comme **risque accepté** — la sécurité de l'admin égale celle de la boîte mail de la cliente
(D-01). Volet information ePrivacy pour Turnstile et l'embed vidéo, l'analyse consignée ne
couvrant que la mesure d'audience (D-07).

### L7 — ADR-0006 amendement + promotion d'ADR-0009

`docs/adr/ADR-0006-generation-ia-verification.md` · `_candidates/0009-…` → `docs/adr/` ·
`docs/adr/README.md` · `SECURITY.md` *(nouveau)* · **Ferme : B-14, C-17e, C-17f, D-09.**

Contrôles d'**innocuité**, distincts des contrôles de conformité : ADR-0006 est calibré sur
« plausible mais subtilement faux » et la triche aux tests ; un code intentionnellement
malveillant — exfiltration, affaiblissement discret d'une validation, backdoor dans un îlot —
passe les quatre contrôles. Allowlist des hôtes réseau atteignables depuis le cœur, littéraux
d'URL non déclarés interdits, revue humaine **ciblée** sur les handlers, les seams et tout
appel réseau nouveau (B-14). Approbation humaine explicite pour toute dépendance nouvelle,
`package.json` et le `catalog:` ajoutés aux zones protégées — le slopsquatting est un vecteur
réel (C-17e). `.claude/hooks/`, `.github/workflows/` et `tooling/quality-gate` ajoutés à la
liste protégée, **avec re-vérification par la CI** puisque la protection des hooks par les
hooks est auto-référente (C-17f). `SECURITY.md`, protection de branche, revue obligatoire —
théorique tant que le dépôt est fermé, immédiat à son ouverture (D-09).

**La promotion d'ADR-0009 est ici** parce que C-17f en dépend : ses six contraintes sont
**déjà entièrement implémentées** par le code livré (R1 → R11), mais l'ADR n'a jamais été
promu — le portail applique donc des règles qu'aucun document accepté ne reconnaît comme
sources de vérifications déterministes.

### L8 — ADR-0008 amendement (b) : distribution, secrets, exploitation

`docs/adr/ADR-0008-mise-a-jour-de-la-flotte.md` · `docs/stack.md`
**Ferme : A-03, A-04, B-12, B-13, C-02, C-10, C-16, C-17i, C-17j, D-06, D-08.**

Nouvelle section **« Sécurité de la distribution »** : le registre npm est le point unique de
compromission de toute la flotte — publication depuis CI uniquement, provenance npm activée,
2FA obligatoire, jeton détenu par l'identité d'agence non nominative, publication depuis un
poste interdite (A-04). L'asymétrie est frappante : le jeton Workers Builds fait l'objet d'un
traitement soigné, le canal de distribution lui-même d'aucun.

Règle ESLint livrée **avec le cœur** et activée par le projet client, ajoutée à la checklist
de provisionnement — sans quoi l'interdiction de `set:html` n'est appliquée nulle part, les
projets clients étant hors du portail (A-03). Fourniture des mentions légales et de
l'information de confidentialité en étape de provisionnement (B-12). **Topologie de comptes
Cloudflare tranchée** — un compte par client vs compte d'agence — avec ses conséquences
d'isolement : un jeton sur-scopé compromis dans le CI d'un client exposerait les données de
tous (B-13). Rotation des secrets d'instance comme **troisième geste** de la sortie d'une
personne, praticable en lot par l'outillage de flotte (C-02). Sauvegardes D1 : lieu, accès
nominatif, rétention bornée, et une étape de rollback traitant les données à effacement dû —
sans quoi une soumission « expirée inconditionnellement » survit dans une sauvegarde, et une
restauration la fait réapparaître (C-10). Contenu minimal de la vérification post-migration —
invariants d'ADR-0010, comptages avant/après —, rollback écrit, mécanisme de sauvegarde nommé,
exécution réservée à l'identité d'agence (C-16). Classe « correctif de sécurité » à déploiement
poussé et inventaire des versions déployées (C-17i) ; signaux minimaux remontés à l'agence,
toute la visibilité convergeant aujourd'hui vers l'éditrice (C-17j) ; cycle de vie des données
de l'éditrice (D-06) ; chiffrement au repos, TLS de l'acheminement, localisation géographique
(D-08).

### L9 — ADR-0005 (cibles de test) + clôture du chantier

`docs/adr/ADR-0005-strategie-de-test.md` · `CLAUDE.md` · `docs/JOURNAL.md` *(recréé)* ·
`docs/audit-securite-2026-08-01.md` · **ce fichier** *(supprimé)*
**Ferme : C-17c, D-05, et raccorde l'ensemble.**

Les cibles de test de tout ce qui précède, **au même rang que « aucune fuite de brouillon »** :
attribut non énuméré rejeté par le schéma de texte riche · valeur porteuse de CRLF ne
produisant aucun en-tête supplémentaire · JWT signé valide mais d'audience étrangère rejeté ·
renommer le libellé d'un champ publié ne change pas sa `field_key`, une soumission antérieure
restant valide · image référencée uniquement par un `draft` ne répondant pas sur la surface
publique · aucun asset bâti ne contenant une adresse de `form_defs` · routes admin restant
derrière Access quand la soumission fonctionne · ligne effacée après `expires_at` · soumission
vers un formulaire dépublié rejetée · total dépassant le plafond faisant échouer la soumission.

Gouvernance des **service tokens E2E** : restreints aux instances de test/staging, rotation
fixée, sémantique définie — un service token n'a pas d'e-mail, or le `writeHandler` résout
`email→users` (C-17c). Rature de la métrique **« 500 builds/mois »**, qu'ADR-0003 (c) a
invalidée au profit de 3 000 minutes/mois (D-05).

Report des contraintes porteuses dans `CLAUDE.md`. **Recréation de `docs/JOURNAL.md`** —
en-tête, une section `##` par niveau, tableau `| Date | Phase | Résultat |`, append-only, plus
récente **en bas**. Clôture des trois portes de l'audit et **suppression de ce fichier**.

### L10 — Mécanisation *(optionnel, après L7)*

`tooling/quality-gate/src/checks/` · `src/protected-paths.ts` · `.claude/settings.json`

Ce qui fait passer les constats mécanisables de `En cours` à `Traité` : check refusant un
littéral gabarit contenant `SELECT`/`INSERT`/`UPDATE`/`DELETE` avec substitution (B-05) ;
check refusant `set:html` (A-03) ; extension de `estCheminProtege()` (C-17f) ; check
d'allowlist des hôtes réseau (B-14).

**À mener comme une feature `specs/003-…` par la chaîne `/scd-sdd`**, pas à la main — c'est du
code de production soumis au portail. **Sous réserve** : ces checks ne mordront que le jour où
`packages/` et `apps/` existeront.

### L11 — Re-passe d'audit

`docs/audit-securite-<date>.md` *(nouveau)*

L'audit se déclare **périmé dès que la Porte 1 est franchie** : les amendements ont changé le
corpus qu'il auditait. Rejouer les **quatre angles indépendants en contexte frais** — auth et
surfaces · entrées et injection · données et vie privée · chaîne d'approvisionnement et
opérations — puis fusionner en **réutilisant les identifiants existants** pour tout constat
déjà connu. Objectif propre : savoir si les amendements ont introduit de nouveaux trous, ce
qu'aucune relecture du présent plan ne peut dire.

---

## Vérification de couverture — les 54 constats

| Lot | Constats fermés | Total |
|---|---|---|
| L1 ✅ | A-01ᵖ · B-08ᵖ · B-09ᵖ · B-12ᵖ · C-11 · C-12ᵖ · C-17d · D-01ᵖ | 8 |
| L2 | A-01 · A-02 · C-07 · C-12 · C-17a | 5 |
| L3 | A-03ᵖ · B-02 · B-05 · B-07 · B-10ᵖ · C-01 · C-15 · C-17b · D-02 · D-04 | 10 |
| L4 | B-06 · B-10 · C-13 · D-03 | 4 |
| L5 | B-03 · B-04 · B-08 · B-09 · B-11 · C-05 · C-06 · C-08 · C-09 · C-14 · D-10 | 11 |
| L6 | B-01 · B-13ᵖ · C-03 · C-04 · C-17g · C-17h · D-01 · D-07 | 8 |
| L7 | B-14 · C-17e · C-17f · D-09 | 4 |
| L8 | A-03 · A-04 · B-12 · B-13 · C-02 · C-10 · C-16 · C-17i · C-17j · D-06 · D-08 | 11 |
| L9 | C-17c · D-05 | 2 |

ᵖ = fermeture **partielle**, le constat est repris dans un lot ultérieur.

**Contrôle** — les 54 identifiants, chacun assigné à au moins un lot :

`A-01`(1,2) `A-02`(2) `A-03`(3,8) `A-04`(8) · `B-01`(6) `B-02`(3) `B-03`(5) `B-04`(5)
`B-05`(3) `B-06`(4) `B-07`(3) `B-08`(1,5) `B-09`(1,5) `B-10`(3,4) `B-11`(5) `B-12`(1,8)
`B-13`(6,8) `B-14`(7) · `C-01`(3) `C-02`(8) `C-03`(6) `C-04`(6) `C-05`(5) `C-06`(5)
`C-07`(2) `C-08`(5) `C-09`(5) `C-10`(8) `C-11`(1) `C-12`(1,2) `C-13`(4) `C-14`(5)
`C-15`(3) `C-16`(8) `C-17a`(2) `C-17b`(3) `C-17c`(9) `C-17d`(1) `C-17e`(7) `C-17f`(7)
`C-17g`(6) `C-17h`(6) `C-17i`(8) `C-17j`(8) · `D-01`(1,6) `D-02`(3) `D-03`(4) `D-04`(3)
`D-05`(9) `D-06`(8) `D-07`(6) `D-08`(8) `D-09`(7) `D-10`(5)

**Aucun orphelin.** Les deux constats manqués par le découpage précédent — `D-05` et `D-10` —
sont assignés à L9 et L5.

---

## Ordre et dépendances

```
L1 (PRD FR-100→110)  ✅ fait
 └─ L2 (ADR-0011)  ✅ fait          ← racine citée par L3, L4, L5
     ├─ L3 (0004 c)  ─┐  ✅ fait
     ├─ L4 (0010 c)   │
     ├─ L5 (0007 e)   ├─ commutables : un fichier ADR distinct chacun
     ├─ L6 (0003 d)   │
     ├─ L7 (0006 + promo 0009)     │
     └─ L8 (0008 b)  ─┘
         └─ L9 (0005 + clôture)    ← en dernier : cite tout ce qui précède
             ├─ L10 (mécanisation, optionnel — dépend de L7 pour ADR-0009)
             └─ L11 (re-passe d'audit — après la Porte 1)
```

`docs/stack.md`, `docs/prd.md` et `CLAUDE.md` sont touchés par plusieurs lots : ils n'ont pas
de convention d'amendement lettré, seulement une date `Révisé`. Aucun conflit de forme.

**Cadence : un lot à la fois**, sur feu vert explicite. Un lot interrompu ne laisse aucun
document à moitié amendé.

---

## Vérification

Pas de test automatisé sur du Markdown ; la vérification est structurelle.

**Par lot :**

1. `git diff --stat` — le lot ne touche que les fichiers annoncés.
2. `git diff --no-color -U0 | grep -E '^-' | grep -v '^---'` — toute ligne retirée doit être
   remplacée par une version qui **conserve son texte** (rature `~~…~~` ou ajout). Jamais une
   suppression sèche dans `## Décision` ou `## Constraints`.
3. Front-matter parsable, 9 champs dans l'ordre : `head -12` sur chaque ADR touché.
4. Chaque contrainte nouvelle vit dans le `## Constraints` **principal**, porte le marqueur
   `*(2026-08-01)*`, suit la grammaire `- **OBLIGATOIRE** : …` / `- **INTERDIT** : …`, et
   n'introduit aucun identifiant de contrainte.
5. Un seul amendement daté par ADR sur toute la campagne : le compte d'occurrences de
   `Amendement 2026-08-01` doit croître de 1 par lot, jamais de 2.
6. Tableau de suivi de l'audit mis à jour **dans le même commit**, colonne `Preuve` renseignée
   (p. ex. `ADR-0004 amdt 2026-08-01 (c) point 2`), plus une ligne au journal des remédiations
   et la mise à jour du tableau d'avancement ci-dessus.
7. `pnpm gate` — **à lancer par l'humain** : `pnpm` est absent du `PATH` du shell d'agent, et
   `CLAUDE.md` interdit de forcer avec `CI=true` (cela supprimerait `node_modules`). Le diff
   étant exclusivement Markdown, `lint-format` ne couvre que `.ts`/`.tsx` : aucun impact attendu.

**En fin de chantier, avant L11 :**

- `grep -c 'À traiter' docs/audit-securite-2026-08-01.md` → **0**.
- `grep -n 'XSS\|CSP\|échappement\|paramétrée\|limite de débit\|SVG\|EXIF' docs/adr/*.md`
  retourne des résultats — c'est l'inverse exact du `grep` qui a produit le verdict de l'audit.
- Les trois portes cochées, ou leurs constats restants explicitement `Accepté` **avec motif écrit**.
- `docs/JOURNAL.md` existe et porte une ligne par lot ; ce fichier-ci est supprimé.
