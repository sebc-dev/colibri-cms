# ADR-0007 : Authentification par lien magique, mécanique déléguée à une bibliothèque éprouvée
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

`FR-001` décrit un geste très précis : la session d'édition s'ouvre **sur le seul
renseignement de l'adresse e-mail** déclarée pour l'instance. Aucune autre information
n'est demandée. `FR-003` ajoute que ce geste doit être identique après une interruption
d'usage de durée quelconque, sans exiger quoi que ce soit que l'éditrice aurait dû
conserver — c'est `SC-015`, « après trois mois sans usage, elle modifie et publie seule ».
`FR-002` exige le refus de toute autre adresse, et `SC-006` que l'éditrice n'ait **aucun
compte à visiter** hors son admin.

Une instance n'a qu'une seule éditrice : les rôles et permissions sont `EXCLU` du Brief.
Le problème à résoudre n'est donc pas un modèle de droits, c'est la sûreté d'un seul
mécanisme d'ouverture de session.

Ce mécanisme repose sur cinq points qui se trompent en silence : la qualité de l'aléa du
jeton, son usage unique, son expiration, la comparaison en temps constant, et la fixation
de session. **Aucun des cinq ne fait échouer un test fonctionnel quand il est faux** — le
lien continue d'ouvrir la session. Dans un produit dont le Brief pose que le code n'est
pas relu ligne à ligne, écrire ces cinq points soi-même, c'est déposer un défaut
indétectable au point d'entrée de l'admin.

Exigences concernées : `FR-001`, `FR-002`, `FR-003`, `SC-006`, `SC-015` · `US1`.

## Décision

Nous ouvrirons la session d'édition par **lien magique** envoyé à l'adresse déclarée pour
l'instance, et nous **déléguerons la mécanique d'authentification à une bibliothèque
éprouvée** plutôt que de l'écrire.

Nous n'écrirons nous-mêmes ni la génération du jeton, ni sa vérification, ni la gestion de
la session : le code propre au produit se limitera à la règle de `FR-002` — une seule
adresse est acceptée, celle déclarée pour l'instance.

## Conséquences

**Positives**

- `FR-001` est réalisé à la lettre : l'adresse, puis un clic, rien d'autre.
- `FR-003` et `SC-015` sont acquis par nature : il n'y a rien à mémoriser, donc rien à
  oublier en trois mois.
- Les cinq points de sûreté sortent du périmètre du code non relu et entrent dans celui
  d'une bibliothèque dont c'est le métier et que d'autres éprouvent.
- `SC-006` est tenu : l'éditrice ne visite aucun autre service, seulement sa boîte e-mail.

**Négatives — ce que ce choix coûte**

- **La boîte e-mail de la cliente devient la clé de voûte de l'instance.** Qui la contrôle
  contrôle l'admin ; qui la perd perd l'accès. Le Brief et `docs/stack.md` laissent ce
  risque explicitement ouvert — il n'est **pas** tranché ici, et doit l'être avant la
  première mise en ligne. Le dossier d'instance le recense déjà (`FR-093`).
- **L'ouverture de session dépend de la délivrabilité de l'e-mail**, donc du chemin
  d'envoi retenu par `ADR-0008`. Un incident d'envoi ne dégrade pas le site public, mais
  il ferme l'admin — et il ferme du même coup la publication (`FR-099`).
- **Une dépendance de sécurité de plus à tenir à jour sur toute la flotte** : une faille
  dans cette bibliothèque est une montée de version urgente sur chaque instance
  (`ADR-0011`).
- Le lien magique est un secret transporté par e-mail : sa durée de validité et son usage
  unique sont des réglages que la livraison doit vérifier, pas supposer.

## Alternatives considérées

- **Cloudflare Access par code à six chiffres** : écartée bien qu'elle supprime tout code
  d'authentification et protège le quota de requêtes à la périphérie — deux avantages
  réels — parce qu'elle impose à l'éditrice de **retaper un code**, ce qui s'écarte de la
  lettre de `FR-001` (« sur le seul renseignement de l'adresse ») et du scénario `US1`.
- **Écrire nous-mêmes la mécanique du lien magique** : écartée parce que les cinq points de
  sûreté échouent sans bruit et qu'aucun test fonctionnel ne les rattrape — c'est
  exactement le mode de défaillance contre lequel la contrainte « code non relu ligne à
  ligne » est écrite.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 7 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
