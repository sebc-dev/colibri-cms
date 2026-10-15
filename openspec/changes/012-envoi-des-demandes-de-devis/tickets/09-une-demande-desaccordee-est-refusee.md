# 09 — Une demande qui ne s'accorde plus au formulaire publié est refusée

**Bloqué par :** 07
**Vérif :** tdd
**Fichiers :** `src/core/formulaires/demande.ts`, `src/pages/api/public/demandes.ts`, `src/render/formulaire/module.ts`, `tests/unit/formulaires/demande.test.ts`, `tests/integration/demande-desaccordee.test.ts`, `tests/parcours/formulaire-change.parcours.ts`

## Ce que ça livre

Le serveur vérifie chaque demande reçue contre le **formulaire publié** qu'elle désigne, jamais contre ce
que la demande annonce. Les règles sont les suivantes :
- le formulaire existe et est posé sur la page d'origine annoncée ;
- chaque valeur vise un champ déclaré ;
- chaque option existe dans son champ ;
- un champ à choix unique ne porte qu'une option ;
- un champ sans valeur de choix ne porte pas d'option.

Le serveur **recalcule le total** depuis les prix publiés, et le compare au total que le formulaire
affichait au moment de l'envoi.

Une demande qui ne s'accorde pas est **refusée sans e-mail**. C'est le cas d'un formulaire, d'une page,
d'un champ ou d'une option inconnus, ou d'un total différent. C'est aussi le cas d'un prix changé : le
visiteur a ouvert la page quand « Fraise » valait 10 €, l'éditrice a publié « Fraise » à 11 € et le site
a été reconstruit. Le visiteur lit alors « Ce formulaire vient d'être mis à jour. Rechargez la page pour
voir les prix à jour, puis refaites votre demande. ». Le message paraît au-dessus du bouton, le bouton
redevient actif, et toute sa saisie reste.

**Décisions à respecter (D6 de l'approche ; ADR-0018) :**
- **La vérification.** `verifierDemande` (`src/core/formulaires/demande.ts`, pure) vérifie la demande
  contre la **déclaration empaquetée** des formulaires et des pages, jamais contre D1. Entre une
  publication et la reconstruction, D1 est en avance sur le site servi.
- **Le refus.** Il rend `409 { "statut": "formulaire-change" }`. Aucun e-mail ne part, et aucune valeur
  saisie n'est renvoyée.
- **Les valeurs.** Elles se lisent par `Object.hasOwn` contre la liste des champs déclarés. Toute clé
  inconnue est refusée, y compris une clé comme `__proto__`.
- **Les cas limites refusés :**
  - une option envoyée pour un champ de texte ;
  - la même option deux fois dans un choix multiple ;
  - un choix unique avec deux options ;
  - un formulaire ou une page inconnus ;
  - une page qui ne pose pas le formulaire ;
  - un `totalAffiche` absent, négatif, décimal ou textuel.
- **Le total.** Il se recalcule par `totalDeLaSelection` (`src/core/formulaires/total.ts`), en centimes
  entiers.
- **Le message.** Son texte est déjà posé dans `src/render/formulaire/textes.ts` par le ticket 03. Le
  module l'affiche en texte seul.
- **Le scénario du prix changé.** Il se joue en envoyant un `totalAffiche` calculé sur un autre prix que
  celui de la déclaration empaquetée.

**Hors périmètre :** les règles de saisie — obligatoire, forme, longueur (ticket 08) ; les refus
d'origine, de format et de taille (ticket 10).

## Critères
- [ ] Quand le visiteur a ouvert la page quand « Fraise » valait 10 €, que l'éditrice a depuis publié « Fraise » à 11 €, que le site a été reconstruit, et que le visiteur envoie sa demande avec « Fraise », la demande est refusée, aucun e-mail n'est envoyé, et le formulaire l'invite à recharger la page, sa saisie gardée   (SC-09a)
- [ ] Quand une demande désigne dans « Parfum » une option que le formulaire publié ne porte pas, elle est refusée, et aucun e-mail n'est envoyé   (SC-09b)
- [ ] Quand une demande porte deux options dans « Parfum », champ à choix unique, elle est refusée, et aucun e-mail n'est envoyé   (SC-09c)
- [ ] Quand une demande porte une valeur pour un champ que le formulaire publié ne déclare pas, elle est refusée, et aucun e-mail n'est envoyé   (SC-09d)
- [ ] Quand une demande désigne le formulaire « Devis gâteau » et une page d'origine qui ne le pose pas, elle est refusée, et aucun e-mail n'est envoyé   (SC-09e)
- [ ] Quand une demande annonce un total de 1 € pour « Fraise » (10 €) et « 10 parts » (30 €), elle est refusée, et aucun e-mail n'est envoyé   (SC-09f)
