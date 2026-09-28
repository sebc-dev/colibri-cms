## Niveaux

- **Unité** — la composition du message : l'expéditeur reçu en paramètre devient `from`, le
  destinataire `to`, l'objet et le texte seul restent ceux d'avant. Un double minimal de la liaison
  (un objet `send` qui enregistre ce qu'il reçoit) suffit.
- **Unité** — la validation du champ d'instance : la fonction appelée par `astro.config.ts` accepte
  une adresse, refuse l'absence et une forme invalide en nommant le champ.
- **Intégration (`workerd`, `SELF.fetch`)** — sur l'artefact bâti : la soumission de l'adresse
  autorisée déclenche un envoi dont l'expéditeur est celui du fichier d'instance du dépôt ; les
  scénarios d'indiscernabilité existants restent verts.
- **Observé (serveur de recette)** — l'arrivée réelle du message dans la boîte de l'adresse
  autorisée ; la ligne d'échec visible par `recette.mjs journal` quand l'envoi échoue.

## Oracle

| Scénario | Oracle |
|---|---|
| Le message part depuis l'adresse d'expéditeur | `from` du message remis au double = la valeur passée ; ≠ adresse autorisée |
| Une instance sans adresse d'expéditeur valide ne se bâtit pas | la validation lève une erreur dont le message nomme `senderAddress` |
| Une expédition qui échoue est consignée | la plateforme locale refuse un destinataire autre que sa `destination_address` : semer une adresse autorisée différente fait échouer l'envoi réel, sans double ; la trace se lit dans la sortie console capturée du worker |
| Une expédition qui aboutit ne laisse aucune trace d'échec | même montage, adresse autorisée = `destination_address` : aucune ligne à l'étiquette d'échec |
| Le message arrive dans la boîte | observé : message présent dans la boîte de l'adresse autorisée du serveur de recette, expéditeur = l'adresse déclarée |

## Cas limites

- `senderAddress` absent · chaîne vide · sans `@` · avec espaces · domaine sans point → refusés.
- Adresse valide sur sous-domaine (`code@envoi.exemple.fr`) → acceptée.
- La trace d'échec ne contient **jamais** le code (vérifier sur la sortie capturée, code connu du
  test par la base de test).

## Zones sans test automatisé

L'arrivée réelle et le refus d'un expéditeur non routé n'existent que sur la plateforme réelle :
mode `observé`, preuve capturée sur le serveur de recette (message reçu, en-tête `From`).
