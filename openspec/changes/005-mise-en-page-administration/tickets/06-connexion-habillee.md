# 06 — L'écran de connexion habillé

**Bloqué par :** 02
**Vérif :** test
**Fichiers :** `src/pages/admin/connexion.astro`, `tests/integration/connexion-habillee.test.ts`

## Ce que ça livre

L'écran de connexion, aujourd'hui deux formulaires en balisage nu, devient une carte centrée sur le
fond neutre chaud (400 px de large au plus ; sur téléphone, toute la largeur moins 16 px de chaque
côté), portant le logo, le titre « Connexion » et ses deux étapes visuellement distinguées : 1 —
recevoir un code (champ d'adresse, bouton « Recevoir un code »), 2 — saisir le code (durée de validité,
champ de code, bouton de connexion). Chaque champ porte un libellé visible ; chaque refus s'affiche en
rouge (`danger`) sous l'étape concernée ; quand le plafond de demandes est atteint, seul un message
d'attente en ton d'avertissement (`ambre`) s'affiche dans la carte, sans champ ni bouton. Sur
téléphone, le champ d'adresse appelle le clavier d'e-mail, et le champ de code propose le code reçu en
suggestion quand l'appareil sait le faire.

**Décisions à respecter :**
- **Aucun texte ni aucun comportement de la connexion ne change** : mêmes libellés, mêmes messages,
  mêmes formulaires `method="post"`, mêmes noms de champs. Les tests existants de la connexion (porte
  close, refus de code, plafond, ouverture de session) doivent rester verts tels quels.
- L'écran reste **hors du cadre** : il utilise `Gabarit.astro` et `Logo.astro`, pas `GabaritCadre`.
- Attributs : adresse `type="email"` `autocomplete="email"` ; code `inputmode="text"`
  `autocomplete="one-time-code"` (le code n'est pas seulement numérique : la saisie se normalise).
- Composants de base disponibles : `card`, `input`, `label`, `alert`, `button` (sous
  `src/admin/composants/ui/`), rendus par le serveur sans directive `client:*` (`I4`).
- Action principale en `plumage` ; titre en famille d'affichage (Fraunces) ; tokens seulement (`I14`).
- Sur écran étroit, chaque élément actionnable offre une cible d'au moins 44 × 44 px (`min-h-11
  min-w-11`) ; au-delà, les hauteurs du canvas s'appliquent.
- Politique de sécurité non touchée ; l'écran de connexion reste servi avec ou sans session.

**Preuve attendue (partie aspect) :** sur l'artefact bâti (`npm run build` puis `wrangler dev`),
captures à 1280 px et à 360 px des états initial, code refusé et plafond atteint ; mesure du contraste
par l'outil d'accessibilité du navigateur ; `document.documentElement.scrollWidth` à 360 px. Le clavier
du téléphone se constate sur un vrai téléphone.

**Hors périmètre :** toute règle nouvelle de connexion ; le moyen de reprise.

## Critères
- [ ] L'écran de connexion présente le logo, le titre « Connexion », l'étape d'adresse et l'étape de code, chacune avec son libellé visible et son bouton   (SC-06a)
- [ ] Quand le plafond de demandes est atteint, le message d'attente s'affiche dans la carte, en ton d'avertissement, sans champ ni bouton   (SC-06b)
- [ ] Le champ d'adresse appelle un clavier d'adresse e-mail (`type="email"`, `autocomplete="email"`) et le champ de code propose le code reçu en suggestion (`autocomplete="one-time-code"`)   (SC-06c)
- [ ] Un code refusé s'affiche en `danger`, sous l'étape de code, avec son texte   (SC-06d)
- [ ] L'écran de connexion porte le thème Colibri : fond neutre chaud, titre en Fraunces, texte en Instrument Sans, action principale en `plumage`   (SC-06e)
- [ ] Affiché à 360 px de large, l'écran de connexion ne défile pas horizontalement et aucun contenu n'est coupé   (SC-06f)
- [ ] Sur écran étroit, chaque élément actionnable de la connexion offre une zone de toucher d'au moins 44 × 44 px   (SC-06g)
- [ ] Chaque texte de la connexion, messages de refus et d'attente compris, atteint un contraste d'au moins 4,5:1 sur son fond   (SC-06h)
