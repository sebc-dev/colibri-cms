# 04 — La réserve : téléverser une image, la persister, en resservir les octets

**Bloqué par :** 01
**Vérif :** test
**Fichiers :** `migrations/0005_medias_brouillon.sql` (nouveau — table des médias en brouillon), `src/platform/medias/magasin.ts` (nouveau — persistance et lecture en D1), `src/pages/admin/medias/televerser.ts` (route de téléversement, gardée), `src/pages/admin/medias/[id]/octets.ts` (route de service des octets, gardée), `tests/integration/`

Motif du mode `test` : le comportement livré tient à la persistance dans la vraie base locale et au service des octets par la couture HTTP — un couplage d'entrées/sorties dont l'oracle se vérifie après coup contre la base réelle (workerd/Miniflare), non par une fonction pure. La reconnaissance du format est, elle, déjà éprouvée en amont (ticket 01).

## Ce que ça livre
La réserve d'images existe : une image admise, téléversée depuis l'administration, est rangée dans le magasin des brouillons avec son identité, son nom d'origine, ses dimensions et son type déduit — l'état publié n'est jamais touché. Ses octets se resservent sur la même adresse que l'administration, mais seulement à une session ouverte : une demande sans session n'obtient rien. Le type renvoyé est toujours celui déduit de la liste des trois formats, jamais celui annoncé au téléversement, et la réponse porte la protection qui empêche le navigateur de réinterpréter un fichier — protection posée en un seul endroit pour toute l'administration, jamais par cette route elle-même. C'est ce qui rend une vignette affichable sans ouvrir la porte à un fichier qui mentirait sur sa nature.

## Critères
- [ ] Par la couture HTTP, une image admise téléversée est persistée au magasin brouillon avec son identité, son nom d'origine, ses dimensions et son type déduit ; l'état publié reste intact.   (SC-04a)
- [ ] Par la couture HTTP, une session ouverte obtient les octets d'un média avec le type déduit de la liste des trois formats et la protection contre la réinterprétation du contenu.   (SC-04b)
- [ ] Par la couture HTTP, une demande sans session valide n'obtient aucun octet.   (SC-04c)
- [ ] Le type servi est toujours celui déduit de la liste, jamais celui annoncé au téléversement.   (SC-04d)
