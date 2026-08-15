# Quand l'adaptateur Astro a-t-il retiré Cloudflare Pages ? — relevé

*Mesure du 12 août 2026, sur le registre npm public et sur les paquets publiés dépaquetés
localement. Instruit le fait 4 de `S-10` et le quatrième écart de `S-11` de `docs/audit-stack.md` :
`docs/stack.md` date la rupture de « la v13, publiée le 10/03/2026 » quand son propre rapport
(`2026-08-10-pages-ou-workers-static-assets.md:27`) la date d'« Astro 6, déc. 2025 », et aucune
trace ne vit dans le dépôt — il n'a ni `package.json` ni `node_modules`.*
*Ce document est un **relevé de mesure**, pas une recherche : il établit une date et un contenu de
paquet, il ne rouvre pas l'arbitrage « Pages ou Workers », rendu le 10/08.*
*Trace brute rejouable — commandes et sortie intégrale : `2026-08-12-adaptateur-astro-pages.transcript.txt`.*

---

## TL;DR

**Les deux documents ne se contredisent pas sur la version : ils nomment le même événement.**
`@astrojs/cloudflare@13.0.0` et `astro@6.0.0` ont été publiés le **10 mars 2026 à trois secondes
d'intervalle** — 09:48:45 et 09:48:48 UTC. La major 13 de l'adaptateur **est** celle d'Astro 6.
« v13 » et « Astro 6 » désignent la même rupture ; il n'y a rien à corriger sur ce point.

**La seule divergence est la date, et chacun a raison sur une grandeur différente.** « Déc. 2025 »
est la date de la PR de documentation, passée pendant le cycle alpha d'Astro 6 (`6.0.0-alpha.0`,
10/11/2025) ; « 10/03/2026 » est la date de mise à disposition réelle. La stack n'a donc pas
corrigé son rapport : elle a **remplacé une date d'annonce par une date de sortie, sans le dire**.

**Le retrait se constate dans le paquet, et ne tient qu'à un fichier :**

| | v12.6.13 (dernier de la branche 12) | v13.0.0 |
|---|---|---|
| occurrences de `_routes.json` dans `dist/` | **6** | **0** |
| `dist/utils/generate-routes-json.js` | 225 lignes | **22 lignes** |
| ce qu'il exporte | `createRoutesFile`, `getParts` | `getParts` seul |
| `dist/utils/cloudflare-module-loader.js` | présent | **absent** |
| `peerDependencies` | `astro ^5.7.0` | `astro ^6.0.0-alpha.0` |

`_routes.json` est le plan de routage **propre à Cloudflare Pages** : il déclare quelles URL
invoquent la Function et lesquelles sont servies en statique, et il n'existe sur aucune autre
cible. La v12 l'écrit (`index.js:253` appelle `createRoutesFile`) ; la v13 ne le mentionne plus
une seule fois. Le module survit sous son ancien nom, réduit à un utilitaire de découpage de
chemin — un vestige. **Le code de Pages n'a pas été déprécié : il a été retiré.**

**Coût de la voie Pages, en versions.** Le dernier adaptateur qui l'accepte (12.6.13) épingle
`astro ^5.7.0`, donc plafonne à **`astro@5.18.2`** ; `astro` est aujourd'hui à **7.2.1**. Deux
majors en arrière, sur une branche que l'adaptateur a quittée.

---

## Trois preuves citées par `docs/stack.md` ne tiennent pas

La mesure a été lancée pour combler une absence de source ; elle a trouvé, en chemin, que la
justification écrite s'appuyait sur les mauvais éléments. Un lecteur qui les vérifie conclurait
que la stack a tort — alors qu'elle a raison.

1. **« README v13 : *Cloudflare Workers targets* » — faux à la version nommée.** Le README de la
   13.0.0 dit encore, mot pour mot comme la v12 : *« An SSR adapter for use with Cloudflare Pages
   Functions targets. Write your code in Astro/JavaScript and deploy to Cloudflare Pages. »* La
   bascule vers *Workers targets* n'intervient qu'à la **13.1.3, le 20/03/2026** — dix jours après
   le retrait réel. La documentation a suivi le code, elle ne l'a pas annoncé.
2. **« Zéro occurrence de `pages` dans son `dist` » — faux dans la lettre.** Il y en a trois, dans
   deux fichiers, toutes au sens « les pages du site », dans le prérendu. Aucune ne vise Cloudflare
   Pages. L'esprit était juste, la formulation invérifiable : c'est `_routes.json` qui porte la
   preuve, et lui vaut bien zéro.
3. **`astro@7.2.0` — périmé de cinq jours.** La branche courante est `7.2.1` depuis le 11/08. Le
   chiffre était exact le 10/08 ; il ne l'est plus.

Un quatrième écart, mineur, vise la fiche archivée du 10/08 et non la stack : le `peerDeps` v13
qu'elle consigne — `{ astro: ^6.3.0 }` — est celui de la **13.7.0**, pas celui de la 13.0.0
(`^6.0.0-alpha.0`).

---

## Ce que ce relevé n'établit pas

- **La PR `withastro/docs #12981` n'a pas été consultée.** Rien ici ne contredit sa date de
  décembre 2025 ; la mesure établit seulement que la *publication* est du 10/03/2026, ce qui est
  une autre grandeur. Les deux dates coexistent, et c'est le point.
- **Aucun déploiement n'a été tenté**, ni sur Pages ni sur Workers. La conclusion porte sur ce que
  le paquet publié contient, pas sur ce qu'une plateforme accepte encore de servir.
- **L'arbitrage « Pages ou Workers » n'est pas rouvert.** Il a été rendu le 10/08 sur les plafonds
  et sur `FR-081`, pas sur cette date : ce relevé en consolide la justification, il ne la rejoue
  pas.
