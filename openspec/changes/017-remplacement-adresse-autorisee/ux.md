## Canvas

Pas d'artboard propre. L'écran reprend des pièces déjà dessinées : la carte de l'administration
(`Card`), les champs (`Input`/`Label`), les messages (`Alert`), les boutons primaire et secondaire, et
le patron d'étapes de l'écran « Code de secours » (change 016). Les états sont décrits ci-dessous.

## Vocabulaire

L'éditrice lit **« adresse e-mail »** ou **« votre adresse »**, jamais « adresse autorisée »,
« destination », « vérification de domaine » ni aucun terme technique (FR-117). Cloudflare se nomme
**une fois**, comme « notre hébergeur, Cloudflare », pour qu'elle reconnaisse l'expéditeur du message
en anglais : c'est un nom propre qu'elle verra dans sa boîte, pas un terme de développeur. Le libellé
du bouton anglais est cité tel quel, entre guillemets : « Verify email address ».

## Écrans & états

### 1. Réglages — le lien

Sous le lien « Code de secours », un second lien : **« Adresse e-mail »**.

### 2. Adresse e-mail — en repos

```
 Adresse e-mail
 Vos codes de connexion et vos demandes de devis arrivent à :
   marie@exemple.fr
 Nouvelle adresse  [______________________________]
 ( Changer d'adresse )
```

### 3. Étape 1 — confirmer chez Cloudflare

Après « Changer d'adresse » :

```
 Un message va arriver à nouvelle@exemple.fr.
 Il vient de notre hébergeur, Cloudflare, et il est écrit en anglais.
 Ouvrez-le et cliquez sur le bouton « Verify email address ».
 Revenez ensuite ici.
 ( J'ai cliqué sur le bouton )        Revenir aux réglages
 Tant que ce n'est pas terminé, votre adresse reste marie@exemple.fr.
```

États :
- **Pas encore confirmé** (bouton pressé trop tôt) : message ambre, « Le clic n'a pas encore été
  enregistré. Vérifiez vos courriers indésirables, cliquez sur le bouton du message, puis
  réessayez. »
- **Adresse déjà confirmée auparavant** : l'étape 1 s'affiche quand même ; le premier clic sur
  « J'ai cliqué sur le bouton » fait partir le code et mène à l'étape 2.

« Revenir aux réglages » n'annule rien : le remplacement en cours reste sans effet jusqu'à la
réussite, et l'écran le montre au retour. Seule une nouvelle proposition annule le précédent.

### 4. Étape 2 — le code du produit

```
 Un code vient de partir vers nouvelle@exemple.fr.
 Recopiez-le ici. Il reste bon quinze minutes.
 Code  [__________]
 ( Valider )        Recevoir un nouveau code
```

États :
- **Code fautif** : « Ce code ne correspond pas. Vérifiez chaque signe, puis réessayez. »
- **Code brûlé, expiré, déjà servi ou remplacé** : « Ce code ne peut plus servir. Demandez-en un
  nouveau. »

### 5. Réussite

```
 C'est fait : votre adresse est désormais nouvelle@exemple.fr.
 Vos codes de connexion et vos demandes de devis y arriveront.
 Vos autres appareils devront se reconnecter.
 Un message a prévenu votre ancienne adresse, marie@exemple.fr.
 ( Revenir aux réglages )
```

### 6. États de refus communs

- **Saisie qui n'est pas une adresse** : « Cette adresse ne semble pas complète. Exemple :
  prenom@exemple.fr ».
- **Même adresse que l'actuelle** : « C'est déjà votre adresse. »
- **Plafond atteint** : « Trop de messages sont partis en peu de temps. Réessayez dans une heure. »
- **Cloudflare ne répond pas** : « Le changement n'a pas pu se faire. Rien n'a changé : votre adresse
  reste marie@exemple.fr. Réessayez dans quelques minutes. »
- **Sans clé ni compte** : à la place du formulaire, « Le changement d'adresse n'est pas possible pour
  le moment. Votre adresse reste marie@exemple.fr. »

### 7. Les deux messages du produit

- **Code** — objet « Confirmez votre nouvelle adresse » ; corps : `Code : XXXXXXXX`.
- **Avis à l'ancienne adresse** — objet « L'adresse de votre administration a changé » ; corps
  étiqueté : la nouvelle adresse, la date, et la phrase « Si vous n'êtes pas à l'origine de ce
  changement, entrez avec votre code de secours et remettez votre adresse. »

## Critères d'acceptation UX

- UX1 — Aucun texte de l'écran, des étapes, des refus et des deux messages ne contient un terme de la
  liste des termes de développeur (FR-117).
- UX2 — À chaque étape non aboutie, l'écran redit l'adresse en place : l'éditrice ne croit jamais que
  le changement est fait avant la réussite.
- UX3 — Le libellé « Verify email address » cité à l'écran est identique, à la lettre, au bouton du
  message de Cloudflare reçu en recette.
- UX4 — Le parcours complet, de « Changer d'adresse » à la réussite, se fait sur un téléphone, avec
  l'administration dans un onglet et la boîte dans une application, en moins de cinq minutes.
- UX5 — Tous les boutons et liens ont une cible d'au moins 44 px (`min-h-11`).
