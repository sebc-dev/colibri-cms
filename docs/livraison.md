# Livrer une instance

Document de l'intégrateur. Il donne l'ordre des gestes pour mettre en service une instance au nom d'un
client et, pour chacun, **dans la session de qui** il se fait. Décisions : ADR-0035 (Worker unique dans
le compte du client), ADR-0034 (valeurs d'instance), ADR-0032 (code de secours), ADR-0033 (adresses de
destination), ADR-0021 (clé du dépôt), ADR-0002 (acheminement des e-mails).

## La règle centrale

Tout objet dont le fonctionnement dépend de la personne qui l'a créé se crée dans une session **du
client**, jamais dans celle de l'intégrateur : un objet créé par un membre cesse de fonctionner quand ce
membre est retiré, et le site casse le jour où les accès d'Isometria sont révoqués (SC-012, SC-013).
Quatre objets sont dans ce cas :

| Objet | Où il vit | Créé dans la session |
|---|---|---|
| Clé du dépôt (`JETON_DEPOT`) : portée fine, ce seul dépôt, `Contents: Read and write`, sans expiration | secret du Worker | GitHub du client |
| Clé des adresses (`JETON_ADRESSES_EMAIL`) : « Email Routing Addresses Edit » | secret du Worker | Cloudflare du client |
| Clé de construction : celle que Workers Builds crée par défaut au raccordement | Workers Builds | Cloudflare du client |
| Raccordement du dépôt à Workers Builds, et application GitHub de Cloudflare | les deux comptes | GitHub et Cloudflare du client |

Tout le reste (le Worker, la base, la zone DNS, la ligne de l'adresse autorisée, le contenu du dépôt)
n'est attaché à personne : l'intégrateur, membre du compte, peut le créer. Qui tient le clavier n'est pas
l'objet de la règle : l'intégrateur peut le tenir dans une session ouverte par le client sur ses
propres comptes, **en sa présence** ; il n'emploie jamais la sienne pour ces quatre objets.

## Prérequis

- Un nom de domaine acheté par le client **hors du compte Cloudflare** : aucun moyen de paiement n'y est
  enregistré (palier gratuit).
- L'adresse e-mail du client, celle qu'il utilise sur ses comptes, et l'adresse qui sera l'adresse
  autorisée.
- La présence de l'éditrice, au geste 5.
- Un clone du produit sur le poste de l'intégrateur, `npm ci` joué.

## Les gestes, dans l'ordre

### 1. Session du client — les comptes

1. Ouvrir le compte Cloudflare et le compte GitHub au nom du client, qui en est le propriétaire.
2. Inviter l'intégrateur : membre du compte Cloudflare, collaborateur du dépôt GitHub. Il y reste
   jusqu'à la livraison.
3. Passer le nom de domaine au DNS Cloudflare.
4. Activer Email Routing sur le domaine.
5. Ajouter l'adresse autorisée comme adresse de destination et la faire vérifier (le client clique dans
   sa boîte).

### 2. Intégrateur

Depuis le clone du produit, avec `wrangler` connecté en tant que membre du compte du client :

```sh
node scripts/livraison.mjs depot <dépôt> --version <étiquette> --instance <fichier>
node scripts/livraison.mjs controler <dépôt> --proscrire <identifiant1>,<identifiant2>,…
node scripts/livraison.mjs base <dépôt>
```

`--proscrire` reçoit la liste des identifiants à proscrire : tout ce qui appartient à Isometria (nom de
compte, domaine, adresse, identifiant de compte…). Le contrôle refuse le dépôt s'il en trouve un dans un
fichier versionné, ou s'il y trouve un secret. `depot` dépose le fichier d'instance (`instance.json`)
dans le clone ; `base` crée la base dans le compte que ce fichier désigne. Chaque commande doit finir
sans refus avant de passer à la suivante. Un refus de `controler` interdit de pousser : on corrige chaque
ligne signalée (`champ : motif`), puis on rejoue `controler` jusqu'à ce qu'il ne refuse plus. Une fois le
contrôle passé sans refus, pousser les branches `main` et `media` vers le dépôt du client.

### 3. Session du client — les clés et le raccordement

Les points 1 à 3 créent, **dans la session du client** et jamais dans celle de l'intégrateur, les quatre
objets du tableau de la règle centrale : clé du dépôt, clé des adresses, clé de construction (née du
raccordement) et raccordement avec l'application GitHub de Cloudflare. Le point 4 règle le raccordement :

1. **Clé du dépôt** : dans le compte GitHub du client, une clé à portée fine, limitée à ce seul dépôt,
   `Contents: Read and write`, sans expiration. Ne pas la copier dans un terminal ni dans un fichier.
2. **Clé des adresses** : dans le compte Cloudflare du client, une clé « Email Routing Addresses Edit ».
3. **Application et raccordement** : installer l'application GitHub de Cloudflare sur le dépôt du client,
   puis raccorder le dépôt à Workers Builds. Le raccordement crée la **clé de construction**, par
   défaut, dans le compte du client.
4. **Réglage du raccordement — commande de mise en ligne** : `npm run build`, puis `npm run mise-en-ligne` ; aperçus de
   construction désactivés ; branche `main` seule (la branche `media` ne déclenche rien).

### 4. Première construction, puis les secrets

L'intégrateur constate la première construction, en ligne. Ensuite, **session du client** : poser les
deux secrets du Worker, `JETON_DEPOT` et `JETON_ADRESSES_EMAIL`, dans le tableau de bord, en
fenêtre privée, fermée à la fin. **Aucune valeur de clé ne passe par un terminal.**

### 5. Première connexion

- *Intégrateur* : `node scripts/livraison.mjs semer <dépôt> <adresse autorisée>`.
- *Éditrice* : première connexion par l'adresse autorisée, puis création du code de secours sur l'écran
  « Code de secours », qu'elle note. Ni l'intégrateur ni l'outil ne créent, ne voient, ne transmettent
  ce code (ADR-0032).

### 6. Inventaire, puis épreuve

- *Intégrateur* : `node scripts/livraison.mjs inventaire <dépôt> <adresse du client>`, **avant** tout
  retrait. L'adresse est celle du client sur son compte Cloudflare : l'outil le reconnaît ainsi parmi les
  membres. Garder la sortie : elle marque chaque accès « à retirer ».
- Puis l'épreuve de révocation (cahier de recette, section « Livraison »), qui commence par le retrait de
  chaque accès marqué « à retirer », des adresses de destination de test, et par `wrangler logout`.

## À signaler

- L'adresse autorisée entre dans l'historique de commandes du poste qui joue `semer` ; l'adresse du
  client sur son compte Cloudflare, dans celui du poste qui joue `inventaire`. Purger ces historiques.
- Les captures de l'épreuve ne montrent jamais un écran de création de clé.
