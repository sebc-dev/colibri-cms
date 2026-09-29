# Run 05 (lien vidéo) — bloqué en verify, débloqué, mergé ; bug CSP découvert au passage

Portée : 003-remplir-emplacements · ticket 05
Ouvert le 2026-09-08 · Clos le 2026-09-08 · ticket 05 mergé par PR #70, correctifs #71/#72

## Ce qui s'est passé
- Le run a implémenté le ticket 05 (mode `test`, ceinture propre, SC-05a/b/c/e prouvés) puis s'est
  arrêté en `blocked-verify` sur SC-05d — cas limite du workflow : le `verifier` posait lui-même le
  `humanCheckRequired`, court-circuitant la self-correction §14 (c). Débloqué par un post-traitement
  fidèle à la règle existante (un critère à `humanCheckRequired` sur ceinture propre compte comme
  satisfait), reprise depuis le cache.
- SC-05d (rendu d'erreur de l'îlot à l'écran) est resté un constat humain — fait et validé avant merge.

## Le vrai bug, découvert en testant SC-05d au navigateur
- La CSP d'administration n'avait **aucun `connect-src`** → il retombait sur `default-src 'none'`, si
  bien que le navigateur bloquait **tout `fetch`** des îlots. Aucune correction — ni bouton d'action
  (ticket 04, déjà mergé) ni lien vidéo — ne pouvait s'enregistrer, alors que les tests serveur
  (workerd, où la CSP n'est pas appliquée) restaient verts. Corrigé par **PR #72**
  (`connect-src 'self'` + test de régression), mergée avant #70.
- Les messages d'erreur des îlots, qui confondaient accès expiré / écran périmé / réseau derrière un
  seul message, ont été distingués : **PR #71**.

## Écarté / à retenir
- Ne jamais conclure « ça marche » sur des tests serveur verts quand le comportement dépend du
  navigateur (CSP, cookies, chargement de scripts) : le harnais `SELF.fetch` n'applique pas la CSP.
- Les correctifs §14 (c) et `connect-src` sont durables : le premier côté marketplace du workflow, le
  second gardé par le test de `politique-de-securite`.
