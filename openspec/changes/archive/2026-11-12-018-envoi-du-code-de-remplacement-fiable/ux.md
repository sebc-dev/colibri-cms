# UX — Remplacement de l'adresse autorisée, envoi du code

## Canvas

Pas d'artboard propre. L'écran « Adresse e-mail » du change 017 est repris tel quel
(`openspec/changes/017-remplacement-adresse-autorisee/ux.md`) ; ce change y ajoute deux messages et
corrige deux états.

## Écrans & états

### Étape 1 — confirmer chez Cloudflare : deux états nouveaux

- **Clic enregistré depuis moins d'une minute** (message ambre, à la place du « clic pas encore
  enregistré ») :

  ```
  Votre clic est bien enregistré. Il faut encore un instant avant que le code
  puisse partir. Patientez une minute, puis appuyez de nouveau sur
  « J'ai cliqué sur le bouton ».
  ```

- **Le code n'a pas pu partir** (message ambre) :

  ```
  Le code n'a pas pu partir vers nouvelle@exemple.fr. Patientez une minute,
  puis appuyez de nouveau sur « J'ai cliqué sur le bouton ».
  ```

Dans les deux cas, la ligne « Tant que ce n'est pas terminé, votre adresse reste … » reste affichée.

### Étape 2 — le code du produit : deux états corrigés

- **Nouveau code demandé trop tôt** : même message que « Clic enregistré depuis moins d'une
  minute », le bouton nommé étant « Recevoir un nouveau code ». Rien n'est annulé : le code
  précédent reste bon, et le champ Code reste affiché.
- **Nouveau code non parti** : la demande a déjà annulé le code précédent (un nouveau code annule le
  précédent), aucun code n'est donc recopiable. L'écran revient à l'étape 1, sans champ Code, avec
  le message « Le code n'a pas pu partir vers … » ci-dessus, qui nomme « J'ai cliqué sur le
  bouton » (design D2).
- **Plafond atteint alors qu'un code est en circulation** : « Trop de messages sont partis en peu de
  temps. Réessayez dans une heure. », et le champ Code reste affiché avec « Valider ».

### Toutes les étapes — adresse longue

Une adresse qui ne tient pas sur une ligne à 360 px revient à la ligne dans la carte. Aucun signe
n'est caché, à l'étape 1, à l'étape 2, à la réussite et dans l'état de repos.

## Critères d'acceptation UX

- UX1 — Aucun des textes nouveaux ne contient un terme de la liste des termes de développeur (FR-117).
- UX2 — L'écran n'affiche « Un code vient de partir vers … » que si l'envoi a été accepté.
- UX3 — Chaque message d'attente ou de refus nomme le bouton à presser ensuite, par son libellé exact.
- UX4 — À 360 px, une adresse de quarante signes se lit en entier à chaque étape, sans défilement
  horizontal de la page.
- UX5 — En recette, le parcours « cliquer chez Cloudflare, revenir aussitôt, presser le bouton,
  patienter, represser » aboutit à la réception du code sans dépasser deux messages comptés au
  plafond (l'inscription et le code).
