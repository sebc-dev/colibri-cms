# ADR-0005 : Astro comme moteur de rendu du site public et coquille de l'admin
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le site public doit être bâti à la publication (`FR-045`), ne déclencher aucun traitement
serveur à la consultation (`FR-046`), et porter tout son contenu éditorial dans la réponse
initiale sans exécution côté visiteur (`FR-047`) — le tout à un score Lighthouse
Performance d'au moins 95 en mobile (`SC-005`, `US10`). Deux exceptions locales à ce
principe : le total du devis se calcule **sur l'appareil du visiteur**, sans échange
serveur (`FR-058`, `FR-061`), et l'admin est une interface interactive.

Le moteur doit par ailleurs savoir lire les fichiers plats déposés par `ADR-0001` au
format posé par `ADR-0002`, et générer les dérivés d'images au build — ce qui remplace
exactement ce que R2 aurait apporté et que `ADR-0003` a renoncé à obtenir autrement.

Deux faits datés, de sources distinctes. **Acquisition d'Astro par Cloudflare en janvier
2026** : relevé du 6 août 2026, consigné dans `docs/stack.md`. **Cible de l'adaptateur** :
`@astrojs/cloudflare` **ne supporte plus** le déploiement sur Cloudflare Pages depuis sa
v13 (Astro 6) — « *The Astro Cloudflare adapter no longer supports deployment on Cloudflare
Pages* » (`docs.astro.build/en/guides/integrations-guide/cloudflare/`, vérifié le
2026-08-07). Workers n'est donc pas la cible par défaut de l'adaptateur : c'est sa seule
cible.

Exigences concernées : `FR-030`, `FR-045`, `FR-046`, `FR-047`, `FR-057`, `FR-058`,
`FR-061`, `SC-005` · `US2`, `US10`.

## Décision

Nous utiliserons **Astro** comme moteur de rendu, pour le site public **et** pour la
coquille statique de l'admin.

Nous nous appuierons sur ses collections de contenu pour lire les fichiers plats, sur son
pipeline d'images pour générer les dérivés responsive au build, et sur ses îlots pour les
seules zones réellement interactives : le calcul du total chez le visiteur (`FR-058`) et
les écrans d'édition.

Nous conserverons le zéro JavaScript par défaut : toute page qui embarque du script le
fait par une décision explicite, pas par défaut du framework.

## Conséquences

**Positives**

- `FR-047` et `SC-005` sont tenus par le comportement par défaut du moteur, et non par un
  travail d'optimisation à refaire à chaque page.
- Le pipeline d'images au build rend `ADR-0003` réalisable sans code propre : c'est la
  contrepartie qui rendait le renoncement à R2 tenable.
- Un seul outillage couvre le site public et l'admin : une chaîne de build à connaître, un
  seul jeu de conventions pour l'aperçu fidèle exigé par `FR-030`.
- Le format de `ADR-0002` est consommé directement par les collections de contenu, sans
  couche de conversion à maintenir.

**Négatives — ce que ce choix coûte**

- **La concentration chez un fournisseur unique s'accentue** : après l'acquisition de
  janvier 2026, le framework, l'hébergement, le build, la base, l'envoi d'e-mail et
  l'anti-abus relèvent tous de Cloudflare. Contrepoids retenus : Astro est sous licence
  MIT et son code est public, et l'épreuve de réversibilité (`SC-011`) ne dépend d'aucun
  accès Cloudflare — mais elle dépend désormais d'un registre de paquets, et `I3` s'entend
  « sans accès Cloudflare », pas « sans registre ».
- **`SC-005` doit se mesurer page par page**, pas une fois : la page du formulaire porte un
  îlot et le widget anti-abus de `ADR-0009`, donc du JavaScript. `FR-047` reste vrai — le
  contenu éditorial est là sans script — mais le score de cette page-là n'est pas acquis
  par le seul choix du framework.
- **Une montée de version majeure d'Astro est un travail sur toute la flotte**, puisque le
  moteur est embarqué dans le paquet versionné de `ADR-0011`.
- Le temps de build est celui d'Astro, sous le plafond de 20 minutes de l'annexe A : il
  croît avec le nombre de pages et de dérivés d'images, ce qui recoupe le coût déjà nommé
  par `ADR-0003`.

## Alternatives considérées

- **Eleventy** : écartée malgré sa neutralité vis-à-vis du fournisseur — le seul argument
  qui pesait contre la concentration ci-dessus — parce qu'il n'offre ni pipeline d'images
  ni îlots. Il faudrait les écrire, et `SC-005` redeviendrait alors un travail
  d'optimisation manuel à refaire à chaque gabarit, sur un produit dont le Brief pose que
  le code n'est pas relu ligne à ligne.
- **Rendu à la demande dans le Worker** (pas de site bâti) : écartée parce qu'elle
  contredit frontalement `FR-045` et `FR-046`, et parce que le budget de 10 ms de CPU par
  invocation (annexe A) ne le permet pas.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 5 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
