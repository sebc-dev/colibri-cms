# 01 — Après la connexion, l'éditrice arrive sur « Mes pages »

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/pages/admin/index.astro`, `tests/integration/accueil-mene-a-mes-pages.test.ts`

## Ce que ça livre

Aujourd'hui, l'accueil de l'administration (`/admin/`) affiche « Vous êtes connectée. » et rien
d'autre : juste après s'être connectée, l'éditrice tombe sur un écran sans aucune suite. Ce ticket
supprime cette impasse. L'accueil, toujours derrière la garde de session, **renvoie** vers l'écran
« Mes pages » (`/admin/mes-pages`). La connexion continue de renvoyer vers l'accueil : le parcours
passe par deux renvois successifs, sans écran intermédiaire.

**Décisions à respecter :**
- `index.astro` garde son import du garde de session (`verifierSession`, invariant `I6`, ADR-0007)
  **avant** de renvoyer ; sans session valide, le renvoi vers la connexion reste inchangé.
- Le renvoi est un `Astro.redirect('/admin/mes-pages')` (302) vers une **chaîne littérale** — jamais
  une cible lue dans la requête (pas de renvoi ouvert).
- La source de `index.astro` reste sans lien, formulaire, bouton ni terme de développeur : le test
  statique existant de `tests/static/gabarits-admin.test.ts` doit rester vert tel quel.
- Réécrire le commentaire d'en-tête de `index.astro` pour dire ce que fait désormais l'accueil.

**Préalable :** les deux tests de `tests/integration/code-ouvre-la-session.test.ts` qui attendaient
l'accueil affiché (« le cookie rendu donne ensuite accès à l'accueil » et « l'accueil affiché ne porte
aucun formulaire, bouton ni lien ») ont été retirés par une PR directe, avant ce ticket. Ce ticket
**n'ajoute** que des tests ; il ne retire ni n'affaiblit aucun test existant.

**Tenu inchangé, par les tests existants :** le reste de la porte et de l'ouverture de session (accueil
sans session renvoyé vers la connexion, connexion servie avec ou sans cookie, chemin inconnu refusé,
code à usage unique, quinze minutes, saisie normalisée, cookie `__Host-` verrouillé et opaque, durée de
validité affichée). Ce ticket ne doit rien y changer.

**Hors périmètre :** tout habillage de l'écran « Mes pages » ; tout contenu propre à l'accueil.

## Critères
- [ ] L'accueil `/admin/` demandé avec une session valide répond par un renvoi vers `/admin/mes-pages`, sans rendre aucun contenu propre à l'accueil   (SC-01a)
- [ ] Juste après l'ouverture de session par le code recopié, suivre les renvois depuis la connexion mène à l'écran « Mes pages » (réponse 200), sans traverser aucun écran sans suite   (SC-01b)
