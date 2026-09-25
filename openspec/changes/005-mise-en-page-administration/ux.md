# UX — Mise en page de l'administration

L'éditrice retrouve, sur chaque écran, le même cadre, les mêmes couleurs et les mêmes repères : ce qui
est une action est vert (`plumage`), ce qui n'est pas encore en ligne est rubis (`gorge`), un refus est
rouge (`danger`). Elle peut tout faire depuis son téléphone. Aucun geste n'est ajouté ni retiré :
seule la présentation change. Aucun terme de développeur ne paraît (FR-117).

## Canvas

> Projet **Colibri CMS Design System** sur claude.ai/design (`aa1b5b6c-df85-4124-84e4-d33cdb72e4a5`) —
> copie datée dans le dépôt : `.claude/skills/colibri-cms-design/` (`/colibri-cms-design`), kit
> d'interface sous `ui_kits/administration/` (`Shell.jsx`, `PagesList.jsx`, `PageEditor.jsx`,
> `Media.jsx`). Les écrans ci-dessous en reprennent les **dispositions** ; les specs vivantes font
> foi sur les libellés (« Médias », « Mes pages ») et sur le périmètre (ni tableau de bord, ni
> création de page, ni bandeau de publication).
>
> Pour une revue sans Claude : captures des écrans, large et à 360 px, jointes à chaque PR d'écran.

## Écrans & états

### Cadre de l'administration

Écran large (≥ 768 px) — barre latérale de 248 px sur surface claire, filet à droite ; contenu sur le
fond neutre chaud, marges de 48 px (32 px en haut).

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ [logo colibri]   │                                                       │
│                  │  Mes pages                          ← titre Fraunces │
│ ▣ Mes pages   ◀── rubrique courante : fond plumage-soft, texte plumage   │
│ ▢ Médias         │  …contenu de l'écran…                                 │
│ ▢ Réglages   ◀── rubriques sans écran : grisées, sans lien               │
│ ▢ Formulaires    │                                                       │
│ ▢ Demandes       │                                                       │
│                  │                                                       │
│            [«]   │ ← replier en rail d'icônes                            │
└──────────────────┴─────────────────────────────────────────────────────┘
```

Écran étroit (< 768 px) — barre du haut, tiroir fermé par défaut.

```
┌──────────────────────────────┐        ┌────────────────────┬─────────┐
│ [☰]  [logo]                  │        │ [logo]         [✕] │▒▒▒▒▒▒▒▒▒│
├──────────────────────────────┤  ☰ →   │ ▣ Mes pages        │▒ fond  ▒│
│ Mes pages                    │        │ ▢ Médias           │▒ voilé ▒│
│ …contenu, une colonne…       │        │ ▢ Réglages         │▒▒▒▒▒▒▒▒▒│
│                              │        │ ▢ Formulaires      │▒▒▒▒▒▒▒▒▒│
└──────────────────────────────┘        │ ▢ Demandes         │▒▒▒▒▒▒▒▒▒│
                                        └────────────────────┴─────────┘
```

- **Zones :** logo · menu des cinq rubriques · bouton de repli (large) ou bouton de menu (étroit) ·
  zone de contenu.
- **États :** *déployé* · *replié* (rail d'icônes, libellés en infobulle au survol et au focus) ·
  *tiroir fermé* · *tiroir ouvert* (fond voilé `overlay`, focus dans le tiroir, fermeture par ✕,
  Échap, toucher du fond ou choix d'une rubrique).

### Écran : Connexion

Hors du cadre : une carte centrée sur le fond neutre chaud, 400 px de large au plus.

```
            ┌────────────────────────────────────┐
            │            [logo colibri]           │
            │  Connexion                          │ ← Fraunces
            │                                     │
            │  1  Recevoir un code                │
            │     Adresse                         │
            │     [______________________]        │
            │     [ Recevoir un code ]  ← plumage │
            │                                     │
            │  2  Saisir le code                  │
            │     Le code reste bon 15 minutes.   │
            │     Code                            │
            │     [______________________]        │
            │     [ Se connecter ]                │
            │     ⚠ message de refus  ← danger    │
            └────────────────────────────────────┘
```

- **États :** *initial* · *code refusé* (message `danger` sous l'étape 2, avec le geste à reprendre) ·
  *plafond atteint* (seul un message d'attente, ton `ambre`, sans champ ni bouton).
- **Téléphone :** la carte prend toute la largeur moins 16 px de chaque côté ; les champs passent à
  16 px ; clavier e-mail pour l'adresse, suggestion du code reçu pour le code.

### Écran : Mes pages

```
│  Mes pages                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Accueil                                   ● Brouillon      │  │ ← gorge
│  │ /                                     ← adresse, mono      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Nos tartes                                                 │  │
│  │ /nos-tartes                                                │  │
│  └──────────────────────────────────────────────────────────┘  │
```

- **Zones :** titre · une carte portant une ligne par page (titre, adresse de la page, marque de
  brouillon s'il y a lieu) ; toute la ligne ouvre l'éditeur.
- **États :** *liste* · *vide* (le message existant, dans la carte, texte `ink-muted`).
- **Téléphone :** la marque de brouillon passe sous le titre ; chaque ligne fait au moins 44 px de haut.

### Écran : Éditeur d'une page

```
│  ‹ Mes pages                                                      │
│  Nos tartes   ● Brouillon                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Texte riche — Présentation                                 │   │ ← libellé : label 13 px
│  │ [ zone d'édition ………………………………………………… ]                   │   │
│  │                                      [ Enregistrer ]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Galerie — 3 images                                         │   │
│  │ [img][img][img]                     [ Composer ]          │   │
│  └──────────────────────────────────────────────────────────┘   │
```

- **Zones :** lien de retour · titre et marque de brouillon · une carte par emplacement, dans l'ordre
  posé, portant sa nature et son libellé, son contenu et ses gestes.
- **États :** *au repos* · *en saisie* · *enregistrement en cours* (bouton désactivé, libellé
  inchangé) · *enregistré* (la marque de brouillon apparaît si elle n'y était pas) · *refus* (message
  `danger` dans la carte concernée).
- **Téléphone :** cartes pleine largeur ; les boutons d'une carte passent sous son contenu, pleine
  largeur ; la sur-couche de choix d'image occupe l'écran moins 16 px de marge, grille de deux
  vignettes par rangée.

### Écran : Médias

```
│  Médias                                       [ ⤒ Téléverser ]    │ ← plumage
│  [ 🔍 Rechercher une image            ]                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                              │
│  │ img  │ │ img  │ │ img  │ │ img  │  vignettes : radius-sm        │
│  │tarte │ │vitr… │ │four  │ │logo ⚠│  ← orpheline : ambre + texte  │
│  └──────┘ └──────┘ └──────┘ └──────┘                              │
```

- **États :** ceux de 004, inchangés (vide, recherche vide, téléversement, refus) — le refus en
  `danger`, l'orpheline en `ambre` avec son libellé.
- **Téléphone :** le bouton de téléversement passe sous le titre, pleine largeur ; la grille passe à
  deux vignettes par rangée.

### Écran : Fiche d'une image

- **Zones :** retour « ‹ Médias » · prévisualisation · nom et description (champs à libellé visible) ·
  liste des emplacements où l'image est posée · suppression (bouton `danger` en contour).
- **Écran large :** prévisualisation à gauche, champs et emplacements dans une colonne de 320 px à
  droite (disposition des écrans d'édition du canvas).
- **Téléphone :** une colonne : prévisualisation, champs, emplacements, suppression.
- **États :** ceux de 004, inchangés ; la confirmation de suppression est une sur-couche qui dit ce qui
  va disparaître et où.

## Critères d'acceptation UX

- **UX1 — Même repère partout** : sur les six écrans, la rubrique courante, le titre en Fraunces et
  l'action principale en `plumage` se retrouvent au même endroit.
- **UX2 — Un brouillon se voit d'un coup d'œil** : depuis « Mes pages », l'éditrice désigne sans
  hésiter les pages qui portent un brouillon (test d'usage de SC-003).
- **UX3 — Tout au pouce** : sur un téléphone de 360 px, l'éditrice se connecte, ouvre une page,
  corrige un texte, pose une image et l'enregistre, sans zoomer ni défiler horizontalement.
- **UX4 — Le menu du téléphone ne piège pas** : le tiroir s'ouvre et se referme par le bouton, Échap,
  le fond ou le choix d'une rubrique ; le focus ne s'échappe pas du tiroir ouvert.
- **UX5 — Lisible sans effort** : contraste ≥ 4,5:1 pour chaque texte, focus visible sur chaque
  élément atteint au clavier.
- **UX6 — Aucun écran d'impasse** : après la connexion, l'éditrice arrive sur « Mes pages ».
