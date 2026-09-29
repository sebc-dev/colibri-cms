# La feuille de style de TipTap est bloquée par la CSP de l'administration

Portée : hors cycle · correctif direct (texte riche, éditeur d'une page)
Ouvert le 2026-09-27 · branche `impl/editeur-emplacements-texte-08` · HEAD `07acb26`

## Objectif
Rendre à la zone d'édition du texte riche les règles de style dont ProseMirror a besoin, sans
toucher à la politique de sécurité : la correction se fait dans l'habillage, jamais dans la CSP
(security-review du change 005, ADR-0010).

## Contexte à charger
à lire      `src/admin/ilots-svelte-5/TexteRiche.svelte` — `new Editor({…})`, vers la l. 85 (options sans `injectCSS`)
à lire      `src/platform/entetes/middleware.ts` — l. 62-66, `style-src 'self'` et `style-src-attr 'unsafe-inline'`
à lire      `docs/adr/0010-csp-admin-styles-inline-style-src-attr.md` — ce que la CSP tolère, et pourquoi
à situer    `src/admin/admin.css` — la seule feuille de l'administration, où les règles `.ProseMirror` iraient

## Acquis
- Constaté pendant la vérification observée du ticket 08 (005) : la console du navigateur
  rapportait « Applying inline style violates … style-src 'self' », puis l'avertissement de
  ProseMirror sur `white-space: pre-wrap` absent.
- Cause établie au triage de la review du ticket 08, dans le code : TipTap injecte par défaut un
  `<style>` (`injectCSS: true`, `@tiptap/core` dist l. 6157, `createStyleTag` l. 3854) ; la CSP
  n'autorise que `style-src 'self'` et `style-src-attr`, donc le `<style>` est refusé. Les options
  de `new Editor` étaient identiques avant le ticket 08 : le défaut date de l'arrivée du texte
  riche (change 003).
- Effet attendu, non encore constaté à l'écran : espaces consécutifs ou en fin de ligne mal
  conservés dans la zone d'édition.
- Les tests `workerd` n'appliquent aucune CSP : aucun test vert ne dit rien de ce défaut.
- Décidé avec l'humain : fiche maintenant, correction directe dans sa propre PR juste après le
  ticket 08.

## Prochaine étape
Passer `injectCSS: false` à `new Editor`, reporter dans `admin.css` les règles `.ProseMirror` que
TipTap injectait (au moins `white-space: pre-wrap`, `word-wrap`), puis prouver sur l'artefact bâti
(`wrangler dev`) : console sans violation CSP, sans avertissement ProseMirror, deux espaces
consécutifs conservés à la saisie et à l'enregistrement.

## Issue
Corrigé le 2026-09-28 en `0a9ab6d` (branche `fix/feuille-tiptap-csp`) : `injectCSS: false` sur
`new Editor`, et les règles que TipTap injectait reportées dans `admin.css`, la seule couleur littérale
(`black` du curseur d'intervalle) remplacée par `var(--ink)`. Observé sur l'artefact bâti, avant →
après : 2 erreurs CSP et un `securitypolicyviolation` (`style-src-elem`) → aucun ; l'avertissement
ProseMirror → aucun ; `white-space` calculé `normal` → `break-spaces`. L'effet redouté n'était pas une
perte : faute de feuille, ProseMirror compensait deux espaces tapées par une espace insécable
(`un&nbsp; deux`) ; après, ce sont deux espaces ordinaires. L'enregistrement et le rechargement
conservaient déjà les deux espaces — rien n'a changé côté sérialisation. `npm test` : 224/224.

## Écarté
- Élargir `style-src` (nonce, `unsafe-inline`) : la security-review du change 005 exige que ce qui
  ne passe pas sous la CSP se corrige dans l'habillage, et ADR-0010 ne tolère que les attributs.
- Corriger dans le ticket 08 : hors de son périmètre (aucun geste ne change), la PR aurait mêlé
  habillage et correctif de comportement.
