# 07 — Les pages publiques sont des documents statiques, sans script, sous leurs en-têtes

**Bloqué par :** 04
**Vérif :** test
**Fichiers :** `public/_headers`, `tests/static/site-public-statique.test.ts`, `tests/parcours/site-public.parcours.ts`

## Ce que ça livre

Une page publique est un document **statique**, produit à la construction du site. Sa consultation
n'exécute aucun code du site, ne lit aucune base et ne pose aucun cookie (FR-096). Elle est servie
sous les **en-têtes de sécurité du site public** :
- une politique de sécurité de contenu qui n'admet aucun script et ne charge que des ressources du
  site lui-même ;
- `X-Content-Type-Options: nosniff` ;
- une politique de référent ;
- le refus d'être affichée dans le cadre d'un autre site.

Une page publique ne charge aucune ressource d'une autre origine et ne mène jamais à l'aperçu, qui
reste dans l'administration.

**Décisions à respecter :**
- `public/_headers` est versionné, avec une règle `/*` (ADR-0004, second porteur d'en-têtes) :
  - `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self';
    base-uri 'none'; form-action 'none'; frame-ancestors 'none'` ;
  - `X-Content-Type-Options: nosniff` ;
  - `Referrer-Policy: strict-origin-when-cross-origin` ;
  - `X-Frame-Options: DENY`.

  L'adaptateur `@astrojs/cloudflare` le fusionne dans `dist/client/_headers`. La story du formulaire
  public y ajoutera `script-src` et Turnstile.
- **Contrôles statiques** sur la sortie de la construction :
  - `dist/client` porte un document par page déclarée, plus la page introuvable ;
  - `dist/client/_headers` porte la règle `/*` et la politique ;
  - aucune page bâtie ne porte de `<script>` ni d'adresse d'une autre origine ;
  - aucune page bâtie ne pointe vers `/admin/apercu/` ;
  - le `wrangler.json` produit ne pose aucun `run_worker_first` global : sinon les pages passeraient
    par le Worker et `_headers` ne s'appliquerait plus, sans aucun signal.
- **Preuve « document statique »** par un parcours dans un vrai navigateur (Playwright sur
  `wrangler dev`, `npm run parcours`) : une page publique arrive avec les en-têtes de `_headers`, sans
  violation de politique dans la console, sans `Set-Cookie`, avec ou sans session d'administration
  ouverte.
- `exports.default.fetch` appelle le Worker directement, en sautant la couche des fichiers statiques :
  il ne prouve rien ici.

**Hors périmètre :** les en-têtes de l'administration et de l'aperçu (posés par le middleware
existant, I11) ; le contenu des pages (tickets 04 à 06).

## Critères
- [ ] Une page publique demandée arrive avec les en-têtes de sécurité du site public, posés sur les documents statiques du site, ce qui atteste qu'elle n'a pas traversé le code du site   (SC-07a)
- [ ] Une page publique servie ne porte aucun script, et chacune de ses ressources — feuille de style, images — est servie par le site lui-même   (SC-07b)
- [ ] Un visiteur qui demande une page publique, avec ou sans session d'administration ouverte, reçoit le même document, et la réponse ne pose aucun cookie   (SC-07c)
- [ ] Quand un visiteur parcourt les pages publiques, aucun lien ni aucune ressource ne pointe vers l'aperçu   (SC-07d)
