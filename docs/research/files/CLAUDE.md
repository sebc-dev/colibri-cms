# CLAUDE.md — ColibriCMS

<!-- Point d'entrée injecté à chaque session. Garder < 200 lignes.
     Ne PAS dupliquer d'ADR ici : pointer + ne recopier que les contraintes actives.
     Ce fichier guide ; ce qui NE DOIT PAS arriver est appliqué par hooks/CI (cf. ADR-0002). -->

@docs/adr/README.md

## Projet

CMS sur-mesure open source. Monorepo pnpm : **site public statique (Astro SSG)** + **admin SSR sur Cloudflare Workers** (@astrojs/cloudflare + îlots React). Données **D1/R2/KV en bindings directs** (pas d'API REST). Une instance = un client. Tout sur le free tier Cloudflare.

## Comment travailler ici

- **Avant d'implémenter** : en Plan Mode, lire les ADR du `scope` concerné (`docs/adr/`). Signaler tout conflit avec un ADR **accepté** au lieu de le contourner.
- **Nouveau patron structurant** → rédiger un ADR *proposed* (`docs/adr/`) soumis à approbation **avant** d'écrire du code, dans la **même PR**.
- **Séquence par tranche** : schéma Zod (humain) → test rouge (humain) → implémentation (toi) jusqu'au vert.
- Donner un moyen de vérifier ton travail : lancer tests + lint avant de marquer « terminé ».

## Contraintes actives (impératif) — source : ADR, appliquées par hooks/CI

**Architecture (ADR-0004)**
- Aucun import de `cloudflare*` (hors types) dans `@colibri/core`.
- Aucun import de `apps/*` dans `@colibri/db` ni `@colibri/core`.
- Toute lecture partagée site+admin vit dans `@colibri/db` ; jamais de SQL de lecture dans `apps/*`.
- Tout endpoint d'écriture est déclaré via `writeHandler({...})`.
- Deux schémas Zod par type : `xxxRow` (sortie D1) et `xxxInput` (entrée éditeur).
- Verrou optimiste via `createRepository` uniquement.
- Résolution JWKS de l'auth injectable.

**Socle (ADR-0003)**
- Versions via `catalog:` pnpm ; ne pas mélanger les majeures Astro/adaptateur.
- Pas de `@astrojs/tailwind` ni `tailwind.config.js` (Tailwind 4 = `@tailwindcss/vite`).
- `nodejs_compat` + `compatibility_date` fixés dans `apps/admin/wrangler.jsonc`.
- Auth par middleware Astro, pas de routage `src/fetch.ts` (bug #17181).
- `sharp` : `apps/site` uniquement, build-only.

**Test (ADR-0005)**
- Intégration dans workerd avec vrais bindings locaux ; ne pas sur-mocker D1/R2/KV.
- 100 % des endpoints d'écriture testés pour l'autorisation.
- Ne jamais déclencher le vrai Deploy Hook en test (mocké).
- Ne pas terminer une migration D1 par un commentaire (#7739).

**Génération IA (ADR-0006)**
- Ne pas éditer : `tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth.
- Ne pas lancer `--update`/`-u` sur les goldens.
- Ne pas viser un pourcentage de couverture-ligne.

## Style
- TypeScript `strict`, indentation 2 espaces, ESM.
- Français pour les commentaires de décision et la doc ; anglais toléré pour le code.

<!-- Si deux règles se contredisent, le corriger ici plutôt que de laisser l'agent trancher au hasard.
     Diagnostiquer le contexte chargé avec /memory et /context. -->
