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

## Related
- Cadre : PRD ColibriCMS (§4 contraintes, §9 stack).
- Gouvernance : ADR-0001 (pratique ADR), ADR-0002 (injection agent).
- Consommé par : ADR-0004 (architecture), ADR-0005 (test).
- Recherche sourcée détaillée : « Socle de versions stables gelées » (9 juillet 2026), non publiée dans ce dépôt.
