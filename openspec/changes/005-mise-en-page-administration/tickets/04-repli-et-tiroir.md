# 04 — Le menu se replie sur ordinateur et devient un tiroir sur téléphone

**Bloqué par :** 03
**Vérif :** observé
**Fichiers :** `src/admin/cadre.ts`, `src/admin/GabaritCadre.astro`, `src/admin/MenuRubriques.astro`

## Ce que ça livre

Sur un écran large (768 px et plus), l'éditrice peut replier la barre latérale en un rail d'icônes
seules, puis la redéployer ; son choix est retenu sur l'appareil. Sur un écran étroit (moins de 768 px),
le menu disparaît au profit d'une barre du haut portant un bouton de menu et le logo : le bouton ouvre
un tiroir portant les cinq rubriques, qui se referme de lui-même au choix d'une rubrique, au toucher du
fond ou à la touche Échap. Quand l'appareil demande de réduire les animations, le tiroir et la barre
s'ouvrent et se replient sans mouvement.

**Décisions à respecter :**
- Point de rupture unique : `md` de Tailwind (768 px).
- `GabaritCadre.astro` ajoute la **barre du haut** (écran étroit seulement : bouton de menu, logo), le
  **bouton de repli** de la barre latérale (écran large), et le **tiroir** : un élément `<dialog>` natif
  portant une seconde instance de `MenuRubriques.astro`. Fond voilé par le token `--overlay`.
- Le comportement tient dans **un module externe** `src/admin/cadre.ts`, chargé par un `<script>` de
  module d'Astro (bundlé, jamais `is:inline` — invariant `I12`) :
  - repli : bascule un attribut `data-replie` sur la barre, persisté dans `localStorage` sous la clé
    **`admin.cadre.replie`** (valeurs `'1'`/`'0'`, celle de l'ancien cadre — la préférence déjà
    retenue sur les appareils survit). Stockage indisponible (navigation privée) : barre déployée,
    aucune erreur ;
  - tiroir : `showModal()` / `close()` — le `<dialog>` modal fournit le piège de focus, la fermeture par
    Échap et le retour du focus au bouton ; le script ajoute la fermeture au toucher du fond et au choix
    d'une rubrique.
  - Aucune requête, aucune manipulation de HTML (`innerHTML` exclu) : seulement des attributs et des
    états.
- Rail replié : icônes seules, rubrique active toujours marquée, libellé en infobulle au survol et au
  focus.
- Transitions sous `motion-safe:` ; la transition est coupée tant que le module n'a pas appliqué l'état
  (`data-pret`), pour qu'une barre repliée par préférence saute sans animation au chargement.
- Deux instances du menu dans le document : la barre est masquée sous `md` et le `<dialog>` fermé est
  inerte, de sorte qu'une seule est atteignable à la fois, au clavier comme au lecteur d'écran.
- Aucun script en ligne, aucune directive `client:*` (`I4`) ; politique de sécurité non touchée.

**Preuve attendue :** sur l'artefact bâti (`npm run build` puis `wrangler dev`), à 1280 px, 768 px,
767 px et 360 px : captures replié/déployé et tiroir fermé/ouvert ; rechargement après repli ;
parcours au clavier et au toucher ; émulation `prefers-reduced-motion`.

**Hors périmètre :** l'habillage des écrans ; porter la préférence de repli côté serveur (cookie).

## Critères
- [ ] Sur écran large, actionner le bouton de repli réduit la barre à un rail d'icônes seules, la rubrique active y reste marquée, et la zone de contenu s'élargit d'autant   (SC-04a)
- [ ] Redéployer la barre repliée fait reparaître les libellés à côté des icônes   (SC-04b)
- [ ] Après un rechargement, le dernier état replié ou déployé choisi est conservé, sans requête serveur pour le porter   (SC-04c)
- [ ] Sur écran étroit, le menu est fermé et le contenu occupe toute la largeur ; un bouton de menu, toujours visible en haut de l'écran, ouvre le tiroir portant les cinq rubriques   (SC-04d)
- [ ] Le tiroir ouvert se referme quand l'éditrice choisit une rubrique, touche en dehors ou appuie sur Échap ; le focus revient au bouton de menu quand la fermeture ne mène pas à un autre écran   (SC-04e)
- [ ] Quand l'appareil demande de réduire les animations, l'ouverture du tiroir et le repli de la barre se font sans mouvement   (SC-04f)
