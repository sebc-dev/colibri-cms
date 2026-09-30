<!-- GABARIT DE TICKET — n'est PAS un artefact de schéma OpenSpec (aucune entrée dans schema.yaml).
     Les tickets sont produits par /scd-spec-dev:tickets (skill change-decomposer) dans
     changes/<x>/tickets/NN-slug.md, un fichier par ticket, numérotés dans l'ordre des dépendances.
     Ce gabarit est copié dans le projet cible par /scd-spec-dev:setup et sert de forme de référence.

     Renseignement des champs :
     - **Vérif :**       décidé par le skill strategie-verif, un ticket à la fois (tdd | test | observé | aucun).
                          Décidé UNE fois, jamais re-décidé en aval.
     - **Fichiers :**    tiré de design.md (périmètre ; sert à paralléliser via worktrees).
     - **Bloqué par :**  ordre des deltas & dépendances, tranchés à la décomposition. « — » si aucun.
     - ## Ce que ça livre  = proposal.md + design.md (le comportement bout en bout).
     - ## Critères        = les scénarios WHEN/THEN des deltas, chacun avec son id stable (SC-<NN><lettre>).
                            En mode tdd/test : un critère = un test nommé, un pour un ; le coverage-reviewer
                            bloque tout critère orphelin. -->

# NN — <titre : le comportement livré>

**Bloqué par :** <NN | —>
**Vérif :** <tdd | test | observé | aucun>
**Fichiers :** `<chemin/fichier>`

## Ce que ça livre
<!-- Une phrase : le comportement observable bout en bout que ce ticket ajoute. -->

## Critères
<!-- Un critère par scénario WHEN/THEN du delta, avec son id stable entre parenthèses. -->
- [ ] <critère observable>   (SC-NNa)
- [ ] <critère observable>   (SC-NNb)
