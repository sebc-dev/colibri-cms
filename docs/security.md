# ColibriCMS — Sécurité

Le cap durable de la sécurité : la politique que tout code respecte, et un modèle de menace léger.
Le *pourquoi* de chaque parade est figé dans un ADR (`docs/adr/`), cité par son numéro 2.x.

## La contrainte de fondation — une origine commune

**Un seul Worker sert le site public et l'administration, sur la même origine.** Le déploiement
unique interdit de tenir une frontière entre les deux par le déploiement ; elle se tient de
l'intérieur du dépôt (voir [`docs/architecture.md`](./architecture.md), `C2`). Conséquence directe :
le **cookie de session d'administration vit sur l'origine commune**, donc tout script tiers chargé
n'importe où sur le site est un risque **XSS same-origin** contre lui (préoccupation `SEC-1` de
[`docs/vision.md`](./vision.md)).

## Politique

- **Valider toute entrée externe.** Le texte riche de l'éditrice et les données des visiteurs
  finissent rendus dans des pages servies sur l'origine commune : toute saisie devenue HTML
  exécutable est un XSS de l'intérieur. Le HTML brut est **confiné à un seul lieu**
  (`src/render/markdown/`, invariant `I5`), et le texte riche est sérialisé en **Markdown restreint**
  (préoccupation `SEC-6`).
- **Aucun secret en clair, aucun secret de l'intégrateur.** Tout identifiant est créé au nom du
  client, jeton d'écriture du CMS compris (préoccupation `SEC-3`) : la révocation des accès
  d'Isometria ne doit rien casser (SC-012/SC-013). Les valeurs d'instance non secrètes vivent dans
  `instance.json` (invariant `I8`) ; les secrets, jamais dans le dépôt (config d'instance,
  [ADR-0005](./adr/0005-configuration-d-instance-quatre-lieux.md)).
- **Médias reconnus sur les octets.** Liste blanche **JPEG / PNG / WebP**, reconnue sur les octets
  d'en-tête — **jamais** l'extension ni le `Content-Type`. **SVG refusé.** Un fichier qui ment sur sa
  nature deviendrait du contenu exécutable servi sur l'origine commune (préoccupation `SEC-5`).
- **CSP stricte de l'administration.** `script-src 'self'` sans `unsafe-inline` : l'administration se
  monte comme une application par un point d'entrée externe, sans hydratation en ligne
  ([ADR-0006](./adr/0006-administration-sans-directive-client.md), invariant `I4`). Les en-têtes sont
  posés par deux porteurs — `_headers` pour le public, un middleware pour l'administration
  ([ADR-0004](./adr/0004-en-tetes-de-reponse-deux-porteurs.md),
  [ADR-0008](./adr/0008-en-tetes-d-administration-poses-par-un-middleware.md)). Seuls les **attributs**
  `style="…"` posés par les primitives sont tolérés, par `style-src-attr 'unsafe-inline'`
  ([ADR-0010](./adr/0010-csp-admin-styles-inline-style-src-attr.md)) — `script-src` n'est pas rouvert.
- **Anti-forgerie par le cookie.** Le cookie de session porte `__Host-`, `HttpOnly`, `Secure` et
  `SameSite=Strict` : le navigateur ne l'attache à aucune requête initiée depuis un autre site, ce
  qui prive une écriture forgée cross-site de la session. **Aucun jeton anti-forgerie dédié** n'est
  introduit ([ADR-0011](./adr/0011-anti-forgerie-des-ecritures-admin-samesite-strict.md)).
- **Surfaces publiques résistantes à l'abus, sans compte visiteur.** Connexion et envoi d'une demande
  résistent à l'abus par Turnstile et un compteur de fréquence, sans friction disproportionnée et
  sans consommer les quotas gratuits (préoccupation `SEC-2`). Le compteur compte par origine — une IP
  est une donnée personnelle : la protection ne doit pas créer un fichier des visiteurs (`DAT-3`).

## Modèle de menace léger

| Menace | Surface | Parade | Référence |
|---|---|---|---|
| XSS same-origin volant le cookie admin | origine commune | CSP stricte `script-src 'self'` ; HTML brut confiné ; Markdown restreint | ADR-0006, ADR-0010, `I4`, `I5` |
| CSRF sur une écriture admin | routes d'administration | cookie `SameSite=Strict` | ADR-0011 |
| Média piégé servi comme code | téléversement | liste blanche sur octets, SVG refusé | `SEC-5`, `SEC-6` |
| Énumération / déni sur la connexion | écran de connexion public | réponse et délai indépendants de l'envoi ; plafond horaire | ADR-0001, `SEC-4` |
| Message forgé se faisant passer pour le produit | acheminement des demandes | courriel **inerte** (texte seul, données du visiteur derrière étiquette) | [ADR-0002](./adr/0002-acheminement-email-routing-send-email.md), `SEC-7` |
| Session admin volée détruisant le contenu de référence | portes de l'administration | rayon d'action énuméré et borné ; publication en écriture additive | `SEC-8` |
| Perte des accès de l'intégrateur | déploiement | zéro secret de l'intégrateur ; moyen de reprise non e-mail | `SEC-3`, SC-012 |

## Ce qui reste à cadrer

Deux préoccupations de `docs/vision.md` sont déclarées **ouvertes**, avant la première mise en ligne :

- **DAT-1** — durée de conservation des coordonnées des visiteurs et cadre juridique.
- **DAT-2** — comment l'éditrice s'aperçoit, avec ses seuls moyens, que l'acheminement des demandes a
  cessé en silence.
