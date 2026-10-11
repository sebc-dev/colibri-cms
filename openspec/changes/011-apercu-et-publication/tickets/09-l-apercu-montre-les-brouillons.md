# 09 — L'aperçu montre les brouillons de la page et des réglages

**Bloqué par :** 06, 08
**Vérif :** test
**Fichiers :** `src/pages/admin/apercu/[...slug].astro`, `src/core/rendu/page.ts`, `tests/integration/apercu-avec-brouillons.test.ts`

## Ce que ça livre

L'aperçu d'une page montre désormais l'état qui sera en ligne **avec tous ses brouillons concernés** :
- chaque emplacement avec son brouillon s'il en porte un, sa dernière version publiée sinon ;
- le pied de page avec les coordonnées et les réseaux sociaux courants, leur brouillon s'ils en
  portent un.

Une image téléversée et posée en brouillon, même jamais publiée, paraît à sa place avec sa
description courante.

Demander l'aperçu ne change rien : le brouillon reste tel quel avec sa marque, et le site public est
inchangé.

Dans l'aperçu, un lien vers une autre page du site — entrée du menu, bouton d'action, lien d'un texte
riche — ouvre l'aperçu de cette page : l'éditrice parcourt son site avec ses brouillons sans le quitter
par erreur (arbitrage du 2026-10-11, exigence « Même rendu que la page publique » du delta `apercu`).

**Décisions à respecter :**
- Composition par `src/core/rendu/page.ts` : déclaration, recouverte par l'état publié, recouverte par
  le brouillon. Cela vaut pour les emplacements de la page, et pour les coordonnées et les réseaux du
  pied de page. On réutilise les fonctions de superposition du ticket 01, sans seconde règle.
- Une image en brouillon, présente en base et jamais publiée, entre dans le rendu avec pour `source`
  l'adresse gardée existante `/admin/medias/<id>/octets`, et sa description courante lue en base. Elle
  passe par le **même** composant d'image que la page publique (ticket 06, I3, ADR-0024). Seule cette
  adresse diffère du publié.
- La route ne fait que lire : aucune écriture en base, aucun brouillon touché.
- Sous la politique de l'administration : l'image gardée est servie par la même origine, aucune
  directive à rouvrir.
- Liens de l'aperçu (design D3) : une fonction pure de `src/core/rendu/page.ts` réécrit, sur la page
  composée, les liens dont le chemin correspond à une page déclarée vers `/admin/apercu<adresse>`,
  requête et ancre gardées (`/tarifs` → `/admin/apercu/tarifs`, `/` → `/admin/apercu/`). L'adresse
  réécrite est construite depuis la déclaration, jamais recopiée du contenu ; liens externes, de
  contact, en `//hôte` et adresses non déclarées restent intacts. Seule la route de l'aperçu l'appelle :
  la page publique n'en sait rien. Le test SC-08b compare déjà l'aperçu à la page publique après avoir
  ramené ces liens à leur adresse publique (ajusté avant le lancement du ticket).

**Hors périmètre :** les brouillons de formulaires dans l'aperçu (story « Composer et envoyer une
demande de devis », qui dessinera le formulaire dans le rendu partagé) ; le récapitulatif (ticket 10).

## Critères
- [ ] Quand la page « Accueil » porte un brouillon de son texte de présentation et que l'éditrice en demande l'aperçu, l'aperçu présente le texte du brouillon, alors que la page publique « Accueil » présente toujours le texte publié   (SC-09a)
- [ ] Quand la page « Contact » porte un brouillon et que le réglage des coordonnées porte un nouveau numéro de téléphone en brouillon, l'aperçu de « Contact » présente ensemble le contenu du brouillon de la page et le nouveau numéro dans le pied de page   (SC-09b)
- [ ] Quand l'éditrice a téléversé une image, l'a décrite et l'a posée dans un emplacement de « Tarifs », sans publier, l'aperçu de « Tarifs » présente l'image à sa place, avec sa description comme texte de remplacement   (SC-09c)
- [ ] Quand l'éditrice demande l'aperçu d'une page qui porte un brouillon, le brouillon est inchangé, la page porte toujours sa marque de brouillon, et le site public est inchangé   (SC-09d)
- [ ] Dans l'aperçu de « Accueil », l'entrée « Tarifs » du menu, le bouton d'action qui mène à « Contact » et un lien d'un texte riche vers « Contact » mènent à l'aperçu de ces pages ; ouverts, ils présentent la page sous le bandeau, avec ses brouillons   (SC-09e)
- [ ] Dans l'aperçu, un lien vers un réseau social, une vidéo, un numéro de téléphone, une adresse e-mail, ou une adresse du site qui n'est pas une page déclarée, est identique à celui de la page publique   (SC-09f)
