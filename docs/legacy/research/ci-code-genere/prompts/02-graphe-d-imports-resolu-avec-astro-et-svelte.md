<goal>
Établis la doctrine actuelle (2026) pour appliquer en CI des règles de frontière architecturales
directionnelles sur le graphe d'imports résolu (alias, ré-exports, barils) d'un projet TypeScript
composé de fichiers .ts, .astro et .svelte.
</goal>

<context>
Qui : développeur solo sur un CMS TypeScript strict (Astro 7, Svelte 5).
Pourquoi : choisir l'outil qui posera en CI bloquante un sens unique de dépendance entre zones,
avec un faible taux de faux positifs.
Contraintes : dependency-cruiser 18.2.0 ne référence l'extension .astro dans aucune table de
transpilation, et sa plage `typescript: ">=2.0.0 <7.0.0"` exclut TypeScript 7.0.2, la version
courante.
Déjà connu : eslint-plugin-astro 3.1.0 et eslint-plugin-svelte 3.23.0 parsent déjà ces imports ;
eslint-plugin-boundaries 7.2.0 et Sheriff existent comme alternatives déclaratives de frontière.
</context>

<content>
1. Doctrine pour l'enforcement de frontières architecturales en TypeScript : ESLint (boundaries, import-x) versus outils de graphe dédiés
2. Capacité de chaque approche à résoudre le graphe (alias, ré-exports, barils) plutôt qu'un parsing textuel
3. Retours sur la combinaison d'un plugin ESLint spécifique au framework avec un contrôle de frontière générique
4. Maturité comparée d'eslint-plugin-boundaries et de Sheriff, et compatibilité avec TypeScript 7.x
</content>

<sources>
Prioriser : https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md ,
https://github.com/javierbrea/eslint-plugin-boundaries , https://sheriff.softarc.io/ ,
https://ota-meshi.github.io/eslint-plugin-astro/
Traiter avec prudence : comparatifs marketing d'outils de qualité de code.
Signaler les désaccords entre sources réputées plutôt que de trancher silencieusement.
</sources>

<output>
Tableau comparatif (résolution du graphe, directionnalité, maturité, faux positifs attendus) +
recommandation argumentée, avec niveau de confiance par critère.
</output>

<method>
Commence large sur l'architectural conformance, puis resserre sur les outils opérant sur un
graphe résolu. Développe des hypothèses concurrentes si les sources divergent sur le meilleur
outil. Extrais verbatim les passages qui portent les capacités avant de synthétiser.
</method>

<rules>
Contexte : fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Sourçage :
toute affirmation renvoie à une source effectivement consultée. Incertitude : si les données
manquent ou divergent, dis-le et marque [INCERTAIN]. Qualification : distingue fait établi,
interprétation d'auteur, source primaire de reprise secondaire.
</rules>
