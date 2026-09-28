## Surface

- Aucune entrée externe nouvelle : le champ `senderAddress` vient du fichier d'instance, versionné
  dans le dépôt de la cliente, lu au build.
- Un flux sortant nouveau : une ligne de journal en cas d'échec d'envoi, lisible depuis le compte
  Cloudflare de la cliente.

## Menaces

- **Énumération de l'adresse autorisée** — la trace d'échec ne doit rien changer à la réponse.
  Parade : elle est écrite dans la promesse différée, après la réponse (exigence d'indiscernabilité
  inchangée, deux scénarios ajoutés).
- **Fuite du code par les journaux** — un code en clair dans un journal ouvrirait la session à
  quiconque lit les journaux dans les quinze minutes. Parade : étiquette fixe + motif de la
  plateforme, jamais le message composé ; scénario « cette trace ne porte pas le code ».
- **Usurpation d'expéditeur / message de service imité** (ADR-0002) — l'expéditeur devient une
  adresse du domaine de la cliente, fixe et posée par le produit : l'éditrice peut s'y fier ; aucune
  saisie de visiteur n'entre dans l'expéditeur ni dans l'objet.
- **Identifiant d'Isometria dans la configuration** (SC-012/SC-013) — l'adresse d'expéditeur est
  sur le domaine de la cliente, dans son dépôt ; aucun domaine ni compte d'Isometria.
- **Destinataire arbitraire** (FR-005) — inchangé : la liaison n'écrit qu'à la destination
  vérifiée ; changer l'expéditeur n'ouvre aucun autre destinataire.

## Données

L'adresse autorisée (donnée personnelle) n'est pas écrite dans la trace. Le motif renvoyé par la
plateforme peut en citer une : les journaux restent dans le compte de la cliente, à la rétention de
la plateforme.
