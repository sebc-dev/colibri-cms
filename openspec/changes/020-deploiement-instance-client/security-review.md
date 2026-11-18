## Surface

- **Aucune route nouvelle**, publique ou d'administration. Le point d'entrée programmé n'est pas
  atteignable par une requête : seule la plateforme le déclenche.
- **Un outil de livraison** qui agit sur le compte Cloudflare du client par la connexion `wrangler`
  de qui livre : création de la base, une écriture dans `adresses_autorisees`, des lectures.
- **Un fichier d'instance** désormais strict, sans champ nouveau.
- **Quatre objets d'identité** créés à la livraison, dans les comptes du client : la clé du dépôt, la
  clé des adresses, la clé de construction, le raccordement du dépôt à la construction.
- **Un appel sortant de plus**, hebdomadaire, vers le dépôt du client, avec la clé d'écriture.
- **Un inventaire** écrit sur le poste de qui livre.

## Menaces

1. **Un secret entre dans le dépôt du client.** Le dépôt est ouvert à l'intégrateur collaborateur, et
   à quiconque le clonerait un jour. Une clé collée dans `instance.json` y resterait dans l'historique.
2. **Une clé créée au nom de l'intégrateur.** Elle fonctionne le jour de la livraison et casse à son
   départ, au pire moment, sans personne pour la refaire (SC-012).
3. **La construction détient beaucoup.** Sa clé déploie le Worker et écrit dans la base : qui la
   détient peut déployer un code qui lit les deux secrets du Worker. Elle exécute les scripts du
   dépôt, que la clé d'écriture du Worker peut modifier.
4. **La valeur d'une clé fuit pendant la livraison** : terminal, historique de commandes, journal,
   presse-papiers, capture d'écran de l'épreuve.
5. **Le semis sert à détourner une instance.** Un membre du compte, ou une connexion `wrangler` volée,
   remplace l'adresse autorisée et ouvre l'administration.
6. **L'outil écrit dans le mauvais compte** : la base ou l'adresse d'un autre client.
7. **L'inventaire renseigne un attaquant**, ou porte de quoi reconstituer le moyen de reprise (FR-011).
8. **L'appel hebdomadaire expose la clé** dans une trace, ou devient un moyen d'écrire dans le dépôt.
9. **L'intégrateur reste dans les comptes** après une livraison « terminée » : membre oublié,
   collaborateur oublié, adresse de destination de test, session `wrangler` sur le poste.
10. **La liste des identifiants proscrits finit dans le produit**, qui porterait alors lui-même les
    identifiants de l'intégrateur.

## Mitigations

- **M1** (menace 1) — La construction refuse tout champ inconnu d'`instance.json` ; le contrôle
  d'instance cherche les formes connues de clé dans tout fichier versionné et nomme le fichier sans
  la valeur. Le contrôle est une étape de la procédure, avant le premier envoi vers le dépôt.
- **M2** (menace 2) — La règle des identités (design D1) et sa table ; l'inventaire porte la colonne
  « au nom de » ; l'épreuve de révocation la vérifie par l'effet, à chaque livraison.
- **M3** (menace 3) — La clé de construction ne quitte pas Workers Builds : créée dans la session du
  client, elle n'est ni copiée ni rangée ailleurs. Elle n'a aucun droit sur la zone DNS au-delà des
  routes du Worker, aucun sur Email Routing, aucun sur les membres. C'est un risque résiduel assumé :
  un membre qui peut déployer peut déjà lire les secrets par le code. La construction ne reçoit aucune
  clé du dépôt (constat du 2026-11-18, design D1). La clé d'écriture reste limitée à ce seul dépôt et
  le produit n'écrit rien sous `.github/` (I9). C'est la clé créée par défaut par Workers Builds, non
  une clé sur mesure.
- **M4** (menace 4) — L'outil ne pose aucun secret : les valeurs se collent dans le tableau de bord,
  session du client, fenêtre privée fermée à la fin. L'outil n'accepte aucune valeur de clé en
  argument. Les captures de l'épreuve ne montrent jamais un écran de création de clé.
- **M5** (menace 5) — `semer` n'écrit que dans une table vide : il ne peut pas remplacer l'adresse
  d'une instance en service. Un membre du compte garde, lui, un accès direct à la base : c'est la
  raison pour laquelle l'intégrateur est retiré, et pourquoi le remplacement prévient l'ancienne
  adresse (ADR-0033). Le réamorçage d'une instance en service reste hors périmètre (FR-119).
- **M6** (menace 6) — Le compte visé vient de l'`instance.json` du dépôt du client, passé à
  `wrangler` explicitement ; aucun fichier d'environnement ni compte par défaut.
- **M7** (menace 7) — Le format de l'inventaire n'a aucun champ de valeur, et l'outil n'en lit
  aucune. Aucune ligne ne touche à la table du code de secours. Un test pose des valeurs connues et
  les cherche dans la sortie. Le fichier n'est pas versionné dans le dépôt du produit.
- **M8** (menace 8) — L'appel est une lecture, par l'adaptateur de forge existant ; la trace ne porte
  que l'issue. Un test vérifie qu'aucune requête d'écriture ne part et que la clé n'apparaît pas
  dans la trace.
- **M9** (menace 9) — La procédure se termine par une liste de retrait : membre, collaborateur,
  adresses de destination de test, `wrangler logout`. L'inventaire, produit avant, nomme chaque accès
  à retirer ; après le retrait, les listes de membres et de collaborateurs sont relues dans une
  session du client.
- **M10** (menace 10) — La liste n'est lue que de l'argument de la commande ; un test vérifie que le
  contrôle n'ouvre aucun fichier pour la composer. La préparation du dépôt n'y dépose ni l'outillage
  de recette ni les documents de travail, qui portent ces identifiants ; le contrôle cherche dans
  tout fichier versionné du dépôt du client.

## Données

- **L'adresse autorisée** de l'éditrice passe en argument de `semer` : elle entre dans l'historique de
  commandes du poste qui livre. Elle est déjà connue de l'intégrateur à ce moment ; la procédure le
  signale.
- **L'inventaire** porte des noms de comptes et l'adresse du client, aucune valeur de clé. Il se
  range avec les preuves de la livraison, puis au dossier d'instance (FR-110 : pas plus ouvert que
  les comptes qu'il décrit).
- **Aucune donnée personnelle nouvelle** n'est stockée par le produit. Les demandes et leur
  conservation ne sont pas touchées (DAT-1 reste ouverte, hors de ce change).
