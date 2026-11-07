# 02 — Revenir respecte la publication

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/platform/publication/magasin.ts`, `src/platform/brouillons/magasin.ts`, `src/pages/admin/pages/[slug]/revenir.ts`, `src/admin/ilots-svelte-5/RevenirVersionPubliee.svelte`, `src/admin/textes.ts`, `tests/integration/revenir-et-publication.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Le retour d'une page à sa version publiée (ticket 01) s'accorde avec la publication.

**Refus pendant une publication.** Tant qu'une publication confirmée n'a pas fini de déposer — en train de
déposer, ou interrompue et en attente de reprise —, le geste est refusé, et rien ne change. Une
publication confirmée emporte déjà le contenu des brouillons : sans ce refus, la correction abandonnée
partirait quand même en ligne. Dès que la publication a fini de déposer, le geste aboutit de nouveau.

Le refus est **atomique** (design D2). La suppression et la lecture du verrou partent dans un seul
`db.batch` :
1. la suppression porte la condition `and not exists (select 1 from publication where id = 1 and
   instantane is not null)` ;
2. la seconde instruction lit `instantane is not null`.
Si la seconde est vraie, la route répond `409` avec la raison `publication-en-cours`. Le fragment de
condition est exporté par `src/platform/publication/magasin.ts`, pour être réutilisé par les réglages et
les formulaires (tickets 03 et 04). La table `publication` est assurée avant (`assurerTablePublication`).
Le verrou garde un `instantane` non nul de la confirmation jusqu'à la fin du dépôt, y compris pendant une
interruption (ADR-0023) ; le refus couvre donc les deux cas.

Dans la confirmation, un refus garde la fenêtre ouverte, retire le bouton de confirmation et dit : « Une
publication est en cours. Vous pourrez revenir à la version publiée quand elle sera terminée. » Texte dans
`src/admin/textes.ts`, sans terme de développeur (FR-117).

**L'objet revenu sort de la publication.** Le geste ne dépose rien et ne change pas l'état publié. La page
revenue ne paraît plus au récapitulatif de l'écran Publier, et la publication suivante ne réécrit aucun de
ses fichiers. La page publique reste donc identique à ce qu'elle était avant l'erreur (SC-009). Seule la
dernière version publiée est offerte : aucune version plus ancienne (FR-094).

**Les images suivent le contenu courant.** Le geste n'efface aucune image de la bibliothèque. Une image
posée seulement par le brouillon abandonné n'est plus posée nulle part ; le récapitulatif la présente
alors parmi les images qui seront effacées. Une image « supprimée » depuis l'écran Médias, dont le retrait
n'était écrit qu'au brouillon de la page, redevient posée par la version publiée et cesse d'être à effacer.

Ces effets viennent de la superposition et du calcul du récapitulatif déjà en place : le ticket les
établit par des tests, sans changer le calcul.

**Doubles.** La forge en mémoire (`tests/unit/publication/forge-en-memoire.ts`) pour la publication
suivante. Le verrou se sème directement dans la table `publication`.

**Recette.** Ajouter au cahier de recette SC-009 joué sur le serveur de recette : page publique identique
avant l'erreur et après le retour puis une publication.

## Critères
- [ ] pendant qu'une publication confirmée dépose ses images, le retour d'une page confirmé depuis un autre onglet est refusé avec un message disant qu'une publication est en cours, et le brouillon de la page est intact   (SC-02a)
- [ ] après qu'une publication a fini de déposer, l'éditrice corrige une page et revient à la version publiée : le geste aboutit, et la page présente la version qui vient d'être publiée   (SC-02b)
- [ ] « Accueil » et « Tarifs » portent un brouillon ; après le retour de « Tarifs », l'écran Publier présente « Accueil » parmi les pages, et ne présente pas « Tarifs »   (SC-02c)
- [ ] l'éditrice écrase par erreur le texte de « Tarifs », revient à la version publiée, corrige « Accueil » puis publie : le dépôt réécrit les fichiers d'« Accueil » et aucun fichier de « Tarifs », et la page publique « Tarifs » est identique à ce qu'elle était avant l'erreur   (SC-02d)
- [ ] le retour d'une page ne dépose rien dans le dépôt du client, et le contenu publié de cette page est inchangé   (SC-02e)
- [ ] « Tarifs » publiée deux fois avec deux textes différents, puis corrigée et revenue : l'éditeur présente le texte de la seconde publication, et aucun écran n'offre le texte de la première   (SC-02f)
- [ ] une image téléversée, posée dans l'emplacement d'image de « Tarifs », puis « Tarifs » revenue : l'image est toujours dans la bibliothèque, et le récapitulatif la présente parmi les images qui seront définitivement effacées   (SC-02g)
- [ ] une image que seule la version publiée de « Tarifs » pose, supprimée depuis l'écran Médias, puis « Tarifs » revenue : l'image est de nouveau posée par « Tarifs », et le récapitulatif ne la présente plus parmi les images qui seront effacées   (SC-02h)
