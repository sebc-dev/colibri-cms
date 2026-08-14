# Carte de campagne — Contrôles CI contre les modes de défaillance du code écrit par un agent

**Nature** : thème · **Question** : Quels contrôles ajouter au portail CI de ColibriCMS pour réduire
les modes de défaillance propres à un code écrit par un agent — correction, maintenabilité,
sécurité —, et à quel coût de faux positifs sur un dépôt tenu par un développeur seul ? ·
**Ancrage** : `colibri-cms` (ce dépôt) · **Ouverte le** : 2026-08-14 ·
**Acquis** : [`docs/ci.md`](../../ci.md) · [`docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`](../../chantiers/en-attente/2026-08-14-durcissement-ci.md)

| # | Sujet | Route | Collecte | Prompt | Rapport | Comblé | Distillé |
|---|---|---|---|---|---|---|---|
| 01 | Modes de defaillance mesures du code ecrit par un agent | research | — | — | — | — | s.o. |
| 02 | Graphe d imports resolu avec astro et svelte | mixte | — | — | — | — | s.o. |
| 03 | Antidotes a l oracle faux property-based et metamorphique | research | — | — | — | — | s.o. |
| 04 | Securite applicative de la stack workers d1 astro svelte | mixte | — | — | — | — | s.o. |
| 05 | Accessibilite et budget lighthouse en ci | mixte | — | — | — | — | s.o. |
| 06 | Derive documentation code | research | — | — | — | — | s.o. |
| 07 | Flux de mise a jour des dependances sous cooldown | mixte | — | — | — | — | s.o. |

## Notes

### 02 — Graphe d imports resolu avec astro et svelte

- **Routage** : mixte — la doctrine des règles de frontière entre zones est publique et se cherche.
  Ce qui ne se cherche pas, c'est la **capacité réelle d'un outil à parser `.astro`** : elle se lit
  dans son code et dans ses tickets, jamais sur une page de présentation. `docs/ci.md` porte déjà la
  réserve pour dependency-cruiser 18.1.0, et une partie des cinq zones est faite de `.astro`.

### 03 — Antidotes a l oracle faux property-based et metamorphique

- **Routage** : research malgré un versant outillé — brancher `fast-check` sous Vitest est trivial
  et se vérifiera au scaffold. Ce qui manque est doctrinal : ces techniques valent-elles quelque
  chose quand **l'agent écrit aussi les propriétés**, ou l'oracle faux se reporte-t-il d'un cran ?

### 04 — Securite applicative de la stack workers d1 astro svelte

- **Routage** : mixte — le registre de règles Semgrep est rendu en JavaScript, donc invisible à
  Research. L'existence réelle d'un jeu de règles pour les liaisons Workers, D1 et les îlots Svelte
  se collecte par l'API ou le dépôt.
- **Angle propre à l'ancrage, à ne pas perdre** : `docs/archi.md` pose que « le graphe d'imports
  **est** la frontière de confidentialité » — ce qu'un composant hydraté importe part dans le
  navigateur. Aucun contrôle du portail ne voit cette fuite.

### 05 — Accessibilite et budget lighthouse en ci

- **Routage** : mixte — les paliers gratuits et la stabilité en CI de chaque outil se vérifient au
  registre. Le socle `I5` de [`docs/socle-de-livraison.md`](../../socle-de-livraison.md) rend
  inutilisable ici tout composant dont le palier gratuit exige une carte bancaire, quel que soit son
  mérite.

### 07 — Flux de mise a jour des dependances sous cooldown

- **Routage** : mixte — la clé `minimumReleaseAge` de Renovate et son équivalent Dependabot se
  lisent dans leur schéma de configuration, pas dans un billet. La doctrine — quel régime de mise à
  jour tient sur un dépôt d'un seul développeur assisté d'un agent — se cherche.
