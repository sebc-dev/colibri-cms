## Niveaux

- **Unité**, le niveau principal de ce change : la lecture et le contrôle du fichier d'instance, la
  dérivation de la configuration de déploiement, la composition de l'inventaire, le verdict du semis.
  Ce sont des fonctions pures sur des données lues ; leur oracle existe avant le code.
- **Statique** (`tests/static/`) : les fichiers de configuration versionnés ne portent aucune valeur
  d'instance ; tout nom lu sur `env` et toute variable de construction figure dans la liste
  d'inventaire ; l'outil de livraison n'a aucun geste sur le code de secours.
- **Intégration dans workerd** (ADR-0014) : l'appel hebdomadaire, joué par le point d'entrée
  programmé, la forge doublée ; le semis sur la base D1 locale, suivi d'une demande de code à l'écran
  de connexion.
- **Construction réelle** : un test joue la dérivation sur le `dist/server/wrangler.json` d'une
  construction faite avec un fichier d'instance complet, dans un arbre jetable
  (`scripts/batir-site-jetable.mjs`).
- **Recette sur `colibri.sebc.dev`** : trois constats préalables, faits les 2026-11-16 et 18
  (`constats/`) — la base rattachée par son nom, la mise à niveau jouée par la construction avec sa
  clé par défaut, les images atteintes sans clé du dépôt. Reste, par ticket : le déclencheur
  hebdomadaire, lancé une fois à la main.
- **Épreuve de livraison** sur des comptes qui ne sont pas ceux de l'opérateur : la révocation, la
  gratuité, l'inventaire d'une instance livrée.

## Oracle

- Fichier d'instance : la construction s'arrête ou non, et le message nomme le champ.
- Dérivation : le JSON produit, comparé champ par champ ; les liaisons, comparées à celles de l'entrée.
- Contrôle : la liste des refus (fichier, champ, motif) ; l'empreinte des fichiers avant et après.
- Semis : le contenu de `adresses_autorisees`, **et** le comportement (un code est écrit pour cette
  adresse, aucun pour une autre).
- Inventaire : les lignes du fichier produit ; l'absence de toute valeur se prouve en posant des
  secrets de valeur connue dans le double, puis en cherchant ces valeurs dans la sortie.
- Appel hebdomadaire : les requêtes reçues par le double de la forge (une lecture, aucune écriture,
  l'en-tête d'autorisation présent) ; la ligne de trace ; l'état de la base inchangé.
- Mise en ligne : la sortie de la construction dans le compte, et la marque de publication constatée
  en ligne (ADR-0023).
- Révocation : les cinq constats de la spec, chacun avec sa sortie ou sa capture, datée.

## Cas limites

- Fichier d'instance : champ inconnu ; `turnstilePublicKey` ; champ connu de mauvais type ; domaine
  vide, avec schéma, avec chemin ; fichier vide ; JSON illisible ; champs facultatifs absents un par un.
- Dérivation : domaine avec sous-domaine ; configuration produite absente ou sans liaison `DB` (échec
  bruyant) ; rejouée deux fois (même résultat) ; aucun `database_id` en sortie.
- Contrôle : chaque champ manquant ; chaque valeur d'exemple ; expéditeur dans un sous-domaine, dans
  un autre domaine, dans un domaine qui ne fait que finir pareil (`autre-exemple.fr` contre
  `exemple.fr`) ; identifiant proscrit en autre casse, à l'intérieur d'un mot plus long, dans
  `content/` ; liste de proscrits vide ; clé à la forme connue dans un fichier de contenu.
- Semis : table vide ; même adresse ; même adresse en autre casse ; autre adresse ; adresse vide, sans
  `@`, avec espaces autour.
- Inventaire : secret attendu absent ; secret inconnu posé ; aucun secret posé ; code de secours en
  place ; un membre et un collaborateur qui ne sont pas le client ; aucun autre que le client.
- Contrôle, identifiants proscrits : un fichier hors `content/` qui en porte un ; le contrôle n'ouvre
  aucun fichier pour composer la liste.
- Appel hebdomadaire : 200, 401, 403, 404, 5xx, délai dépassé ; sans dépôt ; sans clé ; publication
  en cours (le bail n'est pas touché).
- Mise en ligne : base vide ; base à niveau ; mise à niveau en échec (rien n'est déployé).
- Préparation du dépôt : dépôt vide ; dépôt déjà préparé et déjà publié ; fichier d'instance refusé.

## Doubles

- **La forge GitHub** : le double existant (`globalThis.fetch` limité à `api.github.com`, patron de
  `tests/integration/revenir-et-publication.test.ts`), étendu à la lecture d'une référence.
- **`wrangler`** dans l'outil de livraison : l'enveloppe reçoit la fonction qui exécute une commande ;
  les tests lui en passent une qui rend des sorties enregistrées. Rien d'autre n'est doublé dans
  l'outil : git tourne pour de vrai, dans un dossier temporaire.
- Ni D1 ni la liaison d'e-mail ne sont doublées en intégration.

## Zones sans test automatisé

- **Tout ce qui tient aux identités** : qu'une clé créée dans la session du client survit au retrait
  de l'intégrateur, que le raccordement du dépôt tient, que Workers Builds accepte la clé sur mesure.
  Aucun double n'en dit rien ; c'est l'objet de l'épreuve de livraison, en mode `observé`, avec
  constat humain.
- **La gratuité** : la page de facturation sans moyen de paiement est une capture d'écran.
- **Le déclencheur hebdomadaire réel** : workerd joue le point d'entrée, pas le calendrier de la
  plateforme. Un passage se constate en recette dans les journaux, après un lancement à la main.
- **La procédure `docs/livraison.md`** : sa justesse se prouve en la suivant, à l'épreuve.
