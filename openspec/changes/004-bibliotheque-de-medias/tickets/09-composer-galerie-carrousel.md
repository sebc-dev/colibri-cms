# 09 — Composer une galerie ou un carrousel

**Bloqué par :** 08
**Vérif :** test
**Fichiers :** `src/pages/admin/pages/[slug]/emplacements/[id].ts` (branche galerie/carrousel de l'embranchement par nature, étendu), `src/platform/brouillons/magasin.ts` (enregistrement de l'ensemble ordonné), `src/core/pages/brouillon.ts` (composition, livrée au ticket 03), `src/admin/ilots-svelte-5/` (composition et réordonnancement dans l'éditeur), `tests/integration/`

Motif du mode `test` : la composition s'enregistre dans le brouillon de la page dans la vraie base locale par la couture HTTP. Ce ticket et le ticket 08 partagent la même route d'écriture d'emplacement — ils ne sont donc pas parallélisables entre eux.

## Ce que ça livre
Depuis l'éditeur, l'éditrice compose un emplacement de galerie ou de carrousel à partir de plusieurs images de la réserve : elle en ajoute, les ordonne, en retire. Le brouillon de la page référence l'ensemble ordonné de ces images par leurs identités. Ajouter, réordonner ou retirer une image est une modification du contenu de l'emplacement — jamais un geste de structure sur la page. À chaque geste, l'état publié reste intact et la page bascule à « brouillon ».

## Critères
- [ ] Par la couture HTTP, poser plusieurs images de la réserve dans un emplacement de galerie ou de carrousel, dans un ordre choisi, fait référencer l'ensemble ordonné de ces images par leurs identités dans le brouillon ; l'état publié reste intact et la page bascule à « brouillon ».   (SC-09a)
- [ ] Par la couture HTTP, réordonner ou retirer une image de l'ensemble met à jour le brouillon sans que ce soit traité comme un geste de structure, et la page bascule à « brouillon ».   (SC-09b)
