# 04 — Une adresse longue se lit en entier sur un téléphone

**Bloqué par :** 03
**Vérif :** observé
**Fichiers :** `src/pages/admin/adresse-e-mail.astro`, `docs/cahier-de-test.md`

## Ce que ça livre

L'écran « Adresse e-mail » de l'administration (change 017, ADR-0033) affiche des adresses dans sa
carte : l'adresse autorisée en place (état de repos), la nouvelle adresse à l'étape de la confirmation
(« Le message va arriver … »), à l'étape du code (« Un code vient de partir vers … », « votre adresse
reste … ») et à la réussite (« Votre adresse est maintenant … », ancienne adresse prévenue), ainsi que
dans les messages ambres d'attente et de refus.

**Le défaut corrigé** (constaté en recette du 017) : à 360 px de large, une adresse longue est rognée
par le bord de la carte.

**Ce que ce ticket livre** (design D4) : les paragraphes de la carte qui portent une adresse
reçoivent la classe utilitaire de césure `break-words` ; si elle seule ne coupe pas avant l'arobase,
`overflow-wrap: anywhere` (classe utilitaire Tailwind `wrap-anywhere` ou équivalent). Aucune couleur,
aucune feuille de style nouvelle (`I14`), aucun script de navigateur (`I4`).

**Vérification — mode `observé`.** Une coupure de ligne ne s'observe que dans un vrai navigateur ;
`workerd` n'en a pas. Preuve : capture via `playwright-cli` à 360 px, sur le serveur de recette ou en
local, d'une adresse de quarante signes ou plus à l'étape de la confirmation, à l'étape du code, à la
réussite et à l'état de repos — aucun signe rogné, aucun défilement horizontal de la page
(`document.documentElement.scrollWidth <= 360`). Ce qui n'est pas constatable par l'agent passe en
`humanCheckRequired` : ajouter les cas au cahier de recette partagé (`docs/cahier-de-test.md`,
section du change 018, paragraphe du ticket 04).

**Hors périmètre** : tout autre écran de l'administration, la mise en page de la carte hors césure.

## Critères

- [ ] Quand l'écran affiche, à 360 px de large, une adresse de quarante signes ou plus, à l'étape de la confirmation, à l'étape du code ou à la réussite : l'adresse revient à la ligne dans sa carte, aucun de ses signes n'est rogné, et la page ne défile pas horizontalement   (SC-04a)
