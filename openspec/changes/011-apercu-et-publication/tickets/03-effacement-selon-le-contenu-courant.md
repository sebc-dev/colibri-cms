# 03 — L'effacement d'une image suit le contenu courant de chaque emplacement

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/core/medias/references.ts`, `src/platform/brouillons/magasin.ts`, `src/platform/medias/magasin.ts`, `src/pages/admin/medias.astro`, `src/pages/admin/medias/[id].astro`, `src/pages/admin/medias/[id]/supprimer.ts`, `src/pages/admin/pages/[slug].astro`, `tests/unit/medias/references-courantes.test.ts`, `tests/integration/effacement-contenu-courant.test.ts`

## Ce que ça livre

Aujourd'hui, la bibliothèque ne compte que les brouillons pour savoir où une image est posée et si
elle peut être effacée : l'état publié n'existait pas. Désormais, un emplacement **pose** une image
quand son **contenu courant** la porte. Le contenu courant, c'est son brouillon s'il en porte un, sa
dernière version publiée sinon (ticket 01). Un emplacement jamais publié a pour version publiée son
contenu de départ.

Conséquences visibles pour l'éditrice :
- la fiche d'une image liste aussi les emplacements dont la version publiée la pose ;
- une image qu'un brouillon a remplacée ne compte plus pour cet emplacement ;
- une image n'est effaçable que si **aucun** emplacement ne la pose ainsi ;
- supprimer une image la retire aussi des emplacements dont la version publiée la pose : chaque
  retrait s'inscrit dans le brouillon de la page, l'état publié reste intact, et la page bascule à
  « brouillon ».

L'effacement définitif lui-même est exécuté par la publication (ticket 15).

**Décisions à respecter :**
- Une fonction pure de `core/` dérive, depuis les déclarations, l'état publié et les brouillons de
  chaque emplacement, l'ensemble des images posées par le contenu courant. L'ensemble « publié » ne
  compte que les emplacements **sans brouillon**. `imageEffacable` garde sa signature : ses tests
  existants restent inchangés.
- `REFERENCES_PUBLIEES_VIDE` disparaît de `src/platform/medias/magasin.ts`.
- La désignation d'un emplacement dans la fiche et dans la liste préalable à la suppression reste
  celle d'aujourd'hui : titre de la page, puis nom de l'emplacement, ou à défaut sa nature et son
  rang. Jamais son identifiant (FR-117).
- La suppression écrit un retrait dans le brouillon de chaque page dont la version publiée (ou le
  contenu de départ) pose l'image. Elle n'écrit jamais dans l'état publié (ADR-0020, SC-010).
- Les images de départ (`media-fixture-*`) deviennent posées par le contenu de départ de leurs
  emplacements : elles ne sont pas effaçables tant qu'un emplacement les pose.
- La table des images s'appelle `medias` (PR directe du renommage, fusionnée avant ce ticket).

**Hors périmètre :** l'effacement exécuté par la publication (ticket 15) ; l'annonce des images à
effacer dans le récapitulatif (ticket 11) ; les images de départ dans la grille (ticket 02).

## Critères
- [ ] Quand l'éditrice consulte la fiche d'une image que la dernière version publiée d'un emplacement pose, cet emplacement ne portant pas de brouillon, cet emplacement figure dans la liste des emplacements qui la posent   (SC-03a)
- [ ] Quand la dernière version publiée d'un emplacement pose une image et que son brouillon la remplace par une autre, cet emplacement ne figure pas dans la liste des emplacements qui posent la première image   (SC-03b)
- [ ] En `core/`, une image que le contenu courant d'au moins un emplacement pose n'est pas effaçable   (SC-03c)
- [ ] En `core/`, une image qu'aucun emplacement ne pose, ni par son brouillon, ni par sa dernière version publiée, est effaçable   (SC-03d)
- [ ] En `core/`, une image posée seulement par la dernière version publiée d'un emplacement dont le brouillon la remplace est effaçable   (SC-03e)
- [ ] En `core/`, une image posée seulement par la dernière version publiée d'un emplacement qui ne porte pas de brouillon n'est pas effaçable   (SC-03f)
- [ ] Par la couture HTTP, confirmer la suppression d'une image que seule la dernière version publiée d'un emplacement pose, la page ne portant pas de brouillon, inscrit le retrait de l'image dans le brouillon de cette page ; la page bascule à « brouillon », l'état publié reste intact, et l'image devient orpheline   (SC-03g)
