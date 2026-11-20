# 03 — Le contrôle d'instance refuse un fichier d'instance qui n'est pas prêt

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/platform/instance/controle.ts`, `scripts/livraison.mjs`, `tests/unit/controle-d-instance.test.ts`

## Ce que ça livre

Avant de mettre une instance en service, qui livre doit savoir que le **fichier d'instance** du
dépôt du client est complet et propre à ce client. Ce ticket livre le **contrôle d'instance** : une
commande, lancée sur le dépôt d'un client, qui réussit seulement si le fichier d'instance porte ses
quatre champs, bien formés, sans valeur d'exemple du produit. Chaque refus nomme le champ en cause et
dit pourquoi. Le contrôle ne modifie rien.

**État du code.** Le module de lecture du fichier d'instance (`src/platform/instance/`) refuse déjà
un champ inconnu ou mal formé, mais il accepte un fichier sans `depotDePublication` ni
`compteCloudflare`, et les valeurs d'exemple du produit (`exemple.colibri.test`, le compte
`0123456789abcdef0123456789abcdef`), parce que le dépôt du produit doit se construire avec elles.
Aucun outil de livraison n'existe : `scripts/livraison.mjs` est créé par ce ticket.

**Ce que ce ticket livre** :

- Une fonction pure, sous `src/platform/instance/`, reçoit le contenu du fichier d'instance et rend
  une **liste de refus** (champ, motif), vide quand l'instance est prête. Elle refuse :
  un champ manquant parmi les quatre (`domain`, `senderAddress`, `depotDePublication`,
  `compteCloudflare`) ; un champ inconnu ou mal formé (par le module de lecture) ; une valeur
  d'exemple du produit, ou un domaine réservé (`.test`, `.example`, `example.com`, `example.org`) ;
  une adresse d'expéditeur qui n'est ni dans le domaine de l'instance ni dans l'un de ses
  sous-domaines.
- La fonction est écrite pour recevoir aussi, plus tard, la liste des fichiers versionnés et une
  liste d'identifiants à proscrire : sa signature les prévoit, ce ticket ne les traite pas.
- `scripts/livraison.mjs` est créé avec un premier geste, `controler <dépôt>`. Le script n'est
  qu'une enveloppe : il lit les fichiers et appelle la fonction ; toute la logique décidable vit en
  TypeScript sous `src/` et se teste. Il sort en code non nul quand la liste de refus n'est pas vide,
  et affiche chaque refus. Il n'écrit dans aucun fichier du dépôt contrôlé.

**Tests.** Unité sur la fonction pure. Oracle : la liste des refus (champ, motif). Cas limites :
chaque champ manquant, un par un ; chaque valeur d'exemple ; expéditeur dans un sous-domaine
(accepté), dans un autre domaine, dans un domaine qui ne fait que finir pareil (`autre-exemple.fr`
contre `exemple.fr`, refusé). « Ne modifie rien » se prouve par construction : la fonction ne reçoit
que des données et ne rend qu'une liste ; un test vérifie que l'enveloppe du geste `controler`
n'appelle aucune écriture (l'enveloppe reçoit ses accès aux fichiers en paramètre).

**Hors périmètre** : la recherche d'identifiants de l'intégrateur et de valeurs à forme de clé dans
les fichiers du dépôt ; les autres gestes de l'outil de livraison ; toute modification du dépôt
contrôlé.

**Références** : ADR-0034, ADR-0005 (`docs/adr/`), `docs/security.md`.

## Critères

- [x] Lancé sur un dépôt dont le fichier d'instance porte ses quatre champs, bien formés et propres à l'instance, le contrôle réussit   (SC-03a)
- [x] Quand le dépôt de publication ou l'identifiant du compte manque au fichier d'instance, le contrôle échoue en nommant le champ manquant   (SC-03b)
- [x] Quand le fichier d'instance porte encore le nom de domaine, l'adresse d'expéditeur ou l'identifiant de compte d'exemple du produit, le contrôle échoue en nommant le champ resté à sa valeur d'exemple   (SC-03c)
- [x] Quand l'adresse d'expéditeur n'appartient ni au nom de domaine de l'instance ni à l'un de ses sous-domaines, le contrôle échoue en nommant l'adresse d'expéditeur   (SC-03d)
- [x] Que le contrôle réussisse ou échoue, aucun fichier du dépôt n'est modifié   (SC-03e)
