## Purpose

Servir aux visiteurs chaque page déclarée comme un document complet, bâti à la reconstruction du site
depuis le contenu publié et dessiné par le rendu que partage l'aperçu, sans aucun traitement serveur à la
consultation. Couvre FR-039, et la part de FR-095 / FR-096 dont l'aperçu et la publication ont besoin ;
la rapidité mesurée (SC-005) et le formulaire de devis public restent à leurs stories.

## ADDED Requirements

### Requirement: Une page publique par page déclarée

Chaque page déclarée par l'intégrateur SHALL être servie au visiteur à son adresse — `/` pour la page
`accueil`, `/<identifiant>` pour toute autre page — comme un **document complet**, bâti à la
reconstruction du site depuis le contenu publié : il porte déjà, dans la réponse même, le titre de la
page, la navigation entre les pages, le contenu de chacun de ses emplacements dans l'ordre posé, et le
pied de page. La navigation DOIT lister toutes les pages déclarées dans l'ordre posé, la page courante
marquée. Une adresse qui ne désigne aucune page DOIT recevoir une page « introuvable » propre au site, qui
ne montre le contenu d'aucune autre page. Tout texte venu du contenu — titre, nom, libellé, valeur — DOIT
être affiché tel quel, sans qu'aucun balisage n'y soit interprété.

#### Scenario: La page d'accueil est servie à la racine
- **WHEN** un visiteur demande `/`
- **THEN** il reçoit la page « Accueil », titrée « Accueil », portant le contenu de ses emplacements dans l'ordre posé

#### Scenario: Chaque page déclarée a son adresse
- **WHEN** un visiteur demande `/tarifs` puis `/contact`
- **THEN** il reçoit la page « Tarifs » puis la page « Contact », chacune avec son propre contenu

#### Scenario: Le document servi porte déjà tout son contenu
- **WHEN** un visiteur demande une page publique
- **THEN** le texte de chacun de ses emplacements figure dans la réponse elle-même, sans qu'aucun échange supplémentaire ne soit nécessaire pour l'obtenir

#### Scenario: La navigation suit l'ordre posé
- **WHEN** un visiteur consulte n'importe quelle page publique
- **THEN** la navigation liste toutes les pages déclarées dans l'ordre posé par l'intégrateur, chacune menant à son adresse, la page courante marquée

#### Scenario: Une adresse inconnue reçoit une page introuvable
- **WHEN** un visiteur demande une adresse qu'aucune page déclarée ne porte
- **THEN** il reçoit une page « introuvable » du site, qui ne montre le contenu d'aucune autre page

#### Scenario: Un texte du contenu n'est jamais interprété
- **WHEN** un titre de page, un libellé de bouton ou une coordonnée publiés contiennent les caractères `<`, `>`, `&` ou des guillemets
- **THEN** la page publique les affiche comme du texte, et aucun balisage n'est interprété

### Requirement: Aucun traitement serveur à la consultation

Une page publique SHALL être servie comme un document statique, produit à la reconstruction du site : sa
consultation NE DOIT exécuter aucun code propre au site (FR-096), ne lire aucune base, et ne poser aucun
cookie. Elle DOIT être servie avec les en-têtes de sécurité du site public : une politique de sécurité de
contenu qui n'admet aucun script et ne charge que des ressources du site lui-même, `X-Content-Type-Options:
nosniff`, une politique de référent et le refus d'être affichée dans le cadre d'un autre site. Une page
publique NE DOIT charger aucune ressource d'une autre origine.

#### Scenario: Une page publique est servie comme document statique
- **WHEN** une page publique est demandée
- **THEN** la réponse porte les en-têtes de sécurité du site public, posés sur les documents statiques du site, ce qui atteste qu'elle n'a pas traversé le code du site

#### Scenario: Aucun script et aucune ressource d'une autre origine
- **WHEN** une page publique est servie
- **THEN** elle ne porte aucun script, et chacune de ses ressources — feuille de style, images — est servie par le site lui-même

#### Scenario: La consultation ne pose aucun cookie
- **WHEN** un visiteur, avec ou sans session d'administration ouverte, demande une page publique
- **THEN** la réponse est le même document, et elle ne pose aucun cookie

### Requirement: Dessin de chaque sorte d'emplacement

Le rendu d'un emplacement SHALL exister en un seul lieu, partagé par la page publique et par l'aperçu, et
dessiner chaque nature ainsi :
- **texte riche** : paragraphes, titres, listes à puces, gras, italique et liens du Markdown restreint ;
  un lien n'est rendu comme lien que si son adresse est relative au site ou commence par `https:`,
  `mailto:` ou `tel:` — sinon son texte seul paraît ; aucun HTML écrit dans le texte n'est interprété ;
- **image** : l'image publiée, avec sa **description** comme texte de remplacement (FR-039), et ses
  dimensions déclarées pour que la page ne saute pas au chargement ; une image sans description est
  marquée décorative ;
- **galerie** : ses images dans l'ordre de l'emplacement, chacune avec sa description ;
- **carrousel** : ses images dans l'ordre de l'emplacement, en une bande qui défile horizontalement, sans
  script ;
- **bouton d'action** : un lien portant le libellé et menant à la destination de l'emplacement ;
- **lien de vidéo** : un lien « Voir la vidéo » qui mène à la vidéo à son adresse, sans lecteur intégré ni
  aucune ressource de l'hébergeur de la vidéo chargée par la page.
Un emplacement d'image sans image, ou une galerie ou un carrousel sans image, NE DOIT rien dessiner —
jamais une image manquante.

#### Scenario: Le texte riche garde sa mise en forme
- **WHEN** un emplacement de texte riche publié porte un titre, un paragraphe avec un mot en gras et un en italique, et une liste à puces
- **THEN** la page présente ce titre, ce paragraphe avec ses mots en gras et en italique, et la liste à puces

#### Scenario: Un lien du texte riche hors liste blanche paraît comme texte
- **WHEN** un texte riche publié porte un lien vers `https://exemple.fr`, un lien `mailto:`, un lien relatif `/contact` et un lien `javascript:` ou `data:`
- **THEN** les trois premiers sont rendus comme liens, et le dernier ne paraît que par son texte, sans lien

#### Scenario: Du balisage écrit dans le texte riche n'est pas interprété
- **WHEN** un texte riche publié contient `<script>` ou `<img onerror=…>` écrits comme texte
- **THEN** la page les affiche comme du texte, et aucune balise n'est créée

#### Scenario: Une image paraît avec sa description
- **WHEN** un emplacement d'image publié pose une image dont la description est « Gâteau d'anniversaire à la fraise »
- **THEN** l'image paraît avec ce texte de remplacement et ses dimensions

#### Scenario: Une image sans description est décorative
- **WHEN** un emplacement d'image publié pose une image sans description
- **THEN** l'image paraît marquée décorative, avec un texte de remplacement vide

#### Scenario: Une galerie et un carrousel gardent leur ordre
- **WHEN** une galerie publiée pose trois images, et un carrousel publié pose les mêmes dans l'ordre inverse
- **THEN** la galerie les présente dans son ordre, et le carrousel dans le sien, en une bande qui défile sans script

#### Scenario: Un emplacement vide ne dessine rien
- **WHEN** un emplacement d'image n'a pas d'image, ou qu'une galerie n'en porte aucune
- **THEN** la page ne dessine rien pour cet emplacement, et aucune image manquante ne paraît

#### Scenario: Le bouton d'action mène à sa destination
- **WHEN** un emplacement de bouton d'action publié porte le libellé « Demander un devis » et la destination `/contact`
- **THEN** la page présente un lien « Demander un devis » qui mène à `/contact`

#### Scenario: Le lien de vidéo est un lien, sans lecteur intégré
- **WHEN** un emplacement de lien de vidéo publié porte l'adresse d'une vidéo
- **THEN** la page présente un lien « Voir la vidéo » vers cette adresse, et ne charge rien de l'hébergeur de la vidéo

### Requirement: Coordonnées et réseaux sociaux sur chaque page

Chaque page publique SHALL porter, en pied de page, les coordonnées publiées dans l'ordre de leur
déclaration — chacune sous son nom quand l'intégrateur lui en a donné un —, un numéro de téléphone menant
à un appel, une adresse e-mail menant à un message, une adresse postale sur ses lignes, puis les liens
vers les réseaux sociaux publiés, dans leur ordre, chacun sous son nom. Sans aucun lien de réseau publié,
la section des réseaux NE DOIT pas paraître. La mention d'information ne paraît pas en pied de page : elle
accompagne les formulaires (story « Composer et envoyer une demande de devis »).

#### Scenario: Les coordonnées paraissent sur toutes les pages
- **WHEN** un visiteur consulte n'importe quelle page publique
- **THEN** le pied de page présente les coordonnées publiées dans l'ordre déclaré, le téléphone en lien d'appel, l'e-mail en lien de message, l'adresse sur ses lignes

#### Scenario: Les réseaux paraissent dans leur ordre
- **WHEN** trois liens de réseaux sociaux sont publiés
- **THEN** le pied de page de chaque page présente ces trois liens dans leur ordre, chacun sous son nom

#### Scenario: Sans réseau, pas de section des réseaux
- **WHEN** aucun lien de réseau social n'est publié
- **THEN** le pied de page ne porte pas de section des réseaux

### Requirement: Une page publiée n'affiche jamais d'image manquante

La reconstruction du site SHALL échouer, en nommant l'image et la page en cause, quand le contenu publié
pose une image dont les octets ne sont pas parmi les images publiées ; le site en service DOIT alors
rester tel qu'il était (FR-091, SC-010). Une page publique NE DOIT jamais être servie avec une image
manquante.

#### Scenario: Une image absente fait échouer la reconstruction
- **WHEN** la reconstruction du site trouve une page dont un emplacement pose une image absente des images publiées
- **THEN** la reconstruction échoue en nommant cette image et cette page, et aucun site n'est produit

#### Scenario: Toutes les images posées sont présentes
- **WHEN** la reconstruction du site trouve, pour chaque image posée par le contenu publié, ses octets parmi les images publiées
- **THEN** le site est produit, et chaque page présente ses images
