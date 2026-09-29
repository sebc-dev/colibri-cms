# 02 — L'administration prend l'identité Colibri

**Bloqué par :** —
**Vérif :** observé
**Fichiers :** `package.json`, `package-lock.json`, `src/admin/admin.css`, `src/admin/Gabarit.astro`, `src/admin/Logo.astro`, `src/admin/composants/ui/{input,label,textarea,card,badge,dialog,alert}/**`, `components.json`

## Ce que ça livre

Les écrans de l'administration quittent la palette grise du registre de composants et prennent
l'identité Colibri : fond en neutre chaud (jamais blanc pur), cartes en surface claire, une seule
couleur pour les actions (`plumage`, vert), une couleur réservée au brouillon (`gorge`, rubis), des
signaux `ambre` / `danger` / `info`, des coins tenus. Un seul thème, clair, même si l'appareil est
réglé en apparence sombre. Les trois polices — Fraunces (titres), Instrument Sans (texte courant),
JetBrains Mono (adresses) — sont **servies par le site lui-même**, sans aucun appel à un service tiers.
Ce ticket pose aussi le socle que les tickets d'écran consommeront : le logo, les composants de base,
un contour de focus commun, et des champs de saisie qui ne font pas agrandir la page sur téléphone.

**Décisions à respecter (ADR-0015, ADR-0016) :**
- **Tokens** : `admin.css` déclare dans `:root` les tokens Colibri sous leurs noms (`--surface`,
  `--surface-raised`, `--surface-sunken`, `--line`, `--line-strong`, `--ink`, `--ink-muted`,
  `--plumage`, `--plumage-soft`, `--on-plumage`, `--gorge`, `--gorge-soft`, `--ambre`, `--ambre-soft`,
  `--danger`, `--danger-soft`, `--on-danger`, `--info`, `--info-soft`, `--focus-ring`, `--overlay`,
  `--logo`, ombres, familles, échelle typographique), puis chaque variable shadcn **pointe** un token
  (`--background: var(--surface)`, `--foreground: var(--ink)`, `--card: var(--surface-raised)`,
  `--primary: var(--plumage)`, `--primary-foreground: var(--on-plumage)`, `--muted:
  var(--surface-sunken)`, `--muted-foreground: var(--ink-muted)`, `--destructive: var(--danger)`,
  `--border: var(--line)`, `--input: var(--line-strong)`, `--ring: var(--focus-ring)`). `@theme inline`
  expose les deux familles (`bg-surface`, `text-gorge`, `bg-gorge-soft`, `font-display`…). Rayons
  `--radius-sm/md/lg` = 4/6/10 px. La grille de 4 px est déjà celle de Tailwind v4 : ne pas redéfinir
  `--spacing`. Seul le bloc clair ; `color-scheme: light` reste. Les valeurs viennent du canvas Colibri
  (skill `/colibri-cms-design`).
- **Invariant `I14`** : aucune couleur littérale sous `src/admin/` hors `admin.css`.
- **`body`** perd son `padding: 2rem`, prend fond, encre et police de base ; les titres `h1` prennent
  la famille d'affichage par la couche de base (les écrans ne posent pas d'attribut sur leurs `h1`).
- **Polices** : sept imports ciblés en tête de `admin.css` (`@fontsource/fraunces/latin-{400,600}.css`,
  `@fontsource/instrument-sans/latin-{400,500,600}.css`, `@fontsource/jetbrains-mono/latin-{400,500}.css`),
  jamais l'`index.css` d'un paquet ni un point d'entrée JavaScript. Les familles de `@theme`
  (`--font-display`, `--font-sans`, `--font-mono`) gardent des piles de repli. À défaut de résolution
  depuis `admin.css`, importer ces feuilles depuis `Gabarit.astro` — même résultat servi.
  **Vérifier sur l'artefact bâti** que les sept `.woff2` sont émis comme fichiers sous `/_astro/`,
  jamais en `data:` (que `font-src 'self'` bloquerait). Invariant `I15`.
- **Logo** : `src/admin/Logo.astro`, SVG du canvas réécrit à la main dans la page, tracés seuls,
  `fill="currentColor"`, couleur par le token `--logo`, `role="img"` et `aria-label`. Aucun `<script>`,
  attribut `on…`, `href` ni `<foreignObject>`. Il sera affiché par le cadre et par la connexion.
- **Composants de base** ajoutés par la CLI shadcn-svelte sous `src/admin/composants/ui/` : `input`,
  `label`, `textarea`, `card`, `badge`, `dialog`, `alert` (ADR-0009, code possédé). Chacun doit
  fonctionner sous la CSP réelle : seule la tolérance des attributs `style="…"` existe (ADR-0010,
  `I12`). Les transitions de ces composants passent sous `motion-safe:`.
- **Focus** : un contour de focus commun (`:focus-visible`, token `--focus-ring`, au moins 3:1 sur son
  fond), jamais masqué.
- **Champs sur téléphone** : sous 768 px, les champs de saisie passent à 16 px (15 px au-delà) — seul
  écart assumé au canvas.
- La politique de sécurité (`src/platform/entetes/middleware.ts`) n'est **pas** touchée : un habillage
  qui ne passe pas sous la CSP se corrige dans l'habillage.

**Preuve attendue :** sur l'artefact bâti (`npm run build` puis `wrangler dev` — jamais `npm run dev`,
dont le CSS injecté par script est bloqué par la CSP), captures de la connexion et de « Mes pages » ;
onglet réseau ; console.

**Hors périmètre :** le thème sombre et tout réglage d'apparence ; le cadre et le menu ; l'habillage
propre à chaque écran ; le site public.

## Critères
- [x] Un écran servi affiché sur un appareil réglé en apparence sombre se présente dans le thème clair, à l'identique   (SC-02a)
- [x] Un écran servi affiché sous ses en-têtes réels ne charge que des ressources de sa propre origine (feuilles, polices, logo, icônes, scripts), et la console ne rapporte aucune violation de la politique de sécurité   (SC-02b)
- [x] Quand un fichier de police ne peut pas être chargé, le texte concerné s'affiche dans sa police de repli, sans texte invisible ni mise en page cassée   (SC-02c)
- [x] Parcouru à la touche Tab, chaque élément atteint montre un contour de focus visible, jamais masqué par un autre élément   (SC-02d)
- [ ] Sur un téléphone, toucher un champ de saisie n'agrandit pas la page, et le champ reste visible au-dessus du clavier   (SC-02e)
