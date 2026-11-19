# 09 — L'outil de livraison produit l'inventaire de livraison, sans aucune valeur

**Bloqué par :** 07
**Vérif :** tdd
**Fichiers :** `scripts/livraison.mjs`, `src/platform/instance/inventaire.ts`, `tests/unit/inventaire-de-livraison.test.ts`, `tests/static/inventaire-statique.test.ts`

## Ce que ça livre

À la livraison, le client doit savoir ce que son instance porte : chaque liaison, chaque clé, chaque
raccordement entre deux comptes, chaque compte ouvert, et qui y a accès. Ce ticket livre le geste
`inventaire` de l'outil de livraison. Il produit un fichier Markdown daté, composé depuis une liste
que le produit déclare et confronté à ce que la plateforme observe. L'inventaire ne porte **aucune
valeur de clé**, et rien sur le **moyen de reprise**.

**État du code.** Le produit lit sur `env` : `DB`, `ASSETS`, `EXPEDITEUR_CODE_CONNEXION`,
`JETON_DEPOT`, `JETON_ADRESSES_EMAIL`. La construction lit `COLIBRI_CLE_LECTURE_DEPOT`
(`scripts/recuperer-images-publiees.mjs`), sans emploi à la livraison. Aucune liste ne déclare cela
en un lieu. `scripts/livraison.mjs` a une enveloppe d'accès à la plateforme qui vise le compte du
fichier d'instance et reçoit en paramètre la fonction qui exécute `wrangler`.

**Ce que ce ticket livre** :

- **Une liste déclarée**, en un lieu sous `src/platform/instance/`, de ce qu'une instance porte :
  chaque liaison, chaque secret d'exécution, chaque secret de construction, chaque raccordement,
  chaque compte (compte de la plateforme, compte du dépôt, compte du bureau d'enregistrement du nom
  de domaine). Chaque entrée dit son lieu (l'un des quatre lieux de l'ADR-0005, « Workers Builds »
  ou « compte »), sa portée attendue, si elle relève d'un service gratuit, et le geste que son
  absence refuse.
- **Un test statique** vérifie que tout nom lu sur `env` dans `src/`, et toute variable lue par les
  scripts de construction, figure dans cette liste : un secret ajouté plus tard entre à l'inventaire
  ou fait rougir un test.
- **Une fonction pure de composition** reçoit la liste déclarée et ce que la plateforme observe
  (noms des secrets posés, base rattachée, déclencheur, domaine, membres du compte, collaborateurs
  du dépôt) et rend le texte de l'inventaire : une ligne par entrée, avec « posé », « absent » (et
  le geste que l'absence refuse) ou « inconnu du produit ». Le format n'a **aucun champ de valeur**.
- Deux colonnes restent à la main de qui livre, parce qu'aucune API ne les donne : « au nom de » et
  « où la valeur est rangée ». Ce sont des constats, que seule l'épreuve du retrait des accès prouve.
- L'inventaire porte les personnes qui ont accès : les membres du compte de la plateforme et les
  collaborateurs du dépôt, relevés par l'API quand la connexion de qui livre le permet, sinon
  recopiés depuis la session du client. Il marque « à retirer » chacun de ceux qui ne sont pas le
  client.
- Le geste `inventaire` relève les observations par l'enveloppe d'accès à la plateforme, appelle la
  composition et écrit le fichier sur le poste de qui livre. Il ne lit aucune valeur (la plateforme
  n'en rend pas) et ne touche pas à la table du code de secours. Le fichier n'est versionné nulle
  part par ce ticket.
- L'outil de livraison n'a, et n'aura, aucun geste sur le code de secours : un test statique
  énumère ses gestes et le vérifie.

**Tests.** Unité sur la composition ; l'exécuteur de commandes doublé par des sorties enregistrées.
Oracle : les lignes du fichier produit. L'absence de toute valeur se prouve en posant, dans le
double, des secrets de **valeur connue**, puis en cherchant ces valeurs et leurs fragments dans la
sortie. Cas limites : secret attendu absent ; secret inconnu posé ; aucun secret posé ; code de
secours en place ; un membre et un collaborateur qui ne sont pas le client ; aucun autre que le
client.

**Hors périmètre** : où l'inventaire se range chez le client (dossier d'instance) ; prouver « au nom
de » autrement que par l'épreuve de livraison ; constater les listes après le retrait des accès
(session du client, à l'épreuve) ; lire ou afficher une valeur de clé.

**Références** : ADR-0005, ADR-0032, ADR-0035 (`docs/adr/`), `docs/security.md`.

## Critères

- [ ] L'inventaire produit porte une ligne pour chaque clé que le produit lit à l'exécution ou à la construction, et une ligne pour chaque liaison de la configuration de déploiement effective   (SC-09a)
- [ ] Produit sur une instance dont les clés sont posées, l'inventaire ne porte la valeur d'aucune clé, ni aucune partie d'elle   (SC-09b)
- [ ] Produit sur une instance dont le code de secours est en place, l'inventaire ne porte ni le code, ni son empreinte, ni aucune donnée qui aide à le reconstituer   (SC-09c)
- [ ] Quand une clé que le produit ne lit pas est posée sur l'instance, l'inventaire la signale comme inconnue du produit   (SC-09d)
- [ ] Quand une clé que le produit sait lire n'est pas posée sur l'instance, l'inventaire la signale comme absente, avec le geste que son absence refuse   (SC-09e)
- [ ] Produit avant le retrait des accès, l'inventaire porte les membres du compte de la plateforme et les collaborateurs du dépôt, tels que relevés dans ces comptes, et désigne chacun de ceux qui ne sont pas le client comme à retirer   (SC-09f)
- [ ] Quand les gestes de l'outil de livraison sont énumérés, aucun ne crée, ne lit ni ne remplace le code de secours   (SC-09g)
