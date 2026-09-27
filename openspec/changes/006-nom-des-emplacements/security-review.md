## Surface

Une seule entrée nouvelle : le champ `nom` d'un emplacement, lu dans `content/pages/*/page.json` au
build (contenu versionné du dépôt, écrit par l'intégrateur), puis rendu dans deux écrans de
l'administration — l'éditeur d'une page et la fiche d'une image (avec la liste préalable à la
suppression). Aucune route, aucun endpoint, aucune écriture, aucune permission nouvelle ; la politique de
sécurité (`src/platform/entetes/middleware.ts`) n'est pas touchée.

## Menaces

- **XSS same-origin dans l'administration** — le nom est rendu sur la même origine que le cookie de
  session. Un nom contenant du balisage (`<img onerror=…>`, `</script>`) serait exécuté s'il était
  injecté comme HTML. La source est le dépôt (confiance élevée), mais une déclaration reste une entrée :
  la même discipline que pour tout texte affiché s'applique.
- **Fuite d'un terme technique** (FR-117, pas une menace de sécurité mais une exigence) — fabriquer un
  nom depuis l'identifiant exposerait `video-presentation`, `bouton-devis` à l'éditrice.

## Mitigations

- Rendu par l'**interpolation échappée** d'Astro et de Svelte seulement ; ni `set:html`, ni `{@html}`,
  ni `innerHTML` sur le chemin du nom (I5). Un scénario de spec l'exige : caractères `<`, `>`, `&` et
  guillemets affichés comme du texte.
- Le nom transporté vers un îlot (attribut `data-*` ou JSON du point de montage de la fiche) passe par
  l'échappement d'attribut d'Astro, comme les autres données déjà montées ainsi.
- La CSP stricte (`script-src 'self'`, I12) reste la seconde barrière.
- Aucune valeur par défaut tirée de l'identifiant : un emplacement sans nom se présente par sa nature.

## Données

Aucune donnée personnelle ni sensible : le nom est un libellé d'interface choisi par l'intégrateur.
Rien n'est écrit en D1.
