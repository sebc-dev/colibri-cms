## Context

Voir `proposal.md` — Why. État du code au moment du change :

- `src/platform/email/index.ts` compose le message (`from`, `to`, `subject`, `text`) et prend
  `from: destinataire`. Son en-tête justifie ce choix par **I8** : la zone `platform` ne connaît
  pas le domaine de l'instance, qui ne vit que dans `instance.json`.
- `src/pages/admin/connexion.astro` remet l'expédition à la plateforme **après** la réponse
  (`waitUntil(attendre(0).then(demandeExpedition).catch(() => {}))`) : l'échec est absorbé sans
  trace, ce qui tient l'indiscernabilité mais rend la panne invisible.
- `astro.config.ts` est le **seul** lecteur d'`instance.json` (**I10**) ; il n'en consomme
  aujourd'hui que `domain`.
- La liaison `EXPEDITEUR_CODE_CONNEXION` (`send_email`) porte une `destination_address` neutre dans
  `wrangler.jsonc` / `wrangler.astro.jsonc` (ADR-0032 : la configuration de déploiement ne porte
  que des liaisons de plateforme, aucune valeur d'instance).
- La plateforme **locale** (Miniflare) accepte n'importe quel expéditeur ; elle refuse en revanche
  un destinataire autre que la `destination_address` — l'unique façon de faire échouer un envoi
  sans double.

## Goals / Non-Goals

**Goals :**

- L'expéditeur du message est une valeur d'instance déclarée, lisible par la zone `platform` sans
  qu'aucun autre fichier versionné ne porte le domaine.
- Une instance mal déclarée échoue **à la construction**, pas en silence à la première connexion.
- Un échec d'envoi devient visible à qui exploite le compte Cloudflare de la cliente, sans rien
  changer à la réponse de l'écran de connexion.

**Non-Goals :**

- Signaler l'échec à l'éditrice sur l'écran de connexion — ce serait distinguer les deux branches
  de soumission (anti-énumération).
- Relancer un envoi échoué, ou mesurer le taux d'échec : une trace suffit à diagnostiquer.
- L'envoi des demandes de devis (FR-063) : même mécanisme, autre change ; il réutilisera
  l'adresse d'expéditeur posée ici.
- Automatiser l'activation de l'acheminement d'e-mail : elle reste un geste de livraison.

## Decisions

**D1 — Un champ dédié dans `instance.json`.** Le fichier gagne `senderAddress` (le nom suit ceux
du fichier, `domain` et `turnstilePublicKey`). C'est le quatrième lieu d'ADR-0005 (« tout le
reste ») et **I8** le range là. Alternatives écartées, arbitrées avec l'humain :
- *dériver l'adresse du domaine* (`connexion@<domain>`) : forcerait l'acheminement d'e-mail sur le
  domaine principal, dont l'activation **remplace les MX** — la messagerie existante de la cliente
  cesserait de recevoir ;
- *dériver d'un sous-domaine fixe* (`code@envoi.<domain>`) : laisse la messagerie intacte, mais
  impose le même nom de sous-domaine à toutes les clientes et l'écrit dans le code ;
- *déclarer l'expéditeur dans la liaison* (`allowed_sender_addresses` dans `wrangler.jsonc`) : met
  une valeur d'instance dans la configuration de déploiement — contraire à ADR-0032 et à **I8**.

**D2 — `astro.config.ts` valide et transmet ; `platform` reçoit une constante.** La configuration
Astro lit `senderAddress` avec `domain` (**I10**), **refuse de bâtir** si le champ manque ou n'a pas
la forme d'une adresse e-mail (message qui nomme le champ), puis l'injecte comme constante de
build (`vite.define`) lue par la route de connexion, qui la transmet au module d'e-mail comme elle
lui transmet déjà la liaison. Le module d'e-mail reste pur : il reçoit l'expéditeur en paramètre,
ce qui le garde testable sans build. Écarté : faire importer `instance.json` par la zone
`platform` — un second lecteur du fichier, que **I10** confie à la seule configuration Astro.

**D3 — L'échec est consigné par `console.error`, après la réponse.** Le `.catch` de l'envoi
différé écrit une ligne d'erreur à étiquette fixe, avec le motif rendu par la plateforme, **sans**
le code ni l'adresse soumise. Elle part après la réponse, dans la même promesse différée : ni le
corps, ni les en-têtes, ni le moment de la réponse ne peuvent en dépendre. Pour que la trace
survive à l'instant où elle est écrite, la configuration de déploiement active les journaux de la
plateforme (`observability`) — un réglage de plateforme, pas une valeur d'instance, donc dans le
périmètre qu'ADR-0032 laisse à `wrangler.jsonc`.

**D4 — Pas d'ADR nouveau.** Le champ entre dans le lieu qu'ADR-0005 prévoit déjà ; l'acheminement
reste celui d'ADR-0002, dont une conséquence négative (« le domaine doit être servi par le DNS
Cloudflare ») se précise en « l'acheminement d'e-mail est activé sur le domaine de l'adresse
d'expéditeur ». Si la revue estime que « un sous-domaine routé plutôt que le domaine principal »
engage la flotte au-delà de ce change, c'est un candidat sous `docs/adr/_candidates/`, pas une
décision figée ici.

## Risks / Trade-offs

- [La plateforme locale ne vérifie pas l'expéditeur] → les tests dans `workerd` fixent l'expéditeur
  **composé** ; l'**arrivée** du message se prouve sur le serveur de recette (skill `recette`), en
  mode observé.
- [La ligne de journal pourrait fuiter l'adresse via le motif de la plateforme] → étiquette fixe,
  motif seul ; les journaux ne sont lisibles que depuis le compte Cloudflare de la cliente.
- [Une montée de version casse le build des instances existantes] → voulu (un échec au build vaut
  mieux qu'une porte muette) ; le plan de migration le rend explicite.
- [L'éditrice ne sait toujours pas que son code n'est pas parti] → hors périmètre (anti-énumération) ;
  l'écran dit déjà de redemander un code, et la trace permet à qui exploite de diagnostiquer.

## Migration Plan

1. Chaque dépôt de cliente ajoute `senderAddress` à `instance.json` — une adresse sur un domaine
   qu'elle contrôle, de préférence un sous-domaine dédié (`code@envoi.<domaine>`) si le domaine
   principal reçoit déjà son courrier ailleurs.
2. Dans son compte Cloudflare : activer l'acheminement d'e-mail sur ce sous-domaine (Email Routing
   → Settings → Subdomains), **jamais** sur le domaine principal quand ses MX pointent ailleurs.
3. La montée de version se bâtit : un champ absent ou invalide arrête la construction avant tout
   déploiement ; rien ne part cassé.
4. Recette : sur le serveur de recette, déclarer une adresse sur `colibri.sebc.dev` (routé seul),
   demander un code, constater l'arrivée (CT-2.1, CT-2.2) ; le skill `recette` et le cahier de
   test (§ 0.3) cessent de décrire le détour par une session créée en base.

Retour arrière : revenir à la version précédente rend l'ancien comportement (le message ne part
pas) ; le champ ajouté à `instance.json` est ignoré par elle et peut rester.
