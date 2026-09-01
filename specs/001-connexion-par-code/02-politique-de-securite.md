# 02 — La politique de sécurité sur les trois formes de réponse

**Bloqué par :** 01
**Vérif :** test
**Fichiers :** `src/platform/entetes/middleware.ts`, `astro.config.ts`, tests

## Ce que ça livre

Les trois formes de réponse que l'administration sait rendre — l'écran servi, le renvoi vers l'écran
de connexion, le chemin inconnu — portent la même politique de sécurité stricte. Un seul porteur les
pose toutes : un middleware logé dans une zone existante, inscrit depuis la configuration Astro
(ADR-0008). C'est, avec l'échappement, l'une des deux seules parades au script injecté dans un écran
d'administration, et cette porte n'a aucun repli : une forme de réponse laissée à découvert rouvrirait
la parade en silence.

Le ticket 01 (la porte close) est un bloqueur réel et pas seulement un ordre : sans le renvoi qu'il
livre, la deuxième des trois formes n'existe pas et rien ne la mesure.

## Critères

- [x] l'écran de connexion servi porte la politique de sécurité, le refus de reniflage de type, une politique de référent et le refus d'être mis en cadre
- [x] le renvoi rendu par le garde porte exactement les mêmes champs d'en-tête, aux mêmes valeurs
- [x] un chemin inconnu sous `/admin/` porte exactement les mêmes champs d'en-tête, aux mêmes valeurs
- [x] la politique ne porte ni `unsafe-inline`, ni `unsafe-eval`, ni aucune source tierce — le ticket dit explicitement s'il ouvre dès maintenant celle qu'ADR-0004 réserve à Turnstile, dont le mécanisme est hors du périmètre de cette feature
- [x] `astro.config.ts` inscrit le middleware par le hook `addMiddleware`, son entrée donnée sous la forme `new URL(…, import.meta.url)` — une chaîne relative y est résolue comme un module nu et échoue (ADR-0008)
- [x] aucun gabarit servi sous `/admin/` ne porte de bloc `<style>` : la politique est la même en développement et en production, et le serveur de développement rend ces blocs en ligne
