# ColibriCMS

CMS sur-mesure open source pour sites vitrine, hébergé sur le free tier Cloudflare.

- **Site public statique** — Astro en génération statique (SSG).
- **Admin SSR** — Cloudflare Workers (`@astrojs/cloudflare` + îlots React).
- **Données** — D1 / R2 / KV en bindings directs (pas d'API REST).

Modèle **centré page** : une page est une instance de **gabarit**, faite de **zones typées**
(texte, texte riche, image, galerie/carrousel, vidéo, CTA, répéteur). Un **constructeur de
formulaires** générique et borné permet de composer des formulaires acheminés par e-mail.

## Frontière cœur / client

Le **cœur** est packagé et versionné (SemVer, open source). Chaque **site client** est un
projet privé qui l'épingle et fournit ses gabarits via le **contrat de gabarit**. Une
instance = un client. Le sur-mesure vit dans le projet client, jamais dans le cœur.

## Documentation

La chaîne documentaire vit dans [`docs/`](docs/) :
[brief](docs/brief.md) → [PRD](docs/prd.md) → [stack](docs/stack.md) →
[ADR](docs/adr/README.md) → [CLAUDE.md](CLAUDE.md).

Les décisions d'architecture porteuses sont consignées dans l'
[Architecture Decision Log](docs/adr/README.md).

## Licence

[MIT](LICENSE) © 2026 Sébastien Chauveau
