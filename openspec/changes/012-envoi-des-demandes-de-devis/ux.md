# UX — 012 Envoi des demandes de devis

## Canvas

Pas encore d'artboard. Le formulaire public s'écrit sur la feuille du site (`src/site/site.css`), sobre :
la mise en page fine du gabarit reste à l'intégrateur (story « Site public rapide et complet »). Les
écrans d'administration touchés réemploient les éléments déjà dessinés (carte titrée, lien, message
d'état). Un artboard « Formulaire public » (étroit et large, avec ses états) sera posé et lié ici si la
revue du ticket du formulaire le demande.

## Écrans & états

### Formulaire de devis — page publique

Une colonne, dans l'ordre déclaré : chaque champ sous son libellé ; un champ obligatoire porte le mot
« obligatoire » après son libellé (pas un astérisque seul). Un champ à choix est un groupe titré par son
libellé : boutons d'option pour un choix unique, cases à cocher pour un choix multiple ; toute la ligne
d'une option se touche. Dans un champ avec prix, chaque option porte son prix à droite de son libellé
(« Fraise — 10 € », « 10,50 € » quand il y a des centimes). Viennent ensuite, dans cet ordre : le bloc du
total, la mention d'information, le bouton.

Textes du visiteur (`src/render/formulaire/textes.ts`) :

| Élément | Texte |
|---|---|
| Total | « Total estimé : 39 € » |
| Mention avec le total | « Estimation indicative, non engageante. » |
| Bouton | « Envoyer ma demande » |
| Champ à renseigner | « Ce champ est à renseigner. » |
| Adresse e-mail mal formée | « Cette adresse e-mail semble incomplète (exemple : nom@domaine.fr). » |
| Numéro mal formé | « Ce numéro ne semble pas valide (exemple : 06 12 34 56 78). » |
| Saisie trop longue | « Ce texte dépasse {n} caractères. » |
| Résumé d'un refus de saisie | « Votre demande n'est pas partie : vérifiez les champs ci-dessous. » suivi de la liste des libellés en cause |
| Envoi en cours | « Envoi en cours… » |
| Confirmation | « Merci, votre demande a été envoyée. » |
| Acheminement en échec, site injoignable | « Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants. » |
| Seuil atteint | « Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure. » |
| Formulaire changé | « Ce formulaire vient d'être mis à jour. Rechargez la page pour voir les prix à jour, puis refaites votre demande. » |
| Sans script (`<noscript>`) | « Le total et l'envoi de ce formulaire ont besoin de JavaScript, désactivé dans votre navigateur. Vous pouvez nous écrire avec les coordonnées en bas de page. » |

États :
- **sans script** — les champs, options et prix se lisent ; le bloc du total est masqué, le bouton
  inactif, le message sans script visible ;
- **au repos** — total « 0 € », bouton actif ;
- **en saisie** — le total suit chaque sélection, annoncé poliment aux lecteurs d'écran ;
- **refus de saisie** — chaque champ en cause porte son message sous lui ; le résumé paraît en tête du
  formulaire, chaque libellé y est un lien vers son champ, et le focus va au résumé ; rien n'est effacé ;
  quand ce refus vient du serveur après l'envoi, le bouton redevient « Envoyer ma demande », actif ;
- **envoi en cours** — le bouton devient « Envoi en cours… », inactif, jusqu'à la réponse ;
- **envoyée** — le formulaire laisse place à la confirmation, qui reçoit le focus ;
- **échec** (acheminement, site injoignable, seuil, formulaire changé) — le message paraît au-dessus du
  bouton, le bouton redevient actif, toute la saisie reste.

### Formulaire de devis — aperçu

Identique à la page publique, avec, au-dessus du bouton, l'avis : « Dans l'aperçu, l'envoi est
désactivé : rien ne part d'ici. » Le bouton paraît mais n'envoie rien ; l'actionner fait seulement
ressortir l'avis.

### Éditeur d'une page — emplacement de formulaire

Une carte comme les autres emplacements, titrée « Formulaire — Devis gâteau », portant la phrase « Ses
options et ses prix se règlent dans Formulaires. » et un lien « Régler ce formulaire », vers l'écran du
formulaire. Aucun champ, aucun bouton d'enregistrement.

### Connexion — seuil de l'origine atteint

Le message d'état ambre de l'écran de connexion, déjà employé pour le plafond horaire : « Trop de
tentatives de connexion depuis votre accès à internet. Merci de patienter une heure avant de
réessayer. » Le même texte quelle que soit l'adresse saisie.

## Critères d'acceptation UX

- UX1 — Sur un téléphone de 375 px de large, le formulaire tient en une colonne sans défilement
  horizontal, et chaque option se choisit d'un toucher sur toute sa ligne.
- UX2 — Le total change dès que la sélection change, sans délai perceptible ni rechargement.
- UX3 — Au clavier seul, chaque champ, chaque option et le bouton s'atteignent et s'actionnent ; les
  groupes à choix sont annoncés par leur libellé ; le total et les messages d'état sont annoncés aux
  lecteurs d'écran.
- UX4 — Après un refus de saisie, le focus est sur le résumé, et chaque libellé du résumé mène à son champ.
- UX5 — Aucun texte vu par le visiteur ne montre un code ou un terme technique de la réponse du serveur
  (« 429 », « erreur 503 », « JSON »…), hors le message sans script qui nomme JavaScript.
- UX6 — Aucun texte vu par l'éditrice — carte de l'éditeur, avis de l'aperçu, annonce de la connexion —
  n'emploie de terme de développeur (FR-117).
