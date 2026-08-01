---
id: ADR-0003
title: Socle technique (versions figées)
status: accepted
date: 2026-07-10
authors: [arborescence-digital]
scope: .            # global — pnpm-workspace.yaml, wrangler.jsonc, package.json
supersedes: []
superseded-by: null
depends-on: [ADR-0002]
---

# ADR-0003 — Socle technique (versions figées)

**Statut :** accepted — 2026-07-10 · *(immuable : seul le statut évolue, cf. ADR-0001)*

> **Place dans la famille.** ADR-0003 fixe le *matériau*. ADR-0004 (architecture) s'y contraint ; ADR-0005 (test) vise ses runtimes ; ADR-0006 (génération IA) s'appuie sur les deux. Le présent ADR est la forme décisionnelle condensée d'une recherche sourcée détaillée (« Socle de versions stables gelées », 9 juillet 2026), non publiée dans ce dépôt.

---

## Résumé exécutif

Le socle prod-safe repose sur **Astro 7.x** + adaptateur **@astrojs/cloudflare 14.1.2** (admin SSR sur Workers) et **@astrojs/react 6.0.1** couplé à **React 19.2.7**. La peerDependency vérifiée sur le registre npm (`@astrojs/cloudflare@14.1.2` → `astro ^7.0.0`, `wrangler ^4.83.0`) **verrouille de fait** le couple Astro 7 / adaptateur 14. Le reste de l'écosystème est en GA stable : **Tailwind CSS 4.3.2** (via `@tailwindcss/vite`, l'intégration `@astrojs/tailwind` étant dépréciée), **TipTap 3.27.x**, **Zod 4.4.3**, **Sharp 0.35.3**, **pnpm 11.10.0**, **TypeScript 6.0.3**, sur **Node 22 LTS (≥22.12.0)**. Point d'architecture décisif : depuis l'acquisition d'Astro par Cloudflare (16 janvier 2026) et le passage à Astro 7 + adaptateur v14, **Cloudflare Pages n'est plus une cible supportée** ; le chemin officiel est **Workers + Static Assets**, ce qui correspond exactement au stack gelé de ColibriCMS.

---

## Contexte

Arborescence Digital déploie une instance ColibriCMS par client et exige des versions durables, réplicables, sans surprise de compatibilité inter-clients. Le stack imposé est : site public SSG (Astro sans adaptateur), admin SSR sur Workers via `@astrojs/cloudflare` + îlots React, données D1/R2/KV en bindings directs, éditeur TipTap (stockage ProseMirror JSON), validation Zod partagée, styles Tailwind, images Sharp au build, auth Cloudflare Access (validation JWT côté Worker), monorepo pnpm, gratuité Cloudflare, runtime Workers avec `nodejs_compat`.

### Faits vérifiés (sources primaires, confiance Élevée)
- **Couple indissociable.** `@astrojs/cloudflare@14.1.2` → peer `astro ^7.0.0`, `wrangler ^4.83.0` (registry.npmjs.org). L'adaptateur 14 est incompatible avec Astro 6 ; l'adaptateur 13 (peer `astro ^6.3.0`) est incompatible avec Astro 7.
- **Pages abandonné comme cible.** Avec Astro 7 + adaptateur v14, la sortie de build est orientée Worker ; docs Astro et Cloudflare recommandent Workers pour les nouveaux projets. Le dev server tourne dans **workerd** via le plugin Vite Cloudflare → accès aux bindings D1/R2/KV **en local** (gain majeur : dev/prod alignés).
- **`@astrojs/react@6.0.1`** accepte React 17/18/19 (peer vérifiée) ; React 19.2.7 stable est dans la plage.
- **TipTap 3** est GA stable ; stockage ProseMirror JSON inchangé ; fonctionne avec React 19.
- **Zod 4** est exporté depuis la racine `zod` (fin de la transition `zod/v4`) ; testé contre TypeScript ≥5.5.
- **Tailwind 4** impose `@tailwindcss/vite` ; `@astrojs/tailwind` **déprécié** (CHANGELOG officiel `#13049`). Config CSS-first via `@theme`, plus de `tailwind.config.js` par défaut.
- Depuis Astro 6/adaptateur v13, `Astro.locals.runtime` est **supprimé** au profit de l'accès direct `import { env } from 'cloudflare:workers'`.

---

## Décision

Figer le socle sur :

| Brique | Version retenue | Contrainte / note |
|---|---|---|
| astro | `^7.0.7` | Node ≥22.12.0 ; SSG + SSR supportés |
| @astrojs/cloudflare | `^14.1.2` | peer `astro ^7.0.0`, `wrangler ^4.83.0` ; **Workers uniquement** |
| @astrojs/react | `^6.0.1` | peer `react ^17.0.2 \|\| ^18 \|\| ^19` |
| react / react-dom | `19.2.7` | dans la plage peer |
| @types/react(-dom) | `19.2.x` | aligner sur la ligne react installée |
| wrangler | `^4.107` | peer adaptateur `^4.83.0` |
| tailwindcss / @tailwindcss/vite | `^4.3.2` | dans `vite.plugins` ; pas d'intégration dépréciée |
| @tiptap/core, /pm, /react, /starter-kit | `^3.27.3` | ProseMirror JSON |
| zod | `^4.4.3` | racine `zod` ; `astro/zod` pour les collections |
| sharp | `^0.35.3` | build uniquement (SSG), hors runtime worker |
| pnpm | `11.10.0` | exige Node 22+ |
| typescript | `^6.0.3` | récent ; `astro check` à valider sur le socle |
| Node.js | `>=22.12.0` | exigence commune Astro 7 / @astrojs/react 6 / pnpm 11 |

Bloc épinglé (`pnpm-workspace.yaml`, `catalog:`) :
```yaml
catalog:
  astro: 7.0.7
  '@astrojs/cloudflare': 14.1.2
  '@astrojs/react': 6.0.1
  react: 19.2.7
  react-dom: 19.2.7
  '@types/react': 19.2.0
  '@types/react-dom': 19.2.0
  wrangler: 4.107.1
  tailwindcss: 4.3.2
  '@tailwindcss/vite': 4.3.2
  '@tiptap/core': 3.27.3
  '@tiptap/pm': 3.27.3
  '@tiptap/react': 3.27.3
  '@tiptap/starter-kit': 3.27.3
  zod: 4.4.3
  sharp: 0.35.3
  typescript: 6.0.3
```

Fixer explicitement dans `apps/admin/wrangler.jsonc` : `compatibility_flags: ["nodejs_compat"]` et `compatibility_date` (valeur de départ `2026-07-07` **[À VÉRIFIER]** selon la version de miniflare installée).

---

## Conséquences

### Bénéfices
- Dev/prod alignés (workerd en local avec bindings réels).
- Builds plus rapides (Vite 8 / Rolldown).
- Un seul modèle de déploiement (Workers Static Assets), réplicable identiquement par client.

### Risques / vigilance à la mise à niveau
1. **Ne jamais mélanger les majeures** Astro et adaptateur (peer deps strictes). Un `pnpm up` non maîtrisé casse la contrainte.
2. **Bug OOM du dev server** adaptateur v14 avec routage avancé `src/fetch.ts` sur sites à très nombreuses routes (#17181) → préférer le **middleware Astro classique** pour l'auth/redirections tant que non corrigé. *(Contrainte reprise par ADR-0004.)*
3. `compatibility_date` ne doit pas dépasser la date supportée par le `workerd`/`miniflare` embarqué (sinon fallback silencieux).
4. Tailwind v4 en config CSS-first : ne pas réintroduire `@astrojs/tailwind` ni `tailwind.config.js`.
5. Sharp installé explicitement (pnpm strict) dans `apps/site`, utilisé au build uniquement.

---

## Seuils qui feraient reconsidérer
- **Ne pas migrer** vers une future majeure Astro (v8) tant que `@astrojs/cloudflare` et `@astrojs/react` n'ont pas publié une version stable déclarant `astro: ^8` en peer dep (vérifier sur le registre avant tout bump).
- Volume de routes admin très élevé rencontrant l'OOM #17181 → rester sur middleware, ou attendre le correctif ; ne pas passer en routage `src/fetch.ts`.
- Repli documenté si un blocage apparaît sur la ligne 7/14 : **Astro 6.4.4 + @astrojs/cloudflare 13.6.0** (peer `astro ^6.3.0`). Non retenu (le stack vise Workers, chemin natif d'Astro 7) mais reste une porte de sortie stable.

---

## Amendement 2026-08-01 — deux mécanismes absents du socle

Les suites de la revue du PRD ont fait apparaître deux besoins que le socle ne portait pas. Ni l'un ni l'autre ne change une version figée ; tous deux ajoutent une brique de plateforme.

1. **Cron Trigger sur le Worker d'admin** (FR-056, FR-087, FR-093). L'issue d'une mise en ligne n'est **pas** connue au déclenchement : un Deploy Hook Workers Builds retourne un `build_uuid`, et l'issue s'obtient en **interrogeant** l'API Builds. Il faut donc un déclencheur périodique, qui porte aussi la **boucle de réconciliation** (redéclencher tant que le dernier succès est antérieur à la dernière demande). Disponible sur l'offre gratuite : 5 déclencheurs, intervalle minimal 1 minute, chaque invocation compte dans les 100 000 requêtes/jour, **aucun réessai** si une invocation échoue — la boucle doit donc être idempotente et se rattraper d'elle-même au tick suivant. Le jeton d'API Builds doit être **user-scoped** (les jetons de compte sont refusés).
2. **Réduction d'image dans le navigateur** (FR-088). Une image trop lourde est **réduite**, pas refusée. Sharp est `build-only` dans `apps/site` et n'existe pas dans le Worker : la réduction se fait donc côté client (`createImageBitmap` + `canvas.toBlob`) avant l'envoi. `FR-023` (8 Mo) reste la **butée serveur**, conforme à FR-014. Corollaire vérifié : l'attribut `accept` ne déclare **jamais** `image/heic` — c'est ce qui fait transcoder Safari en JPEG et évite le sujet HEIC à la source.

---

## Amendement 2026-08-01 (b) — durée de session, révocation, et surface d'accès du Worker d'admin

La revue du PRD avait laissé ouverte une seule question qu'elle avait elle-même créée : *combien de temps une session d'éditrice vit-elle, et par quel geste l'intégrateur coupe-t-il l'accès ?* `FR-001` refuse les personnes non autorisées sans rien dire de la durée ni du retrait. Réponse en trois points, dont le troisième n'avait pas été vu.

1. **Durée de session : 7 jours**, réglée au niveau de l'**application** Access (pas de l'organisation), pour que le Worker d'admin ne dépende pas d'un réglage global partagé avec d'autres usages du compte. Access ne fait **pas** de session glissante : le compteur part de la connexion. Motif : l'édition réelle est une salve étalée sur quelques jours (une collection publiée sur une semaine) ; le défaut plateforme de 24 h imposerait le code e-mail à presque chaque venue — la charge technique que le brief bannit — et un mois laisserait un poste ouvert trop longtemps pour qu'on puisse dépendre d'une révocation manuelle. La plage offerte est 15 min–1 mois au niveau organisation, « expiration immédiate »–1 mois au niveau application/politique, précédence politique > application > organisation.

2. **Révocation : deux gestes, dans cet ordre.** Retirer l'adresse de la **politique** Access, **puis** révoquer la personne (Zero Trust > Users > *Revoke*). L'un sans l'autre ne coupe rien durablement : la révocation seule invalide les jetons déjà émis en 20–30 s mais laisse la personne **se reconnecter au bout d'une minute** ; le retrait de la politique seul laisse vivre la session en cours jusqu'à son terme. C'est la procédure de sortie d'une cliente qui quitte l'agence, à porter dans ADR-0008.

3. **La surface d'accès du Worker doit être réduite au nom d'hôte protégé.** Une application Access protège un **nom d'hôte** ; le Worker d'admin reste joignable sur son `*.workers.dev` **et** sur ses *preview URLs*, qui ne traversent aucune politique. `FR-001` tomberait entièrement par cette porte, et avec lui le point 2 : la révocation n'est effective que **parce que** chaque requête traverse Access à la périphérie. La vérification JWT côté Worker (seam JWKS, ADR-0004) est une défense en profondeur au service de `FR-003` — elle ne voit pas une révocation, elle ne voit qu'un `exp`. D'où deux réglages **explicites** dans `apps/admin/wrangler.jsonc`. Depuis Wrangler 4.44, `preview_urls` suit `workers_dev` par défaut : l'écrire quand même est ce qui le rend vérifiable par hook plutôt que dépendant d'une valeur par défaut qui a déjà changé trois fois en un an.

Corollaire de flotte, hors socle : le **jeton d'API Workers Builds** est nécessairement *user-scoped* (amendement (a), point 1), donc attaché à une personne. Il est créé depuis un **membre de compte dédié et non nominatif** (identité d'agence), jamais depuis le compte personnel d'un intégrateur — sans quoi la publication de tous les sites clients dépend du maintien d'une personne dans l'organisation. → ADR-0008.

---

## Amendement 2026-08-01 (c) — recherches faites, à ne pas refaire

Trois constats de plateforme établis pendant les suites de la revue du PRD. Ils ne changent aucune
version figée ; ils sont consignés parce que **les refaire coûterait une demi-journée** et que deux
d'entre eux ont déjà renversé une décision.

**1. Mesure d'audience — la question juridique est éteinte en amont, et l'était déjà.** La **liste
publique CNIL** des solutions de mesure d'audience exemptées de consentement **a disparu au
1ᵉʳ janvier 2026**, remplacée par une auto-évaluation face aux critères publiés : il n'existe plus
de label à obtenir, c'est à l'éditeur du site de démontrer sa conformité. Un outil *cookieless*
(type Cloudflare Web Analytics) n'écrit ni ne lit rien sur le terminal, donc **échappe au
consentement ePrivacy** ; le RGPD continue de s'appliquer au traitement transitoire de l'IP, ce qui
impose une **mention d'information**, pas un bandeau. **Mais tout ceci est sans objet ici** :
`FR-089` (aucun code tiers avant action explicite du visiteur) exclut le beacon en amont, quelle que
soit la réponse juridique. La mesure d'audience embarquée est **NON incluse** au PRD ; seul un
chiffre de fréquentation issu des statistiques serveur de la plateforme est reporté en post-V1.
*Sources : [CNIL — programme d'évaluation](https://www.cnil.fr/fr/solutions-de-mesure-daudience-exemptees-de-consentement-la-cnil-lance-un-programme-devaluation), [Cloudflare Web Analytics & ePrivacy](https://ethicaldatahub.com/cloudflare-analytics-cookie-banner/).*

**2. Vidéo — conséquence non évidente de `FR-089` sur la vignette.** L'hébergement de fichiers vidéo
était déjà interdit sans que ce soit écrit (`FR-020`→`FR-023` ne parlent que d'images, plafond
8 Mo ; trente secondes de vidéo pèsent 50 à 200 Mo). L'intégration retenue est donc la seule voie,
bornée à une **liste fermée — YouTube et Vimeo** — pour que le système puisse valider l'adresse et
fabriquer la vignette. Le piège est ailleurs : **récupérer la vignette chez le fournisseur au moment
de la visite serait déjà une requête tierce**, donc une violation de `FR-089` alors même que le
lecteur, lui, n'est chargé qu'au clic. La vignette est donc récupérée **au build** et servie depuis
le site.

**3. Quotas et limites de plateforme constatés le 2026-08-01** (offre gratuite) :

| Ressource | Limite constatée | Conséquence |
|---|---|---|
| Builds Workers | **3 000 minutes/mois**, **1 build concurrent** | Ce n'est **pas** un nombre de builds : la métrique héritée des Pages (500 builds/mois) ne s'applique pas. Le signal d'épuisement n'est **pas documenté** → ne pas en dépendre (boucle de réconciliation, amendement (a) point 1). |
| Cron Triggers | 5 déclencheurs, intervalle min. 1 min, **aucun réessai** | Boucle idempotente obligatoire. |
| Envoi sortant | Destination **vérifiée du compte** : gratuit et **hors quota**. Destinataire quelconque : Workers Paid uniquement | C'est ce constat qui a renversé, puis fait re-trancher, le choix de fournisseur (ADR-0007 (a) puis (b)). Annexes : 50 destinataires/message, 5 Mio (25 Mio vers destination vérifiée). |
| D1 au build | **Aucun binding** dans un build Workers Builds (conteneur CI, pas workerd) | Lecture par API REST `POST /accounts/{id}/d1/database/{id}/query` ; l'adaptateur de build est **HTTP** (ADR-0004, amendement 2026-08-01 point 3). |

*Sources : [Deploy Hooks pour Workers Builds](https://developers.cloudflare.com/changelog/2026-04-01-deploy-hooks), [Workers Builds — API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/), [Email Service — tarifs](https://developers.cloudflare.com/email-service/platform/pricing/), [Email Service — limites](https://developers.cloudflare.com/email-service/platform/limits/), [D1 — API REST `query`](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [Workers — tarifs et limites](https://developers.cloudflare.com/workers/platform/pricing/).*

---

## Caveats
- **Patchs mouvants** : trancher `astro` et `wrangler` par `npm view <pkg> version` **le jour de l'installation**. Les plages (Astro 7.0.x, Wrangler ≥4.83.0) sont, elles, certaines.
- **`compatibility_date`** : marquée [À VÉRIFIER].
- **TypeScript 6** : très récent ; tester `astro check` sur le socle avant de généraliser (confiance Moyenne sur ce point).
- **Cloudflare Access (JWT)** : relève de code applicatif (pas d'un package figé) ; testé avec `nodejs_compat` activé — voir ADR-0005 §validation JWT.
- Les bugs cités (#17181) proviennent d'issues GitHub ouvertes, possiblement résolues dans un patch ultérieur — reconsulter avant prod.

---

## Alternatives Considered
- **Astro 6.4.4 + @astrojs/cloudflare 13.6.0** — repli plus éprouvé (peer `astro ^6.3.0`). *Rejeté* : le stack vise Workers, chemin natif d'Astro 7 ; conservé comme porte de sortie documentée.
- **Cloudflare Pages** comme cible de déploiement. *Rejeté* : plus supporté par l'adaptateur v14 (sortie orientée Worker).
- **`@astrojs/tailwind`** (intégration). *Rejeté* : officiellement déprécié ; `@tailwindcss/vite` est le chemin Tailwind 4.
- **`@aws-sdk/client-s3`** dans le Worker (si presigned V2). *Rejeté* : incompatible runtime ; `aws4fetch` uniquement.

## Constraints
> Règles impératives et vérifiables — compilées en hook/CI (cf. ADR-0002).
- **OBLIGATOIRE** : toute version de dépendance passe par le `catalog:` pnpm ; aucune version en dur dans un `package.json` d'app.
- **INTERDIT** : mélanger les majeures Astro et adaptateur (peer deps strictes Astro 7 ⇒ adaptateur 14).
- **INTERDIT** : réintroduire `@astrojs/tailwind` ou un `tailwind.config.js` / `postcss.config.js` par défaut.
- **OBLIGATOIRE** : `compatibility_flags: ["nodejs_compat"]` + `compatibility_date` fixés dans `apps/admin/wrangler.jsonc`.
- **INTERDIT** : routage `src/fetch.ts` (bug OOM #17181) — utiliser le middleware Astro classique.
- **OBLIGATOIRE** : `sharp` en dépendance de `apps/site` uniquement, usage build-only (jamais dans le runtime Worker).
- **OBLIGATOIRE** *(2026-08-01)* : la réduction d'image à l'entrée se fait **dans le navigateur** ; **INTERDIT** d'introduire une dépendance de traitement d'image dans le runtime Worker.
- **INTERDIT** *(2026-08-01)* : déclarer `image/heic` dans l'attribut `accept` d'un sélecteur de fichier.
- **OBLIGATOIRE** *(2026-08-01)* : la boucle du Cron Trigger est **idempotente** — aucune invocation n'est réessayée par la plateforme, le rattrapage se fait au tick suivant.
- **OBLIGATOIRE** *(2026-08-01)* : `workers_dev: false` **et** `preview_urls: false` déclarés explicitement dans `apps/admin/wrangler.jsonc` — une application Access protège un nom d'hôte, pas un Worker ; laisser l'une de ces deux surfaces ouverte contourne `FR-001` intégralement.
- **OBLIGATOIRE** *(2026-08-01)* : la durée de session de l'application Access d'admin vaut **7 jours**, réglée au niveau application.
- **OBLIGATOIRE** *(2026-08-01)* : le jeton d'API Workers Builds est créé depuis un **membre de compte non nominatif** ; **INTERDIT** de le créer depuis le compte personnel d'un intégrateur.

## Related
- Cadre : PRD ColibriCMS (§4 contraintes, §9 stack).
- Gouvernance : ADR-0001 (pratique ADR), ADR-0002 (injection agent).
- Consommé par : ADR-0004 (architecture), ADR-0005 (test).
- Recherche sourcée détaillée : « Socle de versions stables gelées » (9 juillet 2026), non publiée dans ce dépôt.
