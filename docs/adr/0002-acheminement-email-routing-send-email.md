# ADR-0002 : Acheminement des demandes — Email Routing et `send_email` vers l'adresse de destination vérifiée, e-mail inerte et étiqueté
Statut : Accepté | Date : 2026-08-25

Promu depuis `docs/legacy/1.x/adr/0009-acheminement-email-routing-send-email.md` — ADR-0009, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x. Les renvois `FR-xxx`,
> `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers `docs/legacy/1.x/` : ce ne sont
> pas des noms de fichier.

## Contexte

`FR-063` fait acheminer chaque demande par e-mail à l'adresse de la cliente, et `FR-064` fait
porter à cet e-mail le détail des sélections et le total indicatif. `SC-007` en mesure
l'arrivée. La contrainte de coût est l'invariant `I5` du
[socle de livraison](../legacy/socle-de-livraison.md) — aucun prélèvement possible sans un acte du
client — et sa contrainte `C9`, rien n'exige un moyen de paiement.

Une contrainte de sécurité s'y superpose, et elle n'était pas visible au départ : la
destination de l'acheminement **est la boîte qui reçoit les codes de connexion**
([ADR-0006](../legacy/1.x/adr/0006-auth-implementation-maison-sur-d1.md)), et le formulaire de devis est ouvert
à l'internet anonyme (`FR-057`), borné en fréquence seulement (`FR-062`). Un inconnu peut donc
déposer du texte à côté des vrais messages du produit, déclencher lui-même l'envoi d'un code
depuis l'écran public, et maquiller sa demande en message de service pour récolter le code.

Faits sourcés :
[`docs/legacy/research/2026-08-10-acheminement-demandes-envoi-email.md`](../legacy/research/2026-08-10-acheminement-demandes-envoi-email.md)
et
[`docs/legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`](../legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md).

## Décision

Nous utiliserons **Cloudflare Email Routing**, par la liaison **`send_email`** vers l'adresse
de destination **vérifiée**.

L'e-mail acheminé sera **inerte et étiqueté** : **texte seul**, jamais de HTML ; **objet fixe
posé par le produit** ; et **chaque donnée du visiteur rendue derrière son étiquette** (« Nom :
», « Téléphone : »…), jamais en position de titre ni de phrase du produit — aucun lien ni mise
en forme construits depuis sa saisie.

## Conséquences

**Positives.**

- C'est gratuit sur tout plan, sans carte, et c'est exactement ce que `FR-063` demande.
- `send_email` n'écrit qu'à une destination **vérifiée** : c'est la plateforme elle-même qui
  tient `FR-005`, et non seulement le code.
- **L'imitation d'un message de service perd ce qui faisait sa force.** La surface s'y prête :
  une demande ne porte **aucun texte libre** — les sélections viennent du catalogue, le total
  est calculé, le visiteur n'écrit que ses coordonnées (`FR-057`, `FR-058`), sans fichier
  (`FR-061`). L'imitation doit alors tenir dans une ligne « Nom : … » d'un e-mail dont le cadre
  entier dit « demande de devis ».

**Négatives — ce à quoi le code s'engage.**

- **Réserve assumée marquée : le produit est en bêta publique depuis le 2026-04-16.** Le blog
  cité annonce « Cloudflare **Email Service** is entering public beta », nom générique qui
  coiffe Email Routing autant qu'Email Sending ; le dossier **ne dit pas** si le chemin retenu,
  la destination vérifiée, partage ce statut. Mais la phrase de tarification qui le rend
  gratuit et la contrainte DNS qui le conditionne sont toutes deux servies par les pages du
  produit en bêta. **Ce que ça coûte si la GA change le packaging** : l'envoi vers une adresse
  vérifiée devient payant, l'invariant `I5` et la contrainte `C9` du socle de livraison
  tombent, et **aucun repli ne tient** — les alternatives ci-dessous sont toutes écartées, et
  le SMTP authentifié de Cloudflare est lui-même en bêta. **Aucun appel réel ne ferme cette
  réserve.**
- **Personne ne regarde.** Aucune exigence ne porte le constat périodique que l'envoi vers
  l'adresse vérifiée reste gratuit ; après le retrait des accès de l'intégrateur, un changement
  se manifesterait par des demandes qui **cessent d'arriver, en silence**. Dette au dossier de
  `/scd-sdd:premortem socle`.
- **Le domaine doit être servi par le DNS Cloudflare.** `send_email` l'exige, et un Worker
  n'accepte de toute façon aucun domaine dont les serveurs de noms sont gérés ailleurs. C'est
  une ligne de la recette de livraison, pas un choix.
- **Une destination vérifiée ne se remplace pas depuis le produit.** La vérification passe par
  le compte Cloudflare que `SC-006` interdit de faire visiter à l'éditrice : c'est l'une des
  deux raisons pour lesquelles `FR-013` et `FR-014` restent sans porteur.
- **Deux limites de l'e-mail inerte, assumées.** Un client de messagerie peut rendre cliquable
  une URL collée dans un champ — elle reste derrière son étiquette, le produit n'y peut rien de
  plus. Et le canal reste **ouvert en écriture** : un texte marqué atteint toujours les yeux de
  l'éditrice. Ce résidu part au dossier de `/scd-sdd:premortem socle`.
- **La composition inerte ne se voit pas si elle se relâche.** Un gabarit qui redevient HTML,
  ou qui laisse une saisie en position de phrase du produit, rouvre la porte **en silence** :
  la propriété rejoint donc les contrôles bloquants de `docs/ci.md`.

## Alternatives considérées

- **Email Sending vers un destinataire arbitraire** : écartée car elle exige Workers Paid
  (5 $/mois minimum), ce qui fait tomber l'invariant `I5` du socle de livraison, `FR-103` et
  `SC-001`.
- **SendGrid, SES, MailerSend, ZeptoMail** : écartées car elles échouent sur « permanent » ou
  sur « sans carte ».
- **Le SMTP de la boîte de la cliente** : écartée car suspendue à un fournisseur grand public
  acceptant un envoi depuis une IP Cloudflare partagée.
- **Dissocier l'adresse de connexion et la destination des demandes** : écartée sur rejeu de
  l'écarté de `A-02`. La seule forme qui fermerait la cinquième porte est une adresse
  d'authentification **dédiée** — donc un compte ouvert par l'intégrateur que l'éditrice
  visiterait à chaque connexion, contre la lettre de `SC-006` et contre `FR-004`, avec son mot
  de passe au dossier d'instance et le réapprentissage que `SC-003`/`SC-015` interdisent. Elle
  **aggrave** en outre le cas limite « boîte compromise » : une boîte regardée seulement à la
  connexion laisse un attaquant s'y installer sans que rien ne se voie. Et elle ne lève pas le
  verrou qu'on lui prêtait, remplacer une adresse restant un geste de livraison, dissociées ou
  non.

## Vérifiable ?

Non rendu aujourd'hui. La composition inerte de l'e-mail acheminé est nommée par `docs/ci.md` comme une clause **sans contrôle** : un gabarit qui redeviendrait HTML rouvrirait la cinquième porte en silence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, amendée le
  2026-08-11 par le traitement de `AU-01` (forme de l'e-mail) et le 2026-08-13 par celui de
  `S-20` (réserve bêta). Revue humaine : 2026-08-13.
