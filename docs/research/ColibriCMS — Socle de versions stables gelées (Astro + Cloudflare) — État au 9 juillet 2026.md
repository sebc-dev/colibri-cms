# ColibriCMS — Socle de versions stables gelées (Astro + Cloudflare) — État au 9 juillet 2026

## Synthèse exécutive
Le socle prod-safe recommandé repose sur **Astro 7.x (dernière majeure stable)**, avec l'adaptateur **@astrojs/cloudflare 14.1.2** pour l'admin SSR sur Cloudflare Workers et **@astrojs/react 6.0.1** couplé à **React 19.2.7**. La vérification directe sur le registre npm (`registry.npmjs.org/@astrojs/cloudflare/14.1.2`) confirme que l'adaptateur v14.1.2 exige en peerDependency **`astro: ^7.0.0`** et **`wrangler: ^4.83.0`** : le couple Astro 7 / adaptateur 14 est donc verrouillé de fait, et Astro 6 n'est compatible qu'avec l'adaptateur v13. Les briques d'écosystème sont toutes en GA stable : **Tailwind CSS 4.3.2** (via `@tailwindcss/vite`, l'ancienne intégration `@astrojs/tailwind` étant officiellement dépréciée), **TipTap 3.27.x**, **Zod 4.4.3**, **Sharp 0.35.3**, **pnpm 11.10.0**, **TypeScript 6.0.3**, sur **Node 22 LTS**. Point d'architecture décisif : depuis l'acquisition d'Astro par Cloudflare (16 janvier 2026) et le passage à Astro 7 + adaptateur v14, **le déploiement Cloudflare Pages n'est plus supporté** ; le chemin officiel est **Workers + Static Assets**, ce qui correspond exactement au stack gelé de ColibriCMS.

---

## Note de discipline épistémique — divergences de sources à connaître
Deux points où des sources réputées divergent (à surveiller le jour de l'installation, `npm view <pkg> version` faisant foi) :
- **Version exacte d'Astro** : le registre npm/npmx affiche **7.0.7** comme tag `latest` (publié le 8 juillet 2026), tandis que la documentation officielle (`docs.astro.build/en/upgrade-astro`) indiquait encore **« The latest release of Astro is v7.0.6 »** au moment de la recherche. Fait corroborant : le `package.json` de `@astrojs/cloudflare@14.1.2` épingle en devDependency `astro: 7.0.7`, ce qui confirme l'existence de 7.0.7. **Retenu : `^7.0.7`** (repli `7.0.6` acceptable, même ligne mineure, sans breaking change). **Confiance : Élevé** sur la ligne 7.0.x, **Moyen** sur le patch exact.
- **Version exacte de Wrangler** : une capture npm renvoyait **4.108.0** (« last published: 2 hours ago »), une autre **4.107.1**. Wrangler publie plusieurs patchs par semaine ; ces micro-écarts n'ont aucun impact car la contrainte réelle est la plage peer `^4.83.0`. **Retenu : `^4.107` ou supérieur.** **Confiance : Élevé** sur la plage, faible pertinence du patch.

---

## Key Findings

1. **Astro 7 et l'adaptateur v14 forment un couple indissociable.** Peer dep vérifiée sur le registre : `@astrojs/cloudflare@14.1.2` → `astro: ^7.0.0`, `wrangler: ^4.83.0`. Impossible d'utiliser l'adaptateur 14 avec Astro 6, ni l'adaptateur 13 (peer `astro ^6.3.0`) avec Astro 7. **(Source : registry.npmjs.org, officiel, confiance Élevée.)**

2. **Le double usage SSG (site) + SSR Workers (admin) est pleinement supporté.** Astro reste un générateur de site statique par défaut ; l'adaptateur Cloudflare n'est nécessaire que pour l'admin en rendu à la demande (`output: 'server'` ou `prerender = false` par page). Les deux apps cohabitent dans le monorepo pnpm.

3. **Cloudflare Pages est abandonné comme cible pour ce stack.** Avec Astro 7 + adaptateur v14, la sortie de build est orientée Worker (`dist/server/wrangler.json`), et la doc Astro comme la doc Cloudflare recommandent Workers pour les nouveaux projets. **(Sources : docs.astro.build/guides/deploy/cloudflare, developers.cloudflare.com/workers/framework-guides/web-apps/astro, officiel + retour de migration communautaire, confiance Élevée.)** Le dev server d'Astro 6+ tourne désormais dans **workerd** via le plugin Vite Cloudflare, donnant accès aux bindings D1/R2/KV en local — un gain majeur pour ColibriCMS.

4. **`@astrojs/react@6.0.1` accepte React 17/18/19** (peer vérifiée : `react`/`react-dom: ^17.0.2 || ^18.0.0 || ^19.0.0`, `@types/react`/`@types/react-dom: ^17.0.50 || ^18.0.21 || ^19.0.0`). React 19.2.7 (stable) est donc dans la plage. Fait notable : le `package.json` de la 6.0.1 **ne déclare pas `astro` en peerDependency** (seulement en devDependency `astro: 7.0.6`), l'intégration s'appuyant sur le mécanisme d'intégrations d'Astro plutôt que sur une contrainte stricte.

5. **TipTap 3 est GA stable et prod-safe.** La v3.0 a été déclarée stable par l'éditeur (« After two months in beta, we're announcing the release of the stable version of Tiptap 3.0 »), dernière version `@tiptap/core@3.27.3`. Le stockage ProseMirror JSON est inchangé. TipTap 3 fonctionne avec React 19. **v2 n'est plus le choix par défaut** : v3 est le socle recommandé pour un greenfield.

6. **Zod 4 est stable et exporté depuis la racine `zod`.** La transition par sous-chemin (`zod/v4`) est terminée : `import * as z from "zod"` charge désormais Zod 4 (`4.4.3` stable). Zod est testé contre TypeScript ≥ 5.5. Pour du greenfield, **pas de complication d'import** : on importe directement depuis `zod`. À noter : dans le contexte des content collections Astro, la doc recommande `import` depuis `astro/zod`.

7. **Tailwind 4 impose le plugin Vite ; `@astrojs/tailwind` est déprécié.** Le CHANGELOG officiel (`#13049`, florian-lefebvre) indique : *« Deprecates the integration. Tailwind CSS now offers a Vite plugin which is the preferred way to use Tailwind 4 in Astro. Please uninstall @astrojs/tailwind and follow the Tailwind documentation for manual installation. »* On déclare `@tailwindcss/vite` dans `vite.plugins` d'`astro.config.mjs` et on importe `@import "tailwindcss";` dans un CSS. Plus de `tailwind.config.js` ni `postcss.config.js` par défaut (config CSS-first via `@theme`).

---

## Details

### 1) Matrice de compatibilité

| Brique | Dernière stable | Version retenue | Compatible avec | Confiance | Notes / risques |
|---|---|---|---|---|---|
| Astro (core) | 7.0.7 (npm) / 7.0.6 (doc) — **divergence** | `^7.0.7` | Node ≥22.12.0 ; Vite 8 (Rolldown) | Élevé (ligne) / Moyen (patch) | Compilateur Rust + pipeline Markdown Sätteri ; SSG et SSR supportés. |
| @astrojs/cloudflare | 14.1.2 | `^14.1.2` | **peer `astro ^7.0.0`, `wrangler ^4.83.0`** (vérifié registre) ; embarque `vite ^8.0.13`, `@cloudflare/vite-plugin ^1.39.0` | Élevé | Déploiement **Workers uniquement** (plus Pages). Bug OOM connu du dev server avec routage avancé `src/fetch.ts` sur très gros sites (#17181). |
| @astrojs/react | 6.0.1 | `^6.0.1` | **peer `react`/`react-dom ^17.0.2 \|\| ^18 \|\| ^19`** (vérifié registre) ; engines node ≥22.12.0 | Élevé | N'impose pas `astro` en peer dep. |
| react / react-dom | 19.2.7 | `19.2.7` | @astrojs/react 6 | Élevé | React 19 stable, dans la plage peer. |
| @types/react, @types/react-dom | 19.2.x | `19.2.0` (indicatif) | peer `^19.0.0` de l'intégration | Moyen | Aligner sur la ligne react 19 ; vérifier le patch au jour J. |
| wrangler | 4.107.1 / 4.108.0 — **divergence patch** | `^4.107` | peer adaptateur `^4.83.0` ; supporte bindings D1/R2/KV, `nodejs_compat` | Élevé | Publie plusieurs patchs/semaine ; le patch exact importe peu. |
| Runtime Workers (`compatibility_date`) | 2026-07-07 (exemple doc CF) | `2026-07-07` [À VÉRIFIER] | `nodejs_compat` | Moyen | Aligner la date sur la version de `workerd`/`miniflare` installée (avertissement possible « latest compatibility date supported… is X, but you've requested Y. Falling back to X »). |
| tailwindcss | 4.3.2 | `^4.3.2` | `@tailwindcss/vite 4.3.2`, Vite 8 | Élevé | `@astrojs/tailwind` **déprécié** (v3 uniquement). |
| @tailwindcss/vite | 4.3.2 | `^4.3.2` | Astro 7 / Vite 8 | Élevé | À placer dans `vite.plugins`. Un fix v4.3.x corrige les alias d'import en projet Astro (#19677). |
| @tiptap/core, /pm, /react, /starter-kit | 3.27.3 | `^3.27.3` | React 19 ; ProseMirror JSON | Élevé | v3 GA stable ; v2 non retenue pour greenfield. |
| zod | 4.4.3 | `^4.4.3` | TypeScript ≥5.5 | Élevé | Zod 4 exporté depuis la racine `zod` ; import `astro/zod` dans les schémas de collections. |
| sharp | 0.35.3 | `^0.35.3` | Node ≥20.9.0 | Élevé | Traitement d'images au **build** (SSG) ; hors runtime worker. À installer explicitement (pnpm strict). |
| pnpm | 11.10.0 | `11.10.0` | Node 22+ | Élevé | pnpm 11 exige Node 22+, pur ESM ; `minimumReleaseAge` par défaut 1 jour. |
| typescript | 6.0.3 | `^6.0.3` | Astro 7, Zod 4 | Moyen | TS 6 récent ; `@astrojs/check`/language-server supportent officiellement TS 6. |
| Node.js | 22.x LTS (≥22.12.0) | `>=22.12.0` | tout le socle | Élevé | Exigence commune Astro 7 / @astrojs/react 6 / pnpm 11. |

**Distinction des sources :**
- *Documenté officiellement* : peer deps `@astrojs/cloudflare@14.1.2` et `@astrojs/react@6.0.1` (registre npm) ; dépréciation `@astrojs/tailwind` (CHANGELOG) ; abandon de Pages au profit de Workers (docs Astro + Cloudflare) ; GA de TipTap 3, Zod 4, Tailwind 4 ; engines Node.
- *Retour communautaire* : bug OOM dev server adaptateur v14 (#17181) ; retours de migration Astro 5→6→7 (nécessité de migrer `@astrojs/tailwind` vers `@tailwindcss/vite`, `Astro.glob` → `import.meta.glob`, Content Layer API).
- *Inférence* : patch exact `@types/react`/`@types/react-dom` (aligné sur react 19.2) ; `compatibility_date` recommandée (à fixer selon miniflare local).

### 2) Point spécifique D1 / R2 / KV et nodejs_compat
Les bindings D1 (SQLite), R2 et KV sont exposés directement via le runtime Workers (`cloudflare:workers`), désormais disponibles aussi en développement grâce à workerd. Depuis Astro 6/adaptateur v13, l'API `Astro.locals.runtime` a été **supprimée** au profit de l'accès direct (`import { env } from 'cloudflare:workers'`). Le flag `compatibility_flags: ["nodejs_compat"]` et `compatibility_date` doivent figurer dans `wrangler.jsonc`. La config auto-générée par Wrangler pour un projet Astro comprend `main`, `assets` (directory `./dist`, binding `ASSETS`), `compatibility_flags: nodejs_compat`, `observability: enabled: true`. Tout ce périmètre tient sur le **free tier** Cloudflare pour une instance par client.

### 3) Bloc de versions épinglées (pnpm workspaces + catalog)

`pnpm-workspace.yaml` (racine) :
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
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

`packages/shared/package.json` (schémas Zod partagés client/serveur) :
```json
{
  "name": "@colibri/shared",
  "type": "module",
  "dependencies": {
    "zod": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

`apps/site/package.json` (site public, SSG, sans adaptateur) :
```json
{
  "name": "@colibri/site",
  "type": "module",
  "dependencies": {
    "astro": "catalog:",
    "@colibri/shared": "workspace:*",
    "sharp": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

`apps/admin/package.json` (admin, SSR Workers) :
```json
{
  "name": "@colibri/admin",
  "type": "module",
  "dependencies": {
    "astro": "catalog:",
    "@astrojs/cloudflare": "catalog:",
    "@astrojs/react": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "@tiptap/core": "catalog:",
    "@tiptap/pm": "catalog:",
    "@tiptap/react": "catalog:",
    "@tiptap/starter-kit": "catalog:",
    "tailwindcss": "catalog:",
    "@tailwindcss/vite": "catalog:",
    "zod": "catalog:",
    "@colibri/shared": "workspace:*"
  },
  "devDependencies": {
    "wrangler": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "typescript": "catalog:"
  }
}
```

Extrait `apps/admin/astro.config.mjs` (Tailwind 4 en plugin Vite) :
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
```

### 4) ADR de synthèse (Architecture Decision Record)

**Statut** : Accepté — V1 greenfield, juillet 2026.

**Contexte** : Arborescence Digital déploie une instance ColibriCMS par client et exige des versions durables, réplicables, sans surprise de compatibilité inter-clients. Stack gelé imposé : site public SSG (Astro, sans adaptateur), admin SSR sur Workers via `@astrojs/cloudflare` + îlots React (`@astrojs/react`), données D1/R2/KV en bindings directs, éditeur TipTap (stockage ProseMirror JSON), validation Zod partagée, styles Tailwind, images Sharp au build, auth Cloudflare Access (validation JWT côté Worker), monorepo pnpm (`packages/shared`, `apps/site`, `apps/admin`), TypeScript, gratuité Cloudflare, runtime Workers avec `nodejs_compat`. Contexte marché : Cloudflare a acquis The Astro Technology Company le 16 janvier 2026, faisant de Cloudflare un runtime de premier rang pour Astro.

**Décision** : Figer le socle sur **Astro 7.0.7** / **@astrojs/cloudflare 14.1.2** / **@astrojs/react 6.0.1** / **React 19.2.7** / **Wrangler 4.107.1** / **Tailwind CSS 4.3.2** (+ `@tailwindcss/vite`) / **TipTap 3.27.3** / **Zod 4.4.3** / **Sharp 0.35.3** / **pnpm 11.10.0** / **TypeScript 6.0.3**, sur **Node 22 LTS (≥22.12.0)**. Justification : c'est le seul jeu de versions dont la compatibilité est *documentée par les peerDependencies officielles* (adaptateur v14 ↔ Astro 7 ↔ Wrangler 4 ; @astrojs/react 6 ↔ React 19), toutes en GA prod-safe, et qui correspond au chemin de déploiement Workers désormais recommandé.

**Conséquences** :
- *Positif* : dev/prod alignés (workerd en local avec bindings) ; builds 15–61 % plus rapides (Vite 8/Rolldown) ; un seul modèle de déploiement (Workers Static Assets) réplicable par client.
- *Risques / vigilance à la mise à niveau* :
  1. Ne jamais mélanger les majeures Astro et adaptateur (peer deps strictes : Astro 7 ⇒ adaptateur 14 ; Astro 6 ⇒ adaptateur 13). Un `pnpm up` non maîtrisé peut casser cette contrainte.
  2. Bug OOM du dev server adaptateur v14 avec routage avancé `src/fetch.ts` sur sites à très nombreuses routes (#17181) — préférer le middleware Astro classique pour l'auth/redirections tant que non corrigé.
  3. **Fixer explicitement `compatibility_date` et `compatibility_flags: ["nodejs_compat"]`** dans `wrangler.jsonc` de l'admin ; valeur de départ suggérée `2026-07-07` [À VÉRIFIER selon la version de miniflare installée].
  4. Tailwind v4 en config CSS-first : ne pas réintroduire `@astrojs/tailwind` (déprécié) ni `tailwind.config.js`.
  5. Sharp doit être installé explicitement (pnpm strict) dans `apps/site` et n'est utilisé qu'au build.

---

## Recommendations

**Étape 1 — Bootstrap (immédiat).** Initialiser le monorepo avec pnpm 11 + Node 22 LTS. Créer le `catalog:` ci-dessus et scaffolder l'admin via `npm create cloudflare@latest -- apps/admin --framework=astro` puis `npx astro add cloudflare react tailwind` (qui installe le plugin `@tailwindcss/vite`, pas l'intégration dépréciée). Le jour de l'installation, exécuter `npm view astro version` et `npm view wrangler version` pour trancher les divergences de patch signalées, puis épingler les valeurs exactes dans le catalog.

**Étape 2 — Validation du couple critique.** Avant tout code métier, faire un déploiement « hello world » de l'admin sur Workers avec un binding D1, un R2 et un KV, et vérifier `astro dev` sous workerd (accès aux bindings en local). C'est le test qui garantit la réplicabilité inter-clients.

**Étape 3 — Intégration éditeur & validation.** Câbler TipTap 3 (îlot React `client:only="react"` ou `client:load`) et centraliser les schémas Zod 4 dans `@colibri/shared`, importés côté site et côté worker.

**Seuils qui feraient évoluer ces choix :**
- Si un client cible un **volume de routes admin très élevé** et rencontre l'OOM #17181 → rester sur middleware Astro, ou attendre le correctif adaptateur ; ne pas passer en routage `src/fetch.ts`.
- **Ne pas migrer** vers une future majeure Astro (v8) tant que `@astrojs/cloudflare` et `@astrojs/react` n'ont pas publié une version stable déclarant `astro: ^8` en peer dep — vérifier sur `registry.npmjs.org` avant tout bump.
- Repli documenté si l'on veut un cycle plus éprouvé : **Astro 6.4.4 + @astrojs/cloudflare 13.6.0** (peer `astro ^6.3.0`, `wrangler ^4.83.0`). Non retenu ici car le stack gelé vise Workers, chemin natif d'Astro 7, mais reste une porte de sortie stable si un problème bloquant apparaît sur la ligne 7/14.

---

## Caveats
- **Patchs mouvants** : Astro (7.0.6 en doc vs 7.0.7 sur npm) et Wrangler (4.107.1 vs 4.108.0) présentaient des écarts de patch entre sources au moment de la recherche. Ces écarts sont sans effet fonctionnel mais doivent être tranchés par `npm view` au jour de l'installation. Les **plages** (Astro 7.0.x, Wrangler ≥4.83.0) sont, elles, certaines.
- **`compatibility_date`** : marquée [À VÉRIFIER]. La valeur ne doit pas dépasser la date supportée par le `workerd`/`miniflare` embarqué par la version de Wrangler installée, sous peine d'un fallback silencieux.
- **`@types/react` / `@types/react-dom`** : patch exact (19.2.0) donné à titre indicatif ; aligner sur la ligne react 19.2 installée.
- **TypeScript 6** : très récent ; bien que `@astrojs/check` et le language-server déclarent le supporter, tester `astro check` sur le socle avant de généraliser (confiance Moyen sur ce point précis).
- **Cloudflare Access (JWT)** : la validation du JWT côté Worker relève de code applicatif (pas d'un package figé dans cette matrice) ; elle n'introduit pas de contrainte de version sur le socle mais doit être testée avec `nodejs_compat` activé.
- Les informations sur les bugs (#17181, OOM dev server) proviennent d'issues GitHub ouvertes et peuvent être résolues dans un patch ultérieur de l'adaptateur — reconsulter avant mise en production.