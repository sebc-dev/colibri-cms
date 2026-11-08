## Canvas

Pas d'artboard propre. Les écrans reprennent des pièces déjà dessinées : la carte de connexion
(`Card`, change 005, ticket 06), les messages (`Alert`), les boutons primaire et secondaire, et la mise
en page de l'administration. Les écrans sont décrits ci-dessous.

## Vocabulaire

L'éditrice lit **« code de secours »**, jamais « moyen de reprise » ni aucun terme technique (FR-117).
« Déconnecter » se dit « les autres appareils devront se reconnecter ».

## Écrans & états

### 1. Écran de connexion — le lien

Sous les deux formulaires existants, séparé par un filet, un lien discret :

```
 Je n'ai plus accès à ma boîte e-mail
```

Il mène à l'écran de saisie du code de secours. Le reste de l'écran ne change pas.

### 2. Saisie du code de secours (`/admin/reprise`)

Même carte que la connexion, titre « Entrer avec le code de secours ».

```
 Saisissez le code de secours que vous avez noté sur papier.
 Code de secours  [______________________________]
 ( Entrer )
 ← Revenir à la connexion par e-mail
```

États :
- **Vide** : le formulaire seul.
- **Refusé** : message rouge au-dessus du champ : « Ce code n'a pas permis d'entrer. Vérifiez chaque
  signe, puis réessayez. » Le même texte vaut pour toute cause.
- **Seuil atteint** / **panne du comptage** : le message ambre de l'écran de connexion, mots pour mots
  (`TEXTE_ANNONCE_SEUIL`, `TEXTE_ANNONCE_PANNE`).
- **Réussi** : l'écran 4, sans redirection.

Le champ accepte espaces et tirets. Il est assez large pour 26 signes groupés, et passe à la ligne
sans déborder à 360 px.

### 3. Écran « Code de secours » (`/admin/code-de-secours`)

Atteint par un lien sous les cartes de l'écran Réglages : « Code de secours ». La rubrique active du
menu reste « Réglages ».

```
 Code de secours
 Le code de secours vous permet d'entrer si vous n'avez plus accès à votre boîte e-mail.
 Il ne sert qu'une fois ; un nouveau vous est alors donné.

 [état]
```

États :
- **Aucun code en place** : message ambre « Aucun code de secours n'est en place. » et bouton primaire
  « Créer le code de secours ».
- **Un code en place** : « Un code de secours est en place depuis le 8 novembre 2026. » et bouton
  secondaire « Remplacer le code de secours ». La valeur n'est jamais affichée.
- **Confirmation du remplacement** (`?remplacer`) : carte « Remplacer le code de secours ? » —
  « L'ancien code ne permettra plus d'entrer. Les autres appareils connectés devront se reconnecter. »
  — boutons « Remplacer » (primaire) et « Annuler » (lien de retour). Rien ne change avant
  « Remplacer ».

### 4. Le nouveau code (réponse à la création, au remplacement ou à l'emploi)

Une seule présentation, commune aux trois cas :

```
 Votre nouveau code de secours
 ┌──────────────────────────────────┐
 │  K7QM 2XRT 9DPA 4HZB W3NC 8FEV JY │
 └──────────────────────────────────┘
 Recopiez-le ou imprimez cette page, et rangez le papier en lieu sûr.
 Ce code ne s'affichera plus. L'ancien ne permet plus d'entrer.
 ( Imprimer )   ( Continuer )
```

- Le code est en police à chasse fixe, en groupes de quatre signes (le dernier de deux), en gros
  caractères, sélectionnable.
- « Continuer » mène à l'accueil après un emploi, à l'écran « Code de secours » après une création ou
  un remplacement.
- À l'impression, seule la carte du code sort : ni menu, ni bouton.
- Après un emploi, une ligne s'ajoute : « Les autres appareils connectés devront se reconnecter. »

## Critères d'acceptation UX

- Depuis l'écran de connexion, l'écran de saisie du code de secours s'atteint en un seul geste.
- Le code affiché se recopie sans ambiguïté : aucun signe confusable, groupes séparés, chasse fixe.
- À 360 px de large, aucun écran de ce change ne fait défiler la page horizontalement, et le code
  tient sans être coupé au milieu d'un groupe.
- L'impression de l'écran 4 tient sur une page et ne porte que le code et sa consigne.
- Aucun texte de ces écrans ne contient de terme de développeur (FR-117).
