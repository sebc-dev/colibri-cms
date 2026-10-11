# 08 — Voir l'aperçu d'une page depuis son éditeur, réservé à la session

**Bloqué par :** 01, 04
**Vérif :** test
**Fichiers :** `src/pages/admin/apercu/[...slug].astro`, `src/admin/BandeauApercu.astro`, `src/admin/textes.ts`, `src/pages/admin/pages/[slug].astro`, `src/core/rendu/page.ts`, `tests/integration/apercu-d-une-page.test.ts`, `tests/static/apercu-statique.test.ts`

## Ce que ça livre

L'éditeur d'une page offre « **Voir l'aperçu** ». L'aperçu montre la page telle qu'elle sera en
ligne, dessinée par **exactement le même gabarit et le même rendu** que la page publique : pour un
même contenu, les mêmes éléments, dans le même ordre, avec les mêmes textes, liens et images.

Un **bandeau**, au-dessus de la page et hors d'elle, dit que ce n'est pas encore en ligne et offre de
revenir à l'édition de cette page. L'éditrice ne confond jamais l'aperçu avec son site.

L'aperçu est réservé à la session ouverte :
- sans session, il renvoie à l'écran de connexion sans rien montrer ;
- une page non déclarée donne « introuvable » ;
- il est servi sous la politique stricte de l'administration ;
- aucun intermédiaire ne le conserve.

Dans ce ticket, l'aperçu présente le contenu courant **hors brouillons** : la dernière version
publiée de la page et des réglages (ticket 01). Les brouillons y entrent au ticket 09.

**Décisions à respecter :**
- Route `src/pages/admin/apercu/[...slug].astro`. L'aperçu d'une page est à l'adresse de sa page
  publique, préfixée par `/admin/apercu`.
  - `verifierSession` en tête (I6, ADR-0007) : renvoi vers `/admin/connexion` sans corps.
  - Page non déclarée : statut 404 et « introuvable ».
  - `Cache-Control: no-store` posé par la route. I11 ne régit que les quatre en-têtes de sécurité, que
    le middleware pose déjà (ADR-0008).
- Composition par `src/core/rendu/page.ts` : la déclaration recouverte par l'état publié (fonctions du
  ticket 01). Rendu par le **même** `src/site/page.astro` que la route publique : cela **lève la
  dérogation temporaire à I3** déclarée au ticket 04 (ADR-0024).
- Bandeau `src/admin/BandeauApercu.astro`, **hors** du gabarit, pleine largeur, lisible sur téléphone
  (le texte passe à la ligne, aucun défilement horizontal) :
  - « Aperçu — cette page n'est pas encore en ligne. » ;
  - un lien « Revenir à la page » vers l'éditeur de cette page.

  Les textes vont dans `src/admin/textes.ts`, sans aucun terme de développeur (FR-117).
- Sous la politique de l'administration (I12, I15) : la feuille externe du gabarit, aucun attribut
  `style`, aucune directive `client:*` (I4).
- Les liens de la page d'aperçu mènent à leur destination réelle sur le site public, comme une fois en
  ligne.
- L'éditeur d'une page porte un bouton secondaire « Voir l'aperçu » en tête, à côté du titre. Il ouvre
  l'aperçu dans le même onglet.
- **Test d'égalité avec la page publique** : comparer l'arbre du contenu (titre, navigation,
  emplacements, pied de page) de l'aperçu à celui de la page bâtie dans `dist/client`, bandeau exclu.

**Hors périmètre :** les brouillons de la page et des réglages dans l'aperçu, les images en brouillon
(ticket 09) ; le récapitulatif qui mène à l'aperçu (ticket 10) ; les formulaires dans l'aperçu (story
« Composer et envoyer une demande de devis »).

## Critères
- [ ] Quand l'éditrice demande l'aperçu d'une page qui ne porte aucun brouillon, alors qu'aucun réglage n'en porte, l'aperçu présente la dernière version publiée de la page   (SC-08a)
- [ ] Pour une page qui ne porte aucun brouillon, aucun réglage n'en portant, le contenu de l'aperçu — titre, navigation, emplacements, pied de page — est le même que celui de la page publique, élément par élément et dans le même ordre, hors le bandeau de l'aperçu   (SC-08b)
- [ ] L'aperçu d'une page déclarée demandé sans session ouverte renvoie à l'écran de connexion, et rien du contenu de la page ni de son brouillon n'est montré   (SC-08c)
- [ ] En session, l'aperçu demandé pour un identifiant qu'aucune page déclarée ne porte répond « introuvable », sans rien montrer d'autre   (SC-08d)
- [ ] En session, l'aperçu d'une page est servi sous la politique de sécurité stricte de l'administration, et sa réponse interdit sa conservation par un intermédiaire   (SC-08e)
- [ ] Quand l'éditrice consulte l'aperçu d'une page, un bandeau, hors de la page, dit que ce qu'elle voit n'est pas encore en ligne   (SC-08f)
- [ ] Quand l'éditrice actionne le retour à l'édition depuis l'aperçu d'une page, l'éditeur de cette page s'ouvre   (SC-08g)
- [ ] Aucun terme de développeur ne paraît dans le bandeau de l'aperçu (FR-117)   (SC-08h)
- [ ] Quand l'éditrice actionne « Voir l'aperçu » depuis l'éditeur d'une page, l'aperçu de cette page s'ouvre, présentant son contenu courant   (SC-08i)
