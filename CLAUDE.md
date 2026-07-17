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

**Socle (ADR-0003)**
- Versions via `catalog:` pnpm ; ne pas mélanger les majeures Astro/adaptateur.
- Pas de `@astrojs/tailwind` ni `tailwind.config.js` (Tailwind 4 = `@tailwindcss/vite`).
- `nodejs_compat` + `compatibility_date` fixés dans `apps/admin/wrangler.jsonc`.
- Auth par middleware Astro, pas de routage `src/fetch.ts` (bug #17181).
- `sharp` : `apps/site` uniquement, build-only.

**Formulaires (ADR-0007)**
- Soumission = `writeHandler({auth:'public'})` + vérif Turnstile avant tout traitement.
- Ne jamais persister une soumission (acheminement e-mail uniquement).
- Montants en centimes entiers ; total = somme pure (`@colibri/core`), aucune règle conditionnelle en V1.

**Flotte (ADR-0008)**
- Aucun code spécifique client dans le cœur ; ne pas forker le cœur (épinglage de version).
- Une rupture de migration ou de contrat de gabarit → **majeure** SemVer.
- Migrations D1 : versionnées, ordonnées, appliquées par étape outillée **après sauvegarde + vérification** ; jamais en automatique au déploiement.

**Test (ADR-0005)**
- Intégration dans workerd avec vrais bindings locaux ; ne pas sur-mocker D1/R2/KV.
- 100 % des endpoints d'écriture testés pour l'autorisation ; route publique testée pour Turnstile.
- Ne jamais déclencher le vrai Deploy Hook ni envoyer un vrai e-mail en test (mockés).
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
