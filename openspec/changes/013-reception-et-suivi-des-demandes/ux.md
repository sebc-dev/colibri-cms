# UX — 013 Réception et suivi des demandes

## Canvas

Pas encore d'artboard. Les deux écrans réemploient les éléments déjà dessinés de l'administration : le
cadre, la carte titrée, la liste à lignes séparées de l'`Écran : Formulaires`, la pastille (`badge`), le
dialogue de la suppression d'une image, le message d'état. Un artboard « Demandes » (étroit et large, avec
ses états) sera posé et lié ici si la revue du ticket de la liste le demande.

## Écrans & états

### Écran : Demandes

De haut en bas, dans le cadre (rubrique « Demandes » active) :

1. **Titre** « Demandes ».
2. **Les nombres** — une carte. En tête, ceux du site : « 14 demandes · 3 commandes », suivi de
   « · 2 retirées » quand ce nombre n'est pas nul. Dessous, un tableau par formulaire : « Formulaire »,
   « Demandes », « Commandes », et « Retirées » quand le nombre du site n'est pas nul. Un seul formulaire :
   le tableau paraît quand même (la ventilation se lit toujours au même endroit). Singulier jusqu'à 1
   (« 0 commande », « 1 demande »).
3. **Le filtre** — « Formulaire : » suivi d'une rangée de liens : « Tous », puis un lien par formulaire de
   demande présente ; le lien courant est marqué (`aria-current`).
4. **La liste** — sur écran large, une ligne par demande : case à cocher ; date et heure (« 17 octobre
   2026 à 14:05 ») ; formulaire, sous le même nom que dans le filtre ; page ; coordonnée de réponse ; total (« 40 € », absent si le formulaire
   n'a pas de prix) ; liste déroulante de la suite ; pastille « E-mail non parti » le cas échéant. La date
   est le lien vers le détail. Sur écran étroit, chaque ligne devient une carte empilée dans le même ordre,
   case à cocher et liste déroulante à 44 px au moins.
5. **La pagination** — « Demandes plus récentes » et « Demandes plus anciennes », avec « Page 2 sur 3 »,
   seulement quand il y a plus de 50 demandes à présenter.
6. **La barre de sélection** — paraît dès qu'une case est cochée : « 3 demandes sélectionnées »,
   « Tout sélectionner sur cette page » / « Tout désélectionner », et le bouton « Retirer… ». Sur écran
   étroit, elle reste visible en bas de l'écran.

Textes de l'éditrice (`src/admin/textes.ts`) :

| Élément | Texte |
|---|---|
| Liste vide | « Aucune demande n'est encore arrivée. Les demandes envoyées depuis les formulaires du site paraîtront ici. » |
| Suites | « À renseigner », « Sans suite », « Devis envoyé », « Commande » |
| Pastille d'e-mail | « E-mail non parti » |
| Intitulé de la liste déroulante (lecteur d'écran) | « Suite de la demande du 17 octobre 2026 à 14:05 » |
| Intitulé de la case (lecteur d'écran) | « Sélectionner la demande du 17 octobre 2026 à 14:05, marie@exemple.fr » |
| Suite non enregistrée | « La suite n'a pas pu être enregistrée. Réessayez dans quelques instants. » |

États :
- **vide** — les nombres à zéro (« 0 demande · 0 commande »), sans tableau ni filtre ; le texte de liste
  vide ;
- **garnie** — nombres, filtre, liste, pagination au besoin ;
- **suite en cours d'enregistrement** — la liste déroulante reste utilisable ; le nombre de commandes se met
  à jour au retour ;
- **suite non enregistrée** — la liste déroulante revient à la suite d'avant, le message paraît sous la
  ligne, annoncé poliment ;
- **sélection** — la barre de sélection paraît ;
- **retrait** — voir le dialogue ; après un retrait, l'écran se recharge sur le même filtre, les demandes
  retirées n'y paraissent plus et les nombres sont à jour.

### Dialogue : Retirer des demandes

| Élément | Texte |
|---|---|
| Titre | « Retirer 3 demandes ? » (« Retirer cette demande ? » pour une seule) |
| Corps | « Tout ce que les visiteurs ont envoyé — choix, coordonnées, message — sera effacé définitivement. Ce retrait ne peut pas être annulé. Chaque demande reste dans votre boîte e-mail si elle y est arrivée. » |
| Motif (choix obligatoire, aucun coché d'office) | « Retrait ordinaire — la demande reste comptée parmi les retirées, et parmi les commandes si c'en était une. » ; « Demande indésirable — elle ne sera plus comptée nulle part. » |
| Boutons | « Retirer » (inactif tant qu'aucun motif n'est choisi), « Annuler » |
| Retrait en cours | « Retrait en cours… », boutons inactifs |
| Retrait échoué | « Le retrait n'a pas pu se faire : aucune demande n'a été retirée. Réessayez dans quelques instants. » |

Le dialogue s'ouvre le focus sur « Annuler » ; Échap ou « Annuler » le referment sans rien changer et
rendent le focus au bouton qui l'a ouvert.

### Écran : Demande

Dans le cadre (rubrique « Demandes » active) :

1. Lien « ← Toutes les demandes ».
2. Titre « Demande du 17 octobre 2026 à 14:05 », pastille « E-mail non parti » le cas échéant, avec, en
   dessous, « L'e-mail de cette demande n'a pas pu partir : elle n'est connue que d'ici. »
3. **Origine** — « Formulaire : Devis gâteau », « Page : Contact » ; le formulaire sous le même nom que
   dans la liste.
4. **Choix** — une ligne par champ à choix renseigné : « Parfum : Fraise (10 €) » ; puis « Total
   indicatif : 40 € (estimation non engageante) ».
5. **Coordonnées et message** — une ligne par champ renseigné, « Votre nom : Marie Dupont » ; un message
   sur plusieurs lignes se présente en bloc sous son libellé, ses lignes gardées.
6. **Suite** — la même liste déroulante que dans la liste.
7. Bouton « Retirer cette demande », qui ouvre le dialogue pour cette seule demande ; après le retrait,
   l'écran mène à la liste.

Demande retirée ou inconnue : titre « Cette demande n'est plus dans la liste », aucun détail, lien
« Revenir aux demandes ».

## Critères d'acceptation UX

- UX1 — Noter la suite d'une demande depuis la liste se fait en un geste (choisir dans la liste
  déroulante), sans quitter la liste, au pouce sur un téléphone.
- UX2 — Quarante demandes indésirables d'une même page se retirent en quatre actions au plus : « Tout
  sélectionner sur cette page », « Retirer… », « Demande indésirable », « Retirer ».
- UX3 — Le motif d'un retrait n'est jamais choisi d'office : « Retirer » reste inactif tant que l'éditrice
  n'a pas choisi.
- UX4 — Chaque case à cocher et chaque liste déroulante est nommée, pour un lecteur d'écran, par la date de
  sa demande ; le dialogue retient le focus tant qu'il est ouvert et le rend au bouton qui l'a ouvert.
- UX5 — Un message de plusieurs lignes se lit ligne à ligne dans le détail, sans défilement horizontal sur
  un téléphone.
- UX6 — Aucun terme de développeur sur les deux écrans ni dans le dialogue (FR-117).
