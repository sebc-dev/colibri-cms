## Why

L'éditrice ne peut pas entrer dans son administration en conditions réelles : le message portant
son code de connexion **ne part jamais**. Le produit l'expédie en prenant l'**adresse autorisée
elle-même** pour expéditeur, or la plateforme n'expédie que depuis un domaine où son acheminement
d'e-mail est activé. Constaté le 2026-09-28 sur le serveur de recette : le code est écrit, aucun
message n'arrive, et l'échec est absorbé sans laisser la moindre trace. Aucun test ne pouvait le
voir — la plateforme locale accepte n'importe quel expéditeur. Ce change répare la story
**001 — Connexion de l'éditrice par code** (Epic A, `docs/roadmap.md`), livrée mais inopérante
hors du poste de développement ; il sert **FR-001** (ouvrir une session à qui prouve la maîtrise
de l'adresse autorisée) et **FR-005** (aucun message de preuve ailleurs qu'à l'adresse
autorisée), et rend enfin observable **SC-006**.

## What Changes

- Le message de code de connexion part **depuis l'adresse d'expéditeur de l'instance**, et plus
  jamais depuis l'adresse autorisée. Le destinataire, l'objet fixe et le texte seul ne changent pas.
- L'adresse d'expéditeur est une **valeur d'instance** : le fichier d'instance gagne un champ
  dédié. Elle peut vivre sur un **sous-domaine** du domaine de la cliente, pour que l'activation
  de l'acheminement d'e-mail n'y remplace pas les réceptions de courrier existantes.
- **BREAKING** (livraison) : une instance sans adresse d'expéditeur valide ne se bâtit plus. Le
  fichier d'instance de chaque dépôt de cliente doit recevoir le champ avant la prochaine montée de
  version, et l'acheminement d'e-mail doit être activé sur le domaine de cette adresse.
- Un envoi qui échoue laisse désormais une **trace réservée à l'exploitation** (les journaux de la
  plateforme), sans le code et sans rien changer à ce que l'écran de connexion répond : la
  réponse reste indiscernable, que l'adresse soumise soit reconnue ou non, que l'envoi aboutisse
  ou non.
- La recette de livraison gagne le geste qui rend l'envoi possible : activer l'acheminement
  d'e-mail sur le domaine de l'adresse d'expéditeur — un sous-domaine quand le domaine principal
  reçoit déjà son courrier ailleurs.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `connexion-par-code` : l'exigence « L'envoi d'un code à l'adresse autorisée » fixe l'expéditeur du
  message (l'adresse d'expéditeur de l'instance, jamais l'adresse autorisée) ; l'exigence
  « L'indiscernabilité des deux branches de soumission » ajoute qu'une expédition qui échoue est
  consignée pour l'exploitation, sans que la réponse change.

## Impact

- **Code** : `src/platform/email/index.ts` (composition du message) et son appelant
  `src/pages/admin/connexion.astro` (l'envoi différé, qui cesse d'absorber l'échec en silence) ;
  la lecture de la nouvelle valeur depuis le fichier d'instance, par le chemin qu'autorise **I10**.
- **Configuration** : `instance.json` gagne le champ d'expéditeur (**I8**, ADR-0005 : le quatrième
  lieu, « tout le reste »). `wrangler.jsonc` et `wrangler.astro.jsonc` restent sans valeur
  d'instance (candidat `invariant-i10-restreint-a-la-configuration-astro`) : la destination vérifiée de `send_email` n'y change pas de rôle.
- **Décisions** : ADR-0002 tient (acheminement par la plateforme vers la destination vérifiée,
  gratuit, e-mail inerte et étiqueté) — ce change en répare l'application, il ne le remet pas en
  cause.
- **Exploitation** : la recette de livraison et le cahier de test (§§ 0.3, 2 et 3) ; le skill
  `recette` et le fichier d'instance du serveur de recette suivent.
- **Tests** : la plateforme locale ne vérifie pas l'expéditeur — la preuve que le message
  **arrive** se fait sur le serveur de recette, en plus des tests dans `workerd` qui fixent
  l'expéditeur composé et la trace d'échec.
