# 05 — Les nombres du site et de chaque formulaire

**Bloqué par :** 04
**Vérif :** tdd
**Fichiers :** `src/core/demandes/nombres.ts`, `src/platform/demandes/magasin.ts`, `src/pages/admin/demandes.astro`, `src/admin/textes.ts`, `docs/cahier-de-test.md`, `tests/unit/demandes/nombres.test.ts`, `tests/integration/nombres-des-demandes.test.ts`

## Ce que ça livre

En haut de l'`Écran : Demandes`, l'éditrice lit ce que son site lui a apporté et ce que ça a donné
(FR-075 à FR-077) : le nombre de demandes présentes et le nombre de commandes, pour le site et pour chaque
formulaire.

Une carte porte :
- en tête, les nombres du site : « 14 demandes · 3 commandes », suivi de « · 2 retirées » quand ce nombre
  n'est pas nul (FR-076) ;
- dessous, un tableau par formulaire, avec les colonnes « Formulaire », « Demandes », « Commandes », et
  « Retirées » quand le nombre du site n'est pas nul. Le tableau paraît même avec un seul formulaire.

Les mots s'accordent : singulier jusqu'à 1 (« 0 commande », « 1 demande »). Sans aucune demande, la carte
dit « 0 demande · 0 commande », sans tableau.

**Ce que chaque nombre compte :**
- les **demandes** sont celles de la liste : les demandes présentes ;
- les **commandes** sont les demandes dont la suite est « commande », qu'elles soient présentes ou retirées
  par un retrait ordinaire ;
- les **retirées** sont les demandes retirées par un retrait ordinaire, comptées après l'effacement de ce
  que leur visiteur avait envoyé (FR-078) ;
- une demande retirée comme **indésirable** n'est comptée dans aucun nombre (FR-076).

Le tableau liste chaque formulaire qui compte au moins une demande présente ou retirée (FR-077), trié par
nom. Pour chacun des trois nombres, la somme des formulaires égale le nombre du site. Les nombres ne
dépendent ni du filtre ni de la page de la liste.

Le retrait n'existe pas encore (tickets 08 et 09). Les tests sèment donc directement les demandes
retirées : un retrait ordinaire laisse une ligne `etat = 'retiree'` dont les colonnes du visiteur sont
nulles ; un retrait indésirable ne laisse aucune ligne.

**Décisions à respecter (ADR-0030 point 4, D6 de l'approche ; I2) :**
- **Une lecture de l'état, jamais un compteur tenu à part.** `compterParFormulaire(db)`, dans
  `src/platform/demandes/magasin.ts`, est une seule requête groupée par `formulaire_id`. Elle rend, pour
  chaque formulaire, `presentes` (état `presente`), `commandes` (suite `commande`, toutes lignes),
  `retirees` (état `retiree`) et le nom gardé le plus récent. Une seule requête par écran.
- **La composition pure.** `src/core/demandes/nombres.ts`, sans framework ni plateforme (I2) : somme du
  site, résolution des noms (nom déclaré d'abord, nom gardé ensuite), tri par nom, et la règle qui dit
  quand le nombre de retirées s'affiche. La route de la suite (ticket 07) la réemploiera.
- **Les textes** vivent dans `src/admin/textes.ts` : « demande(s) », « commande(s) », « retirée(s) »,
  en-têtes du tableau. Aucun terme de développeur (FR-117).
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : la carte des
  nombres lue au téléphone.
- **Cas limites à couvrir :** aucune demande retirée (nombre absent, colonne absente) ; un seul formulaire
  (tableau présent) ; 0, 1 et 2 pour les accords ; un formulaire qui n'a plus que des demandes retirées
  (listé, 0 demande) ; un formulaire que le site ne porte plus ; une commande retirée par un retrait
  ordinaire (comptée) ; une commande retirée comme indésirable (absente, donc non comptée).
- **SC-05b** se prouve sur un jeu de demandes connu, écrit d'avance, qui mêle au moins trois formulaires,
  des retraits ordinaires et des retraits indésirables.

**Hors périmètre :**
- la mise à jour des nombres après un choix de suite (ticket 07) ou après un retrait (tickets 08 et 09) ;
- toute ventilation par date ou par période.

## Critères
- [x] Quand la liste porte onze demandes de « Devis gâteau », dont trois de suite « commande », et trois demandes de « Devis atelier », sans aucune commande, et qu'aucune n'a été retirée, l'écran affiche 14 demandes et 3 commandes pour le site, 11 demandes et 3 commandes pour « Devis gâteau », 3 demandes et 0 commande pour « Devis atelier », et aucun nombre de retirées   (SC-05a)
- [x] Quand, sur un jeu de demandes connu mêlant plusieurs formulaires, des retraits ordinaires et des retraits indésirables, l'écran affiche les nombres, pour les demandes, les commandes et les retirées, la somme des nombres des formulaires égale le nombre du site   (SC-05b)
- [x] Quand l'éditrice filtre la liste sur « Devis atelier », ou passe à la page suivante, les nombres du site et de chaque formulaire restent ceux de toutes les demandes   (SC-05c)
