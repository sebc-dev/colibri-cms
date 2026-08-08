# ADR-0009 : Anti-abus à deux étages — règle WAF en périphérie, Turnstile devant l'enregistrement
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le formulaire de devis est le seul point d'écriture ouvert au public : aucun compte,
aucune inscription (`FR-064`). Il alimente l'unique instrument du produit — la liste des
demandes et les deux nombres qui en sortent (`FR-072`, `FR-075`).

Deux dommages distincts menacent, et il est essentiel de ne pas les confondre :

1. **L'instrument est faussé.** Une campagne de soumissions automatisées ajoute des lignes
   à la liste et des unités aux nombres. C'est `SC-017` : elle ne doit ajouter ni l'un ni
   l'autre, et `FR-065` exige que ces soumissions soient écartées **avant leur
   enregistrement**.
2. **Le quota est brûlé.** Le plan gratuit accorde 100 000 requêtes Worker par jour
   (annexe A du socle de livraison). Une rafale massive rejetée *correctement* consomme
   quand même une invocation par requête — le formulaire tiendrait, et le site tomberait
   en erreur pour tout le monde jusqu'à la remise à zéro. C'est `I5` et `SC-001` qui sont
   alors en cause, pas `SC-017`.

Une protection qui s'exécute **dans** le Worker ne peut par construction rien faire contre
le second dommage : elle est déjà le coût.

Exigences concernées : `FR-064`, `FR-065`, `SC-017` · invariant `I5` · `SC-001`.

## Décision

Nous protégerons le formulaire par **deux étages**, qui font deux travaux différents et ne
se remplacent pas :

- **une règle WAF en périphérie**, qui arrête une rafale **avant** qu'elle n'atteigne le
  Worker et protège ainsi le quota de requêtes (`I5`) ;
- **Turnstile devant l'enregistrement**, qui s'exécute *dans* le Worker et protège la
  liste des demandes et les deux nombres (`SC-017`, `FR-065`).

## Conséquences

**Positives**

- `SC-017` et `I5` sont couverts chacun par le mécanisme qui peut réellement les tenir,
  au lieu d'un seul qui en couvrirait un et laisserait l'autre ouvert.
- `FR-065` est satisfait à la lettre : l'écart se fait avant l'enregistrement, donc rien
  n'entre dans la liste ni dans les nombres.
- Aucun compte ni inscription n'est demandé au visiteur (`FR-064`).

**Négatives — ce que ce choix coûte**

- **La règle WAF est de la configuration de compte, hors du dépôt.** Elle n'est pas
  versionnée avec le code, elle doit être posée à la main sur chaque instance, et **elle
  peut être retirée sans que rien ne le détecte**. Le produit s'engage donc à la porter en
  recette de livraison et au dossier d'instance (`FR-090`) — c'est le seul filet, puisque
  aucun test automatisé ne peut l'observer depuis le dépôt.
- **Turnstile met un script tiers sur la page publique du formulaire.** `FR-047` reste vrai
   — le contenu éditorial est présent sans exécution — mais le score `SC-005` de cette page
  doit être mesuré à part, comme `ADR-0005` le note déjà.
- **Un faux positif refuse une vraie demande, et le produit n'a aucun chemin de
  repêchage** : la demande n'est jamais enregistrée, donc elle n'apparaît nulle part et
  personne ne sait qu'elle a existé. C'est le coût direct de « écarter avant
  l'enregistrement ».
- Deux mécanismes à comprendre et à diagnostiquer quand une soumission légitime échoue :
  le refus peut venir de la périphérie ou du Worker, et les deux ne se lisent pas au même
  endroit.

## Alternatives considérées

- **Turnstile seul** : écartée bien qu'elle soit correcte sur `SC-017` — une rafale
  massive serait proprement rejetée **tout en brûlant le quota journalier de requêtes**,
  mettant le site en erreur pour tous les visiteurs. Le dommage qu'elle laisse passer est
  précisément celui qui touche `I5` et `SC-001`.
- **Règle WAF seule** : écartée parce qu'un débit modéré mais soutenu passe sous le seuil
  de la règle et entre dans la liste des demandes — l'instrument est faussé sans que le
  quota soit menacé, ce que `SC-017` interdit.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 9 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
