## Canvas

Pas d'artboard propre. Le geste reprend deux pièces déjà dessinées : le bouton secondaire de
l'administration et la confirmation de suppression d'un média (`Dialog`, change 005, ticket 11). Les écrans
sont décrits ci-dessous.

## Écrans & états

### Le geste, sur trois écrans

- **Éditeur de page** : dans le fil de retour, à côté de la marque de brouillon.
- **Écran Réglages** : dans l'en-tête de chaque carte, à côté de sa marque.
- **Écran d'un formulaire** : dans l'en-tête, à côté de sa marque.

```
 ← Mes pages / Tarifs   [Brouillon]   ( Revenir à la version publiée )
```

États :
- **Sans brouillon** : le bouton est absent.
- **Brouillon enregistré à l'instant** : le bouton paraît avec la marque, sans changement d'écran.

### La confirmation

```
┌──────────────────────────────────────────────┐
│ Revenir à la version publiée ?           [×] │
├──────────────────────────────────────────────┤
│ Les modifications de « Tarifs » seront       │
│ perdues. La page reprend sa version publiée. │
│                                              │
│ [ Garder mes modifications ]                 │
│ [ Revenir à la version publiée ]  (danger)   │
└──────────────────────────────────────────────┘
```

Le corps nomme la nature de l'objet : « la page », « les coordonnées », « les réseaux sociaux », « la
mention d'information », « le formulaire ». Pour un objet jamais publié, la phrase devient « reprend son
contenu de départ ».

États :
- **Ouverte** : le focus va sur « Garder mes modifications », le choix sans perte.
- **Envoi** : les deux boutons sont désactivés, le bouton de confirmation dit « Retour en cours… ».
- **Succès** : l'écran se recharge et présente la version publiée, sans marque ni bouton.
- **Refus, publication en cours** : la confirmation reste ouverte et dit « Une publication est en cours.
  Vous pourrez revenir à la version publiée quand elle sera terminée. » Le bouton de confirmation est
  retiré.
- **Échec réseau** : la confirmation reste ouverte, avec le message réseau existant, et le bouton de
  confirmation reste actif pour réessayer.

## Critères d'acceptation UX

- Le bouton de confirmation porte la couleur de danger ; le bouton qui garde les modifications est le
  premier et reçoit le focus.
- Échap et la croix ferment la confirmation sans rien changer.
- Sur un écran de 360 px de large, la confirmation tient sur une colonne, ses boutons font 44 px de haut
  au moins, et le geste se joue au pouce.
- Aucun terme de développeur dans le bouton, la confirmation ou ses messages (FR-117).
