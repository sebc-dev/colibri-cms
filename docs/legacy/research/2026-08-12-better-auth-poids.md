# Combien pèse Better Auth dans un Worker, et que faudrait-il pour l'y brancher ? — relevé

*Mesure du 12 août 2026, sur le registre npm public et sur un paquet Worker réellement bâti.
Instruit le premier des quatre faits de `S-10` de `docs/audit-stack.md` — les chiffres « 3,2 Mo
dépaquetés, 17 dépendances et 19 pairs » cités par le candidat ADR n° 6 de `docs/stack.md` et
présents dans aucun rapport.*
*Ce document est un **relevé de mesure**, pas une recherche : il établit des nombres et une surface
d'intégration, il n'arbitre pas le choix de la brique d'authentification.*
*Trace brute rejouable — commandes et sortie intégrale : `2026-08-12-better-auth-poids.transcript.txt`.*

---

## TL;DR

**Deux des trois chiffres se rejouent exactement, le troisième ne se rejoue nulle part** :
`better-auth@1.6.26` déclare bien **17 dépendances** et **19 pairs**, mais son `dist.unpackedSize`
au registre est de **2 072 279 o = 2,07 Mo**, non 3,2 Mo. Aucune grandeur mesurable ne vaut 3,2 Mo :
ni le paquet (2,07 Mo), ni l'arbre installé (23,98 Mo), ni rien de gzippé.

**Et surtout, le chiffre n'était pas dans l'unité du plafond qu'il invoquait.** Le plafond de
3 Mio du plan gratuit porte sur le paquet **déployé, gzippé** — donc sur ce que le bundler a gardé
après élagage, puis compressé. Mesuré sur un Worker réel qui importe `betterAuth` et le plugin
`email-otp` :

| | |
|---|---|
| paquet bâti, minifié | **755 735 o = 0,76 Mo** |
| **gzippé** | **192 305 o = 0,19 Mo** |
| plafond du plan gratuit | 3 Mio = 3 145 728 o |
| **occupation** | **6,1 %** |

**Le poids n'est donc pas un obstacle**, et il s'en faut d'un facteur seize.

Trois faits d'intégration sont sortis de la mesure, qu'aucun des trois chiffres ne portait :

1. **Better Auth n'a aucun point d'entrée Cloudflare ni D1.** Sur ses 56 exports, huit visent un
   framework — Next, Svelte Kit, Solid, Solid Start, TanStack Start, Node — et **aucun** ne vise
   Cloudflare. Brancher D1 passe par Kysely et un dialecte tiers, `kysely-d1@0.4.0` (14 931 o),
   écrit ni par Better Auth ni par Cloudflare.
2. **Le paquet exige `nodejs_compat`.** Il importe `node:crypto` depuis
   `@better-auth/utils/dist/password.node.mjs` ; sans le drapeau de compatibilité, le bundle ne se
   résout même pas.
3. **La version bouge à la semaine** : `1.6.26` est du 04/08/2026, `1.6.27` du 11/08/2026.

---

## Ce qui a été mesuré, et comment

**Les métadonnées** viennent du registre `registry.npmjs.org` interrogé le 12/08/2026, sur la
version **exacte** que la stack nomme — `1.6.26` —, jamais sur `latest` : un relevé pris sur
`latest` cesse d'être vérifiable dès la publication suivante.

**Le poids déployé** n'est pas déduit d'un `unpackedSize`, qui mesure une archive dépaquetée et non
un paquet servi. Un Worker minimal a été écrit puis bâti :

```js
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";

const auth = betterAuth({
  database: { dialect: null, type: "sqlite" },
  emailAndPassword: { enabled: false },
  plugins: [emailOTP({ async sendVerificationOTP({ email, otp }) { /* … */ } })],
});

export default { async fetch(request) { return auth.handler(request); } };
```

bâti par `esbuild` en `--bundle --format=esm --minify`, conditions de résolution
`workerd,worker,browser`, builtins Node laissés externes — c'est ce que fait la plateforme sous
`nodejs_compat`. La sortie est ensuite passée à `gzip -9`, l'unité dans laquelle le plafond est
exprimé.

**La surface d'intégration** est lue dans le paquet installé, jamais dans la documentation : champ
`exports` du `package.json`, contenu de `dist/integrations/`, et présence des symboles dans les
fichiers livrés.

---

## Les nombres

### Registre npm — `better-auth@1.6.26`

| Grandeur | Valeur | Au texte de la stack |
|---|---|---|
| `dist.unpackedSize` | 2 072 279 o = **2,07 Mo** | « 3,2 Mo dépaquetés » — **ne se rejoue pas** |
| `dist.fileCount` | 475 | — |
| dépendances déclarées | **17** | 17 — **exact** |
| pairs déclarés | **19** | 19 — **exact** |
| publication de `1.6.26` | 2026-08-04T21:19:38Z | — |
| publication de `1.6.27` | 2026-08-11T18:02:27Z | — |

Les 17 dépendances contiennent **cinq adaptateurs de base** — `drizzle`, `kysely`, `memory`,
`mongo`, `prisma` — plus `kysely` lui-même ; les 19 pairs en ajoutent **sept** — `better-sqlite3`,
`drizzle-kit`, `drizzle-orm`, `mongodb`, `mysql2`, `pg`, `prisma`. La formule « six piles de base
de données dont une seule sert » du candidat ADR n° 6 est donc **confirmée par la liste**, et non
seulement par les décomptes.

### Arbre installé

`npm install better-auth@1.6.26` dans un projet vide ajoute **22 paquets** (9 racine, 13 scopés),
pour **23 978 004 o = 23,98 Mo** sur disque. C'est un coût de poste de travail et de chaîne
d'approvisionnement, **pas** un coût de déploiement : rien de tout cela n'atteint le Worker.

### Worker bâti

| | octets | |
|---|---|---|
| brut, minifié | 755 735 | 0,76 Mo |
| **gzippé (`-9`)** | **192 305** | **0,19 Mo** |
| plafond plan gratuit | 3 145 728 | 3 Mio |
| **occupation du plafond** | | **6,1 %** |

Seul `node:crypto` subsiste comme builtin après élagage.

### Surface d'intégration

| Point vérifié | Constat |
|---|---|
| Points d'entrée Cloudflare / D1 | **aucun**, sur 56 exports |
| Points d'entrée framework | `next-js`, `node`, `solid`, `solid-start`, `svelte`, `svelte-kit`, `tanstack-start`, `tanstack-start/solid` |
| Dialecte D1 pour Kysely | `kysely-d1@0.4.0`, 14 931 o, éditeur tiers |
| Builtin Node requis | `node:crypto` → `nodejs_compat` obligatoire |
| Options du plugin `email-otp` | `otpLength`, `expiresIn`, `allowedAttempts`, `disableSignUp`, `storeOTP`, `overrideDefaultEmailVerification`, `sendVerificationOnSignUp` |
| Cookies | `__Host-`, `__Secure-`, `cookiePrefix`, `useSecureCookies` |
| Origine | `originCheck` |
| Tables du schéma par défaut | `user`, `session`, `account`, `verification` |

---

## Ce que ce relevé **ne** dit **pas**

- **Il ne mesure pas le Worker du projet.** Le paquet bâti ici ne contient que Better Auth, son
  plugin de code à usage unique et un handler. Le CMS y ajouterait Astro, l'adaptateur, le rendu de
  l'aperçu et son propre code. Le chiffre de 6,1 % borne **la part de Better Auth**, il n'annonce
  pas le total.
- **Il n'établit pas que Better Auth fonctionne sur Workers.** Il établit qu'il y **tient**, qu'il
  y **exige** `nodejs_compat`, et qu'aucun chemin d'intégration Cloudflare n'est publié par
  l'éditeur. Un branchement réel sur D1 par `kysely-d1` n'a **pas** été exécuté.
- **Il n'arbitre pas le choix de la brique d'authentification.** La phase Stack a écarté de
  trancher « Better Auth / implémentation maison / Access OTP » par recherche : c'est un arbitrage
  à trois branches, pas un fait à sourcer. Ce relevé retire un argument du dossier et en ajoute
  trois ; il ne conclut pas à la place de l'arbitre.
- **Il vieillit vite.** Sept jours séparent `1.6.26` de `1.6.27`. Tout chiffre de ce document est
  daté du 12/08/2026 et se rejoue par le transcript joint.
