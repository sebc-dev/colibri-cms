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

## Amendement 2026-08-01 (d) — la plateforme : ce qui est exposé, ce qui s'épuise, ce qui est épinglé

Suites de l'[audit de sécurité du 1<sup>er</sup> août 2026](../audit-securite-2026-08-01.md)
(lot L6). Les lots précédents ont traité le contenu : ce qui entre, ce qui est rendu, ce qui est
acheminé ([ADR-0011](./ADR-0011-frontieres-de-contenu-hostile.md), puis ADR-0004 (c), ADR-0010 (c),
ADR-0007 (e)). Restent les constats dont le document cible est le **socle** — non pas ce que le
produit fait d'une donnée, mais **ce qu'il expose, ce qui s'épuise, et ce qui est épinglé**. Huit
points, qui ferment `B-01`, `B-13`ᵖ, `C-03`, `C-04`, `C-17g`, `C-17h`, `D-01` et `D-07`.

Le premier est d'une autre nature que les autres : ce n'est pas un oubli, c'est une
**contradiction non résolue du corpus**, et elle rendait `SC-007` infaisable.

**1. Le chemin de la route publique de soumission à travers Access** *(B-01)*.

L'amendement (b) point 3 a établi qu'une application Access protège un **nom d'hôte** et non un
Worker, et en a tiré `workers_dev: false` et `preview_urls: false` — c'est la décision qui rend
la révocation effective, *parce que* chaque requête traverse Access. Mais la seule route
d'écriture **non protégée par Access** du produit, `POST /api/forms/:slug/submit`, vit dans
`apps/admin` (ADR-0004, amendement 2026-07-17 point 2), donc sur ce même nom d'hôte protégé
intégralement. Deux issues, aucune écrite : soit l'intégrateur ne fait rien et **tout visiteur
anonyme est bloqué** — `SC-007` échoue à la première demande réelle —, soit il crée une exclusion
*ad hoc* qu'aucune contrainte ne borne, et un *Bypass* tracé sur `/api/*` exposerait **tous** les
endpoints d'écriture de l'admin à Internet, avec la seule vérification JWT comme barrière. C'est
la porte que le point 3 de (b) avait fermée, rouverte ailleurs.

**Décision : le Worker d'admin gagne un unique motif de route hors de son nom d'hôte protégé** —
`<apex-du-site>/api/forms/*/submit`, déclaré dans `apps/admin/wrangler.jsonc` — et **aucune
exclusion Access n'est créée, nulle part**. Fait de plateforme vérifié : une **route plus
spécifique l'emporte** sur le Custom Domain du même nom d'hôte, si bien que le site statique garde
`example.com` et que ce seul chemin part vers l'admin ; tout autre chemin de l'apex est servi par
le site et **n'atteint pas** le Worker d'admin — par **routage**, pas par politique.

Pourquoi pas le *Bypass*, qui était l'autre issue nommée par l'audit. Trois motifs, le dernier
étant décisif ici :
- la documentation Cloudflare avertit qu'un Bypass **n'applique aucun contrôle Access** *et que
  les requêtes ne sont pas journalisées* — on perdrait la trace au moment même où l'on ouvre ;
- une application Access se définit par **hôte et chemin**, jamais par méthode : le Bypass
  vaudrait aussi pour `GET` sur ce chemin ;
- il vit dans le **tableau de bord**, hors du dépôt. Or ADR-0002 pose que les vérifications
  déterministes se compilent depuis les `## Constraints` et s'appliquent à ce que le dépôt
  contient. Un motif de route vit dans `wrangler.jsonc`, à côté de `workers_dev: false` :
  **la surface d'exposition redevient un artefact versionné**, donc vérifiable par la même
  famille de hook. Une brèche qu'un automate peut lire vaut mieux qu'une brèche mieux placée
  qu'aucun automate ne voit.

Topologie qui en résulte — **quatre noms, trois régimes** :

| Nom d'hôte | Sert | Régime |
|---|---|---|
| `admin.<apex>` | endpoints d'écriture, espace d'édition | Access, politique **intégrale**, aucune exclusion |
| `apercu.<apex>` | aperçu SSR `/preview/*` et médias bruts (ADR-0004 (c) points 3-4) | Access, **même** politique, politique de contenu propre |
| `<apex>` | site public statique | public, aucun runtime (`FR-039`) |
| `<apex>/api/forms/*/submit` | **la** route publique de soumission, servie par le Worker d'admin | public, **hors** Access — l'unique brèche, et elle est un motif de route |

**La question cross-origin est réglée par disparition.** La soumission part du site public vers
son propre apex : elle est **same-origin**. Ni CORS à configurer, ni préflight sur un POST JSON,
ni dérogation à `checkOrigin` à écrire — trois endroits où une valeur trop large aurait compté.
Un hôte dédié (`api.<apex>`) aurait fermé le constat tout aussi bien, mais au prix d'un quatrième
nom à provisionner **et** d'une politique CORS à tenir juste ; ce qui est écarté ici n'est pas la
sécurité de l'option, c'est sa surface de réglage.

Deux conséquences à noter plutôt qu'à découvrir. La route de soumission devient **la seule
surface du produit joignable sans traverser Access** — c'est ce qui donne sa forme au point 4 :
tout flood anonyme se concentre là, et nulle part ailleurs. Et le risque résiduel est nommé : un
motif élargi à `<apex>/api/*` exposerait les endpoints d'écriture exactement comme l'aurait fait
le Bypass ; c'est pourquoi la contrainte porte sur le motif lui-même, et pas seulement sur
l'absence d'exclusion Access. Résiduels laissés à leur lot : la ligne de checklist de
provisionnement (ADR-0008) et la cible de test « les routes admin restent derrière Access pendant
que la soumission fonctionne » (ADR-0005).

**2. Le jeton D1 du build est en lecture seule et scopé à une seule base** *(B-13, volet socle)*.

Le build lit D1 par l'API REST, faute de binding en conteneur CI (amendement (c) point 3). La
cible de test « aucune lecture du build ne sert `state='draft'` » est un contrôle de **code** ;
le jeton, lui, est un contrôle de **capacité** — quoi que fasse le code, il peut lire les
brouillons, `verified_recipients` et `undelivered_submissions`, c'est-à-dire des données
personnelles de visiteurs. Les deux ne se remplacent pas (ADR-0011 § 1) : l'un décide ce que le
build **demande**, l'autre ce qu'il **peut obtenir**. Donc : jeton **en lecture seule**, **scopé à
la seule base de l'instance**, **distinct par instance**.

**La topologie de comptes Cloudflare — un compte par client ou un compte d'agence — n'est pas
tranchée ici** : elle appartient à la flotte, donc à ADR-0008. Mais sa conséquence est écrite ici
pour n'être orpheline nulle part : le chemin REST est
`/accounts/{account_id}/d1/database/{id}/query`, si bien que sur un compte partagé un jeton
sur-scopé compromis dans le CI d'un client exposerait les données de **tous** les clients. Le
scopage par instance est précisément ce qui rend cette topologie **survivable**, quelle que soit
la façon dont elle sera tranchée.

**3. Le Deploy Hook : régénération et garde-fou** *(C-03)*.

Un Deploy Hook est par nature une **URL POST sans authentification** — le corpus la traite déjà
comme un secret et la mocke en test, ce qui est le bon réflexe mais ne dit rien de l'après-fuite.
Qui l'obtient déclenche des builds en boucle et épuise les **3 000 minutes/mois**, mettant la
publication en carence pour le reste du mois : `FR-056` conserve alors les modifications sans les
mettre en ligne, et la **boucle de réconciliation redéclenche par-dessus**, aggravant la
consommation qu'elle est censée rattraper.

- **La régénération du hook est la réponse standard à toute suspicion de fuite** — départ d'une
  personne, secret aperçu dans un journal, incident. Un hook n'a pas de coût de rotation : le
  régénérer est un geste, pas un projet, et c'est la même famille que la révocation en deux temps
  de (b) point 2. Sa place dans la **procédure de sortie d'une personne** revient à ADR-0008
  (constat `C-02`) : nommée ici, prise là-bas.
- **Garde-fou dans la boucle de réconciliation** : un `current_build_uuid` que `site_build_state`
  ne connaît pas est un build que l'admin **n'a pas demandé**. La table permet déjà la
  comparaison — c'est un signal gratuit, pas une surface nouvelle. Le garde-fou **lit et
  signale** ; il ne redéclenche rien, et l'idempotence exigée de la boucle reste intacte.
  Résiduel nommé : le **canal** par lequel ce signal atteint l'agence — et non l'éditrice, qui
  n'en peut rien — est le constat `C-17j`, ADR-0008.

**4. Les quotas de l'offre gratuite comme vecteurs d'épuisement** *(C-04)*.

Le tableau de l'amendement (c) point 3 **constate** les limites ; il n'en tire aucune menace. Ce
tableau vivant dans un amendement daté, donc immuable, il n'est **pas édité en place** : il est
**repris ici intégralement**, avec la colonne qui manquait et une ligne de plus — les **100 000
requêtes/jour**, que (c) ne listait pas alors que (a) point 1 les mentionne en prose. La version
de (c) reste ce qu'elle a toujours été, le constat des limites ; celle-ci porte la menace.

| Ressource | Limite constatée | Vecteur d'épuisement | Parade |
|---|---|---|---|
| Builds Workers | 3 000 min/mois, 1 build concurrent | Deploy Hook fuité, déclenchements en boucle ; la réconciliation redéclenche par-dessus | point 3 — régénération et garde-fou ; Deploy Hook déclenché **seulement** sur « Publier » (invariant de garde de `stack.md`) |
| **Requêtes Workers** | **100 000/jour**, partagées entre admin, Cron et route publique | flood sur la route publique : **Turnstile s'exécute dans le Worker**, donc une soumission rejetée **consomme quand même une invocation** ; l'admin et la réconciliation deviennent indisponibles jusqu'au lendemain | **déjà tranchée au lot L5** — l'étage de **périphérie** de la limite de débit (règle WAF, ADR-0007 (e) point 5) est le seul à absorber un flood *sans consommer d'invocation*, donc le seul à protéger ce quota-ci ; le compteur KV, lui, protège la boîte de l'éditrice et non la plateforme. **Surface réduite** par le point 1 : la soumission est le seul chemin joignable sans Access |
| Cron Triggers | 5 déclencheurs, intervalle min. 1 min, **aucun réessai** | chaque tick consomme une invocation du même quota | boucle **idempotente** (contrainte existante), **un seul** déclencheur, aucun tick par page ni par formulaire |
| Envoi sortant | destination vérifiée : gratuit et **hors quota** | plus aucun plafond du fournisseur depuis le retour à Email Service | `FR-102` — compteur par formulaire (ADR-0007 (e) point 5), qui remplace le mur des 100 messages/jour disparu |
| D1 au build | aucun binding (conteneur CI), lecture par API REST | un jeton lisant toute la base, y compris brouillons et PII | point 2 — lecture seule, base unique, un jeton par instance |

Ce que cette colonne **ne fait pas**, écrit pour que les lots suivants ne le rejouent pas : elle
**ne re-décide pas** la limite de débit — L5 l'a tranchée, à deux étages, et ce point l'exploite —
et elle **n'ajoute aucune alarme de quota**, le signal d'épuisement n'étant pas documenté par la
plateforme (fait déjà consigné en (c) et resté en question ouverte de `stack.md`). Le
**provisionnement** de la règle de périphérie reste, lui, le résiduel de `B-09` (ADR-0008).

**5. Un secret de build et un secret de runtime ne se provisionnent pas au même endroit** *(C-17g)*.

`wrangler secret put` provisionne des secrets **de runtime Worker**, lus dans l'`env` d'une
invocation. Or le **jeton D1 de lecture** sert au **build**, qui s'exécute dans un conteneur CI
Workers Builds où **aucun runtime Worker n'existe** : `stack.md` § Secrets hors dépôt le range
donc sous un mécanisme qui ne peut pas le provisionner — une consigne inapplicable, ce qui est
pire qu'une consigne absente, puisqu'elle sera contournée sans être remplacée.

Le tri est plus fin qu'il n'y paraît, et c'est ce qui rendait l'erreur facile : le **jeton d'API
Workers Builds est un secret de *runtime*** — c'est le **Cron**, donc le Worker, qui interroge
l'API Builds. Il ne reste **qu'un seul** secret de build, le jeton D1.

- **Runtime** (`wrangler secret put`) : bindings, clé secrète Turnstile, URL du Deploy Hook,
  jeton d'API Workers Builds.
- **Build** (variables chiffrées du projet Workers Builds) : jeton d'API D1 en lecture.

Conséquence à nommer : les deux familles n'ont ni le même rayon d'exposition ni le même geste de
rotation. Un secret de build vit dans la configuration du projet de build, visible de qui peut
l'éditer, et **ne tourne pas** avec `wrangler secret put` — la rotation, comme au point 3, revient
à ADR-0008 (`C-02`).

**6. Épinglage exact, lockfile gelé, et une veille qui existe** *(C-17h)*.

- **La contradiction interne est levée par une clause d'interprétation, pas par treize ratures.**
  La colonne « Version retenue » de la table de décision énonce des **plages de compatibilité
  peer** (`^7.0.7` dit *quelle ligne est compatible*) ; le bloc `catalog:` énonce les **versions
  installées**. En cas de divergence, **le `catalog:` fait foi** — c'est lui, et lui seul, qui
  décide ce que `pnpm` installe. La table n'était pas fausse, elle était ambiguë ; elle reste
  donc telle quelle, lue à travers cette clause.
- **`--frozen-lockfile` est imposé en intégration continue.** C'est ce qui fige les
  **transitives**, que le `catalog:` ne touche pas, et ce qui fait **échouer** l'installation si
  `pnpm-lock.yaml` a dérivé du manifeste au lieu de la régénérer en silence.
- **Une boucle de veille, parce que figer sans veiller transforme la durabilité en accumulation
  de CVE.** Trois gestes, aucun nouveau service : les **alertes de vulnérabilité du forge**
  activées sur le dépôt (natives, aucun coût de CI) ; **`pnpm audit`** exécuté dans le **nightly
  déjà en place** — le portail tourne en CI *et* en nightly — avec échec au niveau élevé ; et une
  **revue de mise à niveau à cadence écrite** (mensuelle) qui bump le `catalog:`, seul geste par
  lequel une version change.
- Ce qui n'est **pas** ici : le chemin accéléré d'un correctif de sécurité sur la flotte et
  l'inventaire des versions déployées (`C-17i`, ADR-0008) ; l'approbation humaine d'une
  **dépendance nouvelle** (`C-17e`, ADR-0006). La veille dit *qu'on sait* ; ces deux-là disent
  *ce qu'on fait ensuite*.

**7. Le facteur unique est un risque accepté, et il est désormais écrit** *(D-01, résiduel)*.

Access authentifie l'éditrice par un **code e-mail à usage unique**, sans second facteur. La
conséquence n'était nulle part écrite : **la sécurité de tout l'admin égale celle de la boîte mail
de la cliente**. Qui lit son courrier obtient une session de sept jours, publie, change l'adresse
de destination d'un formulaire, ouvre la corbeille et les données personnelles qu'elle contient.

**Le risque est accepté**, et le motif est celui du produit : la cible est une dirigeante de très
petite entreprise qui **ne crée aucun compte hors son e-mail** (`FR-002`, `SC-006`) ; imposer un
TOTP ou une clé matérielle contredirait la promesse centrale du brief — et, réalistement, serait
contourné plutôt que suivi. Ce n'est pas une décision par défaut : c'est le même arbitrage que la
session de 7 jours, rendu dans le même sens.

Le chemin d'échappement est écrit parce qu'il ne coûte rien : Access accepte **d'autres
fournisseurs d'identité**. Une instance dont la cliente dispose déjà d'un IdP (annuaire
d'entreprise, suite bureautique) peut y pointer son application Access et **hériter de son MFA
sans aucun changement de code** — la vérification du JWT côté Worker est identique. Le facteur
unique est donc un défaut de **configuration d'instance**, pas une propriété du produit.

Et ce que ce risque impose en retour est déjà en place, ce qui est la raison pour laquelle il
reste tenable : session bornée à 7 jours et **révocation en deux gestes** ((b) points 1 et 2),
**déconnexion volontaire** (`FR-110`), Access **unique source d'autorisation** avec `users` jamais
consulté comme liste d'accès (ADR-0004 (c) point 5). *Seuil qui ferait reconsidérer* — écrit ici
plutôt que dans « Seuils qui feraient reconsidérer », qui ne parle que de versions : si une
instance venait à porter autre chose que du contenu éditorial public (données de clients finaux,
pièces jointes, un second rôle d'utilisateur), le facteur unique cesserait d'être proportionné et
la question serait à rouvrir par un ADR, pas par un réglage.

**8. Les tiers exécutés chez le visiteur : l'anti-robot et l'embed vidéo** *(D-07)*.

L'amendement (c) point 1 a éteint la question ePrivacy pour la **mesure d'audience**, et l'a fait
en amont : `FR-089` exclut le beacon quelle que soit la réponse juridique. Mais deux tiers
s'exécutent bel et bien sur le terminal du visiteur, et l'analyse équivalente n'avait pas été
faite pour eux.

**Turnstile.** Fait vérifié : un widget a `pre-clearance` à **`false`** et `clearance_level` à
**`no_clearance`** *par défaut* ; dans ce mode il n'émet qu'un **jeton à usage unique** et
**n'écrit aucun cookie `cf_clearance`** sur le terminal. Rien n'y est donc ni écrit ni lu ⇒ le
dispositif **échappe au consentement ePrivacy**, exactement par le raisonnement de (c) point 1
sur la mesure *cookieless* ; le RGPD continue de s'appliquer au traitement transitoire (adresse
IP, signaux de navigateur), ce qui impose une **mention d'information**, pas un bandeau.
**Décision : la pré-clairance reste désactivée**, et son activation exige un nouvel ADR — même
geste que `image/svg+xml` à ADR-0011 § 4, parce que le coût n'est pas technique mais de régime
juridique. Cohérence à noter : la pré-clairance est précisément ce que Cloudflare recommande pour
protéger une API par un **challenge** WAF ; notre route publique est protégée par une règle de
**limite de débit** (ADR-0007 (e) point 5), pas par un challenge — c'est ce choix-là, fait pour
une autre raison, qui garde cette porte fermée.

**Embed vidéo.** La façade tient `FR-089` : une page seulement consultée ne charge **aucun** tiers.
Mais **au clic**, le lecteur du fournisseur est chargé et écrit sur le terminal. Deux choses à
écrire. D'abord que **`FR-089` n'est pas un mécanisme de consentement** — c'est une règle de
conception ; un clic sur « lire » ne vaut choix éclairé que s'il est **précédé** de l'information.
Ensuite que l'URL d'embed étant **construite par le cœur et jamais stockée** (ADR-0007 (e)
point 8), le cœur est en position d'imposer le **mode à confidentialité renforcée** du
fournisseur : hôte `youtube-nocookie.com` pour YouTube, paramètre `dnt=1` pour Vimeo. Le gabarit
d'URL en dur **est** celui du mode renforcé — ce n'est pas une option d'intégrateur.

**Information du visiteur.** `FR-105` énumère ce que la mention de confidentialité doit dire et
ne parle pas des tiers exécutés sur le terminal. D'où **`FR-113`** : la mention nomme les services
tiers susceptibles d'être chargés à la suite d'une action du visiteur, ce qu'ils déposent, et le
fait qu'une page seulement consultée n'en charge aucun. Résiduel inchangé : la **rédaction** de
cette mention reste la question ouverte RGPD du PRD.

*Sources : [Access — politiques et action Bypass](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/), [Workers — Custom Domains et interaction avec les routes](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [Turnstile — pré-clairance et cookie `cf_clearance`](https://developers.cloudflare.com/cloudflare-challenges/concepts/clearance/).*

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
- **OBLIGATOIRE** *(2026-08-01)* : le Worker d'admin n'est joignable, hors de son nom d'hôte protégé par Access, que par un **unique motif de route** — `<apex-du-site>/api/forms/*/submit` — déclaré dans `apps/admin/wrangler.jsonc` ; **INTERDIT** d'y déclarer tout autre motif hors de ce nom d'hôte, et **INTERDIT** d'élargir celui-ci (un motif `/api/*` exposerait les endpoints d'écriture).
- **INTERDIT** *(2026-08-01)* : toute exclusion, politique *Bypass* ou application Access dérogatoire sur le nom d'hôte de l'admin comme sur celui de la surface non fiable (aperçu et médias bruts, ADR-0004 (c) point 3) — la révocation n'est effective que parce que **chaque** requête de ces hôtes traverse Access.
- **OBLIGATOIRE** *(2026-08-01)* : le jeton d'API D1 utilisé par le build est **en lecture seule**, **scopé à la seule base de l'instance**, et **distinct par instance** ; **INTERDIT** un jeton de compte ou couvrant plusieurs bases.
- **OBLIGATOIRE** *(2026-08-01)* : un secret est provisionné selon son étage — `wrangler secret put` pour les secrets de **runtime** (bindings, clé Turnstile, URL du Deploy Hook, jeton d'API Workers Builds), configuration chiffrée du projet Workers Builds pour le **jeton D1 de build** ; **INTERDIT** de faire porter un secret de build par `wrangler secret put`, qui ne provisionne que le runtime.
- **OBLIGATOIRE** *(2026-08-01)* : la boucle de réconciliation détecte et signale tout `current_build_uuid` inconnu de `site_build_state` — un build que l'admin n'a pas demandé ; **INTERDIT** qu'elle redéclenche un build sur ce signal.
- **OBLIGATOIRE** *(2026-08-01)* : l'installation des dépendances en intégration continue utilise `--frozen-lockfile` ; **INTERDIT** une installation qui régénère `pnpm-lock.yaml` en CI.
- **OBLIGATOIRE** *(2026-08-01)* : les versions du `catalog:` pnpm sont **exactes** ; **INTERDIT** d'y écrire une plage (`^`, `~`, `*`) — les plages de la table de décision sont des plages de compatibilité peer, jamais la version installée, et le `catalog:` fait foi.
- **OBLIGATOIRE** *(2026-08-01)* : une veille de vulnérabilités s'exécute au **nightly** (`pnpm audit`, échec au niveau élevé), en plus des alertes de vulnérabilité du forge activées sur le dépôt.
- **INTERDIT** *(2026-08-01)* : activer la **pré-clairance** Turnstile (`clearance_level` autre que `no_clearance`) — elle dépose un cookie `cf_clearance` sur le terminal du visiteur et ferait basculer le produit dans le régime du consentement ; son adoption exige un nouvel ADR.
- **OBLIGATOIRE** *(2026-08-01)* : l'URL d'embed vidéo construite par le cœur utilise le **mode à confidentialité renforcée** du fournisseur (`youtube-nocookie.com`, `dnt=1` chez Vimeo).

## Related
- Cadre : PRD ColibriCMS (§4 contraintes, §9 stack).
- Gouvernance : ADR-0001 (pratique ADR), ADR-0002 (injection agent).
- Consommé par : ADR-0004 (architecture), ADR-0005 (test).
- Recherche sourcée détaillée : « Socle de versions stables gelées » (9 juillet 2026), non publiée dans ce dépôt.
- Origine de l'amendement (d) : [audit de sécurité du 2026-08-01](../audit-securite-2026-08-01.md), constats `B-01` (exposition de la route publique face à Access), `B-13` (jeton D1 du build, volet socle), `C-03` (Deploy Hook), `C-04` (quotas comme vecteurs d'épuisement), `C-17g` (secrets de build vs de runtime), `C-17h` (épinglage, lockfile, veille CVE), `D-01` (facteur unique, risque accepté), `D-07` (tiers côté visiteur). Racine de la campagne : [ADR-0011](./ADR-0011-frontieres-de-contenu-hostile.md).
