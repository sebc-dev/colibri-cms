# ADR-0015 : Les tokens Colibri deviennent le thème de l'administration — clair seul, polices à part
Statut : Accepté | Date : 2026-09-25

## Contexte

L'administration se rend sur le thème « neutral » du registre shadcn-svelte : une palette grise
standard, reprise telle quelle dans `src/admin/admin.css` au ticket qui a fait entrer Tailwind
(ADR-0009). Elle n'a pas d'identité, et elle n'a pas de mise en page.

Le canvas **Colibri CMS Design System** fait autorité sur la marque (`docs/design-system.md`
§ Canvas maître) ; sa copie datée vit sous `.claude/skills/colibri-cms-design/`. Il fixe des
neutres **chauds** (le fond n'est jamais blanc pur, pour que les photos de la cliente restent la
seule chose éclatante), **une seule couleur d'action** (`plumage`, vert émeraude), une couleur
**réservée à un seul état** (`gorge`, rubis : « modifié, non publié » — jamais une action), trois
signaux avec leur fond atténué, une grille de 4 px, des coins tenus (4/6/10 px) et une échelle
typographique. Le vocabulaire de l'éditrice — brouillon, publié — y a donc une couleur, ce que le
thème « neutral » ne sait pas dire.

`docs/design-system.md` déclare pourtant ce canvas **non adopté**, et nomme trois écarts à trancher
par ADR avant tout portage : le code des composants est en React, les polices et les icônes y
viennent d'origines tierces que la CSP interdit, et le canvas porte deux thèmes. Le change de mise
en page de l'administration (à venir, `005`) ne peut pas s'écrire tant que le thème n'est pas fixé :
chaque écran s'y réfère. Cet ADR tranche le **thème** ; il laisse délibérément les polices à une
décision séparée, parce que leur chargement touche la politique de sécurité (`I12`) et non la
seule feuille de style.

## Décision

1. **Les valeurs du canvas Colibri remplacent le thème « neutral »** dans `src/admin/admin.css`,
   qui reste le **seul** porteur des tokens de l'administration. Entrent : les couleurs
   (`tokens/colors.css`, bloc clair), les rayons, filets, ombres et réglages de focus
   (`tokens/shape.css`), la grille d'espace (`tokens/spacing.css`) et l'échelle typographique —
   tailles, interlignages, graisses, approches (`tokens/typography.css`).
2. **Un seul thème, le clair.** Le bloc `[data-theme="dark"]` du canvas n'est pas repris ;
   l'administration reste en `color-scheme: light`. Le thème sombre reste une intention du canvas,
   non portée par le produit.
3. **Les noms Colibri sont la source, les noms shadcn des alias.** `admin.css` déclare les tokens
   sous leurs noms de canvas (`--surface`, `--ink`, `--plumage`, `--gorge`, `--space-4`…), puis
   définit les variables qu'attendent les composants copiés **en fonction d'eux** (`--background:
   var(--surface)`, `--primary: var(--plumage)`, `--destructive: var(--danger)`, `--ring:
   var(--focus-ring)`…). `@theme inline` expose les deux familles en utilitaires. Les composants
   copiés par la CLI de shadcn-svelte ne sont pas retouchés pour changer de nom de couleur.
4. **Les familles de polices ne sont pas chargées par cette décision.** Les tokens de famille
   (`--font-display`, `--font-sans`, `--font-mono`) entrent avec leurs **piles de repli** (Georgia,
   system-ui, Menlo) ; aucun `@import` vers Google Fonts. Servir Fraunces, Instrument Sans et
   JetBrains Mono en même origine est l'objet d'un ADR suivant.
5. **Ce qui passe, ce sont les valeurs** — jamais le code du canvas : ni ses composants React, ni
   ses classes `.cb-*`, ni son `base.css` tel quel. Les dispositions qu'en tireront les écrans
   passent par le change de mise en page.

## Conséquences

**Positives.**

- **Le vocabulaire de l'éditrice prend une couleur stable** : « publié » en `plumage`, « modifié,
  non publié » en `gorge`, partout pareil. C'est ce qui rend l'état d'un objet lisible d'un coup
  d'œil après des mois sans usage (`UX-2`, `SC-015`).
- **Diff contenu dans une feuille** : les composants copiés continuent de lire `--primary`,
  `--background`… ; seules leurs valeurs changent. Un composant ajouté plus tard par la CLI
  fonctionne sans retouche.
- **Contraste hérité du canvas** : chaque paire texte/fond du thème clair y est donnée à 4,5:1, les
  filets de contrôle et l'anneau de focus à 3:1.
- **Une seule recette visuelle par écran** : un thème, une passe d'aspect `observé` — pas deux.

**Négatives — ce à quoi le code s'engage.**

- **Deux familles de noms coexistent** dans `admin.css`. La règle de lecture est unique : un nom
  shadcn n'a **jamais** de valeur propre, il pointe un nom Colibri. Une valeur littérale posée sur
  un alias réintroduit une seconde source de vérité.
- **Certains tokens Colibri n'ont pas d'équivalent shadcn** (`gorge`, `ambre`, `info`, `nuage`,
  leurs `-soft`, les états `--state-*`). Ils ne s'utilisent que par leur nom Colibri, et leur
  sémantique — `gorge` pour un seul état, `nuage` en aplat seulement — tient à la review, pas à un
  outil.
- **Rayons et espace changent de grain** : `--radius` shadcn (0.625rem) cède la place à
  `--radius-sm/md/lg` du canvas (4/6/10 px) ; les composants qui calculaient leurs rayons depuis
  `--radius` doivent recevoir la correspondance dans `@theme inline`, sinon leurs coins divergent.
- **Tant que l'ADR des polices n'est pas écrit, l'administration s'affiche en polices de repli** :
  les tailles et graisses sont justes, le caractère ne l'est pas encore. C'est un état transitoire
  assumé, pas un écart à corriger dans le change de mise en page.
- **Le thème sombre du canvas vieillit sans être porté.** Si l'éditrice en exprime le besoin, c'est
  un nouvel ADR qui le remplace sur ce point — pas un ajout au fil d'un ticket.
- **La copie du canvas ne se resynchronise pas** : si la source en ligne change une valeur,
  `admin.css` ne la suit pas d'elle-même. Rapatrier une nouvelle version et reporter l'écart est un
  geste explicite.
- **`docs/design-system.md` devient faux sur deux points** — le thème « neutral » et « ce canvas
  n'est pas encore adopté » : il se met à jour avec le change qui applique cette décision.

## Alternatives considérées

- **Deux thèmes, le sombre suivant la préférence du système** : écartée — double la recette
  visuelle de chaque écran, sans demande de l'éditrice, pour un outil qu'elle ouvre quelques fois
  par mois.
- **Deux thèmes avec une bascule dans l'interface** : écartée — un réglage de plus à concevoir, à
  mémoriser et à expliquer à une non-technicienne, pour un gain qu'elle n'a pas demandé.
- **Couleurs seules, rayons et espace du registre** : écartée — un aspect à mi-chemin entre la
  marque et le registre, et une seconde décision à prendre plus tard sur le même fichier.
- **Trancher les polices dans le même ADR** : écartée — mêle une décision de feuille de style et une
  décision de politique de sécurité ; chacune doit pouvoir être remplacée sans l'autre.
- **Garder les seuls noms shadcn en changeant leurs valeurs** : écartée — `gorge`, `ambre`, `info`
  n'y ont pas de nom, et chaque écran en inventerait un.
- **Renommer en Colibri et réécrire les classes des composants copiés** (`bg-primary` →
  `bg-plumage`) : écartée — chaque composant ajouté par la CLI devrait être retouché à la main, ce
  qui éloigne le dépôt du registre qu'ADR-0009 a choisi pour ne pas réécrire.
- **Porter le code du canvas** (composants JSX, classes `.cb-*`) : écartée — le produit est en
  Svelte sur shadcn-svelte (ADR-0009).

## Vérifiable ?

En partie. Que les valeurs de couleur de l'administration ne vivent que dans `src/admin/admin.css`
laisse une trace statique : une valeur littérale (`#…`, `rgb(…)`, `oklch(…)`) dans un autre fichier
de `src/admin/` se trouve par un grep. L'absence d'`@import` d'une origine tierce dans la feuille se
constate de même. Que chaque alias shadcn pointe un token Colibri se lit dans la feuille elle-même.
Le rendu — que l'écran *ressemble* au canvas, contraste compris — relève de la recette observée sur
l'artefact bâti, les tests `workerd` n'appliquant ni feuille ni politique de sécurité.
