# ADR-0008 : Cloudflare Email Service, envoi restreint à l'adresse de destination vérifiée
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le produit envoie des e-mails pour deux usages, et deux seulement : acheminer chaque
demande de devis à l'éditrice (`FR-069`) et lui envoyer son lien de connexion
(`ADR-0007`). Dans les deux cas, **le destinataire est l'éditrice elle-même**.

Le Brief pose trois conditions à tout service tiers : le compte est ouvert au nom de la
cliente (`I4`, `FR-102`), aucun moyen de paiement n'est enregistré (`I5`, `C9`, `FR-101`),
et rien de vital ne vit côté Isometria (`I6`, `C10`, `FR-100`). `SC-016` ajoute qu'aucune
demande ne doit être perdue quand l'acheminement tombe : la demande est confirmée au
visiteur et enregistrée quoi qu'il arrive (`FR-068`), puis porte son état d'acheminement
(`FR-070`) et fait l'objet d'un signalement persistant (`FR-071`).

Fait daté du 6 août 2026, consigné dans `docs/stack.md` : Cloudflare Email Service permet
l'envoi gratuit vers une **adresse de destination vérifiée** du compte ; l'envoi vers des
destinataires arbitraires relève du plan Workers Paid, donc d'un moyen de paiement.

Exigences concernées : `FR-068`, `FR-069`, `FR-070`, `FR-071`, `FR-100`, `FR-101`,
`FR-102`, `SC-001`, `SC-016` · invariants `I4`, `I5`, `I6`.

## Décision

Nous utiliserons **Cloudflare Email Service**, dans le compte de la cliente, **restreint à
l'adresse de destination vérifiée** de l'éditrice.

Nous traiterons l'échec d'envoi de façon **synchrone** : la demande est d'abord
enregistrée et confirmée au visiteur (`FR-068`), puis l'envoi est tenté et son issue
inscrite sur la demande (`FR-070`). Aucun réessai différé, aucune file d'attente, aucune
surveillance hébergée.

Nous n'ouvrirons aucun autre chemin d'envoi : le produit n'écrit jamais à une adresse
autre que celle de l'éditrice.

## Conséquences

**Positives**

- C'est le seul chemin gratuit **sans moyen de paiement** qui satisfait les trois
  conditions du Brief à la fois — `I4`, `I5` et `SC-001` restent vrais.
- L'issue d'envoi étant connue de façon synchrone, `FR-070` et `FR-071` sont honorés sans
  aucune surveillance hébergée : `I6` et `FR-100` restent intacts.
- `SC-016` est structurel : l'enregistrement précède l'envoi, donc une panne d'envoi ne
  peut pas faire perdre une demande.
- Un service, un compte et un secret de moins à ouvrir, puisque la plateforme déjà retenue
  suffit.

**Négatives — ce que ce choix coûte**

- **Le produit ne peut jamais écrire à un visiteur.** L'exclusion « accusé de réception
  par e-mail au visiteur » du PRD cesse d'être une simple décision de périmètre : **elle
  porte la gratuité de l'envoi**. La rouvrir rouvre `SC-001`, et cette conséquence doit
  être connue de quiconque la proposerait plus tard.
- **La vérification de l'adresse de destination est un geste manuel de la cliente**, à
  faire à la livraison et à porter en recette et au dossier d'instance (`FR-090`,
  `FR-091`). Une instance livrée sans ce geste a un CMS qui n'envoie rien — et, par
  `ADR-0007`, une admin qui ne s'ouvre pas.
- **Un changement d'adresse de l'éditrice exige de refaire cette vérification**, et coupe
  l'acheminement **et** l'accès à l'admin tant qu'elle n'est pas refaite. Le couplage avec
  `ADR-0007` fait de ce geste banal une opération sensible.
- Sans réessai différé, une indisponibilité de plusieurs heures produit autant de demandes
  « non acheminées » qu'il en arrive : elles sont toutes lisibles dans l'admin, mais
  l'éditrice ne les recevra jamais par e-mail — elle devra aller les chercher.

## Alternatives considérées

- **Un service tiers d'envoi** (Resend, Brevo et assimilés) : écarté parce qu'il
  ajouterait un compte à ouvrir au nom de la cliente, un secret à ranger et une dépendance
  à surveiller, là où la plateforme déjà retenue suffit — sans rien apporter au périmètre
  réel, qui n'a qu'un destinataire.
- **Envoi vers des destinataires arbitraires** (plan Workers Paid) : écarté parce qu'il
  suppose un moyen de paiement enregistré, ce qui rend faux `I5`, `C9`, `FR-101`, `SC-001`
  et la clause §4.1 du clausier — le même motif exactement qui a écarté R2 dans
  `ADR-0003`.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 8 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
