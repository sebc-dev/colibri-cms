## Surface

- **Aucune surface nouvelle dans le produit** : ni route, ni en-tête, ni dépendance d'exécution, ni
  fichier sous `src/` (critère C9 du `test-plan.md`).
- **Une surface d'outillage** : la passe de parcours sème une session dans une base **locale**
  (`.wrangler/parcours`, ignorée par git), et pose le cookie correspondant dans un navigateur de test.
  Un serveur `wrangler dev` écoute un port local le temps de la passe.
- **Une dépendance de développement** : `@playwright/test` et le Chromium qu'il télécharge, en local
  comme en CI.

## Menaces

1. **Porte dérobée dans le produit.** La tentation naturelle pour « entrer sans e-mail » est une route
   ou un drapeau de test (`/admin/connexion-test`, une variable `MODE_TEST`). Déployée par erreur,
   elle ouvrirait l'administration à quiconque la connaît, en contournant l'adresse autorisée. C'est la
   menace principale de ce change.
2. **Garde affaibli pour faire passer le parcours.** Assouplir `verifierSession`, l'attribut `Secure`
   ou le préfixe `__Host-` du cookie (**I13**) parce qu'ils gênent sur `http://localhost`.
3. **Politique de sécurité assouplie pour faire passer le parcours.** Ajouter une source à
   `POLITIQUE_DE_SECURITE` parce que le parcours la réclame (outillage de Playwright, par exemple).
4. **Jeton de session qui fuit.** Un jeton fixe, commité, ou un état de base locale versionné.
5. **Chaîne d'approvisionnement.** Une version fraîchement publiée et compromise de `@playwright/test`,
   ou un navigateur téléchargé depuis une source non attendue.

## Mitigations

1. **Aucune route, aucun drapeau, aucune branche de test dans `src/`** (design D3) : l'entrée passe
   uniquement par une ligne écrite dans la base **locale** de la passe, hors de portée de toute
   instance déployée. Le security-reviewer bloque toute modification de `src/` dans ce change (C9).
   **I6** (garde de session sur toute route d'administration) n'a pas de contrôle automatique dédié :
   il tient par la review et par `tests/integration/porte-close.test.ts` (porte close éprouvée par
   requête réelle), que ce change ne touche pas — C3 en ajoute le pendant côté navigateur.
2. **Le garde n'est pas touché**, et C3 prouve que la porte reste close sans session semée. Si Chromium
   refusait le cookie `Secure` sur `localhost`, le repli est de servir `wrangler dev` en HTTPS local,
   **jamais** de retirer `Secure` ou `__Host-`.
3. **La politique n'est pas touchée** : le garde C6 se joue contre la politique telle qu'elle est servie.
   Les scripts d'initialisation de Playwright passent par le protocole de débogage du navigateur, hors
   de portée de la politique de la page : ils n'exigent aucune source supplémentaire. Toute
   modification de `src/platform/entetes/` dans ce change est bloquante.
4. **Jeton tiré au hasard à chaque passe** (`crypto.randomUUID()`), écrit dans une base locale effacée
   au début de la passe suivante ; `.wrangler/` est déjà ignoré par git. Aucun jeton ni aucune base
   n'est commité.
5. **Gel d'approvisionnement de sept jours** (`.npmrc`) appliqué à `@playwright/test` ; installation
   par `npm ci` depuis le lockfile ; Chromium téléchargé par `npx playwright install`, c'est-à-dire
   depuis la source que la version épinglée désigne. Pas de navigateur système, pas de binaire tiers.

## Données

Aucune donnée personnelle. La base locale des parcours ne contient que les migrations, la session
semée et la correction du libellé de démonstration ; l'adresse autorisée n'y est pas inscrite, et
aucun e-mail n'est envoyé (aucun parcours de connexion par code dans ce change).
