<goal>
Établis la doctrine pour ajouter, ou non, un contrôle CI d'accessibilité et un budget de
performance Lighthouse sur un portail dont aucune exigence produit actuelle ne fixe de seuil
d'accessibilité, en t'appuyant sur des outils gratuits et activement maintenus.
</goal>

<context>
Qui : développeur solo tenant le portail CI d'un CMS Astro/Svelte destiné à des sites publics.
Pourquoi : décider s'il faut un contrôle pour une propriété non exigée par le PRD, à quel niveau
(bloquant ou informatif), et comment vérifier en CI le seuil de performance déjà exigé
(Lighthouse ≥ 95 mobile) sans serveur monté dans le portail actuel.
Contraintes : aucun composant à palier gratuit exigeant une carte bancaire n'est utilisable.
Déjà connu : @lhci/cli est figé depuis 14 mois sans être archivé, sa cible par défaut rend le
rapport public par URL. axe-core et pa11y-ci sont activement maintenus. Aucun critère du PRD ne
porte de seuil d'accessibilité.
</context>

<content>
1. Couverture réelle et mesurée des règles WCAG par axe-core et par l'audit Lighthouse
2. Doctrine pour poser un contrôle d'accessibilité sans exigence légale ou produit explicite
3. Patterns pour exécuter Lighthouse/axe en CI sans serveur permanent
4. Cadre réglementaire applicable (RGAA, WCAG, European Accessibility Act) pour un CMS servant des sites publics en France ou en UE
</content>

<sources>
Prioriser : https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md ,
https://developer.chrome.com/docs/lighthouse/accessibility/scoring , https://github.com/pa11y/pa11y-ci
Traiter avec prudence : outils d'accessibilité hébergés commerciaux (Deque, Siteimprove).
Signaler les désaccords entre sources réputées plutôt que de trancher silencieusement.
</sources>

<output>
Recommandation argumentée (bloquant / informatif / aucun contrôle) + tableau comparatif des
outils + méthode d'exécution en CI sans serveur permanent, avec niveau de confiance.
</output>

<method>
Commence large sur la doctrine d'accessibilité en CI, puis resserre sur les outils gratuits et
maintenus applicables sans serveur permanent. Développe des hypothèses concurrentes sur le niveau
de sévérité approprié. Extrais verbatim les passages qui portent les taux de couverture mesurés.
</method>

<rules>
Fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Toute affirmation
renvoie à une source consultée. Marque [INCERTAIN] si les données manquent ou divergent. Distingue
fait établi, interprétation d'auteur, source primaire et reprise secondaire.
</rules>
