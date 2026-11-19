# 10 — L'instance maintient la clé d'écriture en vie chaque semaine

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/entree-worker.ts`, `src/platform/publication/maintien-de-la-cle.ts`, `src/platform/publication/forge-github.ts`, `wrangler.astro.jsonc`, `wrangler.jsonc`, `docs/architecture/context.c4`, `docs/architecture/model.c4`, `tests/integration/maintien-de-la-cle.test.ts`

## Ce que ça livre

La **publication** écrit dans le dépôt du client avec une clé d'écriture (`JETON_DEPOT`). GitHub
retire une clé restée un an sans usage : une instance où l'éditrice ne publie pas pendant un an
perdrait sa clé, donc la publication. Ce ticket réalise ce que l'ADR-0021 a décidé : une fois par
semaine, sans geste de personne, l'instance fait au dépôt du client un appel **en lecture** qui
emploie la clé, et laisse dans les journaux de la plateforme une trace datée de son issue.

**État du code.** Rien n'est programmé : aucun déclencheur, aucun point d'entrée `scheduled`. Le
Worker est bâti par `@astrojs/cloudflare` 14.3, dont le point d'entrée par défaut n'exporte que
`fetch`. L'adaptateur de la forge (`src/platform/publication/forge-github.ts`, `creerForgeGithub`)
porte les appels au dépôt. La trace `[publication] dépôt non abouti`
(`src/platform/publication/publier.ts`) est le patron de consignation. Les journaux de la plateforme
sont déjà activés (`observability`).

**Établi par un essai du 2026-11-19, dans une copie jetable** : un fichier d'entrée qui reprend le
gestionnaire d'Astro et lui ajoute `scheduled` se bâtit et s'exécute.

```ts
import { handle } from '@astrojs/cloudflare/handler';
export default { fetch: handle, async scheduled(controller, env, ctx) { /* … */ } };
```

Désigné par `"main": "./src/entree-worker.ts"` dans `wrangler.astro.jsonc`, avec
`"triggers": { "crons": ["17 4 * * 1"] }`, il donne une construction dont
`dist/server/wrangler.json` porte le déclencheur, dont une page publique et l'écran de connexion
répondent 200, et dont le gestionnaire programmé s'exécute (`wrangler dev --test-scheduled`, puis
`GET /cdn-cgi/handler/scheduled`). Le commentaire de `wrangler.astro.jsonc` qui met en garde contre
un champ `main` est à réécrire à la lumière de ce constat.

**Ce que ce ticket livre** (ADR-0021) :

- Les deux fichiers `wrangler` gagnent `triggers: { crons: ["17 4 * * 1"] }` (le lundi à 4 h 17
  UTC), identique partout : c'est une liaison de plateforme, pas une valeur d'instance.
- Le Worker gagne un point d'entrée `scheduled`, dans un fichier d'entrée qui réexporte le
  gestionnaire d'Astro. Ce point d'entrée n'est pas atteignable par une requête : seule la
  plateforme le déclenche. **Aucune route publique n'est ajoutée.**
- Il appelle une fonction de `src/platform/publication/` : **une** lecture de la référence `main`
  du dépôt, par l'adaptateur de la forge existant (étendu à cette lecture), avec `JETON_DEPOT`.
  Aucune écriture, aucun accès à la base, aucun contact avec le bail de publication.
- Chaque passage écrit une ligne `[maintien] clé du dépôt` avec `issue` parmi `acceptee`,
  `acces-refuse`, `depot-introuvable`, `depot-injoignable`, `depot-non-configure`. Jamais la clé, ni
  aucune partie d'elle.
- Sans dépôt de publication configuré, ou sans clé, aucun appel ne part ; la trace dit
  `depot-non-configure`.
- Architecture : dans `docs/architecture/context.c4`, la relation
  `colibri-cms.worker.platform -[sync]-> github 'vérifie chaque semaine…'` perd sa marque
  `#planned` et reçoit sa trace. Le fichier d'entrée vit hors de `src/pages/` : le modèle gagne
  l'élément qui le porte, écrit dans le `.c4` par ce ticket.
  `likec4 validate --no-layout --json --project colibri-cms docs/architecture` passe.

**Tests.** Intégration dans `workerd` (ADR-0014) : le point d'entrée programmé est joué, la forge
est doublée par le double existant (`globalThis.fetch` limité à `api.github.com`, patron de
`tests/integration/revenir-et-publication.test.ts`), étendu à la lecture d'une référence. Ni la base
ni la liaison d'e-mail ne sont doublées. Oracle : les requêtes reçues par le double (une lecture,
aucune écriture, l'en-tête d'autorisation présent) ; la ligne de trace ; l'état de la base inchangé.
Cas limites : réponses 200, 401, 403, 404, 5xx, délai dépassé ; sans dépôt ; sans clé ; publication
en cours (le bail n'est pas touché). Un test vérifie que la clé n'apparaît dans aucune trace.

**Constat de recette attendu, non automatisable** : `workerd` joue le point d'entrée, pas le
calendrier de la plateforme. Après déploiement sur le serveur de recette, un passage est déclenché
une fois à la main et sa trace est relevée dans les journaux.

**Hors périmètre** : détecter que l'appel hebdomadaire a cessé, ou alerter qui que ce soit
(l'ADR-0021 l'assume) ; une route appelée par un service extérieur ; profiter d'une visite de
l'administration ; toute rotation de la clé.

**Références** : ADR-0021, ADR-0005, ADR-0014 (`docs/adr/`), invariants `I9` et `I18` de
`docs/architecture.md`, `docs/security.md`.

## Critères

- [ ] Quand l'échéance hebdomadaire survient sur une instance dont le dépôt et la clé d'écriture sont configurés, un appel en lecture part vers le dépôt du client avec la clé d'écriture, et une trace dit que la clé a été acceptée   (SC-10a)
- [ ] Quand l'échéance hebdomadaire survient, aucune écriture ne part vers le dépôt, et ni les brouillons, ni l'état de la publication, ni les sessions ne changent   (SC-10b)
- [ ] Quand l'échéance hebdomadaire survient et que le dépôt refuse la clé, une trace est écrite dans les journaux de la plateforme et dit que l'accès a été refusé, sans la clé ni aucune partie d'elle   (SC-10c)
- [ ] Quand l'échéance hebdomadaire survient et que le dépôt ne répond pas, une trace dit que le dépôt est injoignable et le passage se termine sans autre effet   (SC-10d)
- [ ] Quand l'échéance hebdomadaire survient sur une instance sans dépôt de publication configuré, ou sans clé d'écriture, aucun appel ne part et une trace dit que le dépôt n'est pas configuré   (SC-10e)
- [ ] Quand l'échéance hebdomadaire survient pendant qu'une publication est en cours, la publication se poursuit et aboutit comme sans cet appel   (SC-10f)
