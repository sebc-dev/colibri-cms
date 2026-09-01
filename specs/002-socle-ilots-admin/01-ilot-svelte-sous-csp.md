# 01 — Un îlot Svelte 5 se rend dans l'administration sous la CSP stricte

**Bloqué par :** rien — démarrable
**Vérif :** observé — intégration de build (`npm run typecheck` + `npm run build`) et rendu de l'îlot sous ses en-têtes réels (console sans violation) : aucun test unitaire ne constate qu'une chaîne de build monte un îlot sous une CSP donnée.
**Fichiers :** `package.json`, `astro.config.ts`, `tsconfig.json`, `src/admin/` (point d'entrée externe + îlot minimal), `src/pages/admin/`

## Ce que ça livre
Svelte 5 entre dans la chaîne de build, câblé pour la seule administration, et l'administration se
monte **comme une application par un point d'entrée externe** (candidat `ilots-svelte-5`), pas par
hydratation en ligne dans une page. Un îlot Svelte minimal se rend dans un écran d'administration et
répond à une interaction, sans déclencher aucune violation de la CSP stricte **laissée inchangée**
(`script-src 'self'`, `style-src 'self'`) — ce qui prouve que le montage externe évite le script en
ligne que la CSP interdit.

## Critères
- [ ] `npm run typecheck` puis `npm run build` passent, Svelte 5 intégré à Astro et câblé pour la
      seule administration.
- [ ] Un écran d'administration monte un îlot Svelte minimal par un point d'entrée externe (script
      bundlé chargé via `<script src>`), sans directive `client:*` d'hydratation en ligne.
- [ ] Cet écran est servi avec la CSP stricte inchangée (`script-src 'self'`, `style-src 'self'`) —
      `src/platform/entetes/middleware.ts` n'est pas modifié par ce ticket.
- [ ] Au rendu de cet écran, la console ne rapporte aucune violation CSP et l'îlot répond à une
      interaction (preuve capturée).
