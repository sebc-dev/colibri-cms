# 04 — Corriger un emplacement de bouton d'action

**Bloqué par :** 03
**Vérif :** test
**Fichiers :** `src/core/` (appliquer une correction, dériver l'état « porte un brouillon », refuser une correction de structure), `src/platform/` (persistance D1 du brouillon), `migrations/` (table des brouillons), `src/pages/admin/` (route d'écriture), `src/admin/` (édition du bouton, pastille dans la liste), `tests/integration/`

Motif du mode `test` : deux coutures — la couture haute `core/`, pure, et la couture d'intégration HTTP
contre la vraie base locale. La seconde, couplée à D1 et à la migration, ne s'exprime qu'une fois la
route et la table posées. Le critère SC-04f se vérifie sur le HTML servi par les routes de la liste et
de l'éditeur (présence de la pastille de brouillon), pas à l'écran.

## Ce que ça livre
L'éditrice règle le libellé et la destination d'un emplacement de bouton d'action, puis enregistre :
la correction va au brouillon de la page en D1, la page bascule à l'état « brouillon » (la pastille
apparaît sur sa ligne dans la liste et dans le fil de l'éditeur), et l'état publié reste intact — rien
ne part sur le site public. C'est la première écriture depuis une session ouverte : elle s'appuie sur
le cookie de session `SameSite=Strict` déjà posé par 001 et n'introduit **aucun jeton anti-forgerie
dédié** (ADR-0011). Ce ticket porte la colonne vertébrale d'écriture que réutilisent les tickets 05 et
06 : la logique `core/` qui applique une correction à un brouillon, en dérive l'état « porte un
brouillon » et refuse toute correction qui toucherait la structure (nombre, nature ou ordre des
emplacements), et la table D1 qui porte les brouillons.

## Critères
- [ ] En `core/`, appliquer une correction de bouton (libellé, destination) à un brouillon produit le brouillon corrigé, sans toucher l'état publié.   (SC-04a)
- [ ] En `core/`, l'état « porte un brouillon » d'une page se dérive : vrai dès qu'une correction existe, faux sinon.   (SC-04b)
- [ ] En `core/`, une correction qui viserait la structure (ajouter, retirer, déplacer ou renommer un emplacement, ou viser un emplacement non déclaré) est refusée (FR-024/025).   (SC-04c)
- [ ] La table D1 des brouillons est créée par une migration versionnée (`wrangler d1 migrations`, candidat `acces-aux-donnees-api-d1-native-et-migrations-wrangler`), et lie le brouillon à l'emplacement déclaré par son identité stable.   (SC-04d)
- [ ] Par la couture HTTP contre la vraie base locale, enregistrer une correction de bouton persiste le brouillon et laisse l'état publié intact.   (SC-04e)
- [ ] Après enregistrement, la page bascule à « brouillon » dans l'`Écran : Liste des pages` (pastille présente) et l'`Écran : Éditeur de page` (pastille au fil de retour), sans quitter l'écran.   (SC-04f)
- [ ] Une écriture forgée depuis une autre origine n'aboutit pas : la session `SameSite=Strict` n'est pas attachée à une requête cross-site (ADR-0011), et aucun jeton dédié n'est introduit.   (SC-04g)
