# Brief — ColibriCMS

| | |
|---|---|
| **Statut** | accepted |
| **Date** | 2026-07-17 |
| **Trace vers** | — (racine de la chaîne) |
| **Consommé par** | [PRD](./prd.md) |

## Problème

Une petite entreprise qui veut un site vitrine rapide et bien référencé a intérêt à ce qu'il soit statique. Mais dès qu'elle veut en modifier le contenu et les images elle-même, elle se heurte à un choix entre deux familles d'outils, dont aucune ne lui convient.

Les CMS *git-based* (Decap, Sveltia, Keystatic, Pages CMS) sont gratuits et faits pour le statique, mais ils imposent le dépôt git comme base de données : l'éditeur doit créer un compte chez un hébergeur de code et passer par un flux d'autorisation qui ne lui évoque rien, chaque image uploadée alourdit le dépôt de façon définitive, et chaque sauvegarde produit un commit — donc un build. Les CMS à base de données (Payload, Strapi, Directus) gèrent le média proprement et n'exposent aucun concept technique à l'éditeur, mais exigent un serveur et une base qui ne sont jamais gratuits.

Personne n'occupe l'espace entre les deux : **contenu et médias en base, aucun outil de développeur exposé à l'éditeur, et un coût d'hébergement nul.** C'est cet espace que ColibriCMS vise.

Pourquoi maintenant : une cliente pâtissière-cake designer attend un site vitrine éditable, et aucun outil existant ne permet de le lui livrer sans lui faire créer un compte technique ou payer un hébergement mensuel.

## Objectif & résultat attendu

Une cliente non technicienne gère seule le contenu et les médias de son site vitrine statique, hébergé pour 0 €/mois, sans avoir créé le moindre compte ni appris le moindre concept de développeur. Elle construit aussi elle-même les formulaires par lesquels le site convertit ses visiteurs en prospects — au premier chef un formulaire de devis où le visiteur compose sa commande (goûts, décoration, options), obtient une estimation indicative calculée à la volée, et l'envoie ; la cliente reçoit la demande par e-mail.

Le résultat est atteint quand le site de la pâtisserie tourne en production sur ColibriCMS, qu'elle y publie sans aide, et qu'un formulaire de devis qu'elle a construit elle-même lui achemine la demande d'un visiteur.

## Utilisateurs & cas d'usage principaux

- **Éditrice** (la cliente, seule sur son site) → modifier le texte et les images de ses pages, prévisualiser, publier — sans assistance et sans vocabulaire technique.
- **Visiteur** (public du site) → consulter des pages qui chargent vite et sont correctement référencées.
- **Intégrateur agence** (Arborescence Digital) → déployer et maintenir une instance par client, selon une convention identique d'un client à l'autre.

## Périmètre

### Inclus (v1)
- Gestion de **Pages** : zones éditables (texte riche, images, galeries et carrousels, vidéos, boutons d'action) et métadonnées de référencement.
- Gestion des **médias** : upload d'images depuis la page en cours d'édition.
- **Réglages transverses** : liens vers les réseaux sociaux et coordonnées de contact, éditables par la cliente et affichés sur l'ensemble du site.
- **Constructeur de formulaires** : la cliente compose ses propres formulaires dans l'admin à partir d'une palette de champs, dont des champs à choix qui portent un prix et alimentent un total calculé. Elle les publie sur le site et reçoit par e-mail les soumissions des visiteurs. Ce constructeur couvre son besoin de devis (options tarifées + estimation indicative) et sert de brique réutilisable pour les autres formulaires de l'agence (contact, réservation…).
- **Prévisualisation** d'un brouillon avant publication.
- **Publication** explicite qui met le site public à jour.
- **Authentification** de l'éditrice sans compte à créer hors son adresse e-mail.

### EXCLU (v1)
Ces exclusions sont des décisions, pas des lacunes. Chacune est réversible quand un client réel la demandera.

- **Articles, auteurs et tags.** La cliente n'a ni blog, ni flux daté, ni corpus à parcourir. Construire l'attribution d'auteur et la navigation par tag pour un site sans articles serait de l'abstraction spéculative, validée par personne. Reportée jusqu'au premier client qui a réellement un blog.
- **Édition concurrente / multi-éditeurs.** Un seul éditeur par site en v1 : la collision qu'un verrou protégerait est structurellement impossible.
- **Réutilisation d'un média déjà uploadé.** Le doublon coûte quelques mégaoctets sur un quota de 10 Go ; l'éviter coûte une interface.
- **Médiathèque** (grille, recherche, gestion globale des fichiers).
- **Historique et restauration de versions** du contenu.
- **Rôles et permissions différenciés.**
- **Contenu dynamique pour le visiteur.** Les pages de contenu sont statiques par conception : leur consultation ne déclenche aucun traitement serveur, et le calcul de l'estimation dans le configurateur se fait dans le navigateur du visiteur. C'est le principe qui rend la gratuité et la performance possibles. **Unique exception assumée** : l'envoi d'une demande de devis déclenche un traitement serveur (réception et acheminement par e-mail). Cette entaille est circonscrite à ce seul geste.
- **Conservation des soumissions.** Une soumission de formulaire est acheminée par e-mail puis n'est pas conservée par le produit : ni écran de suivi, ni base de prospects, ni statut « traité ». Un mini-CRM est hors périmètre v1.
- **Prix ferme / contractuel.** Le total affiché au visiteur est indicatif et non engageant ; le produit ne gère aucun tarif opposable.
- **Logique de formulaire avancée.** Champs conditionnels, formulaires multi-étapes, règles de prix conditionnelles (paliers, remises, combinaisons) : le total est une simple somme des contributions des champs. Ces capacités s'ajouteront quand un formulaire réel les exigera, pas avant.
- **Upload de fichier par le visiteur** dans un formulaire (ex. joindre une photo de modèle).
- **Mutualisation multi-clients.** Un déploiement = un site.

## Contraintes

- **Aucun compte technique pour l'éditrice.** Elle ne doit créer aucun compte hors son adresse e-mail — en particulier aucun compte chez un hébergeur de code. Contrainte produit ferme : elle disqualifie toute solution git-based quel que soit son confort d'interface.
- **Aucun vocabulaire de développeur exposé** dans l'interface d'édition (ni commit, ni branche, ni build, ni déploiement).
- **Hébergement Cloudflare, offre gratuite.** Le produit doit tenir intégralement sur le free tier dans les conditions d'un site vitrine. Contrainte de plateforme et de budget assumée en amont.
- **Open source**, choisi dès l'origine.
- **Réplicable par client** : une instance par client, selon une convention de déploiement identique.
- **Flotte maintenable dans le temps.** ColibriCMS évoluera ; une nouvelle version doit pouvoir être déployée sur **toutes** les instances clientes existantes sans code spécifique par client et sans perte de leur contenu. Cet impératif prime sur toute personnalisation par client qui le compromettrait : ce qui diffère d'un client à l'autre reste de la configuration, jamais du code divergent.
- **Le code entrant n'est pas relu ligne à ligne.** Aujourd'hui parce qu'une seule personne construit le produit en s'appuyant sur la génération assistée par IA ; demain parce que l'open source peut amener des contributeurs extérieurs. Dans les deux cas la confiance ne peut pas reposer sur la relecture humaine : elle doit être établie par des vérifications mécaniques.

## Critères de succès (mesurables)

- **SC-001** — Coût d'hébergement : **0 €/mois par site** en conditions nominales (aucun dépassement de quota gratuit).
- **SC-002** — Le site de la pâtisserie est **en production** sur ColibriCMS. *(Pas d'échéance contractuelle : la cliente attend sans date ferme.)*
- **SC-003** — Autonomie : l'éditrice **modifie une page et remplace une image, seule, sans aide et du premier coup**, lors d'un test d'usage réel observé.
- **SC-004** — Fraîcheur : une modification publiée est **visible en ligne en moins de 5 minutes** après l'action « Publier ».
- **SC-005** — Performance du site public : score **Lighthouse Performance ≥ 95 en mobile**, mesuré sur le HTML réellement bâti des pages de contenu.
- **SC-006** — Comptes créés par l'éditrice hors adresse e-mail : **zéro**.
- **SC-007** — La cliente **construit un formulaire de devis elle-même** (sans intervention technique), et une demande composée par un visiteur **lui parvient par e-mail** avec les sélections, le total indicatif et les coordonnées du visiteur.
- **SC-008** — Une nouvelle version de ColibriCMS **se déploie sur une instance cliente existante sans modification de code spécifique à ce client, et sans perte de son contenu**.

## Questions ouvertes

- Aucune métrique de réplicabilité n'est chiffrée à ce stade (« déployer une nouvelle instance client en moins de N heures »). Elle ne le sera pas de façon crédible avant le deuxième déploiement réel — à trancher à ce moment-là plutôt qu'à l'estime.
