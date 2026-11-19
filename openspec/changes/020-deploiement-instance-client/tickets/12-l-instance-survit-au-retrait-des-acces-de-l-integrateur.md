# 12 — L'instance survit au retrait des accès de l'intégrateur, et ne coûte rien

**Bloqué par :** 11
**Vérif :** observé
**Fichiers :** `docs/livraison.md`, `docs/cahier-de-test.md`

## Ce que ça livre

La promesse du produit tient à une topologie : tout appartient au client, et le retrait de
l'intégrateur ne casse rien. Tant que ce n'est pas éprouvé, rien ne peut entrer en production. Ce
ticket **joue la répétition de l'épreuve de révocation**, avant la livraison du premier client : une
instance est livrée en suivant `docs/livraison.md`, sur deux comptes témoins (un compte Cloudflare,
un compte GitHub) qui ne sont pas ceux de l'opérateur, avec un nom de domaine que l'humain fournit ;
puis tous les accès de l'intégrateur sont retirés, et l'on constate que l'instance sert, ouvre
l'administration et publie.

**État.** `docs/livraison.md` donne l'ordre des gestes et la session de chacun. La section
« Livraison » de `docs/cahier-de-test.md` décrit l'épreuve. L'outil de livraison
(`scripts/livraison.mjs`), la commande `npm run mise-en-ligne` et l'appel hebdomadaire sont en
place. L'épreuve ne peut pas se jouer sur `colibri.sebc.dev` : le compte y est celui de l'opérateur.

**Ce que ce ticket livre** :

- La livraison d'une instance témoin, en suivant la procédure à la lettre, y compris la création du
  code de secours par la personne qui tient le rôle de l'éditrice, depuis sa propre session.
- L'inventaire de livraison de cette instance, produit avant le retrait.
- Le retrait de chaque accès que l'inventaire marque « à retirer » (membre Cloudflare, collaborateur
  GitHub, adresses de destination de test), et `wrangler logout` sur le poste.
- Les dix constats ci-dessous, chacun avec sa sortie ou sa capture **datée**. Aucune capture ne
  montre un écran de création de clé ni une valeur de clé.
- Les trois constats que seul un compte neuf permet : la clé de construction créée par défaut suffit
  à mettre à niveau une **base neuve** ; la permission des adresses e-mail existe en clé « du
  compte » ou exige une clé d'utilisateur du client (l'inventaire note laquelle) ; le rôle de membre
  qui suffit à l'intégrateur pour `base`, `semer` et `inventaire`.
- Les corrections de `docs/livraison.md` et de la section « Livraison » du cahier que l'épreuve
  révèle. Un défaut du produit révélé par l'épreuve n'est pas corrigé ici : il est signalé.

**Preuve attendue.** Mode `observé`, avec constat humain : tout ce qui tient aux identités échappe aux
tests automatiques. Aucun double ne dit qu'une clé créée dans la session du client survit au retrait
de l'intégrateur, ni que le raccordement du dépôt tient. Les gestes dans les sessions du client
exigent la présence de l'humain, qui détient les comptes témoins. La page de facturation sans moyen
de paiement est une capture d'écran. Chaque critère est coché sur preuve capturée ; un critère non
constaté reste non coché et se dit.

**Hors périmètre** : la livraison d'un vrai client ; corriger le code du produit ; le dossier
d'instance ; passer l'instance témoin à une nouvelle version ; détecter que l'appel hebdomadaire a
cessé.

**Références** : `docs/livraison.md`, `docs/cahier-de-test.md` (section « Livraison »), ADR-0035,
ADR-0032, ADR-0021 (`docs/adr/`), `docs/vision.md` (SC-001, SC-012, SC-013), `docs/security.md`.

## Critères

- [ ] Après le retrait de tous les accès de l'intégrateur, les pages du site public répondent comme avant   (SC-12a)
- [ ] Après le retrait de tous les accès de l'intégrateur, quand l'éditrice demande un code à l'écran de connexion, le code arrive à l'adresse autorisée et il ouvre une session   (SC-12b)
- [ ] Après le retrait de tous les accès de l'intégrateur, quand l'éditrice publie une correction, la publication aboutit et la correction est visible sur le site public   (SC-12c)
- [ ] Après le retrait de tous les accès de l'intégrateur, quand un visiteur envoie une demande, elle arrive à l'adresse autorisée et figure dans la liste des demandes   (SC-12d)
- [ ] Après le retrait de tous les accès de l'intégrateur, quand l'échéance hebdomadaire survient, la trace du passage dit que la clé a été acceptée   (SC-12e)
- [ ] Après le retrait des accès, les membres du compte de la plateforme et les collaborateurs du dépôt, consultés depuis une session du client, ne comptent aucun de ceux que l'inventaire désignait comme à retirer   (SC-12f)
- [ ] À la livraison, aucun moyen de paiement n'est enregistré sur le compte de la plateforme ni sur le compte du dépôt   (SC-12g)
- [ ] À la livraison, le nom de domaine est géré dans le compte de la plateforme, sans y avoir été acheté ni y être renouvelé   (SC-12h)
- [ ] À la lecture de l'inventaire de l'instance livrée, aucune de ses liaisons ne relève d'un service payant ou d'un abonnement   (SC-12i)
- [ ] Quand la livraison est terminée, l'écran « Code de secours » dit qu'un code est en place   (SC-12j)
