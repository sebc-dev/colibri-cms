# 08 — L'éditrice corrige la mention d'information avec l'éditeur de texte riche

**Bloqué par :** 01, 06
**Vérif :** test
**Fichiers :** `src/core/reglages/mention.ts`, `src/platform/reglages/magasin.ts`, `src/pages/admin/reglages/mention.ts`, `src/admin/ilots-svelte-5/monter.ts`, `src/pages/admin/reglages.astro`, `tests/unit/reglages/mention.test.ts`, `tests/integration/corriger-mention.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

La carte Mention d'information permet à l'éditrice de corriger le texte présenté aux visiteurs avec
chaque formulaire, avec **le même éditeur de texte riche** que les emplacements des pages : gras,
italique, lien, liste et titre se posent sans écrire de balise. Une phrase d'aide le dit : « Ce texte
accompagne chaque formulaire de votre site. ». Enregistrer la mention écrit son brouillon en Markdown
restreint et ne marque **qu'elle** : Coordonnées et Réseaux sociaux ne portent pas de brouillon pour
autant, et le contenu déclaré (`content/reglages/`) reste inchangé (FR-044). Une mention vide, ou faite
seulement d'espaces, est refusée — chaque formulaire la présente au visiteur (FR-056) — et le champ dit
« La mention ne peut pas rester vide. ».

**Décisions à respecter :**
- En `core/` (`src/core/reglages/mention.ts`) : la correction de la mention **réutilise**
  `serialiserMarkdownRestreint` et `lienDeTexteRicheAutorise` de `src/core/pages/texte-riche.ts`
  (import `core/` → `core/`, permis par `I1`) — les règles de liens restent **un seul lieu de vérité** :
  seules les marques retenues survivent ; seuls `https`, `mailto`, `tel` et les chemins relatifs sont
  admis dans un lien. Mention vide après retrait des espaces → refus (code de raison).
- Route `POST /admin/reglages/mention` sur le patron des routes des tickets 05 et 07 (`verifierSession`
  → `401`, lecture bornée par `src/platform/reglages/corps.ts`, `400 { ok: false, refus: [...] }`,
  `200 { ok: true }`). Elle reçoit le document de l'éditeur (`{ document }`, comme la route des
  emplacements) ; le brouillon `mention` porte le Markdown restreint et remplace sa ligne entière.
- L'écran monte l'îlot **existant** `TexteRiche` (devenu indépendant de la page au ticket 01) avec
  l'adresse `/admin/reglages/mention`, le Markdown courant (brouillon, sinon départ) passé en donnée —
  jamais injecté en HTML (`I5`) — et, après un succès, la marque de brouillon dans la zone de la carte
  Mention (mécanisme du ticket 06). Aucune copie de l'éditeur.
- La barre de mise en forme au navigateur est **ajoutée au cahier de recette** (§ du ticket).

**Hors périmètre :** l'affichage de la mention dans les formulaires et sur le site public ; l'aperçu et
la publication ; le réglage des formulaires de devis.

## Critères
- [ ] Par la couture HTTP, enregistrer une mention portant du gras et un lien `https` écrit ce texte en Markdown restreint au brouillon de la mention, et la mention porte un brouillon   (SC-08a)
- [ ] En `core/`, une mention portant un lien `javascript:` ou `http:` voit ce lien rejeté selon les mêmes règles que le texte riche des pages   (SC-08b)
- [ ] Par la couture HTTP, enregistrer une mention vide ou faite seulement d'espaces n'enregistre rien, et le champ dit que la mention ne peut pas rester vide   (SC-08c)
- [ ] À l'`Écran : Réglages`, actionner la barre de mise en forme de la mention pose gras, italique, lien, liste et titre sans que l'éditrice écrive de balise   (SC-08d)
- [ ] Par la couture HTTP, enregistrer une correction de la mention lui fait porter un brouillon, les réglages Coordonnées et Réseaux sociaux n'en portent pas, et le répertoire de contenu des réglages est inchangé   (SC-08e)
