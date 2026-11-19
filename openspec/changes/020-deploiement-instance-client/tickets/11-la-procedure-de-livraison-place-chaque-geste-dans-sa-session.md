# 11 — La procédure de livraison place chaque geste dans la session de qui doit le faire

**Bloqué par :** 04, 05, 06, 08, 09, 10
**Vérif :** observé
**Fichiers :** `docs/livraison.md`, `docs/cahier-de-test.md`, `docs/architecture/deployment.c4`, `docs/architecture/context.c4`

## Ce que ça livre

Mettre une instance en service tient aujourd'hui à un savoir oral. Ce ticket l'écrit : un tiers doit
pouvoir livrer une instance en suivant un document. `docs/livraison.md` donne l'ordre des gestes et,
pour chacun, **dans la session de qui** il se fait. Le ticket ajoute aussi au cahier de recette la
section « Livraison », qui décrit l'épreuve de révocation à jouer à chaque livraison.

**La règle centrale** (ADR-0035) : tout objet dont le fonctionnement dépend de la personne qui l'a
créé se crée dans une session **du client**, jamais dans celle de l'intégrateur. Un objet créé par
un membre cesse de fonctionner quand ce membre est retiré. Quatre objets sont dans ce cas :

| Objet | Où il vit | Créé dans la session |
|---|---|---|
| Clé du dépôt (`JETON_DEPOT`) : portée fine, ce seul dépôt, `Contents: Read and write`, sans expiration | secret du Worker | GitHub du client |
| Clé des adresses (`JETON_ADRESSES_EMAIL`) : « Email Routing Addresses Edit » | secret du Worker | Cloudflare du client |
| Clé de construction : celle que Workers Builds crée par défaut au raccordement | Workers Builds | Cloudflare du client |
| Raccordement du dépôt à Workers Builds, et l'application GitHub de Cloudflare | les deux comptes | les deux, du client |

Tout le reste (le Worker, la base, la zone DNS, la ligne de l'adresse autorisée, le contenu du
dépôt) n'est attaché à personne : l'intégrateur, membre du compte, peut le créer. Qui tient le
clavier n'est pas l'objet de la règle : l'intégrateur opère les sessions du client en sa présence.

**État du code.** L'outil de livraison (`scripts/livraison.mjs`) offre les gestes `controler`,
`depot`, `base`, `semer`, `inventaire`. La commande `npm run mise-en-ligne` met la base à niveau puis
déploie. L'appel hebdomadaire est en place. `docs/livraison.md` n'existe pas.
`docs/cahier-de-test.md` écarte la révocation des accès : « le compte est celui de l'opérateur ».

**Ce que ce ticket livre** :

- `docs/livraison.md`, document de l'intégrateur. Les prérequis : un nom de domaine acheté par le
  client **hors du compte Cloudflare** (aucun moyen de paiement n'y est enregistré), l'adresse du
  client, la présence de l'éditrice. Puis les gestes, dans l'ordre, chacun avec sa session :
  1. *Session du client* — ouvrir le compte Cloudflare et le compte GitHub ; inviter l'intégrateur
     (membre, collaborateur) ; passer le domaine au DNS Cloudflare ; activer Email Routing ; vérifier
     l'adresse de destination.
  2. *Intégrateur* — `base`, `depot`, `controler` (avec la liste des identifiants à proscrire),
     pousser `main` et `media`.
  3. *Session du client* — créer la clé du dépôt et la clé des adresses ; installer l'application et
     raccorder le dépôt, ce qui crée la clé de construction ; régler la commande de mise en ligne
     (`npm run build`, puis `npm run mise-en-ligne`, aperçus désactivés, branche `main` seule).
  4. Première construction, constatée en ligne. *Session du client* — poser les deux secrets du
     Worker, dans le tableau de bord, fenêtre privée fermée à la fin. Aucune valeur de clé ne passe
     par un terminal.
  5. *Intégrateur* — `semer`. *Éditrice* — première connexion par l'adresse autorisée, création du
     code de secours sur l'écran « Code de secours », qu'elle note. Ni l'intégrateur ni l'outil ne
     créent, ne voient, ne transmettent ce code.
  6. *Intégrateur* — `inventaire`, **avant** tout retrait ; puis l'épreuve, qui commence par le
     retrait de chaque accès que l'inventaire marque « à retirer », des adresses de destination de
     test, et par `wrangler logout`.
- La procédure signale : l'adresse autorisée entre dans l'historique de commandes du poste qui joue
  `semer` ; les captures de l'épreuve ne montrent jamais un écran de création de clé.
- `docs/cahier-de-test.md` gagne une section « Livraison », au format des sections existantes. Elle
  retire le membre Cloudflare, le collaborateur GitHub et la connexion `wrangler` du poste, puis
  joue : une page publique ; une connexion par code ; une correction publiée et vue en ligne, image
  comprise ; une demande envoyée ; un passage de l'appel hebdomadaire, déclenché à la main depuis le
  compte du client ; puis, dans une session du client, la liste des membres et celle des
  collaborateurs sans aucun de ceux que l'inventaire marquait « à retirer », la page de facturation
  sans moyen de paiement, le nom de domaine géré sans y avoir été acheté, et l'écran « Code de
  secours » qui dit qu'un code est en place. Le paragraphe « Hors périmètre » du cahier est mis à
  jour : l'épreuve ne se joue pas sur `colibri.sebc.dev`, elle exige des comptes qui ne sont pas
  ceux de l'opérateur.
- `docs/cahier-de-test.md` : la mention périmée de `send_email.destination_address` comme adresse
  de la liaison locale est corrigée selon l'état réel des fichiers `wrangler`.
- Architecture : dans `docs/architecture/deployment.c4`, l'environnement `production` (« Comptes du
  client ») et sa vue perdent ce qui les marque comme seulement décidés, et le commentaire d'en-tête
  est mis à jour ; toute marque `#planned` restante du change dans `context.c4` est retirée.
  `likec4 validate --no-layout --json --project colibri-cms docs/architecture` passe.

**Preuve attendue.** Mode `observé` : ce ticket ne livre que des documents. Le critère se constate à la
lecture de `docs/livraison.md` : chacun des quatre objets d'identité y est placé dans une session du
client. La justesse de la procédure entière se prouve en la suivant : c'est l'objet de l'épreuve de
révocation, jouée ensuite sur des comptes témoins.

**Hors périmètre** : jouer l'épreuve ; le dossier d'instance et le rangement des moyens d'accès
chez le client ; passer une instance à une nouvelle version ; créer les comptes par une API ;
plusieurs instances dans un même compte ; tout écran nouveau.

**Références** : ADR-0035, ADR-0034, ADR-0032, ADR-0021, ADR-0033, ADR-0002 (`docs/adr/`),
`docs/security.md`, `docs/vision.md` (SC-001, SC-012, SC-013).

## Critères

- [ ] À la lecture de la procédure de livraison, la création de la clé du dépôt, de la clé des adresses e-mail, de la clé de construction et du raccordement du dépôt y est placée dans une session du client   (SC-11a)
